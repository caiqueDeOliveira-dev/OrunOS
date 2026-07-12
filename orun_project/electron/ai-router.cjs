// electron/ai-router.cjs
//
// Central "AI Router" for Orun OS.
// Given a provider + model + message history, calls the right backend and
// returns/streams a reply — plus, where the provider reports it, token
// usage for the "Usage today" panel. Ollama and Anthropic have their own
// wire format; everything else (OpenAI, OpenRouter, Groq, GitHub Models)
// speaks the same OpenAI-compatible Chat Completions API, so they share
// one implementation and only differ by base URL + auth headers.

const https = require("https");
const http = require("http");

// ── Low-level HTTP helpers ──────────────────────────────────────────────

function postJSON(urlString, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers }, timeout: 60000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`)); return; }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Failed to parse response: ${data.slice(0, 500)}`)); }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "GET", headers, timeout: 10000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`)); return; }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Failed to parse response: ${data.slice(0, 300)}`)); }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

/**
 * Streaming POST — calls onLine(rawLine) for every non-empty line (works
 * for NDJSON and SSE). Hands the live request object to onRequestReady so
 * callers can abort it mid-flight (req.destroy()) — used for the "Stop" button.
 */
function streamPOST(urlString, headers, body, onLine, onRequestReady) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers }, timeout: 120000 },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (c) => (errBody += c));
          res.on("end", () => reject(new Error(`HTTP ${res.statusCode}: ${errBody.slice(0, 500)}`)));
          return;
        }
        let buffer = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line) onLine(line);
          }
        });
        res.on("end", () => { const rest = buffer.trim(); if (rest) onLine(rest); resolve(); });
        res.on("error", (err) => reject(err));
      }
    );
    onRequestReady?.(req);
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", (err) => reject(err.message === "Cancelled" ? Object.assign(new Error("Cancelled"), { cancelled: true }) : err));
    req.write(payload);
    req.end();
  });
}

// ── Context management ──────────────────────────────────────────────────

function trimContext(messages, systemPrompt, maxMessages = 16) {
  const trimmed = messages.length > maxMessages ? messages.slice(-maxMessages) : messages.slice();
  if (systemPrompt && systemPrompt.trim()) return [{ role: "system", content: systemPrompt.trim() }, ...trimmed];
  return trimmed;
}

const SUMMARY_PROMPT =
  "Summarize the following conversation history in a few short paragraphs, preserving names, decisions, numbers, and any facts needed to continue the conversation naturally. Output only the summary, no preamble.";

/**
 * Smarter context builder: if the conversation is short, just trims as
 * before. If it's long, compresses everything older than the last
 * `maxMessages` into one AI-generated summary instead of silently
 * dropping it — so long-running conversations don't lose earlier facts.
 * Falls back to plain trimming if the summarization call itself fails
 * (e.g. provider down) so a flaky summary never blocks the real reply.
 */
async function buildContext({ messages, systemPrompt, maxMessages = 16, provider, model, baseUrl, apiKey }) {
  if (messages.length <= maxMessages) return { context: trimContext(messages, systemPrompt, maxMessages), summarized: false };

  const overflow = messages.slice(0, messages.length - maxMessages);
  const recent = messages.slice(messages.length - maxMessages);

  let summary = null;
  try {
    const result = await routeChat({
      provider, model, baseUrl, apiKey,
      messages: [{ role: "system", content: SUMMARY_PROMPT }, ...overflow],
    });
    summary = result.text;
  } catch {
    // Summarization is best-effort — fall back to a plain window trim.
  }

  const parts = [];
  if (systemPrompt && systemPrompt.trim()) parts.push(systemPrompt.trim());
  if (summary) parts.push(`Summary of earlier conversation:\n${summary}`);
  const context = parts.length ? [{ role: "system", content: parts.join("\n\n") }, ...recent] : recent;
  return { context, summarized: Boolean(summary) };
}

// ── Provider registry ────────────────────────────────────────────────────

const OPENAI_COMPATIBLE = {
  openai: { baseUrl: "https://api.openai.com/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "gpt-4o-mini" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}`, "HTTP-Referer": "https://orunos.local", "X-Title": "Orun OS" }), defaultModel: "meta-llama/llama-3.3-70b-instruct:free" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "llama-3.3-70b-versatile" },
  github: { baseUrl: "https://models.github.ai/inference", authHeaders: (key) => ({ Authorization: `Bearer ${key}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }), defaultModel: "openai/gpt-4o" },
  opencodezen: { baseUrl: "https://opencode.ai/zen/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "openai/gpt-5.6-sol" },
};

function isOpenAICompatible(provider) {
  return Object.prototype.hasOwnProperty.call(OPENAI_COMPATIBLE, provider);
}

// ── Multimodal message formatting ────────────────────────────────────────
// Messages can optionally carry a single image: { role, content, image: { base64, mime } }.
// Each provider wants images shaped differently, so we translate right before sending.

function formatMessagesFor(provider, messages) {
  return messages.map((m) => {
    if (!m.image) return { role: m.role, content: m.content };
    if (provider === "anthropic") {
      return {
        role: m.role,
        content: [
          { type: "image", source: { type: "base64", media_type: m.image.mime, data: m.image.base64 } },
          { type: "text", text: m.content },
        ],
      };
    }
    if (provider === "ollama") {
      return { role: m.role, content: m.content, images: [m.image.base64] };
    }
    // OpenAI-compatible (openai, openrouter, github; groq mostly lacks vision but shares the shape)
    return {
      role: m.role,
      content: [
        { type: "text", text: m.content },
        { type: "image_url", image_url: { url: `data:${m.image.mime};base64,${m.image.base64}` } },
      ],
    };
  });
}

// ── Non-streaming chat — all return { text, usage: {tokensIn, tokensOut} } ─

async function chatOllama({ model, messages, baseUrl }) {
  const url = `${baseUrl || "http://localhost:11434"}/api/chat`;
  const result = await postJSON(url, {}, { model, messages: formatMessagesFor("ollama", messages), stream: false });
  if (!result || !result.message || typeof result.message.content !== "string") throw new Error("Unexpected response shape from Ollama.");
  return { text: result.message.content, usage: { tokensIn: result.prompt_eval_count || 0, tokensOut: result.eval_count || 0 } };
}

async function chatAnthropic({ model, messages, apiKey }) {
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  const result = await postJSON(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    { model: model || "claude-sonnet-4-6", max_tokens: 1024, system, messages: formatMessagesFor("anthropic", rest) }
  );
  const textBlock = (result.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text content returned by Claude API.");
  return { text: textBlock.text, usage: { tokensIn: result.usage?.input_tokens || 0, tokensOut: result.usage?.output_tokens || 0 } };
}

async function chatOpenAICompatible(provider, { model, messages, apiKey }) {
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!apiKey) throw new Error(`Missing API key for ${provider}.`);
  const result = await postJSON(`${cfg.baseUrl}/chat/completions`, cfg.authHeaders(apiKey), { model: model || cfg.defaultModel, messages: formatMessagesFor(provider, messages) });
  const choice = result.choices && result.choices[0];
  if (!choice) throw new Error(`No choice returned by ${provider}.`);
  return { text: choice.message.content, usage: { tokensIn: result.usage?.prompt_tokens || 0, tokensOut: result.usage?.completion_tokens || 0 } };
}

async function routeChat(req) {
  if (req.provider === "ollama") return chatOllama(req);
  if (req.provider === "anthropic") return chatAnthropic(req);
  if (isOpenAICompatible(req.provider)) return chatOpenAICompatible(req.provider, req);
  throw new Error(`Unknown AI provider: ${req.provider}`);
}

// ── Streaming chat — resolve to { text, usage } too; onChunk still fires per delta ─

async function streamOllama({ model, messages, baseUrl, onChunk, onRequestReady }) {
  const url = `${baseUrl || "http://localhost:11434"}/api/chat`;
  let full = "";
  let usage = { tokensIn: 0, tokensOut: 0 };
  await streamPOST(url, {}, { model, messages, stream: true }, (line) => {
    let obj; try { obj = JSON.parse(line); } catch { return; }
    const delta = obj?.message?.content;
    if (delta) { full += delta; onChunk(delta); }
    if (obj.done) usage = { tokensIn: obj.prompt_eval_count || 0, tokensOut: obj.eval_count || 0 };
  }, onRequestReady);
  if (!full) throw new Error("Ollama returned an empty response — is the model pulled? (ollama pull <model>)");
  return { text: full, usage };
}

async function streamAnthropic({ model, messages, apiKey, onChunk, onRequestReady }) {
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  let full = "";
  let usage = { tokensIn: 0, tokensOut: 0 };
  await streamPOST(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    { model: model || "claude-sonnet-4-6", max_tokens: 1024, system, stream: true, messages: rest.map((m) => ({ role: m.role, content: m.content })) },
    (line) => {
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let obj; try { obj = JSON.parse(data); } catch { return; }
      if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") { full += obj.delta.text; onChunk(obj.delta.text); }
      if (obj.type === "message_start") usage.tokensIn = obj.message?.usage?.input_tokens || 0;
      if (obj.type === "message_delta") usage.tokensOut = obj.usage?.output_tokens || usage.tokensOut;
    },
    onRequestReady
  );
  return { text: full, usage };
}

async function streamOpenAICompatible(provider, { model, messages, apiKey, onChunk, onRequestReady }) {
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!apiKey) throw new Error(`Missing API key for ${provider}.`);
  let full = "";
  let usage = { tokensIn: 0, tokensOut: 0 };
  await streamPOST(
    `${cfg.baseUrl}/chat/completions`,
    cfg.authHeaders(apiKey),
    { model: model || cfg.defaultModel, messages, stream: true, stream_options: { include_usage: true } },
    (line) => {
      if (!line.startsWith("data:")) return;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let obj; try { obj = JSON.parse(data); } catch { return; }
      const delta = obj.choices?.[0]?.delta?.content;
      if (delta) { full += delta; onChunk(delta); }
      if (obj.usage) usage = { tokensIn: obj.usage.prompt_tokens || 0, tokensOut: obj.usage.completion_tokens || 0 };
    },
    onRequestReady
  );
  return { text: full, usage };
}

async function streamChat(req) {
  if (req.provider === "ollama") return streamOllama(req);
  if (req.provider === "anthropic") return streamAnthropic(req);
  if (isOpenAICompatible(req.provider)) return streamOpenAICompatible(req.provider, req);
  throw new Error(`Unknown AI provider: ${req.provider}`);
}

// ── Utilities used by the Settings panel ─────────────────────────────────

async function testConnection(req) {
  try {
    await routeChat({ ...req, messages: [{ role: "user", content: "Reply with the single word: ok" }] });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

async function listOllamaModels(baseUrl) {
  const url = `${baseUrl || "http://localhost:11434"}/api/tags`;
  const result = await getJSON(url);
  return (result.models || []).map((m) => m.name);
}

async function listCloudModels(provider, apiKey) {
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!cfg || !apiKey) return [];
  try {
    const result = await getJSON(`${cfg.baseUrl}/models`, cfg.authHeaders(apiKey));
    return (result.data || []).map((m) => m.id).sort();
  } catch {
    return [];
  }
}

const KNOWN_FREE_MODELS = {
  openrouter: ["meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.0-flash-exp:free", "deepseek/deepseek-chat:free", "qwen/qwen-2.5-72b-instruct:free"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  github: ["openai/gpt-4o", "openai/gpt-4o-mini", "meta/llama-3.3-70b-instruct", "mistral-ai/mistral-large-2411"],
  opencodezen: ["openai/gpt-5.6-sol", "zai/glm-4.7", "zhipuai/glm-4.7-flash", "stepfun/step-3.5-flash:free", "minimax/MiniMax-M2.5", "openrouter/moonshotai/kimi-k2.5"],
};

module.exports = {
  routeChat, streamChat, testConnection, trimContext, buildContext,
  listOllamaModels, listCloudModels, KNOWN_FREE_MODELS,
  PROVIDERS: Object.keys(OPENAI_COMPATIBLE).concat(["ollama", "anthropic"]),
};

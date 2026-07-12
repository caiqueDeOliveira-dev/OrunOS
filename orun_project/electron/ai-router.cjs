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

// ── Rate-limit retry helpers ─────────────────────────────────────────────

function parseRetryAfter(err) {
  try {
    const msg = err?.message || "";
    const jsonStart = msg.indexOf("{");
    if (jsonStart < 0) return null;
    const obj = JSON.parse(msg.slice(jsonStart));
    return obj?.error?.metadata?.retry_after_seconds ?? null;
  } catch { return null; }
}

function sleepMs(ms) { return new Promise((r) => setTimeout(r, ms)); }

function nextFreeModel(provider, currentModel) {
  const free = KNOWN_FREE_MODELS[provider];
  if (!free || free.length <= 1) return null;
  const idx = free.indexOf(currentModel);
  const nextIdx = (idx + 1) % free.length;
  return free[nextIdx];
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

// Inner routeChat — no retry logic, used by retry wrapper
async function routeChatOnce(req) {
  if (req.provider === "ollama") return chatOllama(req);
  if (req.provider === "anthropic") return chatAnthropic(req);
  if (isOpenAICompatible(req.provider)) return chatOpenAICompatible(req.provider, req);
  throw new Error(`Unknown AI provider: ${req.provider}`);
}

/**
 * routeChat with 429 retry: if the provider returns HTTP 429 with
 * retry_after_seconds, waits that long and retries. If retries are
 * exhausted, auto-falls back to the next free model for that provider.
 */
async function routeChat(req) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await routeChatOnce(req);
    } catch (err) {
      lastErr = err;
      const retryAfter = parseRetryAfter(err);
      if (retryAfter && attempt === 0) {
        console.log(`[ai-router] ${req.provider} rate-limited, retrying in ${retryAfter}s`);
        await sleepMs(retryAfter * 1000);
        continue;
      }
      break;
    }
  }
  // Fallback: if the model was rate-limited, try the next free model
  if (isOpenAICompatible(req.provider) && KNOWN_FREE_MODELS[req.provider]) {
    const next = nextFreeModel(req.provider, req.model);
    if (next && next !== req.model) {
      console.log(`[ai-router] ${req.provider} rate-limited on ${req.model}, falling back to ${next}`);
      return routeChatOnce({ ...req, model: next });
    }
  }
  throw lastErr;
}

async function streamChatOnce(req) {
  if (req.provider === "ollama") return streamOllama(req);
  if (req.provider === "anthropic") return streamAnthropic(req);
  if (isOpenAICompatible(req.provider)) return streamOpenAICompatible(req.provider, req);
  throw new Error(`Unknown AI provider: ${req.provider}`);
}

async function streamChat(req) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await streamChatOnce(req);
    } catch (err) {
      lastErr = err;
      const retryAfter = parseRetryAfter(err);
      if (retryAfter && attempt === 0) {
        await sleepMs(retryAfter * 1000);
        continue;
      }
      break;
    }
  }
  if (isOpenAICompatible(req.provider) && KNOWN_FREE_MODELS[req.provider]) {
    const next = nextFreeModel(req.provider, req.model);
    if (next && next !== req.model) {
      console.log(`[ai-router] ${req.provider} stream rate-limited on ${req.model}, falling back to ${next}`);
      return streamChatOnce({ ...req, model: next });
    }
  }
  throw lastErr;
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
  openrouter: [
    "openrouter/owl-alpha:free",
    "nvidia/nemotron-3-super:free",
    "poolside/laguna-m.1:free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-ultra:free",
    "z-ai/glm-4.5-air:free",
    "nvidia/nemotron-nano-12b-vl:free",
    "qwen/qwen3-coder:free",
    "google/gemma-4-31b:free",
    "moonshotai/kimi-k2.6:free",
    "minimax/minimax-m2.7:free",
    "meta-llama/llama-4-maverick:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "deepseek/deepseek-r1-distill-llama-70b",
  ],
  github: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-5-nano",
    "meta/llama-3.3-70b-instruct",
    "mistral-ai/mistral-large-2411",
    "meta/llama-4-scout-17b-16e-instruct",
  ],
  opencodezen: [
    "openai/gpt-5.6-sol",
    "zai/glm-4.7",
    "zhipuai/glm-4.7-flash",
    "stepfun/step-3.5-flash:free",
    "minimax/MiniMax-M2.5",
    "openrouter/moonshotai/kimi-k2.5",
    "nvidia/nemotron-3-ultra-free",
    "cohere/north-mini-code-free",
  ],
};

// Comprehensive model catalog — every model available per provider, with free/paid tag
const MODEL_CATALOG = {
  openai: [
    { id: "gpt-4.1-nano", free: false },
    { id: "gpt-4.1-mini", free: false },
    { id: "gpt-4.1", free: false },
    { id: "gpt-4o-mini", free: false },
    { id: "gpt-4o", free: false },
    { id: "gpt-5-nano", free: false },
    { id: "gpt-5-mini", free: false },
    { id: "gpt-5", free: false },
    { id: "gpt-5.4-nano", free: false },
    { id: "gpt-5.4-mini", free: false },
    { id: "gpt-5.4", free: false },
    { id: "gpt-5.4-pro", free: false },
    { id: "gpt-5.5", free: false },
    { id: "gpt-5.5-pro", free: false },
    { id: "gpt-5.6-luna", free: false },
    { id: "gpt-5.6-terra", free: false },
    { id: "gpt-5.6-sol", free: false },
    { id: "gpt-5.3-codex", free: false },
    { id: "gpt-5.1-codex", free: false },
    { id: "gpt-5.1-codex-max", free: false },
    { id: "o3", free: false },
    { id: "o3-mini", free: false },
    { id: "o4-mini", free: false },
  ],
  anthropic: [
    { id: "claude-haiku-4.5", free: false },
    { id: "claude-sonnet-4.6", free: false },
    { id: "claude-opus-4.8", free: false },
  ],
  openrouter: [
    { id: "openrouter/owl-alpha:free", free: true },
    { id: "nvidia/nemotron-3-super:free", free: true },
    { id: "poolside/laguna-m.1:free", free: true },
    { id: "openai/gpt-oss-120b:free", free: true },
    { id: "openai/gpt-oss-20b:free", free: true },
    { id: "nvidia/nemotron-3-ultra:free", free: true },
    { id: "z-ai/glm-4.5-air:free", free: true },
    { id: "nvidia/nemotron-nano-12b-vl:free", free: true },
    { id: "qwen/qwen3-coder:free", free: true },
    { id: "google/gemma-4-31b:free", free: true },
    { id: "moonshotai/kimi-k2.6:free", free: true },
    { id: "minimax/minimax-m2.7:free", free: true },
    { id: "meta-llama/llama-4-maverick:free", free: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", free: true },
    { id: "deepseek/deepseek-v4-flash", free: false },
    { id: "z-ai/glm-5.1", free: false },
    { id: "qwen/qwen3.5-plus", free: false },
    { id: "minimax/minimax-m3", free: false },
    { id: "moonshotai/kimi-k2.6", free: false },
  ],
  groq: [
    { id: "llama-3.1-8b-instant", free: true },
    { id: "llama-3.3-70b-versatile", free: true },
    { id: "openai/gpt-oss-120b", free: true },
    { id: "openai/gpt-oss-20b", free: true },
    { id: "qwen/qwen3-32b", free: true },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", free: true },
    { id: "deepseek/deepseek-r1-distill-llama-70b", free: true },
  ],
  github: [
    { id: "openai/gpt-4o", free: true },
    { id: "openai/gpt-4o-mini", free: true },
    { id: "openai/gpt-5-nano", free: true },
    { id: "meta/llama-3.3-70b-instruct", free: true },
    { id: "mistral-ai/mistral-large-2411", free: true },
    { id: "meta/llama-4-scout-17b-16e-instruct", free: true },
  ],
  opencodezen: [
    { id: "openai/gpt-5.6-sol", free: true },
    { id: "zai/glm-4.7", free: true },
    { id: "zhipuai/glm-4.7-flash", free: true },
    { id: "stepfun/step-3.5-flash:free", free: true },
    { id: "minimax/MiniMax-M2.5", free: true },
    { id: "openrouter/moonshotai/kimi-k2.5", free: true },
    { id: "nvidia/nemotron-3-ultra-free", free: true },
    { id: "cohere/north-mini-code-free", free: true },
    { id: "openai/gpt-5.5", free: false },
    { id: "openai/gpt-5.5-pro", free: false },
    { id: "openai/gpt-5.4", free: false },
    { id: "openai/gpt-5.4-pro", free: false },
    { id: "openai/gpt-5.4-mini", free: false },
    { id: "openai/gpt-5.4-nano", free: false },
    { id: "openai/gpt-5.3-codex", free: false },
    { id: "openai/gpt-5.3-codex-spark", free: false },
    { id: "openai/gpt-5.2", free: false },
    { id: "openai/gpt-5.2-codex", free: false },
    { id: "openai/gpt-5.1", free: false },
    { id: "openai/gpt-5.1-codex", free: false },
    { id: "openai/gpt-5.1-codex-max", free: false },
    { id: "openai/gpt-5.1-codex-mini", free: false },
    { id: "openai/gpt-5", free: false },
    { id: "openai/gpt-5-codex", free: false },
    { id: "openai/gpt-5-nano", free: false },
    { id: "openai/gpt-5-mini", free: false },
    { id: "openai/gpt-5-pro", free: false },
    { id: "anthropic/claude-opus-4-1", free: false },
    { id: "anthropic/claude-sonnet-4", free: false },
    { id: "qwen/qwen3.5-plus", free: false },
    { id: "qwen/qwen3.7-plus", free: false },
    { id: "minimax/minimax-m3", free: false },
    { id: "google/gemini-3-pro", free: false },
    { id: "google/gemini-3.5-flash", free: false },
    { id: "x-ai/grok-4", free: false },
  ],
};

function getModelCatalog() {
  return MODEL_CATALOG;
}

module.exports = {
  routeChat, streamChat, testConnection, trimContext, buildContext,
  listOllamaModels, listCloudModels, KNOWN_FREE_MODELS, getModelCatalog,
  PROVIDERS: Object.keys(OPENAI_COMPATIBLE).concat(["ollama", "anthropic"]),
};

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
const logger = require("./logger.cjs");
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 120000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 120000 });

// ── Rate limiting per provider ──────────────────────────────────────────

const PROVIDER_RATE_LIMITS = {
  groq: { rpm: 30, rpd: 14400 },
  openrouter: { rpm: 200, rpd: 200 },
  github: { rpm: 15, rpd: 1500 },
  opencodezen: { rpm: 60, rpd: 1000 },
};

const providerRequests = {};

function trackProviderRequest(provider) {
  if (!providerRequests[provider]) {
    providerRequests[provider] = { minute: [], day: [] };
  }
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  providerRequests[provider].minute = providerRequests[provider].minute.filter(t => t > oneMinuteAgo);
  providerRequests[provider].day = providerRequests[provider].day.filter(t => t > oneDayAgo);
  providerRequests[provider].minute.push(now);
  providerRequests[provider].day.push(now);
}

const providerCooldownUntil = {};

function markProviderRateLimited(provider, retryAfterSeconds) {
  const cooldownMs = (retryAfterSeconds || 60) * 1000;
  providerCooldownUntil[provider] = Date.now() + cooldownMs;
  logger.ai.info(`[ai-router] ${provider} marked rate-limited for ${retryAfterSeconds || 60}s`);
}

function isProviderRateLimited(provider) {
  if (providerCooldownUntil[provider] && Date.now() < providerCooldownUntil[provider]) return true;
  const limits = PROVIDER_RATE_LIMITS[provider];
  if (!limits) return false;
  const requests = providerRequests[provider];
  if (!requests) return false;
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const minuteCount = requests.minute.filter(t => t > oneMinuteAgo).length;
  const dayCount = requests.day.filter(t => t > oneDayAgo).length;
  return minuteCount >= limits.rpm || dayCount >= limits.rpd;
}

function getProviderRateLimitStatus(provider) {
  const limits = PROVIDER_RATE_LIMITS[provider];
  if (!limits) return null;
  const requests = providerRequests[provider];
  if (!requests) return { minute: 0, day: 0, limits };
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const minuteCount = requests.minute.filter(t => t > oneMinuteAgo).length;
  const dayCount = requests.day.filter(t => t > oneDayAgo).length;
  return {
    minute: minuteCount,
    day: dayCount,
    limits,
    minuteRemaining: limits.rpm - minuteCount,
    dayRemaining: limits.rpd - dayCount,
  };
}

function selectBestProvider(requestedProvider, allowedProviders) {
  if (requestedProvider && !isProviderRateLimited(requestedProvider) && allowedProviders.includes(requestedProvider)) {
    return requestedProvider;
  }
  for (const provider of allowedProviders) {
    if (!isProviderRateLimited(provider)) {
      return provider;
    }
  }
  return requestedProvider || allowedProviders[0];
}

// ── Low-level HTTP helpers ──────────────────────────────────────────────

function postJSON(urlString, headers, body, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers }, signal: ac.signal, agent: url.protocol === "https:" ? httpsAgent : httpAgent },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          clearTimeout(timer);
          if (res.statusCode && res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`)); return; }
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Failed to parse response: ${data.slice(0, 500)}`)); }
        });
      }
    );
    req.on("error", (err) => { clearTimeout(timer); reject(err); });
    req.write(payload);
    req.end();
  });
}

function getJSON(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: url.pathname + url.search, method: "GET", headers, timeout: 10000, agent: url.protocol === "https:" ? httpsAgent : httpAgent },
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
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers }, timeout: 120000, agent: url.protocol === "https:" ? httpsAgent : httpAgent },
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

function trimContext(messages, systemPrompt, maxMessages = 10) {
  const trimmed = messages.length > maxMessages ? messages.slice(-maxMessages) : messages.slice();
  if (systemPrompt && systemPrompt.trim()) return [{ role: "system", content: systemPrompt.trim() }, ...trimmed];
  return trimmed;
}

const SUMMARY_PROMPT =
  "Summarize the following conversation history in a few short paragraphs, preserving names, decisions, numbers, and any facts needed to continue the conversation naturally. Output only the summary, no preamble. IMPORTANTE: Resuma em português do Brasil (pt-BR).";

/**
 * Smarter context builder: if the conversation is short, just trims as
 * before. If it's long, compresses everything older than the last
 * `maxMessages` into one AI-generated summary instead of silently
 * dropping it — so long-running conversations don't lose earlier facts.
 * Falls back to plain trimming if the summarization call itself fails
 * (e.g. provider down) so a flaky summary never blocks the real reply.
 */
async function buildContext({ messages, systemPrompt, maxMessages = 10, provider, model, baseUrl, apiKey }) {
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
  opencodezen: { baseUrl: "https://opencode.ai/zen/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "gpt-5.6-sol" },
};

function isOpenAICompatible(provider) {
  return Object.prototype.hasOwnProperty.call(OPENAI_COMPATIBLE, provider);
}

// ── Multimodal message formatting ────────────────────────────────────────
// Messages can optionally carry a single image: { role, content, image: { base64, mime } }.
// Each provider wants images shaped differently, so we translate right before sending.

function formatMessagesFor(provider, messages) {
  return messages.map((m) => {
    // Preserve tool_call_id and tool_calls for autonomous loop
    const extra = {};
    if (m.tool_call_id) extra.tool_call_id = m.tool_call_id;
    if (m.tool_calls) extra.tool_calls = m.tool_calls;
    if (!m.image) return { role: m.role, content: m.content, ...extra };
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

// Approximate token count (1 token ≈ 4 chars for English, ~2 for CJK)
const estimateTokens = (text) => Math.ceil((text || "").length / 3.5);

function nextFreeModel(provider, currentModel) {
  const free = KNOWN_FREE_MODELS[provider];
  if (!free || free.length <= 1) return null;
  const idx = free.indexOf(currentModel);
  const nextIdx = (idx + 1) % free.length;
  return free[nextIdx];
}

// ── Non-streaming chat — all return { text, usage: {tokensIn, tokensOut} } ─

async function chatOllama({ model, messages, baseUrl, tools }) {
  const url = `${baseUrl || "http://localhost:11434"}/api/chat`;
  const body = { model, messages: formatMessagesFor("ollama", messages), stream: false };
  if (tools && tools.length) body.tools = tools;
  const result = await postJSON(url, {}, body);
  if (!result || !result.message) throw new Error("Unexpected response shape from Ollama.");
  const toolCalls = (result.message.tool_calls || []).map((tc) => ({
    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
  return { text: result.message.content || null, toolCalls, usage: { tokensIn: result.prompt_eval_count || 0, tokensOut: result.eval_count || 0 } };
}

async function chatAnthropic({ model, messages, apiKey, tools }) {
  if (!apiKey) throw new Error("Missing Anthropic API key.");
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  const body = { model: model || "claude-sonnet-4-6", max_tokens: 4096, system, messages: formatMessagesFor("anthropic", rest) };
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }));
  }
  const result = await postJSON("https://api.anthropic.com/v1/messages", { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body);
  const textBlocks = (result.content || []).filter((b) => b.type === "text");
  const toolBlocks = (result.content || []).filter((b) => b.type === "tool_use");
  const text = textBlocks.map((b) => b.text).join("\n") || null;
  const toolCalls = toolBlocks.map((b) => ({ id: b.id, name: b.name, arguments: b.input }));
  return { text, toolCalls, usage: { tokensIn: result.usage?.input_tokens || 0, tokensOut: result.usage?.output_tokens || 0 } };
}

async function chatOpenAICompatible(provider, { model, messages, apiKey, tools, tool_choice }) {
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!apiKey) throw new Error(`Missing API key for ${provider}.`);
  const body = { model: model || cfg.defaultModel, messages: formatMessagesFor(provider, messages) };
  if (tools && tools.length) {
    body.tools = tools;
    if (tool_choice) body.tool_choice = tool_choice;
  }
  const result = await postJSON(`${cfg.baseUrl}/chat/completions`, cfg.authHeaders(apiKey), body);
  const choice = result.choices && result.choices[0];
  if (!choice) throw new Error(`No choice returned by ${provider}.`);
  const toolCalls = (choice.message.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }));
  return { text: choice.message.content || null, toolCalls, usage: { tokensIn: result.usage?.prompt_tokens || 0, tokensOut: result.usage?.completion_tokens || 0 } };
}

// ── Streaming functions ────────────────────────────────────────────────

async function streamOllama({ model, messages, baseUrl, onChunk }) {
  const url = `${baseUrl || "http://localhost:11434"}/api/chat`;
  const body = { model, messages: formatMessagesFor("ollama", messages), stream: true };
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  let fullText = "";
  await streamPOST(url, {}, body, (line) => {
    try {
      const obj = JSON.parse(line);
      if (obj.message?.content) { fullText += obj.message.content; onChunk?.(obj.message.content); }
    } catch { /* ignore partial lines */ }
  });
  return { text: fullText, toolCalls: [], usage: { tokensIn: estimateTokens(systemPrompt), tokensOut: estimateTokens(fullText) } };
}

async function streamAnthropic({ model, messages, apiKey, onChunk }) {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  const body = { model: model || "claude-sonnet-4-6", max_tokens: 4096, system, messages: formatMessagesFor("anthropic", rest), stream: true };
  let fullText = "";
  await streamPOST("https://api.anthropic.com/v1/messages", { "x-api-key": apiKey, "anthropic-version": "2023-06-01", accept: "application/vnd.ant.messages+json" }, body, (line) => {
    try {
      const obj = JSON.parse(line.replace(/^data: /, ""));
      if (obj.type === "content_block_delta" && obj.delta?.text) { fullText += obj.delta.text; onChunk?.(obj.delta.text); }
    } catch { /* ignore */ }
  });
  return { text: fullText, toolCalls: [], usage: { tokensIn: estimateTokens(system), tokensOut: estimateTokens(fullText) } };
}

async function streamOpenAICompatible(provider, { model, messages, apiKey, onChunk }) {
  const cfg = OPENAI_COMPATIBLE[provider];
  if (!apiKey) throw new Error(`Missing API key for ${provider}.`);
  const body = { model: model || cfg.defaultModel, messages: formatMessagesFor(provider, messages), stream: true };
  const systemPrompt = messages.find((m) => m.role === "system")?.content || "";
  let fullText = "";
  await streamPOST(`${cfg.baseUrl}/chat/completions`, cfg.authHeaders(apiKey), body, (line) => {
    try {
      const obj = JSON.parse(line.replace(/^data: /, ""));
      const delta = obj.choices?.[0]?.delta?.content;
      if (delta) { fullText += delta; onChunk?.(delta); }
    } catch { /* ignore */ }
  });
  return { text: fullText, toolCalls: [], usage: { tokensIn: estimateTokens(systemPrompt), tokensOut: estimateTokens(fullText) } };
}

// Inner routeChat — no retry logic, used by retry wrapper
async function routeChatOnce(req) {
  if (req.provider === "ollama") return chatOllama(req);
  if (req.provider === "anthropic") return chatAnthropic(req);
  if (isOpenAICompatible(req.provider)) return chatOpenAICompatible(req.provider, req);
  throw new Error(`Unknown AI provider: ${req.provider}`);
}

/**
 * routeChat with 429 retry and per-provider rate limiting.
 * If the requested provider is rate limited, selects the best available
 * provider before making the call. After a successful call, tracks the
 * request. If retries are exhausted, auto-falls back to the next free
 * model for that provider, then cross-provider.
 */
async function routeChat(req) {
  const allProviders = ["groq", "openrouter", "github", "opencodezen"];
  const bestProvider = selectBestProvider(req.provider, allProviders.filter((p) => p !== "ollama" && p !== "anthropic").concat(["ollama", "anthropic"]));
  const effectiveReq = bestProvider !== req.provider ? { ...req, provider: bestProvider } : req;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await Promise.race([
        routeChatOnce(effectiveReq),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 45s")), 45000)),
      ]);
      trackProviderRequest(effectiveReq.provider);
      return result;
    } catch (err) {
      lastErr = err;
      const isRetryable = err.message?.includes("429") || err.message?.includes("500") || err.message?.includes("502") || err.message?.includes("503") || err.message?.includes("ECONNRESET") || err.message?.includes("ETIMEDOUT");
      if (err.message?.includes("429")) {
        const retryAfter = parseRetryAfter(err);
        markProviderRateLimited(effectiveReq.provider, retryAfter || 60);
      }
      if (attempt < 2 && isRetryable) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        logger.ai.info(`[ai-router] ${effectiveReq.provider} retryable error, attempt ${attempt + 1}, backing off ${delayMs}ms`);
        await sleepMs(delayMs);
        continue;
      }
      break;
    }
  }
  // Fallback: try the next free model within same provider
  if (isOpenAICompatible(effectiveReq.provider) && KNOWN_FREE_MODELS[effectiveReq.provider]) {
    const next = nextFreeModel(effectiveReq.provider, effectiveReq.model);
    if (next && next !== effectiveReq.model) {
      logger.ai.info(`[ai-router] ${effectiveReq.provider} falling back to ${next}`);
      try {
        const result = await Promise.race([
          routeChatOnce({ ...effectiveReq, model: next }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 45s")), 45000)),
        ]);
        trackProviderRequest(effectiveReq.provider);
        return result;
      } catch (fallbackErr) {
        lastErr = fallbackErr;
      }
    }
  }
  // Cross-provider fallback (skip rate-limited providers)
  const crossProviders = allProviders.filter((p) => p !== effectiveReq.provider && !isProviderRateLimited(p));
  for (const fallbackProvider of crossProviders) {
    try {
      const fallbackModels = KNOWN_FREE_MODELS[fallbackProvider] || [];
      if (fallbackModels.length === 0) continue;
      logger.ai.info(`[ai-router] cross-provider fallback to ${fallbackProvider}/${fallbackModels[0]}`);
      const fbResult = await routeChatOnce({
        ...effectiveReq,
        provider: fallbackProvider,
        model: fallbackModels[0],
        apiKey: "",
        baseUrl: undefined,
      });
      trackProviderRequest(fallbackProvider);
      return { ...fbResult, provider: fallbackProvider, model: fallbackModels[0] };
    } catch { /* continue to next provider */ }
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
  const allProviders = ["groq", "openrouter", "github", "opencodezen"];
  const bestProvider = selectBestProvider(req.provider, allProviders.filter((p) => p !== "ollama" && p !== "anthropic").concat(["ollama", "anthropic"]));
  const effectiveReq = bestProvider !== req.provider ? { ...req, provider: bestProvider } : req;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await streamChatOnce(effectiveReq);
      trackProviderRequest(effectiveReq.provider);
      return result;
    } catch (err) {
      lastErr = err;
      const isRetryable = err.message?.includes("429") || err.message?.includes("500") || err.message?.includes("502") || err.message?.includes("503") || err.message?.includes("ECONNRESET") || err.message?.includes("ETIMEDOUT");
      if (err.message?.includes("429")) {
        const retryAfter = parseRetryAfter(err);
        markProviderRateLimited(effectiveReq.provider, retryAfter || 60);
      }
      if (attempt < 2 && isRetryable) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
        logger.ai.info(`[ai-router] ${effectiveReq.provider} stream retryable error, attempt ${attempt + 1}, backing off ${delayMs}ms`);
        await sleepMs(delayMs);
        continue;
      }
      break;
    }
  }
  if (isOpenAICompatible(effectiveReq.provider) && KNOWN_FREE_MODELS[effectiveReq.provider]) {
    const next = nextFreeModel(effectiveReq.provider, effectiveReq.model);
    if (next && next !== effectiveReq.model) {
      logger.ai.info(`[ai-router] ${effectiveReq.provider} stream rate-limited on ${effectiveReq.model}, falling back to ${next}`);
      const result = await streamChatOnce({ ...effectiveReq, model: next });
      trackProviderRequest(effectiveReq.provider);
      return result;
    }
  }
  // Cross-provider fallback (skip rate-limited providers)
  const crossProviders = allProviders.filter((p) => p !== effectiveReq.provider && !isProviderRateLimited(p));
  for (const fallbackProvider of crossProviders) {
    try {
      const fallbackModels = KNOWN_FREE_MODELS[fallbackProvider] || [];
      if (fallbackModels.length === 0) continue;
      logger.ai.info(`[ai-router] stream cross-provider fallback to ${fallbackProvider}/${fallbackModels[0]}`);
      const fbResult = await streamChatOnce({
        ...effectiveReq,
        provider: fallbackProvider,
        model: fallbackModels[0],
        apiKey: "",
        baseUrl: undefined,
      });
      trackProviderRequest(fallbackProvider);
      return { ...fbResult, provider: fallbackProvider, model: fallbackModels[0] };
    } catch { /* continue to next provider */ }
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

/**
 * Chat with tool-calling support. Same as routeChat but documents the
 * `tools` parameter. Returns { text, toolCalls, usage }.
 */
async function chatWithTools(req) {
  return routeChat(req);
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
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-coder:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "openai/gpt-oss-20b:free",
    "tencent/hy3:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "poolside/laguna-m.1:free",
    "poolside/laguna-xs-2.1:free",
    "cohere/north-mini-code:free",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
    "groq/compound",
    "groq/compound-mini",
  ],
  github: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "openai/gpt-5-nano",
    "meta/llama-3.3-70b-instruct",
    "meta/llama-4-scout-17b-16e-instruct",
    "mistral-ai/mistral-large-2411",
    "mistral-ai/codestral-2501",
  ],
  opencodezen: [
    "big-pickle",
    "deepseek-v4-flash-free",
    "mimo-v2.5-free",
    "nemotron-3-ultra-free",
    "north-mini-code-free",
    "gpt-5.6-sol",
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
    { id: "meta-llama/llama-3.3-70b-instruct:free", free: true },
    { id: "qwen/qwen3-coder:free", free: true },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", free: true },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", free: true },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true },
    { id: "nvidia/nemotron-nano-9b-v2:free", free: true },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free", free: true },
    { id: "openai/gpt-oss-20b:free", free: true },
    { id: "tencent/hy3:free", free: true },
    { id: "google/gemma-4-31b-it:free", free: true },
    { id: "google/gemma-4-26b-a4b-it:free", free: true },
    { id: "poolside/laguna-m.1:free", free: true },
    { id: "poolside/laguna-xs-2.1:free", free: true },
    { id: "cohere/north-mini-code:free", free: true },
    { id: "deepseek/deepseek-v4-flash", free: false },
    { id: "z-ai/glm-5.1", free: false },
    { id: "qwen/qwen3.5-plus", free: false },
    { id: "minimax/minimax-m3", free: false },
    { id: "moonshotai/kimi-k2.6", free: false },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", free: true },
    { id: "llama-3.1-8b-instant", free: true },
    { id: "qwen/qwen3-32b", free: true },
    { id: "openai/gpt-oss-120b", free: true },
    { id: "openai/gpt-oss-20b", free: true },
    { id: "allam-2-7b", free: true },
    { id: "groq/compound", free: true },
    { id: "groq/compound-mini", free: true },
  ],
  github: [
    { id: "openai/gpt-4o", free: true },
    { id: "openai/gpt-4o-mini", free: true },
    { id: "openai/gpt-5-nano", free: true },
    { id: "meta/llama-3.3-70b-instruct", free: true },
    { id: "meta/llama-4-scout-17b-16e-instruct", free: true },
    { id: "mistral-ai/mistral-large-2411", free: true },
    { id: "mistral-ai/codestral-2501", free: true },
  ],
  opencodezen: [
    { id: "gpt-5.6-sol", free: true },
    { id: "gpt-5.6-terra", free: false },
    { id: "gpt-5.6-luna", free: false },
    { id: "gpt-5.5", free: false },
    { id: "gpt-5.5-pro", free: false },
    { id: "gpt-5.4", free: false },
    { id: "gpt-5.4-pro", free: false },
    { id: "gpt-5.4-mini", free: false },
    { id: "gpt-5.4-nano", free: false },
    { id: "gpt-5.3-codex", free: false },
    { id: "gpt-5.3-codex-spark", free: false },
    { id: "gpt-5.2", free: false },
    { id: "gpt-5.2-codex", free: false },
    { id: "gpt-5.1", free: false },
    { id: "gpt-5.1-codex", free: false },
    { id: "gpt-5.1-codex-max", free: false },
    { id: "gpt-5.1-codex-mini", free: false },
    { id: "gpt-5", free: false },
    { id: "gpt-5-codex", free: false },
    { id: "gpt-5-nano", free: false },
    { id: "gpt-5-mini", free: false },
    { id: "gpt-5-pro", free: false },
    { id: "claude-opus-4-1", free: false },
    { id: "claude-opus-4-5", free: false },
    { id: "claude-opus-4-6", free: false },
    { id: "claude-opus-4-7", free: false },
    { id: "claude-opus-4-8", free: false },
    { id: "claude-fable-5", free: false },
    { id: "claude-sonnet-4", free: false },
    { id: "claude-sonnet-4-5", free: false },
    { id: "claude-sonnet-4-6", free: false },
    { id: "claude-sonnet-5", free: false },
    { id: "claude-haiku-4-5", free: false },
    { id: "gemini-3-flash", free: false },
    { id: "gemini-3.1-pro", free: false },
    { id: "gemini-3.5-flash", free: false },
    { id: "grok-4.5", free: false },
    { id: "grok-build-0.1", free: false },
    { id: "deepseek-v4-flash", free: false },
    { id: "deepseek-v4-pro", free: false },
    { id: "glm-5", free: false },
    { id: "glm-5.1", free: false },
    { id: "glm-5.2", free: false },
    { id: "minimax-m2.5", free: false },
    { id: "minimax-m2.7", free: false },
    { id: "minimax-m3", free: false },
    { id: "kimi-k2.5", free: false },
    { id: "kimi-k2.6", free: false },
    { id: "kimi-k2.7-code", free: false },
    { id: "qwen3.5-plus", free: false },
    { id: "qwen3.6-plus", free: false },
    { id: "big-pickle", free: true },
    { id: "deepseek-v4-flash-free", free: true },
    { id: "mimo-v2.5-free", free: true },
    { id: "hy3-free", free: true },
    { id: "nemotron-3-ultra-free", free: true },
    { id: "north-mini-code-free", free: true },
  ],
};

function getModelCatalog() {
  return MODEL_CATALOG;
}

module.exports = {
  routeChat, streamChat, chatWithTools, testConnection, trimContext, buildContext,
  listOllamaModels, listCloudModels, KNOWN_FREE_MODELS, getModelCatalog,
  PROVIDERS: Object.keys(OPENAI_COMPATIBLE).concat(["ollama", "anthropic"]),
  PROVIDER_RATE_LIMITS, getProviderRateLimitStatus,
};

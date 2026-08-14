// electron/ai-router.cjs
//
// Central "AI Router" for Orun OS.
// Given a provider + model + message history, calls the right backend and
// returns/streams a reply — plus, where the provider reports it, token
// usage for the "Usage today" panel. Ollama and Anthropic have their own
// wire format; everything else (OpenAI, OpenRouter, Groq, NVIDIA, Ollama
// Cloud, OpenCodeZen) speaks the same OpenAI-compatible Chat Completions
// API, so they share one implementation and only differ by base URL + auth headers.

const https = require("https");
const http = require("http");
const logger = require("./logger.cjs");
const providerFallback = require("./provider-fallback.cjs");
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 120000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10, maxFreeSockets: 5, timeout: 120000 });

// ── Rate limiting per provider ──────────────────────────────────────────

const PROVIDER_RATE_LIMITS = {
  groq: { rpm: 30, rpd: 14400 },
  openrouter: { rpm: 200, rpd: 200 },
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

// ── Per-key rotation (up to 3 keys per provider) ─────────────────────────
// When a key's token quota runs out (429 / insufficient_quota / billing),
// that key is put on cooldown and the router rotates to the next key of the
// SAME provider. Only when every key of the provider is exhausted does the
// call fail upward so callers can fall back to another provider.

const KEY_COOLDOWN_QUOTA_MS = 60 * 60 * 1000; // quota/billing exhausted → 1h
const KEY_COOLDOWN_RATE_MS = 60 * 1000; // plain 429 → 1min
const keyCooldownUntil = {};

function keyCooldownSlot(provider, index) {
  return `${provider}:${index}`;
}

function markKeyExhausted(provider, index, cooldownMs) {
  keyCooldownUntil[keyCooldownSlot(provider, index)] = Date.now() + cooldownMs;
}

function isKeyExhausted(provider, index) {
  return (keyCooldownUntil[keyCooldownSlot(provider, index)] || 0) > Date.now();
}

/**
 * Normalize apiKeys into an ordered list. Accepts either an `apiKeys` array
 * (multi-key, up to 3) or a single `apiKey` string. Empty/missing → [].
 */
function resolveApiKeys(req) {
  if (Array.isArray(req.apiKeys)) {
    return req.apiKeys.filter((k) => typeof k === "string" && k.trim()).map((k) => k.trim());
  }
  if (typeof req.apiKey === "string" && req.apiKey.trim()) return [req.apiKey.trim()];
  return [];
}

/**
 * True when the error means THIS KEY ran out of tokens (rotate to next key).
 * 429 (rate limit / quota), 402 (insufficient_quota), and provider messages
 * about billing/quota/balance/spend — but NOT generic 5xx or context limits.
 */
function isKeyQuotaError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (/429|402/.test(msg)) return true;
  return /insufficient_quota|insufficient balance|rate_limit_exceeded|rate limit|quota exceeded|billing|out of (credits|tokens|requests)|spend limit|exceeded your current|current quota/i.test(msg);
}

/** Cooldown duration for an exhausted key, based on the error type. */
function keyCooldownFor(err) {
  if (err?.message?.includes("429")) {
    return (parseRetryAfter(err) || 60) * 1000;
  }
  return KEY_COOLDOWN_QUOTA_MS;
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
  "Summarize the following conversation history in a few short paragraphs, preserving names, decisions, numbers, and any facts needed to continue the conversation naturally. Output only the summary, no preamble.";

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
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}`, "HTTP-Referer": "https://orunos.local", "X-Title": "Orun OS" }), defaultModel: "openai/gpt-oss-20b:free" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "llama-3.3-70b-versatile" },
  opencodezen: { baseUrl: "https://opencode.ai/zen/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "big-pickle" },
  // NVIDIA NIM Cloud — https://build.nvidia.com (free credits mensalmente).
  nvidia: { baseUrl: "https://integrate.api.nvidia.com/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "meta/llama-3.1-70b-instruct" },
  // Ollama Cloud — https://ollama.com (mesma API OpenAI-compat, modelos hospedados).
  ollama_cloud: { baseUrl: "https://ollama.com/v1", authHeaders: (key) => ({ Authorization: `Bearer ${key}` }), defaultModel: "gpt-oss:120b" },
};

function isOpenAICompatible(provider) {
  return Object.prototype.hasOwnProperty.call(OPENAI_COMPATIBLE, provider);
}

// ── Multimodal message formatting ────────────────────────────────────────
// Messages can optionally carry a single image: { role, content, image: { base64, mime } }.
// Each provider wants images shaped differently, so we translate right before sending.

function formatMessagesFor(provider, messages) {
  return messages.map((m) => {
    // Preserve tool_call_id, tool_calls, and reasoning_content for the autonomous loop.
    // DeepSeek (and gateways proxying it, e.g. opencodezen in thinking mode) requires
    // assistant `reasoning_content` to be echoed back verbatim on subsequent requests,
    // otherwise it rejects with HTTP 400 "The reasoning_content ... must be passed back".
    const extra = {};
    if (m.tool_call_id) extra.tool_call_id = m.tool_call_id;
    if (m.tool_calls) extra.tool_calls = m.tool_calls;
    if (m.reasoning_content) extra.reasoning_content = m.reasoning_content;
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
    // OpenAI-compatible (openai, openrouter, nvidia, ollama_cloud, opencodezen; groq mostly lacks vision but shares the shape)
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

const parseRetryAfter = providerFallback.parseRetryAfter;

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
  return { text: choice.message.content || null, toolCalls, reasoningContent: choice.message.reasoning_content, usage: { tokensIn: result.usage?.prompt_tokens || 0, tokensOut: result.usage?.completion_tokens || 0 } };
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
  let fullReasoning = "";
  await streamPOST(`${cfg.baseUrl}/chat/completions`, cfg.authHeaders(apiKey), body, (line) => {
    try {
      const obj = JSON.parse(line.replace(/^data: /, ""));
      const delta = obj.choices?.[0]?.delta?.content;
      if (delta) { fullText += delta; onChunk?.(delta); }
      const reasoningDelta = obj.choices?.[0]?.delta?.reasoning_content;
      if (reasoningDelta) fullReasoning += reasoningDelta;
    } catch { /* ignore */ }
  });
  return { text: fullText, toolCalls: [], reasoningContent: fullReasoning || undefined, usage: { tokensIn: estimateTokens(systemPrompt), tokensOut: estimateTokens(fullText) } };
}

// Normalize tool definitions into the OpenAI function-calling schema.
// MCP and plugin tools arrive as { name, description, parameters } while the
// chat providers expect { type: "function", function: { name, ... } }.
function normalizeTools(tools) {
  if (!Array.isArray(tools)) return tools;
  return tools.map((t) => {
    if (t && t.type === "function" && t.function?.name) return t;
    if (t && t.name) {
      return { type: "function", function: { name: t.name, description: t.description || "", parameters: t.parameters || t.inputSchema || { type: "object", properties: {} } } };
    }
    return t;
  });
}

// Inner routeChat — no retry logic, used by retry wrapper
async function routeChatOnce(req) {
  if (!req?.provider) throw new Error("Missing API key for provider.");
  if (req.tools?.length) req = { ...req, tools: normalizeTools(req.tools) };
  if (req.provider === "ollama") return chatOllama(req);
  if (req.provider === "anthropic") return chatAnthropic(req);
  if (isOpenAICompatible(req.provider)) return chatOpenAICompatible(req.provider, req);
  throw new Error(`Missing API key for provider: ${req.provider}`);
}

/**
 * routeChat with 429 retry, per-provider rate limiting and per-key rotation.
 * If the requested provider is rate limited, selects the best available
 * provider before making the call. When a key's quota runs out, rotates to
 * the next configured key for the same provider; only after ALL keys are
 * exhausted does it fall back to the next free model and rethrow so callers
 * can switch providers.
 */
async function routeChat(req) {
  // Provider changes require that provider's own keys.  The IPC layer owns
  // cross-provider fallback, so this low-level router must never silently
  // change provider while carrying a key from the original provider.
  const effectiveReq = req;

  // Ordered list of keys for this provider; [] means "no key configured".
  const keys = resolveApiKeys(effectiveReq);
  if (keys.length === 0) keys.push(undefined);

  let lastErr;
  for (let ki = 0; ki < keys.length; ki++) {
    if (isKeyExhausted(effectiveReq.provider, ki)) continue;
    const keyReq = { ...effectiveReq, apiKey: keys[ki] };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await Promise.race([
          routeChatOnce(keyReq),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 45s")), 45000)),
        ]);
        trackProviderRequest(effectiveReq.provider);
        return result;
      } catch (err) {
        lastErr = err;
        if (isKeyQuotaError(err)) {
          // This key's tokens are done — mark it and rotate to the next key.
          markKeyExhausted(effectiveReq.provider, ki, keyCooldownFor(err));
          logger.ai.info(`[ai-router] ${effectiveReq.provider} key ${ki + 1}/${keys.length} exhausted (${err.message}), rotating to next key`);
          break;
        }
        const isRetryable = err.message?.includes("500") || err.message?.includes("502") || err.message?.includes("503") || err.message?.includes("ECONNRESET") || err.message?.includes("ETIMEDOUT");
        if (attempt < 2 && isRetryable) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          logger.ai.info(`[ai-router] ${effectiveReq.provider} retryable error, attempt ${attempt + 1}, backing off ${delayMs}ms`);
          await sleepMs(delayMs);
          continue;
        }
        // Persistent non-quota failure on this key — try the next key.
        break;
      }
    }
  }
  // Fallback: try the next free model within same provider (only if a key is usable).
  if (isOpenAICompatible(effectiveReq.provider) && KNOWN_FREE_MODELS[effectiveReq.provider]) {
    const next = nextFreeModel(effectiveReq.provider, effectiveReq.model);
    const fallbackKey = keys.find((_k, i) => !isKeyExhausted(effectiveReq.provider, i));
    if (next && next !== effectiveReq.model && fallbackKey !== undefined) {
      logger.ai.info(`[ai-router] ${effectiveReq.provider} falling back to ${next}`);
      try {
        const result = await Promise.race([
          routeChatOnce({ ...effectiveReq, model: next, apiKey: fallbackKey }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 45s")), 45000)),
        ]);
        trackProviderRequest(effectiveReq.provider);
        return result;
      } catch (fallbackErr) {
        lastErr = fallbackErr;
      }
    }
  }
  // Cross-provider fallback — note: callers should handle their own fallback
  // with proper API keys. This is a last-resort fallback that only works if
  // the request already has a valid apiKey that happens to work on another provider.
  if (lastErr === undefined) {
    lastErr = new Error(`All API keys for ${effectiveReq.provider} are exhausted or rate-limited.`);
  }
  throw lastErr;
}

async function streamChatOnce(req) {
  if (!req?.provider) throw new Error("Missing API key for provider.");
  if (req.provider === "ollama") return streamOllama(req);
  if (req.provider === "anthropic") return streamAnthropic(req);
  if (isOpenAICompatible(req.provider)) return streamOpenAICompatible(req.provider, req);
  throw new Error(`Missing API key for provider: ${req.provider}`);
}

async function streamChat(req) {
  // See routeChat: cross-provider fallback is handled above this layer, where
  // the correct set of keys is available for each provider.
  const effectiveReq = req;

  const keys = resolveApiKeys(effectiveReq);
  if (keys.length === 0) keys.push(undefined);

  let lastErr;
  for (let ki = 0; ki < keys.length; ki++) {
    if (isKeyExhausted(effectiveReq.provider, ki)) continue;
    const keyReq = { ...effectiveReq, apiKey: keys[ki] };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await streamChatOnce(keyReq);
        trackProviderRequest(effectiveReq.provider);
        return result;
      } catch (err) {
        lastErr = err;
        if (isKeyQuotaError(err)) {
          markKeyExhausted(effectiveReq.provider, ki, keyCooldownFor(err));
          logger.ai.info(`[ai-router] ${effectiveReq.provider} key ${ki + 1}/${keys.length} stream exhausted (${err.message}), rotating to next key`);
          break;
        }
        const isRetryable = err.message?.includes("500") || err.message?.includes("502") || err.message?.includes("503") || err.message?.includes("ECONNRESET") || err.message?.includes("ETIMEDOUT");
        if (attempt < 2 && isRetryable) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          logger.ai.info(`[ai-router] ${effectiveReq.provider} stream retryable error, attempt ${attempt + 1}, backing off ${delayMs}ms`);
          await sleepMs(delayMs);
          continue;
        }
        break;
      }
    }
  }
  if (isOpenAICompatible(effectiveReq.provider) && KNOWN_FREE_MODELS[effectiveReq.provider]) {
    const next = nextFreeModel(effectiveReq.provider, effectiveReq.model);
    const fallbackKey = keys.find((_k, i) => !isKeyExhausted(effectiveReq.provider, i));
    if (next && next !== effectiveReq.model && fallbackKey !== undefined) {
      logger.ai.info(`[ai-router] ${effectiveReq.provider} stream rate-limited on ${effectiveReq.model}, falling back to ${next}`);
      try {
        const result = await streamChatOnce({ ...effectiveReq, model: next, apiKey: fallbackKey });
        trackProviderRequest(effectiveReq.provider);
        return result;
      } catch (fallbackErr) {
        lastErr = fallbackErr;
      }
    }
  }
  // Cross-provider fallback — note: callers should handle their own fallback
  // with proper API keys. This is a last-resort fallback that only works if
  // the request already has a valid apiKey that happens to work on another provider.
  if (lastErr === undefined) {
    lastErr = new Error(`All API keys for ${effectiveReq.provider} are exhausted or rate-limited.`);
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

const KNOWN_FREE_MODELS = providerFallback.KNOWN_FREE_MODELS;

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
    { id: "openai/gpt-oss-20b:free", free: true },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", free: true },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", free: true },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", free: true },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", free: true },
    { id: "nvidia/nemotron-3.5-lightning:free", free: true },
    { id: "nvidia/nemotron-3.5-content-safety:free", free: true },
    { id: "nvidia/nemotron-nano-9b-v2:free", free: true },
    { id: "nvidia/nemotron-nano-12b-v2-vl:free", free: true },
    { id: "google/gemma-4-31b-it:free", free: true },
    { id: "google/gemma-4-26b-a4b-it:free", free: true },
    { id: "cohere/north-mini-code:free", free: true },
    { id: "poolside/laguna-s-2.1:free", free: true },
    { id: "poolside/laguna-xs-2.1:free", free: true },
    { id: "liquid/lfm-2.5-2.6b:free", free: true },
    { id: "openrouter/free", free: true },
    { id: "deepseek/deepseek-v4-flash", free: false },
    { id: "z-ai/glm-5.1", free: false },
    { id: "qwen/qwen3.5-plus", free: false },
    { id: "minimax/minimax-m3", free: false },
    { id: "moonshotai/kimi-k2.6", free: false },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", free: true },
    { id: "llama-3.1-8b-instant", free: true },
    { id: "openai/gpt-oss-120b", free: true },
    { id: "openai/gpt-oss-20b", free: true },
    { id: "allam-2-7b", free: true },
    { id: "groq/compound", free: true },
    { id: "groq/compound-mini", free: true },
  ],
  opencodezen: [
    { id: "big-pickle", free: true },
    { id: "deepseek-v4-flash-free", free: true },
    { id: "mimo-v2.5-free", free: true },
    { id: "hy3-free", free: true },
    { id: "nemotron-3-ultra-free", free: true },
    { id: "nemotron-3.5-lightning-free", free: true },
    { id: "laguna-s-2.1-free", free: true },
    { id: "gpt-5.6-sol", free: false },
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
    { id: "claude-fable-5", free: false },
    { id: "claude-opus-5", free: false },
    { id: "claude-opus-4-8", free: false },
    { id: "claude-opus-4-7", free: false },
    { id: "claude-opus-4-6", free: false },
    { id: "claude-opus-4-5", free: false },
    { id: "claude-sonnet-5", free: false },
    { id: "claude-sonnet-4-6", free: false },
    { id: "claude-sonnet-4-5", free: false },
    { id: "claude-sonnet-4", free: false },
    { id: "claude-haiku-4-5", free: false },
    { id: "gemini-3.7-flash", free: false },
    { id: "gemini-3.6-flash", free: false },
    { id: "gemini-3.5-flash-lite", free: false },
    { id: "gemini-3.5-flash", free: false },
    { id: "gemini-3.1-pro", free: false },
    { id: "gemini-3-flash", free: false },
    { id: "grok-4.6", free: false },
    { id: "grok-4.5", free: false },
    { id: "grok-build-0.1", free: false },
    { id: "muse-spark-1.2", free: false },
    { id: "deepseek-v4-pro", free: false },
    { id: "deepseek-v4-flash", free: false },
    { id: "glm-5.2", free: false },
    { id: "glm-5.1", free: false },
    { id: "glm-5", free: false },
    { id: "minimax-m3", free: false },
    { id: "minimax-m2.7", free: false },
    { id: "minimax-m2.5", free: false },
    { id: "kimi-k3", free: false },
    { id: "kimi-k2.7-code", free: false },
    { id: "kimi-k2.6", free: false },
    { id: "kimi-k2.5", free: false },
    { id: "qwen3.6-plus", free: false },
    { id: "qwen3.5-plus", free: false },
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
  resolveApiKeys, isKeyQuotaError, markKeyExhausted, isKeyExhausted,
};

// electron/provider-fallback.cjs
//
// Centralized provider selection and fallback for Orun OS.
// Eliminates 3x duplicated fallback logic across ai-router.cjs.

const KNOWN_FREE_MODELS = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b", "groq/compound", "groq/compound-mini"],
  openrouter: ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-coder:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3-nano-30b-a3b:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "nvidia/nemotron-nano-9b-v2:free", "nvidia/nemotron-nano-12b-v2-vl:free", "openai/gpt-oss-20b:free", "tencent/hy3:free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "poolside/laguna-m.1:free", "poolside/laguna-xs-2.1:free", "cohere/north-mini-code:free"],
  github: ["openai/gpt-4o", "openai/gpt-4o-mini", "openai/gpt-5-nano", "meta/llama-3.3-70b-instruct", "meta/llama-4-scout-17b-16e-instruct"],
  opencodezen: ["big-pickle", "deepseek-v4-flash-free", "mimo-v2.5-free", "nemotron-3-ultra-free", "north-mini-code-free", "gpt-5.6-sol"],
};

const PROVIDER_ORDER = ["groq", "openrouter", "github", "opencodezen"];

function getFreeModels(provider) {
  return KNOWN_FREE_MODELS[provider] || [];
}

function getProvidersExcluding(exclude) {
  return PROVIDER_ORDER.filter((p) => p !== exclude);
}

function buildFallbackChain(provider, model) {
  // Returns an ordered list of { provider, model } to try
  const chain = [];
  
  // 1. Same provider, different free models
  const freeModels = KNOWN_FREE_MODELS[provider] || [];
  for (const m of freeModels) {
    if (m !== model) chain.push({ provider, model: m });
  }
  
  // 2. Other providers
  for (const p of PROVIDER_ORDER) {
    if (p === provider) continue;
    const pModels = KNOWN_FREE_MODELS[p] || [];
    if (pModels.length > 0) chain.push({ provider: p, model: pModels[0] });
  }
  
  return chain;
}

function isRetryableError(err) {
  const msg = err?.message || "";
  return msg.includes("429") || msg.includes("500") || msg.includes("502") || 
         msg.includes("503") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") ||
         msg.includes("rate-limited") || msg.includes("overloaded");
}

function getRetryDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 5000);
}

function parseRetryAfter(err) {
  try {
    const match = err.message.match(/retry_after["\s:]+(\d+)/i);
    if (match) return Math.min(parseInt(match[1], 10), 5);
  } catch {}
  return null;
}

module.exports = {
  KNOWN_FREE_MODELS,
  PROVIDER_ORDER,
  getFreeModels,
  getProvidersExcluding,
  buildFallbackChain,
  isRetryableError,
  getRetryDelay,
  parseRetryAfter,
};

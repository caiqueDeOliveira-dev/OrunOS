// electron/provider-fallback.cjs
//
// Centralized provider selection and fallback for Orun OS.
// Eliminates 3x duplicated fallback logic across ai-router.cjs.

const KNOWN_FREE_MODELS = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b", "groq/compound", "groq/compound-mini"],
  openrouter: ["openai/gpt-4o-mini", "meta-llama/llama-3.1-8b-instruct", "mistralai/mistral-nemo", "qwen/qwen-2.5-72b-instruct"],
  github: ["openai/gpt-4o", "openai/gpt-4o-mini", "openai/gpt-5-nano", "meta/llama-3.3-70b-instruct", "meta/llama-4-scout-17b-16e-instruct", "mistral-ai/mistral-large-2411", "mistral-ai/codestral-2501"],
  opencodezen: ["deepseek-v4-flash-free", "mimo-v2.5-free", "nemotron-3-ultra-free", "north-mini-code-free", "gpt-5.6-sol"],
  // NVIDIA NIM — free tier mensal por modelo (5k créditos).
  nvidia: ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct", "mistralai/mistral-large", "mistralai/mistral-nemotron", "nvidia/nemotron-4-340b-instruct", "google/gemma-3-27b-it", "qwen/qwen2.5-72b-instruct", "deepseek-ai/deepseek-r1"],
  // Ollama Cloud — modelos hospedados (mesmos do Ollama local, mas pagos por tokens).
  ollama_cloud: ["gpt-oss:120b", "gpt-oss:20b", "llama3.1:70b", "llama3.1:8b", "qwen2.5:72b", "qwen2.5:32b", "qwen2.5-coder:32b", "deepseek-r1:70b", "deepseek-v3:70b", "mistral-large:123b", "gemma3:27b", "phi4:14b", "codellama:70b"],
};

const PROVIDER_ORDER = ["groq", "openrouter", "nvidia", "ollama_cloud", "opencodezen"];

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

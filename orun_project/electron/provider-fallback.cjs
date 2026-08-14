// electron/provider-fallback.cjs
//
// Centralized provider selection and fallback for Orun OS.
// Eliminates 3x duplicated fallback logic across ai-router.cjs.

const KNOWN_FREE_MODELS = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "allam-2-7b", "groq/compound", "groq/compound-mini"],
  openrouter: ["openai/gpt-oss-20b:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3-nano-30b-a3b:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "nvidia/nemotron-3.5-lightning:free", "nvidia/nemotron-3.5-content-safety:free", "nvidia/nemotron-nano-9b-v2:free", "nvidia/nemotron-nano-12b-v2-vl:free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "cohere/north-mini-code:free", "poolside/laguna-s-2.1:free", "poolside/laguna-xs-2.1:free", "liquid/lfm-2.5-2.6b:free", "openrouter/free"],
  opencodezen: ["big-pickle", "deepseek-v4-flash-free", "mimo-v2.5-free", "hy3-free", "nemotron-3-ultra-free", "nemotron-3.5-lightning-free", "laguna-s-2.1-free"],
  // NVIDIA NIM — free tier mensal por modelo (5k créditos).
  nvidia: ["meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct", "mistralai/mistral-nemotron", "openai/gpt-oss-20b", "nvidia/nemotron-3-ultra-550b-a55b", "nvidia/nemotron-3-super-120b-a12b", "nvidia/nemotron-3-nano-30b-a3b", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "nvidia/nemotron-3.5-lightning-30b-a3b", "deepseek-ai/deepseek-v4-flash-0731", "z-ai/glm-5.2", "minimaxai/minimax-m3", "stepfun-ai/step-3.7-flash"],
  // Ollama Cloud — modelos hospedados (mesmos do Ollama local, mas pagos por tokens).
  ollama_cloud: ["gpt-oss:120b", "gpt-oss:20b", "deepseek-v4-flash:0731", "deepseek-v4-flash:preview", "deepseek-v4-pro:preview", "nemotron-3-ultra", "nemotron-3-super", "nemotron-3-nano:30b", "glm-5.1", "glm-5.2", "minimax-m3", "minimax-m2.7", "kimi-k3", "kimi-k2.6", "kimi-k2.7-code", "gemma4:31b", "mistral-large-3:675b", "qwen3.5:397b"],
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ = void 0;
/**
 * Catalogo de modelos por provider usado pelo dashboard (GET /api/models).
 * Cada modelo tem um tier ("free" ou "paid" ou "subscription") pra UI marcar
 * na frente do nome. Nao e exaustivo - e um conveniente de selecao r�pida.
 * O custo real/vivo segue sendo fechado pelo ProviderIdSchema/registry.
 */
const MODEL_CATALOG = {
    ollama: [
        { id: "qwen2.5vl:7b", tier: "free" },
        { id: "qwen2.5:14b", tier: "free" },
        { id: "llama3.1:8b", tier: "free" },
        { id: "llama3.1:70b", tier: "free" },
        { id: "mistral:7b", tier: "free" },
        { id: "gemma2:9b", tier: "free" },
        { id: "auto", tier: "free" },
    ],
    groq: [
        { id: "openai/gpt-oss-120b", tier: "free" },
        { id: "openai/gpt-oss-20b", tier: "free" },
        { id: "qwen/qwen3-32b", tier: "free" },
        { id: "google/gemma2-9b-it", tier: "free" },
    ],
    gemini: [
        { id: "gemini-3.6-flash", tier: "free" },
        { id: "gemini-3.5-flash", tier: "free" },
        { id: "gemini-3.5-flash-lite", tier: "free" },
        { id: "gemini-2.5-flash", tier: "free" },
        { id: "gemini-2.5-pro", tier: "paid" },
        { id: "gemini-3-pro-preview", tier: "paid" },
    ],
    "github-models": [
        { id: "gpt-4o-mini", tier: "free" },
        { id: "gpt-4o", tier: "free" },
        { id: "claude-haiku-4-5", tier: "free" },
        { id: "llama-3.3-70b", tier: "free" },
        { id: "gemini-2.5-flash", tier: "free" },
    ],
    cerebras: [
        { id: "llama3.1-8b", tier: "free" },
        { id: "llama3.1-70b", tier: "free" },
        { id: "llama3.3-70b", tier: "free" },
        { id: "gpt-oss-120b", tier: "free" },
    ],
    mistral: [
        { id: "open-mistral-nemo", tier: "free" },
        { id: "mistral-small-latest", tier: "paid" },
        { id: "mistral-large-latest", tier: "paid" },
    ],
    "opencode-free": [
        { id: "auto", tier: "free" },
    ],
    kiro: [
        { id: "claude-sonnet-4.5", tier: "free" },
        { id: "claude-opus-4.5", tier: "free" },
        { id: "glm-5", tier: "free" },
        { id: "minimax-m2", tier: "free" },
    ],
    "vertex-ai": [
        { id: "gemini-2.5-flash", tier: "free" },
        { id: "gemini-3.1-pro-preview", tier: "free" },
        { id: "gemini-1.5-pro", tier: "paid" },
    ],
    cohere: [
        { id: "command-r7b", tier: "free" },
        { id: "command-r-plus", tier: "paid" },
        { id: "command-a", tier: "paid" },
    ],
    "nvidia-nim": [
        { id: "meta/llama-3.1-405b-instruct", tier: "free" },
        { id: "deepseek-ai/deepseek-r1", tier: "free" },
        { id: "google/gemma-2-27b", tier: "free" },
    ],
    siliconflow: [
        { id: "Qwen/Qwen2.5-72B-Instruct", tier: "free" },
        { id: "deepseek-ai/DeepSeek-V3", tier: "free" },
        { id: "THUDM/glm-4-9b-chat", tier: "free" },
    ],
    chutes: [
        { id: "meta-llama/Llama-3.3-70B-Instruct", tier: "free" },
        { id: "Qwen/Qwen2.5-72B-Instruct", tier: "free" },
    ],
    "cloudflare-workers-ai": [
        { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", tier: "free" },
        { id: "@cf/qwen/qwen2.5-72b-instruct", tier: "free" },
    ],
    "huggingface-inference": [
        { id: "meta-llama/Llama-3.3-70B-Instruct", tier: "free" },
        { id: "mistralai/Mistral-7B-Instruct-v0.3", tier: "free" },
    ],
    anthropic: [
        { id: "claude-opus-4-5", tier: "paid" },
        { id: "claude-sonnet-4-6", tier: "paid" },
        { id: "claude-haiku-4-5", tier: "paid" },
    ],
    openai: [
        { id: "gpt-4o", tier: "paid" },
        { id: "gpt-4o-mini", tier: "paid" },
        { id: "o3", tier: "paid" },
        { id: "o4-mini", tier: "paid" },
        { id: "gpt-4.1", tier: "paid" },
        { id: "gpt-4.1-nano", tier: "paid" },
    ],
    openrouter: [
        { id: "nvidia/nemotron-3-super-120b-a12b:free", tier: "free" },
        { id: "nvidia/nemotron-3-ultra-550b-a55b:free", tier: "free" },
        { id: "nex-agi/nex-n2.5-pro:free", tier: "free" },
        { id: "google/gemma-4-31b-it:free", tier: "free" },
        { id: "google/gemma-4-26b-a4b-it:free", tier: "free" },
        { id: "thinkingmachines/inkling:free", tier: "free" },
        { id: "anthropic/claude-sonnet-4.5", tier: "paid" },
        { id: "openai/gpt-4o", tier: "paid" },
        { id: "deepseek/deepseek-chat-v3.2", tier: "paid" },
    ],
    deepseek: [
        { id: "deepseek-chat", tier: "paid" },
        { id: "deepseek-reasoner", tier: "paid" },
    ],
    xai: [
        { id: "grok-2", tier: "paid" },
        { id: "grok-4-fast", tier: "paid" },
        { id: "grok-4", tier: "paid" },
    ],
    perplexity: [
        { id: "sonar", tier: "paid" },
        { id: "sonar-pro", tier: "paid" },
        { id: "sonar-reasoning-pro", tier: "paid" },
    ],
    together: [
        { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", tier: "paid" },
        { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", tier: "paid" },
    ],
    fireworks: [
        { id: "accounts/fireworks/models/llama-v3p1-70b-instruct", tier: "paid" },
        { id: "accounts/fireworks/models/qwen3-32b", tier: "paid" },
    ],
    nebius: [
        { id: "meta-llama/Llama-3.3-70B-Instruct", tier: "paid" },
        { id: "deepseek-ai/DeepSeek-V3.2", tier: "paid" },
    ],
    hyperbolic: [
        { id: "meta-llama/Llama-3.3-70B-Instruct", tier: "paid" },
    ],
    "claude-code": [{ id: "claude-sonnet-4-6", tier: "subscription" }],
    codex: [{ id: "gpt-5", tier: "subscription" }],
    "github-copilot": [{ id: "gpt-5", tier: "subscription" }],
    cursor: [{ id: "cursor-fast", tier: "subscription" }],
    antigravity: [{ id: "antigravity-fast", tier: "subscription" }],
    kimchi: [{ id: "kimchi-fast", tier: "subscription" }],
    "custom-openai-compatible": [{ id: "custom", tier: "paid" }],
    "custom-anthropic-compatible": [{ id: "custom", tier: "paid" }],
    mcp: [{ id: "complete", tier: "paid" }],
    a2a: [{ id: "message", tier: "paid" }],
};

function getModelsForProvider(providerId) {
    return MODEL_CATALOG[providerId] ?? [];
}

exports.getModelsForProvider = getModelsForProvider;
exports.MODEL_CATALOG = MODEL_CATALOG;

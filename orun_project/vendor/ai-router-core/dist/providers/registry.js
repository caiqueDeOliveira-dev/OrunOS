"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_REGISTRY = void 0;
exports.getProvider = getProvider;
exports.listFreeProviders = listFreeProviders;
exports.listPaidProviders = listPaidProviders;
exports.listSubscriptionProviders = listSubscriptionProviders;
exports.listNoAuthFreeProviders = listNoAuthFreeProviders;
const schema_1 = require("../schema");
/**
 * Registry estático de todos os providers suportados.
 * Isso é dado de código (não de usuário) — o que o usuário configura
 * (API keys, quais estão habilitados) vive em ProviderConfig / @orun/settings.
 *
 * Usamos z.input (campos com .default() ficam opcionais aqui) e rodamos
 * cada entrada pelo schema no fim do arquivo — isso preenche defaults
 * (requiresLocalRuntime: false) e valida o registry inteiro no import.
 */
const RAW_REGISTRY = {
    // ─────────────────────────────────────────────────────────
    // 🟢 FREE — rodam sem custo (local ou free-tier real)
    // ─────────────────────────────────────────────────────────
    ollama: {
        id: "ollama",
        label: "Ollama (local)",
        tier: "free",
        authMethod: "none",
        wireFormat: "ollama-native",
        baseUrl: "http://localhost:11434",
        capabilities: ["text", "tools", "embeddings"],
        freeNotes: "100% local, sem limite, sem internet",
        requiresLocalRuntime: true,
        docsUrl: "https://github.com/ollama/ollama",
    },
    groq: {
        id: "groq",
        label: "Groq",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.groq.com/openai/v1",
        capabilities: ["text", "tools", "audio-stt"],
        freeNotes: "free tier generoso (rate-limited), cadastro só com e-mail",
        docsUrl: "https://console.groq.com/docs",
    },
    gemini: {
        id: "gemini",
        label: "Google Gemini",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "gemini-native",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        capabilities: ["text", "vision", "tools", "embeddings"],
        freeNotes: "free tier com rate-limit por minuto/dia via AI Studio",
        docsUrl: "https://ai.google.dev/gemini-api/docs/rate-limits",
    },
    "github-models": {
        id: "github-models",
        label: "GitHub Models",
        tier: "free",
        authMethod: "api-key", // usa GITHUB_TOKEN
        wireFormat: "openai-compatible",
        baseUrl: "https://models.inference.ai.azure.com",
        capabilities: ["text", "tools", "vision"],
        freeNotes: "grátis com conta GitHub, rate-limit por tier de conta",
        docsUrl: "https://docs.github.com/en/github-models",
    },
    cerebras: {
        id: "cerebras",
        label: "Cerebras",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.cerebras.ai/v1",
        capabilities: ["text", "tools"],
        freeNotes: "free tier com rate-limit, inferência muito rápida",
        docsUrl: "https://inference-docs.cerebras.ai",
    },
    mistral: {
        id: "mistral",
        label: "Mistral (La Plateforme)",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.mistral.ai/v1",
        capabilities: ["text", "tools", "vision"],
        freeNotes: "tier 'Experiment' grátis com limites",
        docsUrl: "https://docs.mistral.ai/deployment/laplateforme/limits/",
    },
    "opencode-free": {
        id: "opencode-free",
        label: "OpenCode Free",
        tier: "free",
        authMethod: "none",
        wireFormat: "openai-compatible",
        baseUrl: "https://opencode.ai/zen/v1",
        capabilities: ["text", "tools"],
        freeNotes: "sem cadastro, lista de modelos via auto-fetch",
        docsUrl: "https://opencode.ai",
    },
    kiro: {
        id: "kiro",
        label: "Kiro AI",
        tier: "free",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
        freeNotes: "~50 créditos/mês grátis (Claude 4.5 / GLM-5 / MiniMax)",
        docsUrl: "https://kiro.dev",
    },
    "vertex-ai": {
        id: "vertex-ai",
        label: "Vertex AI Studio",
        tier: "free",
        authMethod: "oauth",
        wireFormat: "vertex-native",
        capabilities: ["text", "vision", "tools"],
        freeNotes: "$300 crédito GCP em conta nova",
        docsUrl: "https://cloud.google.com/vertex-ai/docs",
    },
    cohere: {
        id: "cohere",
        label: "Cohere",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.cohere.ai/compatibility/v1",
        capabilities: ["text", "tools", "embeddings"],
        freeNotes: "trial key grátis com rate-limit baixo",
        docsUrl: "https://docs.cohere.com/docs/rate-limits",
    },
    "nvidia-nim": {
        id: "nvidia-nim",
        label: "NVIDIA NIM",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://integrate.api.nvidia.com/v1",
        capabilities: ["text", "tools", "vision"],
        freeNotes: "créditos grátis de avaliação",
        docsUrl: "https://build.nvidia.com",
    },
    siliconflow: {
        id: "siliconflow",
        label: "SiliconFlow",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.siliconflow.com/v1",
        capabilities: ["text", "tools", "image-gen"],
        freeNotes: "modelos open-weight grátis com rate-limit",
        docsUrl: "https://docs.siliconflow.com",
    },
    chutes: {
        id: "chutes",
        label: "Chutes",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://llm.chutes.ai/v1",
        capabilities: ["text", "tools"],
        freeNotes: "modelos open-source servidos grátis, rate-limit variável",
        docsUrl: "https://chutes.ai",
    },
    "cloudflare-workers-ai": {
        id: "cloudflare-workers-ai",
        label: "Cloudflare Workers AI",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
        capabilities: ["text", "tools", "image-gen", "embeddings"],
        freeNotes: "10.000 'neurons'/dia grátis — precisa trocar {account_id} no baseUrl pelo seu",
        docsUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    },
    "huggingface-inference": {
        id: "huggingface-inference",
        label: "Hugging Face Inference API",
        tier: "free",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://router.huggingface.co/v1",
        capabilities: ["text", "tools", "embeddings"],
        freeNotes: "free tier serverless com rate-limit baixo, milhares de modelos open-weight",
        docsUrl: "https://huggingface.co/docs/api-inference",
    },
    // ─────────────────────────────────────────────────────────
    // 🟡 PAID — API key com cobrança por uso
    // ─────────────────────────────────────────────────────────
    anthropic: {
        id: "anthropic",
        label: "Anthropic",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "anthropic-native",
        baseUrl: "https://api.anthropic.com/v1",
        capabilities: ["text", "vision", "tools"],
        docsUrl: "https://docs.anthropic.com",
    },
    openai: {
        id: "openai",
        label: "OpenAI",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        capabilities: ["text", "vision", "tools", "image-gen", "audio-tts", "audio-stt", "embeddings"],
        docsUrl: "https://platform.openai.com/docs",
    },
    openrouter: {
        id: "openrouter",
        label: "OpenRouter",
        tier: "paid", // tem modelos :free, mas a conta em si é pay-as-you-go
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://openrouter.ai/api/v1",
        capabilities: ["text", "vision", "tools"],
        freeNotes: "muitos modelos com sufixo ':free' — ver seção 'combo free'",
        docsUrl: "https://openrouter.ai/docs",
    },
    deepseek: {
        id: "deepseek",
        label: "DeepSeek",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.deepseek.com/v1",
        capabilities: ["text", "tools"],
        docsUrl: "https://api-docs.deepseek.com",
    },
    xai: {
        id: "xai",
        label: "xAI (Grok)",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.x.ai/v1",
        capabilities: ["text", "vision", "tools"],
        docsUrl: "https://docs.x.ai",
    },
    perplexity: {
        id: "perplexity",
        label: "Perplexity",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.perplexity.ai",
        capabilities: ["text"],
        docsUrl: "https://docs.perplexity.ai",
    },
    together: {
        id: "together",
        label: "Together AI",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.together.xyz/v1",
        capabilities: ["text", "tools", "image-gen", "embeddings"],
        docsUrl: "https://docs.together.ai",
    },
    fireworks: {
        id: "fireworks",
        label: "Fireworks AI",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.fireworks.ai/inference/v1",
        capabilities: ["text", "tools", "image-gen"],
        docsUrl: "https://docs.fireworks.ai",
    },
    nebius: {
        id: "nebius",
        label: "Nebius AI Studio",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.studio.nebius.ai/v1",
        capabilities: ["text", "tools", "embeddings"],
        docsUrl: "https://studio.nebius.ai/docs",
    },
    hyperbolic: {
        id: "hyperbolic",
        label: "Hyperbolic",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        baseUrl: "https://api.hyperbolic.xyz/v1",
        capabilities: ["text", "tools", "image-gen"],
        docsUrl: "https://docs.hyperbolic.xyz",
    },
    // ─────────────────────────────────────────────────────────
    // 🔵 SUBSCRIPTION — via OAuth, usa assinatura já paga em outro lugar
    // ─────────────────────────────────────────────────────────
    "claude-code": {
        id: "claude-code",
        label: "Claude Code (Pro/Max)",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "anthropic-native",
        capabilities: ["text", "tools", "vision"],
        freeNotes: "usa quota da assinatura Claude Pro/Max — não é grátis, mas sem custo marginal",
    },
    codex: {
        id: "codex",
        label: "Codex (ChatGPT Plus/Pro)",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    "github-copilot": {
        id: "github-copilot",
        label: "GitHub Copilot",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    cursor: {
        id: "cursor",
        label: "Cursor IDE",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    antigravity: {
        id: "antigravity",
        label: "Antigravity",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    kimchi: {
        id: "kimchi",
        label: "Kimchi",
        tier: "subscription",
        authMethod: "oauth",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    // ─────────────────────────────────────────────────────────
    // ⚙️ CUSTOM
    // ─────────────────────────────────────────────────────────
    "custom-openai-compatible": {
        id: "custom-openai-compatible",
        label: "Custom (OpenAI-compatible)",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "openai-compatible",
        capabilities: ["text", "tools"],
    },
    "custom-anthropic-compatible": {
        id: "custom-anthropic-compatible",
        label: "Custom (Anthropic-compatible)",
        tier: "paid",
        authMethod: "api-key",
        wireFormat: "anthropic-native",
        capabilities: ["text", "tools"],
    },
};
/**
 * Registry final, validado — cada entrada passou pelo Zod schema,
 * então `requiresLocalRuntime` e outros defaults já estão preenchidos.
 */
exports.PROVIDER_REGISTRY = Object.fromEntries(Object.entries(RAW_REGISTRY).map(([id, raw]) => [id, schema_1.ProviderDefinitionSchema.parse(raw)]));
function getProvider(id) {
    const def = exports.PROVIDER_REGISTRY[id];
    if (!def)
        throw new Error(`Provider desconhecido: ${id}`);
    return def;
}
function listFreeProviders() {
    return Object.values(exports.PROVIDER_REGISTRY).filter((p) => p.tier === "free");
}
function listPaidProviders() {
    return Object.values(exports.PROVIDER_REGISTRY).filter((p) => p.tier === "paid");
}
function listSubscriptionProviders() {
    return Object.values(exports.PROVIDER_REGISTRY).filter((p) => p.tier === "subscription");
}
/** Providers gratuitos que rodam sem nenhuma credencial (bom pro combo "sempre funciona"). */
function listNoAuthFreeProviders() {
    return listFreeProviders().filter((p) => p.authMethod === "none");
}
//# sourceMappingURL=registry.js.map
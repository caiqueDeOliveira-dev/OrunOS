"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterCompletionResultSchema = exports.ToolCallSchema = exports.RouterCompletionRequestSchema = exports.ToolChoiceSchema = exports.ToolDefinitionSchema = exports.RouterMessageSchema = exports.UsageEventSchema = exports.SkillBindingSchema = exports.ComboSchema = exports.ComboKindSchema = exports.ComboStepSchema = exports.ProviderConfigSchema = exports.AccountRotationModeSchema = exports.ProviderDefinitionSchema = exports.ProviderCapabilitySchema = exports.WireFormatSchema = exports.AuthMethodSchema = exports.ProviderTierSchema = exports.ProviderIdSchema = void 0;
const zod_1 = require("zod");
// ─────────────────────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────────────────────
/** Todos os providers suportados, sem distinção de custo (isso vive no registry). */
exports.ProviderIdSchema = zod_1.z.enum([
    // já no seu stack hoje
    "ollama",
    "anthropic",
    "openai",
    "openrouter",
    "groq",
    "github-models",
    // free / free-tier
    "gemini",
    "cerebras",
    "mistral",
    "kiro",
    "opencode-free",
    "vertex-ai",
    "cohere",
    "nvidia-nim",
    "siliconflow",
    "chutes",
    "cloudflare-workers-ai",
    "huggingface-inference",
    // pagos (API key)
    "deepseek",
    "xai",
    "perplexity",
    "together",
    "fireworks",
    "nebius",
    "hyperbolic",
    // oauth (assinatura)
    "claude-code",
    "codex",
    "github-copilot",
    "cursor",
    "antigravity",
    "kimchi",
    // custom
    "custom-openai-compatible",
    "custom-anthropic-compatible",
    // MCP / A2A (servidores e agentes externos como provider)
    "mcp",
    "a2a",
]);
exports.ProviderTierSchema = zod_1.z.enum(["free", "paid", "subscription"]);
exports.AuthMethodSchema = zod_1.z.enum(["none", "api-key", "oauth"]);
/** O "formato de fala" do provider — determina qual adapter traduz a request/response. */
exports.WireFormatSchema = zod_1.z.enum([
    "openai-compatible",
    "anthropic-native",
    "gemini-native",
    "ollama-native",
    "vertex-native",
    "mcp-native",
    "a2a-native",
]);
exports.ProviderCapabilitySchema = zod_1.z.enum([
    "text",
    "vision",
    "tools",
    "image-gen",
    "audio-tts",
    "audio-stt",
    "embeddings",
]);
/** Metadados estáticos de um provider — não muda por usuário, vive no registry.ts */
exports.ProviderDefinitionSchema = zod_1.z.object({
    id: exports.ProviderIdSchema,
    label: zod_1.z.string(),
    tier: exports.ProviderTierSchema,
    authMethod: exports.AuthMethodSchema,
    wireFormat: exports.WireFormatSchema,
    baseUrl: zod_1.z.string().url().optional(), // omitido p/ oauth providers com discovery dinâmico
    capabilities: zod_1.z.array(exports.ProviderCapabilitySchema).min(1),
    freeNotes: zod_1.z.string().optional(), // ex: "50 créditos/mês", "sem cadastro"
    docsUrl: zod_1.z.string().url().optional(),
    requiresLocalRuntime: zod_1.z.boolean().default(false), // true só pro ollama
});
exports.AccountRotationModeSchema = zod_1.z.enum(["priority", "round-robin"]);
/** Config do usuário pra um provider específico — isso é o que fica no @orun/settings */
exports.ProviderConfigSchema = zod_1.z.object({
    providerId: exports.ProviderIdSchema,
    enabled: zod_1.z.boolean().default(true),
    // apiKey/oauthToken NUNCA ficam aqui — são roteados via ISecretStore.
    // Aqui só guardamos a referência de que existe segredo configurado.
    hasCredential: zod_1.z.boolean().default(false),
    accountLabel: zod_1.z.string().optional(), // pra multi-conta ("groq-pessoal", "groq-work")
    customBaseUrl: zod_1.z.string().url().optional(), // override p/ custom-*-compatible
    priority: zod_1.z.number().int().min(0).default(0), // usado no modo "priority"
    rotationMode: exports.AccountRotationModeSchema.default("priority"),
});
// ─────────────────────────────────────────────────────────────
// Combos
// ─────────────────────────────────────────────────────────────
exports.ComboStepSchema = zod_1.z.object({
    providerId: exports.ProviderIdSchema,
    model: zod_1.z.string().min(1).optional(),
    // Lista de modelos deste provider neste step (ordem de tentativa).
    // Se presente, o router tenta cada modelo em ordem no mesmo provider;
    // so sai para o proximo step (proximo provider) quando todos falharem.
    models: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    accountLabel: zod_1.z.string().optional(), // qual conta usar, se multi-conta
    maxRetries: zod_1.z.number().int().min(0).max(3).default(1),
}).refine((st) => (st.model?.length ?? 0) > 0 || (st.models?.length ?? 0) > 0, {
    message: "step precisa de model ou models",
});
exports.ComboKindSchema = zod_1.z.enum(["text", "media"]);
exports.ComboSchema = zod_1.z.object({
    id: zod_1.z.string().min(1), // slug, ex: "hampton-default"
    name: zod_1.z.string().min(1),
    kind: exports.ComboKindSchema.default("text"),
    steps: zod_1.z.array(exports.ComboStepSchema).min(1),
    skillId: zod_1.z.string().optional(), // binding pra um skill/system-prompt fixo
    isSystemDefault: zod_1.z.boolean().default(false),
    // ambos desligados por padrão — opt-in explícito por combo.
    rtkEnabled: zod_1.z.boolean().default(false),
    cacheEnabled: zod_1.z.boolean().default(false),
    cacheSimilarityThreshold: zod_1.z.number().min(0).max(1).default(0.92),
});
// ─────────────────────────────────────────────────────────────
// Skills (agente próprio: system prompt + tools fixos)
// ─────────────────────────────────────────────────────────────
exports.SkillBindingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    systemPrompt: zod_1.z.string().min(1),
    toolNames: zod_1.z.array(zod_1.z.string()).default([]), // referência a tools já registradas no Orun
    promptStyle: zod_1.z.enum(["default", "caveman", "ponytail"]).default("default"),
});
// ─────────────────────────────────────────────────────────────
// Usage / telemetry
// ─────────────────────────────────────────────────────────────
exports.UsageEventSchema = zod_1.z.object({
    timestamp: zod_1.z.number(), // epoch ms
    comboId: zod_1.z.string(),
    stepIndex: zod_1.z.number().int().min(0), // qual step do combo respondeu (0 = primário)
    providerId: exports.ProviderIdSchema,
    model: zod_1.z.string(),
    promptTokens: zod_1.z.number().int().min(0),
    completionTokens: zod_1.z.number().int().min(0),
    latencyMs: zod_1.z.number().int().min(0),
    success: zod_1.z.boolean(),
    errorCode: zod_1.z.string().optional(),
    estimatedCostUsd: zod_1.z.number().min(0).default(0), // 0 pra providers free
    cacheHit: zod_1.z.boolean().default(false),
});
// ─────────────────────────────────────────────────────────────
// Router request/response (formato canônico interno — todos os
// adapters traduzem DE/PARA este formato, nunca direto entre si)
// ─────────────────────────────────────────────────────────────
exports.RouterMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(["system", "user", "assistant", "tool"]),
    content: zod_1.z.string(),
    toolCallId: zod_1.z.string().optional(),
});
exports.ToolDefinitionSchema = zod_1.z.object({
    type: zod_1.z.literal("function"),
    function: zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().optional(),
        parameters: zod_1.z.any().optional(),
    }),
});
exports.ToolChoiceSchema = zod_1.z.union([
    zod_1.z.enum(["auto", "none", "required"]),
    zod_1.z.object({ type: zod_1.z.literal("function"), function: zod_1.z.object({ name: zod_1.z.string() }) }),
]);
exports.RouterCompletionRequestSchema = zod_1.z.object({
    comboId: zod_1.z.string(),
    messages: zod_1.z.array(exports.RouterMessageSchema).min(1),
    stream: zod_1.z.boolean().default(false),
    maxTokens: zod_1.z.number().int().min(1).optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    tools: zod_1.z.array(exports.ToolDefinitionSchema).optional(),
    tool_choice: exports.ToolChoiceSchema.optional(),
    proxyPool: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        strategy: zod_1.z.enum(["round-robin", "random", "least-errors"]),
        proxies: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            url: zod_1.z.string(),
            type: zod_1.z.enum(["http", "https", "socks5"]),
            enabled: zod_1.z.boolean(),
            health: zod_1.z.enum(["unknown", "healthy", "unhealthy"]),
            lastCheck: zod_1.z.number().optional(),
            failCount: zod_1.z.number(),
        })),
    }).optional(),
});
exports.ToolCallSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.literal("function"),
    function: zod_1.z.object({
        name: zod_1.z.string(),
        arguments: zod_1.z.string(),
    }),
});
exports.RouterCompletionResultSchema = zod_1.z.object({
    content: zod_1.z.string(),
    providerId: exports.ProviderIdSchema,
    model: zod_1.z.string(),
    stepIndex: zod_1.z.number().int().min(0),
    usage: exports.UsageEventSchema,
    tool_calls: zod_1.z.array(exports.ToolCallSchema).optional(),
});
//# sourceMappingURL=schema.js.map
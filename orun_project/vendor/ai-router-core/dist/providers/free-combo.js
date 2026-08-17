"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_FREE_COMBOS = exports.FREE_MAX_COVERAGE_COMBO = exports.FREE_OPENROUTER_MODELS_COMBO = exports.FREE_NO_SIGNUP_COMBO = exports.FREE_DEFAULT_COMBO = exports.FREE_FOREVER_COMBO = void 0;
const schema_1 = require("../schema");
/**
 * Combo 100% gratuito, pronto pra usar assim que você tiver as API keys
 * free cadastradas (Groq, Gemini, GitHub Models, Cerebras) + Ollama local
 * como fallback final que NUNCA falha (roda na sua máquina).
 *
 * Ordem pensada por: (1) qualidade, (2) velocidade, (3) generosidade
 * do rate-limit, deixando o Ollama local como rede de segurança.
 *
 * Construído via ComboSchema.parse() em vez de literal — assim os defaults
 * novos (rtkEnabled, cacheEnabled, cacheSimilarityThreshold) são preenchidos
 * automaticamente sem precisar repetir aqui toda vez que o schema crescer.
 */
/**
 * Combo principal — inspirado no "free-forever" do 9Router: Kiro
 * (Claude 4.5 / GLM-5 / MiniMax grátis via OAuth, ~50 créditos/mês) →
 * OpenCode Free (sem cadastro) → Vertex AI ($300 créditos GCP) → Ollama
 * local como rede de segurança que NUNCA falha. É o combo padrão do app.
 */
exports.FREE_FOREVER_COMBO = schema_1.ComboSchema.parse({
    id: "free-forever",
    name: "Free Forever (Kiro → OpenCode Free → Vertex AI)",
    kind: "text",
    isSystemDefault: true,
    rtkEnabled: true,
    steps: [
        { providerId: "kiro", model: "claude-sonnet-4.5", maxRetries: 1 },
        { providerId: "opencode-free", model: "auto", maxRetries: 1 },
        { providerId: "vertex-ai", model: "gemini-3.1-pro-preview", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 }, // fallback final, sempre disponível
    ],
});
exports.FREE_DEFAULT_COMBO = schema_1.ComboSchema.parse({
    id: "free-default",
    name: "Free Default (sem custo)",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "groq", model: "llama-3.3-70b-versatile", maxRetries: 1 },
        { providerId: "gemini", model: "gemini-2.0-flash", maxRetries: 1 },
        { providerId: "github-models", model: "gpt-4o-mini", maxRetries: 1 },
        { providerId: "cerebras", model: "llama3.1-70b", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 }, // fallback final, sempre disponível
    ],
});
/** Variante só com providers que não pedem NENHUM cadastro (Ollama + OpenCode Free). */
exports.FREE_NO_SIGNUP_COMBO = schema_1.ComboSchema.parse({
    id: "free-no-signup",
    name: "Free sem cadastro",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "opencode-free", model: "auto", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 },
    ],
});
/**
 * O OpenRouter é cadastrado como tier="paid" no registry (a CONTA é
 * pay-as-you-go), mas ele hospeda dezenas de modelos com sufixo ":free"
 * que não cobram nada — desde que você use exatamente esses IDs de
 * modelo. Esse combo isola só os gratuitos, então mesmo cadastrando sua
 * key paga do OpenRouter aqui, esse combo específico nunca vai gerar
 * custo (só falha se TODOS os modelos ":free" estiverem sobrecarregados).
 */
exports.FREE_OPENROUTER_MODELS_COMBO = schema_1.ComboSchema.parse({
    id: "free-openrouter-models",
    name: "OpenRouter (só modelos :free)",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "openrouter", model: "deepseek/deepseek-chat-v3.1:free", maxRetries: 1 },
        { providerId: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free", maxRetries: 1 },
        { providerId: "openrouter", model: "google/gemini-2.0-flash-exp:free", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 },
    ],
});
/** Combo com TODOS os providers 100% gratuitos do registry, pra maximizar chance de sucesso sem gastar nada. */
exports.FREE_MAX_COVERAGE_COMBO = schema_1.ComboSchema.parse({
    id: "free-max-coverage",
    name: "Free — cobertura máxima",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "groq", model: "llama-3.3-70b-versatile", maxRetries: 1 },
        { providerId: "gemini", model: "gemini-2.0-flash", maxRetries: 1 },
        { providerId: "cerebras", model: "llama3.1-70b", maxRetries: 1 },
        { providerId: "github-models", model: "gpt-4o-mini", maxRetries: 1 },
        { providerId: "mistral", model: "mistral-small-latest", maxRetries: 1 },
        { providerId: "huggingface-inference", model: "meta-llama/Llama-3.3-70B-Instruct", maxRetries: 1 },
        { providerId: "chutes", model: "deepseek-ai/DeepSeek-V3", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 },
    ],
});
exports.BUILTIN_FREE_COMBOS = [
    exports.FREE_FOREVER_COMBO,
    exports.FREE_DEFAULT_COMBO,
    exports.FREE_NO_SIGNUP_COMBO,
    exports.FREE_OPENROUTER_MODELS_COMBO,
    exports.FREE_MAX_COVERAGE_COMBO,
];
//# sourceMappingURL=free-combo.js.map
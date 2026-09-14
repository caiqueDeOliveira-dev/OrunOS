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
    name: "Free Forever (Groq → Gemini → OpenRouter → Ollama)",
    kind: "text",
    isSystemDefault: true,
    rtkEnabled: true,
    steps: [
        { providerId: "groq", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], maxRetries: 1 },
        { providerId: "gemini", models: ["gemini-3.6-flash"], maxRetries: 1 },
        { providerId: "openrouter", models: ["nvidia/nemotron-3-super-120b-a12b:free", "nex-agi/nex-n2.5-pro:free"], maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5vl:7b", maxRetries: 0 }, // fallback final, sempre disponível
    ],
});
exports.FREE_DEFAULT_COMBO = schema_1.ComboSchema.parse({
    id: "free-default",
    name: "Free Default (Groq → Gemini → Ollama)",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "groq", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], maxRetries: 1 },
        { providerId: "gemini", models: ["gemini-3.6-flash", "gemini-2.5-flash"], maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5vl:7b", maxRetries: 0 }, // fallback final, sempre disponível
    ],
});
/** Variante só com providers que não pedem NENHUM cadastro (Ollama local). */
exports.FREE_NO_SIGNUP_COMBO = schema_1.ComboSchema.parse({
    id: "free-no-signup",
    name: "Free sem cadastro (Ollama local)",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "ollama", model: "qwen2.5vl:7b", maxRetries: 0 },
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
        { providerId: "openrouter", models: ["nvidia/nemotron-3-super-120b-a12b:free", "nex-agi/nex-n2.5-pro:free", "google/gemma-4-31b-it:free", "thinkingmachines/inkling:free"], maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5vl:7b", maxRetries: 0 },
    ],
});
/** Combo com TODOS os providers 100% gratuitos do registry, pra maximizar chance de sucesso sem gastar nada. */
exports.FREE_MAX_COVERAGE_COMBO = schema_1.ComboSchema.parse({
    id: "free-max-coverage",
    name: "Free — cobertura máxima",
    kind: "text",
    isSystemDefault: false,
    steps: [
        { providerId: "groq", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], maxRetries: 1 },
        { providerId: "gemini", models: ["gemini-3.6-flash", "gemini-2.5-flash"], maxRetries: 1 },
        { providerId: "openrouter", models: ["nvidia/nemotron-3-super-120b-a12b:free", "nex-agi/nex-n2.5-pro:free", "google/gemma-4-31b-it:free"], maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5vl:7b", maxRetries: 0 },
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
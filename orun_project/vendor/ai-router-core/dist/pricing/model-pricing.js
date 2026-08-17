"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCostUsd = estimateCostUsd;
exports.hasKnownPricing = hasKnownPricing;
/**
 * Preços aproximados (referência pública dos providers, sujeitos a mudar
 * sem aviso — confira o preço atual antes de decisões de budget sérias).
 * Cobre os modelos mais comuns dos providers "paid" do registry; modelo
 * não listado cai no DEFAULT_FALLBACK_PRICING em vez de travar ou mentir
 * um preço específico que não temos como garantir.
 */
const MODEL_PRICING = {
    // OpenAI
    "gpt-4o": { inputPer1k: 0.005, outputPer1k: 0.015 },
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006 },
    "gpt-4-turbo": { inputPer1k: 0.01, outputPer1k: 0.03 },
    "o1": { inputPer1k: 0.015, outputPer1k: 0.06 },
    "o1-mini": { inputPer1k: 0.0011, outputPer1k: 0.0044 },
    // Anthropic
    "claude-opus-4-5": { inputPer1k: 0.005, outputPer1k: 0.025 },
    "claude-sonnet-4-6": { inputPer1k: 0.003, outputPer1k: 0.015 },
    "claude-3-5-haiku-latest": { inputPer1k: 0.0008, outputPer1k: 0.004 },
    // DeepSeek
    "deepseek-chat": { inputPer1k: 0.00027, outputPer1k: 0.0011 },
    "deepseek-reasoner": { inputPer1k: 0.00055, outputPer1k: 0.00219 },
    // xAI
    "grok-2": { inputPer1k: 0.002, outputPer1k: 0.01 },
    // Mistral (tier pago, além do free "la plateforme")
    "mistral-large-latest": { inputPer1k: 0.002, outputPer1k: 0.006 },
    // Perplexity
    "sonar": { inputPer1k: 0.001, outputPer1k: 0.001 },
    "sonar-pro": { inputPer1k: 0.003, outputPer1k: 0.015 },
};
/**
 * Modelos open-weight servidos por Together/Fireworks/Nebius/Hyperbolic
 * variam MUITO por parâmetro (7B vs 70B vs 400B), mas ficam numa faixa
 * razoavelmente estreita dentro de cada provider — usamos uma média
 * grosseira só pra esses 4 providers em vez de tentar listar cada modelo.
 */
const PROVIDER_FLAT_RATE = {
    together: { inputPer1k: 0.0009, outputPer1k: 0.0009 },
    fireworks: { inputPer1k: 0.0009, outputPer1k: 0.0009 },
    nebius: { inputPer1k: 0.0006, outputPer1k: 0.0006 },
    hyperbolic: { inputPer1k: 0.0006, outputPer1k: 0.0006 },
};
/** Usado quando não sabemos o preço real — mantém o dashboard honesto ("~$X") em vez de mostrar 0 enganosamente pra provider pago. */
const DEFAULT_FALLBACK_PRICING = { inputPer1k: 0.002, outputPer1k: 0.006 };
function estimateCostUsd(providerId, model, promptTokens, completionTokens) {
    const pricing = MODEL_PRICING[model] ?? PROVIDER_FLAT_RATE[providerId] ?? DEFAULT_FALLBACK_PRICING;
    return (promptTokens / 1000) * pricing.inputPer1k + (completionTokens / 1000) * pricing.outputPer1k;
}
/** true se o preço vem de um número específico do modelo (não do fallback genérico). */
function hasKnownPricing(providerId, model) {
    return model in MODEL_PRICING || providerId in PROVIDER_FLAT_RATE;
}
//# sourceMappingURL=model-pricing.js.map
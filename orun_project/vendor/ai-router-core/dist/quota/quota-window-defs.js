"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUOTA_WINDOW_DEFS = void 0;
exports.getQuotaWindowDef = getQuotaWindowDef;
/**
 * Janelas conhecidas publicamente (aproximadas — cada provider pode mudar
 * sem aviso, e alguns dependem do tier de conta). Onde não há dado confiável
 * documentado, deixamos de fora — o QuotaTracker então só reporta "used"
 * sem "remaining"/"resetAt", em vez de inventar um número.
 */
exports.QUOTA_WINDOW_DEFS = {
    groq: { windowMs: 60_000, metric: "requests", limit: 30, notes: "free tier, varia por modelo" },
    gemini: { windowMs: 60_000, metric: "requests", limit: 15, notes: "free tier AI Studio, varia por modelo" },
    cerebras: { windowMs: 60_000, metric: "requests", limit: 30, notes: "free tier" },
    mistral: { windowMs: 1_000, metric: "requests", limit: 1, notes: "tier Experiment, 1 req/s" },
    kiro: { windowMs: 30 * 24 * 60 * 60_000, metric: "requests", limit: 50, notes: "~50 créditos/mês" },
    // claude-code / codex: sem número público confiável (depende do plano).
    // A quota real desses vem só de headers dinâmicos, se o provider expuser
    // (ver QuotaTracker.ingestHeaders) — não inventamos um limite estático aqui.
};
function getQuotaWindowDef(providerId) {
    return exports.QUOTA_WINDOW_DEFS[providerId] ?? null;
}
//# sourceMappingURL=quota-window-defs.js.map
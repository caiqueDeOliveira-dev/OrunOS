"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const quota_window_defs_1 = require("../quota/quota-window-defs");
/** Sem config específica: não atrasa nada, só limita paralelismo bruto (proteção mínima contra picos acidentais). */
const FALLBACK_CONFIG = { minIntervalMs: 0, maxConcurrent: 4 };
/**
 * Deriva um limite conservador a partir da janela de quota conhecida
 * (ex: Groq = 30 req/min -> ~1 request a cada 2s). Isso é PREVENTIVO — a
 * ideia é nunca bater no 429 de verdade, em vez de reagir depois que já
 * bateu (que é o que o circuit breaker faz).
 */
function deriveDefaultConfig(providerId) {
    const windowDef = (0, quota_window_defs_1.getQuotaWindowDef)(providerId);
    if (!windowDef || windowDef.metric !== "requests" || windowDef.limit <= 0)
        return FALLBACK_CONFIG;
    return {
        minIntervalMs: Math.ceil(windowDef.windowMs / windowDef.limit),
        maxConcurrent: 2, // pequena folga pra não serializar 100%, mas sem deixar rajada livre
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Limita SUAS PRÓPRIAS chamadas antes de sair pra rede — diferente do
 * QuotaTracker (que só observa) e do CircuitBreaker (que só reage depois
 * de falhar), este é preventivo: se o Hampton Circle inteiro disparar 17
 * requests pro Groq free-tier ao mesmo tempo, elas ficam na fila aqui e
 * saem espaçadas, em vez de estourar o rate-limit do provider de verdade
 * e arriscar um ban temporário.
 */
class RateLimiter {
    lastRequestAt = new Map();
    inFlight = new Map();
    /** fila que serializa a decisão de intervalo mínimo por chave — evita a race de duas chamadas lerem o mesmo lastRequestAt antes de qualquer uma escrever. */
    intervalQueue = new Map();
    overrides;
    constructor(overrides = {}) {
        this.overrides = overrides;
    }
    key(providerId, accountLabel) {
        return `${providerId}:${accountLabel}`;
    }
    configFor(providerId) {
        return this.overrides[providerId] ?? deriveDefaultConfig(providerId);
    }
    /**
     * Resolve quando for seguro prosseguir. Retorna uma função `release()`
     * que DEVE ser chamada (em `finally`) depois que a chamada terminar,
     * senão o slot de concorrência vaza.
     */
    async acquire(providerId, accountLabel = "default") {
        const config = this.configFor(providerId);
        const key = this.key(providerId, accountLabel);
        while ((this.inFlight.get(key) ?? 0) >= config.maxConcurrent) {
            await sleep(25);
        }
        this.inFlight.set(key, (this.inFlight.get(key) ?? 0) + 1);
        // A parte sensível a race (ler lastRequestAt, decidir se espera, escrever
        // o novo lastRequestAt) roda encadeada numa fila por chave — cada
        // chamada só começa sua decisão depois que a anterior terminou a dela
        // (incluindo o próprio sleep), garantindo espaçamento correto mesmo
        // com N chamadas disparando em paralelo pro mesmo provider+conta.
        const previousTurn = this.intervalQueue.get(key) ?? Promise.resolve();
        const myTurn = previousTurn.then(async () => {
            const lastAt = this.lastRequestAt.get(key) ?? 0;
            const elapsed = Date.now() - lastAt;
            if (elapsed < config.minIntervalMs) {
                await sleep(config.minIntervalMs - elapsed);
            }
            this.lastRequestAt.set(key, Date.now());
        });
        this.intervalQueue.set(key, myTurn);
        await myTurn;
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            this.inFlight.set(key, Math.max(0, (this.inFlight.get(key) ?? 1) - 1));
        };
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map
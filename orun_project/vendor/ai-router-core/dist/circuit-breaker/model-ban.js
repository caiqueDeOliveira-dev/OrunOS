"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelBan = void 0;
const DEFAULT_OPTIONS = {
    failureThreshold: 1,
    cooldownMs: 120_000,
    maxEntries: 500,
};
/**
 * Ban por MODELO (inspirado no OmniRoute: "circuit breaker scoped per-model
 * to avoid cascading blocks").
 *
 * Diferença do CircuitBreaker (que opera por provider:account): um modelo
 * morto (404/400 "model not found") NÃO derruba o provider inteiro — um
 * provider com catálogo desatualizado pode ter 20 modelos velhos e 1 vivo.
 * Aqui a falha é atribuída ao modelo específico: o modelo entra em cooldown
 * por um tempo e os demais modelos/contas seguem normalmente.
 *
 * Persistência: em memória (como o circuit breaker) — reseta a cada boot,
 * que é o comportamento correto: um catálogo stale hoje pode ser atualizado
 * amanhã.
 */
class ModelBan {
    options;
    entries = new Map();
    constructor(options = DEFAULT_OPTIONS) {
        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    }
    key(providerId, accountLabel, model) {
        return `${providerId}:${accountLabel}:${model}`;
    }
    getEntry(providerId, accountLabel, model) {
        const key = this.key(providerId, accountLabel, model);
        let entry = this.entries.get(key);
        if (!entry) {
            if (this.entries.size >= this.options.maxEntries) {
                // evita crescimento infinito — derruba a entrada mais antiga
                const oldest = this.entries.keys().next().value;
                if (oldest !== undefined)
                    this.entries.delete(oldest);
            }
            entry = {
                providerId,
                accountLabel,
                model,
                failures: 0,
                bannedUntil: null,
            };
            this.entries.set(key, entry);
        }
        return entry;
    }
    /** true = pule este modelo (morto, em cooldown). */
    isBanned(providerId, accountLabel = "default", model) {
        const entry = this.getEntry(providerId, accountLabel, model);
        if (entry.bannedUntil === null)
            return false;
        if (Date.now() >= entry.bannedUntil) {
            entry.bannedUntil = null;
            entry.failures = 0;
            return false;
        }
        return true;
    }
    recordBan(providerId, accountLabel = "default", model) {
        const entry = this.getEntry(providerId, accountLabel, model);
        entry.failures += 1;
        if (entry.failures >= this.options.failureThreshold) {
            entry.bannedUntil = Date.now() + this.options.cooldownMs;
        }
    }
    recordSuccess(providerId, accountLabel = "default", model) {
        const entry = this.getEntry(providerId, accountLabel, model);
        entry.failures = 0;
        entry.bannedUntil = null;
    }
    reset(providerId, accountLabel, model) {
        this.entries.delete(this.key(providerId, accountLabel, model));
    }
    /** Entradas banidas ativas (pra dashboard/health). */
    getBanned() {
        const now = Date.now();
        const result = [];
        for (const entry of this.entries.values()) {
            if (entry.bannedUntil !== null && entry.bannedUntil > now) {
                result.push({
                    providerId: entry.providerId,
                    accountLabel: entry.accountLabel,
                    model: entry.model,
                    until: entry.bannedUntil,
                });
            }
        }
        return result;
    }
    getStatus(providerId, accountLabel = "default", model) {
        const entry = this.getEntry(providerId, accountLabel, model);
        return {
            banned: entry.bannedUntil !== null && entry.bannedUntil > Date.now(),
            failures: entry.failures,
            until: entry.bannedUntil,
        };
    }
}
exports.ModelBan = ModelBan;
//# sourceMappingURL=model-ban.js.map
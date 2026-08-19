"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const DEFAULT_OPTIONS = {
    failureThreshold: 3,
    cooldownMs: 60_000,
};
/**
 * Circuit breaker em memória (por processo — não precisa persistir, reseta
 * a cada boot do app, que é o comportamento correto: um provider instável
 * ontem pode estar bem hoje).
 *
 * Uso no router: antes de tentar um step, `isOpen()`; depois da chamada,
 * `recordSuccess()`/`recordFailure()`.
 */
class CircuitBreaker {
    options;
    entries = new Map();
    constructor(options = DEFAULT_OPTIONS) {
        this.options = options;
    }
    key(providerId, accountLabel) {
        return `${providerId}:${accountLabel}`;
    }
    getEntry(providerId, accountLabel) {
        const key = this.key(providerId, accountLabel);
        let entry = this.entries.get(key);
        if (!entry) {
            entry = { state: "closed", consecutiveFailures: 0, openedAt: null };
            this.entries.set(key, entry);
        }
        return entry;
    }
    /** true = pule este step, o circuito está aberto (provider instável). */
    isOpen(providerId, accountLabel = "default") {
        const entry = this.getEntry(providerId, accountLabel);
        if (entry.state === "closed")
            return false;
        if (entry.state === "open" && entry.openedAt !== null) {
            const elapsed = Date.now() - entry.openedAt;
            if (elapsed >= this.options.cooldownMs) {
                entry.state = "half-open"; // deixa passar 1 tentativa de teste
                return false;
            }
            return true;
        }
        // half-open: deixa passar (é a própria tentativa de teste)
        return false;
    }
    recordSuccess(providerId, accountLabel = "default") {
        const entry = this.getEntry(providerId, accountLabel);
        entry.state = "closed";
        entry.consecutiveFailures = 0;
        entry.openedAt = null;
    }
    recordFailure(providerId, accountLabel = "default") {
        const entry = this.getEntry(providerId, accountLabel);
        if (entry.state === "half-open") {
            // falhou o teste — reabre e reinicia o cooldown
            entry.state = "open";
            entry.openedAt = Date.now();
            return;
        }
        entry.consecutiveFailures += 1;
        if (entry.consecutiveFailures >= this.options.failureThreshold) {
            entry.state = "open";
            entry.openedAt = Date.now();
        }
    }
    getState(providerId, accountLabel = "default") {
        return this.getEntry(providerId, accountLabel).state;
    }
    getStates() {
        const result = [];
        for (const [key, entry] of this.entries) {
            const [providerId, accountLabel] = key.split(":");
            let until = null;
            if (entry.state === "open" && entry.openedAt !== null) {
                until = entry.openedAt + this.options.cooldownMs;
            }
            result.push({
                providerId: providerId ? `${providerId}:${accountLabel ?? "default"}` : key,
                state: entry.state,
                errors: entry.consecutiveFailures,
                until,
            });
        }
        return result;
    }
    reset(providerId, accountLabel = "default") {
        this.entries.delete(this.key(providerId, accountLabel));
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map
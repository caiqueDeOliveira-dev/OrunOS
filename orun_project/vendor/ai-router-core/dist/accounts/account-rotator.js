"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountRotator = exports.InMemoryRotationCursorStore = void 0;
/** Cursor em memória — perfeitamente aceitável, round-robin não precisa sobreviver a restart. */
class InMemoryRotationCursorStore {
    cursors = new Map();
    async getCursor(providerId) {
        return this.cursors.get(providerId) ?? 0;
    }
    async setCursor(providerId, index) {
        this.cursors.set(providerId, index);
    }
}
exports.InMemoryRotationCursorStore = InMemoryRotationCursorStore;
/**
 * Escolhe qual conta usar quando um step do combo referencia um provider
 * com múltiplas contas configuradas (ex: 2 contas Groq pra dobrar o rate
 * limit efetivo). Dois modos:
 *  - "priority": sempre a de maior prioridade disponível (menor número = maior prioridade)
 *  - "round-robin": alterna entre as contas habilitadas em sequência
 *
 * Exaustão por conta: quando uma conta específica estoura quota (HTTP 429 /
 * rate_limit_exceeded), ela entra num cooldown (markExhausted) e o rotator a
 * ignora até o tempo passar — sem pausar as demais contas do mesmo provider
 * e sem abrir o circuit breaker do provider inteiro.
 */
class AccountRotator {
    cursorStore;
    cooldownMs;
    exhausted = new Map();
    constructor(cursorStore = new InMemoryRotationCursorStore(), options = {}) {
        this.cursorStore = cursorStore;
        this.cooldownMs = options.cooldownMs ?? 60_000;
    }
    exhaustedKey(providerId, accountLabel) {
        return `${providerId}::${accountLabel ?? "default"}`;
    }
    /** Marca a conta como exausta por cooldownMs (default 60s). Enumera a conta, não o provider. */
    markExhausted(providerId, accountLabel, options = {}) {
        const cooldownMs = options.cooldownMs ?? this.cooldownMs;
        this.exhausted.set(this.exhaustedKey(providerId, accountLabel), Date.now() + cooldownMs);
    }
    clearExhausted(providerId, accountLabel) {
        this.exhausted.delete(this.exhaustedKey(providerId, accountLabel));
    }
    /** true = conta exausta (429/quota) ainda em cooldown. Expiração é lazy. */
    isExhausted(providerId, accountLabel) {
        const key = this.exhaustedKey(providerId, accountLabel);
        const until = this.exhausted.get(key);
        if (until === undefined)
            return false;
        if (until <= Date.now()) {
            this.exhausted.delete(key);
            return false;
        }
        return true;
    }
    /** Diagnóstico/dashboard: contas atualmente em cooldown. */
    listExhausted() {
        const now = Date.now();
        const result = [];
        for (const [key, until] of this.exhausted) {
            if (until <= now) {
                this.exhausted.delete(key);
                continue;
            }
            const sep = key.indexOf("::");
            result.push({ providerId: key.slice(0, sep), accountLabel: key.slice(sep + 2), until });
        }
        return result;
    }
    /** accounts já deve vir filtrado só com enabled=true. */
    async pickAccount(providerId, accounts, mode = "priority") {
        if (accounts.length === 0)
            return null;
        // filtra contas exaustas (em cooldown de 429/quota) antes de escolher
        const active = accounts.filter((a) => !this.isExhausted(providerId, a.accountLabel ?? "default"));
        if (active.length === 0)
            return null;
        if (active.length === 1)
            return active[0];
        if (mode === "priority") {
            return [...active].sort((a, b) => a.priority - b.priority)[0];
        }
        // round-robin: ordena por accountLabel pra ter uma ordem estável, depois roda o cursor
        const sorted = [...active].sort((a, b) => (a.accountLabel ?? "").localeCompare(b.accountLabel ?? ""));
        const cursor = await this.cursorStore.getCursor(providerId);
        const index = cursor % sorted.length;
        await this.cursorStore.setCursor(providerId, index + 1);
        return sorted[index];
    }
}
exports.AccountRotator = AccountRotator;
//# sourceMappingURL=account-rotator.js.map
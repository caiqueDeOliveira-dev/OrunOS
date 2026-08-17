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
 */
class AccountRotator {
    cursorStore;
    constructor(cursorStore = new InMemoryRotationCursorStore()) {
        this.cursorStore = cursorStore;
    }
    /** accounts já deve vir filtrado só com enabled=true. */
    async pickAccount(providerId, accounts, mode = "priority") {
        if (accounts.length === 0)
            return null;
        if (accounts.length === 1)
            return accounts[0];
        if (mode === "priority") {
            return [...accounts].sort((a, b) => a.priority - b.priority)[0];
        }
        // round-robin: ordena por accountLabel pra ter uma ordem estável, depois roda o cursor
        const sorted = [...accounts].sort((a, b) => (a.accountLabel ?? "").localeCompare(b.accountLabel ?? ""));
        const cursor = await this.cursorStore.getCursor(providerId);
        const index = cursor % sorted.length;
        await this.cursorStore.setCursor(providerId, index + 1);
        return sorted[index];
    }
}
exports.AccountRotator = AccountRotator;
//# sourceMappingURL=account-rotator.js.map
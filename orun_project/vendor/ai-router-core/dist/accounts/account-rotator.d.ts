import type { ProviderConfig, ProviderId } from "../schema";
export interface IRotationCursorStore {
    getCursor(providerId: ProviderId): Promise<number>;
    setCursor(providerId: ProviderId, index: number): Promise<void>;
}
/** Cursor em memória — perfeitamente aceitável, round-robin não precisa sobreviver a restart. */
export declare class InMemoryRotationCursorStore implements IRotationCursorStore {
    private cursors;
    getCursor(providerId: ProviderId): Promise<number>;
    setCursor(providerId: ProviderId, index: number): Promise<void>;
}
/**
 * Escolhe qual conta usar quando um step do combo referencia um provider
 * com múltiplas contas configuradas (ex: 2 contas Groq pra dobrar o rate
 * limit efetivo). Dois modos:
 *  - "priority": sempre a de maior prioridade disponível (menor número = maior prioridade)
 *  - "round-robin": alterna entre as contas habilitadas em sequência
 */
export declare class AccountRotator {
    private readonly cursorStore;
    constructor(cursorStore?: IRotationCursorStore);
    /** accounts já deve vir filtrado só com enabled=true. */
    pickAccount(providerId: ProviderId, accounts: ProviderConfig[], mode?: "priority" | "round-robin"): Promise<ProviderConfig | null>;
}

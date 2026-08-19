import type { ProviderId } from "../schema";
export type CircuitState = "closed" | "open" | "half-open";
export interface CircuitBreakerOptions {
    failureThreshold: number;
    cooldownMs: number;
}
/**
 * Circuit breaker em memória (por processo — não precisa persistir, reseta
 * a cada boot do app, que é o comportamento correto: um provider instável
 * ontem pode estar bem hoje).
 *
 * Uso no router: antes de tentar um step, `isOpen()`; depois da chamada,
 * `recordSuccess()`/`recordFailure()`.
 */
export declare class CircuitBreaker {
    private readonly options;
    private entries;
    constructor(options?: CircuitBreakerOptions);
    private key;
    private getEntry;
    /** true = pule este step, o circuito está aberto (provider instável). */
    isOpen(providerId: ProviderId, accountLabel?: string): boolean;
    recordSuccess(providerId: ProviderId, accountLabel?: string): void;
    recordFailure(providerId: ProviderId, accountLabel?: string): void;
    getState(providerId: ProviderId, accountLabel?: string): CircuitState;
    getStates(): Array<{
        providerId: string;
        state: CircuitState;
        errors: number;
        until: number | null;
    }>;
    reset(providerId: ProviderId, accountLabel?: string): void;
}

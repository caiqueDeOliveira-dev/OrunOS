import type { ProviderId } from "../schema";
export interface RateLimitConfig {
    /** intervalo mínimo entre requests consecutivos pra esse provider+conta (ms) */
    minIntervalMs: number;
    /** quantas chamadas simultâneas no máximo pra esse provider+conta */
    maxConcurrent: number;
}
/**
 * Limita SUAS PRÓPRIAS chamadas antes de sair pra rede — diferente do
 * QuotaTracker (que só observa) e do CircuitBreaker (que só reage depois
 * de falhar), este é preventivo: se o Hampton Circle inteiro disparar 17
 * requests pro Groq free-tier ao mesmo tempo, elas ficam na fila aqui e
 * saem espaçadas, em vez de estourar o rate-limit do provider de verdade
 * e arriscar um ban temporário.
 */
export declare class RateLimiter {
    private lastRequestAt;
    private inFlight;
    /** fila que serializa a decisão de intervalo mínimo por chave — evita a race de duas chamadas lerem o mesmo lastRequestAt antes de qualquer uma escrever. */
    private intervalQueue;
    private overrides;
    constructor(overrides?: Partial<Record<ProviderId, RateLimitConfig>>);
    private key;
    private configFor;
    /**
     * Resolve quando for seguro prosseguir. Retorna uma função `release()`
     * que DEVE ser chamada (em `finally`) depois que a chamada terminar,
     * senão o slot de concorrência vaza.
     */
    acquire(providerId: ProviderId, accountLabel?: string): Promise<() => void>;
}

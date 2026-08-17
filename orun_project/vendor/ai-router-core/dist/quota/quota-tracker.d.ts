import type { ProviderId } from "../schema";
import type { IUsageLogStore } from "../store/interfaces";
export interface QuotaStatus {
    providerId: ProviderId;
    accountLabel: string;
    usedInWindow: number;
    limit: number | null;
    remaining: number | null;
    resetAt: number | null;
    source: "header" | "local-count" | "unknown";
}
/** Info de rate-limit extraída de headers HTTP, quando o provider expõe (padrão OpenAI/Anthropic). */
export interface RateLimitHeaderInfo {
    remaining?: number;
    limit?: number;
    resetAt?: number;
}
/**
 * Parseia os headers mais comuns entre providers OpenAI-compatible e
 * Anthropic. Cada provider usa nomes ligeiramente diferentes; cobrimos os
 * mais frequentes e ignoramos silenciosamente o que não bater.
 */
export declare function parseRateLimitHeaders(headers: Headers): RateLimitHeaderInfo | null;
export interface IQuotaHeaderCache {
    set(providerId: ProviderId, accountLabel: string, info: RateLimitHeaderInfo): void;
    get(providerId: ProviderId, accountLabel: string): RateLimitHeaderInfo | null;
}
/** Cache em memória — headers só valem enquanto o processo está de pé, não precisa persistir. */
export declare class InMemoryQuotaHeaderCache implements IQuotaHeaderCache {
    private cache;
    private key;
    set(providerId: ProviderId, accountLabel: string, info: RateLimitHeaderInfo): void;
    get(providerId: ProviderId, accountLabel: string): RateLimitHeaderInfo | null;
}
export declare class QuotaTracker {
    private readonly usageLogStore;
    private readonly headerCache;
    constructor(usageLogStore: IUsageLogStore, headerCache?: IQuotaHeaderCache);
    ingestHeaders(providerId: ProviderId, accountLabel: string, headers: Headers): void;
    getStatus(providerId: ProviderId, accountLabel?: string): Promise<QuotaStatus>;
}

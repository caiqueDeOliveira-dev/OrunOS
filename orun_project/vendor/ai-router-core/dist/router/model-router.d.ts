import type { Combo, RouterCompletionRequest, RouterCompletionResult } from "../schema";
import { type StreamChunk } from "../adapters/types";
import type { IAiSecretStore, IComboStore, IProviderConfigStore, ISkillStore, IUsageLogStore } from "../store/interfaces";
import { CircuitBreaker } from "../circuit-breaker/circuit-breaker";
import { QuotaTracker } from "../quota/quota-tracker";
import { AccountRotator } from "../accounts/account-rotator";
import { SemanticCache } from "../cache/semantic-cache";
import { RateLimiter } from "../rate-limit/rate-limiter";
export interface IModelRouter {
    complete(request: RouterCompletionRequest): Promise<RouterCompletionResult>;
    completeStream?(request: RouterCompletionRequest, onChunk: (chunk: StreamChunk & {
        stepIndex: number;
        providerId?: string;
        restarting?: boolean;
    }) => void): Promise<RouterCompletionResult>;
}
export declare class ComboExhaustedError extends Error {
    readonly comboId: string;
    readonly attempts: Array<{
        providerId: string;
        model: string;
        error: string;
    }>;
    constructor(comboId: string, attempts: Array<{
        providerId: string;
        model: string;
        error: string;
    }>);
}
export declare class ModelRouter implements IModelRouter {
    private readonly comboStore;
    private readonly providerConfigStore;
    private readonly secretStore;
    private readonly skillStore;
    private readonly usageLogStore;
    private readonly circuitBreaker;
    private readonly quotaTracker;
    private readonly accountRotator;
    private readonly semanticCache;
    private readonly rateLimiter;
    constructor(comboStore: IComboStore, providerConfigStore: IProviderConfigStore, secretStore: IAiSecretStore, skillStore: ISkillStore, usageLogStore: IUsageLogStore, opts?: {
        circuitBreaker?: CircuitBreaker;
        quotaTracker?: QuotaTracker;
        accountRotator?: AccountRotator;
        /** Só é consultado se o combo tiver cacheEnabled=true. Sem isso injetado, cacheEnabled é ignorado silenciosamente (fail-open, nunca quebra a chamada). */
        semanticCache?: SemanticCache;
        rateLimiter?: RateLimiter;
    });
    complete(request: RouterCompletionRequest): Promise<RouterCompletionResult>;
    /**
     * Igual a `complete()`, mas emite pedaços de texto conforme chegam
     * (quando o adapter do provider escolhido suporta streaming — hoje:
     * openai-compatible, anthropic-native, ollama-native, gemini-native).
     * Se o step atual não tiver streaming, cai pra `complete()` normal e
     * emite o conteúdo inteiro como um único chunk no final.
     *
     * IMPORTANTE — limitação conhecida: se um provider falhar DEPOIS de já
     * ter emitido alguns chunks, o router cai pro próximo step do combo (like
     * sempre), mas o texto parcial já emitido não pode ser "desfeito". Antes
     * de tentar um novo step após uma falha, emitimos um chunk com
     * `restarting: true` — trate isso na UI como sinal pra descartar o texto
     * acumulado até então e recomeçar limpo.
     */
    completeStream(request: RouterCompletionRequest, onChunk: (chunk: StreamChunk & {
        stepIndex: number;
        providerId?: string;
        restarting?: boolean;
    }) => void): Promise<RouterCompletionResult>;
    /** Status de quota exposto pra UI (dashboard) consultar sem passar por uma chamada de verdade. */
    getQuotaStatus(providerId: Combo["steps"][number]["providerId"], accountLabel?: string): Promise<import("../quota/quota-tracker").QuotaStatus>;
    getCircuitState(providerId: Combo["steps"][number]["providerId"], accountLabel?: string): import("../circuit-breaker/circuit-breaker").CircuitState;
    getAllCircuitStates(): {
        providerId: string;
        state: import("../circuit-breaker/circuit-breaker").CircuitState;
        errors: number;
        until: number | null;
    }[];
    private applySkill;
    private tryStep;
    private callAdapterWithRetry;
}

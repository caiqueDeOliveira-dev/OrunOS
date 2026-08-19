import type { RouterMessage, ToolDefinition, ToolChoice, ToolCall } from "../schema";
import type { ProxyPoolConfig } from "../proxy-pool";
/** Resultado bruto de uma chamada de provider, antes de virar UsageEvent. */
export interface RawCompletionResult {
    content: string;
    promptTokens: number;
    completionTokens: number;
    /** Headers crus da resposta HTTP — usado pelo QuotaTracker pra ler rate-limit real, quando exposto. */
    responseHeaders?: Headers;
    /** Tool calls retornados pelo provider (no formato canônico OpenAI). */
    toolCalls?: ToolCall[];
}
/**
 * Credenciais resolvidas na hora da chamada — vêm do ISecretStore,
 * o adapter nunca sabe onde elas foram guardadas.
 */
export interface ResolvedCredential {
    apiKey?: string;
    oauthAccessToken?: string;
}
export interface AdapterCallOptions {
    baseUrl: string;
    model: string;
    credential: ResolvedCredential;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
    /** default: DEFAULT_TIMEOUT_MS (30s) — ver adapters/timeout.ts */
    timeoutMs?: number;
    /** Tool definitions pass-through (formato canônico OpenAI). Cada adapter traduz pro wire format nativo. */
    tools?: ToolDefinition[];
    /** Tool choice strategy: "auto", "none", "required", ou指定 de função específica. */
    tool_choice?: ToolChoice;
    /** Proxy pool config — se habilitado, o adapter roteia requests via proxy. */
    proxyPool?: ProxyPoolConfig;
}
export interface StreamChunk {
    deltaText: string;
    done: boolean;
}
/**
 * Cada wire format (openai-compatible, anthropic-native, gemini-native,
 * ollama-native, vertex-native) implementa isto uma única vez.
 * Providers "API key" que falam openai-compatible TODOS reusam o
 * mesmo adapter — é por isso que 40 providers viram ~5 implementações.
 */
export interface IProviderAdapter {
    readonly wireFormat: string;
    complete(messages: RouterMessage[], opts: AdapterCallOptions): Promise<RawCompletionResult>;
    /** Opcional — nem todo adapter precisa suportar. O router cai pra `complete()` normal se ausente. */
    completeStream?(messages: RouterMessage[], opts: AdapterCallOptions, onChunk: (chunk: StreamChunk) => void): Promise<RawCompletionResult>;
}
export declare class ProviderCallError extends Error {
    readonly providerId: string;
    readonly statusCode?: number | undefined;
    readonly isRateLimit: boolean;
    readonly isQuotaExhausted: boolean;
    /** 5xx (ou 408) — falha transitória do lado do provider, vale retry com backoff. */
    readonly isServerError: boolean;
    constructor(message: string, providerId: string, statusCode?: number | undefined, isRateLimit?: boolean, isQuotaExhausted?: boolean, 
    /** 5xx (ou 408) — falha transitória do lado do provider, vale retry com backoff. */
    isServerError?: boolean);
}
/** true pra status HTTP que indicam falha momentânea do provider (não do request em si). */
export declare function isTransientServerStatus(status: number): boolean;

import type { IAiSecretStore, IComboStore, IProviderConfigStore, IUsageLogStore } from "../store/interfaces";
export type MediaKind = "image-gen" | "audio-tts" | "embeddings";
export interface MediaRequest {
    comboId: string;
    kind: MediaKind;
    prompt: string;
    options?: Record<string, unknown>;
}
export interface MediaResult {
    providerId: string;
    model: string;
    stepIndex: number;
    imageUrl?: string;
    imageBase64?: string;
    audioBase64?: string;
    embedding?: number[];
}
export declare class MediaExhaustedError extends Error {
    readonly comboId: string;
    readonly attempts: Array<{
        providerId: string;
        error: string;
    }>;
    constructor(comboId: string, attempts: Array<{
        providerId: string;
        error: string;
    }>);
}
/**
 * Equivalente ao ModelRouter, mas pra combos kind="media". Mesma lógica de
 * fallback por step; a diferença é a chamada HTTP em si, que varia bastante
 * por capability (endpoint /images/generations, /audio/speech, /embeddings
 * no dialeto OpenAI-compatible — cobre a maioria dos providers do registry).
 */
export declare class MediaRouter {
    private readonly comboStore;
    private readonly providerConfigStore;
    private readonly secretStore;
    private readonly usageLogStore;
    constructor(comboStore: IComboStore, providerConfigStore: IProviderConfigStore, secretStore: IAiSecretStore, usageLogStore: IUsageLogStore);
    complete(request: MediaRequest): Promise<MediaResult>;
    private callMediaEndpoint;
}

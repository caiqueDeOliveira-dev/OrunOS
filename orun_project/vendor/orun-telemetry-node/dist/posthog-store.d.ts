import type { ITelemetryStore, IdentifyTraits } from "@orun/telemetry-core";
import type { TelemetryEvent } from "@orun/telemetry-core";
export interface PostHogStoreConfig {
    /** URL do PostHog self-hosted, ex: http://localhost:8000 */
    host: string;
    /** Project API key (não confundir com personal API key). */
    apiKey: string;
    /** Flush automático a cada N ms. Default: 10s. */
    flushIntervalMs?: number;
    /** Tamanho do batch antes de flush forçado. Default: 20. */
    flushAt?: number;
}
/**
 * PostHogTelemetryStore
 *
 * Implementação concreta de ITelemetryStore usando PostHog self-hosted.
 * Esta é a ÚNICA classe do monorepo que conhece o SDK do PostHog -
 * trocar de provider no futuro significa criar um novo *Store aqui,
 * sem tocar em core nem nos agentes do Hampton Circle.
 */
export declare class PostHogTelemetryStore implements ITelemetryStore {
    readonly providerName = "posthog";
    private readonly client;
    constructor(config: PostHogStoreConfig);
    track(payload: TelemetryEvent): Promise<void>;
    identify(userId: string, traits?: IdentifyTraits): Promise<void>;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
}

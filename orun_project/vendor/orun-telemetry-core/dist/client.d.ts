import { type TelemetryPayload, type TelemetryEvent } from "./schema";
import type { ITelemetryStore, IdentifyTraits } from "./interfaces";
export interface TelemetryClientConfig {
    store: ITelemetryStore;
    platform: TelemetryEvent["platform"];
    appVersion: string;
    /** Se false, track() vira no-op (kill switch para debug/opt-out). */
    enabled?: boolean;
    /** Chamado sempre que um evento falha a validação Zod (não deve derrubar o app). */
    onValidationError?: (error: unknown, payload: unknown) => void;
}
/**
 * TelemetryClient
 *
 * Camada que os agentes do Hampton Circle realmente importam.
 * Nunca importa PostHog/Umami diretamente - só a interface.
 */
export declare class TelemetryClient {
    private readonly store;
    private readonly platform;
    private readonly appVersion;
    private readonly enabled;
    private readonly onValidationError?;
    private sessionId;
    constructor(config: TelemetryClientConfig);
    /** Inicia uma nova sessão (ex: após login/logout). */
    resetSession(): void;
    track(payload: TelemetryPayload, userId?: string): Promise<void>;
    identify(userId: string, traits?: IdentifyTraits): Promise<void>;
    flush(): Promise<void>;
    shutdown(): Promise<void>;
    getSessionId(): string;
    getPlatform(): TelemetryEvent["platform"];
    getAppVersion(): string;
}

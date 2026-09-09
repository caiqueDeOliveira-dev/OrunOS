import { randomUUID } from "node:crypto";
import {
  TelemetryPayloadSchema,
  type TelemetryPayload,
  type TelemetryEvent,
} from "./schema";
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
export class TelemetryClient {
  private readonly store: ITelemetryStore;
  private readonly platform: TelemetryEvent["platform"];
  private readonly appVersion: string;
  private readonly enabled: boolean;
  private readonly onValidationError?: (
    error: unknown,
    payload: unknown
  ) => void;
  private sessionId: string;

  constructor(config: TelemetryClientConfig) {
    this.store = config.store;
    this.platform = config.platform;
    this.appVersion = config.appVersion;
    this.enabled = config.enabled ?? true;
    if (config.onValidationError) {
      this.onValidationError = config.onValidationError;
    }
    this.sessionId = randomUUID();
  }

  /** Inicia uma nova sessão (ex: após login/logout). */
  resetSession(): void {
    this.sessionId = randomUUID();
  }

  async track(payload: TelemetryPayload, userId?: string): Promise<void> {
    if (!this.enabled) return;

    const parsed = TelemetryPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      this.onValidationError?.(parsed.error, payload);
      return; // telemetria nunca deve quebrar o fluxo do agente
    }

    try {
      await this.store.track({
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        platform: this.platform,
        appVersion: this.appVersion,
        ...(userId ? { userId } : {}),
        ...parsed.data,
      });
    } catch {
      // Falha de telemetria é sempre silenciosa para o chamador.
      // O provider concreto é responsável por seu próprio retry/log interno.
    }

    void userId; // reservado: enriquecimento de envelope fica no adapter
  }

  async identify(userId: string, traits?: IdentifyTraits): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.store.identify(userId, traits);
    } catch {
      // silencioso, mesma razão do track()
    }
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  async shutdown(): Promise<void> {
    await this.store.shutdown();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getPlatform(): TelemetryEvent["platform"] {
    return this.platform;
  }

  getAppVersion(): string {
    return this.appVersion;
  }
}

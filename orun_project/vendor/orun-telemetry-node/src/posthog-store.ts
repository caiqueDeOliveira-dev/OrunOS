import { PostHog } from "posthog-node";
import type {
  ITelemetryStore,
  IdentifyTraits,
} from "@orun/telemetry-core";
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
export class PostHogTelemetryStore implements ITelemetryStore {
  readonly providerName = "posthog";
  private readonly client: PostHog;

  constructor(config: PostHogStoreConfig) {
    this.client = new PostHog(config.apiKey, {
      host: config.host,
      flushInterval: config.flushIntervalMs ?? 10_000,
      flushAt: config.flushAt ?? 20,
    });
  }

  async track(payload: TelemetryEvent): Promise<void> {
    const { eventId, userId, type, ...properties } = payload;
    this.client.capture({
      distinctId: userId ?? payload.sessionId,
      event: type,
      properties: {
        ...properties,
        $insert_id: eventId, // evita duplicidade se houver retry upstream
      },
    });
  }

  async identify(userId: string, traits?: IdentifyTraits): Promise<void> {
    this.client.identify(
      traits
        ? { distinctId: userId, properties: traits }
        : { distinctId: userId }
    );
  }

  async flush(): Promise<void> {
    await this.client.flush();
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }
}

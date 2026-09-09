import { TelemetryClient } from "@orun/telemetry-core";
import { PostHogTelemetryStore, type PostHogStoreConfig } from "./posthog-store";

export interface CreateDesktopTelemetryOptions {
  posthog: PostHogStoreConfig;
  appVersion: string;
  /** Vem de @orun/settings - namespace "privacy" ou similar. */
  enabled?: boolean;
}

/**
 * Ponto único de entrada para o Electron main process.
 * Uso típico em src/main/index.ts:
 *
 *   const telemetry = createDesktopTelemetry({
 *     posthog: { host: "http://localhost:8000", apiKey: settings.telemetry.apiKey },
 *     appVersion: app.getVersion(),
 *     enabled: settings.privacy.telemetryEnabled,
 *   });
 */
export function createDesktopTelemetry(
  options: CreateDesktopTelemetryOptions
): TelemetryClient {
  const store = new PostHogTelemetryStore(options.posthog);

  return new TelemetryClient({
    store,
    platform: "desktop",
    appVersion: options.appVersion,
    enabled: options.enabled ?? true,
    onValidationError: (error, payload) => {
      // Nunca deve acontecer em produção (schema é a fonte da verdade),
      // mas loga localmente em vez de silenciar por completo em dev.
      // eslint-disable-next-line no-console
      console.warn("[@orun/telemetry] payload inválido descartado:", {
        error,
        payload,
      });
    },
  });
}

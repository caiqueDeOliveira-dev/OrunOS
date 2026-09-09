import { TelemetryClient } from "@orun/telemetry-core";
import { type PostHogStoreConfig } from "./posthog-store";
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
export declare function createDesktopTelemetry(options: CreateDesktopTelemetryOptions): TelemetryClient;

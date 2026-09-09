"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDesktopTelemetry = createDesktopTelemetry;
const telemetry_core_1 = require("@orun/telemetry-core");
const posthog_store_1 = require("./posthog-store");
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
function createDesktopTelemetry(options) {
    const store = new posthog_store_1.PostHogTelemetryStore(options.posthog);
    return new telemetry_core_1.TelemetryClient({
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

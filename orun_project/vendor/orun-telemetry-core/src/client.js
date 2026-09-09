"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryClient = void 0;
const node_crypto_1 = require("node:crypto");
const schema_1 = require("./schema");
/**
 * TelemetryClient
 *
 * Camada que os agentes do Hampton Circle realmente importam.
 * Nunca importa PostHog/Umami diretamente - só a interface.
 */
class TelemetryClient {
    store;
    platform;
    appVersion;
    enabled;
    onValidationError;
    sessionId;
    constructor(config) {
        this.store = config.store;
        this.platform = config.platform;
        this.appVersion = config.appVersion;
        this.enabled = config.enabled ?? true;
        if (config.onValidationError) {
            this.onValidationError = config.onValidationError;
        }
        this.sessionId = (0, node_crypto_1.randomUUID)();
    }
    /** Inicia uma nova sessão (ex: após login/logout). */
    resetSession() {
        this.sessionId = (0, node_crypto_1.randomUUID)();
    }
    async track(payload, userId) {
        if (!this.enabled)
            return;
        const parsed = schema_1.TelemetryPayloadSchema.safeParse(payload);
        if (!parsed.success) {
            this.onValidationError?.(parsed.error, payload);
            return; // telemetria nunca deve quebrar o fluxo do agente
        }
        try {
            await this.store.track({
                ...parsed.data,
            });
        }
        catch {
            // Falha de telemetria é sempre silenciosa para o chamador.
            // O provider concreto é responsável por seu próprio retry/log interno.
        }
        void userId; // reservado: enriquecimento de envelope fica no adapter
    }
    async identify(userId, traits) {
        if (!this.enabled)
            return;
        try {
            await this.store.identify(userId, traits);
        }
        catch {
            // silencioso, mesma razão do track()
        }
    }
    async flush() {
        await this.store.flush();
    }
    async shutdown() {
        await this.store.shutdown();
    }
    getSessionId() {
        return this.sessionId;
    }
    getPlatform() {
        return this.platform;
    }
    getAppVersion() {
        return this.appVersion;
    }
}
exports.TelemetryClient = TelemetryClient;

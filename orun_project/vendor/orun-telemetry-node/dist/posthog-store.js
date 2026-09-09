"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostHogTelemetryStore = void 0;
const posthog_node_1 = require("posthog-node");
/**
 * PostHogTelemetryStore
 *
 * Implementação concreta de ITelemetryStore usando PostHog self-hosted.
 * Esta é a ÚNICA classe do monorepo que conhece o SDK do PostHog -
 * trocar de provider no futuro significa criar um novo *Store aqui,
 * sem tocar em core nem nos agentes do Hampton Circle.
 */
class PostHogTelemetryStore {
    providerName = "posthog";
    client;
    constructor(config) {
        this.client = new posthog_node_1.PostHog(config.apiKey, {
            host: config.host,
            flushInterval: config.flushIntervalMs ?? 10_000,
            flushAt: config.flushAt ?? 20,
        });
    }
    async track(payload) {
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
    async identify(userId, traits) {
        this.client.identify(traits
            ? { distinctId: userId, properties: traits }
            : { distinctId: userId });
    }
    async flush() {
        await this.client.flush();
    }
    async shutdown() {
        await this.client.shutdown();
    }
}
exports.PostHogTelemetryStore = PostHogTelemetryStore;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRouter = exports.MediaExhaustedError = void 0;
const registry_1 = require("../providers/registry");
const types_1 = require("../adapters/types");
const validate_base_url_1 = require("../security/validate-base-url");
const KIND_TO_CAPABILITY = {
    "image-gen": "image-gen",
    "audio-tts": "audio-tts",
    embeddings: "embeddings",
};
class MediaExhaustedError extends Error {
    comboId;
    attempts;
    constructor(comboId, attempts) {
        super(`Combo de mídia "${comboId}" esgotado:\n` + attempts.map((a) => `  ${a.providerId}: ${a.error}`).join("\n"));
        this.comboId = comboId;
        this.attempts = attempts;
        this.name = "MediaExhaustedError";
    }
}
exports.MediaExhaustedError = MediaExhaustedError;
/**
 * Equivalente ao ModelRouter, mas pra combos kind="media". Mesma lógica de
 * fallback por step; a diferença é a chamada HTTP em si, que varia bastante
 * por capability (endpoint /images/generations, /audio/speech, /embeddings
 * no dialeto OpenAI-compatible — cobre a maioria dos providers do registry).
 */
class MediaRouter {
    comboStore;
    providerConfigStore;
    secretStore;
    usageLogStore;
    constructor(comboStore, providerConfigStore, secretStore, usageLogStore) {
        this.comboStore = comboStore;
        this.providerConfigStore = providerConfigStore;
        this.secretStore = secretStore;
        this.usageLogStore = usageLogStore;
    }
    async complete(request) {
        const combo = await this.comboStore.getCombo(request.comboId);
        if (!combo)
            throw new Error(`Combo não encontrado: ${request.comboId}`);
        if (combo.kind !== "media") {
            throw new Error(`Combo "${request.comboId}" é do tipo "${combo.kind}", use ModelRouter.complete() para texto.`);
        }
        const requiredCapability = KIND_TO_CAPABILITY[request.kind];
        const attempts = [];
        for (let stepIndex = 0; stepIndex < combo.steps.length; stepIndex++) {
            const step = combo.steps[stepIndex];
            const providerDef = (0, registry_1.getProvider)(step.providerId);
            if (!providerDef.capabilities.includes(requiredCapability)) {
                attempts.push({ providerId: step.providerId, error: `não suporta capability "${requiredCapability}"` });
                continue;
            }
            const config = await this.providerConfigStore.getConfig(step.providerId);
            if (config && !config.enabled) {
                attempts.push({ providerId: step.providerId, error: "provider desabilitado" });
                continue;
            }
            const credential = providerDef.authMethod === "none" ? {} : await this.secretStore.getCredential(step.providerId, step.accountLabel);
            if (providerDef.authMethod !== "none" && !credential) {
                attempts.push({ providerId: step.providerId, error: "sem credencial" });
                continue;
            }
            const baseUrl = config?.customBaseUrl ?? providerDef.baseUrl;
            if (!baseUrl) {
                attempts.push({ providerId: step.providerId, error: "baseUrl não definida" });
                continue;
            }
            if (!(0, validate_base_url_1.isSafeBaseUrl)(baseUrl)) {
                attempts.push({ providerId: step.providerId, error: validate_base_url_1.UNSAFE_BASE_URL_ERROR });
                continue;
            }
            try {
                const result = await this.callMediaEndpoint(request.kind, step, baseUrl, credential ?? {}, request);
                await this.usageLogStore.record({
                    timestamp: Date.now(),
                    comboId: combo.id,
                    stepIndex,
                    providerId: step.providerId,
                    model: step.model,
                    promptTokens: 0,
                    completionTokens: 0,
                    latencyMs: 0,
                    success: true,
                    estimatedCostUsd: providerDef.tier === "free" ? 0 : 0.02,
                    cacheHit: false,
                });
                return { providerId: step.providerId, model: step.model, stepIndex, ...result };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                attempts.push({ providerId: step.providerId, error: message });
            }
        }
        throw new MediaExhaustedError(combo.id, attempts);
    }
    async callMediaEndpoint(kind, step, baseUrl, credential, request) {
        const auth = credential.oauthAccessToken ?? credential.apiKey;
        const headers = { "Content-Type": "application/json" };
        if (auth)
            headers["Authorization"] = `Bearer ${auth}`;
        if (kind === "image-gen") {
            const res = await fetch(`${baseUrl}/images/generations`, {
                method: "POST",
                headers,
                body: JSON.stringify({ model: step.model, prompt: request.prompt, ...request.options }),
            });
            if (!res.ok)
                throw new types_1.ProviderCallError(`HTTP ${res.status}`, step.providerId, res.status, res.status === 429);
            const data = (await res.json());
            return { imageUrl: data.data[0]?.url, imageBase64: data.data[0]?.b64_json };
        }
        if (kind === "audio-tts") {
            const res = await fetch(`${baseUrl}/audio/speech`, {
                method: "POST",
                headers,
                body: JSON.stringify({ model: step.model, input: request.prompt, ...request.options }),
            });
            if (!res.ok)
                throw new types_1.ProviderCallError(`HTTP ${res.status}`, step.providerId, res.status, res.status === 429);
            const buf = await res.arrayBuffer();
            return { audioBase64: Buffer.from(buf).toString("base64") };
        }
        // embeddings
        const res = await fetch(`${baseUrl}/embeddings`, {
            method: "POST",
            headers,
            body: JSON.stringify({ model: step.model, input: request.prompt }),
        });
        if (!res.ok)
            throw new types_1.ProviderCallError(`HTTP ${res.status}`, step.providerId, res.status, res.status === 429);
        const data = (await res.json());
        return { embedding: data.data[0]?.embedding };
    }
}
exports.MediaRouter = MediaRouter;
//# sourceMappingURL=media-router.js.map
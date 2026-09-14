"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLiveModels = exports.refreshConfiguredProviders = void 0;
const ai_router_core_1 = require("@orun/ai-router-core");
const DEFAULT_TIMEOUT_MS = 8000;
/**
 * Auto-catálogo de modelos (tirado dos routers "gateway" como OmniRoute/
 * LiteLLM): consulta `GET /models` (ou o equivalente) de cada provider
 * configurado e devolve a lista VIVA de modelos. O runtime de queda (modelo
 * morto -> ban por modelo) fica no ModelBan do core; isso aqui é a metade
 * proativa: detecta catálogo stale sem precisar falhar uma chamada real.
 *
 * Shape da resposta por wireFormat:
 *   openai-compatible => GET {base}/models            -> { data: [{id}] }
 *   anthropic-native  => GET {base}/models            -> { data: [{id}] }
 *   gemini-native     => GET {base}/models?key=...    -> { models: [{name}] }
 *   ollama-native     => GET {base}/api/tags          -> { models: [{name}] }
 *   (oauth/vertex/mcp/a2a/custom) => "unsupported" (sem endpoint de listagem)
 */
function pickFirstArray(body) {
    if (!body || typeof body !== "object")
        return null;
    if (Array.isArray(body))
        return body;
    if (Array.isArray(body.data))
        return body.data;
    if (Array.isArray(body.models))
        return body.models;
    return null;
}
async function fetchJsonWithTimeout(url, headers, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers, signal: controller.signal });
        const text = await res.text();
        let body = null;
        try {
            body = text ? JSON.parse(text) : null;
        }
        catch {
            // corpo não-JSON (HTML de erro etc.) — tratado pelo `text`
        }
        return { status: res.status, ok: res.ok, body, text: text.slice(0, 300) };
    }
    finally {
        clearTimeout(timer);
    }
}
/** Busca a lista viva de modelos de UM provider. Nunca joga — sempre retorna um resultado. */
async function fetchLiveModels(providerId, opts) {
    const { baseUrl, apiKey, wireFormat } = opts;
    const base = String(baseUrl || "").replace(/\/+$/, "");
    const startedAt = Date.now();
    const headers = {};
    let url = "";
    switch (wireFormat) {
        case "openai-compatible":
        case "a2a-native":
            url = `${base}/models`;
            if (apiKey)
                headers.Authorization = `Bearer ${apiKey}`;
            break;
        case "anthropic-native":
            url = `${base}/models`;
            headers["x-api-key"] = apiKey || "";
            headers["anthropic-version"] = "2023-06-01";
            break;
        case "gemini-native":
            url = `${base}/models${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""}`;
            break;
        case "ollama-native":
            url = base.includes("11434") || /localhost|127\.0\.0\.1/.test(base)
                ? "http://localhost:11434/api/tags"
                : `${base}/api/tags`;
            break;
        default:
            return {
                providerId,
                ok: false,
                status: "unsupported",
                models: [],
                latencyMs: Date.now() - startedAt,
                error: `wireFormat "${wireFormat}" (${providerId}) não expõe GET /models`,
            };
    }
    try {
        const result = await fetchJsonWithTimeout(url, headers, DEFAULT_TIMEOUT_MS);
        if (!result.ok) {
            return {
                providerId,
                ok: false,
                status: String(result.status),
                models: [],
                latencyMs: Date.now() - startedAt,
                error: `HTTP ${result.status}: ${result.text}`,
            };
        }
        const arr = pickFirstArray(result.body);
        if (!arr) {
            return {
                providerId,
                ok: false,
                status: "shape",
                models: [],
                latencyMs: Date.now() - startedAt,
                error: `resposta sem lista de modelos (${result.text})`,
            };
        }
        const models = [...new Set(arr
            .map((m) => String(m?.id ?? m?.name ?? m?.model ?? "").trim())
            .filter(Boolean)
            .map((id) => id.replace(/^models\//, "").replace(/:latest$/, "")))].sort();
        return { providerId, ok: true, status: 200, models, latencyMs: Date.now() - startedAt };
    }
    catch (err) {
        return {
            providerId,
            ok: false,
            status: "error",
            models: [],
            latencyMs: Date.now() - startedAt,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
exports.fetchLiveModels = fetchLiveModels;
/**
 * Refresh da lista viva dos providers configurados (enabled). Opcional:
 * `providerId` filtra um único provider. Retorna `liveMap` (providerId ->
 * modelos vivos) pra durar no cache do servidor e alimentar o dashboard.
 */
async function refreshConfiguredProviders(options, providerId) {
    const configs = options.providerConfigStore
        ? await options.providerConfigStore.listConfigs().catch(() => [])
        : [];
    const targets = configs.filter((c) => c.enabled && (!providerId || c.providerId === providerId));
    const at = Date.now();
    const results = [];
    const liveMap = {};
    for (const cfg of targets) {
        let def = null;
        try {
            def = (0, ai_router_core_1.getProvider)(cfg.providerId);
        }
        catch {
            def = null;
        }
        let apiKey = null;
        if (options.credentialStore && def && def.authMethod !== "none") {
            try {
                apiKey = (await options.credentialStore.get(cfg.providerId, "default")) ?? null;
            }
            catch {
                apiKey = null;
            }
        }
        let result;
        if (!def) {
            result = { providerId: cfg.providerId, ok: false, status: "unknown-provider", models: [], latencyMs: 0, error: "provider não registrado no registry" };
        }
        else if (!cfg.customBaseUrl && !def.baseUrl) {
            result = { providerId: cfg.providerId, ok: false, status: "no-baseUrl", models: [], latencyMs: 0, error: "provider sem baseUrl" };
        }
        else {
            result = await fetchLiveModels(cfg.providerId, {
                baseUrl: cfg.customBaseUrl || def.baseUrl,
                apiKey,
                wireFormat: def.wireFormat,
            });
        }
        results.push(result);
        if (result.ok) {
            liveMap[cfg.providerId] = result.models;
        }
    }
    return { at, results, liveMap };
}
exports.refreshConfiguredProviders = refreshConfiguredProviders;
//# sourceMappingURL=model-refresh.js.map
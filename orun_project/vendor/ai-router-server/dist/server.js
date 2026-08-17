"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiRouterServer = createAiRouterServer;
const node_http_1 = require("node:http");
const node_url_1 = require("node:url");
const ai_router_core_1 = require("@orun/ai-router-core");
const MAX_BODY_BYTES = 1024 * 1024;
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "HttpError";
    }
}
/**
 * Servidor HTTP que expõe o router como uma API OpenAI-compatible
 * (`POST /v1/chat/completions`, `GET /v1/models`) e Anthropic
 * (`POST /v1/messages`). Permite apontar qualquer tool que fale esses
 * formatos pro Orun Router como baseURL — e ganhar fallback de providers
 * free de graça.
 */
function createAiRouterServer(options) {
    return (0, node_http_1.createServer)((req, res) => {
        void handleRequest(req, res, options);
    });
}
// ─────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new HttpError(413, "corpo da request muito grande (limite 1MB)"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}
function json(res, status, body) {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}
function sendError(res, status, message, type = "invalid_request") {
    json(res, status, { error: { message, type, param: null, code: type } });
}
function sseHeaders(res) {
    res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-accel-buffering": "no",
    });
}
function sseError(res, err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    try {
        res.write((0, ai_router_core_1.sseData)({ error: { message, type: "stream_error", param: null, code: "stream_error" } }));
        res.end();
    }
    catch {
        // socket já fechado — nada a fazer
    }
}
// ─────────────────────────────────────────────────────────────
// Roteamento
// ─────────────────────────────────────────────────────────────
async function handleRequest(req, res, options) {
    try {
        const url = new node_url_1.URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const path = url.pathname;
        if (path === "/health") {
            json(res, 200, { ok: true, service: "orun-ai-router", time: Date.now() });
            return;
        }
        // ── Dashboard API (api/*) ──────────────────────────────────
        if (path.startsWith("/api/")) {
            await handleDashboardApi(req, res, path, options);
            return;
        }
        // ── Dashboard SPA (/dashboard/*) ───────────────────────────
        if (path === "/dashboard" || path.startsWith("/dashboard/")) {
            await serveDashboard(req, res, path, options);
            return;
        }
        if (!path.startsWith("/v1/")) {
            sendError(res, 404, `rota não encontrada: ${path}`, "not_found");
            return;
        }
        if (options.apiKey) {
            const header = req.headers.authorization ?? "";
            const token = header.startsWith("Bearer ") ? header.slice(7) : "";
            if (token !== options.apiKey) {
                sendError(res, 401, "API key inválida ou ausente", "invalid_api_key");
                return;
            }
        }
        if (req.method === "GET" && path === "/v1/models") {
            const combos = await options.comboStore.listCombos();
            json(res, 200, {
                object: "list",
                data: combos.map((c) => ({ id: c.id, object: "model", created: 0, owned_by: "orun" })),
            });
            return;
        }
        if (req.method === "POST" && (path === "/v1/chat/completions" || path === "/v1/messages")) {
            const raw = await readBody(req);
            let body;
            try {
                body = raw.trim() === "" ? {} : JSON.parse(raw);
            }
            catch {
                sendError(res, 400, "JSON inválido no corpo da request", "invalid_json");
                return;
            }
            if (path === "/v1/chat/completions") {
                await handleOpenAi(res, body, options);
            }
            else {
                await handleAnthropic(res, body, options);
            }
            return;
        }
        sendError(res, 405, `método não suportado para ${path}`, "method_not_allowed");
    }
    catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        const message = err instanceof Error ? err.message : "erro interno";
        sendError(res, status, message, status >= 500 ? "internal_error" : "invalid_request");
    }
}
// ─────────────────────────────────────────────────────────────
// Dashboard API  (/api/*)
// ─────────────────────────────────────────────────────────────
const DASHBOARD_MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
};
async function handleDashboardApi(req, res, path, options) {
    const method = req.method ?? "GET";
    // ── /api/health (detailed) ──
    if (method === "GET" && path === "/api/health") {
        const combos = await options.comboStore.listCombos();
        const def = combos.find((c) => c.isSystemDefault);
        json(res, 200, {
            ok: true,
            dbPath: options.meta?.dbPath ?? null,
            defaultComboId: options.meta?.defaultComboId ?? def?.id ?? null,
            combosCount: combos.length,
            hasProviderConfig: !!options.providerConfigStore,
            hasUsageLog: !!options.usageStore,
        });
        return;
    }
    // ── /api/combos ──
    if (path === "/api/combos") {
        const combos = await options.comboStore.listCombos();
        if (method === "GET") {
            json(res, 200, combos);
            return;
        }
        if (method === "POST") {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            const saved = await options.comboStore.saveCombo(body);
            json(res, 201, saved);
            return;
        }
    }
    // ── /api/combos/:id ──
    const comboMatch = path.match(/^\/api\/combos\/(.+)$/);
    if (comboMatch) {
        const id = decodeURIComponent(comboMatch[1]);
        if (method === "GET") {
            const combo = await options.comboStore.getCombo(id);
            if (!combo) {
                sendError(res, 404, "combo não encontrado");
                return;
            }
            json(res, 200, combo);
            return;
        }
        if (method === "PUT") {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            const saved = await options.comboStore.saveCombo({ ...body, id });
            json(res, 200, saved);
            return;
        }
        if (method === "DELETE") {
            await options.comboStore.deleteCombo(id);
            json(res, 200, { ok: true });
            return;
        }
    }
    // ── /api/providers ──
    if (path === "/api/providers" && options.providerConfigStore) {
        const configs = await options.providerConfigStore.listConfigs();
        if (method === "GET") {
            json(res, 200, configs);
            return;
        }
        if (method === "POST") {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            const saved = await options.providerConfigStore.saveConfig(body);
            json(res, 201, saved);
            return;
        }
    }
    // ── /api/usage ──
    if (path === "/api/usage" && options.usageStore) {
        const url = new node_url_1.URL(req.url ?? "/", "http://localhost");
        const comboId = url.searchParams.get("comboId") ?? undefined;
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        const events = await options.usageStore.listRecent(comboId, limit);
        json(res, 200, events);
        return;
    }
    // ── /api/test ──
    if (method === "POST" && path === "/api/test") {
        const raw = await readBody(req);
        const { comboId, message } = JSON.parse(raw);
        const result = await options.router.complete({
            comboId,
            messages: [{ role: "user", content: message ?? "Responda apenas: OK" }],
            stream: false,
        });
        json(res, 200, result);
        return;
    }
    sendError(res, 404, "rota não encontrada", "not_found");
}
// ─────────────────────────────────────────────────────────────
// Dashboard SPA estático (/dashboard/*)
// ─────────────────────────────────────────────────────────────
async function serveDashboard(req, res, path, options) {
    if (!options.dashboardDir) {
        sendError(res, 404, "dashboard não disponível", "not_found");
        return;
    }
    const assetPath = path === "/dashboard" ? "/index.html" : path.replace(/^\/dashboard\//, "/");
    const ext = assetPath.match(/\.[^.]+$/)?.[0] ?? ".html";
    const mime = DASHBOARD_MIME[ext] ?? "application/octet-stream";
    try {
        const { readFileSync, existsSync } = await Promise.resolve().then(() => __importStar(require("node:fs")));
        const { join } = await Promise.resolve().then(() => __importStar(require("node:path")));
        const filePath = join(options.dashboardDir, assetPath);
        if (existsSync(filePath)) {
            const content = readFileSync(filePath);
            res.writeHead(200, { "content-type": mime, "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000" });
            res.end(content);
            return;
        }
        // SPA fallback: serve index.html for any non-file path
        const indexPath = join(options.dashboardDir, "index.html");
        if (existsSync(indexPath)) {
            const content = readFileSync(indexPath);
            res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
            res.end(content);
            return;
        }
    }
    catch { /* dist not built yet — fall through */ }
    sendError(res, 404, "dashboard não encontrado", "not_found");
}
// ─────────────────────────────────────────────────────────────
// Resolução de combo
// ─────────────────────────────────────────────────────────────
async function resolveComboId(store, requestedModel) {
    if (requestedModel) {
        const direct = await store.getCombo(requestedModel);
        if (direct)
            return direct.id;
        const combos = await store.listCombos();
        for (const combo of combos) {
            if (combo.steps.some((s) => s.model === requestedModel))
                return combo.id;
        }
    }
    const combos = await store.listCombos();
    const def = combos.find((c) => c.isSystemDefault);
    if (def)
        return def.id;
    if (combos.length > 0)
        return combos[0].id;
    throw new HttpError(500, "nenhum combo configurado");
}
// ─────────────────────────────────────────────────────────────
// OpenAI Chat Completions
// ─────────────────────────────────────────────────────────────
async function handleOpenAi(res, body, options) {
    let parsed;
    try {
        parsed = (0, ai_router_core_1.parseOpenAiChatRequest)(body);
    }
    catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : "request inválida", "invalid_request");
        return;
    }
    const model = parsed.model ?? "default";
    const comboId = await resolveComboId(options.comboStore, parsed.model);
    const request = {
        comboId,
        messages: (0, ai_router_core_1.openAiMessagesToRouter)(parsed.messages),
        stream: parsed.stream ?? false,
        maxTokens: parsed.max_tokens,
        temperature: parsed.temperature,
    };
    if (!request.stream) {
        const result = await options.router.complete(request);
        json(res, 200, (0, ai_router_core_1.openAiCompletionResponse)(result, model));
        return;
    }
    sseHeaders(res);
    if (!options.router.completeStream) {
        sendError(res, 501, "streaming não suportado pelo router injetado", "streaming_unsupported");
        return;
    }
    try {
        const result = await options.router.completeStream(request, (chunk) => {
            if (chunk.restarting) {
                res.write((0, ai_router_core_1.sseData)((0, ai_router_core_1.openAiStreamChunk)("", model, false)));
            }
            else if (!chunk.done && chunk.deltaText) {
                res.write((0, ai_router_core_1.sseData)((0, ai_router_core_1.openAiStreamChunk)(chunk.deltaText, model, false)));
            }
        });
        res.write((0, ai_router_core_1.sseData)((0, ai_router_core_1.openAiStreamChunk)("", model, true, {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
        })));
        res.write((0, ai_router_core_1.sseDone)());
        res.end();
    }
    catch (err) {
        sseError(res, err);
    }
}
// ─────────────────────────────────────────────────────────────
// Anthropic Messages
// ─────────────────────────────────────────────────────────────
async function handleAnthropic(res, body, options) {
    let parsed;
    try {
        parsed = (0, ai_router_core_1.parseAnthropicMessagesRequest)(body);
    }
    catch (err) {
        sendError(res, 400, err instanceof Error ? err.message : "request inválida", "invalid_request");
        return;
    }
    const model = parsed.model ?? "default";
    const comboId = await resolveComboId(options.comboStore, parsed.model);
    const request = {
        comboId,
        messages: (0, ai_router_core_1.anthropicMessagesToRouter)(parsed),
        stream: parsed.stream ?? false,
        maxTokens: parsed.max_tokens,
        temperature: parsed.temperature,
    };
    if (!request.stream) {
        const result = await options.router.complete(request);
        json(res, 200, (0, ai_router_core_1.anthropicCompletionResponse)(result, model));
        return;
    }
    sseHeaders(res);
    if (!options.router.completeStream) {
        sendError(res, 501, "streaming não suportado pelo router injetado", "streaming_unsupported");
        return;
    }
    const events = (0, ai_router_core_1.anthropicStreamEvents)(model, `msg-${Date.now()}`);
    try {
        res.write((0, ai_router_core_1.sseEvent)("message_start", events.messageStart()));
        res.write((0, ai_router_core_1.sseEvent)("content_block_start", events.contentBlockStart()));
        const result = await options.router.completeStream(request, (chunk) => {
            if (chunk.restarting) {
                res.write((0, ai_router_core_1.sseEvent)("content_block_delta", events.contentBlockDelta("")));
            }
            else if (!chunk.done && chunk.deltaText) {
                res.write((0, ai_router_core_1.sseEvent)("content_block_delta", events.contentBlockDelta(chunk.deltaText)));
            }
        });
        res.write((0, ai_router_core_1.sseEvent)("content_block_stop", events.contentBlockStop()));
        res.write((0, ai_router_core_1.sseEvent)("message_delta", events.messageDelta({
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
        })));
        res.write((0, ai_router_core_1.sseEvent)("message_stop", events.messageStop()));
        res.end();
    }
    catch (err) {
        sseError(res, err);
    }
}
//# sourceMappingURL=server.js.map
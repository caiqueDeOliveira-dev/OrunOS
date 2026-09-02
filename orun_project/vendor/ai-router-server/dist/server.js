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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSettingsStore = void 0;
exports.createAiRouterServer = createAiRouterServer;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = require("node:http");
const node_url_1 = require("node:url");
const model_catalog_1 = require("./model-catalog");
const ai_router_core_1 = require("@orun/ai-router-core");
const MAX_BODY_BYTES = 1024 * 1024;
function log(entry) {
    console.log(JSON.stringify(entry));
}
const DEFAULT_BUDGET = { daily: 10, monthly: 200, alertThreshold: 80 };
class AppSettingsStore {
    db;
    stmtGet;
    stmtSet;
    stmtGetAll;
    stmtDelete;
    constructor(db) {
        this.db = db;
        this.db.exec(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))`);
        this.stmtGet = this.db.prepare("SELECT value FROM app_settings WHERE key = ?");
        this.stmtSet = this.db.prepare("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
        this.stmtGetAll = this.db.prepare("SELECT key, value FROM app_settings");
        this.stmtDelete = this.db.prepare("DELETE FROM app_settings WHERE key = ?");
    }
    async get(key) {
        const row = this.stmtGet.get(key);
        return row?.value ?? null;
    }
    async set(key, value) {
        this.stmtSet.run(key, value);
    }
    async delete(key) {
        this.stmtDelete.run(key);
    }
    async getAll() {
        const rows = this.stmtGetAll.all();
        return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    }
    async getTokenSaverConfig() {
        const raw = await this.get("tokenSaverConfig");
        return raw ? { ...ai_router_core_1.DEFAULT_TOKEN_SAVER_CONFIG, ...JSON.parse(raw) } : { ...ai_router_core_1.DEFAULT_TOKEN_SAVER_CONFIG };
    }
    async setTokenSaverConfig(config) {
        await this.set("tokenSaverConfig", JSON.stringify(config));
    }
    async getProxyPoolConfig() {
        const raw = await this.get("proxyPoolConfig");
        return raw ? { ...ai_router_core_1.DEFAULT_PROXY_POOL, ...JSON.parse(raw) } : { ...ai_router_core_1.DEFAULT_PROXY_POOL };
    }
    async setProxyPoolConfig(config) {
        await this.set("proxyPoolConfig", JSON.stringify(config));
    }
    async getBudget() {
        const raw = await this.get("budget");
        return raw ? { ...DEFAULT_BUDGET, ...JSON.parse(raw) } : { ...DEFAULT_BUDGET };
    }
    async setBudget(budget) {
        await this.set("budget", JSON.stringify(budget));
    }
}
exports.AppSettingsStore = AppSettingsStore;
// ─────────────────────────────────────────────────────────────
// Runtime state (loaded from AppSettingsStore on startup, updated in-place)
// ─────────────────────────────────────────────────────────────
let tokenSaverConfig = { ...ai_router_core_1.DEFAULT_TOKEN_SAVER_CONFIG };
let proxyPoolConfig = { ...ai_router_core_1.DEFAULT_PROXY_POOL };
let tunnelConfig = { enabled: false, provider: "none", port: 4321 };
let budgetConfig = { ...DEFAULT_BUDGET };
let settingsStore = null;
// ─────────────────────────────────────────────────────────────
// SSE log streaming
// ─────────────────────────────────────────────────────────────
const logStreams = new Set();
function broadcastLog(entry, requestId) {
    const payload = requestId ? { ...entry, requestId } : entry;
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const stream of logStreams) {
        stream.write(data);
    }
}
// ─────────────────────────────────────────────────────────────
// Dashboard file cache
// ─────────────────────────────────────────────────────────────
const indexHtmlCache = new Map();
async function getIndexHtml(indexPath) {
    const cached = indexHtmlCache.get(indexPath);
    if (cached)
        return cached;
    try {
        const content = await node_fs_1.default.promises.readFile(indexPath, "utf-8");
        indexHtmlCache.set(indexPath, content);
        return content;
    }
    catch {
        return null;
    }
}
function invalidateIndexHtmlCache(indexPath) {
    indexHtmlCache.delete(indexPath);
}
// ─────────────────────────────────────────────────────────────
// Security helpers
// ─────────────────────────────────────────────────────────────
function timingSafeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return node_crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function checkDashboardAuth(req, res, apiKey) {
    const url = new node_url_1.URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname === "/api/health" || url.pathname === "/api/health/detailed")
        return true;
    if (!apiKey)
        return true;
    const authHeader = req.headers.authorization;
    const xApiKey = req.headers["x-api-key"];
    const token = authHeader?.replace("Bearer ", "") ?? xApiKey;
    if (!token || !timingSafeEqual(typeof token === "string" ? token : token[0] ?? "", apiKey)) {
        log({ timestamp: new Date().toISOString(), level: "warn", message: "auth_failure", requestId: undefined, ip: req.socket?.remoteAddress });
        json(res, 401, { error: "Unauthorized" });
        return false;
    }
    return true;
}
function getCorsOrigin(req) {
    const origin = req.headers.origin;
    if (!origin)
        return "http://localhost:4321";
    try {
        const url = new node_url_1.URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
            return origin;
        }
    }
    catch { }
    return "http://localhost:4321";
}
const testRateLimit = new Map();
function checkTestRateLimit(ip) {
    const now = Date.now();
    const window = 60000;
    const maxRequests = 10;
    const timestamps = testRateLimit.get(ip) ?? [];
    const recent = timestamps.filter(t => now - t < window);
    if (recent.length >= maxRequests)
        return false;
    recent.push(now);
    testRateLimit.set(ip, recent);
    return true;
}
// ─────────────────────────────────────────────────────────────
// Pricing (per 1M tokens, approximate retail)
// ─────────────────────────────────────────────────────────────
const PRICING = {
    "openai": { input: 2.5, output: 10 },
    "anthropic": { input: 3, output: 15 },
    "groq": { input: 0.05, output: 0.1 },
    "deepseek": { input: 0.14, output: 0.28 },
    "gemini": { input: 0, output: 0 },
    "cerebras": { input: 0, output: 0 },
    "ollama": { input: 0, output: 0 },
};
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
    // Initialize AppSettingsStore if dbPath provided
    if (options.dbPath) {
        try {
            // Lazy-require better-sqlite3 (only needed when dbPath is set)
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const Database = require("better-sqlite3");
            const db = new Database(options.dbPath);
            db.pragma("journal_mode = WAL");
            settingsStore = new AppSettingsStore(db);
        }
        catch (err) {
            console.error("[server] Failed to initialize AppSettingsStore (better-sqlite3 not available?):", err);
            settingsStore = null;
        }
    }
    // Load persisted settings on startup
    void loadPersistedSettings();
    const server = (0, node_http_1.createServer)((req, res) => {
        const requestId = node_crypto_1.default.randomUUID();
        res.setHeader("X-Request-ID", requestId);
        const startTime = Date.now();
        const url = req.url ?? "/";
        const method = req.method ?? "GET";
        log({ timestamp: new Date(startTime).toISOString(), level: "info", message: "request_start", requestId, method, url });
        broadcastLog({ type: "request_start", method, url, timestamp: startTime }, requestId);
        res.on("finish", () => {
            const latencyMs = Date.now() - startTime;
            log({ timestamp: new Date().toISOString(), level: "info", message: "request_end", requestId, method, url, status: res.statusCode, latencyMs });
            broadcastLog({ type: "request_end", method, url, status: res.statusCode, latencyMs, timestamp: Date.now() }, requestId);
        });
        void handleRequest(req, res, options, requestId);
    });
    process.on("SIGTERM", () => {
        console.log("[server] SIGTERM received, shutting down gracefully...");
        server.close(() => {
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000);
    });
    process.on("SIGINT", () => {
        process.emit("SIGTERM");
    });
    const serverRef = server;
    serverRef.settingsStore = settingsStore ?? undefined;
    return serverRef;
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
// Persisted settings loader
// ─────────────────────────────────────────────────────────────
async function loadPersistedSettings() {
    if (!settingsStore)
        return;
    try {
        tokenSaverConfig = await settingsStore.getTokenSaverConfig();
        proxyPoolConfig = await settingsStore.getProxyPoolConfig();
        budgetConfig = await settingsStore.getBudget();
        log({ timestamp: new Date().toISOString(), level: "info", message: "persisted settings loaded", tokenSaverRtk: tokenSaverConfig.rtkEnabled, proxyPool: proxyPoolConfig.proxies?.length ?? 0, budget: budgetConfig.daily });
    }
    catch (err) {
        log({ timestamp: new Date().toISOString(), level: "warn", message: "failed to load persisted settings, using defaults", error: String(err) });
    }
}
async function checkBudgetExceeded(usageStore) {
    try {
        const now = Date.now();
        const dayStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
        const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
        const allEvents = await usageStore.listRecent(undefined, 10000);
        let dailyCost = 0;
        let monthlyCost = 0;
        for (const event of allEvents) {
            const cost = event.estimatedCostUsd ?? 0;
            if (event.timestamp >= dayStart)
                dailyCost += cost;
            if (event.timestamp >= monthStart)
                monthlyCost += cost;
        }
        return dailyCost >= budgetConfig.daily || monthlyCost >= budgetConfig.monthly;
    }
    catch {
        // Fail-open: if we can't check budget, allow the request
        return false;
    }
}
// ─────────────────────────────────────────────────────────────
// Roteamento
// ─────────────────────────────────────────────────────────────
async function handleRequest(req, res, options, requestId) {
    try {
        const url = new node_url_1.URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const path = url.pathname;
        if (req.url?.startsWith("/api/") && !checkDashboardAuth(req, res, options.apiKey))
            return;
        if (path === "/health") {
            json(res, 200, { ok: true, service: "orun-ai-router", time: Date.now() });
            return;
        }
        // ── Dashboard API (api/*) ──────────────────────────────────
        if (path.startsWith("/api/")) {
            await handleDashboardApi(req, res, path, options, requestId);
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
                log({ timestamp: new Date().toISOString(), level: "warn", message: "auth_failure", requestId, ip: req.socket.remoteAddress });
                sendError(res, 401, "API key inválida ou ausente", "invalid_api_key");
                return;
            }
        }
        // ── Budget check (before /v1/ inference routes) ──
        if (path.startsWith("/v1/") && req.method === "POST" && options.usageStore) {
            const overBudget = await checkBudgetExceeded(options.usageStore);
            if (overBudget) {
                log({ timestamp: new Date().toISOString(), level: "warn", message: "budget_exceeded", requestId, path });
                sendError(res, 429, "Budget exceeded. Daily or monthly spending limit reached.", "budget_exceeded");
                return;
            }
        }
        if (req.method === "GET" && path === "/v1/models") {
            const combos = await options.comboStore.listCombos();
            const timestamp = Math.floor(Date.now() / 1000);
            json(res, 200, {
                object: "list",
                data: combos.map((c) => ({
                    id: c.id,
                    object: "model",
                    created: timestamp,
                    owned_by: "orun-router",
                    capabilities: c.kind === "media" ? ["media"] : ["chat"],
                    models: c.steps.map((s) => s.model),
                })),
            });
            return;
        }
        if (req.method === "POST" && path === "/v1/embeddings") {
            await handleEmbeddings(req, res, options);
            return;
        }
        if (req.method === "POST" && path === "/v1/images/generations") {
            await handleImageGeneration(req, res, options);
            return;
        }
        if (req.method === "POST" && path === "/v1/audio/speech") {
            await handleAudioSpeech(req, res, options);
            return;
        }
        if (req.method === "POST" && path === "/v1/audio/transcriptions") {
            await handleAudioTranscription(req, res, options);
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
                await handleOpenAi(res, body, options, requestId);
            }
            else {
                await handleAnthropic(res, body, options, requestId);
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
async function handleDashboardApi(req, res, path, options, requestId) {
    const method = req.method ?? "GET";
    // CORS: set headers for all API responses
    const corsOrigin = getCorsOrigin(req);
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    // ── /api/health (basic) ──
    if (method === "GET" && path === "/api/health") {
        const combos = await options.comboStore.listCombos();
        const def = combos.find((c) => c.isSystemDefault);
        json(res, 200, {
            ok: true,
            defaultComboId: options.meta?.defaultComboId ?? def?.id ?? null,
            combosCount: combos.length,
            hasProviderConfig: !!options.providerConfigStore,
            hasUsageLog: !!options.usageStore,
        });
        return;
    }
    // ── /api/health/detailed ──
    if (method === "GET" && path === "/api/health/detailed") {
        const uptime = process.uptime();
        const combosCount = options.comboStore ? (await options.comboStore.listCombos()).length : 0;
        const providers = options.providerConfigStore ? await options.providerConfigStore.listConfigs() : [];
        const circuits = "getAllCircuitStates" in options.router
            ? options.router.getAllCircuitStates()
            : [];
        const providerDetails = providers.map(p => {
            const circuit = circuits.find((c) => c.providerId?.startsWith(p.providerId));
            return {
                providerId: p.providerId,
                enabled: p.enabled,
                hasCredential: p.hasCredential,
                circuitState: circuit?.state ?? "closed",
                recentErrors: circuit?.errors ?? 0,
                cooldownUntil: circuit?.until ?? null,
            };
        });
        json(res, 200, {
            ok: true,
            defaultComboId: options.meta?.defaultComboId ?? null,
            combosCount,
            providersCount: providers.length,
            enabledProviders: providers.filter(p => p.enabled).length,
            hasProviderConfig: !!options.providerConfigStore,
            hasUsageLog: !!options.usageStore,
            uptime,
            providers: providerDetails,
            circuits: circuits,
            budget: budgetConfig,
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
    // ── /api/models ──
// Catalogo de modelos por provider p/ o seletor de combo (tag free/paid).
    if (path === "/api/models" && method === "GET") {
        const catalog = {};
        for (const [pid, models] of Object.entries(model_catalog_1.MODEL_CATALOG)) {
            catalog[pid] = models.map((m) => ({ id: m.id, tier: m.tier }));
        }
        json(res, 200, { catalog, providers: Object.keys(catalog) });
        return;
    }
// ── /api/providers/:id/credentials ──
    // Credenciais de provider (API keys) gerenciadas pelo PRÓPRIO router via
    // `credentialStore` (keystore criptografado, ex.: provider_credentials no
    // ai-router.sqlite). Exige auth do dashboard quando apiKey está definida.
    const credsMatch = path.match(/^\/api\/providers\/(.+)\/credentials$/);
    if (credsMatch && options.credentialStore) {
        const id = decodeURIComponent(credsMatch[1]);
        if (method === "GET") {
            const status = await options.credentialStore.has(id, "default");
            json(res, 200, { providerId: id, hasCredential: status });
            return;
        }
        if (method === "PUT" || method === "POST") {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            if (!body || typeof body.apiKey !== "string" || !body.apiKey.trim()) {
                json(res, 400, { ok: false, error: "apiKey é obrigatória" });
                return;
            }
            const saved = await options.credentialStore.set(id, body.apiKey, body.accountLabel ?? "default");
            json(res, 200, { ok: saved, providerId: id, accountLabel: body.accountLabel ?? "default" });
            return;
        }
        if (method === "DELETE") {
            await options.credentialStore.delete(id, "default");
            json(res, 200, { ok: true });
            return;
        }
    }
    // ── /api/accounts/exhausted ──
    // Contas em cooldown de 429/quota (exaustão por conta, não por provider).
    if (path === "/api/accounts/exhausted" && method === "GET" && options.router?.accountRotator) {
        const list = typeof options.router.accountRotator.listExhausted === "function"
            ? options.router.accountRotator.listExhausted()
            : [];
        json(res, 200, { accounts: list, count: list.length });
        return;
    }
    // ── /api/providers/:id ──
    const providerMatch = path.match(/^\/api\/providers\/(.+)$/);
    if (providerMatch && options.providerConfigStore) {
        const id = decodeURIComponent(providerMatch[1]);
        if (method === "DELETE") {
            await options.providerConfigStore.deleteConfig(id);
            json(res, 200, { ok: true });
            return;
        }
        if (method === "PUT") {
            const raw = await readBody(req);
            const body = JSON.parse(raw);
            const saved = await options.providerConfigStore.saveConfig({ ...body, providerId: id });
            json(res, 200, saved);
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
    if (path === "/api/test" && method === "POST") {
        const clientIp = req.socket.remoteAddress ?? "unknown";
        if (!checkTestRateLimit(clientIp)) {
            log({ timestamp: new Date().toISOString(), level: "warn", message: "rate_limited", requestId, ip: clientIp });
            json(res, 429, { error: "Rate limit exceeded. Max 10 requests per minute." });
            return;
        }
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        const { comboId, message } = body;
        if (options.router) {
            try {
                const startTime = Date.now();
                const result = await options.router.complete({
                    comboId,
                    messages: [{ role: "user", content: message ?? "Say 'hello' in one word." }],
                    stream: false,
                });
                const latencyMs = Date.now() - startTime;
                json(res, 200, {
                    text: result.content,
                    providerId: result.providerId,
                    model: result.model,
                    latencyMs,
                    promptTokens: result.usage?.promptTokens ?? 0,
                    completionTokens: result.usage?.completionTokens ?? 0,
                });
            }
            catch (e) {
                json(res, 200, {
                    text: null,
                    providerId: null,
                    model: null,
                    latencyMs: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    error: e.message ?? String(e),
                });
            }
            return;
        }
    }
    // ── /api/logs/stream (SSE) ──
    if (path === "/api/logs/stream" && method === "GET") {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": getCorsOrigin(req),
        });
        const heartbeat = setInterval(() => {
            res.write(": heartbeat\n\n");
        }, 15000);
        logStreams.add(res);
        req.on("close", () => {
            clearInterval(heartbeat);
            logStreams.delete(res);
        });
        return;
    }
    // ── /api/savings ──
    if (path === "/api/savings" && method === "GET") {
        if (options.usageStore) {
            const events = await options.usageStore.listRecent(undefined, 1000);
            let totalCost = 0;
            let estimatedRetailCost = 0;
            for (const event of events) {
                const pricing = PRICING[event.providerId] ?? { input: 2.5, output: 10 };
                totalCost += event.estimatedCostUsd ?? 0;
                estimatedRetailCost += (event.promptTokens * pricing.input + event.completionTokens * pricing.output) / 1_000_000;
            }
            json(res, 200, {
                totalCost,
                estimatedRetailCost,
                savings: estimatedRetailCost - totalCost,
                savingsPercent: estimatedRetailCost > 0 ? Math.round(((estimatedRetailCost - totalCost) / estimatedRetailCost) * 100) : 0,
                requestCount: events.length,
            });
            return;
        }
    }
    // ── /api/token-saver ──
    if (path === "/api/token-saver" && method === "GET") {
        json(res, 200, tokenSaverConfig);
        return;
    }
    if (path === "/api/token-saver" && method === "PUT") {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        tokenSaverConfig = { ...ai_router_core_1.DEFAULT_TOKEN_SAVER_CONFIG, ...body };
        if (settingsStore) {
            void settingsStore.setTokenSaverConfig(tokenSaverConfig).catch(err => log({ timestamp: new Date().toISOString(), level: "error", message: "failed to persist tokenSaverConfig", error: String(err) }));
        }
        json(res, 200, tokenSaverConfig);
        return;
    }
    // ── /api/proxy-pool ──
    if (path === "/api/proxy-pool" && method === "GET") {
        json(res, 200, proxyPoolConfig);
        return;
    }
    if (path === "/api/proxy-pool" && method === "PUT") {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        proxyPoolConfig = { ...ai_router_core_1.DEFAULT_PROXY_POOL, ...body };
        if (settingsStore) {
            void settingsStore.setProxyPoolConfig(proxyPoolConfig).catch(err => log({ timestamp: new Date().toISOString(), level: "error", message: "failed to persist proxyPoolConfig", error: String(err) }));
        }
        json(res, 200, proxyPoolConfig);
        return;
    }
    // ── /api/budget ──
    if (path === "/api/budget" && method === "GET") {
        json(res, 200, budgetConfig);
        return;
    }
    if (path === "/api/budget" && method === "PUT") {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        budgetConfig = {
            daily: typeof body.daily === "number" ? body.daily : budgetConfig.daily,
            monthly: typeof body.monthly === "number" ? body.monthly : budgetConfig.monthly,
            alertThreshold: typeof body.alertThreshold === "number" ? body.alertThreshold : budgetConfig.alertThreshold,
        };
        if (settingsStore) {
            void settingsStore.setBudget(budgetConfig).catch(err => log({ timestamp: new Date().toISOString(), level: "error", message: "failed to persist budget", error: String(err) }));
        }
        json(res, 200, budgetConfig);
        return;
    }
    // ── /api/tunnel ──
    if (path === "/api/tunnel" && method === "GET") {
        const status = (0, ai_router_core_1.getTunnelStatus)();
        json(res, 200, { ...tunnelConfig, status });
        return;
    }
    if (path === "/api/tunnel" && method === "POST") {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        if (body.subdomain) {
            body.subdomain = body.subdomain.replace(/[^a-z0-9-]/g, "").slice(0, 63);
        }
        tunnelConfig = { ...tunnelConfig, ...body };
        if (body.action === "start") {
            const result = await (0, ai_router_core_1.startTunnel)(tunnelConfig);
            json(res, 200, { ok: !!result, url: result?.url ?? null });
        }
        else if (body.action === "stop") {
            (0, ai_router_core_1.stopTunnel)();
            json(res, 200, { ok: true });
        }
        else {
            json(res, 200, { ok: true });
        }
        return;
    }
    // ── /api/translate ──
    if (path === "/api/translate" && method === "POST") {
        const raw = await readBody(req);
        const body = JSON.parse(raw);
        const { messages, system, targetFormat } = body;
        const result = (0, ai_router_core_1.translateRequest)(messages ?? [], system, targetFormat ?? "openai");
        json(res, 200, result);
        return;
    }
    // ── /api/backup (download SQLite database) ──
    if (path === "/api/backup" && method === "GET") {
        if (options.dbPath && node_fs_1.default.existsSync(options.dbPath)) {
            const dbBuffer = node_fs_1.default.readFileSync(options.dbPath);
            res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="orun-router-backup-${new Date().toISOString().slice(0, 10)}.db"`,
                "Content-Length": dbBuffer.length,
            });
            res.end(dbBuffer);
        }
        else {
            json(res, 404, { error: "Database file not found" });
        }
        return;
    }
    // ── /api/metrics (Prometheus) ──
    if (path === "/api/metrics" && method === "GET") {
        const usage = options.usageStore ? await options.usageStore.listRecent(undefined, 10000) : [];
        const totalRequests = usage.length;
        const totalTokens = usage.reduce((sum, e) => sum + (e.promptTokens ?? 0) + (e.completionTokens ?? 0), 0);
        const totalCost = usage.reduce((sum, e) => sum + (e.estimatedCostUsd ?? 0), 0);
        const errorCount = usage.filter(e => !e.success).length;
        const byProvider = {};
        for (const e of usage) {
            const p = e.providerId ?? "unknown";
            if (!byProvider[p])
                byProvider[p] = { requests: 0, tokens: 0, cost: 0 };
            byProvider[p].requests++;
            byProvider[p].tokens += (e.promptTokens ?? 0) + (e.completionTokens ?? 0);
            byProvider[p].cost += e.estimatedCostUsd ?? 0;
        }
        const latencies = usage.map(e => e.latencyMs ?? 0).sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;
        const metrics = [
            "# HELP orun_router_requests_total Total requests",
            "# TYPE orun_router_requests_total counter",
            `orun_router_requests_total ${totalRequests}`,
            "",
            "# HELP orun_router_tokens_total Total tokens processed",
            "# TYPE orun_router_tokens_total counter",
            `orun_router_tokens_total ${totalTokens}`,
            "",
            "# HELP orun_router_cost_usd Total estimated cost in USD",
            "# TYPE orun_router_cost_usd counter",
            `orun_router_cost_usd ${totalCost}`,
            "",
            "# HELP orun_router_errors_total Total errors",
            "# TYPE orun_router_errors_total counter",
            `orun_router_errors_total ${errorCount}`,
            "",
            "# HELP orun_router_latency_seconds Request latency",
            "# TYPE orun_router_latency_seconds summary",
            `orun_router_latency_seconds{quantile="0.5"} ${p50 / 1000}`,
            `orun_router_latency_seconds{quantile="0.95"} ${p95 / 1000}`,
            `orun_router_latency_seconds{quantile="0.99"} ${p99 / 1000}`,
            "",
            "# HELP orun_router_requests_by_provider Requests per provider",
            "# TYPE orun_router_requests_by_provider gauge",
            ...Object.entries(byProvider).map(([p, v]) => `orun_router_requests_by_provider{provider="${p}"} ${v.requests}`),
        ].join("\n");
        res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
        res.end(metrics);
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
        const { join } = await Promise.resolve().then(() => __importStar(require("node:path")));
        const filePath = join(options.dashboardDir, assetPath);
        const { existsSync } = await Promise.resolve().then(() => __importStar(require("node:fs")));
        if (existsSync(filePath)) {
            if (ext === ".html") {
                // Use cached version for index.html
                const html = await getIndexHtml(filePath);
                if (html) {
                    res.writeHead(200, { "content-type": mime, "cache-control": "no-cache" });
                    res.end(html);
                    return;
                }
            }
            else {
                const content = await node_fs_1.default.promises.readFile(filePath);
                res.writeHead(200, { "content-type": mime, "cache-control": "public, max-age=31536000" });
                res.end(content);
                return;
            }
        }
        // SPA fallback: serve index.html for any non-file path
        const indexPath = join(options.dashboardDir, "index.html");
        const html = await getIndexHtml(indexPath);
        if (html) {
            res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
            res.end(html);
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
async function handleOpenAi(res, body, options, requestId) {
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
        ...(parsed.tools ? { tools: parsed.tools } : {}),
        ...(parsed.tool_choice ? { tool_choice: parsed.tool_choice } : {}),
        ...(proxyPoolConfig.enabled ? { proxyPool: proxyPoolConfig } : {}),
    };
    if (!request.stream) {
        const startMs = Date.now();
        try {
            const result = await options.router.complete(request);
            const latencyMs = Date.now() - startMs;
            log({ timestamp: new Date().toISOString(), level: "info", message: "request_end", requestId, provider: result.providerId, model: result.model, latencyMs, status: 200, comboId });
            broadcastLog({ type: "provider_call", provider: result.providerId, model: result.model, latencyMs, requestId }, requestId);
            json(res, 200, (0, ai_router_core_1.openAiCompletionResponse)(result, model));
        }
        catch (err) {
            const latencyMs = Date.now() - startMs;
            const message = err instanceof Error ? err.message : "erro desconhecido";
            log({ timestamp: new Date().toISOString(), level: "error", message: "request_error", requestId, comboId, error: message, latencyMs });
            broadcastLog({ type: "provider_error", error: message, requestId }, requestId);
            sendError(res, 500, message, "provider_error");
        }
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
        }, result.tool_calls)));
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
async function handleAnthropic(res, body, options, requestId) {
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
        ...(parsed.tools ? { tools: parsed.tools } : {}),
        ...(parsed.tool_choice ? { tool_choice: parsed.tool_choice } : {}),
        ...(proxyPoolConfig.enabled ? { proxyPool: proxyPoolConfig } : {}),
    };
    if (!request.stream) {
        const startMs = Date.now();
        try {
            const result = await options.router.complete(request);
            const latencyMs = Date.now() - startMs;
            log({ timestamp: new Date().toISOString(), level: "info", message: "request_end", requestId, provider: result.providerId, model: result.model, latencyMs, status: 200, comboId });
            broadcastLog({ type: "provider_call", provider: result.providerId, model: result.model, latencyMs, requestId }, requestId);
            json(res, 200, (0, ai_router_core_1.anthropicCompletionResponse)(result, model));
        }
        catch (err) {
            const latencyMs = Date.now() - startMs;
            const message = err instanceof Error ? err.message : "erro desconhecido";
            log({ timestamp: new Date().toISOString(), level: "error", message: "request_error", requestId, comboId, error: message, latencyMs });
            broadcastLog({ type: "provider_error", error: message, requestId }, requestId);
            sendError(res, 500, message, "provider_error");
        }
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
// ─────────────────────────────────────────────────────────────
// Embeddings
// ─────────────────────────────────────────────────────────────
async function handleEmbeddings(req, res, options) {
    if (!options.mediaRouter) {
        sendError(res, 501, "MediaRouter não configurado. Configure mediaRouter para usar /v1/embeddings.", "not_configured");
        return;
    }
    const raw = await readBody(req);
    let body;
    try {
        body = raw.trim() === "" ? {} : JSON.parse(raw);
    }
    catch {
        sendError(res, 400, "JSON inválido no corpo da request", "invalid_json");
        return;
    }
    const { input, model, encoding_format } = body;
    if (!input) {
        sendError(res, 400, "Campo 'input' é obrigatório", "invalid_request");
        return;
    }
    const texts = Array.isArray(input) ? input : [input];
    const comboId = model ?? "default";
    try {
        const embeddings = [];
        for (let i = 0; i < texts.length; i++) {
            const result = await options.mediaRouter.complete({
                comboId,
                kind: "embeddings",
                prompt: texts[i],
                options: encoding_format ? { encoding_format } : undefined,
            });
            if (result.embedding) {
                embeddings.push({
                    object: "embedding",
                    embedding: result.embedding,
                    index: i,
                });
            }
        }
        json(res, 200, {
            object: "list",
            data: embeddings,
            model: model ?? comboId,
            usage: { prompt_tokens: 0, total_tokens: 0 },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "erro ao gerar embeddings";
        sendError(res, 500, message, "embedding_error");
    }
}
// ─────────────────────────────────────────────────────────────
// Image Generation (placeholder)
// ─────────────────────────────────────────────────────────────
async function handleImageGeneration(_req, res, _options) {
    json(res, 501, {
        error: "Endpoint not yet implemented. Use the MediaRouter directly for image generation.",
    });
}
// ─────────────────────────────────────────────────────────────
// Audio Speech / TTS (placeholder)
// ─────────────────────────────────────────────────────────────
async function handleAudioSpeech(_req, res, _options) {
    json(res, 501, {
        error: "Endpoint not yet implemented. Use the MediaRouter directly for audio TTS.",
    });
}
// ─────────────────────────────────────────────────────────────
// Audio Transcription / STT (placeholder)
// ─────────────────────────────────────────────────────────────
async function handleAudioTranscription(_req, res, _options) {
    json(res, 501, {
        error: "Endpoint not yet implemented. Use the MediaRouter directly for audio transcription.",
    });
}
//# sourceMappingURL=server.js.map
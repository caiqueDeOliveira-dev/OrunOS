// electron/ipc/ai-router-handlers.cjs
// IPC surface for the Orun Router: combos, usage log, completions (non-stream
// and stream), plus opt-in local HTTP server control.

const log = require("electron-log");
const {
  getAiRouterService,
  getDefaultComboId,
  startHttpServer,
  stopHttpServer,
  httpServerStatus,
} = require("../ai-router-service.cjs");

function register(ipcMain, ctx) {
  const { app, secretStore } = ctx;

  ipcMain.handle("ai-router:health", () => {
    const s = getAiRouterService(app, secretStore);
    return {
      ok: true,
      db: s.dbPath,
      defaultComboId: getDefaultComboId(),
      http: httpServerStatus(),
    };
  });

  ipcMain.handle("ai-router:list-combos", async () => {
    const { comboStore } = getAiRouterService(app, secretStore);
    return comboStore.listCombos();
  });

  ipcMain.handle("ai-router:list-providers", async () => {
    const { PROVIDER_REGISTRY } = require("@orun/ai-router-core");
    const { providerConfigStore } = getAiRouterService(app, secretStore);
    let configs = [];
    try { configs = await providerConfigStore.listConfigs(); } catch (e) { log.warn("[ai-router:list-providers] configs:", e.message); }
    const configById = {};
    for (const c of configs) configById[c.id] = c;
    const keys = secretStore.readSecretStore();
    const mask = (k) => (k && k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k ? "••••" : null);
    return Object.values(PROVIDER_REGISTRY)
      .filter((p) => p && p.id)
      .map((p) => {
        const explicit = keys[`ai-router.${p.id}`];
        const rawKey = typeof explicit === "string" && explicit.trim()
          ? explicit.trim()
          : (secretStore.getProviderApiKeys(p.id)[0] || null);
        const cfg = configById[p.id];
        return {
          id: p.id,
          label: p.label,
          tier: p.tier,
          authMethod: p.authMethod,
          baseUrl: p.baseUrl,
          requiresLocalRuntime: Boolean(p.requiresLocalRuntime),
          hasKey: Boolean(rawKey),
          keyMasked: mask(rawKey),
          configured: Boolean(cfg),
          configModelCount: (cfg && (cfg.modelIds?.length || cfg.models?.length)) || 0,
        };
      })
      .sort((a, b) => Number(b.hasKey) - Number(a.hasKey) || a.label.localeCompare(b.label));
  });

  ipcMain.handle("ai-router:get-combo", async (_event, comboId) => {
    const { comboStore } = getAiRouterService(app, secretStore);
    return comboStore.getCombo(comboId);
  });

  ipcMain.handle("ai-router:save-combo", async (_event, combo) => {
    const { comboStore } = getAiRouterService(app, secretStore);
    await comboStore.saveCombo(combo);
    return { ok: true };
  });

  ipcMain.handle("ai-router:delete-combo", async (_event, comboId) => {
    const { comboStore } = getAiRouterService(app, secretStore);
    await comboStore.deleteCombo(comboId);
    return { ok: true };
  });

  ipcMain.handle("ai-router:usage-recent", async (_event, { comboId, limit } = {}) => {
    const { usageLogStore } = getAiRouterService(app, secretStore);
    return usageLogStore.listRecent(comboId, limit ?? 50);
  });

  ipcMain.handle("ai-router:complete", async (_event, request) => {
    const { router } = getAiRouterService(app, secretStore);
    return router.complete({ ...request, stream: false });
  });

  ipcMain.on("ai-router:stream", async (event, { requestId, request }) => {
    const sender = event.sender;
    const send = (channel, payload) => { if (!sender.isDestroyed()) sender.send(channel, payload); };
    const { router } = getAiRouterService(app, secretStore);
    const onChunk = (chunk) => send(`ai-router:stream:chunk:${requestId}`, chunk);
    log.info(`[ai-router:stream] combo=${request?.comboId} messages=${request?.messages?.length}`);
    try {
      const result = await router.completeStream({ ...request, stream: true }, onChunk);
      send(`ai-router:stream:done:${requestId}`, result);
    } catch (err) {
      log.error("[ai-router:stream] failed:", err.message);
      send(`ai-router:stream:error:${requestId}`, err.message);
    }
  });

  ipcMain.handle("ai-router:http-status", () => httpServerStatus());

  ipcMain.handle("ai-router:http-start", async () => {
    if (process.env.ORUN_AI_ROUTER_HTTP !== "1") {
      return { ok: false, reason: 'set ORUN_AI_ROUTER_HTTP=1 to enable the local router server' };
    }
    try {
      return startHttpServer(app, secretStore);
    } catch (err) {
      log.error("[ai-router:http-start] failed:", err.message);
      return { ok: false, reason: err.message };
    }
  });

  ipcMain.handle("ai-router:http-stop", () => stopHttpServer());
}

module.exports = { register };

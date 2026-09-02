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

  // Combos mesclados: internos (SQLite do desktop) + externos (router externo 4321),
  // dedup por id com tag de origem. Cada combo roda no seu próprio runtime:
  //  - source "internal" → executa no ModelRouter embutido do desktop (offline)
  //  - source "external" → roteia pelo provider `orun-router` (127.0.0.1:4321)
  ipcMain.handle("ai-router:list-combos-merged", async () => {
    const { comboStore } = getAiRouterService(app, secretStore);
    const internal = [];
    try {
      const raw = await comboStore.listCombos();
      for (const c of raw || []) internal.push({ ...c, id: c.id, source: "internal" });
    } catch (e) { log.warn("[ai-router:list-combos-merged] internal:", e.message); }

    const external = [];
    try {
      const res = await fetch("http://127.0.0.1:4321/api/combos", { timeout: 3000 });
      if (res.ok) {
        const raw = await res.json();
        for (const c of raw || []) external.push({ ...c, id: c.id, source: "external" });
      }
    } catch (e) { log.warn("[ai-router:list-combos-merged] external (router 4321 offline?):", e.message); }

    const seen = new Set();
    const merged = [];
    for (const c of [...internal, ...external]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      merged.push(c);
    }
    return merged;
  });

  ipcMain.handle("ai-router:list-providers", async () => {
    const { PROVIDER_REGISTRY } = require("@orun/ai-router-core");
    const { providerConfigStore, keystore } = getAiRouterService(app, secretStore);
    let configs = [];
    try { configs = await providerConfigStore.listConfigs(); } catch (e) { log.warn("[ai-router:list-providers] configs:", e.message); }
    const configById = {};
    for (const c of configs) configById[c.id] = c;
    const creds = await keystore.list();
    const credByProvider = new Set(creds.map((c) => c.providerId));
    const mask = (k) => (k && k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : k ? "••••" : null);
    return Promise.all(
      Object.values(PROVIDER_REGISTRY)
        .filter((p) => p && p.id)
        .map(async (p) => {
          const rawKey = credByProvider.has(p.id) ? await keystore.get(p.id, "default") : null;
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
    ).then((providers) =>
      providers.sort((a, b) => Number(b.hasKey) - Number(a.hasKey) || a.label.localeCompare(b.label))
    );
  });

  ipcMain.handle("ai-router:set-credential", async (_event, { providerId, accountLabel, apiKey } = {}) => {
    if (!providerId || !apiKey) return { ok: false, error: "providerId e apiKey são obrigatórios" };
    try {
      const { keystore } = getAiRouterService(app, secretStore);
      const ok = await keystore.set(providerId, apiKey, accountLabel || "default");
      return { ok, providerId, accountLabel: accountLabel || "default" };
    } catch (err) {
      log.error("[ai-router:set-credential] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("ai-router:delete-credential", async (_event, { providerId, accountLabel } = {}) => {
    if (!providerId) return { ok: false, error: "providerId é obrigatório" };
    try {
      const { keystore } = getAiRouterService(app, secretStore);
      await keystore.delete(providerId, accountLabel || "default");
      return { ok: true };
    } catch (err) {
      log.error("[ai-router:delete-credential] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("ai-router:credential-status", async () => {
    try {
      const { keystore } = getAiRouterService(app, secretStore);
      const creds = await keystore.list();
      return creds.map((c) => ({ providerId: c.providerId, accountLabel: c.accountLabel }));
    } catch (err) {
      log.error("[ai-router:credential-status] failed:", err.message);
      return [];
    }
  });

  ipcMain.handle("ai-router:save-provider", async (_event, config) => {
    if (!config || !config.providerId) return { ok: false, error: "config.providerId é obrigatório" };
    try {
      const { providerConfigStore } = getAiRouterService(app, secretStore);
      await providerConfigStore.saveConfig(config);
      return { ok: true };
    } catch (err) {
      log.error("[ai-router:save-provider] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("ai-router:delete-provider", async (_event, providerId) => {
    if (!providerId) return { ok: false, error: "providerId é obrigatório" };
    try {
      const { providerConfigStore } = getAiRouterService(app, secretStore);
      await providerConfigStore.deleteConfig(providerId);
      return { ok: true };
    } catch (err) {
      log.error("[ai-router:delete-provider] failed:", err.message);
      return { ok: false, error: err.message };
    }
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

  // Executa um combo no runtime do seu dono:
  //  - source "internal" → ModelRouter embutido do desktop (roda offline)
  //  - source "external" → router externo 127.0.0.1:4321 (/v1/chat/completions, model=comboId)
  ipcMain.handle("ai-router:complete-combo", async (_event, { comboId, source, messages }) => {
    if (!comboId || !messages || !messages.length) return { ok: false, error: "comboId e messages são obrigatórios" };
    try {
      if (source === "external") {
        const resp = await fetch("http://127.0.0.1:4321/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: comboId, messages, stream: false }),
          signal: AbortSignal.timeout(120000),
        });
        if (!resp.ok) return { ok: false, error: `router externo respondeu ${resp.status}` };
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content ?? "";
        return { ok: true, text, providerId: data?.model ?? comboId, model: comboId };
      }
      const { router } = getAiRouterService(app, secretStore);
      const result = await router.complete({ comboId, messages, stream: false });
      return { ok: true, text: result?.content ?? result?.text ?? "", providerId: result?.providerId, model: result?.model ?? comboId };
    } catch (err) {
      log.error("[ai-router:complete-combo] failed:", err.message);
      return { ok: false, error: err.message };
    }
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

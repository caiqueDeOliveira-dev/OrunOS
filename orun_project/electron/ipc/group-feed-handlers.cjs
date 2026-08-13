// electron/ipc/group-feed-handlers.cjs
// IPC do painel "Grupos": feed ao vivo + watchlist + robô de promoções.

function register(ipcMain, ctx) {
  const { log } = ctx;

  function watcher() {
    return ctx.groupWatcher;
  }

  ipcMain.handle("group-feed:get-state", () => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    return w.getState();
  });

  ipcMain.handle("group-feed:get-settings", () => {
    const w = watcher();
    if (!w) return { settings: null };
    return { settings: w.getSettings() };
  });

  ipcMain.handle("group-feed:set-settings", (_event, patch) => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    if (patch?.deals && typeof patch.deals === "object") {
      const s = w.getSettings();
      patch = { ...patch, deals: { ...s.deals, ...patch.deals } };
    }
    const settings = w.updateSettings(patch || {});
    w.setDealsSchedule?.(settings);
    return { settings };
  });

  ipcMain.handle("group-feed:watchlist-add", (_event, term) => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    const item = w.addWatchlistTerm(term);
    if (!item) return { error: "termo inválido" };
    return { item, settings: w.getSettings() };
  });

  ipcMain.handle("group-feed:watchlist-remove", (_event, id) => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    w.removeWatchlistTerm(id);
    return { settings: w.getSettings() };
  });

  ipcMain.handle("group-feed:watchlist-toggle", (_event, id, enabled) => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    w.toggleWatchlistTerm(id, Boolean(enabled));
    return { settings: w.getSettings() };
  });

  ipcMain.handle("group-feed:clear-history", () => {
    const w = watcher();
    if (!w) return { error: "group-watcher indisponível" };
    w.clearHistory();
    return { ok: true };
  });

  ipcMain.handle("group-feed:deals-run", async () => {
    const w = watcher();
    if (!w) return { ok: false, error: "group-watcher indisponível" };
    try {
      const result = await w.runDealsScan();
      return { ok: true, ...result };
    } catch (err) {
      log.warn("[group-feed] deals scan falhou:", err.message);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { register };

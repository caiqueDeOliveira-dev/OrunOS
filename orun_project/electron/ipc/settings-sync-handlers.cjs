// electron/ipc/settings-sync-handlers.cjs
// Handlers IPC para o @orun/sync (sincronizacao de settings entre devices).

const logger = require("../logger.cjs");

function register(ipcMain, ctx) {
  const { settingsBridge } = ctx;

  ipcMain.handle("settings-sync:init", async () => {
    if (!settingsBridge) return { ok: false, error: "settings-bridge nao disponivel" };
    try {
      const engine = settingsBridge.getSyncEngine();
      if (engine) return { ok: true, status: "already-initialized" };
      // initSync e chamado no main.cjs apos o Supabase client estar pronto
      return { ok: false, error: "sync engine ainda nao foi criado. Chame initSync() no main.cjs." };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("settings-sync:status", () => {
    if (!settingsBridge) return { active: false };
    const engine = settingsBridge.getSyncEngine();
    if (!engine) return { active: false };
    return {
      active: true,
      pendingPaths: engine.getPendingPushPaths(),
      conflicts: engine.getConflicts(),
    };
  });

  ipcMain.handle("settings-sync:resolve-conflict", async (_event, pathStr, resolution) => {
    if (!settingsBridge) return { ok: false, error: "bridge indisponivel" };
    const engine = settingsBridge.getSyncEngine();
    if (!engine) return { ok: false, error: "sync engine nao inicializado" };
    try {
      await engine.resolveConflict(pathStr, resolution);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("settings-sync:retry", async () => {
    if (!settingsBridge) return { ok: false, error: "bridge indisponivel" };
    const engine = settingsBridge.getSyncEngine();
    if (!engine) return { ok: false, error: "sync engine nao inicializado" };
    try {
      await engine.retryPendingPushes();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("settings-sync:conflicts", () => {
    if (!settingsBridge) return [];
    const engine = settingsBridge.getSyncEngine();
    if (!engine) return [];
    return engine.getConflicts();
  });

  ipcMain.handle("settings-sync:pending", () => {
    if (!settingsBridge) return [];
    const engine = settingsBridge.getSyncEngine();
    if (!engine) return [];
    return engine.getPendingPushPaths();
  });
}

module.exports = { register };

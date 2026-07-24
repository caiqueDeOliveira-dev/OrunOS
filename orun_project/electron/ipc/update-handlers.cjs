// electron/ipc/update-handlers.cjs
// App update and window control handlers.

const log = require("electron-log");

function register(ipcMain, ctx) {
  // Window controls (frameless window) — use ctx.mainWindow getter, not destructuring
  ipcMain.handle("window:minimize", () => { ctx.mainWindow?.minimize(); return true; });
  ipcMain.handle("window:maximize", () => {
    if (ctx.mainWindow?.isMaximized()) ctx.mainWindow.unmaximize();
    else ctx.mainWindow?.maximize();
    return ctx.mainWindow?.isMaximized() || false;
  });
  ipcMain.handle("window:close", () => { ctx.mainWindow?.close(); return true; });
  ipcMain.handle("window:isMaximized", () => ctx.mainWindow?.isMaximized() || false);

  // Manual "check for updates" button in Settings
  ipcMain.handle("app:check-for-updates", async (event) => {
    if (ctx.isDev) return { ok: false, error: "Updates are only checked in packaged builds." };
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.logger = log;
      const send = (status, extra = {}) => { if (!event.sender.isDestroyed()) event.sender.send("app:update-status", { status, ...extra }); };
      autoUpdater.once("update-available", (info) => send("available", { version: info.version }));
      autoUpdater.once("update-not-available", () => send("not-available"));
      autoUpdater.once("error", (err) => send("error", { message: err.message }));
      autoUpdater.once("download-progress", (p) => send("downloading", { percent: Math.round(p.percent) }));
      autoUpdater.once("update-downloaded", (info) => send("downloaded", { version: info.version }));
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (err) {
      log.warn("[app:check-for-updates] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("app:install-update", () => {
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.quitAndInstall();
      return true;
    } catch (err) {
      log.error("[app:install-update] failed:", err.message);
      return false;
    }
  });
}

module.exports = { register };

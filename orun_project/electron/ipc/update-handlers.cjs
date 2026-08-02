const log = require("electron-log");
const { checkForUpdates, getUpdateStatus } = require("../auto-updater.cjs");

function register(ipcMain, ctx) {
  ipcMain.handle("window:minimize", () => { ctx.mainWindow?.minimize(); return true; });
  ipcMain.handle("window:maximize", () => {
    if (ctx.mainWindow?.isMaximized()) ctx.mainWindow.unmaximize();
    else ctx.mainWindow?.maximize();
    return ctx.mainWindow?.isMaximized() || false;
  });
  ipcMain.handle("window:close", () => { ctx.mainWindow?.close(); return true; });
  ipcMain.handle("window:isMaximized", () => ctx.mainWindow?.isMaximized() || false);

  ipcMain.handle("app:check-for-updates", async () => {
    if (ctx.isDev) return { ok: false, error: "Updates are only checked in packaged builds." };
    checkForUpdates();
    return { ok: true };
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

  ipcMain.handle("app:get-update-status", () => getUpdateStatus());
}

module.exports = { register };

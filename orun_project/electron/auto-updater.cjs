const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow = null;
let updateStatus = "idle";

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function initAutoUpdater(win) {
  mainWindow = win;

  if (!require("electron").app.isPackaged) return;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.setFeedURL({
    provider: "github",
    owner: "grupo-orun",
    repo: "orun-os",
  });

  autoUpdater.on("checking-for-update", () => {
    updateStatus = "checking";
    send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    updateStatus = "available";
    send("update:available", { version: info.version, releaseDate: info.releaseDate });
  });

  autoUpdater.on("update-not-available", () => {
    updateStatus = "not-available";
    send("update:not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    updateStatus = "downloading";
    send("update:progress", { percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateStatus = "downloaded";
    send("update:downloaded", { version: info.version });
    setTimeout(() => {
      try { autoUpdater.quitAndInstall(); } catch { /* ignore */ }
    }, 24 * 60 * 60 * 1000);
  });

  autoUpdater.on("error", (err) => {
    updateStatus = "error";
    log.error("[auto-updater]", err.message);
    send("update:error", { message: err.message });
  });

  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("[auto-updater] initial check failed:", err.message);
  });
}

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("[auto-updater] checkForUpdates failed:", err.message);
  });
}

function getUpdateStatus() {
  return updateStatus;
}

module.exports = { initAutoUpdater, checkForUpdates, getUpdateStatus };

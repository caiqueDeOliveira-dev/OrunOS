const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow = null;
let updateStatus = "idle";

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function sendStatus(status, extra = {}) {
  updateStatus = status;
  send("app:update-status", { status, ...extra });
}

function initAutoUpdater(win) {
  mainWindow = win;

  if (!require("electron").app.isPackaged) return;

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.setFeedURL({
    provider: "github",
    owner: "caiqueDeOliveira-dev",
    repo: "OrunOS",
  });

  autoUpdater.on("checking-for-update", () => {
    send("update:checking");
    sendStatus("checking");
  });

  autoUpdater.on("update-available", (info) => {
    send("update:available", { version: info.version, releaseDate: info.releaseDate });
    sendStatus("available", { version: info.version });
  });

  autoUpdater.on("update-not-available", () => {
    send("update:not-available");
    sendStatus("not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    send("update:progress", { percent: Math.round(progress.percent) });
    sendStatus("downloading", { percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", (info) => {
    send("update:downloaded", { version: info.version });
    sendStatus("downloaded", { version: info.version });
    setTimeout(() => {
      try { autoUpdater.quitAndInstall(); } catch { /* ignore */ }
    }, 24 * 60 * 60 * 1000);
  });

  autoUpdater.on("error", (err) => {
    log.error("[auto-updater]", err.message);
    send("update:error", { message: err.message });
    sendStatus("error", { message: err.message });
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

// electron/shield.cjs — Orun Shield (integração desktop)
// Adaptação CJS da cola `orun-shield-integration` (TS) para o Electron main
// do Orun OS. Instancia o ShieldCore do `@orun/shield-core` (vendored) e
// expõe handlers IPC + eventos para o renderer.

const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");
const { ShieldCore } = require("@orun/shield-core");
const logger = require("./logger.cjs");

const ShieldIpcChannel = {
  START_MONITORING: "shield:start-monitoring",
  STOP_MONITORING: "shield:stop-monitoring",
  FULL_SCAN: "shield:full-scan",
  GET_FINDINGS_LOG: "shield:get-findings-log",
  CHECK_CLAMAV_AVAILABILITY: "shield:check-clamav-availability",
  UPDATE_DEFINITIONS: "shield:update-definitions",
  BLOCK_IP: "shield:block-ip",
  QUARANTINE_FINDING: "shield:quarantine-finding",
  LIST_QUARANTINE: "shield:list-quarantine",
  RESTORE_QUARANTINE: "shield:restore-quarantine",
  DELETE_QUARANTINE: "shield:delete-quarantine",
  ANALYZE_FILE: "shield:analyze-file",
  GET_PROCESS_TREE: "shield:get-process-tree",
  GET_DEFENDER_STATUS: "shield:get-defender-status",
  SYNC_DEFENDER_THREATS: "shield:sync-defender-threats",
  DEFENDER_QUICK_SCAN: "shield:defender-quick-scan",
  DEFENDER_UPDATE_SIGNATURES: "shield:defender-update-signatures",
  THREAT_DETECTED: "shield:event:threat-detected",
  SCAN_STARTED: "shield:event:scan-started",
  SCAN_FINISHED: "shield:event:scan-finished",
  SHIELD_ERROR: "shield:event:error",
};

let shield = null;

function resolveRulesDir() {
  const candidates = [
    path.join(app.getAppPath(), "rules"),
    path.join(path.dirname(__dirname), "rules"),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch { /* ignore */ }
  }
  return candidates[0];
}

function initializeShield(mainWindow) {
  if (shield) return shield;
  const userDataDir = app.getPath("userData");
  const rulesDir = resolveRulesDir();

  shield = new ShieldCore({
    clamav: { useDaemon: false },
    virustotal: process.env.ORUN_VT_API_KEY ? { apiKey: process.env.ORUN_VT_API_KEY } : undefined,
    yara: { rulesDir },
    sentinel: {
      process: {
        cpuThresholdPercent: 75,
        allowlist: ["electron.exe", "node.exe", "orun os.exe", "orun os"],
      },
      network: {
        allowlistHosts: [],
      },
      fileIntegrity: {
        watchPaths: process.platform === "win32"
          ? [path.join(app.getPath("home"), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup")]
          : [],
      },
      ransomwareHeuristic: {
        watchPaths: [app.getPath("documents"), app.getPath("desktop"), app.getPath("pictures")],
        fileEventThreshold: 20,
        windowMs: 10_000,
      },
    },
    autoBlockCriticalNetworkThreats: false,
    quarantine: { quarantineDir: path.join(userDataDir, "shield-quarantine") },
    autoQuarantineCriticalFileThreats: false,
  });

  shield.on("threat:detected", (finding) => {
    try { mainWindow.webContents.send(ShieldIpcChannel.THREAT_DETECTED, finding); } catch (err) { logger.security.warn("threat send", err.message); }
  });
  shield.on("scan:started", (payload) => {
    try { mainWindow.webContents.send(ShieldIpcChannel.SCAN_STARTED, payload); } catch { /* janela destruída */ }
  });
  shield.on("scan:finished", (result) => {
    try { mainWindow.webContents.send(ShieldIpcChannel.SCAN_FINISHED, result); } catch { /* janela destruída */ }
  });
  shield.on("error", (payload) => {
    try { mainWindow.webContents.send(ShieldIpcChannel.SHIELD_ERROR, payload); } catch { /* janela destruída */ }
  });

  registerIpcHandlers();
  logger.security.info("Orun Shield inicializado");
  return shield;
}

function registerIpcHandlers() {
  ipcMain.handle(ShieldIpcChannel.START_MONITORING, () => {
    shield.startMonitoring();
  });

  ipcMain.handle(ShieldIpcChannel.STOP_MONITORING, async () => {
    await shield.stopMonitoring();
  });

  ipcMain.handle(ShieldIpcChannel.FULL_SCAN, async (_event, req) => {
    return shield.fullScan(req.targetPath, req.recursive !== false);
  });

  ipcMain.handle(ShieldIpcChannel.GET_FINDINGS_LOG, () => {
    return shield.getFindingsLog();
  });

  ipcMain.handle(ShieldIpcChannel.CHECK_CLAMAV_AVAILABILITY, async () => {
    if (!shield.clamav) return { available: false };
    return shield.clamav.checkAvailability();
  });

  ipcMain.handle(ShieldIpcChannel.UPDATE_DEFINITIONS, async () => {
    if (!shield.clamav) return { updated: false, log: "ClamAV não configurado neste ShieldCore." };
    return shield.clamav.updateDefinitions();
  });

  ipcMain.handle(ShieldIpcChannel.BLOCK_IP, async (_event, ip) => {
    await shield.firewall.blockIP(ip);
  });

  ipcMain.handle(ShieldIpcChannel.QUARANTINE_FINDING, async (_event, finding) => {
    return shield.quarantineFinding(finding);
  });

  ipcMain.handle(ShieldIpcChannel.LIST_QUARANTINE, async () => {
    if (!shield.quarantineManager) return [];
    return shield.quarantineManager.list();
  });

  ipcMain.handle(ShieldIpcChannel.RESTORE_QUARANTINE, async (_event, id) => {
    if (!shield.quarantineManager) return { success: false, error: "Quarentena não configurada." };
    return shield.quarantineManager.restore(id);
  });

  ipcMain.handle(ShieldIpcChannel.DELETE_QUARANTINE, async (_event, id) => {
    if (!shield.quarantineManager) return { success: false, error: "Quarentena não configurada." };
    return shield.quarantineManager.permanentlyDelete(id);
  });

  ipcMain.handle(ShieldIpcChannel.ANALYZE_FILE, async (_event, filePath) => {
    return shield.analyzeFile(filePath);
  });

  ipcMain.handle(ShieldIpcChannel.GET_PROCESS_TREE, async () => {
    return shield.getProcessTree();
  });

  ipcMain.handle(ShieldIpcChannel.GET_DEFENDER_STATUS, async () => {
    return shield.getDefenderStatus();
  });

  ipcMain.handle(ShieldIpcChannel.SYNC_DEFENDER_THREATS, async () => {
    return shield.syncDefenderThreats();
  });

  ipcMain.handle(ShieldIpcChannel.DEFENDER_QUICK_SCAN, async () => {
    try {
      await shield.defender.startQuickScan();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(ShieldIpcChannel.DEFENDER_UPDATE_SIGNATURES, async () => {
    return shield.defender.updateSignatures();
  });
}

async function shutdownShield() {
  if (shield) {
    try { await shield.stopMonitoring(); } catch { /* best effort */ }
    shield = null;
  }
}

module.exports = { initializeShield, shutdownShield, ShieldIpcChannel };

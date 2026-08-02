// electron/ipc/security-handlers.cjs
// IPC handlers for the Cyber Security agent (local security auditor).

const log = require("electron-log");

function register(ipcMain, ctx) {
  const { securityAudit } = ctx;

  ipcMain.handle("security:run-audit", async () => {
    try {
      const report = await securityAudit.runAudit();
      log.info(`[security-audit] scan complete: score=${report.score}, open=${report.summary.open}`);
      return report;
    } catch (err) {
      log.error("[security:run-audit] failed:", err.message);
      return { error: err.message || String(err) };
    }
  });

  ipcMain.handle("security:get-report", () => securityAudit.getLastReport());

  ipcMain.handle("security:fix-finding", (_event, findingId) => {
    try { return securityAudit.fixFinding(findingId); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("security:export-report", () => {
    try { return securityAudit.exportReport(); }
    catch (err) { return { ok: false, error: err.message || String(err) }; }
  });
}

module.exports = { register };

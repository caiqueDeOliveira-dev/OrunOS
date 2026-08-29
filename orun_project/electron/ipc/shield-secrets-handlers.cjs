const { applyAllowlist } = require("@orun/shield-secrets-core");
const { installPreCommitHook } = require("@orun/shield-secrets-node");

function register(ipcMain, ctx) {
  const scanner = () => ctx.secretScanner;
  const allowlist = () => ctx.secretAllowlist;
  
  ipcMain.handle("shield-secrets:scan", async (_event, scanRequest) => {
    try {
      const raw = await scanner().scan(scanRequest);
      const result = await applyAllowlist(raw, allowlist());
      return { ok: true, data: result };
    } catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("shield-secrets:is-available", async () => {
    try { return { ok: true, data: await scanner().isAvailable() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("shield-secrets:allowlist-list", async () => {
    try { return { ok: true, data: await allowlist().list() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("shield-secrets:allowlist-add", async (_event, entry) => {
    try { await allowlist().add(entry); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("shield-secrets:allowlist-remove", async (_event, ruleId, filePath) => {
    try { await allowlist().remove(ruleId, filePath); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("shield-secrets:install-precommit", async (_event, repoPath) => {
    try { await installPreCommitHook(repoPath); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

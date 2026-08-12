// electron/ipc/auth-handlers.cjs
//
// IPC da camada de autenticação Orun (Fase A). Ponte entre o renderer e o
// AuthClient que roda no main process (electron/auth.cjs).

function register(ipcMain, ctx) {
  const { auth, log } = ctx;

  if (!auth) return;

  ipcMain.handle("auth:get-state", () => {
    try { return auth.getState(); } catch (err) { log?.warn?.("[auth] get-state:", err.message); return null; }
  });

  ipcMain.handle("auth:sign-in", async (_event, { email, password }) => {
    try { return await auth.signIn({ email, password }); }
    catch (err) { log?.warn?.("[auth] sign-in:", err.message); throw err; }
  });

  ipcMain.handle("auth:sign-up", async (_event, { email, password, displayName }) => {
    try { return await auth.signUp({ email, password, displayName }); }
    catch (err) { log?.warn?.("[auth] sign-up:", err.message); throw err; }
  });

  ipcMain.handle("auth:sign-out", async () => {
    try { return await auth.signOut(); }
    catch (err) { log?.warn?.("[auth] sign-out:", err.message); throw err; }
  });

  ipcMain.handle("auth:get-owner", () => {
    try { return auth.getOwner(); }
    catch (err) { log?.warn?.("[auth] get-owner:", err.message); return null; }
  });

  ipcMain.handle("auth:list-devices", async (_event, tenantId) => {
    try { return await auth.listDevices(tenantId); }
    catch (err) { log?.warn?.("[auth] list-devices:", err.message); throw err; }
  });

  ipcMain.handle("auth:revoke-device", async (_event, deviceId) => {
    try { return await auth.revokeDevice(deviceId); }
    catch (err) { log?.warn?.("[auth] revoke-device:", err.message); throw err; }
  });

  // Fase C — licença offline + entitlements
  ipcMain.handle("auth:get-license", async () => {
    try { return await auth.getLicense(); }
    catch (err) { log?.warn?.("[auth] get-license:", err.message); return { status: "unavailable", payload: null, graceDaysRemaining: null }; }
  });

  ipcMain.handle("auth:refresh-license", async () => {
    try { return await auth.refreshLicense(); }
    catch (err) { log?.warn?.("[auth] refresh-license:", err.message); return await auth.getLicense(); }
  });

  ipcMain.handle("auth:get-entitlements", async (_event, tenantId) => {
    try { return await auth.getEntitlements(tenantId); }
    catch (err) { log?.warn?.("[auth] get-entitlements:", err.message); throw err; }
  });

  ipcMain.handle("auth:start-checkout", async (_event, tenantId) => {
    try { return await auth.startCheckout(tenantId); }
    catch (err) {
      log?.warn?.("[auth] start-checkout:", err.message);
      const e = new Error(err.message);
      e.code = err.code || "checkout_failed";
      throw e;
    }
  });

  // Fase D — LGPD (portabilidade + esquecimento)
  ipcMain.handle("auth:export-data", async () => {
    try { return await auth.exportUserData(); }
    catch (err) { log?.warn?.("[auth] export-data:", err.message); throw err; }
  });

  ipcMain.handle("auth:delete-account", async () => {
    try { return await auth.deleteAccount(); }
    catch (err) { log?.warn?.("[auth] delete-account:", err.message); throw err; }
  });

  // Propaga mudanças de estado do AuthClient para o renderer
  auth.subscribe((state) => {
    const win = ctx.mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.send("auth:state-changed", state);
    }
  });
}

module.exports = { register };

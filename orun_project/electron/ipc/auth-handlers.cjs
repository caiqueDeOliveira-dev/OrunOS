// electron/ipc/auth-handlers.cjs
//
// IPC da camada de autenticação Orun (Fase A). Ponte entre o renderer e o
// AuthClient que roda no main process (electron/auth.cjs).

const PT_BR = {
  "invalid login credentials": "E-mail ou senha incorretos.",
  "invalid email or password": "E-mail ou senha incorretos.",
  "email not confirmed": "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  "user already registered": "Este e-mail já possui conta. Tente entrar.",
  "signups not allowed for this instance": "Cadastro não permitido no momento.",
  "password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  "rate limit exceeded": "Muitas tentativas. Aguarde um momento e tente novamente.",
  "for security purposes, you can only request this once every": "Já enviamos um link recentemente. Aguarde alguns minutos antes de pedir outro.",
  "user not found": "Não encontramos uma conta com este e-mail.",
  "new password should be different from the old password": "A nova senha precisa ser diferente da anterior.",
  "token has expired or is invalid": "Link de recuperação inválido ou expirado. Solicite um novo.",
  "email provider is not enabled": "Envio de e-mail desabilitado no momento.",
};

function toError(err, fallback) {
  const raw = typeof err === "string" ? err : err?.message || err?.msg || "";
  const lower = String(raw).toLowerCase();
  for (const [key, msg] of Object.entries(PT_BR)) {
    if (lower.includes(key)) return new Error(msg);
  }
  return new Error(raw || fallback);
}

function register(ipcMain, ctx) {
  const { auth, log } = ctx;

  if (!auth) return;

  ipcMain.handle("auth:get-state", () => {
    try { return auth.getState(); } catch (err) { log?.warn?.("[auth] get-state:", err?.message); return null; }
  });

  ipcMain.handle("auth:sign-in", async (_event, { email, password }) => {
    try { return await auth.signIn({ email, password }); }
    catch (err) { log?.warn?.("[auth] sign-in:", err?.message); throw toError(err, "Não foi possível entrar. Verifique e-mail e senha."); }
  });

  ipcMain.handle("auth:sign-up", async (_event, { email, password, displayName }) => {
    try { return await auth.signUp({ email, password, displayName }); }
    catch (err) { log?.warn?.("[auth] sign-up:", err?.message); throw toError(err, "Não foi possível criar a conta. Tente novamente."); }
  });

  ipcMain.handle("auth:sign-out", async () => {
    try { return await auth.signOut(); }
    catch (err) { log?.warn?.("[auth] sign-out:", err?.message); throw toError(err, "Não foi possível sair."); }
  });

  // Recuperação de senha
  ipcMain.handle("auth:reset-password", async (_event, { email }) => {
    try { await auth.resetPassword({ email }); return { ok: true }; }
    catch (err) { log?.warn?.("[auth] reset-password:", err?.message); throw toError(err, "Não foi possível enviar o link de recuperação."); }
  });

  ipcMain.handle("auth:update-password", async (_event, { password }) => {
    try { await auth.updatePassword({ password }); return { ok: true }; }
    catch (err) { log?.warn?.("[auth] update-password:", err?.message); throw toError(err, "Não foi possível trocar a senha."); }
  });

  ipcMain.handle("auth:complete-recovery", async (_event, { url }) => {
    try { await auth.completeRecoveryFromUrl({ url }); return { ok: true }; }
    catch (err) { log?.warn?.("[auth] complete-recovery:", err?.message); throw toError(err, "Link de recuperação inválido ou expirado."); }
  });

  ipcMain.handle("auth:get-owner", () => {
    try { return auth.getOwner(); }
    catch (err) { log?.warn?.("[auth] get-owner:", err?.message); return null; }
  });

  ipcMain.handle("auth:list-devices", async (_event, tenantId) => {
    try { return await auth.listDevices(tenantId); }
    catch (err) { log?.warn?.("[auth] list-devices:", err?.message); throw toError(err, "Não foi possível listar dispositivos."); }
  });

  ipcMain.handle("auth:revoke-device", async (_event, deviceId) => {
    try { return await auth.revokeDevice(deviceId); }
    catch (err) { log?.warn?.("[auth] revoke-device:", err?.message); throw toError(err, "Não foi possível revogar o dispositivo."); }
  });

  // Fase C — licença offline + entitlements
  ipcMain.handle("auth:get-license", async () => {
    try { return await auth.getLicense(); }
    catch (err) { log?.warn?.("[auth] get-license:", err?.message); return { status: "unavailable", payload: null, graceDaysRemaining: null }; }
  });

  ipcMain.handle("auth:refresh-license", async () => {
    try { return await auth.refreshLicense(); }
    catch (err) { log?.warn?.("[auth] refresh-license:", err?.message); return await auth.getLicense(); }
  });

  ipcMain.handle("auth:get-entitlements", async (_event, tenantId) => {
    try { return await auth.getEntitlements(tenantId); }
    catch (err) { log?.warn?.("[auth] get-entitlements:", err?.message); throw toError(err, "Não foi possível obter os benefícios da conta."); }
  });

  ipcMain.handle("auth:start-checkout", async (_event, tenantId) => {
    try { return await auth.startCheckout(tenantId); }
    catch (err) {
      log?.warn?.("[auth] start-checkout:", err?.message);
      const e = toError(err, "Checkout indisponível no momento.");
      e.code = err?.code || "checkout_failed";
      throw e;
    }
  });

  // Fase D — LGPD (portabilidade + esquecimento)
  ipcMain.handle("auth:export-data", async () => {
    try { return await auth.exportUserData(); }
    catch (err) { log?.warn?.("[auth] export-data:", err?.message); throw toError(err, "Não foi possível exportar seus dados."); }
  });

  ipcMain.handle("auth:delete-account", async () => {
    try { return await auth.deleteAccount(); }
    catch (err) { log?.warn?.("[auth] delete-account:", err?.message); throw toError(err, "Não foi possível excluir a conta."); }
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

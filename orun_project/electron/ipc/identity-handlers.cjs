// electron/ipc/identity-handlers.cjs
//
// IPC da camada de identidade/workspace: usuários, identidades, workspaces,
// agent_channels e voz por agente.

const identityResolver = require("../identity-resolver.cjs");

function register(ipcMain, ctx) {
  const { db, log } = ctx;

  ipcMain.handle("identity:list-users", () => {
    try { return db.listUsers(); } catch (err) { log.warn("[identity] list-users:", err.message); return []; }
  });

  ipcMain.handle("identity:list-identities", (_event, { pendingOnly = false } = {}) => {
    try { return db.listIdentities({ pendingOnly }); } catch (err) { log.warn("[identity] list-identities:", err.message); return []; }
  });

  ipcMain.handle("identity:list-workspaces", () => {
    try { return db.listWorkspaces(); } catch (err) { log.warn("[identity] list-workspaces:", err.message); return []; }
  });

  ipcMain.handle("identity:list-channels", (_event, { enabledOnly = false } = {}) => {
    try { return db.listAgentChannels({ enabledOnly }); } catch (err) { log.warn("[identity] list-channels:", err.message); return []; }
  });

  ipcMain.handle("identity:set-channel", (_event, { provider, externalChannelId, agent, name }) => {
    try {
      const channel = db.upsertAgentChannel({ id: identityResolver.uuid(), provider, externalChannelId, agent, name });
      return channel;
    } catch (err) { log.warn("[identity] set-channel:", err.message); throw err; }
  });

  ipcMain.handle("identity:set-channel-enabled", (_event, { provider, externalChannelId, enabled }) => {
    try { return db.setAgentChannelEnabled(provider, externalChannelId, enabled); }
    catch (err) { log.warn("[identity] set-channel-enabled:", err.message); throw err; }
  });

  ipcMain.handle("identity:complete-onboarding", (_event, { identityId, name, workspaceName }) => {
    try {
      const result = identityResolver.completeOnboarding({ identityId, name, workspaceName }, db);
      log.info(`[identity] onboarding completo: ${identityId} → ${result.userId}`);
      return result;
    } catch (err) { log.warn("[identity] complete-onboarding:", err.message); throw err; }
  });

  ipcMain.handle("identity:link-identity", (_event, { identityId, userId }) => {
    try {
      const result = identityResolver.linkIdentity({ identityId, userId }, db);
      log.info(`[identity] identidade vinculada: ${identityId} → ${userId}`);
      return result;
    } catch (err) { log.warn("[identity] link-identity:", err.message); throw err; }
  });

  ipcMain.handle("identity:voice-settings", (_event, { agentId }) => {
    try { return identityResolver.getAgentVoiceSettings(db, agentId); }
    catch (err) { log.warn("[identity] voice-settings:", err.message); return null; }
  });

  ipcMain.handle("identity:set-voice-settings", (_event, { agentId, patch }) => {
    try {
      const updated = identityResolver.setAgentVoiceSettings(db, agentId, patch);
      log.info(`[identity] voice settings atualizados para ${agentId}`);
      return updated;
    } catch (err) { log.warn("[identity] set-voice-settings:", err.message); throw err; }
  });
}

module.exports = { register };

function register(ipcMain, ctx) {
  const telemetry = () => ctx.telemetry;
  
  ipcMain.handle("telemetry:track", async (_event, payload) => {
    try { await telemetry().track(payload); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("telemetry:flush", async () => {
    try { await telemetry().flush(); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("telemetry:identify", async (_event, userId, traits) => {
    try { await telemetry().identify(userId, traits); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("telemetry:get-session-id", () => telemetry().getSessionId());
  
  // Metrics reader (for the React panel)
  ipcMain.handle("telemetry:agent-health", async (_event, agentId) => {
    try { return { ok: true, data: await ctx.telemetryReader.getAgentHealth(agentId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("telemetry:all-agents-health", async () => {
    try { return { ok: true, data: await ctx.telemetryReader.getAllAgentsHealth() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("telemetry:mcp-success-rate", async (_event, mcpName, windowHours) => {
    try { return { ok: true, data: await ctx.telemetryReader.getMcpSuccessRate(mcpName, windowHours) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

// electron/ipc/agent-hub-handlers.cjs
// Handlers IPC do Agent Hub (Módulo 5 — colaboração serial).

function register(ipcMain, ctx) {
  const hub = () => ctx.agentHub; // getter em main.cjs — nunca null.

  ipcMain.handle("agent-hub:list", () => hub().listSchemas());
  ipcMain.handle("agent-hub:get", (_event, { id }) => {
    const schema = hub().getSchema(id);
    return schema ? { ok: true, schema } : { ok: false, error: "agente não encontrado" };
  });
  ipcMain.handle("agent-hub:route", (_event, { request, context }) => hub().route(request, context || ""));
  ipcMain.handle("agent-hub:delegate", (_event, { request, context, agent }) => {
    const result = hub().delegate({ request, context: context || "", agentHint: agent || null });
    if (ctx.analytics) {
      ctx.analytics.logEvent({
        type: result.escalated ? "agent_hub:escalate" : "agent_hub:delegate",
        agent: result.agent,
        detail: `${String(request).slice(0, 300)}${result.reason ? ` — ${result.reason}` : ""}`,
      });
    }
    return result;
  });
}

module.exports = { register };

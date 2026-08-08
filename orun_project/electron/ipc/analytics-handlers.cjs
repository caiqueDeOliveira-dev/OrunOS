// electron/ipc/analytics-handlers.cjs
// Handlers IPC do Analytics/Dashboard (Módulo 6).

function register(ipcMain, ctx) {
  const analytics = () => ctx.analytics; // getter em main.cjs — nunca null.

  ipcMain.handle("analytics:summary", () => analytics().aggregate());
  ipcMain.handle("analytics:system", () => analytics().system());
  ipcMain.handle("analytics:event", (_event, ev) => analytics().logEvent(ev || {}));
}

module.exports = { register };

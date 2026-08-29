// electron/ipc/world-handlers.cjs
// Handlers IPC do espaço WORLD (dados ao vivo: notícias via RSS no main process,
// pois feeds não têm CORS para o renderer).

function register(ipcMain, ctx) {
  ipcMain.handle("world:news", async (_event, opts) => {
    try {
      return await require("../world-data.cjs").fetchNews(opts || {});
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  });
}

module.exports = { register };

function register(ipcMain, ctx) {
  const vault = () => ctx.memoryVault;
  
  ipcMain.handle("vault:save", async (_event, input) => {
    try { return { ok: true, data: await vault().save(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("vault:search", async (_event, query, options) => {
    try { return { ok: true, data: await vault().search(query, options) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("vault:list-by-tag", async (_event, tag) => {
    try { return { ok: true, data: await vault().listByTag(tag) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("vault:archive", async (_event, bookmarkId) => {
    try { await vault().archive(bookmarkId); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

function register(ipcMain, ctx) {
  const design = () => ctx.designStore;
  
  ipcMain.handle("design:list-projects", async () => {
    try { return { ok: true, data: await design().listProjects() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("design:list-files", async (_event, projectId) => {
    try { return { ok: true, data: await design().listFiles(projectId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("design:export-file", async (_event, fileId, format, pageId) => {
    try { return { ok: true, data: await design().exportFile(fileId, format, pageId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

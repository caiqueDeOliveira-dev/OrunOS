function register(ipcMain, ctx) {
  const social = () => ctx.socialScheduler;
  
  ipcMain.handle("social:list-accounts", async () => {
    try { return { ok: true, data: await social().listAccounts() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("social:list-posts", async (_event, options) => {
    try { return { ok: true, data: await social().listScheduledPosts(options) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("social:schedule-post", async (_event, input) => {
    try { return { ok: true, data: await social().schedulePost(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("social:cancel-post", async (_event, postId) => {
    try { await social().cancelPost(postId); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

// electron/ipc/postiz-handlers.cjs
//
// IPC handlers for Postiz integration.

function register(ipcMain, ctx) {
  const postiz = () => ctx.postiz;
  if (!postiz()) return;

  ipcMain.handle("postiz:list-channels", async () => {
    try { return { ok: true, data: await postiz().listIntegrations() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:list-posts", async (_ev, { startDate, endDate } = {}) => {
    try { return { ok: true, data: await postiz().listPosts(startDate, endDate) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:create-post", async (_ev, input) => {
    try { return { ok: true, data: await postiz().createPost(input) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:delete-post", async (_ev, group) => {
    try { return { ok: true, data: await postiz().deletePost(group) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:get-post", async (_ev, postId) => {
    try { return { ok: true, data: await postiz().getPost(postId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:get-stats", async (_ev, postId) => {
    try { return { ok: true, data: await postiz().getStats(postId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:health", async () => {
    try { return { ok: true, data: await postiz().healthCheck() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:available-channels", async () => {
    try { return { ok: true, data: await postiz().listAvailableIntegrations() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });

  ipcMain.handle("postiz:find-slot", async (_ev, integrationId) => {
    try { return { ok: true, data: await postiz().findFreeSlot(integrationId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}

module.exports = { register };

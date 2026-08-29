function register(ipcMain, ctx) {
  const photos = () => ctx.photoLibrary;
  
  ipcMain.handle("photos:search", async (_event, query) => {
    try { return { ok: true, data: await photos().search(query) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("photos:list-albums", async () => {
    try { return { ok: true, data: await photos().listAlbums() }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("photos:list-album-assets", async (_event, albumId) => {
    try { return { ok: true, data: await photos().listAlbumAssets(albumId) }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
  ipcMain.handle("photos:toggle-favorite", async (_event, assetId, favorite) => {
    try { await photos().toggleFavorite(assetId, favorite); return { ok: true }; }
    catch (e) { return { ok: false, error: String(e?.message || e) }; }
  });
}
module.exports = { register };

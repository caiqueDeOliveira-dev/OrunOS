import { contextBridge, ipcRenderer } from 'electron';

// Token retrieval crosses into main-process territory (ISecretStore lives
// there today per the identity/settings packages). The renderer asks main
// for a fresh token on demand rather than holding one in memory long-term.
//
// Wire these two IPC handlers in the main process last, once OAuth refresh
// is confirmed working end-to-end:
//   ipcMain.handle('orun-music:get-spotify-token', ...)
//   ipcMain.handle('orun-music:get-spotify-user-id', ...)
//   ipcMain.handle('orun-music:get-musixmatch-key', ...)

contextBridge.exposeInMainWorld('orunMusicBridge', {
  getSpotifyAccessToken: (): Promise<string> => ipcRenderer.invoke('orun-music:get-spotify-token'),
  getSpotifyUserId: (): Promise<string> => ipcRenderer.invoke('orun-music:get-spotify-user-id'),
  getMusixmatchApiKey: (): Promise<string> => ipcRenderer.invoke('orun-music:get-musixmatch-key'),
});

declare global {
  interface Window {
    orunMusicBridge: {
      getSpotifyAccessToken: () => Promise<string>;
      getSpotifyUserId: () => Promise<string>;
      getMusixmatchApiKey: () => Promise<string>;
    };
  }
}

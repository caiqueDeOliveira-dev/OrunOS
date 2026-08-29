import { BrowserWindow, screen } from 'electron';
let miniPlayerWindow = null;
const WIDTH = 340;
const HEIGHT = 120;
/** Opens (or focuses, if already open) a compact always-on-top now-playing window. */
export function openMiniPlayer(preloadPath, rendererUrl) {
    if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
        miniPlayerWindow.focus();
        return miniPlayerWindow;
    }
    const display = screen.getPrimaryDisplay();
    const { width: screenW } = display.workAreaSize;
    miniPlayerWindow = new BrowserWindow({
        width: WIDTH,
        height: HEIGHT,
        x: screenW - WIDTH - 20,
        y: 20,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Load the same renderer bundle in a stripped-down "mini" route — the
    // React app should read a `?view=mini` query param (or similar) and
    // render just <MiniPlayerBar /> instead of the full shell.
    miniPlayerWindow.loadURL(`${rendererUrl}?view=mini`);
    miniPlayerWindow.on('closed', () => { miniPlayerWindow = null; });
    return miniPlayerWindow;
}
export function closeMiniPlayer() {
    miniPlayerWindow?.close();
    miniPlayerWindow = null;
}
export function isMiniPlayerOpen() {
    return !!miniPlayerWindow && !miniPlayerWindow.isDestroyed();
}
//# sourceMappingURL=MiniPlayerWindow.js.map
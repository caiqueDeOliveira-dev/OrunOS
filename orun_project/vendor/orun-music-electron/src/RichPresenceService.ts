import { BrowserWindow, ipcMain } from 'electron';
import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
import type { PlaybackState } from '@orun/music-core/schemas';

const CHANNEL = 'orun-os:now-playing';

/**
 * Runs in the Electron main process. Subscribes to the player once and
 * fans the state out to every renderer window (system tray popup, main
 * shell status bar, mini-player, etc.) instead of each of them polling
 * the player independently.
 */
export class RichPresenceService {
  private lastState: PlaybackState | null = null;

  constructor(private readonly player: ISpotifyPlayer) {}

  start(): void {
    this.player.onStateChange((state) => {
      this.lastState = state;
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(CHANNEL, state);
      }
    });

    // Lets any newly-opened window (e.g. the mini-player, opened later)
    // ask for the current state instead of waiting for the next change event.
    ipcMain.handle(`${CHANNEL}:get`, () => this.lastState);
  }
}

/** Renderer-side helper — call from preload.ts alongside the other bridges. */
export const richPresencePreloadBridge = {
  channel: CHANNEL,
  getChannel: `${CHANNEL}:get`,
};

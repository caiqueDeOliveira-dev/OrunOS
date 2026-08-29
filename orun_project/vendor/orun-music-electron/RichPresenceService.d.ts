import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
/**
 * Runs in the Electron main process. Subscribes to the player once and
 * fans the state out to every renderer window (system tray popup, main
 * shell status bar, mini-player, etc.) instead of each of them polling
 * the player independently.
 */
export declare class RichPresenceService {
    private readonly player;
    private lastState;
    constructor(player: ISpotifyPlayer);
    start(): void;
}
/** Renderer-side helper — call from preload.ts alongside the other bridges. */
export declare const richPresencePreloadBridge: {
    channel: string;
    getChannel: string;
};
//# sourceMappingURL=RichPresenceService.d.ts.map
import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
/**
 * IMPORTANT LIMITATION: the Web Playback SDK controls a single Spotify
 * Connect stream and never exposes raw decoded audio (it's DRM-protected).
 * That means true crossfade — two tracks' audio mixed together — is not
 * achievable client-side, the same way it is in a local media player like
 * WMP or foobar2000.
 *
 * What IS achievable, and what this class does: a "soft" crossfade —
 * ramp the single stream's volume down near the end of a track, trigger
 * the skip, then ramp back up. It reads as a fade-out/fade-in rather than
 * a true overlap, but it removes the hard cut between tracks, which is
 * usually what people actually want from "crossfade" in practice.
 */
export declare class CrossfadeController {
    private readonly player;
    private readonly getFadeSeconds;
    private targetVolume;
    private fadeIntervalId;
    private unsubscribeState;
    private triggeredForTrackId;
    constructor(player: ISpotifyPlayer, getFadeSeconds: () => number);
    start(): void;
    stop(): void;
    setTargetVolume(volume: number): void;
    private handleState;
    private fadeOut;
    private fadeIn;
    private clearFade;
}
//# sourceMappingURL=CrossfadeController.d.ts.map
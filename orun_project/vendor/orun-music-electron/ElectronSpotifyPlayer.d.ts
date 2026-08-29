import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
import type { PlaybackState } from '@orun/music-core/schemas';
interface SpotifySdkTrack {
    id: string;
    name: string;
    duration_ms: number;
    artists: {
        name: string;
    }[];
    album: {
        name: string;
        images: {
            url: string;
        }[];
    };
}
interface SpotifySdkState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
        current_track: SpotifySdkTrack;
    };
}
declare global {
    interface Window {
        onSpotifyWebPlaybackSDKReady: () => void;
        Spotify: {
            Player: new (options: {
                name: string;
                getOAuthToken: (cb: (token: string) => void) => void;
                volume: number;
            }) => {
                connect: () => Promise<boolean>;
                disconnect: () => void;
                addListener: (event: string, cb: (payload: any) => void) => void;
                removeListener: (event: string) => void;
                getCurrentState: () => Promise<SpotifySdkState | null>;
                setVolume: (v: number) => Promise<void>;
                seek: (ms: number) => Promise<void>;
                pause: () => Promise<void>;
                resume: () => Promise<void>;
                nextTrack: () => Promise<void>;
                previousTrack: () => Promise<void>;
            };
        };
    }
}
/**
 * Runs in the Electron renderer process (contextIsolation-safe — exposed
 * to the app via preload/contextBridge, not injected into an untrusted page).
 *
 * Requires the token supplier to already have a valid access token with the
 * `streaming` scope. Token retrieval itself is deliberately NOT implemented
 * here — see `getOAuthTokenSupplier` below. That's the wire-up we're doing
 * last, once everything else is in place.
 */
export declare class ElectronSpotifyPlayer implements ISpotifyPlayer {
    private readonly playerName;
    private readonly getAccessToken;
    private player;
    private deviceId;
    private listeners;
    private sdkLoadPromise;
    constructor(playerName: string, getAccessToken: () => Promise<string>);
    private loadSdk;
    connect(): Promise<boolean>;
    disconnect(): void;
    play(_uri?: string): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    skipNext(): Promise<void>;
    skipPrevious(): Promise<void>;
    getState(): Promise<PlaybackState | null>;
    onStateChange(callback: (state: PlaybackState) => void): () => void;
    getDeviceId(): string | null;
    private mapState;
}
export {};
//# sourceMappingURL=ElectronSpotifyPlayer.d.ts.map
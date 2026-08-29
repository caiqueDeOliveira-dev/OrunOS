import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
import type { PlaybackState } from '@orun/music-core/schemas';

// Minimal shape of the objects the Web Playback SDK hands back.
// The full SDK type surface is larger; this covers what we consume.
interface SpotifySdkTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
}
interface SpotifySdkState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: SpotifySdkTrack };
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

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

/**
 * Runs in the Electron renderer process (contextIsolation-safe — exposed
 * to the app via preload/contextBridge, not injected into an untrusted page).
 *
 * Requires the token supplier to already have a valid access token with the
 * `streaming` scope. Token retrieval itself is deliberately NOT implemented
 * here — see `getOAuthTokenSupplier` below. That's the wire-up we're doing
 * last, once everything else is in place.
 */
export class ElectronSpotifyPlayer implements ISpotifyPlayer {
  private player: InstanceType<Window['Spotify']['Player']> | null = null;
  private deviceId: string | null = null;
  private listeners = new Set<(state: PlaybackState) => void>();
  private sdkLoadPromise: Promise<void> | null = null;

  constructor(
    private readonly playerName: string,
    private readonly getAccessToken: () => Promise<string>, // ← plug in last
  ) {}

  private loadSdk(): Promise<void> {
    if (this.sdkLoadPromise) return this.sdkLoadPromise;
    this.sdkLoadPromise = new Promise((resolve) => {
      if (window.Spotify) return resolve();
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      document.body.appendChild(script);
      window.onSpotifyWebPlaybackSDKReady = () => resolve();
    });
    return this.sdkLoadPromise;
  }

  async connect(): Promise<boolean> {
    await this.loadSdk();

    return new Promise((resolve) => {
      this.player = new window.Spotify.Player({
        name: this.playerName,
        getOAuthToken: (cb) => {
          this.getAccessToken().then(cb).catch(() => cb(''));
        },
        volume: 0.5,
      });

      this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
        this.deviceId = device_id;
        resolve(true);
      });
      this.player.addListener('not_ready', () => resolve(false));
      this.player.addListener('initialization_error', () => resolve(false));
      this.player.addListener('authentication_error', () => resolve(false));
      this.player.addListener('account_error', () => resolve(false)); // non-Premium accounts can't use Connect playback

      this.player.addListener('player_state_changed', (sdkState: SpotifySdkState | null) => {
        if (!sdkState) return;
        const mapped = this.mapState(sdkState);
        this.listeners.forEach((cb) => cb(mapped));
      });

      this.player.connect();
    });
  }

  disconnect(): void {
    this.player?.disconnect();
    this.player = null;
    this.deviceId = null;
  }

  // Playing a specific URI (as opposed to resume) requires the Web API's
  // PUT /v1/me/player/play with device_id=this.deviceId — the SDK itself
  // only controls an already-active session. That call lives in the
  // playlist/queue service, not here, to keep this class SDK-only.
  async play(_uri?: string): Promise<void> {
    await this.player?.resume();
  }

  async pause(): Promise<void> {
    await this.player?.pause();
  }

  async resume(): Promise<void> {
    await this.player?.resume();
  }

  async seek(positionMs: number): Promise<void> {
    await this.player?.seek(positionMs);
  }

  async setVolume(volume: number): Promise<void> {
    await this.player?.setVolume(volume);
  }

  async skipNext(): Promise<void> {
    await this.player?.nextTrack();
  }

  async skipPrevious(): Promise<void> {
    await this.player?.previousTrack();
  }

  async getState(): Promise<PlaybackState | null> {
    const sdkState = await this.player?.getCurrentState();
    return sdkState ? this.mapState(sdkState) : null;
  }

  onStateChange(callback: (state: PlaybackState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  private mapState(s: SpotifySdkState): PlaybackState {
    const track = s.track_window.current_track;
    return {
      isPlaying: !s.paused,
      trackId: track.id,
      trackName: track.name,
      artistName: track.artists.map((a) => a.name).join(', '),
      albumName: track.album.name,
      albumArtUrl: track.album.images[0]?.url ?? null,
      positionMs: s.position,
      durationMs: s.duration,
      volume: 0.5, // SDK doesn't report current volume in state; track separately if needed
      deviceId: this.deviceId,
    };
  }
}

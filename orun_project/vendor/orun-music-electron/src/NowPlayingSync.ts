import type { ISpotifyPlayer } from '@orun/music-core/interfaces';
import type { PlaybackState } from '@orun/music-core/schemas';

/**
 * Minimal shape of the @orun/sync client this needs. Match this to
 * whatever `@orun/sync`'s actual exported client interface looks like —
 * kept narrow here so this file doesn't need the whole sync package's
 * type surface, just publish/subscribe on a channel.
 */
export interface ISyncChannel {
  publish(key: string, value: unknown): Promise<void>;
  subscribe(key: string, callback: (value: unknown) => void): () => void;
}

const CHANNEL_KEY = 'music:now-playing';
const THROTTLE_MS = 4000; // avoid flooding Supabase Realtime with per-second position updates

export class NowPlayingSync {
  private lastPublish = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly player: ISpotifyPlayer,
    private readonly sync: ISyncChannel,
    private readonly deviceLabel: string, // e.g. 'Orun Desktop', 'Orun Mobile'
  ) {}

  start(): void {
    this.player.onStateChange((state) => this.maybePublish(state));

    // When another device starts playing something, mirror it here —
    // this is the "sai de casa com o celular e a música continua" case.
    // Uses `play(uri)` since Spotify Connect can hand off playback between
    // devices registered under the same account.
    this.unsubscribe = this.sync.subscribe(CHANNEL_KEY, (value) => {
      const remote = value as { deviceLabel: string; trackUri: string | null; positionMs: number } | null;
      if (!remote || remote.deviceLabel === this.deviceLabel || !remote.trackUri) return;
      this.player.play(remote.trackUri).then(() => this.player.seek(remote.positionMs));
    });
  }

  stop(): void {
    this.unsubscribe?.();
  }

  private maybePublish(state: PlaybackState): void {
    const now = Date.now();
    if (now - this.lastPublish < THROTTLE_MS) return;
    this.lastPublish = now;

    this.sync.publish(CHANNEL_KEY, {
      deviceLabel: this.deviceLabel,
      trackUri: state.trackId ? `spotify:track:${state.trackId}` : null,
      positionMs: state.positionMs,
      isPlaying: state.isPlaying,
      updatedAt: now,
    });
  }
}

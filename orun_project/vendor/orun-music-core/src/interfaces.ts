import type { PlaybackState, Playlist, SyncedLyrics, Track } from './schemas';

// ── Playback ────────────────────────────────────────────────────
export interface ISpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  play(uri?: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  getState(): Promise<PlaybackState | null>;
  onStateChange(callback: (state: PlaybackState) => void): () => void;
  getDeviceId(): string | null;
}

// ── Playlist sync (Orun local <-> Spotify remote) ──────────────────
export interface IPlaylistSync {
  /** Push a locally-created Orun playlist to the user's Spotify account. */
  exportToSpotify(playlist: Playlist, tracks: Track[]): Promise<{ spotifyId: string }>;

  /** Push local additions/removals to an already-synced playlist. */
  syncPlaylist(playlist: Playlist, tracks: Track[]): Promise<void>;

  /** Pull all of the user's Spotify playlists into local Orun playlists. */
  importFromSpotify(): Promise<{ playlists: Playlist[]; tracks: Track[] }>;

  /** Resolve a local track (title/artist) to a Spotify URI via search. */
  resolveTrackUri(title: string, artist: string): Promise<string | null>;
}

// ── Lyrics ──────────────────────────────────────────────────────
export interface ILyricsProvider {
  getSyncedLyrics(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null>;
}

// ── Local persistence (mirrors the ISettingsStore / ISecretStore pattern) ──
export interface IPlaylistStore {
  list(): Promise<Playlist[]>;
  get(id: string): Promise<Playlist | null>;
  upsert(playlist: Playlist): Promise<void>;
  remove(id: string): Promise<void>;
}

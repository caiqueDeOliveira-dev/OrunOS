import { z } from 'zod';

// ── Playback ────────────────────────────────────────────────────
export const PlaybackStateSchema = z.object({
  isPlaying: z.boolean(),
  trackId: z.string().nullable(),
  trackName: z.string().nullable(),
  artistName: z.string().nullable(),
  albumName: z.string().nullable(),
  albumArtUrl: z.string().url().nullable(),
  positionMs: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  volume: z.number().min(0).max(1),
  deviceId: z.string().nullable(),
});
export type PlaybackState = z.infer<typeof PlaybackStateSchema>;

export const SpotifyPlayerConfigSchema = z.object({
  clientId: z.string(),
  playerName: z.string().default('Orun Desktop'),
  initialVolume: z.number().min(0).max(1).default(0.5),
});
export type SpotifyPlayerConfig = z.infer<typeof SpotifyPlayerConfigSchema>;

// ── Library ─────────────────────────────────────────────────────
export const TrackSchema = z.object({
  id: z.string(),
  spotifyUri: z.string().nullable(), // null until resolved against Spotify's catalog
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  durationMs: z.number().int().nonnegative(),
  albumArtUrl: z.string().url().nullable(),
});
export type Track = z.infer<typeof TrackSchema>;

export const PlaylistSourceSchema = z.enum(['orun', 'spotify']);
export type PlaylistSource = z.infer<typeof PlaylistSourceSchema>;

export const PlaylistSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  trackIds: z.array(z.string()),
  source: PlaylistSourceSchema,
  spotifyId: z.string().nullable(),
  syncedAt: z.number().int().nullable(), // epoch ms of last successful sync
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Playlist = z.infer<typeof PlaylistSchema>;

// ── Lyrics ──────────────────────────────────────────────────────
export const LyricLineSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  text: z.string(),
});
export type LyricLine = z.infer<typeof LyricLineSchema>;

export const SyncedLyricsSchema = z.object({
  trackId: z.string(),
  provider: z.enum(['musixmatch', 'lrclib', 'none']),
  lines: z.array(LyricLineSchema),
  fetchedAt: z.number().int(),
});
export type SyncedLyrics = z.infer<typeof SyncedLyricsSchema>;

// ── Preferences (routed through @orun/settings) ───────────────────
export const MusicPreferencesSchema = z.object({
  theme: z.enum(['blood', 'circuit', 'signal', 'frost']).default('blood'),
  cornerRadius: z.number().min(0).max(16).default(4),
  reduceMotion: z.boolean().default(false),
  lyricsEnabled: z.boolean().default(true),
  crossfadeSeconds: z.number().min(0).max(12).default(0), // 0 = off
  lyricsTranslationLocale: z.string().nullable().default(null), // e.g. 'pt-BR', null = off
});
export type MusicPreferences = z.infer<typeof MusicPreferencesSchema>;

// ── Listening history / stats ──────────────────────────────────────
export const ListeningHistoryEntrySchema = z.object({
  id: z.string(),
  trackId: z.string(),
  trackTitle: z.string(),
  artist: z.string(),
  playedAt: z.number().int(), // epoch ms
  msPlayed: z.number().int().nonnegative(), // how much of it was actually heard
  completed: z.boolean(), // played past ~85% of duration
});
export type ListeningHistoryEntry = z.infer<typeof ListeningHistoryEntrySchema>;

// ── Cached lyrics (avoids re-fetching static per-track data) ────────
export const CachedLyricsSchema = z.object({
  trackId: z.string(),
  lines: z.array(LyricLineSchema),
  provider: z.enum(['musixmatch', 'lrclib', 'none']),
  translations: z.record(z.string(), z.array(z.string())).default({}), // locale -> translated lines, same index as `lines`
  cachedAt: z.number().int(),
});
export type CachedLyrics = z.infer<typeof CachedLyricsSchema>;

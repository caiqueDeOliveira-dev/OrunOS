import { z } from 'zod';
export declare const PlaybackStateSchema: z.ZodObject<{
    isPlaying: z.ZodBoolean;
    trackId: z.ZodNullable<z.ZodString>;
    trackName: z.ZodNullable<z.ZodString>;
    artistName: z.ZodNullable<z.ZodString>;
    albumName: z.ZodNullable<z.ZodString>;
    albumArtUrl: z.ZodNullable<z.ZodString>;
    positionMs: z.ZodNumber;
    durationMs: z.ZodNumber;
    volume: z.ZodNumber;
    deviceId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    isPlaying: boolean;
    trackId: string | null;
    trackName: string | null;
    artistName: string | null;
    albumName: string | null;
    albumArtUrl: string | null;
    positionMs: number;
    durationMs: number;
    volume: number;
    deviceId: string | null;
}, {
    isPlaying: boolean;
    trackId: string | null;
    trackName: string | null;
    artistName: string | null;
    albumName: string | null;
    albumArtUrl: string | null;
    positionMs: number;
    durationMs: number;
    volume: number;
    deviceId: string | null;
}>;
export type PlaybackState = z.infer<typeof PlaybackStateSchema>;
export declare const SpotifyPlayerConfigSchema: z.ZodObject<{
    clientId: z.ZodString;
    playerName: z.ZodDefault<z.ZodString>;
    initialVolume: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    clientId: string;
    playerName: string;
    initialVolume: number;
}, {
    clientId: string;
    playerName?: string | undefined;
    initialVolume?: number | undefined;
}>;
export type SpotifyPlayerConfig = z.infer<typeof SpotifyPlayerConfigSchema>;
export declare const TrackSchema: z.ZodObject<{
    id: z.ZodString;
    spotifyUri: z.ZodNullable<z.ZodString>;
    title: z.ZodString;
    artist: z.ZodString;
    album: z.ZodString;
    durationMs: z.ZodNumber;
    albumArtUrl: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    albumArtUrl: string | null;
    durationMs: number;
    id: string;
    spotifyUri: string | null;
    title: string;
    artist: string;
    album: string;
}, {
    albumArtUrl: string | null;
    durationMs: number;
    id: string;
    spotifyUri: string | null;
    title: string;
    artist: string;
    album: string;
}>;
export type Track = z.infer<typeof TrackSchema>;
export declare const PlaylistSourceSchema: z.ZodEnum<["orun", "spotify"]>;
export type PlaylistSource = z.infer<typeof PlaylistSourceSchema>;
export declare const PlaylistSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    trackIds: z.ZodArray<z.ZodString, "many">;
    source: z.ZodEnum<["orun", "spotify"]>;
    spotifyId: z.ZodNullable<z.ZodString>;
    syncedAt: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description: string;
    trackIds: string[];
    source: "orun" | "spotify";
    spotifyId: string | null;
    syncedAt: number | null;
    createdAt: number;
    updatedAt: number;
}, {
    id: string;
    title: string;
    trackIds: string[];
    source: "orun" | "spotify";
    spotifyId: string | null;
    syncedAt: number | null;
    createdAt: number;
    updatedAt: number;
    description?: string | undefined;
}>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export declare const LyricLineSchema: z.ZodObject<{
    timeMs: z.ZodNumber;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timeMs: number;
    text: string;
}, {
    timeMs: number;
    text: string;
}>;
export type LyricLine = z.infer<typeof LyricLineSchema>;
export declare const SyncedLyricsSchema: z.ZodObject<{
    trackId: z.ZodString;
    provider: z.ZodEnum<["musixmatch", "lrclib", "none"]>;
    lines: z.ZodArray<z.ZodObject<{
        timeMs: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timeMs: number;
        text: string;
    }, {
        timeMs: number;
        text: string;
    }>, "many">;
    fetchedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    trackId: string;
    provider: "musixmatch" | "lrclib" | "none";
    lines: {
        timeMs: number;
        text: string;
    }[];
    fetchedAt: number;
}, {
    trackId: string;
    provider: "musixmatch" | "lrclib" | "none";
    lines: {
        timeMs: number;
        text: string;
    }[];
    fetchedAt: number;
}>;
export type SyncedLyrics = z.infer<typeof SyncedLyricsSchema>;
export declare const MusicPreferencesSchema: z.ZodObject<{
    theme: z.ZodDefault<z.ZodEnum<["blood", "circuit", "signal", "frost"]>>;
    cornerRadius: z.ZodDefault<z.ZodNumber>;
    reduceMotion: z.ZodDefault<z.ZodBoolean>;
    lyricsEnabled: z.ZodDefault<z.ZodBoolean>;
    crossfadeSeconds: z.ZodDefault<z.ZodNumber>;
    lyricsTranslationLocale: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    theme: "blood" | "circuit" | "signal" | "frost";
    cornerRadius: number;
    reduceMotion: boolean;
    lyricsEnabled: boolean;
    crossfadeSeconds: number;
    lyricsTranslationLocale: string | null;
}, {
    theme?: "blood" | "circuit" | "signal" | "frost" | undefined;
    cornerRadius?: number | undefined;
    reduceMotion?: boolean | undefined;
    lyricsEnabled?: boolean | undefined;
    crossfadeSeconds?: number | undefined;
    lyricsTranslationLocale?: string | null | undefined;
}>;
export type MusicPreferences = z.infer<typeof MusicPreferencesSchema>;
export declare const ListeningHistoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    trackId: z.ZodString;
    trackTitle: z.ZodString;
    artist: z.ZodString;
    playedAt: z.ZodNumber;
    msPlayed: z.ZodNumber;
    completed: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    trackId: string;
    id: string;
    artist: string;
    trackTitle: string;
    playedAt: number;
    msPlayed: number;
    completed: boolean;
}, {
    trackId: string;
    id: string;
    artist: string;
    trackTitle: string;
    playedAt: number;
    msPlayed: number;
    completed: boolean;
}>;
export type ListeningHistoryEntry = z.infer<typeof ListeningHistoryEntrySchema>;
export declare const CachedLyricsSchema: z.ZodObject<{
    trackId: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        timeMs: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timeMs: number;
        text: string;
    }, {
        timeMs: number;
        text: string;
    }>, "many">;
    provider: z.ZodEnum<["musixmatch", "lrclib", "none"]>;
    translations: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    cachedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    trackId: string;
    provider: "musixmatch" | "lrclib" | "none";
    lines: {
        timeMs: number;
        text: string;
    }[];
    translations: Record<string, string[]>;
    cachedAt: number;
}, {
    trackId: string;
    provider: "musixmatch" | "lrclib" | "none";
    lines: {
        timeMs: number;
        text: string;
    }[];
    cachedAt: number;
    translations?: Record<string, string[]> | undefined;
}>;
export type CachedLyrics = z.infer<typeof CachedLyricsSchema>;
//# sourceMappingURL=schemas.d.ts.map
import type { ILyricsProvider } from '@orun/music-core/interfaces';
import type { SyncedLyrics, Track } from '@orun/music-core/schemas';
/**
 * Free, no-API-key alternative to Musixmatch — backed by LRCLIB
 * (lrclib.net), a community-maintained, zero-profit synced lyrics
 * database built for FOSS music players. No auth, no rate-limit key,
 * no commercial licensing question to resolve before shipping.
 *
 * Like the Musixmatch provider, this only ever returns whatever LRCLIB's
 * API sends back — it doesn't store, cache to disk, or bundle any lyric
 * text itself.
 */
export declare class LrclibLyricsProvider implements ILyricsProvider {
    getSyncedLyrics(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null>;
    private tryGet;
    private trySearch;
    private toSyncedLyrics;
}
//# sourceMappingURL=LrclibLyricsProvider.d.ts.map
import type { ILyricsProvider } from '@orun/music-core/interfaces';
import type { SyncedLyrics, Track } from '@orun/music-core/schemas';
/**
 * Requires a Musixmatch API key with access to the "subtitle" (synced
 * lyrics) endpoints — the free tier only covers unsynced lyrics snippets.
 * Commercial/karaoke-style display of synced lyrics needs their commercial
 * licensing tier; confirm terms before shipping this beyond personal use.
 *
 * This class only ever returns whatever the provider's API hands back —
 * it does not store, cache to disk, or bundle any lyric text itself.
 */
export declare class MusixmatchLyricsProvider implements ILyricsProvider {
    private readonly apiKey;
    constructor(apiKey: () => Promise<string>);
    getSyncedLyrics(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null>;
}
//# sourceMappingURL=MusixmatchLyricsProvider.d.ts.map
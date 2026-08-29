import type Database from 'better-sqlite3';
import type { ILyricsProvider } from '@orun/music-core/interfaces';
import { type CachedLyrics, type Track } from '@orun/music-core/schemas';
/**
 * Minimal shape of the ai-router client this needs — matches
 * @orun/ai-router's `complete()`-style call. Adjust the import/method
 * name to whatever the real client exposes; this is intentionally kept
 * decoupled so it doesn't need to know about provider selection.
 */
export interface ITranslationClient {
    complete(prompt: string): Promise<string>;
}
export declare class LyricsCache {
    private readonly db;
    private readonly provider;
    private readonly translationClient?;
    constructor(db: Database.Database, provider: ILyricsProvider, translationClient?: ITranslationClient | undefined);
    getLyrics(track: Track): Promise<CachedLyrics | null>;
    /**
     * Translates the already-fetched lyric lines into `locale`, caching the
     * result per track+locale so it's a one-time cost. This transforms text
     * the user already legitimately has via the lyrics provider — it does
     * not fetch or store lyrics from anywhere else.
     */
    getTranslation(track: Track, locale: string): Promise<string[] | null>;
    private readCache;
    private writeCache;
}
//# sourceMappingURL=LyricsCache.d.ts.map
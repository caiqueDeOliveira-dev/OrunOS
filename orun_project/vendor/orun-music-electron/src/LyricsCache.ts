import type Database from 'better-sqlite3';
import type { ILyricsProvider } from '@orun/music-core/interfaces';
import { CachedLyricsSchema, type CachedLyrics, type SyncedLyrics, type Track } from '@orun/music-core/schemas';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS orun_music_lyrics_cache (
    track_id TEXT PRIMARY KEY,
    lines TEXT NOT NULL,
    provider TEXT NOT NULL,
    translations TEXT NOT NULL DEFAULT '{}',
    cached_at INTEGER NOT NULL
  );
`;

interface Row {
  track_id: string; lines: string; provider: string; translations: string; cached_at: number;
}

/**
 * Minimal shape of the ai-router client this needs — matches
 * @orun/ai-router's `complete()`-style call. Adjust the import/method
 * name to whatever the real client exposes; this is intentionally kept
 * decoupled so it doesn't need to know about provider selection.
 */
export interface ITranslationClient {
  complete(prompt: string): Promise<string>;
}

export class LyricsCache {
  constructor(
    private readonly db: Database.Database,
    private readonly provider: ILyricsProvider,
    private readonly translationClient?: ITranslationClient, // omit to disable translation
  ) {
    this.db.exec(CREATE_TABLE);
  }

  async getLyrics(track: Track): Promise<CachedLyrics | null> {
    const cached = this.readCache(track.id);
    if (cached) return cached;

    const fetched = await this.provider.getSyncedLyrics(track);
    if (!fetched) return null;

    const entry: CachedLyrics = {
      trackId: track.id,
      lines: fetched.lines,
      provider: fetched.provider,
      translations: {},
      cachedAt: Date.now(),
    };
    this.writeCache(entry);
    return entry;
  }

  /**
   * Translates the already-fetched lyric lines into `locale`, caching the
   * result per track+locale so it's a one-time cost. This transforms text
   * the user already legitimately has via the lyrics provider — it does
   * not fetch or store lyrics from anywhere else.
   */
  async getTranslation(track: Track, locale: string): Promise<string[] | null> {
    if (!this.translationClient) return null;

    const cached = this.readCache(track.id);
    if (cached?.translations[locale]) return cached.translations[locale];

    const lyrics = cached ?? (await this.getLyrics(track));
    if (!lyrics || lyrics.lines.length === 0) return null;

    const translated: string[] = [];
    for (const line of lyrics.lines) {
      if (!line.text.trim()) { translated.push(''); continue; }
      const prompt = `Translate the following song lyric line to ${locale}. Return only the translated line, nothing else:\n\n${line.text}`;
      translated.push((await this.translationClient.complete(prompt)).trim());
    }

    const updated: CachedLyrics = {
      ...lyrics,
      translations: { ...lyrics.translations, [locale]: translated },
    };
    this.writeCache(updated);
    return translated;
  }

  private readCache(trackId: string): CachedLyrics | null {
    const row = this.db.prepare('SELECT * FROM orun_music_lyrics_cache WHERE track_id = ?').get(trackId) as Row | undefined;
    if (!row) return null;
    return CachedLyricsSchema.parse({
      trackId: row.track_id,
      lines: JSON.parse(row.lines),
      provider: row.provider,
      translations: JSON.parse(row.translations),
      cachedAt: row.cached_at,
    });
  }

  private writeCache(entry: CachedLyrics): void {
    const validated = CachedLyricsSchema.parse(entry);
    this.db.prepare(`
      INSERT INTO orun_music_lyrics_cache (track_id, lines, provider, translations, cached_at)
      VALUES (@trackId, @lines, @provider, @translations, @cachedAt)
      ON CONFLICT(track_id) DO UPDATE SET
        lines = excluded.lines, provider = excluded.provider,
        translations = excluded.translations, cached_at = excluded.cached_at
    `).run({
      trackId: validated.trackId,
      lines: JSON.stringify(validated.lines),
      provider: validated.provider,
      translations: JSON.stringify(validated.translations),
      cachedAt: validated.cachedAt,
    });
  }
}

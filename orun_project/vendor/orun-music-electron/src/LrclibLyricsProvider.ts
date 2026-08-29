import type { ILyricsProvider } from '@orun/music-core/interfaces';
import type { SyncedLyrics, Track } from '@orun/music-core/schemas';

const API_BASE = 'https://lrclib.net/api';

interface LrclibResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number; // seconds
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null; // LRC-formatted text, e.g. "[00:12.34]..."
}

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
export class LrclibLyricsProvider implements ILyricsProvider {
  async getSyncedLyrics(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null> {
    // 1. Try the exact-match endpoint first — fastest path, matches on
    //    title + artist + duration (LRCLIB accepts a small tolerance).
    const exact = await this.tryGet(track);
    if (exact) return exact;

    // 2. Fall back to search if the exact match misses (e.g. slightly
    //    different title formatting, remaster suffixes, etc).
    return this.trySearch(track);
  }

  private async tryGet(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null> {
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist,
      duration: String(Math.round(track.durationMs / 1000)),
    });

    const res = await fetch(`${API_BASE}/get?${params}`);
    if (!res.ok) return null; // 404 is expected when there's no exact match

    const data = (await res.json()) as LrclibResult;
    return this.toSyncedLyrics(data);
  }

  private async trySearch(track: Pick<Track, 'title' | 'artist' | 'durationMs'>): Promise<SyncedLyrics | null> {
    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist,
    });

    const res = await fetch(`${API_BASE}/search?${params}`);
    if (!res.ok) return null;

    const results = (await res.json()) as LrclibResult[];
    const best = results.find((r) => r.syncedLyrics) ?? null;
    return best ? this.toSyncedLyrics(best) : null;
  }

  private toSyncedLyrics(data: LrclibResult): SyncedLyrics | null {
    if (!data.syncedLyrics) return null; // some entries only have plain (unsynced) lyrics
    return {
      trackId: `${data.artistName}-${data.trackName}`, // caller should map to the real internal track id
      provider: 'lrclib' as SyncedLyrics['provider'],
      lines: parseLrc(data.syncedLyrics),
      fetchedAt: Date.now(),
    };
  }
}

/** Parses standard `[mm:ss.xx]` LRC timestamps into { timeMs, text } lines. */
function parseLrc(lrc: string): SyncedLyrics['lines'] {
  const lineRe = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)/;
  return lrc
    .split('\n')
    .map((raw) => {
      const m = raw.match(lineRe);
      if (!m) return null;
      const [, mm, ss, frac, text] = m;
      const fracMs = frac ? Number(frac.padEnd(3, '0').slice(0, 3)) : 0;
      const timeMs = (Number(mm) * 60 + Number(ss)) * 1000 + fracMs;
      return { timeMs, text };
    })
    .filter((l): l is { timeMs: number; text: string } => l !== null);
}

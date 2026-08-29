import type Database from 'better-sqlite3';
import { ListeningHistoryEntrySchema, type ListeningHistoryEntry } from '@orun/music-core/schemas';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS orun_music_history (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    artist TEXT NOT NULL,
    played_at INTEGER NOT NULL,
    ms_played INTEGER NOT NULL,
    completed INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_history_played_at ON orun_music_history(played_at);
  CREATE INDEX IF NOT EXISTS idx_history_track_id ON orun_music_history(track_id);
`;

export interface ListeningStats {
  totalMsPlayed: number;
  totalTracksPlayed: number;
  topTracks: { trackId: string; trackTitle: string; artist: string; playCount: number }[];
  topArtists: { artist: string; playCount: number }[];
  currentStreakDays: number;
}

export class ListeningHistoryStore {
  constructor(private readonly db: Database.Database) {
    this.db.exec(CREATE_TABLE);
  }

  /** Call this when a track finishes or is skipped, with however much of it actually played. */
  record(entry: Omit<ListeningHistoryEntry, 'id'>): void {
    const validated = ListeningHistoryEntrySchema.parse({ ...entry, id: `hist-${entry.playedAt}-${entry.trackId}` });
    this.db.prepare(`
      INSERT INTO orun_music_history (id, track_id, track_title, artist, played_at, ms_played, completed)
      VALUES (@id, @trackId, @trackTitle, @artist, @playedAt, @msPlayed, @completed)
    `).run({ ...validated, completed: validated.completed ? 1 : 0 });
  }

  getStats(sinceMs = Date.now() - 30 * 24 * 60 * 60 * 1000): ListeningStats {
    const totals = this.db.prepare(
      `SELECT COALESCE(SUM(ms_played), 0) as totalMs, COUNT(*) as totalTracks
       FROM orun_music_history WHERE played_at >= ?`,
    ).get(sinceMs) as { totalMs: number; totalTracks: number };

    const topTracks = this.db.prepare(`
      SELECT track_id as trackId, track_title as trackTitle, artist, COUNT(*) as playCount
      FROM orun_music_history WHERE played_at >= ?
      GROUP BY track_id ORDER BY playCount DESC LIMIT 10
    `).all(sinceMs) as ListeningStats['topTracks'];

    const topArtists = this.db.prepare(`
      SELECT artist, COUNT(*) as playCount
      FROM orun_music_history WHERE played_at >= ?
      GROUP BY artist ORDER BY playCount DESC LIMIT 10
    `).all(sinceMs) as ListeningStats['topArtists'];

    return {
      totalMsPlayed: totals.totalMs,
      totalTracksPlayed: totals.totalTracks,
      topTracks,
      topArtists,
      currentStreakDays: this.computeStreak(),
    };
  }

  private computeStreak(): number {
    const rows = this.db.prepare(
      `SELECT DISTINCT date(played_at / 1000, 'unixepoch') as day FROM orun_music_history ORDER BY day DESC`,
    ).all() as { day: string }[];

    if (rows.length === 0) return 0;

    let streak = 0;
    let cursor = new Date();
    for (const { day } of rows) {
      const expected = cursor.toISOString().slice(0, 10);
      if (day !== expected) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}

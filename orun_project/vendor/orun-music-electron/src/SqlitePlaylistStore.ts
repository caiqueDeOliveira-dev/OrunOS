import type Database from 'better-sqlite3';
import type { IPlaylistStore } from '@orun/music-core/interfaces';
import { PlaylistSchema, type Playlist } from '@orun/music-core/schemas';

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS orun_music_playlists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    track_ids TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'orun',
    spotify_id TEXT,
    synced_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

interface Row {
  id: string; title: string; description: string; track_ids: string;
  source: string; spotify_id: string | null; synced_at: number | null;
  created_at: number; updated_at: number;
}

export class SqlitePlaylistStore implements IPlaylistStore {
  constructor(private readonly db: Database.Database) {
    this.db.exec(CREATE_TABLE);
  }

  async list(): Promise<Playlist[]> {
    const rows = this.db.prepare('SELECT * FROM orun_music_playlists ORDER BY updated_at DESC').all() as Row[];
    return rows.map(rowToPlaylist);
  }

  async get(id: string): Promise<Playlist | null> {
    const row = this.db.prepare('SELECT * FROM orun_music_playlists WHERE id = ?').get(id) as Row | undefined;
    return row ? rowToPlaylist(row) : null;
  }

  async upsert(playlist: Playlist): Promise<void> {
    const validated = PlaylistSchema.parse(playlist);
    this.db.prepare(`
      INSERT INTO orun_music_playlists (id, title, description, track_ids, source, spotify_id, synced_at, created_at, updated_at)
      VALUES (@id, @title, @description, @trackIds, @source, @spotifyId, @syncedAt, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, description = excluded.description, track_ids = excluded.track_ids,
        source = excluded.source, spotify_id = excluded.spotify_id, synced_at = excluded.synced_at,
        updated_at = excluded.updated_at
    `).run({
      id: validated.id,
      title: validated.title,
      description: validated.description,
      trackIds: JSON.stringify(validated.trackIds),
      source: validated.source,
      spotifyId: validated.spotifyId,
      syncedAt: validated.syncedAt,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });
  }

  async remove(id: string): Promise<void> {
    this.db.prepare('DELETE FROM orun_music_playlists WHERE id = ?').run(id);
  }
}

function rowToPlaylist(row: Row): Playlist {
  return PlaylistSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    trackIds: JSON.parse(row.track_ids),
    source: row.source,
    spotifyId: row.spotify_id,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

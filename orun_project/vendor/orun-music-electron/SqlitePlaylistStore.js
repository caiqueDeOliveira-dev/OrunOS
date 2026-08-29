import { PlaylistSchema } from '@orun/music-core/schemas';
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
export class SqlitePlaylistStore {
    db;
    constructor(db) {
        this.db = db;
        this.db.exec(CREATE_TABLE);
    }
    async list() {
        const rows = this.db.prepare('SELECT * FROM orun_music_playlists ORDER BY updated_at DESC').all();
        return rows.map(rowToPlaylist);
    }
    async get(id) {
        const row = this.db.prepare('SELECT * FROM orun_music_playlists WHERE id = ?').get(id);
        return row ? rowToPlaylist(row) : null;
    }
    async upsert(playlist) {
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
    async remove(id) {
        this.db.prepare('DELETE FROM orun_music_playlists WHERE id = ?').run(id);
    }
}
function rowToPlaylist(row) {
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
//# sourceMappingURL=SqlitePlaylistStore.js.map
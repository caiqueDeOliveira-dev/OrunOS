import type Database from 'better-sqlite3';
import type { IPlaylistStore } from '@orun/music-core/interfaces';
import { type Playlist } from '@orun/music-core/schemas';
export declare class SqlitePlaylistStore implements IPlaylistStore {
    private readonly db;
    constructor(db: Database.Database);
    list(): Promise<Playlist[]>;
    get(id: string): Promise<Playlist | null>;
    upsert(playlist: Playlist): Promise<void>;
    remove(id: string): Promise<void>;
}
//# sourceMappingURL=SqlitePlaylistStore.d.ts.map
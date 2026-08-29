import type Database from 'better-sqlite3';
import { type ListeningHistoryEntry } from '@orun/music-core/schemas';
export interface ListeningStats {
    totalMsPlayed: number;
    totalTracksPlayed: number;
    topTracks: {
        trackId: string;
        trackTitle: string;
        artist: string;
        playCount: number;
    }[];
    topArtists: {
        artist: string;
        playCount: number;
    }[];
    currentStreakDays: number;
}
export declare class ListeningHistoryStore {
    private readonly db;
    constructor(db: Database.Database);
    /** Call this when a track finishes or is skipped, with however much of it actually played. */
    record(entry: Omit<ListeningHistoryEntry, 'id'>): void;
    getStats(sinceMs?: number): ListeningStats;
    private computeStreak;
}
//# sourceMappingURL=ListeningHistoryStore.d.ts.map
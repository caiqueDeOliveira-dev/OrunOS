import type { IPlaylistSync } from '@orun/music-core/interfaces';
import type { Playlist, Track } from '@orun/music-core/schemas';
export declare class SpotifyPlaylistSync implements IPlaylistSync {
    private readonly getAccessToken;
    private readonly getUserId;
    constructor(getAccessToken: () => Promise<string>, // ← plug in last
    getUserId: () => Promise<string>);
    private request;
    resolveTrackUri(title: string, artist: string): Promise<string | null>;
    exportToSpotify(playlist: Playlist, tracks: Track[]): Promise<{
        spotifyId: string;
    }>;
    syncPlaylist(playlist: Playlist, tracks: Track[]): Promise<void>;
    importFromSpotify(): Promise<{
        playlists: Playlist[];
        tracks: Track[];
    }>;
    private resolveAllUris;
    private addTracksInBatches;
}
//# sourceMappingURL=SpotifyPlaylistSync.d.ts.map
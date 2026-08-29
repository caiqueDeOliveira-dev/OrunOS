import type { ISpotifyPlayer, IPlaylistSync, ILyricsProvider, IPlaylistStore } from '@orun/music-core/interfaces';
import type { Track } from '@orun/music-core/schemas';
export declare function useSpotifyPlayer(player: ISpotifyPlayer): {
    state: {
        isPlaying: boolean;
        trackId: string | null;
        trackName: string | null;
        artistName: string | null;
        albumName: string | null;
        albumArtUrl: string | null;
        positionMs: number;
        durationMs: number;
        volume: number;
        deviceId: string | null;
    } | null;
    connected: boolean;
    connecting: boolean;
    connect: () => Promise<boolean>;
    play: (uri?: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    seek: (positionMs: number) => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    skipNext: () => Promise<void>;
    skipPrevious: () => Promise<void>;
};
export declare function usePlaylists(store: IPlaylistStore, sync: IPlaylistSync): {
    playlists: {
        id: string;
        title: string;
        description: string;
        trackIds: string[];
        source: "orun" | "spotify";
        spotifyId: string | null;
        syncedAt: number | null;
        createdAt: number;
        updatedAt: number;
    }[];
    loading: boolean;
    syncMessage: string;
    create: (title: string, description?: string) => Promise<{
        id: string;
        title: string;
        description: string;
        trackIds: string[];
        source: "orun" | "spotify";
        spotifyId: string | null;
        syncedAt: number | null;
        createdAt: number;
        updatedAt: number;
    }>;
    addTrack: (playlistId: string, trackId: string) => Promise<void>;
    removeTrack: (playlistId: string, trackId: string) => Promise<void>;
    exportToSpotify: (playlistId: string, tracks: Track[]) => Promise<void>;
    importFromSpotify: () => Promise<void>;
    refresh: () => Promise<void>;
};
export declare function useSyncedLyrics(provider: ILyricsProvider, track: Track | null, positionMs: number): {
    lyrics: {
        trackId: string;
        provider: "musixmatch" | "lrclib" | "none";
        lines: {
            timeMs: number;
            text: string;
        }[];
        fetchedAt: number;
    } | null;
    currentLineIndex: number;
};
//# sourceMappingURL=hooks.d.ts.map
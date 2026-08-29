declare global {
    interface Window {
        orunMusicBridge: {
            getSpotifyAccessToken: () => Promise<string>;
            getSpotifyUserId: () => Promise<string>;
            getMusixmatchApiKey: () => Promise<string>;
        };
    }
}
export {};
//# sourceMappingURL=preload.d.ts.map
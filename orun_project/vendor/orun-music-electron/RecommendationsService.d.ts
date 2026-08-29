import type { Track } from '@orun/music-core/schemas';
export declare class RecommendationsService {
    private readonly getAccessToken;
    constructor(getAccessToken: () => Promise<string>);
    private request;
    /** "Rádio a partir de uma faixa" — up to 5 seed tracks/artists/genres per Spotify's API limit. */
    getRadio(opts: {
        seedTrackIds?: string[];
        seedArtistIds?: string[];
        seedGenres?: string[];
        limit?: number;
    }): Promise<Track[]>;
    /** Convenience: "toca uma rádio parecida com essa faixa/playlist que estou ouvindo agora". */
    getRadioFromNowPlaying(trackId: string, artistId: string): Promise<Track[]>;
}
//# sourceMappingURL=RecommendationsService.d.ts.map
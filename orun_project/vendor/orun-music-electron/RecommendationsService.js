const API_BASE = 'https://api.spotify.com/v1';
export class RecommendationsService {
    getAccessToken;
    constructor(getAccessToken) {
        this.getAccessToken = getAccessToken;
    } // ← plug in last
    async request(path) {
        const token = await this.getAccessToken();
        const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok)
            throw new Error(`Spotify API ${path} failed: ${res.status}`);
        return (await res.json());
    }
    /** "Rádio a partir de uma faixa" — up to 5 seed tracks/artists/genres per Spotify's API limit. */
    async getRadio(opts) {
        const params = new URLSearchParams({ limit: String(opts.limit ?? 25) });
        if (opts.seedTrackIds?.length)
            params.set('seed_tracks', opts.seedTrackIds.slice(0, 5).join(','));
        if (opts.seedArtistIds?.length)
            params.set('seed_artists', opts.seedArtistIds.slice(0, 5).join(','));
        if (opts.seedGenres?.length)
            params.set('seed_genres', opts.seedGenres.slice(0, 5).join(','));
        const data = await this.request(`/recommendations?${params}`);
        return data.tracks.map(mapTrack);
    }
    /** Convenience: "toca uma rádio parecida com essa faixa/playlist que estou ouvindo agora". */
    async getRadioFromNowPlaying(trackId, artistId) {
        return this.getRadio({ seedTrackIds: [trackId], seedArtistIds: [artistId] });
    }
}
function mapTrack(t) {
    return {
        id: t.id,
        spotifyUri: t.uri,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album: t.album.name,
        durationMs: t.duration_ms,
        albumArtUrl: t.album.images[0]?.url ?? null,
    };
}
//# sourceMappingURL=RecommendationsService.js.map
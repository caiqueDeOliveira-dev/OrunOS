const API_BASE = 'https://api.musixmatch.com/ws/1.1';
/**
 * Requires a Musixmatch API key with access to the "subtitle" (synced
 * lyrics) endpoints — the free tier only covers unsynced lyrics snippets.
 * Commercial/karaoke-style display of synced lyrics needs their commercial
 * licensing tier; confirm terms before shipping this beyond personal use.
 *
 * This class only ever returns whatever the provider's API hands back —
 * it does not store, cache to disk, or bundle any lyric text itself.
 */
export class MusixmatchLyricsProvider {
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
    } // ← plug in last, via ISecretStore
    async getSyncedLyrics(track) {
        const key = await this.apiKey();
        const params = new URLSearchParams({
            q_track: track.title,
            q_artist: track.artist,
            apikey: key,
        });
        const matchRes = await fetch(`${API_BASE}/matcher.track.get?${params}`);
        if (!matchRes.ok)
            return null;
        const matchData = await matchRes.json();
        const trackId = matchData?.message?.body?.track?.track_id;
        if (!trackId)
            return null;
        const subtitleRes = await fetch(`${API_BASE}/track.subtitle.get?track_id=${trackId}&subtitle_format=lrc&apikey=${key}`);
        if (!subtitleRes.ok)
            return null;
        const subtitleData = await subtitleRes.json();
        const lrc = subtitleData?.message?.body?.subtitle?.subtitle_body;
        if (!lrc)
            return null;
        return {
            trackId: track.title, // caller should replace with the real internal track id
            provider: 'musixmatch',
            lines: parseLrc(lrc),
            fetchedAt: Date.now(),
        };
    }
}
/** Parses standard `[mm:ss.xx]` LRC timestamps into { timeMs, text } lines. */
function parseLrc(lrc) {
    const lineRe = /\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]\s*(.*)/;
    return lrc
        .split('\n')
        .map((raw) => {
        const m = raw.match(lineRe);
        if (!m)
            return null;
        const [, mm, ss, cs, text] = m;
        const timeMs = (Number(mm) * 60 + Number(ss)) * 1000 + Number(cs ?? 0) * 10;
        return { timeMs, text };
    })
        .filter((l) => l !== null);
}
//# sourceMappingURL=MusixmatchLyricsProvider.js.map
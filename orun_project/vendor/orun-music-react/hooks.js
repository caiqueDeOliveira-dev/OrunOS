import { useCallback, useEffect, useRef, useState } from 'react';
export function useSpotifyPlayer(player) {
    const [state, setState] = useState(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    useEffect(() => {
        const unsubscribe = player.onStateChange(setState);
        return unsubscribe;
    }, [player]);
    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            const ok = await player.connect();
            setConnected(ok);
            if (ok)
                setState(await player.getState());
            return ok;
        }
        finally {
            setConnecting(false);
        }
    }, [player]);
    useEffect(() => () => player.disconnect(), [player]);
    return {
        state,
        connected,
        connecting,
        connect,
        play: player.play.bind(player),
        pause: player.pause.bind(player),
        resume: player.resume.bind(player),
        seek: player.seek.bind(player),
        setVolume: player.setVolume.bind(player),
        skipNext: player.skipNext.bind(player),
        skipPrevious: player.skipPrevious.bind(player),
    };
}
export function usePlaylists(store, sync) {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncMessage, setSyncMessage] = useState('');
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setPlaylists(await store.list());
        }
        finally {
            setLoading(false);
        }
    }, [store]);
    useEffect(() => { refresh(); }, [refresh]);
    const create = useCallback(async (title, description = '') => {
        const now = Date.now();
        const playlist = {
            id: `local-${now}`, title, description, trackIds: [],
            source: 'orun', spotifyId: null, syncedAt: null, createdAt: now, updatedAt: now,
        };
        await store.upsert(playlist);
        await refresh();
        return playlist;
    }, [store, refresh]);
    const addTrack = useCallback(async (playlistId, trackId) => {
        const playlist = await store.get(playlistId);
        if (!playlist || playlist.trackIds.includes(trackId))
            return;
        await store.upsert({ ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: Date.now() });
        await refresh();
    }, [store, refresh]);
    const removeTrack = useCallback(async (playlistId, trackId) => {
        const playlist = await store.get(playlistId);
        if (!playlist)
            return;
        await store.upsert({ ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() });
        await refresh();
    }, [store, refresh]);
    const exportToSpotify = useCallback(async (playlistId, tracks) => {
        const playlist = await store.get(playlistId);
        if (!playlist)
            return;
        const { spotifyId } = await sync.exportToSpotify(playlist, tracks);
        await store.upsert({ ...playlist, spotifyId, syncedAt: Date.now() });
        await refresh();
        setSyncMessage('Playlist enviada para o Spotify.');
        setTimeout(() => setSyncMessage(''), 2600);
    }, [store, sync, refresh]);
    const importFromSpotify = useCallback(async () => {
        const { playlists: imported } = await sync.importFromSpotify();
        for (const p of imported)
            await store.upsert(p);
        await refresh();
        setSyncMessage(`${imported.length} playlists importadas do Spotify.`);
        setTimeout(() => setSyncMessage(''), 2600);
    }, [store, sync, refresh]);
    return { playlists, loading, syncMessage, create, addTrack, removeTrack, exportToSpotify, importFromSpotify, refresh };
}
export function useSyncedLyrics(provider, track, positionMs) {
    const [lyrics, setLyrics] = useState(null);
    const cache = useRef(new Map());
    useEffect(() => {
        if (!track) {
            setLyrics(null);
            return;
        }
        let cancelled = false;
        const cached = cache.current.get(track.id);
        if (cached !== undefined) {
            setLyrics(cached);
            return;
        }
        provider.getSyncedLyrics(track).then((result) => {
            if (cancelled)
                return;
            cache.current.set(track.id, result);
            setLyrics(result);
        });
        return () => { cancelled = true; };
    }, [provider, track]);
    const currentLineIndex = lyrics
        ? lyrics.lines.reduce((acc, line, i) => (positionMs >= line.timeMs ? i : acc), -1)
        : -1;
    return { lyrics, currentLineIndex };
}
//# sourceMappingURL=hooks.js.map
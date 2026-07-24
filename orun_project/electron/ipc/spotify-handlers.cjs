// electron/ipc/spotify-handlers.cjs
//
// Spotify IPC handlers — supports two modes:
// 1. Direct mode (SpotifyClient) — requires Spotify Premium for playback
// 2. n8n mode (SpotifyN8n) — works without Premium for search/playlists,
//    playback control available when Premium is activated later

const { SpotifyClient } = require("../spotify-client.cjs");
const { SpotifyN8n } = require("../spotify-n8n.cjs");

let _handleSpotifyAction = null;

let spotifyDirect = null;
let spotifyN8n = null;

function register(ipcMain, ctx) {
  const { secretStore, log, db } = ctx;

  spotifyDirect = new SpotifyClient();
  spotifyDirect.setLogger(log);

  spotifyN8n = new SpotifyN8n();
  spotifyN8n.setLogger(log);

  // ── Mode detection: prefer n8n when configured ──────────────
  function useN8n() {
    return spotifyN8n.isConfigured();
  }

  async function callOrFallback(action, n8nFn, directFn) {
    if (useN8n()) {
      try { return await n8nFn(); }
      catch (err) {
        log.warn(`[spotify] n8n ${action} failed, trying direct:`, err.message);
        if (directFn) return await directFn();
        throw err;
      }
    } else {
      return await directFn();
    }
  }

  // ── n8n Webhook URL ─────────────────────────────────────────
  ipcMain.handle("spotify:get-n8n-webhook", () => {
    return db.getSetting("spotify_n8n_webhook", "");
  });

  ipcMain.handle("spotify:set-n8n-webhook", (_e, url) => {
    db.setSetting("spotify_n8n_webhook", url);
    spotifyN8n.setWebhook(url);
    return { ok: true };
  });

  // ── Connection / OAuth ──────────────────────────────────────
  ipcMain.handle("spotify:get-credentials", async () => {
    try {
      const creds = await secretStore.get("spotify_credentials");
      return creds || { clientId: "", clientSecret: "" };
    } catch { return { clientId: "", clientSecret: "" }; }
  });

  ipcMain.handle("spotify:set-credentials", async (_e, clientId, clientSecret) => {
    await secretStore.set("spotify_credentials", { clientId, clientSecret });
    spotifyDirect.setCredentials(clientId, clientSecret);
    return { ok: true };
  });

  ipcMain.handle("spotify:get-auth-url", async () => {
    try {
      if (!spotifyDirect.clientId) throw new Error("Missing Client ID — set credentials first");
      return spotifyDirect.getAuthUrl();
    } catch (err) {
      return { url: null, error: err.message };
    }
  });

  ipcMain.handle("spotify:start-callback-server", async () => {
    try {
      // Override the token handler to also set the token on n8n module
      const origOnToken = spotifyDirect._onTokenCallback;
      spotifyDirect._onTokenCallback = async (tokens) => {
        if (origOnToken) await origOnToken(tokens);
        spotifyN8n.setAccessToken(tokens.accessToken);
        await secretStore.set("spotify_tokens", {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          savedAt: Date.now(),
        });
      };
      await spotifyDirect.startCallbackServer();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("spotify:stop-callback-server", async () => {
    spotifyDirect.stopCallbackServer();
    return { ok: true };
  });

  ipcMain.handle("spotify:save-tokens", async (_e, accessToken, refreshToken, expiresIn) => {
    await secretStore.set("spotify_tokens", { accessToken, refreshToken, expiresIn, savedAt: Date.now() });
    spotifyDirect.setTokens(accessToken, refreshToken, expiresIn);
    spotifyN8n.setAccessToken(accessToken);
    return { ok: true };
  });

  ipcMain.handle("spotify:load-tokens", async () => {
    try {
      const tokens = await secretStore.get("spotify_tokens");
      if (tokens) {
        const creds = await secretStore.get("spotify_credentials");
        if (creds?.clientId) spotifyDirect.setCredentials(creds.clientId, creds.clientSecret);
        spotifyDirect.setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        spotifyN8n.setAccessToken(tokens.accessToken);
        return { ok: true, connected: spotifyDirect.isConnected() };
      }
      return { ok: true, connected: false };
    } catch { return { ok: true, connected: false }; }
  });

  ipcMain.handle("spotify:is-connected", async () => {
    return spotifyDirect.isConnected();
  });

  ipcMain.handle("spotify:disconnect", async () => {
    spotifyDirect.disconnect();
    spotifyN8n.setAccessToken("");
    await secretStore.delete("spotify_tokens");
    return { ok: true };
  });

  // ── Playback ────────────────────────────────────────────────
  ipcMain.handle("spotify:get-playback", async () => {
    try {
      return await callOrFallback("getPlayback",
        () => spotifyN8n.getCurrentlyPlaying(),
        () => spotifyDirect.getPlayback()
      );
    } catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("spotify:get-currently-playing", async () => {
    try {
      return await callOrFallback("getCurrentlyPlaying",
        () => spotifyN8n.getCurrentlyPlaying(),
        () => spotifyDirect.getCurrentlyPlaying()
      );
    } catch { return null; }
  });

  ipcMain.handle("spotify:play", async (_e, options) => {
    try {
      await callOrFallback("play",
        () => spotifyN8n.play(options || {}),
        () => spotifyDirect.play(options || {})
      );
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:pause", async (_e, deviceId) => {
    try {
      await callOrFallback("pause",
        () => spotifyN8n.pause(),
        () => spotifyDirect.pause(deviceId)
      );
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:skip-next", async (_e, deviceId) => {
    try {
      await callOrFallback("skipNext",
        () => spotifyN8n.skipNext(),
        () => spotifyDirect.skipNext(deviceId)
      );
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:skip-previous", async (_e, deviceId) => {
    try {
      await callOrFallback("skipPrevious",
        () => spotifyN8n.skipPrevious(),
        () => spotifyDirect.skipPrevious(deviceId)
      );
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:seek", async (_e, positionMs, deviceId) => {
    try {
      await spotifyDirect.seek(positionMs, deviceId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:set-volume", async (_e, volume, deviceId) => {
    try {
      await spotifyDirect.setVolume(volume, deviceId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:set-shuffle", async (_e, state, deviceId) => {
    try {
      await spotifyDirect.setShuffle(state, deviceId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("spotify:set-repeat", async (_e, state, deviceId) => {
    try {
      await spotifyDirect.setRepeat(state, deviceId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ── Devices ─────────────────────────────────────────────────
  ipcMain.handle("spotify:get-devices", async () => {
    try {
      return await callOrFallback("getDevices",
        () => spotifyN8n.getDevices(),
        () => spotifyDirect.getDevices()
      );
    } catch (err) { return []; }
  });

  ipcMain.handle("spotify:transfer-playback", async (_e, deviceId) => {
    try {
      await spotifyDirect.transferPlayback(deviceId);
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ── Search ──────────────────────────────────────────────────
  ipcMain.handle("spotify:search", async (_e, query, types, limit) => {
    try {
      return await callOrFallback("search",
        () => spotifyN8n.search(query, types, limit),
        () => spotifyDirect.search(query, types, limit)
      );
    } catch (err) { return { error: err.message }; }
  });

  // ── Playlists ──────────────────────────────────────────────
  ipcMain.handle("spotify:get-playlists", async (_e, limit) => {
    try {
      return await callOrFallback("getPlaylists",
        () => spotifyN8n.getPlaylists(limit),
        () => spotifyDirect.getMyPlaylists(limit)
      );
    } catch (err) { return []; }
  });

  ipcMain.handle("spotify:get-playlist", async (_e, playlistId) => {
    try {
      return await callOrFallback("getPlaylist",
        () => spotifyN8n.getPlaylistTracks(playlistId),
        () => spotifyDirect.getPlaylist(playlistId)
      );
    } catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("spotify:get-playlist-tracks", async (_e, playlistId, limit, offset) => {
    try {
      return await callOrFallback("getPlaylistTracks",
        () => spotifyN8n.getPlaylistTracks(playlistId, limit),
        () => spotifyDirect.getPlaylistTracks(playlistId, limit, offset)
      );
    } catch (err) { return []; }
  });

  ipcMain.handle("spotify:create-playlist", async (_e, name, description, isPublic) => {
    try {
      return await spotifyDirect.createPlaylist(name, description, isPublic);
    } catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("spotify:add-to-queue", async (_e, uri) => {
    try {
      await callOrFallback("addToQueue",
        () => spotifyN8n.addToQueue(uri),
        () => spotifyDirect.addToQueue(uri)
      );
      return { ok: true };
    } catch (err) { return { ok: false, error: err.message }; }
  });

  // ── Queue ───────────────────────────────────────────────────
  ipcMain.handle("spotify:get-queue", async () => {
    try {
      return await callOrFallback("getQueue",
        () => spotifyN8n.getQueue(),
        () => spotifyDirect.getQueue()
      );
    } catch (err) { return { error: err.message }; }
  });

  // ── User ────────────────────────────────────────────────────
  ipcMain.handle("spotify:get-me", async () => {
    try {
      return await callOrFallback("getMe",
        () => spotifyN8n.getMe(),
        () => spotifyDirect.getMe()
      );
    } catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("spotify:get-top-tracks", async (_e, limit, timeRange) => {
    try {
      return await callOrFallback("getTopTracks",
        () => spotifyN8n.getTopTracks(limit, timeRange),
        () => spotifyDirect.getTopTracks(limit, timeRange)
      );
    } catch (err) { return []; }
  });

  ipcMain.handle("spotify:get-recently-played", async (_e, limit) => {
    try {
      return await callOrFallback("getRecentlyPlayed",
        () => spotifyN8n.getRecentlyPlayed(limit),
        () => spotifyDirect.getRecentlyPlayed(limit)
      );
    } catch (err) { return []; }
  });

  // ── Restore on startup ─────────────────────────────────────
  (async () => {
    try {
      const creds = await secretStore.get("spotify_credentials");
      const tokens = await secretStore.get("spotify_tokens");
      const n8nWebhook = db.getSetting("spotify_n8n_webhook", "");
      if (creds?.clientId) spotifyDirect.setCredentials(creds.clientId, creds.clientSecret);
      if (tokens) {
        spotifyDirect.setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
        spotifyN8n.setAccessToken(tokens.accessToken);
      }
      if (n8nWebhook) spotifyN8n.setWebhook(n8nWebhook);
    } catch { /* ignore */ }
  })();

  // ── Direct action handler for tools.cjs ─────────────────────────────
  _handleSpotifyAction = async function handleSpotifyAction(action, payload) {
    try {
      switch (action) {
        case "search": {
          const { query, types, limit } = payload;
          const result = await callOrFallback("search",
            () => spotifyN8n.search(query, types, limit),
            () => spotifyDirect.search(query, types, limit)
          );
          if (result?.tracks?.items) return { items: result.tracks.items.map(t => ({ name: t.name, artists: t.artists?.map(a=>a.name).join(", "), uri: t.uri, id: t.id, duration_ms: t.duration_ms })) };
          return result;
        }
        case "play": {
          const { uris, deviceId } = payload;
          await callOrFallback("play",
            () => spotifyN8n.play({ uris, deviceId }),
            () => spotifyDirect.play({ uris, deviceId })
          );
          return { success: true };
        }
        case "pause": {
          await callOrFallback("pause",
            () => spotifyN8n.pause(payload?.deviceId),
            () => spotifyDirect.pause(payload?.deviceId)
          );
          return { success: true };
        }
        case "skip_next": {
          await callOrFallback("skipNext",
            () => spotifyN8n.skipNext(payload?.deviceId),
            () => spotifyDirect.skipNext(payload?.deviceId)
          );
          return { success: true };
        }
        case "skip_previous": {
          await callOrFallback("skipPrevious",
            () => spotifyN8n.skipPrevious(payload?.deviceId),
            () => spotifyDirect.skipPrevious(payload?.deviceId)
          );
          return { success: true };
        }
        case "set_volume": {
          await callOrFallback("setVolume",
            () => spotifyN8n.setVolume(payload.volume, payload?.deviceId),
            () => spotifyDirect.setVolume(payload.volume, payload?.deviceId)
          );
          return { success: true };
        }
        case "seek": {
          await callOrFallback("seek",
            () => spotifyN8n.seek(payload.position_ms, payload?.deviceId),
            () => spotifyDirect.seek(payload.position_ms, payload?.deviceId)
          );
          return { success: true };
        }
        case "set_shuffle": {
          await callOrFallback("setShuffle",
            () => spotifyN8n.setShuffle(payload.state, payload?.deviceId),
            () => spotifyDirect.setShuffle(payload.state, payload?.deviceId)
          );
          return { success: true };
        }
        case "set_repeat": {
          await callOrFallback("setRepeat",
            () => spotifyN8n.setRepeat(payload.state, payload?.deviceId),
            () => spotifyDirect.setRepeat(payload.state, payload?.deviceId)
          );
          return { success: true };
        }
        case "get_now_playing": {
          const np = await callOrFallback("getCurrentlyPlaying",
            () => spotifyN8n.getCurrentlyPlaying(),
            () => spotifyDirect.getCurrentlyPlaying()
          );
          if (!np || !np.item) return { playing: false };
          return { playing: true, name: np.item.name, artist: np.item.artists?.[0]?.name, album: np.item.album?.name, progress_ms: np.progress_ms, duration_ms: np.item.duration_ms, uri: np.item.uri };
        }
        case "get_playlists": {
          const pls = await callOrFallback("getPlaylists",
            () => spotifyN8n.getPlaylists(payload?.limit),
            () => spotifyDirect.getPlaylists(payload?.limit)
          );
          if (Array.isArray(pls)) return { items: pls.map(p => ({ name: p.name, id: p.id, tracks: p.tracks?.total || 0, uri: p.uri })) };
          return pls;
        }
        case "search_and_play": {
          const { query: q, types: t, limit: l } = payload;
          const searchRes = await callOrFallback("search",
            () => spotifyN8n.search(q, t || "track", l || 5),
            () => spotifyDirect.search(q, t || "track", l || 5)
          );
          const tracks = searchRes?.tracks?.items;
          if (!tracks || tracks.length === 0) return { error: "No results found" };
          const firstTrack = tracks[0];
          await callOrFallback("play",
            () => spotifyN8n.play({ uris: [firstTrack.uri] }),
            () => spotifyDirect.play({ uris: [firstTrack.uri] })
          );
          return { success: true, playing: firstTrack.name, artist: firstTrack.artists?.[0]?.name, uri: firstTrack.uri };
        }
        case "add_to_playlist": {
          const { playlistId, uris } = payload;
          if (!playlistId || !uris || !uris.length) return { error: "playlistId and uris are required" };
          await spotifyDirect.addTracksToPlaylist(playlistId, uris);
          return { success: true, added: uris.length };
        }
        case "get_playlist_tracks": {
          const { playlistId: plId, limit: plLimit, offset: plOffset } = payload;
          const plTracks = await spotifyDirect.getPlaylistTracks(plId, plLimit || 100, plOffset || 0);
          return { items: plTracks.map(t => ({ name: t.track?.name, artists: t.track?.artists?.map(a=>a.name).join(", "), uri: t.track?.uri, id: t.track?.id })) };
        }
        default:
          return { error: `Unknown spotify action: ${action}` };
      }
    } catch (err) {
      return { error: err.message };
    }
  };
}

// ── Export for tools.cjs ─────────────────────────────────────
function handleSpotifyAction(action, payload) {
  if (!_handleSpotifyAction) return { error: "Spotify handlers not initialized" };
  return _handleSpotifyAction(action, payload);
}

module.exports = { register, handleSpotifyAction };

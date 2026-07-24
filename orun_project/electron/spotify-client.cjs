const https = require("https");
const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_AUTH = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";
const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-library-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-top-read",
  "streaming",
].join(" ");

class SpotifyClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = "http://127.0.0.1:9222/callback";
    this.server = null;
    this.log = console;
    this._onTokenCallback = null;
  }

  setLogger(log) {
    this.log = log || console;
  }

  setCredentials(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + (expiresIn || 3600) * 1000;
  }

  isConnected() {
    return Boolean(this.accessToken && Date.now() < this.expiresAt);
  }

  async ensureToken() {
    if (this.isConnected()) return true;
    if (this.refreshToken && this.clientId && this.clientSecret) {
      await this.refreshAccessToken();
      return this.isConnected();
    }
    return false;
  }

  // ── OAuth2 Authorization ──────────────────────────────────────
  getAuthUrl() {
    const state = crypto.randomBytes(16).toString("hex");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: SCOPES,
      redirect_uri: this.redirectUri,
      state,
      show_dialog: "true",
    });
    return { url: `${SPOTIFY_AUTH}?${params.toString()}`, state };
  }

  async startCallbackServer() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }
      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:9222`);
        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          if (error) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>❌ Erro: ${error}</h2></body></html>`);
            return;
          }
          if (code) {
            try {
              await this.exchangeCode(code);
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>✅ Spotify conectado! Pode fechar esta janela.</h2></body></html>`);
              this.log.info("[spotify] OAuth tokens received successfully");
            } catch (err) {
              res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
              res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>❌ Erro ao conectar: ${err.message}</h2></body></html>`);
              this.log.error("[spotify] Token exchange failed:", err.message);
            }
          }
        }
      });
      this.server.listen(9222, "127.0.0.1", () => {
        this.log.info("[spotify] Callback server listening on :9222");
        resolve();
      });
      this.server.on("error", reject);
    });
  }

  stopCallbackServer() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async exchangeCode(code) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
    });
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const data = await this._postToken(body, auth);
    this.setTokens(data.access_token, data.refresh_token, data.expires_in);
    if (this._onTokenCallback) {
      await this._onTokenCallback({ accessToken: this.accessToken, refreshToken: this.refreshToken, expiresIn: data.expires_in });
    }
    return { accessToken: this.accessToken, refreshToken: this.refreshToken, expiresIn: data.expires_in };
  }

  async refreshAccessToken() {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) return false;
    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      });
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
      const data = await this._postToken(body, auth);
      this.setTokens(data.access_token, this.refreshToken, data.expires_in);
      if (data.refresh_token) this.refreshToken = data.refresh_token;
      return true;
    } catch (err) {
      this.log.error("[spotify] Token refresh failed:", err.message);
      return false;
    }
  }

  _postToken(body, authHeader) {
    return new Promise((resolve, reject) => {
      const postData = body.toString();
      const req = https.request(SPOTIFY_TOKEN, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authHeader}`,
          "Content-Length": Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error_description || json.error));
            else resolve(json);
          } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.write(postData);
      req.end();
    });
  }

  // ── API Methods ───────────────────────────────────────────────
  async _get(path) {
    await this.ensureToken();
    if (!this.accessToken) throw new Error("Spotify não conectado");
    return new Promise((resolve, reject) => {
      const url = new URL(`${SPOTIFY_API}${path}`);
      https.get(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode === 401) {
              this.refreshAccessToken().then(() => this._get(path)).then(resolve).catch(reject);
              return;
            }
            if (res.statusCode === 204) resolve(null);
            else if (json.error) reject(new Error(json.error.message || JSON.stringify(json.error)));
            else resolve(json);
          } catch (e) { reject(e); }
        });
      }).on("error", reject);
    });
  }

  async _put(path, body) {
    await this.ensureToken();
    if (!this.accessToken) throw new Error("Spotify não conectado");
    return new Promise((resolve, reject) => {
      const url = new URL(`${SPOTIFY_API}${path}`);
      const postData = body ? JSON.stringify(body) : "";
      const req = https.request(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
        },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 401) {
            this.refreshAccessToken().then(() => this._put(path, body)).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode === 204) resolve({ ok: true });
          else {
            try { resolve(JSON.parse(data)); } catch { resolve({ ok: true }); }
          }
        });
      });
      req.on("error", reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  async _post(path, body) {
    await this.ensureToken();
    if (!this.accessToken) throw new Error("Spotify não conectado");
    return new Promise((resolve, reject) => {
      const url = new URL(`${SPOTIFY_API}${path}`);
      const postData = body ? JSON.stringify(body) : "";
      const req = https.request(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
        },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 401) {
            this.refreshAccessToken().then(() => this._post(path, body)).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode === 204) resolve({ ok: true });
          else {
            try { resolve(JSON.parse(data)); } catch { resolve({ ok: true }); }
          }
        });
      });
      req.on("error", reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  async _delete(path) {
    await this.ensureToken();
    if (!this.accessToken) throw new Error("Spotify não conectado");
    return new Promise((resolve, reject) => {
      const url = new URL(`${SPOTIFY_API}${path}`);
      https.request(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          if (res.statusCode === 401) {
            this.refreshAccessToken().then(() => this._delete(path)).then(resolve).catch(reject);
            return;
          }
          resolve({ ok: res.statusCode < 300 });
        });
      }).on("error", reject).end();
    });
  }

  // ── Playback Control ──────────────────────────────────────────
  async getPlayback() {
    try {
      return await this._get("/me/player");
    } catch { return null; }
  }

  async play(options = {}) {
    const body = {};
    if (options.contextUri) body.context_uri = options.contextUri;
    if (options.uris) body.uris = options.uris;
    if (options.offset) body.offset = options.offset;
    if (options.positionMs != null) body.position_ms = options.positionMs;
    const deviceId = options.deviceId;
    const path = deviceId ? `/me/player/play?device_id=${deviceId}` : "/me/player/play";
    return this._put(path, Object.keys(body).length ? body : undefined);
  }

  async pause(deviceId) {
    const path = deviceId ? `/me/player/pause?device_id=${deviceId}` : "/me/player/pause";
    return this._put(path);
  }

  async skipNext(deviceId) {
    const path = deviceId ? `/me/player/next?device_id=${deviceId}` : "/me/player/next";
    return this._post(path);
  }

  async skipPrevious(deviceId) {
    const path = deviceId ? `/me/player/previous?device_id=${deviceId}` : "/me/player/previous";
    return this._post(path);
  }

  async seek(positionMs, deviceId) {
    const qs = deviceId ? `?device_id=${deviceId}` : "";
    return this._put(`/me/player/seek?position_ms=${positionMs}${qs}`);
  }

  async setVolume(volumePercent, deviceId) {
    const qs = deviceId ? `&device_id=${deviceId}` : "";
    return this._put(`/me/player/volume?volume_percent=${volumePercent}${qs}`);
  }

  async setShuffle(state, deviceId) {
    const qs = deviceId ? `&device_id=${deviceId}` : "";
    return this._put(`/me/player/shuffle?state=${state}${qs}`);
  }

  async setRepeat(state, deviceId) {
    const qs = deviceId ? `&device_id=${deviceId}` : "";
    return this._put(`/me/player/repeat?state=${state}${qs}`);
  }

  async transferPlayback(deviceId) {
    return this._put("/me/player", { device_ids: [deviceId] });
  }

  // ── Devices ───────────────────────────────────────────────────
  async getDevices() {
    const data = await this._get("/me/player/devices");
    return data?.devices || [];
  }

  // ── Search ────────────────────────────────────────────────────
  async search(query, types = "track,artist,playlist", limit = 10) {
    const params = new URLSearchParams({ q: query, type: types, limit: String(limit) });
    return this._get(`/search?${params.toString()}`);
  }

  // ── Current Track ─────────────────────────────────────────────
  async getCurrentlyPlaying() {
    try {
      return await this._get("/me/player/currently-playing");
    } catch { return null; }
  }

  async getRecentlyPlayed(limit = 20) {
    const data = await this._get(`/me/player/recently-played?limit=${limit}`);
    return data?.items || [];
  }

  // ── Playlists ─────────────────────────────────────────────────
  async getMyPlaylists(limit = 50) {
    const data = await this._get(`/me/playlists?limit=${limit}`);
    return data?.items || [];
  }

  async getPlaylist(playlistId) {
    return this._get(`/playlists/${playlistId}`);
  }

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    const data = await this._get(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
    return data?.items || [];
  }

  async createPlaylist(name, description = "", isPublic = false) {
    const me = await this._get("/me");
    return this._post(`/users/${me.id}/playlists`, { name, description, public: isPublic });
  }

  async addTracksToPlaylist(playlistId, uris) {
    return this._post(`/playlists/${playlistId}/tracks`, { uris });
  }

  async removeTracksFromPlaylist(playlistId, uris) {
    return this._delete(`/playlists/${playlistId}/tracks`);
  }

  // ── User ──────────────────────────────────────────────────────
  async getMe() {
    return this._get("/me");
  }

  async getTopTracks(limit = 20, timeRange = "medium_term") {
    const data = await this._get(`/me/top/tracks?limit=${limit}&time_range=${timeRange}`);
    return data?.items || [];
  }

  async getTopArtists(limit = 20, timeRange = "medium_term") {
    const data = await this._get(`/me/top/artists?limit=${limit}&time_range=${timeRange}`);
    return data?.items || [];
  }

  // ── Queue ─────────────────────────────────────────────────────
  async getQueue() {
    return this._get("/me/player/queue");
  }

  async addToQueue(uri) {
    return this._post(`/me/player/queue?uri=${encodeURIComponent(uri)}`);
  }

  // ── Disconnect ────────────────────────────────────────────────
  disconnect() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.stopCallbackServer();
  }
}

module.exports = { SpotifyClient };

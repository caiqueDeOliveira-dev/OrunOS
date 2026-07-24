const https = require("https");
const http = require("http");

class SpotifyN8n {
  constructor() {
    this.webhookUrl = "";
    this.accessToken = "";
    this.log = console;
    this._initialized = false;
  }

  setLogger(log) {
    this.log = log || console;
  }

  setWebhook(url) {
    this.webhookUrl = url;
    this.log.info("[spotify-n8n] webhook URL set:", url ? url.slice(0, 60) + "..." : "(empty)");
  }

  setAccessToken(token) {
    this.accessToken = token;
    this._initialized = !!token;
  }

  isConfigured() {
    return !!this.webhookUrl && !!this.accessToken;
  }

  isConnected() {
    return this._initialized && !!this.accessToken;
  }

  /**
   * Call the n8n Spotify webhook
   */
  async call(action, body = {}) {
    if (!this.webhookUrl) throw new Error("Spotify n8n webhook not configured. Go to Settings → Integrations → Spotify.");
    if (!this.accessToken) throw new Error("Spotify access token not set. Connect via OAuth first.");

    const payload = {
      action,
      accessToken: this.accessToken,
      ...body,
    };

    try {
      const result = await this._request("POST", this.webhookUrl, payload);
      return result;
    } catch (err) {
      this.log.error(`[spotify-n8n] ${action} failed:`, err.message);
      throw err;
    }
  }

  _request(method, urlString, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const lib = url.protocol === "https:" ? https : http;
      const payload = body !== undefined ? JSON.stringify(body) : undefined;
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === "https:" ? 443 : 80),
          path: url.pathname + url.search,
          method,
          headers: {
            "Content-Type": "application/json",
            ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          },
          timeout: 15000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
              return;
            }
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch {
              resolve({ raw: data });
            }
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("n8n webhook timed out")));
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  // ── Convenience methods ─────────────────────────────────────

  async search(query, types = "track", limit = 10) {
    return this.call("search", { query, types, limit });
  }

  async getPlaylists(limit = 20) {
    return this.call("playlists", { limit });
  }

  async getPlaylistTracks(playlistId, limit = 50) {
    return this.call("playlist-tracks", { playlistId, limit });
  }

  async getCurrentlyPlaying() {
    return this.call("currently-playing");
  }

  async play(options = {}) {
    return this.call("play", options);
  }

  async pause() {
    return this.call("pause");
  }

  async skipNext() {
    return this.call("skip-next");
  }

  async skipPrevious() {
    return this.call("skip-previous");
  }

  async getDevices() {
    return this.call("devices");
  }

  async getMe() {
    return this.call("user");
  }

  async getTopTracks(limit = 10, timeRange = "medium_term") {
    return this.call("top-tracks", { limit, timeRange });
  }

  async getRecentlyPlayed(limit = 20) {
    return this.call("recently-played", { limit });
  }

  async getQueue() {
    return this.call("queue");
  }

  async addToQueue(uri) {
    return this.call("add-to-queue", { uri });
  }

  // OAuth helpers (same as SpotifyClient, but we use the n8n webhook for API calls)
  getAuthUrl(clientId, redirectUri) {
    const scopes = [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read",
      "user-top-read",
      "user-read-recently-played",
    ].join(" ");
    const state = require("crypto").randomBytes(16).toString("hex");
    const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&show_dialog=true`;
    return { url, state };
  }

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "accounts.spotify.com",
          path: "/api/token",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
          timeout: 15000,
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error("Invalid response from Spotify token endpoint")); }
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("Token exchange timed out")));
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }

  async refreshAccessToken(refreshToken, clientId, clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "accounts.spotify.com",
          path: "/api/token",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
          timeout: 15000,
        },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error("Invalid response from Spotify token refresh")); }
          });
        }
      );
      req.on("timeout", () => req.destroy(new Error("Token refresh timed out")));
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = { SpotifyN8n };

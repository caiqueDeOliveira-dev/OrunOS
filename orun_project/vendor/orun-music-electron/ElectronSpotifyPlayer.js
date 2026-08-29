const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
/**
 * Runs in the Electron renderer process (contextIsolation-safe — exposed
 * to the app via preload/contextBridge, not injected into an untrusted page).
 *
 * Requires the token supplier to already have a valid access token with the
 * `streaming` scope. Token retrieval itself is deliberately NOT implemented
 * here — see `getOAuthTokenSupplier` below. That's the wire-up we're doing
 * last, once everything else is in place.
 */
export class ElectronSpotifyPlayer {
    playerName;
    getAccessToken;
    player = null;
    deviceId = null;
    listeners = new Set();
    sdkLoadPromise = null;
    constructor(playerName, getAccessToken) {
        this.playerName = playerName;
        this.getAccessToken = getAccessToken;
    }
    loadSdk() {
        if (this.sdkLoadPromise)
            return this.sdkLoadPromise;
        this.sdkLoadPromise = new Promise((resolve) => {
            if (window.Spotify)
                return resolve();
            const script = document.createElement('script');
            script.src = SDK_URL;
            script.async = true;
            document.body.appendChild(script);
            window.onSpotifyWebPlaybackSDKReady = () => resolve();
        });
        return this.sdkLoadPromise;
    }
    async connect() {
        await this.loadSdk();
        return new Promise((resolve) => {
            this.player = new window.Spotify.Player({
                name: this.playerName,
                getOAuthToken: (cb) => {
                    this.getAccessToken().then(cb).catch(() => cb(''));
                },
                volume: 0.5,
            });
            this.player.addListener('ready', ({ device_id }) => {
                this.deviceId = device_id;
                resolve(true);
            });
            this.player.addListener('not_ready', () => resolve(false));
            this.player.addListener('initialization_error', () => resolve(false));
            this.player.addListener('authentication_error', () => resolve(false));
            this.player.addListener('account_error', () => resolve(false)); // non-Premium accounts can't use Connect playback
            this.player.addListener('player_state_changed', (sdkState) => {
                if (!sdkState)
                    return;
                const mapped = this.mapState(sdkState);
                this.listeners.forEach((cb) => cb(mapped));
            });
            this.player.connect();
        });
    }
    disconnect() {
        this.player?.disconnect();
        this.player = null;
        this.deviceId = null;
    }
    // Playing a specific URI (as opposed to resume) requires the Web API's
    // PUT /v1/me/player/play with device_id=this.deviceId — the SDK itself
    // only controls an already-active session. That call lives in the
    // playlist/queue service, not here, to keep this class SDK-only.
    async play(_uri) {
        await this.player?.resume();
    }
    async pause() {
        await this.player?.pause();
    }
    async resume() {
        await this.player?.resume();
    }
    async seek(positionMs) {
        await this.player?.seek(positionMs);
    }
    async setVolume(volume) {
        await this.player?.setVolume(volume);
    }
    async skipNext() {
        await this.player?.nextTrack();
    }
    async skipPrevious() {
        await this.player?.previousTrack();
    }
    async getState() {
        const sdkState = await this.player?.getCurrentState();
        return sdkState ? this.mapState(sdkState) : null;
    }
    onStateChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    getDeviceId() {
        return this.deviceId;
    }
    mapState(s) {
        const track = s.track_window.current_track;
        return {
            isPlaying: !s.paused,
            trackId: track.id,
            trackName: track.name,
            artistName: track.artists.map((a) => a.name).join(', '),
            albumName: track.album.name,
            albumArtUrl: track.album.images[0]?.url ?? null,
            positionMs: s.position,
            durationMs: s.duration,
            volume: 0.5, // SDK doesn't report current volume in state; track separately if needed
            deviceId: this.deviceId,
        };
    }
}
//# sourceMappingURL=ElectronSpotifyPlayer.js.map
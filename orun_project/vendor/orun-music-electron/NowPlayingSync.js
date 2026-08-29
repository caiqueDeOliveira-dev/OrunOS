const CHANNEL_KEY = 'music:now-playing';
const THROTTLE_MS = 4000; // avoid flooding Supabase Realtime with per-second position updates
export class NowPlayingSync {
    player;
    sync;
    deviceLabel;
    lastPublish = 0;
    unsubscribe = null;
    constructor(player, sync, deviceLabel) {
        this.player = player;
        this.sync = sync;
        this.deviceLabel = deviceLabel;
    }
    start() {
        this.player.onStateChange((state) => this.maybePublish(state));
        // When another device starts playing something, mirror it here —
        // this is the "sai de casa com o celular e a música continua" case.
        // Uses `play(uri)` since Spotify Connect can hand off playback between
        // devices registered under the same account.
        this.unsubscribe = this.sync.subscribe(CHANNEL_KEY, (value) => {
            const remote = value;
            if (!remote || remote.deviceLabel === this.deviceLabel || !remote.trackUri)
                return;
            this.player.play(remote.trackUri).then(() => this.player.seek(remote.positionMs));
        });
    }
    stop() {
        this.unsubscribe?.();
    }
    maybePublish(state) {
        const now = Date.now();
        if (now - this.lastPublish < THROTTLE_MS)
            return;
        this.lastPublish = now;
        this.sync.publish(CHANNEL_KEY, {
            deviceLabel: this.deviceLabel,
            trackUri: state.trackId ? `spotify:track:${state.trackId}` : null,
            positionMs: state.positionMs,
            isPlaying: state.isPlaying,
            updatedAt: now,
        });
    }
}
//# sourceMappingURL=NowPlayingSync.js.map
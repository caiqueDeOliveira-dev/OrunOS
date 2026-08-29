/**
 * IMPORTANT LIMITATION: the Web Playback SDK controls a single Spotify
 * Connect stream and never exposes raw decoded audio (it's DRM-protected).
 * That means true crossfade — two tracks' audio mixed together — is not
 * achievable client-side, the same way it is in a local media player like
 * WMP or foobar2000.
 *
 * What IS achievable, and what this class does: a "soft" crossfade —
 * ramp the single stream's volume down near the end of a track, trigger
 * the skip, then ramp back up. It reads as a fade-out/fade-in rather than
 * a true overlap, but it removes the hard cut between tracks, which is
 * usually what people actually want from "crossfade" in practice.
 */
export class CrossfadeController {
    player;
    getFadeSeconds;
    targetVolume = 0.7;
    fadeIntervalId = null;
    unsubscribeState = null;
    triggeredForTrackId = null;
    constructor(player, getFadeSeconds) {
        this.player = player;
        this.getFadeSeconds = getFadeSeconds;
    }
    start() {
        this.unsubscribeState = this.player.onStateChange((state) => this.handleState(state));
    }
    stop() {
        this.unsubscribeState?.();
        this.clearFade();
    }
    setTargetVolume(volume) {
        this.targetVolume = volume;
    }
    handleState(state) {
        const fadeSeconds = this.getFadeSeconds();
        if (fadeSeconds <= 0 || !state.isPlaying || !state.trackId)
            return;
        const remainingMs = state.durationMs - state.positionMs;
        const fadeMs = fadeSeconds * 1000;
        if (remainingMs <= fadeMs && this.triggeredForTrackId !== state.trackId) {
            this.triggeredForTrackId = state.trackId;
            this.fadeOut(remainingMs);
        }
    }
    fadeOut(durationMs) {
        this.clearFade();
        const steps = 20;
        const stepMs = Math.max(50, durationMs / steps);
        let step = 0;
        this.fadeIntervalId = setInterval(async () => {
            step += 1;
            const volume = this.targetVolume * (1 - step / steps);
            await this.player.setVolume(Math.max(0, volume));
            if (step >= steps) {
                this.clearFade();
                // Track change happens naturally via Spotify's own queue advance;
                // once the new track starts, fadeIn() ramps volume back up.
                setTimeout(() => this.fadeIn(), 300);
            }
        }, stepMs);
    }
    fadeIn() {
        this.clearFade();
        const steps = 20;
        const fadeSeconds = this.getFadeSeconds();
        const stepMs = Math.max(50, (fadeSeconds * 1000) / steps);
        let step = 0;
        this.fadeIntervalId = setInterval(async () => {
            step += 1;
            const volume = this.targetVolume * (step / steps);
            await this.player.setVolume(Math.min(this.targetVolume, volume));
            if (step >= steps) {
                this.clearFade();
                this.triggeredForTrackId = null;
            }
        }, stepMs);
    }
    clearFade() {
        if (this.fadeIntervalId)
            clearInterval(this.fadeIntervalId);
        this.fadeIntervalId = null;
    }
}
//# sourceMappingURL=CrossfadeController.js.map
export interface KeyboardShortcutHandlers {
    onTogglePlay: () => void;
    onSeekForward: (seconds: number) => void;
    onSeekBackward: (seconds: number) => void;
    onVolumeUp: (delta: number) => void;
    onVolumeDown: (delta: number) => void;
    onToggleMute: () => void;
    onNextTrack: () => void;
    onPreviousTrack: () => void;
}
/**
 * Mirrors the accelerators people already expect from WMP/Spotify/YTM:
 *   Space           play/pause
 *   ← / →           seek back/forward 5s
 *   Shift + ← / →   previous/next track
 *   ↑ / ↓           volume up/down
 *   M               mute toggle
 *
 * Ignores keystrokes while the user is typing in a text input (search
 * box, playlist name field, etc.) so Space doesn't hijack normal typing.
 */
export declare function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled?: boolean): void;
//# sourceMappingURL=useKeyboardShortcuts.d.ts.map
import { useEffect } from 'react';

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

const SEEK_STEP_SECONDS = 5;
const VOLUME_STEP = 0.05;

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
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlers.onTogglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) handlers.onNextTrack();
          else handlers.onSeekForward(SEEK_STEP_SECONDS);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) handlers.onPreviousTrack();
          else handlers.onSeekBackward(SEEK_STEP_SECONDS);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlers.onVolumeUp(VOLUME_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onVolumeDown(VOLUME_STEP);
          break;
        case 'KeyM':
          handlers.onToggleMute();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers, enabled]);
}

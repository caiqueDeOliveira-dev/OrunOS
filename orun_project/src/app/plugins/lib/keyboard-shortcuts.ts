// plugins/lib/keyboard-shortcuts.ts
//
// Keyboard shortcuts for workspace navigation.
// - Ctrl+Shift+W: Toggle workspace for current agent
// - Ctrl+Shift+1-9: Switch between workspace tabs
// - Ctrl+Shift+T: Toggle terminal (for Developer workspace)

import { useEffect } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
}

const registeredShortcuts: Shortcut[] = [];

/** Register a keyboard shortcut. */
export function registerShortcut(shortcut: Shortcut): () => void {
  registeredShortcuts.push(shortcut);
  return () => {
    const idx = registeredShortcuts.indexOf(shortcut);
    if (idx >= 0) registeredShortcuts.splice(idx, 1);
  };
}

/** Remove all registered shortcuts. */
export function clearShortcuts(): void {
  registeredShortcuts.length = 0;
}

/** Initialize the global keyboard listener. Call once at app startup. */
export function initKeyboardShortcuts(): void {
  if (typeof window === "undefined") return;

  const listener = (event: KeyboardEvent) => {
    for (const shortcut of registeredShortcuts) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
      const shiftMatch = shortcut.shift ? event.shiftKey : true;
      const altMatch = shortcut.alt ? event.altKey : true;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.handler(event);
        return;
      }
    }
  };

  window.addEventListener("keydown", listener);
}

/** React hook that registers shortcuts and cleans up on unmount. */
export function useWorkspaceShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const cleanups = shortcuts.map((s) => registerShortcut(s));
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
}

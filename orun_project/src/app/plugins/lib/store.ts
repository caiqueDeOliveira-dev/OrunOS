// plugins/lib/store.ts
//
// Lightweight isolated state store for workspace plugins.
// Each plugin gets its own store instance — no shared state between plugins.
//
// This is intentionally simple (no external dependency).
// For complex state, plugins can use React's useReducer inside their components.

import { useCallback, useRef, useSyncExternalStore } from "react";

type Listener = () => void;

export interface PluginStore<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void;
  subscribe: (listener: Listener) => () => void;
}

/**
 * Creates an isolated state store for a plugin.
 *
 * @example
 * const useAudioStore = createStore({
 *   tracks: [],
 *   bpm: 120,
 *   isPlaying: false,
 * });
 *
 * // In a component:
 * function Mixer() {
 *   const tracks = useAudioStore(s => s.tracks);
 *   const setState = useAudioStore(s => s.setState);
 *   // ...
 * }
 */
export function createStore<T extends Record<string, unknown>>(initialState: T) {
  let state = { ...initialState };
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState = (partial: Partial<T> | ((prev: T) => Partial<T>)) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // The hook: returns the full store, with an optional selector
  function useStore(): T;
  function useStore<U>(selector: (state: T) => U): U;
  function useStore<U>(selector?: (state: T) => U): T | U {
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    const getSnapshot = useCallback(() => {
      return selectorRef.current ? selectorRef.current(state) : state;
    }, []);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  // Expose store API on the hook
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore;
}

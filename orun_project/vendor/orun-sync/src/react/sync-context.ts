import { createContext, useContext } from 'react';
import type { SyncEngine } from '../sync-engine';

export const SyncEngineContext = createContext<SyncEngine | null>(null);

export function useSyncEngineContext(): SyncEngine {
  const engine = useContext(SyncEngineContext);
  if (!engine) {
    throw new Error('[@orun/sync] useSyncEngineContext() usado fora de <SyncProvider>.');
  }
  return engine;
}

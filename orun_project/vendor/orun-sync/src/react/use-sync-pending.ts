import { useCallback, useEffect, useState } from 'react';
import { useSyncEngineContext } from './sync-context';

export interface UseSyncPendingResult {
  /** Paths com push pendente de confirmação (falharam pelo menos uma vez — provavelmente offline). */
  pendingPaths: string[];
  isSyncPending: boolean;
  /** Chame quando a conexão voltar (ex: listener de 'online') pra forçar reenvio imediato. */
  retryNow: () => Promise<void>;
}

export function useSyncPending(): UseSyncPendingResult {
  const engine = useSyncEngineContext();
  const [pendingPaths, setPendingPaths] = useState<string[]>(() => engine.getPendingPushPaths());

  useEffect(() => {
    setPendingPaths(engine.getPendingPushPaths());
    return engine.subscribePendingPushes(setPendingPaths);
  }, [engine]);

  const retryNow = useCallback(() => engine.retryPendingPushes(), [engine]);

  return { pendingPaths, isSyncPending: pendingPaths.length > 0, retryNow };
}

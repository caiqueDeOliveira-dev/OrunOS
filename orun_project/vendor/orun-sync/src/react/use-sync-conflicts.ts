import { useCallback, useEffect, useState } from 'react';
import { useSyncEngineContext } from './sync-context';
import type { ConflictRecord, ConflictResolution } from '../types';

export interface UseSyncConflictsResult {
  conflicts: ConflictRecord[];
  resolveConflict: (path: string, resolution: ConflictResolution) => Promise<void>;
}

/**
 * @orun/sync — useSyncConflicts
 *
 * Reativo: a lista atualiza sozinha quando um conflito novo aparece (edição
 * concorrente detectada) ou quando um é resolvido (por este hook ou por
 * outro componente/device). É a peça que falta pra UI mostrar "Desktop diz
 * X, Mobile diz Y — qual você quer?".
 */
export function useSyncConflicts(): UseSyncConflictsResult {
  const engine = useSyncEngineContext();
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(() => engine.getConflicts());

  useEffect(() => {
    setConflicts(engine.getConflicts());
    return engine.subscribeConflicts(setConflicts);
  }, [engine]);

  const resolveConflict = useCallback(
    (path: string, resolution: ConflictResolution) => engine.resolveConflict(path, resolution),
    [engine]
  );

  return { conflicts, resolveConflict };
}

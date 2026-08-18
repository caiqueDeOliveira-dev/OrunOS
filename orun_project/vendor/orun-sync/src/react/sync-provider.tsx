import { useEffect, useState, type ReactNode } from 'react';
import { SyncEngineContext } from './sync-context';
import type { SyncEngine } from '../sync-engine';

export interface SyncProviderProps {
  engine: SyncEngine;
  children: ReactNode;
  /** Renderizado enquanto engine.init() não resolveu (pull inicial + inscrições). Default: renderiza children direto (sync é "melhor esforço", não deveria travar a UI). */
  fallback?: ReactNode;
  onError?: (error: unknown) => void;
}

/**
 * @orun/sync — SyncProvider
 *
 * Ao contrário do SettingsProvider (que bloqueia a árvore até init()
 * resolver, porque a UI PRECISA dos settings pra renderizar), o SyncProvider
 * por padrão libera os filhos imediatamente — sync é estritamente aditivo, o
 * app funciona 100% offline sem ele. Passe `fallback` só se quiser mostrar
 * algum indicador de "conectando..." explicitamente.
 */
export function SyncProvider({ engine, children, fallback, onError }: SyncProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    engine
      .init()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        onError?.(err);
      });
    return () => {
      cancelled = true;
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  if (error && !onError) {
    console.error('[@orun/sync] Falha ao inicializar sync:', error);
  }

  if (!ready && fallback !== undefined) {
    return fallback as JSX.Element;
  }

  return (
    <SyncEngineContext.Provider value={engine}>
      {children}
    </SyncEngineContext.Provider>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { SettingsStoreContext } from './settings-context';
import type { ISettingsStore } from '../store-interface';

export interface SettingsProviderProps {
  /** Instância já construída (ElectronSettingsStore, ExpoSettingsStore, TizenSettingsStore...). */
  store: ISettingsStore;
  children: ReactNode;
  /** Renderizado enquanto store.init() não resolveu. Default: null. */
  fallback?: ReactNode;
  /** Chamado se store.init() falhar (settings corrompidos, disco cheio, etc). */
  onError?: (error: unknown) => void;
}

/**
 * @orun/settings — SettingsProvider
 *
 * Chama store.init() uma vez e só renderiza os filhos depois que a store
 * está pronta — evita qualquer componente descendente chamar get()/set()
 * antes da inicialização (o que a BaseSettingsStore rejeitaria de qualquer
 * forma, mas é melhor nunca deixar a árvore chegar nesse estado).
 *
 * Erros de init() são re-lançados no render (pro Error Boundary do app
 * tratar) em vez de engolidos silenciosamente — settings corrompidos não
 * devem deixar o app rodando com config parcial.
 */
export function SettingsProvider({ store, children, fallback = null, onError }: SettingsProviderProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    store
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  if (error) {
    throw error;
  }

  if (!ready) {
    return fallback as JSX.Element;
  }

  return (
    <SettingsStoreContext.Provider value={store}>
      {children}
    </SettingsStoreContext.Provider>
  );
}

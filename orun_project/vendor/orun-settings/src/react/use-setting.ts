import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from './settings-context';
import type { SettingsPath } from '../store-interface';

export interface UseSettingResult<T> {
  /** undefined enquanto loading=true na primeira leitura. */
  value: T | undefined;
  setValue: (next: T) => Promise<void>;
  loading: boolean;
  error: unknown;
}

/**
 * @orun/settings — useSetting
 *
 * Lê um valor por dot-path e mantém reativo — qualquer set() feito por
 * QUALQUER componente (ou por fora do React, ex: sync remoto) atualiza
 * este hook automaticamente via store.subscribe().
 *
 * Funciona tanto pra folhas ("core.theme") quanto pra namespaces inteiros
 * ("core", "desktop") — a BaseSettingsStore já propaga mudanças de filhos
 * pros listeners do path pai.
 */
export function useSetting<T = unknown>(path: SettingsPath): UseSettingResult<T> {
  const store = useSettingsStore();
  const [value, setValueState] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    store
      .get<T>(path)
      .then((v) => {
        if (!cancelled) {
          setValueState(v);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    const unsubscribe = store.subscribe<T>(path, (newValue) => {
      if (!cancelled) setValueState(newValue);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store, path]);

  const setValue = useCallback(
    async (next: T) => {
      await store.set(path, next);
      // não seta o state manualmente aqui — o listener do subscribe acima
      // já recebe o novo valor e evita os dois caminhos ficarem dessincronizados
    },
    [store, path]
  );

  return { value, setValue, loading, error };
}

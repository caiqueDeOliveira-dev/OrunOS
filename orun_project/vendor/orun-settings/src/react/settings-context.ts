import { createContext, useContext } from 'react';
import type { ISettingsStore } from '../store-interface';

export const SettingsStoreContext = createContext<ISettingsStore | null>(null);

/**
 * @orun/settings — useSettingsStore
 * Acesso direto à store (get/set/reset imperativos). Pra ler um valor de
 * forma reativa dentro de um componente, prefira useSetting().
 */
export function useSettingsStore(): ISettingsStore {
  const store = useContext(SettingsStoreContext);
  if (!store) {
    throw new Error('[@orun/settings] useSettingsStore() usado fora de <SettingsProvider>.');
  }
  return store;
}

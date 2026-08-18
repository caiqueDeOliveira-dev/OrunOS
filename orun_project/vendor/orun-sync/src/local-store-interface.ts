export type Unsubscribe = () => void;

/**
 * @orun/sync — SyncableLocalStore
 *
 * Subconjunto mínimo que o SyncEngine precisa de um store local. A
 * ISettingsStore de @orun/settings já satisfaz essa interface
 * estruturalmente (get/set/subscribe têm a mesma assinatura) — não precisa
 * de adapter, só passar a instância direto.
 */
export interface SyncableLocalStore {
  get(path: string): Promise<unknown>;
  set(path: string, value: unknown): Promise<void>;
  subscribe(path: string, listener: (newValue: unknown, oldValue: unknown) => void): Unsubscribe;
}

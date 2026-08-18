import type { Settings } from './schema';
import type { SettingsScope } from './scope-map';

export type SettingsPath = string;
export type SettingsChangeListener<T = unknown> = (newValue: T, oldValue: T | undefined) => void;
export type Unsubscribe = () => void;

/**
 * @orun/settings — ISettingsStore
 *
 * Abstração de storage, no mesmo padrão do ISecureTokenStore em
 * @orun/identity: uma interface única, implementação por plataforma
 * (Electron/Expo/Tizen), lógica de validação/scope/listeners compartilhada
 * na BaseSettingsStore.
 */
export interface ISettingsStore {
  /** Carrega o estado persistido e valida contra o SettingsSchema. Deve ser chamado antes de qualquer get/set. */
  init(): Promise<void>;

  /** Retorna uma cópia de todo o objeto de settings. */
  getAll(): Promise<Settings>;

  /** Lê um valor por dot-path, ex: "desktop.windowBounds.width". */
  get<T = unknown>(path: SettingsPath): Promise<T>;

  /** Escreve um valor por dot-path, valida contra o schema e persiste. */
  set<T = unknown>(path: SettingsPath, value: T): Promise<void>;

  /** Assina mudanças num path (ou num namespace pai, ex: "core"). Retorna função de unsubscribe. */
  subscribe<T = unknown>(path: SettingsPath, listener: SettingsChangeListener<T>): Unsubscribe;

  /** Reseta um path (ou tudo, se omitido) para o valor default do schema. */
  reset(path?: SettingsPath): Promise<void>;

  /** Consulta o scope (account/device) de um path — delega para scope-map. */
  getScope(path: SettingsPath): SettingsScope;
}

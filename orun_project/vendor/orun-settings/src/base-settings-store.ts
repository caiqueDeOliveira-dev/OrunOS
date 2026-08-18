import { SettingsSchema, type Settings } from './schema';
import { getScopeForPath, type SettingsScope } from './scope-map';
import { isSecretPath } from './secret-paths';
import { getByPath, setByPath } from './path-utils';
import type { ISettingsStore, SettingsChangeListener, SettingsPath, Unsubscribe } from './store-interface';
import type { ISecretStore } from './secret-store-interface';

/** Guardado no blob de settings no lugar do valor real de um campo secreto. */
const SECRET_PLACEHOLDER = '••••••••';

/**
 * @orun/settings — BaseSettingsStore
 *
 * Implementa tudo que NÃO é específico de plataforma: validação via Zod,
 * leitura/escrita por dot-path, pub/sub de mudanças, e o desvio de campos
 * secretos para o ISecretStore injetado. Subclasses só precisam implementar
 * loadRaw()/persistRaw() (I/O real: arquivo, SQLite, IndexedDB...).
 */
export abstract class BaseSettingsStore implements ISettingsStore {
  protected cache: Settings | null = null;
  private listeners = new Map<SettingsPath, Set<SettingsChangeListener<any>>>();

  constructor(protected readonly secretStore?: ISecretStore) {}

  protected abstract loadRaw(): Promise<unknown>;
  protected abstract persistRaw(settings: Settings): Promise<void>;

  async init(): Promise<void> {
    const raw = await this.loadRaw();
    const parsed = SettingsSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new Error(
        `[@orun/settings] Falha ao carregar settings persistidos: ${parsed.error.message}. ` +
          `Fail fast em vez de rodar com config corrompida/parcial.`
      );
    }
    this.cache = parsed.data;
  }

  private ensureInitialized(): Settings {
    if (!this.cache) {
      throw new Error('[@orun/settings] Store usado antes de init(). Chame await store.init() primeiro.');
    }
    return this.cache;
  }

  async getAll(): Promise<Settings> {
    return structuredClone(this.ensureInitialized());
  }

  async get<T = unknown>(path: SettingsPath): Promise<T> {
    const settings = this.ensureInitialized();

    if (isSecretPath(path)) {
      if (!this.secretStore) {
        throw new Error(`[@orun/settings] Path "${path}" é secreto mas nenhum ISecretStore foi injetado.`);
      }
      return (await this.secretStore.getSecret(path)) as T;
    }

    return getByPath<T>(settings, path) as T;
  }

  async set<T = unknown>(path: SettingsPath, value: T): Promise<void> {
    const settings = this.ensureInitialized();
    const oldValue = await this.get<T>(path);

    // campos secretos: valor real vai pro secretStore, blob principal só guarda um placeholder
    const valueForBlob = isSecretPath(path) ? SECRET_PLACEHOLDER : value;

    const draft = structuredClone(settings) as Record<string, any>;
    setByPath(draft, path, valueForBlob);
    const parsed = SettingsSchema.safeParse(draft);
    if (!parsed.success) {
      throw new Error(`[@orun/settings] Valor inválido para "${path}": ${parsed.error.message}`);
    }

    if (isSecretPath(path)) {
      if (!this.secretStore) {
        throw new Error(`[@orun/settings] Path "${path}" é secreto mas nenhum ISecretStore foi injetado.`);
      }
      await this.secretStore.setSecret(path, value as unknown as string);
    }

    this.cache = parsed.data;
    await this.persistRaw(this.cache);
    this.notify(path, value, oldValue);
  }

  subscribe<T = unknown>(path: SettingsPath, listener: SettingsChangeListener<T>): Unsubscribe {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(listener as SettingsChangeListener<any>);
    return () => {
      this.listeners.get(path)?.delete(listener as SettingsChangeListener<any>);
    };
  }

  /** Notifica listeners exatos do path E de qualquer namespace pai (ex: quem escuta "core" quando "core.theme" muda). */
  private notify<T>(path: SettingsPath, newValue: T, oldValue: T | undefined): void {
    this.listeners.get(path)?.forEach((listener) => listener(newValue, oldValue));

    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners?.size) {
        const parentValue = getByPath(this.cache, parentPath);
        parentListeners.forEach((listener) => listener(parentValue, undefined));
      }
    }
  }

  async reset(path?: SettingsPath): Promise<void> {
    const defaults = SettingsSchema.parse({});
    if (!path) {
      this.cache = defaults;
      await this.persistRaw(this.cache);
      return;
    }
    const defaultValue = getByPath(defaults, path);
    await this.set(path, defaultValue);
  }

  getScope(path: SettingsPath): SettingsScope {
    return getScopeForPath(path);
  }
}

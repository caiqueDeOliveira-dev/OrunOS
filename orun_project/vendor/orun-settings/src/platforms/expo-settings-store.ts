import { BaseSettingsStore } from '../base-settings-store';
import type { Settings } from '../schema';
import type { ISecretStore } from '../secret-store-interface';

// Tipos mínimos pra não depender do pacote expo-sqlite instalado neste
// arquivo isolado — no app real, importar de 'expo-sqlite' normalmente:
//   import * as SQLite from 'expo-sqlite';
interface SQLiteDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
}
type OpenDatabaseAsyncFn = (name: string) => Promise<SQLiteDatabase>;

/**
 * @orun/settings — ExpoSettingsStore
 * Guarda o blob inteiro numa tabela de 1 linha (id fixo = 0) — mais simples
 * e mais rápido que normalizar por chave, já que o schema inteiro é pequeno
 * e lido/escrito como uma unidade.
 */
export class ExpoSettingsStore extends BaseSettingsStore {
  private db: SQLiteDatabase | null = null;

  constructor(
    private readonly openDatabaseAsync: OpenDatabaseAsyncFn,
    private readonly dbName = 'orun-settings.db',
    secretStore?: ISecretStore
  ) {
    super(secretStore);
  }

  private async getDb(): Promise<SQLiteDatabase> {
    if (!this.db) {
      this.db = await this.openDatabaseAsync(this.dbName);
      await this.db.execAsync(
        'CREATE TABLE IF NOT EXISTS settings_blob (id INTEGER PRIMARY KEY CHECK (id = 0), data TEXT NOT NULL);'
      );
    }
    return this.db;
  }

  protected async loadRaw(): Promise<unknown> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM settings_blob WHERE id = 0;');
    return row ? JSON.parse(row.data) : {};
  }

  protected async persistRaw(settings: Settings): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT INTO settings_blob (id, data) VALUES (0, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data;',
      JSON.stringify(settings)
    );
  }
}

// Tipos mínimos equivalentes a 'expo-secure-store', mesma razão acima.
interface SecureStoreLike {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/**
 * @orun/settings — ExpoSecretStore
 * expo-secure-store só aceita chaves em [A-Za-z0-9._-], por isso o
 * sanitize de path (troca "." por "_").
 */
export class ExpoSecretStore implements ISecretStore {
  constructor(private readonly secureStore: SecureStoreLike) {}

  private secureKey(key: string): string {
    return `orun_${key.replace(/\./g, '_')}`;
  }

  async getSecret(key: string): Promise<string | undefined> {
    const value = await this.secureStore.getItemAsync(this.secureKey(key));
    return value ?? undefined;
  }

  async setSecret(key: string, value: string): Promise<void> {
    await this.secureStore.setItemAsync(this.secureKey(key), value);
  }

  async deleteSecret(key: string): Promise<void> {
    await this.secureStore.deleteItemAsync(this.secureKey(key));
  }
}

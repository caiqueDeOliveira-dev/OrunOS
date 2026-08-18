import { BaseSettingsStore } from '../base-settings-store';
import type { Settings } from '../schema';
import type { ISecretStore } from '../secret-store-interface';

const DB_NAME = 'orun-settings-db';
const STORE_NAME = 'settings';
const BLOB_KEY = 'blob';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @orun/settings — TizenSettingsStore
 * Persiste o blob inteiro numa única entrada de IndexedDB.
 */
export class TizenSettingsStore extends BaseSettingsStore {
  protected async loadRaw(): Promise<unknown> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(BLOB_KEY);
      req.onsuccess = () => resolve(req.result ?? {});
      req.onerror = () => reject(req.error);
    });
  }

  protected async persistRaw(settings: Settings): Promise<void> {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(settings, BLOB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * @orun/settings — TizenSecretStore
 *
 * IMPORTANTE: não reimplementar a criptografia aqui. @orun/identity já tem
 * um helper AES-GCM via Web Crypto pro token store do Tizen — este store
 * deve importar e reusar exatamente aquele helper (mesma IV/derivação de
 * chave), em vez de duplicar a lógica de criptografia num segundo lugar do
 * monorepo. A assinatura abaixo é o contrato que esse helper precisa cumprir.
 */
export interface TizenCryptoHelper {
  encrypt(plaintext: string): Promise<string>; // retorna string serializada (iv + ciphertext, ex: base64)
  decrypt(serialized: string): Promise<string>;
}

export class TizenSecretStore implements ISecretStore {
  constructor(private readonly crypto: TizenCryptoHelper) {}

  private async openStore(): Promise<IDBDatabase> {
    return openIndexedDb();
  }

  async getSecret(key: string): Promise<string | undefined> {
    const db = await this.openStore();
    const encrypted = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(`secret:${key}`);
      req.onsuccess = () => resolve(req.result ?? undefined);
      req.onerror = () => reject(req.error);
    });
    if (!encrypted) return undefined;
    return this.crypto.decrypt(encrypted);
  }

  async setSecret(key: string, value: string): Promise<void> {
    const encrypted = await this.crypto.encrypt(value);
    const db = await this.openStore();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(encrypted, `secret:${key}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteSecret(key: string): Promise<void> {
    const db = await this.openStore();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(`secret:${key}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

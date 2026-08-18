import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseSettingsStore } from '../base-settings-store';
import type { Settings } from '../schema';
import type { ISecretStore } from '../secret-store-interface';

export interface ElectronSettingsStoreOptions {
  /** Normalmente app.getPath('userData') */
  userDataDir: string;
  fileName?: string;
}

/**
 * @orun/settings — ElectronSettingsStore
 * Persiste em JSON no userData dir do Electron, com escrita atômica
 * (write em .tmp + rename) pra nunca deixar o arquivo corrompido se o
 * processo morrer no meio da gravação.
 */
export class ElectronSettingsStore extends BaseSettingsStore {
  private readonly filePath: string;

  constructor(options: ElectronSettingsStoreOptions, secretStore?: ISecretStore) {
    super(secretStore);
    this.filePath = path.join(options.userDataDir, options.fileName ?? 'orun-settings.json');
  }

  protected async loadRaw(): Promise<unknown> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err: any) {
      if (err.code === 'ENOENT') return {};
      throw new Error(`[@orun/settings] Falha ao ler ${this.filePath}: ${err.message}`);
    }
  }

  protected async persistRaw(settings: Settings): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }
}

/**
 * @orun/settings — ElectronSecretStore
 * Usa safeStorage (DPAPI no Windows, Keychain no macOS, libsecret no Linux)
 * pro mesmo padrão já usado em @orun/identity.
 */
export class ElectronSecretStore implements ISecretStore {
  private readonly filePath: string;

  constructor(userDataDir: string, fileName = 'orun-secrets.json') {
    this.filePath = path.join(userDataDir, fileName);
  }

  private async readAll(): Promise<Record<string, string>> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err: any) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  private async writeAll(data: Record<string, string>): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data), 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }

  async getSecret(key: string): Promise<string | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { safeStorage } = require('electron');
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('[@orun/settings] safeStorage indisponível neste SO (sem keychain/DPAPI/libsecret).');
    }
    const all = await this.readAll();
    const encrypted = all[key];
    if (!encrypted) return undefined;
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  }

  async setSecret(key: string, value: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { safeStorage } = require('electron');
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('[@orun/settings] safeStorage indisponível neste SO.');
    }
    const all = await this.readAll();
    all[key] = safeStorage.encryptString(value).toString('base64');
    await this.writeAll(all);
  }

  async deleteSecret(key: string): Promise<void> {
    const all = await this.readAll();
    delete all[key];
    await this.writeAll(all);
  }
}

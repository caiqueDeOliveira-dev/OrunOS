import { BaseSettingsStore } from '../base-settings-store';
import type { Settings } from '../schema';
import type { ISecretStore } from '../secret-store-interface';

/** Store in-memory usada só em testes — nunca ship pra produção. */
export class InMemorySettingsStore extends BaseSettingsStore {
  private blob: unknown = {};

  protected async loadRaw(): Promise<unknown> {
    return this.blob;
  }

  protected async persistRaw(settings: Settings): Promise<void> {
    this.blob = structuredClone(settings);
  }
}

export class InMemorySecretStore implements ISecretStore {
  private secrets = new Map<string, string>();
  async getSecret(key: string): Promise<string | undefined> {
    return this.secrets.get(key);
  }
  async setSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }
  async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }
}

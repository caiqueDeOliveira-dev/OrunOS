import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeviceIdStore } from '../device-id';

/**
 * @orun/sync — ElectronDeviceIdStore
 * deviceId não é segredo (só precisa ser estável), então vai num arquivo
 * texto simples no userData, sem passar por safeStorage.
 */
export class ElectronDeviceIdStore implements DeviceIdStore {
  private readonly filePath: string;

  constructor(userDataDir: string, fileName = 'orun-device-id.txt') {
    this.filePath = path.join(userDataDir, fileName);
  }

  async get(): Promise<string | undefined> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content.trim() || undefined;
    } catch (err: any) {
      if (err.code === 'ENOENT') return undefined;
      throw err;
    }
  }

  async set(id: string): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, id, 'utf-8');
  }
}

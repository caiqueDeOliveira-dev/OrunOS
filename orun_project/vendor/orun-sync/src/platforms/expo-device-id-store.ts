import type { DeviceIdStore } from '../device-id';

// Mesmo padrão dos outros arquivos de plataforma: tipo mínimo em vez de
// importar o pacote real, pra este arquivo poder ser typechecked isolado.
// No app real: import AsyncStorage from '@react-native-async-storage/async-storage';
interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = 'orun_device_id';

/**
 * @orun/sync — ExpoDeviceIdStore
 * AsyncStorage (não expo-secure-store) porque deviceId não é segredo, só
 * precisa persistir entre aberturas do app.
 */
export class ExpoDeviceIdStore implements DeviceIdStore {
  constructor(private readonly storage: AsyncStorageLike) {}

  async get(): Promise<string | undefined> {
    const value = await this.storage.getItem(STORAGE_KEY);
    return value ?? undefined;
  }

  async set(id: string): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, id);
  }
}

/**
 * @orun/sync — device-id
 *
 * Um id estável por instalação (não por usuário), usado pra distinguir
 * "mudança que eu mesmo enviei" (eco a ignorar) de "mudança de outro
 * device" (aplicar ou conflitar). Deliberadamente não amarrado a nenhum
 * storage específico — cada app injeta onde já persiste esse tipo de coisa
 * (ex: um arquivo simples no Electron, AsyncStorage no Expo).
 */
export interface DeviceIdStore {
  get(): Promise<string | undefined>;
  set(id: string): Promise<void>;
}

export async function getOrCreateDeviceId(store: DeviceIdStore): Promise<string> {
  const existing = await store.get();
  if (existing) return existing;
  const id = crypto.randomUUID();
  await store.set(id);
  return id;
}

// Em um monorepo real com workspaces, estes dois imports seriam:
//   import { SyncEngine } from '@orun/sync';
//   import type { SyncTransport } from '@orun/sync';
// Aqui uso path relativo porque os pacotes estão lado a lado sem link de
// workspace configurado neste ambiente de entrega.
import { SyncEngine } from '../../sync/src/sync-engine';
import type { SyncTransport } from '../../sync/src/types';

import { SETTINGS_SCOPE_MAP } from './scope-map';
import type { ISettingsStore } from './store-interface';

export interface CreateSettingsSyncEngineOptions {
  settingsStore: ISettingsStore;
  transport: SyncTransport;
  userId: string;
  deviceId: string;
}

/**
 * @orun/settings — settings-sync-adapter
 *
 * Ponte entre @orun/settings e @orun/sync. Não duplica NENHUMA lógica de
 * sincronização — só traduz "quais paths são account-scoped" (que só
 * @orun/settings sabe, via SETTINGS_SCOPE_MAP) pro formato que o SyncEngine
 * genérico espera (syncedPaths: string[]).
 *
 * ISettingsStore satisfaz SyncableLocalStore estruturalmente (mesmas
 * assinaturas de get/set/subscribe) — não precisa de wrapper, passa a
 * instância direto.
 */

/** Deriva a lista de paths (folhas) que devem sincronizar entre devices. */
export function getAccountScopedPaths(): string[] {
  return Object.entries(SETTINGS_SCOPE_MAP)
    .filter(([, scope]) => scope === 'account')
    .map(([path]) => path);
}

export function createSettingsSyncEngine(options: CreateSettingsSyncEngineOptions): SyncEngine {
  return new SyncEngine({
    transport: options.transport,
    localStore: options.settingsStore,
    userId: options.userId,
    deviceId: options.deviceId,
    syncedPaths: getAccountScopedPaths(),
  });
}

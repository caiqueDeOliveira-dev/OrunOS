import type { Settings } from './schema';

export type SettingsScope = 'account' | 'device';

/**
 * Path com dot-notation até a chave folha, ex: "desktop.windowBounds".
 * Usado pelo @orun/sync para filtrar o que sobe pro Supabase Realtime
 * vs o que fica só no ISettingsStore local.
 *
 * Regra geral:
 * - account: preferências de UX/identidade da pessoa, replicáveis em qualquer device
 * - device: hardware, rede local, paths de filesystem, credenciais de infra local
 */
export const SETTINGS_SCOPE_MAP: Record<string, SettingsScope> = {
  // core
  'core.theme': 'account',
  'core.locale': 'account',
  'core.hampton.voiceEnabled': 'account',
  'core.hampton.ttsEngine': 'account',
  'core.hampton.wakeWordEnabled': 'device', // depende de mic físico do device
  'core.hampton.personalityVerbosity': 'account',
  'core.notifications.enabled': 'account',
  'core.notifications.sound': 'account',
  'core.notifications.doNotDisturb': 'account',
  'core.aiProvider': 'device', // Ollama local só existe nesse device
  'core.telemetryEnabled': 'device',

  // desktop
  'desktop.launchOnStartup': 'device',
  'desktop.minimizeToTray': 'device',
  'desktop.windowBounds': 'device',
  'desktop.hardwareAcceleration': 'device',
  'desktop.sidebarCollapsed': 'account',
  'desktop.shortcuts': 'account',

  // mobile
  'mobile.biometricUnlockEnabled': 'device',
  'mobile.offlineSyncOnCellular': 'device',
  'mobile.hapticFeedback': 'account',
  'mobile.pushNotificationsEnabled': 'account',

  // tv
  'tv.outputResolution': 'device',
  'tv.hdmiCecEnabled': 'device',
  'tv.subtitlesEnabled': 'account',
  'tv.subtitleLanguage': 'account',
  'tv.autoplayNext': 'account',
  'tv.parentalControlPin': 'account',

  // homelab
  'homelab.homeAssistantUrl': 'device',
  'homelab.homeAssistantToken': 'device', // idealmente nem passa por aqui, vai pro secretStore
  'homelab.zigbeeCoordinatorPort': 'device',
  'homelab.cameraStreamQuality': 'device',
  'homelab.defaultScene': 'account',
  'homelab.quietHoursEnabled': 'account',

  // kiosk — tudo device, um kiosk não "segue" a pessoa entre telas
  'kiosk.screenTimeoutMinutes': 'device',
  'kiosk.burnInProtectionEnabled': 'device',
  'kiosk.watchdogEnabled': 'device',
  'kiosk.defaultDashboardView': 'device',

  // shields
  'shields.realTimeProtectionEnabled': 'device',
  'shields.scanScheduleCron': 'device',
  'shields.quarantinePath': 'device',
  'shields.clamavAutoUpdate': 'device',
  'shields.notifyOnThreatFound': 'account',

  // beauty — tenant-scoped, tratado como "account" pois segue o tenant, não a máquina
  'beauty.businessHours': 'account',
  'beauty.bookingLeadTimeMinutes': 'account',
  'beauty.currency': 'account',
};

export function getScopeForPath(path: string): SettingsScope {
  const scope = SETTINGS_SCOPE_MAP[path];
  if (!scope) {
    throw new Error(
      `[@orun/settings] Path "${path}" não tem scope definido em SETTINGS_SCOPE_MAP. ` +
        `Toda chave nova precisa declarar seu scope explicitamente — fail fast em vez de assumir.`
    );
  }
  return scope;
}

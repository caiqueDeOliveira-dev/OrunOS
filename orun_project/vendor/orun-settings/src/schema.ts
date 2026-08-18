import { z } from 'zod';

/**
 * @orun/settings — Schema
 *
 * Convenções:
 * - Cada chave de settings pertence a um "scope":
 *    - "account": sincroniza entre dispositivos via @orun/sync (tema, idioma, prefs de UX)
 *    - "device": fica só local na máquina/dispositivo (paths, IPs de rede local, calibração de hardware)
 * - Namespaces por app evitam colisão: core.*, desktop.*, mobile.*, tv.*, homelab.*, kiosk.*, beauty.*, shields.*
 * - Tudo aqui é a fonte de verdade de tipos. ISettingsStore consome esses schemas para validar em runtime.
 */

// ---------------------------------------------------------------------------
// CORE — comum a todos os apps do ecossistema
// ---------------------------------------------------------------------------

export const ThemeSchema = z.enum(['blood-red', 'dark', 'premium', 'minimal']);
export type Theme = z.infer<typeof ThemeSchema>;

export const LocaleSchema = z.enum(['pt-BR', 'en-US', 'es-ES']);
export type Locale = z.infer<typeof LocaleSchema>;

export const CoreSettingsSchema = z.object({
  // scope: account
  theme: ThemeSchema.default('blood-red'),
  locale: LocaleSchema.default('pt-BR'),
  hampton: z.object({
    voiceEnabled: z.boolean().default(true),
    ttsEngine: z
      .enum(['elevenlabs', 'google', 'azure', 'xtts-v2', 'piper', 'bark', 'f5-tts'])
      .default('piper'),
    wakeWordEnabled: z.boolean().default(false),
    personalityVerbosity: z.enum(['concise', 'normal', 'chatty']).default('normal'),
  }).prefault({}),
  notifications: z.object({
    enabled: z.boolean().default(true),
    sound: z.boolean().default(true),
    doNotDisturb: z
      .object({
        enabled: z.boolean().default(false),
        startHour: z.number().min(0).max(23).default(22),
        endHour: z.number().min(0).max(23).default(7),
      })
      .prefault({}),
  }).prefault({}),

  // scope: device
  aiProvider: z
    .object({
      preferred: z
        .enum(['ollama', 'anthropic', 'openai', 'openrouter', 'groq', 'github-models'])
        .default('ollama'),
      fallbackOrder: z.array(z.string()).default(['ollama', 'anthropic']),
    })
    .prefault({}),
  telemetryEnabled: z.boolean().default(true),
});
export type CoreSettings = z.infer<typeof CoreSettingsSchema>;

// ---------------------------------------------------------------------------
// DESKTOP
// ---------------------------------------------------------------------------

export const DesktopSettingsSchema = z.object({
  // scope: device
  launchOnStartup: z.boolean().default(false),
  minimizeToTray: z.boolean().default(true),
  windowBounds: z
    .object({
      width: z.number().default(1280),
      height: z.number().default(800),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .prefault({}),
  hardwareAcceleration: z.boolean().default(true),

  // scope: account
  sidebarCollapsed: z.boolean().default(false),
  shortcuts: z.record(z.string(), z.string()).prefault({}),
});
export type DesktopSettings = z.infer<typeof DesktopSettingsSchema>;

// ---------------------------------------------------------------------------
// MOBILE
// ---------------------------------------------------------------------------

export const MobileSettingsSchema = z.object({
  // scope: device
  biometricUnlockEnabled: z.boolean().default(false),
  offlineSyncOnCellular: z.boolean().default(false),

  // scope: account
  hapticFeedback: z.boolean().default(true),
  pushNotificationsEnabled: z.boolean().default(true),
});
export type MobileSettings = z.infer<typeof MobileSettingsSchema>;

// ---------------------------------------------------------------------------
// ORUNTV
// ---------------------------------------------------------------------------

export const TvPlayerSettingsSchema = z.object({
  // scope: device (cada TV pode ter uma resolução/output diferente)
  outputResolution: z.enum(['720p', '1080p', '4k', 'auto']).default('auto'),
  hdmiCecEnabled: z.boolean().default(true),

  // scope: account
  subtitlesEnabled: z.boolean().default(true),
  subtitleLanguage: LocaleSchema.default('pt-BR'),
  autoplayNext: z.boolean().default(true),
  parentalControlPin: z.string().length(4).optional(),
});
export type TvPlayerSettings = z.infer<typeof TvPlayerSettingsSchema>;

// ---------------------------------------------------------------------------
// HOMELAB / SMART HOME
// ---------------------------------------------------------------------------

export const HomeLabSettingsSchema = z.object({
  // scope: device — específico da instalação física
  homeAssistantUrl: z.string().url().default('http://localhost:8123'),
  homeAssistantToken: z.string().optional(), // deve ir para secretStore, não texto puro
  zigbeeCoordinatorPort: z.string().optional(),
  cameraStreamQuality: z.enum(['low', 'medium', 'high']).default('medium'),

  // scope: account
  defaultScene: z.string().optional(),
  quietHoursEnabled: z.boolean().default(false),
});
export type HomeLabSettings = z.infer<typeof HomeLabSettingsSchema>;

// ---------------------------------------------------------------------------
// KIOSK (Orun Casa Kiosk)
// ---------------------------------------------------------------------------

export const KioskSettingsSchema = z.object({
  // scope: device
  screenTimeoutMinutes: z.number().default(0), // 0 = nunca (kiosk 24/7)
  burnInProtectionEnabled: z.boolean().default(true),
  watchdogEnabled: z.boolean().default(true),
  defaultDashboardView: z.enum(['home', 'cameras', 'scenes', 'hampton']).default('home'),
});
export type KioskSettings = z.infer<typeof KioskSettingsSchema>;

// ---------------------------------------------------------------------------
// SHIELDS (antivírus)
// ---------------------------------------------------------------------------

export const ShieldsSettingsSchema = z.object({
  // scope: device
  realTimeProtectionEnabled: z.boolean().default(true),
  scanScheduleCron: z.string().default('0 3 * * *'), // 3am diário
  quarantinePath: z.string().optional(),
  clamavAutoUpdate: z.boolean().default(true),

  // scope: account
  notifyOnThreatFound: z.boolean().default(true),
});
export type ShieldsSettings = z.infer<typeof ShieldsSettingsSchema>;

// ---------------------------------------------------------------------------
// BEAUTY (multi-tenant SaaS)
// ---------------------------------------------------------------------------

export const BeautySettingsSchema = z.object({
  // scope: account (por tenant/salão)
  businessHours: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        open: z.string(), // "09:00"
        close: z.string(), // "19:00"
      })
    )
    .default([]),
  bookingLeadTimeMinutes: z.number().default(30),
  currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL'),
});
export type BeautySettings = z.infer<typeof BeautySettingsSchema>;

// ---------------------------------------------------------------------------
// SCHEMA RAIZ
// ---------------------------------------------------------------------------

export const SettingsSchema = z.object({
  core: CoreSettingsSchema.prefault({}),
  desktop: DesktopSettingsSchema.prefault({}),
  mobile: MobileSettingsSchema.prefault({}),
  tv: TvPlayerSettingsSchema.prefault({}),
  homelab: HomeLabSettingsSchema.prefault({}),
  kiosk: KioskSettingsSchema.prefault({}),
  shields: ShieldsSettingsSchema.prefault({}),
  beauty: BeautySettingsSchema.prefault({}),
});
export type Settings = z.infer<typeof SettingsSchema>;

export type SettingsNamespace = keyof Settings;

/**
 * Mapa de scope por chave (usado pelo Sync engine para decidir o que
 * sincronizar via @orun/sync vs o que fica só local).
 * Preenchido incrementalmente conforme os namespaces evoluem — ver
 * SETTINGS_SCOPE_MAP em scope-map.ts para o detalhamento chave-a-chave.
 */
export const ACCOUNT_SCOPED_NAMESPACES: SettingsNamespace[] = [
  // core.theme, core.locale, core.hampton, core.notifications
  // desktop.sidebarCollapsed, desktop.shortcuts
  // mobile.hapticFeedback, mobile.pushNotificationsEnabled
  // tv.subtitles*, tv.autoplayNext, tv.parentalControlPin
  // homelab.defaultScene, homelab.quietHoursEnabled
  // shields.notifyOnThreatFound
  // beauty.*
];

export const DEVICE_SCOPED_NAMESPACES: SettingsNamespace[] = [
  // core.aiProvider, core.telemetryEnabled
  // desktop.launchOnStartup, desktop.minimizeToTray, desktop.windowBounds, desktop.hardwareAcceleration
  // mobile.biometricUnlockEnabled, mobile.offlineSyncOnCellular
  // tv.outputResolution, tv.hdmiCecEnabled
  // homelab.homeAssistantUrl/Token, homelab.zigbeeCoordinatorPort, homelab.cameraStreamQuality
  // kiosk.*
  // shields.realTimeProtectionEnabled, shields.scanScheduleCron, shields.quarantinePath, shields.clamavAutoUpdate
];

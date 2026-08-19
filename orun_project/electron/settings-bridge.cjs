// electron/settings-bridge.cjs
//
// Bridge CJS que implementa @orun/settings + @orun/sync para o Electron main.
// Reimplementa a logica essencial (schema, store, sync engine) em CJS puro,
// sem depender de ESM/TS compilation - compativel com Electron 31 (Node 20).

const fs = require("fs");
const path = require("path");
const logger = require("./logger.cjs");

// -- Schema simplificado (defaults) -------------------------------------------

const DEFAULTS = {
  core: {
    theme: "blood-red",
    locale: "pt-BR",
    hampton: {
      voiceEnabled: true,
      ttsEngine: "piper",
      ttsVoice: "",
      wakeWordEnabled: false,
      backgroundListening: false,
      personalityVerbosity: "normal",
    },
    notifications: {
      enabled: true,
      sound: true,
      doNotDisturb: { enabled: false, startHour: 22, endHour: 7 },
    },
    aiProvider: { preferred: "ollama", fallbackOrder: ["ollama", "anthropic"] },
    telemetryEnabled: true,
  },
  desktop: {
    launchOnStartup: false,
    minimizeToTray: true,
    windowBounds: { width: 1280, height: 800 },
    hardwareAcceleration: true,
    sidebarCollapsed: false,
    shortcuts: {},
    ai: { provider: "ollama", model: "llama3.1", baseUrl: "http://localhost:11434", systemPrompt: "" },
    aiFallback: null as { provider: string; model: string } | null,
    runInBackground: false,
  },
  mobile: {
    biometricUnlockEnabled: false,
    offlineSyncOnCellular: false,
    hapticFeedback: true,
    pushNotificationsEnabled: true,
  },
  tv: {
    outputResolution: "auto",
    hdmiCecEnabled: true,
    subtitlesEnabled: true,
    subtitleLanguage: "pt-BR",
    autoplayNext: true,
  },
  homelab: {
    homeAssistantUrl: "http://localhost:8123",
    cameraStreamQuality: "medium",
    quietHoursEnabled: false,
  },
  kiosk: {
    screenTimeoutMinutes: 0,
    burnInProtectionEnabled: true,
    watchdogEnabled: true,
    defaultDashboardView: "home",
  },
  shields: {
    realTimeProtectionEnabled: true,
    scanScheduleCron: "0 3 * * *",
    clamavAutoUpdate: true,
    notifyOnThreatFound: true,
  },
  beauty: {
    businessHours: [],
    bookingLeadTimeMinutes: 30,
    currency: "BRL",
  },
};

// -- Scope map ----------------------------------------------------------------

const SETTINGS_SCOPE_MAP = {
  "core.theme": "account",
  "core.locale": "account",
  "core.hampton.voiceEnabled": "account",
  "core.hampton.ttsEngine": "account",
  "core.hampton.ttsVoice": "account",
  "core.hampton.wakeWordEnabled": "device",
  "core.hampton.backgroundListening": "device",
  "core.hampton.personalityVerbosity": "account",
  "core.notifications.enabled": "account",
  "core.notifications.sound": "account",
  "core.notifications.doNotDisturb": "account",
  "core.aiProvider": "device",
  "core.telemetryEnabled": "device",
  "desktop.launchOnStartup": "device",
  "desktop.minimizeToTray": "device",
  "desktop.windowBounds": "device",
  "desktop.hardwareAcceleration": "device",
  "desktop.sidebarCollapsed": "account",
  "desktop.shortcuts": "account",
  "desktop.ai": "device",
  "desktop.aiFallback": "device",
  "desktop.runInBackground": "device",
  "mobile.biometricUnlockEnabled": "device",
  "mobile.offlineSyncOnCellular": "device",
  "mobile.hapticFeedback": "account",
  "mobile.pushNotificationsEnabled": "account",
  "tv.outputResolution": "device",
  "tv.hdmiCecEnabled": "device",
  "tv.subtitlesEnabled": "account",
  "tv.subtitleLanguage": "account",
  "tv.autoplayNext": "account",
  "tv.parentalControlPin": "account",
  "homelab.homeAssistantUrl": "device",
  "homelab.homeAssistantToken": "device",
  "homelab.zigbeeCoordinatorPort": "device",
  "homelab.cameraStreamQuality": "device",
  "homelab.defaultScene": "account",
  "homelab.quietHoursEnabled": "account",
  "kiosk.screenTimeoutMinutes": "device",
  "kiosk.burnInProtectionEnabled": "device",
  "kiosk.watchdogEnabled": "device",
  "kiosk.defaultDashboardView": "device",
  "shields.realTimeProtectionEnabled": "device",
  "shields.scanScheduleCron": "device",
  "shields.quarantinePath": "device",
  "shields.clamavAutoUpdate": "device",
  "shields.notifyOnThreatFound": "account",
  "beauty.businessHours": "account",
  "beauty.bookingLeadTimeMinutes": "account",
  "beauty.currency": "account",
};

const SETTINGS_SECRET_PATHS = ["homelab.homeAssistantToken"];

// -- Path utils ---------------------------------------------------------------

function getByPath(obj, p) {
  const parts = p.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setByPath(obj, p, value) {
  const parts = p.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof cur[part] !== "object" || cur[part] === null) cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object") {
      result[key] = deepMerge(target[key], source[key]);
    } else if (result[key] === undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

function deepEqualJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function isSecretPath(p) { return SETTINGS_SECRET_PATHS.includes(p); }
function getScopeForPath(p) {
  const scope = SETTINGS_SCOPE_MAP[p];
  if (!scope) throw new Error("[@orun/settings] Path \"" + p + "\" nao tem scope definido.");
  return scope;
}
function getAccountScopedPaths() {
  return Object.entries(SETTINGS_SCOPE_MAP).filter(([, s]) => s === "account").map(([p]) => p);
}
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// -- Settings Store -----------------------------------------------------------

const SECRET_PLACEHOLDER = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

class SettingsStore {
  constructor(userDataDir, legacyDb) {
    this.filePath = path.join(userDataDir, "orun-settings.json");
    this.cache = null;
    this.listeners = new Map();
    this.legacyDb = legacyDb;
  }

  async init() {
    let raw = {};
    try {
      const content = fs.readFileSync(this.filePath, "utf-8");
      raw = JSON.parse(content);
    } catch (err) {
      if (err.code !== "ENOENT") {
        logger.sync.warn("[settings-bridge] Erro lendo " + this.filePath + ": " + err.message);
      }
    }
    if (Object.keys(raw).length === 0 && this.legacyDb) {
      raw = this._migrateFromLegacy();
    }
    this.cache = deepMerge(raw, DEFAULTS);
    this._persist();
    logger.sync.info("[settings-bridge] Store inicializado");
  }

  _migrateFromLegacy() {
    try {
      const migrated = deepClone(DEFAULTS);
      const legacyKeys = [
        ["runInBackground", "desktop", "minimizeToTray"],
        ["autoStart", "desktop", "launchOnStartup"],
      ];
      for (const [legacyKey, ns, subKey] of legacyKeys) {
        const val = this.legacyDb.getSetting(legacyKey);
        if (val !== undefined && ns && subKey) migrated[ns][subKey] = val;
      }
      logger.sync.info("[settings-bridge] Migração do legado concluída");
      return migrated;
    } catch (err) {
      logger.sync.warn("[settings-bridge] Migração do legado falhou: " + err.message);
      return {};
    }
  }

  _persist() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpPath = this.filePath + ".tmp";
      fs.writeFileSync(tmpPath, JSON.stringify(this.cache, null, 2), "utf-8");
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      logger.sync.error("[settings-bridge] Falha ao persistir: " + err.message);
    }
  }

  getAll() { return deepClone(this.cache); }

  get(p) {
    if (isSecretPath(p)) return SECRET_PLACEHOLDER;
    return getByPath(this.cache, p);
  }

  set(p, value) {
    const oldValue = this.get(p);
    if (deepEqualJson(oldValue, value)) return false;
    const draft = deepClone(this.cache);
    setByPath(draft, p, value);
    this.cache = draft;
    this._persist();
    this._notify(p, value, oldValue);
    return true;
  }

  reset(p) {
    if (!p) { this.cache = deepClone(DEFAULTS); this._persist(); return; }
    this.set(p, getByPath(DEFAULTS, p));
  }

  subscribe(p, listener) {
    if (!this.listeners.has(p)) this.listeners.set(p, new Set());
    this.listeners.get(p).add(listener);
    return () => { this.listeners.get(p)?.delete(listener); };
  }

  _notify(p, newValue, oldValue) {
    this.listeners.get(p)?.forEach((l) => l(newValue, oldValue));
    const parts = p.split(".");
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join(".");
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners?.size) {
        parentListeners.forEach((l) => l(getByPath(this.cache, parentPath), undefined));
      }
    }
  }

  getScope(p) { return getScopeForPath(p); }
}

// -- Sync Engine --------------------------------------------------------------

class SyncEngine {
  constructor({ transport, localStore, userId, deviceId, syncedPaths, retryIntervalMs }) {
    this.transport = transport;
    this.localStore = localStore;
    this.userId = userId;
    this.deviceId = deviceId;
    this.syncedPaths = new Set(syncedPaths);
    this.retryIntervalMs = retryIntervalMs;
    this.syncMeta = new Map();
    this.conflicts = new Map();
    this.applyingRemote = new Set();
    this.pendingLocalEdits = new Set();
    this.pendingPushQueue = new Map();
    this.conflictListeners = new Set();
    this.pendingPushListeners = new Set();
    this.localUnsubscribes = [];
    this.transportUnsubscribe = null;
    this.retryTimer = null;
  }

  async init() {
    const remoteRecords = await this.transport.pullAll(this.userId);
    for (const record of remoteRecords) {
      if (!this.syncedPaths.has(record.path)) continue;
      await this._applyRemoteDirect(record);
    }
    for (const p of this.syncedPaths) {
      if (!this.syncMeta.has(p)) {
        const currentValue = await this.localStore.get(p);
        this.syncMeta.set(p, { lastSyncedValue: currentValue });
      }
    }
    for (const p of this.syncedPaths) {
      const unsub = this.localStore.subscribe(p, (newValue) => {
        void this._handleLocalChange(p, newValue);
      });
      this.localUnsubscribes.push(unsub);
    }
    this.transportUnsubscribe = this.transport.subscribe(this.userId, (record) => {
      if (!this.syncedPaths.has(record.path)) return;
      void this._handleRemoteRecord(record);
    });
    if (this.retryIntervalMs !== undefined) {
      this.retryTimer = setInterval(() => { void this.retryPendingPushes(); }, this.retryIntervalMs);
    }
  }

  dispose() {
    this.localUnsubscribes.forEach((u) => u());
    this.localUnsubscribes = [];
    if (this.transportUnsubscribe) { this.transportUnsubscribe(); this.transportUnsubscribe = null; }
    if (this.retryTimer) { clearInterval(this.retryTimer); this.retryTimer = null; }
  }

  getPendingPushPaths() { return Array.from(this.pendingPushQueue.keys()); }

  subscribePendingPushes(listener) {
    this.pendingPushListeners.add(listener);
    return () => this.pendingPushListeners.delete(listener);
  }

  async retryPendingPushes() {
    for (const [p, record] of Array.from(this.pendingPushQueue.entries())) {
      try {
        await this.transport.push(this.userId, record);
        this.pendingPushQueue.delete(p);
        this._notifyPendingPushListeners();
      } catch { /* continua na fila */ }
    }
  }

  getConflicts() { return Array.from(this.conflicts.values()); }

  subscribeConflicts(listener) {
    this.conflictListeners.add(listener);
    return () => this.conflictListeners.delete(listener);
  }

  async resolveConflict(p, resolution) {
    const conflict = this.conflicts.get(p);
    if (!conflict) return;
    if (resolution === "keep-local") {
      this.pendingLocalEdits.add(p);
      const record = { path: p, value: conflict.localValue, updatedAt: new Date().toISOString(), deviceId: this.deviceId };
      try { await this.transport.push(this.userId, record); this.pendingPushQueue.delete(p); } catch { this.pendingPushQueue.set(p, record); }
      this._notifyPendingPushListeners();
    } else {
      await this._applyRemoteDirect({ path: p, value: conflict.remoteValue, updatedAt: conflict.remoteUpdatedAt, deviceId: conflict.remoteDeviceId });
    }
    this.conflicts.delete(p);
    this._notifyConflictListeners();
  }

  async _applyRemoteDirect(record) {
    this.applyingRemote.add(record.path);
    try { await this.localStore.set(record.path, record.value); } finally { this.applyingRemote.delete(record.path); }
    this.syncMeta.set(record.path, { lastSyncedValue: record.value, lastSyncedRemoteUpdatedAt: record.updatedAt });
  }

  async _handleRemoteRecord(record) {
    if (record.deviceId === this.deviceId) {
      this.pendingLocalEdits.delete(record.path);
      this.syncMeta.set(record.path, { lastSyncedValue: record.value, lastSyncedRemoteUpdatedAt: record.updatedAt });
      if (this.conflicts.has(record.path)) { this.conflicts.delete(record.path); this._notifyConflictListeners(); }
      return;
    }
    const meta = this.syncMeta.get(record.path);
    const currentLocal = await this.localStore.get(record.path);
    const localDiverged = this.pendingLocalEdits.has(record.path) || (meta !== undefined && !deepEqualJson(currentLocal, meta.lastSyncedValue));
    if (!localDiverged) { await this._applyRemoteDirect(record); return; }
    this.conflicts.set(record.path, { path: record.path, localValue: currentLocal, remoteValue: record.value, remoteUpdatedAt: record.updatedAt, remoteDeviceId: record.deviceId });
    this._notifyConflictListeners();
  }

  async _handleLocalChange(p, newValue) {
    if (this.applyingRemote.has(p)) return;
    this.pendingLocalEdits.add(p);
    if (this.conflicts.has(p)) { this.conflicts.delete(p); this._notifyConflictListeners(); }
    const record = { path: p, value: newValue, updatedAt: new Date().toISOString(), deviceId: this.deviceId };
    try { await this.transport.push(this.userId, record); this.pendingPushQueue.delete(p); this._notifyPendingPushListeners(); } catch { this.pendingPushQueue.set(p, record); this._notifyPendingPushListeners(); }
  }

  _notifyConflictListeners() { const list = this.getConflicts(); this.conflictListeners.forEach((l) => l(list)); }
  _notifyPendingPushListeners() { const list = this.getPendingPushPaths(); this.pendingPushListeners.forEach((l) => l(list)); }
}

// -- Supabase Transport -------------------------------------------------------

class SupabaseSyncTransport {
  constructor(supabaseClient) {
    this.sb = supabaseClient;
    this._channels = new Map();
  }

  async pullAll(userId) {
    const { data, error } = await this.sb.from("orun_settings_sync").select("*").eq("user_id", userId);
    if (error) throw new Error("[settings-sync] pullAll falhou: " + error.message);
    return (data || []).map((row) => ({ path: row.path, value: row.value, updatedAt: row.updated_at, deviceId: row.device_id }));
  }

  async push(userId, record) {
    const { error } = await this.sb.from("orun_settings_sync").upsert({ user_id: userId, path: record.path, value: record.value, updated_at: record.updatedAt, device_id: record.deviceId }, { onConflict: "user_id,path" });
    if (error) throw new Error("[settings-sync] push falhou: " + error.message);
  }

  subscribe(userId, onChange) {
    const channel = this.sb.channel("settings-sync:" + userId).on("postgres_changes", { event: "*", schema: "public", table: "orun_settings_sync", filter: "user_id=eq." + userId }, (payload) => {
      const row = payload.new;
      if (row) onChange({ path: row.path, value: row.value, updatedAt: row.updated_at, deviceId: row.device_id });
    }).subscribe();
    const unsub = () => { this.sb.removeChannel(channel); };
    this._channels.set(userId, unsub);
    return unsub;
  }
}

// -- Exports ------------------------------------------------------------------

let _store = null;
let _syncEngine = null;

function init(userDataDir, legacyDb) {
  _store = new SettingsStore(userDataDir, legacyDb);
  return _store.init();
}

function getStore() { return _store; }

function initSync(supabaseClient, userId, deviceId) {
  if (!_store) throw new Error("[settings-bridge] Store nao inicializado. Chame init() primeiro.");
  const transport = new SupabaseSyncTransport(supabaseClient);
  _syncEngine = new SyncEngine({
    transport,
    localStore: _store,
    userId,
    deviceId,
    syncedPaths: getAccountScopedPaths(),
    retryIntervalMs: 30000,
  });
  return _syncEngine.init().then(() => _syncEngine);
}

function getSyncEngine() { return _syncEngine; }

module.exports = {
  DEFAULTS,
  SETTINGS_SCOPE_MAP,
  SETTINGS_SECRET_PATHS,
  SettingsStore,
  SyncEngine,
  SupabaseSyncTransport,
  getAccountScopedPaths,
  getScopeForPath,
  init,
  getStore,
  initSync,
  getSyncEngine,
};
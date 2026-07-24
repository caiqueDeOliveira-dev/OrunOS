import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock window.orun (full structure matching preload.cjs)
Object.defineProperty(window, "orun", {
  value: {
    ai: {
      chat: vi.fn().mockResolvedValue(""),
      chatStream: vi.fn().mockReturnValue(() => {}),
      autonomous: vi.fn().mockReturnValue(() => {}),
      testConnection: vi.fn().mockResolvedValue({ ok: false }),
      listOllamaModels: vi.fn().mockResolvedValue([]),
      listCloudModels: vi.fn().mockResolvedValue([]),
      knownFreeModels: vi.fn().mockResolvedValue({}),
      modelCatalog: vi.fn().mockResolvedValue({}),
      providers: vi.fn().mockResolvedValue([]),
      usageToday: vi.fn().mockResolvedValue([]),
      healthCheck: vi.fn().mockResolvedValue({}),
      cacheStats: vi.fn().mockResolvedValue({ entries: 0, hits: 0, misses: 0, hitRate: 0 }),
      cacheClear: vi.fn().mockResolvedValue({ ok: true }),
      telemetry: vi.fn().mockResolvedValue({ counters: {}, metrics: {}, recentTraces: 0 }),
      rateLimitStatus: vi.fn().mockResolvedValue({}),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(true),
      setApiKey: vi.fn().mockResolvedValue(true),
      hasApiKey: vi.fn().mockResolvedValue(false),
      validateApiKey: vi.fn().mockResolvedValue({ valid: false }),
      isFirstRun: vi.fn().mockResolvedValue(false),
      encryptDB: vi.fn().mockResolvedValue({ ok: true }),
      decryptDB: vi.fn().mockResolvedValue({ ok: true }),
      isDBEncrypted: vi.fn().mockResolvedValue(false),
    },
    conversations: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "test", title: "Test" }),
      messages: vi.fn().mockResolvedValue([]),
      addMessage: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(undefined),
      truncateFrom: vi.fn().mockResolvedValue(true),
      importConversation: vi.fn().mockResolvedValue({ success: true }),
    },
    window: {
      minimize: vi.fn().mockResolvedValue(true),
      maximize: vi.fn().mockResolvedValue(true),
      close: vi.fn().mockResolvedValue(true),
      isMaximized: vi.fn().mockResolvedValue(false),
    },
    tts: {
      listVoices: vi.fn().mockResolvedValue([]),
      synthesize: vi.fn().mockResolvedValue({ audioBase64: "", mime: "audio/mp3" }),
      engines: vi.fn().mockResolvedValue([]),
      setEngineConfig: vi.fn().mockResolvedValue(true),
      getEngineConfig: vi.fn().mockResolvedValue({}),
      usageToday: vi.fn().mockResolvedValue([]),
    },
    stt: {
      engines: vi.fn().mockResolvedValue([]),
      testConnection: vi.fn().mockResolvedValue({ ok: false }),
      transcribe: vi.fn().mockResolvedValue({ text: "" }),
    },
    nutrition: {
      getDaily: vi.fn().mockResolvedValue({ entries: [], totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 } }),
      getRange: vi.fn().mockResolvedValue({ entries: [], daily: [] }),
    },
    finance: {
      getDaily: vi.fn().mockResolvedValue({ entries: [], totals: { income: 0, expenses: 0 }, balance: 0 }),
      getRange: vi.fn().mockResolvedValue({ entries: [], daily: [], totals: { income: 0, expenses: 0 }, balance: 0 }),
    },
    health: {
      getDaily: vi.fn().mockResolvedValue([]),
      getRange: vi.fn().mockResolvedValue([]),
    },
    developer: {
      getReviews: vi.fn().mockResolvedValue([]),
      getRange: vi.fn().mockResolvedValue({ entries: [], daily: [] }),
      setWorkspace: vi.fn().mockResolvedValue({ ok: true }),
      getWorkspace: vi.fn().mockResolvedValue(null),
      listFiles: vi.fn().mockResolvedValue([]),
    },
    teacher: {
      getProgress: vi.fn().mockResolvedValue([]),
      getRange: vi.fn().mockResolvedValue({ entries: [], daily: [] }),
    },
    app: {
      setRunInBackground: vi.fn().mockResolvedValue(true),
      checkForUpdates: vi.fn().mockResolvedValue({ ok: false }),
      installUpdate: vi.fn().mockResolvedValue(false),
      onUpdateStatus: vi.fn().mockReturnValue(() => {}),
      onNotify: vi.fn().mockReturnValue(() => {}),
    },
    n8n: {
      listWorkflows: vi.fn().mockResolvedValue([]),
      testConnection: vi.fn().mockResolvedValue({ ok: false }),
      triggerWebhook: vi.fn().mockResolvedValue({ ok: false }),
    },
    automation: {
      listRules: vi.fn().mockResolvedValue([]),
      addRule: vi.fn().mockResolvedValue({ ok: true, rules: [] }),
      removeRule: vi.fn().mockResolvedValue({ ok: true, rules: [] }),
      toggleRule: vi.fn().mockResolvedValue({ ok: true, rules: [] }),
    },
    socialMedia: {
      getConfig: vi.fn().mockResolvedValue({}),
      setConfig: vi.fn().mockResolvedValue(true),
      publish: vi.fn().mockResolvedValue({ ok: false }),
      publishMulti: vi.fn().mockResolvedValue([]),
      test: vi.fn().mockResolvedValue({}),
    },
    schedules: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(true),
    },
    healthGoals: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      weeklyWeight: vi.fn().mockResolvedValue({}),
      logWeight: vi.fn().mockResolvedValue(true),
    },
    agenda: {
      get: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true),
    },
    nutritionFile: {
      getToday: vi.fn().mockResolvedValue(null),
    },
    mcp: {
      listServers: vi.fn().mockResolvedValue([]),
      addServer: vi.fn().mockResolvedValue({ ok: false }),
      removeServer: vi.fn().mockResolvedValue({ ok: true }),
      listTools: vi.fn().mockResolvedValue([]),
    },
    plugins: {
      list: vi.fn().mockResolvedValue([]),
      load: vi.fn().mockResolvedValue({}),
      unload: vi.fn().mockResolvedValue({}),
      loadAll: vi.fn().mockResolvedValue([]),
    },
    sync: {
      status: vi.fn().mockResolvedValue({ connected: false }),
      trigger: vi.fn().mockResolvedValue({ ok: false }),
      test: vi.fn().mockResolvedValue({ ok: false }),
      configure: vi.fn().mockResolvedValue({ ok: false }),
    },
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

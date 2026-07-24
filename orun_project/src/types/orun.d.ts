export {};

// ── Browser SpeechRecognition types (not in lib.dom.d.ts) ──────────────────
export interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type OrunProvider = "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github" | "opencodezen";

interface OrunChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  image?: { base64: string; mime: string };
}

export interface OrunAISettings {
  provider: OrunProvider;
  model: string;
  baseUrl?: string;
  systemPrompt?: string;
}

export interface OrunAgentModelOverride {
  provider: OrunProvider;
  model: string;
  baseUrl?: string;
}

interface OrunStreamCallbacks {
  onChunk?: (delta: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
  agentId?: string;
}

export interface OrunToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface OrunToolResult {
  id: string;
  name: string;
  result: unknown;
}

interface OrunAutonomousCallbacks {
  onToolCall?: (tc: OrunToolCall) => void;
  onToolResult?: (tr: OrunToolResult) => void;
  onChunk?: (delta: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
  agentId?: string;
}

interface OrunN8nConfig {
  baseUrl?: string;
}

export interface OrunUsageRow {
  provider: string;
  date: string;
  requests: number;
  tokens_in: number;
  tokens_out: number;
}

export interface OrunAutomationAction {
  name: string;
  description?: string;
  webhookUrl: string;
  headerName?: string;
  headerValue?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  sourceAgent: string;
  trigger: string;
  targetAgent: string;
  action: string;
  enabled: boolean;
  created_at: number;
}

export interface OrunSocialMediaWebhook {
  webhookUrl: string;
  headerName?: string;
  headerValue?: string;
}

export type OrunSocialMediaPlatform = "instagram" | "tiktok" | "twitter";

export interface OrunSocialMediaPublishOpts {
  platform: OrunSocialMediaPlatform;
  text: string;
  hook?: string;
  hashtags?: string[];
  imageUrl?: string;
  videoUrl?: string;
  format?: string;
}

export interface OrunSocialMediaPublishResult {
  ok: boolean;
  platform?: string;
  result?: unknown;
  error?: string;
}

export interface OrunSocialMediaPlatformTest {
  configured: boolean;
  ok?: boolean;
  error?: string;
}

export type OrunTTSEngine = "elevenlabs" | "google" | "azure" | "xtts" | "piper" | "bark" | "f5tts";

export interface OrunVoice {
  id: string;
  name: string;
  previewUrl: string | null;
}

export interface OrunUpdateStatus {
  status: "available" | "not-available" | "error" | "downloading" | "downloaded";
  version?: string;
  percent?: number;
  message?: string;
}

export interface OrunNutritionEntry {
  id: string;
  date: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: string;
  created_at: number;
}

export interface OrunNutritionDaily {
  entries: OrunNutritionEntry[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export interface OrunFinanceEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  type: string;
  source: string;
  created_at: number;
}

export interface OrunFinanceDaily {
  entries: OrunFinanceEntry[];
  totals: { income: number; expenses: number };
  balance: number;
}

export interface OrunHealthEntry {
  id: string;
  date: string;
  metric: string;
  value: number;
  unit: string | null;
  notes: string | null;
  source: string;
  created_at: number;
}

export interface OrunDeveloperReview {
  id: string;
  date: string;
  repo: string | null;
  file_path: string | null;
  summary: string;
  issues_found: number;
  severity: string | null;
  source: string;
  created_at: number;
}

export interface OrunTeacherProgress {
  id: string;
  date: string;
  subject: string;
  topic: string;
  status: string;
  score: number | null;
  notes: string | null;
  source: string;
  created_at: number;
}

export interface OrunVideoProject {
  id: string;
  date: string;
  title: string;
  template: string | null;
  resolution: string;
  fps: number;
  duration_sec: number | null;
  status: string;
  output_path: string | null;
  render_time_ms: number | null;
  source: string;
  created_at: number;
}

export interface OrunImage3DGeneration {
  id: string;
  date: string;
  engine: string;
  prompt: string;
  model_used: string | null;
  output_url: string | null;
  width: number | null;
  height: number | null;
  generation_time_ms: number | null;
  source: string;
  created_at: number;
}

export interface OrunMusicProject {
  id: string;
  date: string;
  title: string;
  engine: string;
  genre: string | null;
  duration_sec: number | null;
  bpm: number | null;
  status: string;
  output_url: string | null;
  effects_applied: string | null;
  source: string;
  created_at: number;
}

// Range query types
export interface OrunFinanceRange {
  entries: OrunFinanceEntry[];
  daily: { date: string; income: number; expenses: number }[];
  totals: { income: number; expenses: number };
  balance: number;
}

export interface OrunNutritionRange {
  entries: OrunNutritionEntry[];
  daily: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
}

export interface OrunDeveloperRange {
  entries: OrunDeveloperReview[];
  daily: { date: string; total: number; low: number; medium: number; high: number; critical: number }[];
}

export interface OrunTeacherRange {
  entries: OrunTeacherProgress[];
  daily: { date: string; total: number; learning: number; reviewed: number; mastered: number }[];
}

export interface OrunCreatorRange {
  videos: OrunVideoProject[];
  music: OrunMusicProject[];
}

export interface OrunDesignerRange {
  entries: OrunImage3DGeneration[];
  byEngine: Record<string, number>;
}

export interface OrunWhatsAppStatus {
  status: "disconnected" | "connecting" | "qr" | "connected";
  selfJid?: string;
  loggedOut?: boolean;
  groupsRefreshed?: boolean;
}

export interface OrunSchedule {
  enabled: boolean;
  time: string; // "HH:MM"
}

export interface OrunTTSUsageRow {
  engine: string;
  date: string;
  requests: number;
  characters: number;
}

interface OrunAPI {
  ai: {
    chat: (messages: OrunChatMessage[], agentId?: string) => Promise<string>;
    /** Returns stop() — call to cancel the in-flight request server-side. */
    chatStream: (messages: OrunChatMessage[], callbacks: OrunStreamCallbacks) => () => void;
    /** Autonomous agent loop — Hampton uses tools in a loop. Returns stop(). */
    autonomous: (messages: OrunChatMessage[], callbacks: OrunAutonomousCallbacks) => () => void;
    testConnection: (settings?: Partial<OrunAISettings>) => Promise<{ ok: boolean; error?: string }>;
    listOllamaModels: (baseUrl?: string) => Promise<string[]>;
    listCloudModels: (provider: OrunProvider) => Promise<string[]>;
    knownFreeModels: () => Promise<Record<string, string[]>>;
    modelCatalog: () => Promise<Record<string, { id: string; free: boolean }[]>>;
    providers: () => Promise<OrunProvider[]>;
    usageToday: () => Promise<OrunUsageRow[]>;
    healthCheck: () => Promise<Record<string, { status: string; latencyMs: number; lastCheck: string | null; error: string | null; uptime5m: number }>>;
    cacheStats: () => Promise<{ entries: number; hits: number; misses: number; hitRate: number }>;
    cacheClear: () => Promise<{ ok: boolean }>;
    telemetry: () => Promise<{ counters: Record<string, number>; metrics: Record<string, any>; recentTraces: number }>;
    rateLimitStatus: () => Promise<Record<string, { minute: number; day: number; limits: { rpm: number; rpd: number }; minuteRemaining: number; dayRemaining: number }>>;
  };
  settings: {
    get: <T = unknown>(key: string) => Promise<T | undefined>;
    set: (key: string, value: unknown) => Promise<boolean>;
    setApiKey: (slot: string, value: string) => Promise<boolean>;
    hasApiKey: (slot: string) => Promise<boolean>;
    validateApiKey: (provider: string, key: string) => Promise<{ valid: boolean; statusCode?: number; latencyMs?: number; error?: string | null }>;
    encryptDB: () => Promise<{ ok: boolean; error?: string }>;
    decryptDB: () => Promise<{ ok: boolean; error?: string }>;
    isDBEncrypted: () => Promise<boolean>;
    isEncryptionWeakMode: () => Promise<boolean>;
    isFirstRun: () => Promise<boolean>;
    agentRecommendedModels: () => Promise<Record<string, { provider: string; model: string }>>;
  };
  conversations: {
    list: (agent?: string) => Promise<{ id: string; title: string; agent?: string | null; created_at: number; updated_at: number }[]>;
    search: (query: string) => Promise<{ id: string; title: string; snippet?: string; created_at: number; updated_at: number }[]>;
    create: (title?: string, agent?: string) => Promise<{ id: string; title: string; agent?: string | null }>;
    messages: (conversationId: string) => Promise<{ id: string; role: string; content: string; created_at: number }[]>;
    addMessage: (conversationId: string, message: { id: string; role: string; content: string }) => Promise<boolean>;
    remove: (conversationId: string) => Promise<void>;
    truncateFrom: (conversationId: string, messageId: string) => Promise<boolean>;
    importConversation: (id: string, messages: any[]) => Promise<{ success: boolean; error?: string }>;
  };
  n8n: {
    listWorkflows: () => Promise<{ id: string; name: string; active: boolean }[]>;
    testConnection: (cfg?: OrunN8nConfig) => Promise<{ ok: boolean; error?: string; workflowCount?: number }>;
    triggerWebhook: (args: { webhookUrl: string; payload?: unknown; headerName?: string; headerValue?: string }) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
  };
  socialMedia: {
    getConfig: () => Promise<Record<OrunSocialMediaPlatform, OrunSocialMediaWebhook | undefined>>;
    setConfig: (cfg: Record<OrunSocialMediaPlatform, OrunSocialMediaWebhook | undefined>) => Promise<boolean>;
    publish: (opts: OrunSocialMediaPublishOpts) => Promise<OrunSocialMediaPublishResult>;
    publishMulti: (opts: { platforms: OrunSocialMediaPlatform[]; text: string; hook?: string; hashtags?: string[]; imageUrl?: string; videoUrl?: string; format?: string }) => Promise<OrunSocialMediaPublishResult[]>;
    test: () => Promise<Record<string, OrunSocialMediaPlatformTest>>;
  };
  app: {
    setRunInBackground: (value: boolean) => Promise<boolean>;
    setAutoStart: (value: boolean) => Promise<boolean>;
    setLastConversation: (id: string) => Promise<boolean>;
    getLastConversation: () => Promise<string | null>;
    checkForUpdates: () => Promise<{ ok: boolean; error?: string }>;
    installUpdate: () => Promise<boolean>;
    onUpdateStatus: (callback: (status: OrunUpdateStatus) => void) => () => void;
    onNotify: (callback: (data: { title: string; body: string }) => void) => () => void;
  };
  window: {
    minimize: () => Promise<boolean>;
    maximize: () => Promise<boolean>;
    close: () => Promise<boolean>;
    isMaximized: () => Promise<boolean>;
  };
  tts: {
    listVoices: (engine: OrunTTSEngine) => Promise<OrunVoice[]>;
    synthesize: (engine: OrunTTSEngine, voiceId: string, text: string) => Promise<{ audioBase64: string; mime: string; engine?: string; fallbackFrom?: string }>;
    engines: () => Promise<OrunTTSEngine[]>;
    setEngineConfig: (engine: OrunTTSEngine, cfg: Record<string, unknown>) => Promise<boolean>;
    getEngineConfig: (engine: OrunTTSEngine) => Promise<Record<string, unknown>>;
    usageToday: () => Promise<OrunTTSUsageRow[]>;
  };
  nutrition: {
    getDaily: (date?: string) => Promise<OrunNutritionDaily>;
    getRange: (startDate: string, endDate: string) => Promise<OrunNutritionRange>;
  };
  finance: {
    getDaily: (date?: string) => Promise<OrunFinanceDaily>;
    getRange: (startDate: string, endDate: string) => Promise<OrunFinanceRange>;
  };
  health: {
    getDaily: (date?: string) => Promise<OrunHealthEntry[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunHealthEntry[]>;
  };
  developer: {
    getReviews: (date?: string) => Promise<OrunDeveloperReview[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunDeveloperRange>;
    setWorkspace: (path: string) => Promise<{ ok: boolean }>;
    getWorkspace: () => Promise<string | null>;
    listFiles: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; path: string }[] | { error: string }>;
  };
  teacher: {
    getProgress: (date?: string) => Promise<OrunTeacherProgress[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunTeacherRange>;
  };
  videoEditor: {
    getProjects: (date?: string) => Promise<OrunVideoProject[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunCreatorRange>;
    listTemplates: () => Promise<Array<{ id: string; name: string; description: string; durationSec: number; fps: number }>>;
    createComposition: (opts: { templateId?: string; title?: string }) => Promise<{ entryPoint: string; compositionId: string; template: string; durationSec: number; fps: number }>;
    renderVideo: (opts: { entryPoint: string; compositionId: string; outputPath?: string; codec?: string; crf?: number }) => Promise<{ ok: boolean; outputPath?: string; durationMs?: number; error?: string }>;
  };
  image3d: {
    getGenerations: (date?: string) => Promise<OrunImage3DGeneration[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunDesignerRange>;
    falModels: () => Promise<Array<{ id: string; name: string; type: string; speed: string; free: boolean }>>;
    tripoModels: () => Promise<Array<{ id: string; name: string; type: string }>>;
    generateImage: (opts: { prompt: string; model?: string; imageSize?: string; numImages?: number }) => Promise<{ ok: boolean; images?: Array<{ url: string; width: number; height: number }>; error?: string }>;
    generate3D: (opts: { prompt: string; type?: string; texture?: boolean }) => Promise<{ ok: boolean; modelUrl?: string; taskId?: string; error?: string }>;
    comfyuiTest: (baseUrl?: string) => Promise<{ ok: boolean; version?: string; error?: string }>;
    comfyuiSubmit: (opts: { workflowJson: any; baseUrl?: string }) => Promise<{ ok: boolean; promptId?: string; error?: string }>;
    comfyuiResults: (promptId: string, baseUrl?: string) => Promise<{ ok: boolean; images?: Array<{ filename: string; url: string }>; error?: string }>;
  };
  musicProducer: {
    getProjects: (date?: string) => Promise<OrunMusicProject[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunCreatorRange>;
    wonderaModels: () => Promise<Array<{ id: string; name: string; description: string }>>;
    autotonePresets: () => Promise<Array<{ id: string; name: string }>>;
    generateMusic: (opts: { prompt: string; genre?: string; durationSec?: number }) => Promise<{ ok: boolean; audioUrl?: string; duration?: number; error?: string }>;
    master: (opts: { audioBase64: string; mimeType?: string; targetLufs?: number; profile?: string }) => Promise<{ ok: boolean; audioBase64?: string; mime?: string; error?: string }>;
    separateStems: (opts: { audioBase64: string }) => Promise<{ ok: boolean; vocals?: string; drums?: string; bass?: string; other?: string; error?: string }>;
    autotone: (opts: { audioBase64: string; sampleRate?: number; scale?: string; strength?: number }) => Promise<{ ok: boolean; audioBase64?: string; error?: string }>;
    mix: (opts: { tracks: Array<{ audioBase64: string; volume?: number }>; sampleRate?: number; bitDepth?: number; channels?: number }) => Promise<{ ok: boolean; audioBase64?: string; mime?: string; duration?: number; error?: string }>;
  };
  whatsapp: {
    connect: () => Promise<{ ok: boolean; error?: string }>;
    disconnect: () => Promise<boolean>;
    status: () => Promise<OrunWhatsAppStatus["status"]>;
    sendTest: (jid: string, text: string) => Promise<{ ok: boolean; error?: string }>;
    listGroups: () => Promise<{ jid: string; name: string }[]>;
    testGroup: (jid: string, label: string) => Promise<{ ok: boolean; error?: string }>;
    getAgentJids: () => Promise<Record<string, string>>;
    setAgentJids: (agentJids: Record<string, string>) => Promise<boolean>;
    onStatusUpdate: (callback: (status: OrunWhatsAppStatus) => void) => () => void;
    onQR: (callback: (dataUrl: string) => void) => () => void;
  };
  waAutomation: {
    getStats: () => Promise<{ dailyMsgCount: number; dailyMsgLimit: number; queueLength: number; date: string }>;
    addKeywordRule: (rule: { keywords: string[]; agent: string; action: "notify" | "task" | "summary" }) => Promise<{ ok: boolean; error?: string }>;
    removeKeywordRule: (ruleId: string) => Promise<{ ok: boolean; error?: string }>;
    toggleKeywordRule: (ruleId: string) => Promise<{ ok: boolean; error?: string }>;
    getKeywordRules: () => Promise<Array<{ id: string; keywords: string[]; agent: string; action: string; enabled: boolean }>>;
    getSummary: (jid: string, agentName: string, hours?: number) => Promise<{ ok: boolean; summary?: string; error?: string }>;
    broadcast: (text: string, groupJids: string[]) => Promise<{ ok: boolean; results?: Array<{ jid: string; ok: boolean; error?: string }>; error?: string }>;
    setN8nWebhook: (url: string) => Promise<{ ok: boolean; error?: string }>;
    getN8nWebhook: () => Promise<string>;
    extractDate: (text: string) => Promise<{ date: string; description: string; hour: number; minute: number } | null>;
  };
  schedules: {
    get: () => Promise<Record<string, OrunSchedule>>;
    set: (agentName: string, cfg: OrunSchedule) => Promise<boolean>;
  };
  healthGoals: {
    get: () => Promise<{ target_weight_kg?: number; target_height_cm?: number; current_weight_kg?: number; current_height_cm?: number; start_weight_kg?: number; start_date?: string } | null>;
    set: (goals: { target_weight_kg?: number; target_height_cm?: number; current_weight_kg?: number; current_height_cm?: number; start_weight_kg?: number; start_date?: string }) => Promise<boolean>;
    weeklyWeight: () => Promise<{ current?: { weight: number; date: string }; lastWeek?: { weight: number; date: string }; weeklyChange?: number; totalLost?: number; goals?: { target?: number; start?: number } }>;
    logWeight: (weightKg: number) => Promise<boolean>;
  };
  agenda: {
    get: (date?: string) => Promise<Array<{ id: string; date: string; title: string; description?: string; time?: string; completed: number }>>;
    add: (entry: { title: string; description?: string; time?: string; completed?: boolean }) => Promise<boolean>;
    clear: (date?: string) => Promise<boolean>;
  };
  nutritionFile: {
    getToday: () => Promise<string | null>;
  };
  stt: {
    engines: () => Promise<string[]>;
    testConnection: (baseUrl: string) => Promise<{ ok: boolean; error?: string }>;
    transcribe: (args: { baseUrl: string; audioBase64: string; mimeType: string; language: string }) => Promise<{ text: string }>;
  };
  automation: {
    listRules: () => Promise<AutomationRule[]>;
    addRule: (rule: Omit<AutomationRule, "id" | "enabled" | "created_at">) => Promise<{ ok: boolean; rules: AutomationRule[] }>;
    removeRule: (ruleId: string) => Promise<{ ok: boolean; rules: AutomationRule[] }>;
    toggleRule: (ruleId: string) => Promise<{ ok: boolean; rules: AutomationRule[] }>;
  };
  mcp: {
    listServers: () => Promise<{ name: string; ready: boolean; tools: number }[]>;
    addServer: (config: { name: string; command: string; args?: string[]; env?: Record<string, string> }) => Promise<{ ok: boolean; tools?: number; error?: string }>;
    removeServer: (name: string) => Promise<{ ok: boolean }>;
    listTools: () => Promise<{ name: string; description: string }[]>;
  };
  plugins: {
    list: () => Promise<{ id: string; name: string; version: string; description?: string; error?: string; installed: boolean }[]>;
    load: (id: string) => Promise<{ success?: boolean; error?: string; tools?: number; hooks?: string[] }>;
    unload: (id: string) => Promise<{ success?: boolean; error?: string }>;
    loadAll: () => Promise<{ id: string; success?: boolean; error?: string; tools?: number }[]>;
  };
  workspaceActions: {
    onAction: (handler: (request: { requestId: string; workspace: string; action: string; params: Record<string, unknown> }) => void) => () => void;
    sendResult: (requestId: string, result: { success: boolean; data?: unknown; error?: string; message?: string }) => void;
  };
  sync: {
    status: () => Promise<{ connected: boolean; lastSync?: string; error?: string }>;
    trigger: () => Promise<{ ok: boolean; error?: string }>;
    test: () => Promise<{ ok: boolean; error?: string }>;
    configure: (databaseUrl: string) => Promise<{ ok: boolean; error?: string }>;
  };
  system: {
    executeCommand: (command: string, options?: { timeout?: number; cwd?: string }) => Promise<{ success: boolean; stdout?: string; error?: string }>;
  };
  db: {
    listBackups: () => Promise<Array<{ name: string; path: string; size: number; date: string }>>;
    restore: (backupPath: string) => Promise<{ ok: boolean; error?: string }>;
    fullExport: () => Promise<{ version: number; exportedAt: string; conversations: any[]; settings: Record<string, unknown>; schedules: Record<string, unknown>; memory: Array<{ key: string; value: string }> } | null>;
  };
  deepLink: {
    onOpen: (handler: (url: string) => void) => () => void;
  };
  voiceOverlay: {
    onShow: (handler: () => void) => () => void;
  };
  wakeListener: {
    start: () => Promise<boolean>;
    stop: () => Promise<boolean>;
    status: () => Promise<{ running: boolean }>;
    restart: () => Promise<boolean>;
    test: () => Promise<{ python: boolean; packages: boolean; tcpPort: boolean }>;
  };
  spotify: {
    getCredentials: () => Promise<{ clientId: string; clientSecret: string }>;
    setCredentials: (clientId: string, clientSecret: string) => Promise<{ ok: boolean }>;
    getAuthUrl: () => Promise<{ url: string; state: string } | { url: null; error: string }>;
    startCallbackServer: () => Promise<{ ok: boolean; error?: string }>;
    stopCallbackServer: () => Promise<{ ok: boolean }>;
    saveTokens: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<{ ok: boolean }>;
    loadTokens: () => Promise<{ ok: boolean; connected: boolean }>;
    isConnected: () => Promise<boolean>;
    disconnect: () => Promise<{ ok: boolean }>;
    getN8nWebhook: () => Promise<string>;
    setN8nWebhook: (url: string) => Promise<{ ok: boolean }>;
    getPlayback: () => Promise<OrunSpotifyPlayback | null>;
    getCurrentlyPlaying: () => Promise<OrunSpotifyTrack | null>;
    play: (options?: { contextUri?: string; uris?: string[]; offset?: { position: number }; positionMs?: number; deviceId?: string }) => Promise<{ ok: boolean; error?: string }>;
    pause: (deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    skipNext: (deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    skipPrevious: (deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    seek: (positionMs: number, deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    setVolume: (volume: number, deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    setShuffle: (state: boolean, deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    setRepeat: (state: "off" | "track" | "context", deviceId?: string) => Promise<{ ok: boolean; error?: string }>;
    getDevices: () => Promise<OrunSpotifyDevice[]>;
    transferPlayback: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
    search: (query: string, types?: string, limit?: number) => Promise<{ tracks?: { items: OrunSpotifyTrack[] }; artists?: { items: any[] }; playlists?: { items: any[] }; error?: string }>;
    getPlaylists: (limit?: number) => Promise<OrunSpotifyPlaylist[]>;
    getPlaylist: (id: string) => Promise<OrunSpotifyPlaylist & { tracks: { items: Array<{ track: OrunSpotifyTrack }> } }>;
    getPlaylistTracks: (id: string, limit?: number, offset?: number) => Promise<Array<{ track: OrunSpotifyTrack }>>;
    createPlaylist: (name: string, description?: string, isPublic?: boolean) => Promise<OrunSpotifyPlaylist>;
    addToQueue: (uri: string) => Promise<{ ok: boolean; error?: string }>;
    getQueue: () => Promise<{ currently_playing?: OrunSpotifyTrack; queue: OrunSpotifyTrack[] }>;
    getMe: () => Promise<{ id: string; display_name: string; images: Array<{ url: string }> }>;
    getTopTracks: (limit?: number, timeRange?: "short_term" | "medium_term" | "long_term") => Promise<OrunSpotifyTrack[]>;
    getRecentlyPlayed: (limit?: number) => Promise<Array<{ track: OrunSpotifyTrack; played_at: string }>>;
  };
  discord: {
    getToken: () => Promise<string>;
    setToken: (token: string) => Promise<{ ok: boolean }>;
    connect: (token: string) => Promise<{ ok: boolean; error?: string }>;
    disconnect: () => Promise<{ ok: boolean }>;
    getStatus: () => Promise<"disconnected" | "connecting" | "connected" | "error">;
    getGuilds: () => Promise<OrunDiscordGuild[]>;
    getChannels: (guildId: string) => Promise<OrunDiscordChannel[]>;
    sendMessage: (channelId: string, content: string) => Promise<{ ok: boolean; messageId?: string; error?: string }>;
    sendDM: (userId: string, content: string) => Promise<{ ok: boolean; messageId?: string; error?: string }>;
    setAgentResponse: (enabled: boolean) => Promise<{ ok: boolean }>;
    getAgentResponse: () => Promise<boolean>;
    onStatusUpdate: (callback: (status: string) => void) => () => void;
  };
  telegram: {
    getToken: () => Promise<string>;
    setToken: (token: string) => Promise<{ ok: boolean }>;
    connect: (token: string) => Promise<{ ok: boolean; error?: string }>;
    disconnect: () => Promise<{ ok: boolean }>;
    status: () => Promise<{ status: string; error?: string }>;
    sendTest: (chatId: string, text: string) => Promise<{ ok: boolean; error?: string }>;
    getAgentChats: () => Promise<Record<string, string>>;
    setAgentChats: (agentChats: Record<string, string>) => Promise<{ ok: boolean }>;
    getStats: () => Promise<{ dailyCount: number; dailyLimit: number; queueLength: number }>;
    onStatusUpdate: (callback: (data: { status: string; error?: string }) => void) => () => void;
  };
  usage: {
    getRange: (startDate: string, endDate: string) => Promise<OrunUsageRow[]>;
  };
}

interface OrunSpotifyPlayback {
  is_playing: boolean;
  progress_ms: number;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  item?: OrunSpotifyTrack;
  device?: OrunSpotifyDevice;
  shuffle_state: boolean;
  repeat_state: "off" | "track" | "context";
}

interface OrunSpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: { id: string; name: string; images: Array<{ url: string; width: number; height: number }> };
  duration_ms: number;
  uri: string;
  external_urls: { spotify: string };
  preview_url?: string;
}

interface OrunSpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
  supports_volume: boolean;
}

interface OrunSpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  owner: { display_name: string };
  public: boolean;
}

interface OrunDiscordGuild {
  id: string;
  name: string;
  memberCount: number;
  iconURL: string | null;
}

interface OrunDiscordChannel {
  id: string;
  name: string;
  type: number;
}

declare global {
  interface Window {
    orun: OrunAPI;
  }
}

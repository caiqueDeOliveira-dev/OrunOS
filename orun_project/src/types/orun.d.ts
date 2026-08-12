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

/** Payload do onDone: string normal ou objeto de execução silenciosa (ação executada via tool, sem resposta). */
export type OrunDonePayload = string | { silent?: boolean; text?: string };

interface OrunStreamCallbacks {
  onChunk?: (delta: string) => void;
  onDone?: (fullText: OrunDonePayload) => void;
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
  /**
   * Recebe o texto final. Quando a resposta foi uma EXECUÇÃO SILENCIOSA (o agente
   * executou uma ação direta via tool e não precisa responder), recebe
   * `{ silent: true, text: "" }` — o chamador não deve falar nem mostrar texto.
   */
  onDone?: (fullText: OrunDonePayload) => void;
  onError?: (message: string) => void;
  agentId?: string;
  /** When true, the assistant replies in short spoken-friendly sentences (voice overlay). */
  voiceMode?: boolean;
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

export interface SkillInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  status: "ok" | "invalid";
  errors: string[];
  warnings: string[];
  permissions: string[];
  dependencies: Record<string, string>;
  missingDeps: string[];
  manifestVersion: number;
  installed: boolean;
}

export interface SkillDetails {
  ok: boolean;
  id: string;
  manifest: Record<string, unknown>;
  validation: { ok: boolean; errors: string[]; warnings: string[] };
  enabled: boolean;
  dependencies: Record<string, { satisfied: boolean; reason?: string; range?: string; version?: string }>;
  loaded: boolean;
  error?: string;
}

export interface MemoryRecord {
  id: string;
  uid?: string;
  key: string;
  content: string;
  tags: string[];
  scopeAgent: string | null;
  scopeProject: string | null;
  source: string;
  embedding: number[] | null;
  created_at: number;
  updated_at: number;
  access_count: number;
}

export interface MemorySaveInput {
  key: string;
  content: string;
  tags?: string[];
  scopeAgent?: string | null;
  scopeProject?: string | null;
  source?: string;
}

export interface MemorySearchOpts {
  query: string;
  scopeAgent?: string | null;
  scopeProject?: string | null;
  topK?: number;
  threshold?: number;
}

export interface MemorySearchResult {
  results: MemoryRecord[];
  method: "semantic" | "text-fallback" | "empty";
}

export interface MemoryStats {
  total: number;
  withEmbedding: number;
  byScope: Record<string, number>;
  sizeKB: number;
}

export interface KnowledgeDoc {
  id: string;
  uid?: string;
  kind: string;
  title: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
  date: string;
  created_at: number;
  updated_at: number;
}

export interface KnowledgeDocSummary {
  id: string;
  uid?: string;
  kind: string;
  title: string;
  tags: string[];
  date: string;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface KnowledgeDocInput {
  kind?: string;
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  date?: string;
}

export type PlannerStatus = "pending" | "running" | "done" | "failed" | "blocked" | "cancelled";

export interface PlannerTask {
  id: string;
  uid?: string;
  goalId: string;
  title: string;
  description: string;
  agent: string | null;
  status: PlannerStatus;
  priority: number;
  dependencies: string[];
  result: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
}

export interface PlannerTaskInput {
  goalId?: string;
  title: string;
  description?: string;
  agent?: string | null;
  priority?: number;
  dependencies?: string[];
}

export interface PlannerReview {
  goalId: string;
  total: number;
  done: number;
  failed: number;
  review?: string;
  tasks: { id: string; title: string; status: PlannerStatus; result?: string | null; error?: string | null }[];
}

export interface AgentSchema {
  id: string;
  name: string;
  persona: string;
  tools: string[] | null;
  memoryScope: string;
  permissions: string[] | null;
}

export interface DelegationStep {
  step: "route" | "execute" | "escalate";
  agent?: string | null;
  reason?: string;
  ok?: boolean;
  error?: string | null;
}

export interface DelegationResult {
  ok: boolean;
  agent?: string | null;
  reason?: string;
  result?: string;
  error?: string;
  escalated?: boolean;
  steps: DelegationStep[];
}

export interface AnalyticsSystem {
  cpu: number;
  memory: number;
  disk: { freeGB: number; totalGB: number; usedPercent: number };
  uptime: number;
  platform: string;
  arch: string;
  hostname: string;
}

export interface AnalyticsSummary {
  system: AnalyticsSystem;
  counts: {
    conversations: number;
    messages: number;
    financeLog: number;
    healthLog: number;
    marketingLog: number;
    agenda: number;
    usageEvents: number;
  };
  usage: { today: Record<string, number>; total: Record<string, number> };
  ai: { requests: number; tokensIn: number; tokensOut: number };
  telemetry: { counters: Record<string, number>; metrics: Record<string, unknown>; recentTraces: number };
  engines: {
    planner: { total: number; byStatus: Record<string, number>; goals: number } | null;
    memory: { total: number; byScope: Record<string, number> } | null;
    knowledge: { total: number; byKind: Record<string, number> } | null;
    skills: { total: number; enabled: number } | null;
  };
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

export type OrunTTSEngine = "elevenlabs" | "google" | "azure" | "edge" | "xtts" | "piper" | "bark" | "f5tts" | "kokoro";

export interface OrunVoice {
  id: string;
  name: string;
  previewUrl: string | null;
  gender?: "male" | "female";
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

// Home IA types
export type OrunHomeDeviceType = "light" | "switch" | "climate" | "lock" | "cover" | "sensor" | "binary_sensor" | "camera" | "media_player";

export interface OrunHomeDevice {
  id: string;
  name: string;
  type: OrunHomeDeviceType;
  icon: string;
  state: boolean;
  value: string | number;
  brightness?: number;
  temperature?: number;
  locked?: boolean;
  room?: string;
}

export interface OrunHomeAutomation {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  lastRun: string | null;
  steps: { deviceId: string; action: string; brightness?: number }[];
}

export interface OrunHomeConfig {
  mode: "simulated" | "real";
  host: string;
  token: string;
  name: string;
  connected: boolean;
  simulated: boolean;
  error?: string;
}

// Cyber Security types
export type OrunSecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export interface OrunSecurityFinding {
  id: string;
  title: string;
  severity: OrunSecuritySeverity;
  category: string;
  description: string;
  recommendation: string;
  file?: string;
  status: "open" | "mitigated";
}

export interface OrunSecurityReport {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  ranAt: string;
  summary: {
    total: number;
    open: number;
    mitigated: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    categories: string[];
  };
  findings: OrunSecurityFinding[];
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
  status: "disconnected" | "connecting" | "reconnecting" | "qr" | "connected";
  selfJid?: string;
  loggedOut?: boolean;
  groupsRefreshed?: boolean;
  attempt?: number;
  maxAttempts?: number;
  nextRetryMs?: number;
  maxReached?: boolean;
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
  identity: {
    listUsers: () => Promise<OrunUser[]>;
    listIdentities: (opts?: { pendingOnly?: boolean }) => Promise<OrunUserIdentity[]>;
    listWorkspaces: () => Promise<OrunWorkspace[]>;
    listChannels: (opts?: { enabledOnly?: boolean }) => Promise<OrunAgentChannel[]>;
    setChannel: (args: { provider: string; externalChannelId: string; agent: string; name?: string }) => Promise<OrunAgentChannel>;
    setChannelEnabled: (args: { provider: string; externalChannelId: string; enabled: boolean }) => Promise<OrunAgentChannel>;
    completeOnboarding: (args: { identityId: string; name: string; workspaceName?: string }) => Promise<{ userId: string; profileId: string; workspaceId: string; identityId: string; status: string }>;
    linkIdentity: (args: { identityId: string; userId: string }) => Promise<{ userId: string; identityId: string; workspaceId: string | null }>;
    getVoiceSettings: (agentId: string) => Promise<OrunAgentVoiceSettings | null>;
    setVoiceSettings: (agentId: string, patch: Partial<OrunAgentVoiceSettings>) => Promise<OrunAgentVoiceSettings>;
  };
  n8n: {
    listWorkflows: () => Promise<{ id: string; name: string; active: boolean }[]>;
    testConnection: (cfg?: OrunN8nConfig) => Promise<{ ok: boolean; error?: string; workflowCount?: number }>;
    triggerWebhook: (args: { webhookUrl: string; payload?: unknown; headerName?: string; headerValue?: string }) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
  };
  socialMedia: {
    getConfig: () => Promise<Record<OrunSocialMediaPlatform, OrunSocialMediaWebhook | undefined>>;
    setConfig: (cfg: Record<OrunSocialMediaPlatform, OrunSocialMediaWebhook | undefined>) => Promise<boolean>;
    getBufferConfig: () => Promise<{ token?: string; channels?: Record<string, string> }>;
    setBufferConfig: (cfg: { token?: string; channels?: Record<string, string> }) => Promise<boolean>;
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
    onUpdateChecking: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: (data: { version: string; releaseDate?: string }) => void) => () => void;
    onUpdateNotAvailable: (callback: () => void) => () => void;
    onUpdateProgress: (callback: (data: { percent: number }) => void) => () => void;
    onUpdateDownloaded: (callback: (data: { version: string }) => void) => () => void;
    onUpdateError: (callback: (data: { message: string }) => void) => () => void;
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
    fooocusTest: (baseUrl?: string) => Promise<{ ok: boolean; version?: string; error?: string }>;
    fooocusDefaultUrl: string;
  };
  musicProducer: {
    getProjects: (date?: string) => Promise<OrunMusicProject[]>;
    getRange: (startDate: string, endDate: string) => Promise<OrunCreatorRange>;
    wonderaModels: () => Promise<Array<{ id: string; name: string; description: string }>>;
    autotonePresets: () => Promise<Array<{ id: string; name: string }>>;
    generateMusic: (opts: { prompt: string; genre?: string; durationSec?: number }) => Promise<{ ok: boolean; audioUrl?: string; duration?: number; genre?: string; error?: string }>;
    master: (opts: { audioBase64: string; mimeType?: string; targetLufs?: number; profile?: string }) => Promise<{ ok: boolean; audioBase64?: string; mime?: string; error?: string }>;
    separateStems: (opts: { audioBase64: string }) => Promise<{ ok: boolean; vocals?: string; drums?: string; bass?: string; other?: string; error?: string }>;
    autotone: (opts: { audioBase64: string; sampleRate?: number; scale?: string; strength?: number }) => Promise<{ ok: boolean; audioBase64?: string; error?: string }>;
    mix: (opts: { tracks: Array<{ audioBase64: string; volume?: number }>; sampleRate?: number; bitDepth?: number; channels?: number }) => Promise<{ ok: boolean; audioBase64?: string; mime?: string; duration?: number; error?: string }>;
    applyGain: (opts: { audioBase64: string; gain?: number }) => Promise<{ ok: boolean; audioBase64?: string; mime?: string; error?: string }>;
  };
  homeAssistant: {
    getConfig: () => Promise<OrunHomeConfig>;
    setConfig: (cfg: Partial<OrunHomeConfig>) => Promise<OrunHomeConfig>;
    getDevices: () => Promise<Array<OrunHomeDevice>>;
    getRooms: () => Promise<Array<{ id: string; name: string; icon: string; devices: OrunHomeDevice[] }>>;
    getStates: () => Promise<{ mode: string; states: unknown[] }>;
    getDeviceState: (deviceId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    callService: (deviceId: string, service: string, params?: Record<string, unknown>) => Promise<{ success: boolean; data?: any; error?: string }>;
    getAutomations: () => Promise<Array<OrunHomeAutomation>>;
    runAutomation: (automationId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createAutomation: (params: { name: string; description?: string; steps?: unknown[] }) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteAutomation: (automationId: string) => Promise<{ success: boolean; error?: string }>;
    toggleAutomation: (automationId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getScenes: () => Promise<Array<{ id: string; name: string; icon: string; description: string }>>;
    activateScene: (sceneId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getStatus: () => Promise<any>;
  };
  security: {
    runAudit: () => Promise<OrunSecurityReport>;
    getReport: () => Promise<OrunSecurityReport | null>;
    fixFinding: (findingId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    exportReport: () => Promise<{ ok: boolean; report?: string; error?: string }>;
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
    transcribeGroq: (args: { audioBase64: string; mimeType: string; language: string; model?: string }) => Promise<{ text: string; error?: string; language?: string }>;
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
  skills: {
    list: () => Promise<SkillInfo[]>;
    details: (id: string) => Promise<SkillDetails>;
    install: (srcDir: string, force?: boolean) => Promise<{ ok: boolean; id?: string; version?: string; error?: string; warnings?: string[] }>;
    installDialog: () => Promise<{ ok: boolean; id?: string; error?: string; canceled?: boolean }>;
    uninstall: (id: string, force?: boolean) => Promise<{ ok: boolean; id?: string; error?: string }>;
    setEnabled: (id: string, enabled: boolean) => Promise<{ ok: boolean; id?: string; enabled?: boolean; error?: string }>;
    reload: () => Promise<{ ok: boolean; order?: string[]; errors?: string[]; failed?: { id: string; error: string }[]; loaded?: number }>;
    tools: () => Promise<{ name: string; description: string; parameters?: Record<string, unknown> }[]>;
    dir: () => Promise<string>;
    openDir: () => Promise<{ ok: boolean; dir?: string; error?: string }>;
  };
  memory: {
    save: (entry: MemorySaveInput) => Promise<{ ok: boolean; record?: MemoryRecord; deduped?: boolean; error?: string }>;
    search: (opts: MemorySearchOpts) => Promise<MemorySearchResult>;
    inject: (opts: MemorySearchOpts & { maxChars?: number }) => Promise<string>;
    consolidate: (opts?: { scopeAgent?: string | null; scopeProject?: string | null; minAgeMs?: number }) => Promise<{ ok: boolean; reason?: string; summarized?: string; candidates?: number; saved?: { ok: boolean } }>;
    remove: (id: string) => Promise<{ ok: boolean; removed?: number }>;
    stats: () => Promise<MemoryStats>;
    list: () => Promise<MemoryRecord[]>;
  };
  agentHub: {
    list: () => Promise<AgentSchema[]>;
    get: (id: string) => Promise<{ ok: boolean; schema?: AgentSchema; error?: string }>;
    route: (request: string, context?: string) => Promise<{ agent: string | null; reason?: string }>;
    delegate: (request: string, context?: string, agent?: string | null) => Promise<DelegationResult>;
  };
  analytics: {
    summary: () => Promise<AnalyticsSummary>;
    system: () => Promise<AnalyticsSystem>;
    event: (ev: { type: string; agent?: string | null; detail?: string }) => Promise<{ ok: boolean; error?: string }>;
  };
  knowledge: {
    save: (doc: KnowledgeDocInput) => Promise<{ ok: boolean; record?: KnowledgeDoc; updated?: boolean; error?: string }>;
    changelog: (opts?: { repoPath?: string; sinceDays?: number; title?: string; date?: string }) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    diary: (opts?: { date?: string; repoPath?: string; memories?: { content: string }[]; title?: string }) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    adr: (opts?: { title?: string; context?: string; decision?: string; consequences?: string[]; status?: string }) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    list: (opts?: { kind?: string }) => Promise<KnowledgeDocSummary[]>;
    get: (id: string) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    remove: (id: string) => Promise<{ ok: boolean; removed?: number }>;
    stats: () => Promise<{ total: number; byKind: Record<string, number>; sizeKB: number }>;
  };
  planner: {
    create: (opts?: PlannerTaskInput) => Promise<{ ok: boolean; task?: PlannerTask; updated?: boolean; error?: string }>;
    list: (opts?: { goalId?: string | null; status?: string | null }) => Promise<PlannerTask[]>;
    get: (id: string) => Promise<{ ok: boolean; task?: PlannerTask; error?: string }>;
    update: (id: string, patch?: Partial<PlannerTask>) => Promise<{ ok: boolean; task?: PlannerTask; error?: string }>;
    next: (goalId: string) => Promise<{ ok: boolean; task?: PlannerTask; error?: string; done?: boolean }>;
    run: (goalId: string) => Promise<{ ok: boolean; executed: { id?: string; title?: string; status?: string }[]; counts: { total: number; done: number; failed: number; pending: number } }>;
    plan: (goal: string, context?: string) => Promise<{ ok: boolean; tasks?: PlannerTask[]; error?: string }>;
    review: (goalId: string) => Promise<{ ok: boolean; summary: PlannerReview }>;
    stats: () => Promise<{ total: number; byStatus: Record<string, number>; goals: number }>;
  };
  workspaceActions: {
    onAction: (handler: (request: { requestId: string; workspace: string; action: string; params: Record<string, unknown> }) => void) => () => void;
    sendResult: (requestId: string, result: { success: boolean; data?: unknown; error?: string; message?: string }) => void;
    onOpen: (handler: (workspaceId: string) => void) => () => void;
    notifyRegistered: (workspaceId: string) => void;
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
    onProactive: (handler: (payload: { prompt: string; source?: string }) => void) => () => void;
  };
  quickChat: {
    hide: () => Promise<boolean>;
    isVisible: () => Promise<boolean>;
    sendMessage: (text: string) => Promise<boolean>;
    onShow: (handler: () => void) => () => void;
    onResponse: (handler: (text: string) => void) => () => void;
    onError: (handler: (msg: string) => void) => () => void;
    onHide: (handler: () => void) => () => void;
  };
  wakeListener: {
    start: () => Promise<boolean>;
    stop: () => Promise<boolean>;
    status: () => Promise<{ running: boolean }>;
    restart: () => Promise<boolean>;
    test: () => Promise<{ python: boolean; packages: boolean; tcpPort: boolean }>;
  };
  webhook: {
    status: () => Promise<{ running: boolean; port: number; secret: string }>;
    onEvent: (handler: (event: { method: string; url: string; headers: Record<string, string>; body: unknown; timestamp: number; source: string }) => void) => () => void;
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
  activity: {
    list: (opts?: { count?: number; agentId?: string; action?: string }) => Promise<Array<{ timestamp: number; agentId: string; action: string; details: string; result: string }>>;
    telemetry: () => Promise<{ counters: Record<string, number>; metrics: Record<string, { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number }>; recentTraces: Array<{ name: string; durationMs: number; ts: number }> }>;
    usageRange: (start: string, end: string) => Promise<Array<{ provider: string; date: string; requests: number; tokens_in: number; tokens_out: number }>>;
    clear: () => Promise<boolean>;
    onNewEntry: (handler: (entry: { timestamp: number; agentId: string; action: string; details: string; result: string }) => void) => () => void;
  };
  fileSystem: {
    saveFile: (payload: { fileName: string; base64: string; subfolder?: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }>;
    getFolderPath: (subfolder?: string) => Promise<string>;
    createFolder: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
    listFiles: (folderPath: string) => Promise<{ name: string; path: string; size: number; isFile: boolean }[]>;
  };
  backup: {
    list: () => Promise<Array<{ name: string; path: string; size: number; date: string }>>;
    restore: (backupPath: string) => Promise<{ ok: boolean; data?: string; error?: string }>;
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
  google: {
    getCredentials: () => Promise<{ clientId: string; clientSecret: string }>;
    setCredentials: (clientId: string, clientSecret: string) => Promise<{ ok: boolean }>;
    getAuthUrl: () => Promise<{ url: string; state: string } | { url: null; error: string }>;
    startCallbackServer: () => Promise<{ ok: boolean; error?: string }>;
    stopCallbackServer: () => Promise<{ ok: boolean }>;
    saveTokens: (tokens: any) => Promise<{ ok: boolean }>;
    loadTokens: () => Promise<{ ok: boolean; connected: boolean }>;
    isConnected: () => Promise<boolean>;
    disconnect: () => Promise<{ ok: boolean }>;
  };
  gmail: {
    listMessages: (opts?: { maxResults?: number; query?: string }) => Promise<Array<{ id: string; threadId: string }>>;
    getMessage: (id: string) => Promise<OrunGmailMessage | null>;
    send: (to: string, subject: string, body: string, threadId?: string) => Promise<any>;
    reply: (messageId: string, body: string) => Promise<any>;
    markRead: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
  };
  emailService: {
    start: () => Promise<{ ok: boolean }>;
    stop: () => Promise<{ ok: boolean }>;
    status: () => Promise<{ polling: boolean; connected: boolean }>;
    analyze: (emailId: string) => Promise<{ action: string; summary: string; agent: string; draftReply?: string } | { error: string }>;
  };
  calendar: {
    listEvents: (opts?: { maxResults?: number; timeMin?: string; timeMax?: string }) => Promise<Array<OrunCalendarEvent>>;
    createEvent: (data: { summary: string; description?: string; startTime: string; endTime: string; timeZone?: string }) => Promise<OrunCalendarEvent>;
    updateEvent: (id: string, updates: Partial<OrunCalendarEvent>) => Promise<OrunCalendarEvent>;
    deleteEvent: (id: string) => Promise<{ ok: boolean; error?: string }>;
    listCalendars: () => Promise<Array<{ id: string; summary: string; primary?: boolean }>>;
  };
  auth: {
    getState: () => Promise<OrunAuthState | null>;
    signIn: (email: string, password: string) => Promise<OrunAuthState>;
    signUp: (email: string, password: string, displayName?: string) => Promise<OrunAuthState>;
    signOut: () => Promise<OrunAuthState>;
    getOwner: () => Promise<OrunOwnerLink | null>;
    listDevices: (tenantId: string) => Promise<OrunDevice[]>;
    revokeDevice: (deviceId: string) => Promise<void>;
    getLicense: () => Promise<OrunLicenseState>;
    refreshLicense: () => Promise<OrunLicenseState>;
    getEntitlements: (tenantId: string) => Promise<OrunEntitlements>;
    startCheckout: (tenantId: string) => Promise<string>;
    exportData: () => Promise<Record<string, unknown>>;
    deleteAccount: () => Promise<OrunAccountDeletionResult>;
    onStateChanged: (callback: (state: OrunAuthState) => void) => () => void;
  };
  shield: {
    startMonitoring: () => Promise<void>;
    stopMonitoring: () => Promise<void>;
    fullScan: (req: OrunShieldFullScanRequest) => Promise<OrunShieldFullScanResponse>;
    getFindingsLog: () => Promise<OrunThreatFinding[]>;
    checkClamAvAvailability: () => Promise<{ available: boolean; version?: string }>;
    updateDefinitions: () => Promise<{ updated: boolean; log: string }>;
    blockIp: (ip: string) => Promise<void>;
    quarantineFinding: (finding: OrunThreatFinding) => Promise<OrunQuarantineActionResult>;
    listQuarantine: () => Promise<OrunQuarantineEntry[]>;
    restoreQuarantine: (id: string) => Promise<OrunQuarantineActionResult>;
    deleteQuarantine: (id: string) => Promise<OrunQuarantineActionResult>;
    analyzeFile: (filePath: string) => Promise<OrunFileAnalysisResult>;
    getProcessTree: () => Promise<OrunProcessTreeNode[]>;
    getDefenderStatus: () => Promise<OrunDefenderStatus>;
    syncDefenderThreats: () => Promise<OrunThreatFinding[]>;
    runDefenderQuickScan: () => Promise<{ success: boolean; error?: string }>;
    updateDefenderSignatures: () => Promise<{ updated: boolean; error?: string }>;
    onThreatDetected: (callback: (finding: OrunThreatFinding) => void) => () => void;
    onScanStarted: (callback: (payload: { target: string; engine: string }) => void) => () => void;
    onScanFinished: (callback: (result: OrunScanResult) => void) => () => void;
    onError: (callback: (payload: { source: string; message: string }) => void) => () => void;
  };
  optimizer: {
    scanDiskUsage: (path: string) => Promise<OrunDiskUsageScanResult>;
    scanJunk: (req: OrunJunkScanRequest) => Promise<OrunJunkScanResult>;
    moveToHolding: (req: OrunMoveToHoldingRequest) => Promise<OrunCleanupActionResult>;
    moveManyToHolding: (reqs: OrunMoveToHoldingRequest[]) => Promise<OrunCleanupActionResult[]>;
    listHolding: () => Promise<OrunPendingDeletionEntry[]>;
    restoreFromHolding: (id: string) => Promise<OrunCleanupActionResult>;
    deletePermanently: (id: string) => Promise<OrunCleanupActionResult>;
    detectPackageManager: () => Promise<string | null>;
    checkUpdates: () => Promise<OrunUpdateCheckResult | null>;
    runUpdate: (packageId: string) => Promise<OrunUpdateActionResult>;
    runUpdatesBatch: (packageIds: string[]) => Promise<OrunUpdateActionResult[]>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
}

interface OrunGmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  internalDate: number;
}

interface OrunCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; date?: string; timeZone?: string };
  end: { dateTime: string; date?: string; timeZone?: string };
  created?: string;
  updated?: string;
  location?: string;
  status?: string;
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
  interface OrunAuthState {
    status: "loading" | "authenticated" | "unauthenticated" | "mfa_required";
    user: OrunAuthUser | null;
    activeTenant: { id: string; type: string; name: string; slug: string; ownerId: string } | null;
    memberships: Array<{ id: string; userId: string; tenantId: string; role: string; joinedAt?: string }>;
    accessToken: string | null;
  }

  interface OrunAuthUser {
    id: string;
    email: string | null;
    displayName: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    createdAt?: string | number;
    updatedAt?: string | number;
  }

  interface OrunOwnerLink {
    supabaseUserId: string;
    email: string | null;
    displayName: string | null;
    tenantId: string | null;
    tenantSlug: string | null;
    tenantName: string | null;
    linkedAt: string;
  }

  interface OrunDevice {
    id: string;
    tenantId: string;
    userId: string;
    platform: string;
    name: string;
    fingerprint: string;
    lastSeenAt: string;
    revokedAt: string | null;
    createdAt: string;
  }

  interface OrunLicenseState {
    status: "valid" | "grace_period" | "expired" | "invalid_signature" | "missing" | "unavailable";
    payload: {
      tenantId: string;
      deviceId: string;
      planKey: string;
      features: Record<string, unknown>;
      issuedAt: number;
      expiresAt: number;
    } | null;
    graceDaysRemaining?: number;
  }

  interface OrunEntitlements {
    plan: { id: string; key: string; name: string; stripePriceId: string | null; maxDevices: number } | null;
    subscription: {
      id: string;
      tenantId: string;
      planId: string;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    } | null;
    isActive: boolean;
    features: Record<string, unknown>;
  }

  type OrunAccountDeletionResult =
    | { blocked: false }
    | { blocked: true; reason: "sole_owner_of_organization"; message: string; blockedTenants: string[] };

  interface OrunUser {
    id: string;
    name: string;
    created_at: number;
    updated_at: number;
  }

  interface OrunUserIdentity {
    id: string;
    user_id: string | null;
    provider: string;
    provider_user_id: string;
    phone_number: string | null;
    display_name: string | null;
    verified: number;
    created_at: number;
    updated_at: number;
  }

  interface OrunWorkspace {
    id: string;
    owner_user_id: string;
    name: string;
    type: "PERSONAL" | "SHARED" | "SYSTEM";
    created_at: number;
    updated_at: number;
  }

  interface OrunAgentChannel {
    id: string;
    provider: string;
    external_channel_id: string;
    agent: string;
    name: string | null;
    enabled: number;
    created_at: number;
    updated_at: number;
  }

  interface OrunAgentVoiceSettings {
    enabled: boolean;
    voiceProvider: string | null;
    voiceId: string | null;
    language: string;
    responseMode: "AUTO" | "ALWAYS_TEXT" | "ALWAYS_AUDIO";
  }

  type OrunThreatSource =
    | "clamav"
    | "virustotal"
    | "yara"
    | "sentinel-process"
    | "sentinel-network"
    | "sentinel-fs"
    | "integrity"
    | "ransomware-heuristic"
    | "windows-defender";

  interface OrunThreatFinding {
    id?: string;
    source?: OrunThreatSource;
    severity?: "info" | "low" | "medium" | "high" | "critical";
    title?: string;
    description?: string;
    filePath?: string;
    processName?: string;
    pid?: number;
    remoteAddress?: string;
    sha256?: string;
    ruleName?: string;
    detectedAt?: string;
    raw?: unknown;
  }

  interface OrunScanResult {
    engine?: string;
    filesScanned?: number;
    infected?: number;
    found?: string[];
    findings?: OrunThreatFinding[];
    error?: string;
    durationMs?: number;
    [key: string]: unknown;
  }

  interface OrunShieldFullScanRequest {
    targetPath: string;
    recursive?: boolean;
  }

  interface OrunShieldFullScanResponse {
    clamav?: OrunScanResult;
    yara?: OrunThreatFinding[];
  }

  interface OrunQuarantineEntry {
    id: string;
    originalPath: string;
    fileName: string;
    quarantinedAt: string;
    sizeBytes?: number;
    source?: OrunThreatSource;
    reason?: string;
  }

  interface OrunQuarantineActionResult {
    success: boolean;
    error?: string;
    id?: string;
    originalPath?: string;
  }

  interface OrunFileAnalysisResult {
    filePath?: string;
    sha256?: string;
    sizeBytes?: number;
    entropy?: number;
    suspiciousStrings?: string[];
    indicators?: unknown[];
    [key: string]: unknown;
  }

  interface OrunProcessTreeNode {
    pid: number;
    ppid: number | null;
    name: string;
    cpuPercent?: number;
    memoryBytes?: number;
    children?: OrunProcessTreeNode[];
  }

  interface OrunDefenderStatus {
    available?: boolean;
    realtimeProtection?: boolean;
    signatureAgeDays?: number;
    definitionsVersion?: string;
    [key: string]: unknown;
  }

  interface OrunDiskUsageScanResult {
    path?: string;
    totalBytes?: number;
    freeBytes?: number;
    entries?: unknown[];
    [key: string]: unknown;
  }

  interface OrunJunkScanRequest {
    path: string;
    isDownloadsFolder?: boolean;
  }

  interface OrunJunkCandidate {
    path: string;
    sizeBytes: number;
    category?: string;
    reason?: string;
  }

  interface OrunJunkScanResult {
    path?: string;
    candidates?: OrunJunkCandidate[];
    totalSizeBytes?: number;
    [key: string]: unknown;
  }

  type OrunMoveToHoldingRequest = OrunJunkCandidate | { path: string; sizeBytes: number };

  interface OrunCleanupActionResult {
    success: boolean;
    error?: string;
    id?: string;
    originalPath?: string;
  }

  interface OrunPendingDeletionEntry {
    id: string;
    originalPath: string;
    fileName: string;
    movedAt: string;
    sizeBytes?: number;
    category?: string;
  }

  interface OrunUpdateCheckResult {
    packages?: Array<{
      id: string;
      name: string;
      currentVersion?: string;
      latestVersion?: string;
      manager?: string;
    }>;
    [key: string]: unknown;
  }

  interface OrunUpdateActionResult {
    success: boolean;
    error?: string;
    packageId?: string;
    output?: string;
  }

  interface Window {
    orun: OrunAPI;
  }
}

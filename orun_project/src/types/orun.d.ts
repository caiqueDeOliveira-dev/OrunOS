export {};

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

export interface OrunWhatsAppStatus {
  status: "disconnected" | "connecting" | "qr" | "connected";
  selfJid?: string;
  loggedOut?: boolean;
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
    testConnection: (settings?: Partial<OrunAISettings>) => Promise<{ ok: boolean; error?: string }>;
    listOllamaModels: (baseUrl?: string) => Promise<string[]>;
    listCloudModels: (provider: OrunProvider) => Promise<string[]>;
    knownFreeModels: () => Promise<Record<string, string[]>>;
    modelCatalog: () => Promise<Record<string, { id: string; free: boolean }[]>>;
    providers: () => Promise<OrunProvider[]>;
    usageToday: () => Promise<OrunUsageRow[]>;
  };
  settings: {
    get: <T = unknown>(key: string) => Promise<T | undefined>;
    set: (key: string, value: unknown) => Promise<boolean>;
    setApiKey: (slot: string, value: string) => Promise<boolean>;
    hasApiKey: (slot: string) => Promise<boolean>;
  };
  conversations: {
    list: (agent?: string) => Promise<{ id: string; title: string; agent?: string | null; created_at: number; updated_at: number }[]>;
    create: (title?: string, agent?: string) => Promise<{ id: string; title: string; agent?: string | null }>;
    messages: (conversationId: string) => Promise<{ id: string; role: string; content: string; created_at: number }[]>;
    addMessage: (conversationId: string, message: { id: string; role: string; content: string }) => Promise<boolean>;
    remove: (conversationId: string) => Promise<void>;
    truncateFrom: (conversationId: string, messageId: string) => Promise<boolean>;
  };
  n8n: {
    listWorkflows: () => Promise<{ id: string; name: string; active: boolean }[]>;
    testConnection: (cfg?: OrunN8nConfig) => Promise<{ ok: boolean; error?: string; workflowCount?: number }>;
    triggerWebhook: (args: { webhookUrl: string; payload?: unknown; headerName?: string; headerValue?: string }) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
  };
  app: {
    setRunInBackground: (value: boolean) => Promise<boolean>;
    checkForUpdates: () => Promise<{ ok: boolean; error?: string }>;
    installUpdate: () => Promise<boolean>;
    onUpdateStatus: (callback: (status: OrunUpdateStatus) => void) => () => void;
  };
  tts: {
    listVoices: (engine: OrunTTSEngine) => Promise<OrunVoice[]>;
    synthesize: (engine: OrunTTSEngine, voiceId: string, text: string) => Promise<{ audioBase64: string; mime: string }>;
    engines: () => Promise<OrunTTSEngine[]>;
    setEngineConfig: (engine: OrunTTSEngine, cfg: Record<string, unknown>) => Promise<boolean>;
    getEngineConfig: (engine: OrunTTSEngine) => Promise<Record<string, unknown>>;
    usageToday: () => Promise<OrunTTSUsageRow[]>;
  };
  nutrition: {
    getDaily: (date?: string) => Promise<OrunNutritionDaily>;
  };
  finance: {
    getDaily: (date?: string) => Promise<OrunFinanceDaily>;
  };
  health: {
    getDaily: (date?: string) => Promise<OrunHealthEntry[]>;
  };
  developer: {
    getReviews: (date?: string) => Promise<OrunDeveloperReview[]>;
  };
  teacher: {
    getProgress: (date?: string) => Promise<OrunTeacherProgress[]>;
  };
  videoEditor: {
    getProjects: (date?: string) => Promise<OrunVideoProject[]>;
    listTemplates: () => Promise<Array<{ id: string; name: string; description: string; durationSec: number; fps: number }>>;
    createComposition: (opts: { templateId?: string; title?: string }) => Promise<{ entryPoint: string; compositionId: string; template: string; durationSec: number; fps: number }>;
    renderVideo: (opts: { entryPoint: string; compositionId: string; outputPath?: string; codec?: string; crf?: number }) => Promise<{ ok: boolean; outputPath?: string; durationMs?: number; error?: string }>;
  };
  image3d: {
    getGenerations: (date?: string) => Promise<OrunImage3DGeneration[]>;
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
    onStatusUpdate: (callback: (status: OrunWhatsAppStatus) => void) => () => void;
    onQR: (callback: (dataUrl: string) => void) => () => void;
  };
  schedules: {
    get: () => Promise<Record<string, OrunSchedule>>;
    set: (agentName: string, cfg: OrunSchedule) => Promise<boolean>;
  };
  stt: {
    engines: () => Promise<string[]>;
    testConnection: (baseUrl: string) => Promise<{ ok: boolean; error?: string }>;
    transcribe: (args: { baseUrl: string; audioBase64: string; mimeType: string; language: string }) => Promise<{ text: string }>;
  };
}

declare global {
  interface Window {
    orun: OrunAPI;
  }
}

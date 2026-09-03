// electron/main.cjs
//
// Electron main process for Orun OS.

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, globalShortcut, shell, crashReporter, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { randomUUID } = require("crypto");
const log = require("electron-log");

const aiRouter = require("./ai-router.cjs");
const ttsRouter = require("./tts-router.cjs");
const sttRouter = require("./stt-router.cjs");
const n8n = require("./n8n.cjs");
const db = require("./db.cjs");
const { dbEncryption } = require("./db-encryption.cjs");
const agentPrompts = require("./agent-prompts.cjs");
const whatsapp = require("./whatsapp.cjs");
const scheduler = require("./scheduler.cjs");
const videoEditor = require("./video-editor.cjs");
const image3d = require("./image-3d.cjs");
const videoGenerator = require("./video-generator.cjs");
const socialMedia = require("./social-media.cjs");
const musicProducer = require("./music-producer.cjs");
const homeAssistant = require("./home-assistant.cjs");
const securityAudit = require("./security-audit.cjs");
const supabaseSync = require("./sync-adapter.cjs");
const auth = require("./auth.cjs");
const toolsModule = require("./tools.cjs");
const mcpClient = require("./mcp-client.cjs");
const pluginSystem = require("./plugin-system.cjs");
const { SkillManager } = require("./skill-manager.cjs");
const rag = require("./rag.cjs");
const memoryEngineModule = require("./memory-engine.cjs");
const memoryConsolidator = require("./memory-consolidator.cjs");
const knowledgeEngineModule = require("./knowledge-engine.cjs");
const knowledgeSupabase = require("./knowledge-supabase.cjs");
const plannerEngineModule = require("./planner-engine.cjs");
const plannerSupabase = require("./planner-supabase.cjs");
const memorySupabase = require("./memory-supabase.cjs");
const { createAgentHub } = require("./agent-hub.cjs");
const { createEventBus } = require("./event-bus.cjs");
const { createAnalytics } = require("./analytics.cjs");
const secretStore = require("./secret-store.cjs");
const { initializeShield: initShield, shutdownShield } = require("./shield.cjs");
const { initializeOptimizer: initOptimizer } = require("./optimizer.cjs");
const { initializeSentinela: initSentinela } = require("./sentinela.cjs");
const agentProcessor = require("./agent-processor.cjs");
const { responseCache } = require("./response-cache.cjs");
const { initAutoUpdater } = require("./auto-updater.cjs");
const logger = require("./logger.cjs");
const providerHealth = require("./provider-health.cjs");
const { telemetry } = require("./telemetry.cjs");
const { getErrorMessage, getErrorTitle } = require("./error-messages.cjs");
const waAutomation = require("./whatsapp-automation.cjs");
const { autonomousLoop: autonomousLoopImpl } = require("./autonomous-loop.cjs");
const { handleWhatsAppMessage: handleWhatsAppMessageImpl, saveNutritionToFile } = require("./whatsapp-handler.cjs");
const { createBackgroundServices } = require("./background-services.cjs");
const { createProactiveEvents } = require("./proactive.cjs");
const { SpotifyClient } = require("./spotify-client.cjs");
const { DiscordBot } = require("./discord-bot.cjs");
const telegram = require("./telegram.cjs");
const { createTelegramHandler } = require("./telegram-handler.cjs");
const { createTelegramAutomation } = require("./telegram-automation.cjs");
const { createGroupWatcher } = require("./group-watcher.cjs");
const { registerFileSystemHandlers } = require("./file-system-handlers.cjs");
const { startWebhookReceiver, stopWebhookReceiver, setEventHandler } = require("./webhook-receiver.cjs");
const auditLog = require("./audit-log.cjs");
const { PipelineRunner } = require("./pipeline-runner.cjs");

// Must run BEFORE app.whenReady — registers the custom scheme as privileged so
// fetch()/AudioWorklet.addModule() work over `orun-asset://` in production.
protocol.registerSchemesAsPrivileged([
  { scheme: "orun-asset", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

const distAssetsDir = path.join(__dirname, "..", "dist");
const publicAssetsDir = path.join(__dirname, "..", "public");

// ── Spotify & Discord instances ──────────────────────────────────────────────
const spotify = new SpotifyClient();
spotify.setLogger(log);
const discordBot = new DiscordBot();
discordBot.setLogger(log);

// ── Telegram instances ──────────────────────────────────────────────────────
telegram.setLogger(log);
const telegramAutomation = createTelegramAutomation({ log });

// ── Vigia de grupos (feed ao vivo + watchlist + robô de promoções) ─────────
let groupWatcher = null;

// ── Rate limiter for IPC ────────────────────────────────────────────────
const ipcRateLimiter = {
  counts: new Map(),
  windowMs: 10000, // 10 seconds
  maxRequests: 30,
  check(sender) {
    const id = sender.id || "unknown";
    const now = Date.now();
    const entry = this.counts.get(id);
    if (!entry || now - entry.start > this.windowMs) {
      this.counts.set(id, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= this.maxRequests;
  },
  cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.counts) {
      if (now - entry.start > this.windowMs * 2) this.counts.delete(id);
    }
    // Hard cap: remove oldest entries if map grows too large
    if (this.counts.size > 500) {
      const sorted = [...this.counts.entries()].sort((a, b) => a[1].start - b[1].start);
      for (let i = 0; i < sorted.length - 200; i++) {
        this.counts.delete(sorted[i][0]);
      }
    }
  },
};

const isDev = !app.isPackaged;

// Dev usa perfil separado (productName "Orun OS" colidiria com o app instalado,
// que mantém locks nos caches — causa tela preta e falhas de cache/GPU).
if (isDev) {
  app.setPath("userData", path.join(app.getPath("appData"), "orun-os"));
}

const DEFAULT_AI_SETTINGS = {
  provider: "groq",
  model: "openai/gpt-oss-120b",
  systemPrompt:
    "You are Hampton, the central autonomous AI agent of Orun OS — a personal AI operating system. " +
    "You are proactive, resourceful, and take initiative to help the user accomplish their goals. " +
    "You have access to tools that let you read and write files, run commands, search the web, manage memory, and more. " +
    "When the user asks you to do something, don't just describe how — actually do it using your tools. " +
    "Break complex tasks into steps and execute them. If something fails, adapt and try a different approach. " +
    "Always explain what you're doing and why, but prioritize action over explanation. " +
    "Be direct, concise, and result-oriented. If you're unsure, try the most reasonable approach first. " +
    "You are running on the user's desktop — you have full access to the filesystem and terminal. " +
    "Use that power responsibly. Never destructive without explicit permission. " +
    "When you store information in memory, it persists across sessions — use this for user preferences, context, and important facts.",
};

// Recommended model per agent — used as default when no override is set.
// The UI shows "(Recomendado)" next to these.
// Atualizado em 2026-08-14: GitHub Models aposentado (30/07/2026) — provider
// removido. opencodezen "big-pickle" re-adicionado (free). Modelos free
// revalidados por provider (openrouter :free, groq, nvidia, ollama_cloud).
const AGENT_RECOMMENDED_MODELS = {
  Hampton:    { provider: "groq",        model: "openai/gpt-oss-120b" },
  Developer:  { provider: "groq",        model: "openai/gpt-oss-120b" },
  Designer:   { provider: "opencodezen", model: "big-pickle" },
  Creator:    { provider: "groq",        model: "openai/gpt-oss-120b" },
  Health:     { provider: "groq",        model: "openai/gpt-oss-120b" },
  Finance:    { provider: "groq",        model: "openai/gpt-oss-120b" },
  Teacher:    { provider: "groq",        model: "openai/gpt-oss-120b" },
  Marketing:  { provider: "opencodezen", model: "big-pickle" },
  "Personal Assistant": { provider: "groq", model: "openai/gpt-oss-120b" },
  "Home IA":       { provider: "groq",  model: "openai/gpt-oss-120b" },
  "Cyber Security": { provider: "groq", model: "openai/gpt-oss-120b" },
  Automation: { provider: "groq",        model: "openai/gpt-oss-120b" },
  Automotive: { provider: "groq",        model: "openai/gpt-oss-120b" },
  Juridico:   { provider: "groq",        model: "openai/gpt-oss-120b" },
  System:     { provider: "groq",        model: "openai/gpt-oss-120b" },
  "CaOS Commander": { provider: "groq",        model: "openai/gpt-oss-120b" },
  Carreiras: { provider: "groq",                model: "openai/gpt-oss-120b" },
  Neural:    { provider: "groq",                model: "openai/gpt-oss-120b" },
};

// ── Agent Tool Permissions ──────────────────────────────────────────────
// Each agent only gets tools relevant to its function. Reduces token usage
// and prevents agents from calling irrelevant tools.

const AGENT_TOOL_PERMISSIONS = {
  Developer: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "git_status", "git_log", "git_diff", "git_stash", "git_remote", "gh_pr",
    "git_commit", "git_branch", "git_checkout",
    "github_auth_status", "github_repos_list", "github_repo_info", "github_user_info", "github_repo_doctor",
    "semgrep_scan", "library_docs",
    "run_tests", "code_review", "generate_tests",
    "refactor_rename", "refactor_move", "refactor_extract",
    "pdf_inspect",
    "memory_save", "memory_search", "rag_search", "trigger_agent", "open_workspace", "workspace_action",
  ],
  Designer: [
    "read_file", "write_file", "list_files", "search_files",
    "generate_image", "generate_video", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search", "trigger_agent", "open_workspace", "workspace_action",
    "design_list_projects", "design_export_file",
  ],
  Health: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "get_weather", "open_workspace", "workspace_action",
  ],
  Finance: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "get_weather", "open_workspace", "workspace_action",
    "finance_list_accounts", "finance_create_transaction", "finance_budget_month",
  ],
  Teacher: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "open_workspace", "workspace_action",
  ],
  Marketing: [
    "read_file", "write_file", "list_files",
    "generate_image", "generate_video", "publish_to_social",
    "publish_to_instagram_direct", "publish_to_linkedin_direct",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "get_weather", "open_workspace", "workspace_action",
    "social_schedule_post", "social_list_posts",
    "postiz_list_channels", "postiz_list_posts", "postiz_create_post", "postiz_find_slot", "postiz_health",
  ],
  "Personal Assistant": [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "web_search", "web_fetch", "get_weather",
    "trigger_agent", "open_workspace", "workspace_action",
    "vault_save", "vault_search",
    "photo_search",
  ],
  Automation: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "publish_to_social", "open_workspace", "workspace_action",
  ],
  Automotive: [
    "web_search", "web_fetch", "memory_save", "memory_search", "rag_search",
    "read_file", "list_files", "notify", "get_weather", "open_workspace", "workspace_action",
  ],
  Juridico: [
    "read_file", "list_files", "pdf_inspect",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "web_fetch", "open_workspace", "workspace_action",
  ],
  System: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search", "get_weather",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent",
    "clipboard_read", "clipboard_write", "screenshot",
    "open_workspace", "workspace_action",
    "spotify_play", "spotify_search", "spotify_get_playlists", "spotify_get_now_playing",
    "telemetry_track", "telemetry_health",
  ],
  "Home IA": [
    "read_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "get_weather",
    "open_workspace", "workspace_action",
    "vault_save", "vault_search",
  ],
  "Cyber Security": [
    "read_file", "write_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "semgrep_scan",
    "secret_scan", "secret_allowlist_add",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent",
    "open_workspace", "workspace_action",
  ],
  "CaOS Commander": [
    "discord_status", "discord_server_info", "discord_channels", "discord_roles",
    "discord_plan", "discord_apply", "discord_archive_game",
    "read_file", "list_files", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search", "notify", "trigger_agent",
  ],
  Carreiras: [
    "career_get_state", "career_search_jobs", "career_add_job", "career_list_jobs",
    "career_update_job_status", "career_save_profile", "career_generate_profile",
    "career_prepare_application", "career_stats",
    "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search", "notify", "open_workspace", "workspace_action",
  ],
  Neural: [
    "neural_save_note", "neural_search_notes", "neural_list_notes",
    "neural_get_note", "neural_backlinks_graph",
    "web_search", "web_fetch",
    "memory_save", "memory_search", "rag_search", "notify",
  ],
  Hampton: null, // null = all tools (default agent)
};

function getToolsForAgent(agentId) {
  const allowed = AGENT_TOOL_PERMISSIONS[agentId];
  if (!allowed) return toolsModule.TOOL_DEFINITIONS; // null = all tools
  const scope = toolsModule.AGENT_WORKSPACE_SCOPE?.[agentId];
  return toolsModule.TOOL_DEFINITIONS.filter((t) => allowed.includes(t.function.name)).map((t) => {
    if (scope && (t.function.name === "open_workspace" || t.function.name === "workspace_action")) {
      return {
        ...t,
        function: { ...t.function, description: `${t.function.description} Only use the workspace(s) you own: ${scope.join(", ")}.` },
      };
    }
    return t;
  });
}
let mainWindow;
let skillManager = null;
let memoryEngine = null;
let knowledgeEngine = null;
let plannerEngine = null;
let agentHub = null;
let eventBus = null;
let analytics = null;
let quickChatWindow = null;
let tray = null;
let isQuitting = false;
let bgServices = null;
let proactive = null;
let syncIntervalId = null;
let rateLimiterIntervalId = null;
rateLimiterIntervalId = setInterval(() => ipcRateLimiter.cleanup(), 60000);
const activeStreamRequests = new Map(); // requestId -> http(s) ClientRequest, for the Stop button
const activeAutonomousRequests = new Map(); // requestId → { cancelled: boolean }

// ── Crash Reporter ──────────────────────────────────────────────────────
if (!isDev) {
  crashReporter.start({
    productName: "Orun-OS",
    submitURL: "",
    uploadToServer: false,
    compress: true,
  });
}

// ── Structured Logging ──────────────────────────────────────────────────
log.transports.file.level = "info";
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB per log file
log.transports.console.level = isDev ? "debug" : false;
log.errorHandler.startCatching();
Object.assign(console, log.functions);
logger.setLevel(isDev ? "DEBUG" : "INFO");

// ── Window + Tray ──────────────────────────────────────────────────────
// "Run in background" keeps Hampton reachable (and any future scheduled
// automations alive) after the window closes, instead of fully quitting —
// closer to how an actual OS component behaves. Off by default; the user
// opts in from Settings.

function createWindow() {
  const savedBounds = db.getSetting("windowBounds", null);
  mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1360,
    height: savedBounds?.height || 860,
    x: savedBounds?.x || undefined,
    y: savedBounds?.y || undefined,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: "#080808",
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (savedBounds?.isMaximized) mainWindow.maximize();

  // ── Deep link handling (orun-os://) ────────────────────────────────
  if (process.platform === "win32" && process.argv.length > 1) {
    const deepLink = process.argv.find(a => a.startsWith("orun-os://"));
    if (deepLink) {
      log.info("[deep-link] Received on launch:", deepLink);
      mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.webContents.send("deep-link:open", deepLink);
      });
    }
  }

  // ── Online/Offline detection ───────────────────────────────────────
  const { session } = require("electron");
  const fontSources = "fonts.googleapis.com fonts.gstatic.com";
  const baseCsp = `default-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`;
  const scriptCsp = `script-src 'self' 'unsafe-inline' 'unsafe-eval'`;
  const styleCsp = `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`;
  const imgCsp = `img-src 'self' data: blob: https:; font-src 'self' data: ${fontSources}`;
  const connectCsp = `connect-src 'self' blob: http://localhost:* ws://localhost:* https:`;
  const mediaCsp = `media-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'`;
  const cspFinal = `${baseCsp}; ${isDev ? scriptCsp : `script-src 'self'`}; ${styleCsp}; ${imgCsp}; ${connectCsp}; ${mediaCsp}`;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [cspFinal],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "Referrer-Policy": ["strict-origin-when-cross-origin"],
      },
    });
  });

  // Grant microphone permission for voice features
  session.defaultSession.setPermissionCheckHandler((_webContents, _origin, permission) => {
    if (permission === "media" || permission === "mediaKeySystem") {
      return true;
    }
    return false;
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media" || permission === "mediaKeySystem") {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
    mainWindow.webContents.on("console-message", (_e, level, message) => {
      try { if (level >= 2) console.error("[RENDERER]", message); } catch { /* EPIPE */ }
    });
    mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
      try { console.error("[LOAD FAIL]", code, desc); } catch { /* EPIPE */ }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    db.setSetting("windowBounds", {
      x: bounds.x, y: bounds.y,
      width: bounds.width, height: bounds.height,
      isMaximized: mainWindow.isMaximized(),
    });
  };
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("maximize", saveBounds);
  mainWindow.on("unmaximize", saveBounds);

  mainWindow.on("close", (event) => {
    saveBounds();
    const runInBackground = db.getSetting("runInBackground", true);
    if (runInBackground && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log.error("[crash] Renderer process gone:", details.reason, details.exitCode);
    if (details.reason === "crashed") {
      mainWindow?.reload();
    }
  });
}

// ── Quick Chat Overlay Window ─────────────────────────────────────────
function createQuickChatWindow() {
  if (quickChatWindow && !quickChatWindow.isDestroyed()) return;
  quickChatWindow = new BrowserWindow({
    width: 380,
    height: 520,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    center: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  quickChatWindow.setAlwaysOnTop(true, "floating");
  quickChatWindow.setVisibleOnAllWorkspaces(true);

  if (isDev) {
    quickChatWindow.loadURL("http://localhost:5173/#/quick-chat");
    quickChatWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    quickChatWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), { hash: "/quick-chat" });
  }

  quickChatWindow.on("blur", () => {
    // Auto-hide when losing focus (click outside)
    if (quickChatWindow && !quickChatWindow.isDestroyed()) {
      quickChatWindow.hide();
    }
  });

  quickChatWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      quickChatWindow?.hide();
    }
  });
}

function showQuickChat() {
  if (!quickChatWindow || quickChatWindow.isDestroyed()) createQuickChatWindow();
  quickChatWindow.show();
  quickChatWindow.focus();
  quickChatWindow.webContents.send("quick-chat:show");
}

function toggleQuickChat() {
  if (quickChatWindow && !quickChatWindow.isDestroyed() && quickChatWindow.isVisible()) {
    quickChatWindow.hide();
  } else {
    showQuickChat();
  }
}

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "build", "tray-icon.png"));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("Orun OS — Hampton");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Orun OS", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: "Quick Chat", click: () => { showQuickChat(); } },
      { type: "separator" },
      { label: "Voice", click: () => {
        if (mainWindow?.isVisible()) {
          mainWindow.focus();
          mainWindow.webContents.send("voice-overlay:show");
        } else {
          mainWindow?.show();
          mainWindow?.focus();
          mainWindow?.webContents.send("voice-overlay:show");
        }
      }},
      { type: "separator" },
      { label: "Quit", click: () => { isQuitting = true; app.quit(); } },
    ])
  );
  tray.on("click", () => { mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show(); });
}

// ── Settings resolution ───────────────────────────────────────────────────

function getGlobalAISettings() {
  return { ...DEFAULT_AI_SETTINGS, ...db.getSetting("ai", {}) };
}

// Modelos Groq desligados em 16/08/2026 (console.groq.com/docs/deprecations).
// Migra settings salvas uma �nica vez; idempotente.
const DEPRECATED_MODEL_MAP = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "allam-2-7b": "openai/gpt-oss-20b",
};

function migrateDeprecatedModels() {
  try {
    const ai = db.getSetting("ai", {});
    if (ai && DEPRECATED_MODEL_MAP[ai.model]) {
      db.setSetting("ai", { ...ai, model: DEPRECATED_MODEL_MAP[ai.model] });
      log.info(`[migration] modelo deprecated migrado: ${ai.model} → ${DEPRECATED_MODEL_MAP[ai.model]}`);
    }
    const overrides = db.getSetting("agentModels", {});
    let changed = false;
    for (const [agentId, cfg] of Object.entries(overrides)) {
      if (cfg && cfg.model && DEPRECATED_MODEL_MAP[cfg.model]) {
        overrides[agentId] = { ...cfg, model: DEPRECATED_MODEL_MAP[cfg.model] };
        changed = true;
      }
    }
    if (changed) {
      db.setSetting("agentModels", overrides);
      log.info("[migration] agentModels com modelos deprecated migrados");
    }
  } catch (e) {
    log.warn("[migration] migrateDeprecatedModels falhou:", e.message);
  }
}

function resolveAISettings(agentId) {
  const global = getGlobalAISettings();
  if (!agentId) return global;
  const override = db.getSetting("agentModels", {})[agentId];
  if (override && override.kind === "combo") {
    return { ...global, kind: "combo", comboId: override.comboId, source: override.source || "internal" };
  }
  if (!override || !override.provider) {
    // No override — use recommended model for this agent
    const rec = AGENT_RECOMMENDED_MODELS[agentId];
    if (rec) return { ...global, provider: rec.provider, model: rec.model };
    return global;
  }
  return { ...global, provider: override.provider, model: override.model, baseUrl: override.baseUrl || global.baseUrl };
}

/** Appends available automations to the system prompt, if Hampton is allowed to trigger them. */
function buildSystemPrompt(basePrompt, agentId) {
  let prompt = basePrompt;
  if (agentId) {
    const override = db.getSetting("agentModels", {})[agentId];
    prompt = agentPrompts.promptFor(agentId, override?.systemPrompt);
  } else {
    // Main chat (no agentId) — Hampton é a persona central por padrão.
    prompt = (agentPrompts.personaBlock("Hampton") || "") + (basePrompt || "");
    // Apply language suffix based on user's language setting
    const lang = db.getSetting("language", "pt");
    const LANG_SUFFIXES = {
      pt: "\n\nIMPORTANTE: Sempre responda em português do Brasil (pt-BR). Nunca use outro idioma.",
      en: "\n\nIMPORTANT: Always respond in English. Never use another language.",
      es: "\n\nIMPORTANTE: Siempre responde en español. Nunca uses otro idioma.",
      fr: "\n\nIMPORTANT: Réponds toujours en français. N'utilise jamais une autre langue.",
    };
    const suffix = LANG_SUFFIXES[lang] || LANG_SUFFIXES.pt;
    if (prompt && !prompt.toLowerCase().includes("portugues do brasil") && !prompt.toLowerCase().includes("always respond in") && !prompt.toLowerCase().includes("siempre responde") && !prompt.toLowerCase().includes("réponds toujours")) {
      prompt += suffix;
    }
  }
  const agentPerms = AGENT_TOOL_PERMISSIONS[agentId];
  const canWriteFiles = !agentId || !agentPerms || agentPerms.includes("write_file");
  if (prompt && canWriteFiles) {
    prompt += "\n\nCRIACAO DE ARQUIVOS (IMPORTANTE): quando o usuario pedir para criar um site, codigo, script ou qualquer arquivo, grave os arquivos no developer workspace com as ferramentas write_file/edit_file/read_file/list_files/run_command. Essas ferramentas resolvem caminhos relativos contra {DEVELOPER_WORKSPACE}, entao os arquivos criados aparecem no Explorer do Developer IDE. Depois de criar os arquivos, NAO cole o codigo inteiro na resposta do chat: responda de forma curta listando os arquivos criados e o caminho completo, e o resultado de qualquer comando.\n\nA pasta 'hello' que o usuario menciona E a raiz do workspace ({DEVELOPER_WORKSPACE}). NUNCA crie uma subpasta chamada 'hello' dentro do workspace. Exemplo: se o usuario pedir 'crie um site na pasta hello', grave em 'index.html' (relativo = {DEVELOPER_WORKSPACE}\\index.html), NAO em 'hello/index.html'. Se ele pedir 'site de restaurante na pasta hello', grave em 'restaurante/index.html' (relativo = {DEVELOPER_WORKSPACE}\\restaurante\\index.html).";
  }
  if (prompt && prompt.includes("{DEVELOPER_WORKSPACE}")) {
    const devWs = db.getSetting("developerWorkspace", null) || path.join(app.getPath("desktop"), "hello");
    prompt = prompt.split("{DEVELOPER_WORKSPACE}").join(devWs);
  }
  if (prompt) {
    prompt += require("./silent-mode.cjs").silentPromptBlock();
  }
  const n8nCfg = db.getSetting("n8n", {});
  const actions = db.getSetting("automationActions", []);
  if (!n8nCfg.autoTrigger || !actions.length) return prompt;
  const list = actions.map((a) => `- ${a.name}: ${a.description || "no description"}`).join("\n");
  return `${prompt || ""}\n\nYou can trigger these automations when the user's request clearly calls for one:\n${list}\n\nTo trigger one, end your reply with exactly this (nothing after it): <<ACTION:name>>{"key":"value"}<</ACTION>>\nOnly do this when truly appropriate, at most once per reply, keep the JSON minimal, and never mention the tag syntax itself to the user.`;
}

/** Enqueue a row for Supabase cloud sync (fire-and-forget). */
function syncEnqueue(tableName, row) {
  try { supabaseSync.enqueue(db.getDb(), tableName, row); } catch (e) { log.warn("[sync] enqueue failed:", e.message); }
}

/** Sumarizador do Memory Engine: transforma memórias de curto prazo em fatos de longo prazo. */
async function memorySummarize({ agent, project, memories }) {
  try {
    const settings = resolveAISettings(agent);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return null;
    const list = memories.map((m) => `- ${m.content}`).join("\n");
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages: [
        { role: "system", content: "Você é um sumarizador de memória de longo prazo. Produza somente o resumo, sem preâmbulo." },
        { role: "user", content: `Resuma as memórias abaixo em um texto curto (máx 400 caracteres) com os fatos importantes e duradouros, em pt-BR. Escopo: ${[agent, project].filter(Boolean).join("/") || "global"}.\n\n${list}` },
      ],
    });
    return result.text;
  } catch (e) {
    log.warn("[memory] consolidate summarize falhou:", e.message);
    return null;
  }
}

/** Sumarizador do Knowledge Engine: transforma commits + memórias do dia em diário markdown. */
async function knowledgeSummarize({ date, commits, memories }) {
  try {
    const settings = resolveAISettings(null);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return null;
    const commitsText = (commits || []).join("\n");
    const memoriesText = (memories || []).map((m) => `- ${m.content}`).join("\n");
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages: [
        { role: "system", content: "Você é o redator do diário de desenvolvimento do Orun OS. Produza somente o markdown, sem preâmbulo." },
        {
          role: "user",
          content: `Escreva o diário de ${date || "hoje"} em markdown com seções "## Destaques" e "## Notas". Máx 500 caracteres, pt-BR.\n\n## Commits\n${commitsText || "(nenhum)"}\n\n## Memórias\n${memoriesText || "(nenhuma)"}`,
        },
      ],
    });
    return result.text;
  } catch (e) {
    log.warn("[knowledge] diário summarize falhou:", e.message);
    return null;
  }
}

/** Extrai o primeiro array JSON do texto do modelo (robusto a markdown). */
function parsePlanJson(text) {
  if (!text) return [];
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Planner: quebra um objetivo em subtarefas via LLM (JSON array). */
async function plannerPlan(goal, context) {
  try {
    const settings = resolveAISettings(null);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return [];
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages: [
        {
          role: "system",
          content:
            "Você é um planejador serial. Quebre o objetivo em subtarefas executáveis e responda SOMENTE com um JSON array, sem markdown. Cada item: {\"title\": string, \"description\": string, \"agent\": string|null, \"priority\": int 1-5, \"dependencies\": [índices das tarefas das quais depende, numerando de 0]}. Máx 8 tarefas.",
        },
        { role: "user", content: `Objetivo: ${goal}\n\nContexto adicional:\n${context || "(nenhum)"}` },
      ],
    });
    return parsePlanJson(result.text);
  } catch (e) {
    log.warn("[planner] plan falhou:", e.message);
    return [];
  }
}

/** Planner: executa uma tarefa roteando para o agente indicado (ou IA central). */
async function plannerExecute(task) {
  try {
    const settings = resolveAISettings(task.agent || null);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return { ok: false, error: `sem chave para o provider ${settings.provider}` };
    const system = task.agent
      ? agentPrompts.promptFor(task.agent, null)
      : "Você é um agente executor do Orun OS. Execute a tarefa e responda de forma objetiva e concisa.";
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages: [
        { role: "system", content: system },
        { role: "user", content: task.description || task.title },
      ],
    });
    return { ok: true, result: result.text };
  } catch (e) {
    log.warn("[planner] execute falhou:", e.message);
    return { ok: false, error: e.message };
  }
}

// ── Agent Hub (Módulo 5 — colaboração serial) ───────────────────────────

/** Extrai o primeiro JSON object com a chave `agent` (robusto a markdown). */
function parseAgentDecision(text) {
  if (!text) return { agent: null, reason: "" };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return { agent: null, reason: "" };
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return {
      agent: typeof parsed.agent === "string" && parsed.agent ? parsed.agent : null,
      reason: String(parsed.reason || "").slice(0, 300),
    };
  } catch {
    return { agent: null, reason: "" };
  }
}

/** Monta o registry de agentes no schema único (persona/ferramentas/escopo/permissões). */
function buildAgentRegistry() {
  const agents = agentPrompts.DEFAULT_PROMPTS || {};
  return Object.keys(agents).map((id) => {
    const tools = AGENT_TOOL_PERMISSIONS[id] || null; // null = todas
    return {
      id,
      name: id,
      personaName: agentPrompts.agentPersonaName(id),
      persona: agents[id],
      tools: tools,
      memoryScope: id,
      permissions: tools,
    };
  });
}

/** Passo 1 — Central (Hampton/System) decide o especialista. */
async function hubRoute(request, context) {
  try {
    const settings = resolveAISettings(null);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return { agent: null, reason: `sem chave para o provider ${settings.provider}` };
    const names = buildAgentRegistry().map((a) => a.id).join(", ");
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages: [
        {
          role: "system",
          content:
            "Você é a inteligência central (Hampton) do Orun OS. Dada a requisição do usuário, decida qual agente especialista deve executá-la, ou null se você mesmo deve responder diretamente. Responda SOMENTE com um JSON object, sem markdown: {\"agent\": string|null, \"reason\": string}. Agentes disponíveis: " +
            names + ". Escolha o mais adequado pelo nome/domínio; se a requisição for simples ou não mapear, use null.",
        },
        { role: "user", content: `Requisição: ${request}\n\nContexto adicional:\n${context || "(nenhum)"}` },
      ],
    });
    return parseAgentDecision(result.text);
  } catch (e) {
    log.warn("[agent-hub] route falhou:", e.message);
    return { agent: null, reason: "" };
  }
}

/** Passo 2 — Especialista (ou central) executa a requisição. */
async function hubExecute(agent, request, context) {
  try {
    const settings = resolveAISettings(agent || null);
    const keys = secretStore.readSecretStore();
    const apiKey = keys[settings.provider];
    if (!apiKey) return { ok: false, error: `sem chave para o provider ${settings.provider}` };
    const system = agent
      ? agentPrompts.promptFor(agent, null)
      : "Você é a inteligência central do Orun OS. Responda à requisição de forma objetiva e concisa, em português.";
    const messages = [
      { role: "system", content: system },
      { role: "user", content: context ? `${request}\n\nContexto:\n${context}` : request },
    ];
    const result = await aiRouter.routeChat({
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey,
      messages,
    });
    return { ok: true, result: result.text };
  } catch (e) {
    log.warn(`[agent-hub] execute falhou (${agent}):`, e.message);
    return { ok: false, error: e.message };
  }
}

/** Passo 3 — Escalação: central assume quando o especialista falha. */
async function hubEscalate(request, context, error) {
  return hubExecute(null, `${request}\n\n(Nota: o especialista falhou com: ${error}. Assuma você e resolva.)`, context);
}

// ── Autonomous loop ─────────────────────────────────────────────────────

/** Delegate to extracted module, passing context dependencies. */
function autonomousLoop(opts) {
  const { isSilentReply } = require("./silent-mode.cjs");
  let router = null;
  try { router = require("./ai-router-service.cjs").getAiRouterService(app, secretStore).router; } catch (e) {}
  return autonomousLoopImpl(opts, {
    aiRouter, router, toolsModule, mcpClient, pluginSystem, responseCache, agentProcessor,
    logger, secretStore, resolveAISettings, buildSystemPrompt, getToolsForAgent, log,
    isSilentReply,
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────────

// ctx dos agentes é criado dentro de registerIpcHandlers, mas o bloco de
// integrações roda no bootstrap do whenReady (fora desse escopo). Holder de
// módulo permite os blocos de integração anexarem adapters no runtime.
let runtimeCtx = null;

function registerIpcHandlers() {
  const homeAssistantCtl = homeAssistant.init(app);
  const securityAuditCtl = securityAudit.init(app, toolsModule);

  // Inicializa o @orun/settings bridge (CJS reimplementation)
  let settingsBridge = null;
  try {
    settingsBridge = require("./settings-bridge.cjs");
    settingsBridge.init(app.getPath("userData"));
    log.info("[main] @orun/settings bridge inicializado");
  } catch (err) {
    log.warn("[main] Falha ao inicializar settings-bridge:", err.message);
  }

  const ctx = {
    aiRouter, ttsRouter, sttRouter, n8n, db, agentPrompts, whatsapp, scheduler,
    videoEditor, image3d, socialMedia, musicProducer, toolsModule, mcpClient,
    pluginSystem, rag, secretStore, agentProcessor, supabaseSync,
    homeAssistant: homeAssistantCtl, securityAudit: securityAuditCtl,
    activeStreamRequests, activeAutonomousRequests,
    telemetry,
    rateLimiter: ipcRateLimiter,
    auth,
    syncEnqueue, resolveAISettings, buildSystemPrompt, getGlobalAISettings,
    autonomousLoop, isDev, log, app,
    agentRecommendedModels: AGENT_RECOMMENDED_MODELS,
    spotify, discordBot, telegram, telegramAutomation,
    settingsBridge,
  };
  runtimeCtx = ctx;
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "mainWindow", { get: () => mainWindow, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "groupWatcher", { get: () => groupWatcher, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "skillManager", { get: () => skillManager, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "memoryEngine", { get: () => memoryEngine, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "knowledgeEngine", { get: () => knowledgeEngine, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "plannerEngine", { get: () => plannerEngine, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "agentHub", { get: () => agentHub, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "eventBus", { get: () => eventBus, enumerable: true });
  if (runtimeCtx) Object.defineProperty(runtimeCtx, "analytics", { get: () => analytics, enumerable: true });

  require("./ipc/ai-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/settings-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/settings-sync-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/data-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/skill-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/knowledge-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/planner-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/agent-hub-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/event-bus-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/analytics-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/memory-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/auth-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/media-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/home-assistant-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/security-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/update-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/spotify-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/discord-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/google-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/identity-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/group-feed-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/career-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/github-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/ai-router-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/world-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/neural-handlers.cjs").register(ipcMain, ctx);

  // Curador automático do Neural (Lima Barreto): conversa ociosa → nota(s).
  const neuralAutoCapture = require("./neural-autocapture.cjs");
  let neuralAutoCapturer = null;
  const getNeuralAutoCapturer = () => {
    if (!neuralAutoCapturer) {
      neuralAutoCapturer = neuralAutoCapture.createAutoCapturer({
        routeChat: aiRouter.routeChat,
        getSettings: () => resolveAISettings("Neural"),
        readApiKey: (provider) => secretStore.readSecretStore()[provider],
        saveNote: (note) => knowledgeEngine.save({ kind: "note", title: note.title, content: note.content, tags: note.tags, date: new Date().toISOString().slice(0, 10) }),
        listNoteTitles: async () => knowledgeEngine.load().filter((r) => (r.kind || "note") === "note").map((r) => r.title),
        log: (...a) => log.info("[neural]", ...a),
      });
    }
    return neuralAutoCapturer;
  };
  ipcMain.handle("neural:autoCapture", async (_event, payload) => {
    if (!knowledgeEngine) return { ok: false, error: "unavailable" };
    return getNeuralAutoCapturer().handle(payload || {});
  });

  // Integration handlers (telemetry, shield-secrets, finance, social, design, vault, photos)
  try { require("./ipc/telemetry-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/shield-secrets-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/finance-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/social-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/design-sync-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/memory-vault-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/photos-handlers.cjs").register(ipcMain, ctx); } catch {}
  try { require("./ipc/postiz-handlers.cjs").register(ipcMain, ctx); } catch {}

  // Auto-start HTTP server for dashboard (lazy init).
  try { require("./ai-router-service.cjs").getAiRouterService(app, ctx.secretStore); } catch (e) { console.error("[main] ai-router-service init FAILED:", e); }

  // File system handlers (evidence management)
  registerFileSystemHandlers(ipcMain, ctx);

  // Backup handlers (localStorage JSON backups)
  ipcMain.handle("backup:list", async () => {
    try {
      const backupDir = path.join(app.getPath("userData"), "backups");
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => f.startsWith("orun-backup-") && f.endsWith(".json"))
        .sort().reverse()
        .map(f => {
          const fullPath = path.join(backupDir, f);
          const stat = fs.statSync(fullPath);
          return {
            name: f,
            path: fullPath,
            size: stat.size,
            date: stat.mtime.toISOString(),
          };
        });
    } catch (err) {
      log.error("[backup:list] Failed:", err.message);
      return [];
    }
  });

  ipcMain.handle("backup:restore", async (_event, backupPath) => {
    try {
      if (!backupPath || typeof backupPath !== "string") return { ok: false, error: "Invalid backup path" };
      const backupDir = path.join(app.getPath("userData"), "backups");
      const resolved = path.resolve(backupPath);
      if (!resolved.startsWith(path.resolve(backupDir))) return { ok: false, error: "Path outside backup directory" };
      if (!fs.existsSync(resolved)) return { ok: false, error: "Backup file not found" };
      const content = fs.readFileSync(resolved, "utf-8");
      return { ok: true, data: content };
    } catch (err) {
      log.error("[backup:restore] Failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // ── Activity Log / History IPC ────────────────────────────────────
  auditLog.init(app.getPath("userData"));
  auditLog.setOnNewEntry((entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("activity:new-entry", entry);
    }
  });

  ipcMain.handle("activity:list", async (_e, { count = 50, agentId, action } = {}) => {
    try {
      let entries;
      if (agentId) entries = auditLog.getActionsByAgent(agentId, count);
      else if (action) entries = auditLog.getActionsByType(action, count);
      else entries = auditLog.getRecentActions(count);
      return entries;
    } catch (err) {
      log.error("[activity:list] Error:", err.message);
      return [];
    }
  });

  ipcMain.handle("activity:telemetry", () => {
    try { return telemetry.summary(); } catch { return { counters: {}, metrics: {}, recentTraces: [] }; }
  });

  ipcMain.handle("activity:usage-range", async (_e, startDate, endDate) => {
    try { return await db.getUsageRange?.(startDate, endDate) || []; } catch { return []; }
  });

  ipcMain.handle("activity:clear", () => {
    try { auditLog.clearLog(); return true; } catch { return false; }
  });

  // Open URLs in system browser (for Spotify OAuth, etc.)
  ipcMain.handle("shell:open-external", async (_e, url) => {
    if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
      await shell.openExternal(url);
      return { ok: true };
    }
    return { ok: false, error: "Invalid URL" };
  });

  // Open folder picker dialog (for Developer IDE Import Folder)
  ipcMain.handle("dialog:open-directory", async () => {
    const { dialog } = require("electron");
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    return { path: result.filePaths[0] };
  });

  // System command execution — runs in main process (has access to child_process)
  const { isCommandSafe } = require("./tools.cjs");
  ipcMain.handle("system:execute-command", async (_event, command, options = {}) => {
    const { execSync } = require("child_process");
    if (!command || typeof command !== "string") {
      return { success: false, error: "Invalid command" };
    }
    if (!isCommandSafe(command)) {
      log.warn("Blocked unsafe command:", command);
      return { success: false, error: "Command blocked by security policy" };
    }
    const timeout = Math.min(options.timeout || 10000, 30000);
    try {
      const output = execSync(command, {
        timeout,
        encoding: "utf-8",
        maxBuffer: 1024 * 512,
        windowsHide: true,
        ...(options.cwd ? { cwd: options.cwd } : {}),
      }).trim();
      return { success: true, stdout: output };
    } catch (err) {
      return { success: false, error: err.stderr || err.message || "Command failed" };
    }
  });

  // ── DB Backup/Restore/Full Export ────────────────────────────────────
  ipcMain.handle("db:list-backups", () => {
    try {
      const backupDir = path.join(app.getPath("userData"), "backups");
      if (!fs.existsSync(backupDir)) return [];
      return fs.readdirSync(backupDir)
        .filter(f => f.endsWith(".sqlite3"))
        .sort().reverse()
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          size: fs.statSync(path.join(backupDir, f)).size,
          date: fs.statSync(path.join(backupDir, f)).mtime.toISOString(),
        }));
    } catch (err) {
      log.error("[db:list-backups] Failed:", err.message);
      return [];
    }
  });

  ipcMain.handle("db:restore", (_event, backupPath) => {
    try {
      if (!backupPath || typeof backupPath !== "string") return { ok: false, error: "Invalid backup path" };
      const backupDir = path.join(app.getPath("userData"), "backups");
      const resolved = path.resolve(backupPath);
      if (!resolved.startsWith(backupDir)) return { ok: false, error: "Path outside backup directory" };
      if (!fs.existsSync(resolved)) return { ok: false, error: "Backup file not found" };

      const dbFile = path.join(app.getPath("userData"), "orun-os.sqlite3");
      const database = db.getDb();
      if (database) database.close();

      // Create a safety backup of current DB before restore
      const safetyBackup = path.join(backupDir, `pre-restore-${Date.now()}.sqlite3`);
      if (fs.existsSync(dbFile)) fs.copyFileSync(dbFile, safetyBackup);

      fs.copyFileSync(resolved, dbFile);
      log.info("[db:restore] Database restored from:", resolved);
      return { ok: true };
    } catch (err) {
      log.error("[db:restore] Failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("db:full-export", async () => {
    try {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        conversations: [],
        settings: {},
        schedules: {},
        memory: [],
      };

      // Export conversations
      const convs = db.listConversations();
      for (const conv of convs) {
        const messages = db.getMessages(conv.id);
        data.conversations.push({ id: conv.id, title: conv.title, agent: conv.agent, messages });
      }

      // Export settings
      try {
        const database = db.getDb();
        if (database) {
          const settingsRows = database.prepare("SELECT key, value FROM settings").all();
          for (const row of settingsRows) {
            try { data.settings[row.key] = JSON.parse(row.value); } catch { data.settings[row.key] = row.value; }
          }
          // Export schedules
          const scheduleRows = database.prepare("SELECT agent_name, config FROM schedules").all();
          for (const row of scheduleRows) {
            try { data.schedules[row.agent_name] = JSON.parse(row.config); } catch { data.schedules[row.agent_name] = row.config; }
          }
          // Export memory
          const memoryRows = database.prepare("SELECT key, value FROM memory").all();
          data.memory = memoryRows.map(r => ({ key: r.key, value: r.value }));
        }
      } catch (err) {
        log.warn("[db:full-export] Settings export partial:", err.message);
      }

      return data;
    } catch (err) {
      log.error("[db:full-export] Failed:", err.message);
      return null;
    }
  });
}

// ── Auto-update ──────────────────────────────────────────────────────────
const { checkForUpdates: auCheckForUpdates, getUpdateStatus: auGetUpdateStatus } = require("./auto-updater.cjs");

// ── WhatsApp message routing ─────────────────────────────────────────────

function agentForJid(jid) {
  const { handleWhatsAppMessage } = require("./whatsapp-handler.cjs");
  // Delegate to extracted module (needs db)
  return (() => {
    const cfg = db.getSetting("whatsapp", {});
    const agentJids = cfg.agentJids || {};
    for (const [agent, agentJid] of Object.entries(agentJids)) {
      if (agentJid && jid === agentJid) return agent;
    }
    return null;
  })();
}

function handleWhatsAppMessage(payload) {
  return handleWhatsAppMessageImpl(payload, {
    db, aiRouter, agentProcessor, secretStore, whatsapp, waAutomation,
    buildSystemPrompt, resolveAISettings, log,
    saveNutritionToFile: (text) => saveNutritionToFile(text, app.getPath("userData"), log),
    getErrorMessage,
    memoryEngine,
  });
}

/** Delivery used by the scheduler — sends to the agent's configured WhatsApp group. */
async function deliverAgentMessage(agentName, text) {
  log.info(`[scheduler] ${agentName} response: ${text.slice(0, 200)}`);
  if (whatsapp.getStatus() !== "connected") return;

  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};

  // Send to the agent's configured group
  const targetJid = agentJids[agentName] || cfg.listenJid;
  if (targetJid) {
    try { await whatsapp.sendMessage(targetJid, `[${agentName}]\n${text}`); } catch (err) { log.warn("[deliver] WhatsApp send failed:", err.message); }
  }
}

// Allow AudioContext to work without user gesture (needed for voice volume analyser)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// ── Deep Link Protocol Registration ─────────────────────────────────────
app.setAsDefaultProtocolClient("orun-os");
app.on("open-url", (event, url) => {
  event.preventDefault();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isVisible()) { mainWindow.focus(); } else { mainWindow.show(); }
    mainWindow.webContents.send("deep-link:open", url);
  }
});
app.on("second-instance", (_event, argv) => {
  const deepLink = argv.find(a => a.startsWith("orun-os://"));
  if (deepLink && mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isVisible()) { mainWindow.focus(); } else { mainWindow.show(); }
    mainWindow.webContents.send("deep-link:open", deepLink);
  }
});

app.whenReady().then(() => {
  log.info("Orun OS starting", { version: app.getVersion(), isDev });
  logger.window.info("Orun OS starting", { version: app.getVersion(), isDev });

  secretStore.init(app, fs);

  // Custom `orun-asset://` protocol: serves bundled renderer assets (Silero VAD
  // model/worklet, ONNX WASM) over file:// environments where fetch() and
  // AudioWorklet.addModule() are blocked by Chromium. Dev (http://localhost:5173)
  // does not need it.
  protocol.handle("orun-asset", (request) => {
    try {
      const url = new URL(request.url);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const candidates = [path.join(distAssetsDir, rel), path.join(publicAssetsDir, rel)];
      const filePath = candidates.find((c) => fs.existsSync(c));
      if (!filePath) return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      log.error("[orun-asset] protocol error:", err.message);
      return new Response("Internal error", { status: 500 });
    }
  });

  // Initialize encryption module and decrypt DB if encrypted
  dbEncryption.init(app);
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "orun-os.sqlite3");
  if (dbEncryption.isEncrypted(dbPath)) {
    try {
      dbEncryption.getOrCreateKey(require("electron").safeStorage);
      dbEncryption.decryptDB(dbPath);
      log.info("[db-encryption] Database decrypted on startup");
    } catch (err) {
      log.error("[db-encryption] Failed to decrypt database:", err.message);
    }
  }

  // Identidade Orun (Fase A): camada de autenticação opcional. Sem anon key
  // no secret-store, o app segue exatamente como antes (login é opt-in).
  try {
    if (auth.init({ userDataPath, secretStore, db, safeStorageModule: require("electron").safeStorage, wsTransport: require("ws").WebSocket })) {
      auth.initialize();
      log.info("[auth] camada de autenticação inicializada");
    }
  } catch (err) {
    log.warn("[auth] init falhou (opcional):", err.message);
  }

  try {
    db.init(app.getPath("userData"), secretStore.getOrCreateDBKey());
  } catch (err) {
    log.error("Database init failed, retrying with fresh database:", err.message);
    try {
      // Backup corrupted database before deleting
      try {
        const backupPath = dbPath + `.corrupt.${Date.now()}`;
        fs.copyFileSync(dbPath, backupPath);
        log.info(`[db] Corrupted database backed up to ${backupPath}`);
      } catch { /* backup failed, proceed with delete */ }
      for (const ext of ["", "-wal", "-shm"]) {
        try { fs.unlinkSync(dbPath + ext); } catch { /* ignore */ }
      }
      db.init(userDataPath, secretStore.getOrCreateDBKey());
    } catch (retryErr) {
      log.error("Database init failed permanently:", retryErr.message);
    }
  }
  logger.db.info("Database initialized");
  // Store app working directory so DeveloperIDE can find project files
  db.setSetting("appPath", process.cwd());
  migrateDeprecatedModels();
  registerIpcHandlers();
  agentProcessor.init({ db, agentPrompts, n8n, syncEnqueue });
  const identityResolver = require("./identity-resolver.cjs");
  try {
    identityResolver.syncAgentChannelsFromLegacy(db);
    identityResolver.ensureSystemEntities(db);
  } catch (err) {
    log.warn("[identity] init failed:", err.message);
  }
  toolsModule.init(app.getPath("userData"), { db, socialMedia, image3d, videoGenerator, readSecretStore: secretStore.readSecretStore, discordBot, getKnowledgeEngine: () => knowledgeEngine, log: logger.tools });
  logger.tools.info("Tools module initialized");
  toolsModule.setAllowedRoots([app.getPath("userData"), app.getPath("documents"), app.getPath("desktop"), app.getPath("home")]);
  rag.init(app.getPath("userData"), db.getSetting("ollama", {}).baseUrl);
  pluginSystem.init(app.getPath("userData"));
  skillManager = new SkillManager(app.getPath("userData"), { runtime: pluginSystem });
  skillManager.init();
  pluginSystem.loadAll();
  skillManager.reload();
  memoryEngine = memoryEngineModule.createMemoryEngine({
    filePath: path.join(app.getPath("userData"), "memory-engine.json"),
    embed: (text) => rag.getEmbedding(text),
    cloud: memorySupabase,
    summarize: memorySummarize,
    logger,
  });
  memoryConsolidator.init({ memoryEngine, logger });
  knowledgeEngine = knowledgeEngineModule.createKnowledgeEngine({
    filePath: path.join(app.getPath("userData"), "knowledge-engine.json"),
    cloud: knowledgeSupabase,
    summarize: knowledgeSummarize,
    logger,
  });
  plannerEngine = plannerEngineModule.createPlannerEngine({
    filePath: path.join(app.getPath("userData"), "planner-engine.json"),
    cloud: plannerSupabase,
    plan: plannerPlan,
    executeTask: plannerExecute,
    logger,
  });
  eventBus = createEventBus({
    maxHistory: 200,
    logger,
  });
  agentHub = createAgentHub({
    registry: buildAgentRegistry(),
    route: hubRoute,
    execute: hubExecute,
    escalate: hubEscalate,
    eventBus,
  });
  analytics = createAnalytics({
    db: db.getDb(),
    telemetry,
    syncEnqueue,
    getPlanner: () => plannerEngine,
    getMemory: () => memoryEngine,
    getKnowledge: () => knowledgeEngine,
    getSkills: () => (skillManager ? skillManager.list() : []),
  });

  // Event Bus → OS notifications for critical events
  if (eventBus) {
    let lastOsNotifyTime = 0;
    const CRITICAL_TOPICS = ["shield:threat:detected", "hub:delegate:escalated", "planner:task:failed"];
    eventBus.subscribe(CRITICAL_TOPICS, (evt) => {
      const now = Date.now();
      if (now - lastOsNotifyTime < 5000) return; // Max 1 OS notification per 5s
      lastOsNotifyTime = now;
      const title = evt.topic === "shield:threat:detected" ? "🛡️ Ameaça Detectada"
        : evt.topic === "hub:delegate:escalated" ? "⚠️ Escalação de Agente"
        : "❌ Tarefa Falhou";
      const body = typeof evt.data?.title === "string" ? evt.data.title
        : typeof evt.data?.error === "string" ? evt.data.error
        : typeof evt.data?.goal === "string" ? evt.data.goal
        : evt.topic;
      try { new Notification({ title, body, silent: false }).show(); } catch {}
    });
  }
  waAutomation.loadKeywordRules(app.getPath("userData"));
  // Restore N8N webhook URL from settings
  const waCfg = db.getSetting("whatsapp", {});
  if (waCfg.n8nWebhookUrl) waAutomation.setN8nWebhook(waCfg.n8nWebhookUrl);
  log.info("[wa-automation] initialized");
  createWindow();
  createTray();
  initAutoUpdater(mainWindow);
  // Orun Shield + System Optimizer (motores vendored). Tudo opcional — se o
  // pacote falhar ao carregar, o app segue como antes.
  try {
    initShield(mainWindow);
    initOptimizer("shield-quarantine");
    initSentinela();
    log.info("[shield] Orun Shield + Optimizer + Sentinela inicializados");
  } catch (err) {
    log.warn("[shield] init falhou (opcional):", err.message);
  }

  // --- Integration modules (lazy init from settings) ---
  try {
    const intgSettings = db.getSetting("integrations", {});
    
    // Telemetry (PostHog)
    if (intgSettings.telemetry?.host && intgSettings.telemetry?.apiKey) {
      try {
        const { PostHogTelemetryStore } = require("@orun/telemetry-node");
        const { TelemetryClient } = require("@orun/telemetry-core");
        const store = new PostHogTelemetryStore({ host: intgSettings.telemetry.host, apiKey: intgSettings.telemetry.apiKey, flushIntervalMs: 30000 });
        const telemetry = new TelemetryClient({ store, platform: "desktop", appVersion: app.getVersion(), enabled: intgSettings.telemetry.enabled !== false });
        if (runtimeCtx) Object.defineProperty(runtimeCtx, "telemetry", { get: () => telemetry, enumerable: true });
        if (intgSettings.telemetry.personalApiKey && intgSettings.telemetry.projectId) {
          const { PostHogMetricsReader } = require("@orun/telemetry-node");
          if (runtimeCtx) Object.defineProperty(runtimeCtx, "telemetryReader", { get: () => new PostHogMetricsReader({ host: intgSettings.telemetry.host, personalApiKey: intgSettings.telemetry.personalApiKey, projectId: intgSettings.telemetry.projectId }), enumerable: true });
        }
        log.info("[integrations] telemetry (PostHog) initialized");
      } catch (e) { log.warn("[integrations] telemetry init failed:", e.message); }
    }

    // Shield Secrets (Gitleaks)
    try {
      const { GitleaksScannerAdapter, FileAllowlistStore } = require("@orun/shield-secrets-node");
      const scanner = new GitleaksScannerAdapter();
      if (runtimeCtx) Object.defineProperty(runtimeCtx, "secretScanner", { get: () => scanner, enumerable: true });
      const allowlistPath = path.join(app.getPath("userData"), "shields", "secrets-allowlist.json");
      const allowlist = new FileAllowlistStore(allowlistPath);
      if (runtimeCtx) Object.defineProperty(runtimeCtx, "secretAllowlist", { get: () => allowlist, enumerable: true });
      log.info("[integrations] shield-secrets (Gitleaks) initialized");
    } catch (e) { log.warn("[integrations] shield-secrets init failed:", e.message); }

    // Finance (provider-agnostic: manual | actual-budget | pluggy)
    const finCfg = intgSettings.finance || {};
    const provider = finCfg.provider || (finCfg.dataDir ? "actual-budget" : "manual");
    if (provider !== "manual" && finCfg.enabled !== false) {
      try {
        const { createFinanceStore } = require("@orun/finance-node");
        const itemIds = Array.isArray(finCfg.itemIds)
          ? finCfg.itemIds
          : String(finCfg.itemIds || "").split(",").map((s) => s.trim()).filter(Boolean);
        const storeConfig =
          provider === "pluggy"
            ? { provider: "pluggy", pluggy: { clientId: finCfg.clientId, clientSecret: finCfg.clientSecret, itemIds } }
            : { provider: "actual-budget", actual: { dataDir: finCfg.dataDir, serverUrl: finCfg.serverUrl, serverPassword: finCfg.serverPassword, budgetSyncId: finCfg.budgetSyncId || "default" } };
        const finance = createFinanceStore(storeConfig);
        if (finance) {
          if (runtimeCtx) Object.defineProperty(runtimeCtx, "financeStore", { get: () => finance, enumerable: true });
          log.info(`[integrations] finance (${provider}) initialized`);
        } else {
          log.warn(`[integrations] finance provider '${provider}' produced no store`);
        }
      } catch (e) { log.warn("[integrations] finance init failed:", e.message); }
    }

    // Social (Postiz) — local client
    try {
      const postiz = require("./postiz.cjs");
      const postizCfg = intgSettings.social || {};
      postiz.init({
        host: postizCfg.baseUrl || "http://localhost:5000",
        email: postizCfg.email || "caique@orun.local",
        password: postizCfg.password || "OrunPostiz2026!Secure",
        log: logger,
      });
      if (runtimeCtx) Object.defineProperty(runtimeCtx, "postiz", { get: () => postiz, enumerable: true });
      if (runtimeCtx) Object.defineProperty(runtimeCtx, "socialScheduler", { get: () => postiz, enumerable: true });
      log.info("[integrations] postiz initialized (localhost)");
    } catch (e) { log.warn("[integrations] postiz init failed:", e.message); }

    // Social (Postiz) — legacy adapter (disabled)
    // if (intgSettings.social?.baseUrl && intgSettings.social?.apiKey) { ... }

    // Design Sync (Penpot)
    const designCfg = intgSettings.designSync || intgSettings.design || {};
    if (designCfg.baseUrl && designCfg.accessToken) {
      try {
        const { PenpotFileStoreAdapter } = require("@orun/design-sync-node");
        const design = new PenpotFileStoreAdapter({ baseUrl: designCfg.baseUrl, accessToken: designCfg.accessToken });
        if (runtimeCtx) Object.defineProperty(runtimeCtx, "designStore", { get: () => design, enumerable: true });
        log.info("[integrations] design-sync (Penpot) initialized");
      } catch (e) { log.warn("[integrations] design-sync init failed:", e.message); }
    }

    // Memory Vault (Karakeep)
    if (intgSettings.memoryVault?.baseUrl && intgSettings.memoryVault?.apiKey) {
      try {
        const { KarakeepMemoryVaultAdapter } = require("@orun/memory-vault-node");
        const vault = new KarakeepMemoryVaultAdapter({ baseUrl: intgSettings.memoryVault.baseUrl, apiKey: intgSettings.memoryVault.apiKey });
        if (runtimeCtx) Object.defineProperty(runtimeCtx, "memoryVault", { get: () => vault, enumerable: true });
        log.info("[integrations] memory-vault (Karakeep) initialized");
      } catch (e) { log.warn("[integrations] memory-vault init failed:", e.message); }
    }

    // Photos (Immich)
    if (intgSettings.photos?.baseUrl && intgSettings.photos?.apiKey) {
      try {
        const { ImmichPhotoLibraryAdapter } = require("@orun/photos-node");
        const photos = new ImmichPhotoLibraryAdapter({ baseUrl: intgSettings.photos.baseUrl, apiKey: intgSettings.photos.apiKey });
        if (runtimeCtx) Object.defineProperty(runtimeCtx, "photoLibrary", { get: () => photos, enumerable: true });
        log.info("[integrations] photos (Immich) initialized");
      } catch (e) { log.warn("[integrations] photos init failed:", e.message); }
    }
  } catch (err) {
    log.warn("[integrations] module init error:", err.message);
  }
  providerHealth.startPeriodic((providerName) => secretStore.readSecretStore()[providerName]);

  // Try to restore DATABASE_URL from encrypted storage if .env is missing
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (!fs.existsSync(envPath)) {
      const savedUrl = secretStore.readSecretStore().databaseUrl;
      if (savedUrl) {
        const directUrl = savedUrl.replace(":6543/", ":5432/");
        fs.writeFileSync(envPath, `DATABASE_URL="${savedUrl}"\nDIRECT_URL="${directUrl}"\nSYNC_INTERVAL_MS=300000\n`);
      }
    }
  } catch { /* best effort */ }

  // Init PostgreSQL cloud sync (reads DATABASE_URL from .env)
  const syncIntervalMs = parseInt(process.env.SYNC_INTERVAL_MS, 10) || 300_000; // default 5 min
  if (supabaseSync.init()) {
    log.info("PostgreSQL cloud sync enabled", { intervalMs: syncIntervalMs });
    supabaseSync.testConnection().then((r) => {
      if (r.ok) log.info("[sync] PostgreSQL connection OK");
      else log.warn("[sync] PostgreSQL connection failed:", r.error);
    });
    // Initial pull on startup
    supabaseSync.pull(db.getDb()).then((r) => log.info(`[sync] initial pull: ${r.pulled} rows`)).catch((err) => log.warn("[sync] initial pull failed:", err.message));
  } else {
    log.info("PostgreSQL not configured (.env missing or DATABASE_URL empty) — running local-only");
  }

  // Ecossistema Orun (Orun-Core): heartbeat de dispositivo + controle de
  // satélites. Requer @orun/core instalado e credenciais Supabase no keychain
  // (orun.supabase.url + orun.supabase.serviceRoleKey). Se indisponível, o
  // app segue exatamente como antes — é opcional e não afeta o sync legado.
  try {
    if (supabaseSync.initEcosystem(secretStore, app.getVersion())) {
      supabaseSync.startHeartbeat();
      log.info("[ecosystem] heartbeat de dispositivo iniciado (30s)");
      // Inicia sync de settings entre devices
      try {
        const settingsSyncEngine = supabaseSync.initSettingsSync(auth);
        if (settingsSyncEngine) log.info("[ecosystem] settings sync engine iniciado");
      } catch (err) {
        log.warn("[ecosystem] settings sync init falhou:", err.message);
      }
      // Reinit settings sync quando o user faz login (troca "local" pelo userId real)
      auth.subscribe((state) => {
        if (state?.status === "authenticated" && state?.user?.id) {
          try {
            supabaseSync.reinitSettingsSync(auth);
            log.info("[ecosystem] settings sync reinicializado com userId:", state.user.id);
          } catch (err) {
            log.warn("[ecosystem] settings sync reinit falhou:", err.message);
          }
        }
      });
    } else {
      log.info("[ecosystem] Orun-Core inativo — credenciais Supabase não configuradas (opcional)");
    }
  } catch (err) {
    log.warn("[ecosystem] init falhou:", err.message);
  }

  // Auto-sync every N minutes (configurable via SYNC_INTERVAL_MS in .env)
  syncIntervalId = setInterval(() => {
    if (supabaseSync.isConnected()) {
      supabaseSync.sync(db.getDb()).then((r) => {
        if (r.ok && (r.pushed > 0 || r.pulled > 0)) log.info(`[sync] pushed=${r.pushed} pulled=${r.pulled}`);
      }).catch((err) => log.warn("[sync] periodic sync failed:", err.message));
    }
  }, syncIntervalMs);

  // Vigia de grupos: feed ao vivo persistido + watchlist + robô de promoções.
  groupWatcher = createGroupWatcher({
    db, log, aiRouter, secretStore, resolveAISettings,
    whatsapp, telegram,
    userDataPath: app.getPath("userData"),
  });
  groupWatcher.setCallbacks({
    onPush: (msg) => mainWindow?.webContents.send("group-feed:message", msg),
    onAlert: (alert) => mainWindow?.webContents.send("group-feed:alert", alert),
    onDeals: (result) => mainWindow?.webContents.send("group-feed:deals", result),
  });
  groupWatcher.start(app.getPath("userData"));

  whatsapp.setListeners({
    onStatus: (status, extra) => mainWindow?.webContents.send("whatsapp:status-update", { status, ...extra }),
    onQR: (dataUrl) => mainWindow?.webContents.send("whatsapp:qr", dataUrl),
    onMessage: (msg) => {
      groupWatcher?.onMessage({ ...msg, provider: "whatsapp" }).catch((err) => log.error("[group-watcher] crashed:", err.message));
      handleWhatsAppMessage(msg).catch((err) => log.error("[whatsapp] handler crashed:", err.message));
    },
    onGroupMessage: (payload) => mainWindow?.webContents.send("whatsapp:group-msg", payload),
  });

  // Telegram message handler
  const telegramHandler = createTelegramHandler({
    db, aiRouter, agentProcessor, buildSystemPrompt, resolveAISettings, secretStore, log,
  });

  telegram.setListeners({
    onStatus: (statusData) => mainWindow?.webContents.send("telegram:status-update", statusData),
    onMessage: (msg) => {
      groupWatcher?.onMessage({ ...msg, provider: "telegram" }).catch((err) => log.error("[group-watcher] crashed:", err.message));
      telegramHandler.handleMessage(msg, telegram).catch((err) => log.error("[telegram] handler crashed:", err.message));
    },
  });

  discordBot.setStatusCallbacks((status) => {
    mainWindow?.webContents.send("discord:status-update", status);
  });

  // Auto-connect WhatsApp on startup if credentials exist
  const userDataPathInit = app.getPath("userData");
  const whatsappAuthDir = path.join(userDataPathInit, "whatsapp-auth");
  const hasWhatsAppCreds = fs.existsSync(path.join(whatsappAuthDir, "creds.json"));
  if (hasWhatsAppCreds) {
    log.info("[whatsapp] credentials found, auto-connecting...");
    whatsapp.connect(userDataPathInit).catch((err) => {
      log.warn("[whatsapp] auto-connect failed:", err.message);
    });
    // Watchdog: if still "connecting" after 60s, force reset and let it retry
    const watchdog = setInterval(() => {
      const status = whatsapp.getStatus();
      if (status === "connecting") {
        log.warn("[whatsapp] still connecting after 60s, forcing reconnect cycle");
        whatsapp.disconnect().then(() => {
          // Re-attempt after a short delay
            setTimeout(() => {
            whatsapp.connect(userDataPathInit).catch((err) => log.warn("[whatsapp] reconnect failed:", err.message));
          }, 5000);
        }).catch((err) => log.warn("[whatsapp] disconnect failed:", err.message));
        clearInterval(watchdog);
      } else {
        clearInterval(watchdog);
      }
    }, 60000);
  }

  // Auto-connect Discord on startup if token exists
  const discordTokenEntry = secretStore.readSecretStore().discord_bot_token;
  let discordToken = typeof discordTokenEntry === "string" ? discordTokenEntry : discordTokenEntry?.token;
  if (typeof discordToken === "string" && discordToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(discordToken);
      discordToken = typeof parsed === "string" ? parsed : parsed?.token;
    } catch { /* mantém a string crua */ }
  }
  if (discordToken) {
    log.info("[discord] token found, auto-connecting...");
    discordBot.connect(discordToken).catch((err) => {
      log.warn("[discord] auto-connect failed:", err.message);
    });
  }

  // Auto-connect Telegram on startup if token exists
  const telegramToken = secretStore.readSecretStore().telegram_bot_token;
  if (telegramToken) {
    log.info("[telegram] token found, auto-connecting...");
    telegram.connect(telegramToken).catch((err) => {
      log.warn("[telegram] auto-connect failed:", err.message);
    });
  }

  scheduler.init({ db, aiRouter, agentPrompts, log, getSecret: (provider) => secretStore.readSecretStore()[provider], getApiKeys: (provider) => secretStore.getProviderApiKeys(provider), deliver: deliverAgentMessage, processAgentReply: agentProcessor.processAgentReply, autonomousLoop });

  // Auto-start with Windows
  const autoStart = db.getSetting("autoStart", false);
  app.setLoginItemSettings({ openAtLogin: autoStart });

  // Renderer error reporting (from preload error/unhandledrejection listeners)
  ipcMain.on("renderer:error", (_event, msg) => {
    if (typeof msg === "string" && msg.length < 2000) log.error(`[renderer] ${msg}`);
  });

  // Notification forwarding: main process -> OS notifications (rate-limited)
  let lastNotifyTime = 0;
  ipcMain.on("app:notify", (_event, { title, body, silent }) => {    const now = Date.now();
    if (now - lastNotifyTime < 500) return; // Max 2 notifications per second
    lastNotifyTime = now;
    if (!title || typeof title !== "string" || title.length > 200) return;
    if (!body || typeof body !== "string" || body.length > 500) return;
    new Notification({ title: title || "Orun OS", body: body || "", silent: silent ?? false }).show();
  });

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow?.isVisible()) { mainWindow.focus(); } else { mainWindow?.show(); mainWindow?.focus(); }
  });

  globalShortcut.register("CommandOrControl+Shift+V", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
      mainWindow.webContents.send("voice-overlay:show");
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("voice-overlay:show");
    }
  });

  globalShortcut.register("CommandOrControl+Shift+O", () => {
    toggleQuickChat();
  });

  globalShortcut.register("Alt+Space", () => {
    toggleQuickChat();
  });

  // ── Quick Chat IPC ────────────────────────────────────────────────
  ipcMain.handle("quick-chat:hide", () => {
    if (quickChatWindow && !quickChatWindow.isDestroyed()) quickChatWindow.hide();
    return true;
  });

  ipcMain.handle("quick-chat:is-visible", () => {
    return quickChatWindow && !quickChatWindow.isDestroyed() && quickChatWindow.isVisible();
  });

  ipcMain.handle("quick-chat:send-message", async (_event, text) => {
    if (!text || typeof text !== "string" || text.length > 2000) return false;
    try {
      const settings = resolveAISettings();
      const apiKeys = secretStore.getProviderApiKeys(settings.provider);
      const systemPrompt = buildSystemPrompt(settings.systemPrompt);
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ];
      const { context } = await aiRouter.buildContext({
        messages, systemPrompt, provider: settings.provider,
        model: settings.model, baseUrl: settings.baseUrl, apiKeys,
      });
      const result = await aiRouter.routeChat({
        provider: settings.provider, model: settings.model,
        baseUrl: settings.baseUrl, apiKeys, messages: context,
      });
      const processed = agentProcessor.processAgentReply(null, result.text);
      if (quickChatWindow && !quickChatWindow.isDestroyed()) {
        quickChatWindow.webContents.send("quick-chat:response", processed);
      }
      return true;
    } catch (err) {
      log.error("[quick-chat] AI error:", err.message);
      if (quickChatWindow && !quickChatWindow.isDestroyed()) {
        quickChatWindow.webContents.send("quick-chat:error", err.message);
      }
      return false;
    }
  });

  // ── Webhook Receiver ──────────────────────────────────────────────
  const wh = startWebhookReceiver({ log });
  setEventHandler((event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("webhook:event", event);
    }
  });
  ipcMain.handle("webhook:status", () => {
    const whPort = process.env.WEBHOOK_PORT || 8082;
    return { running: true, port: whPort, secret: wh.secret };
  });

  // ── MCP Servers (auto-load persisted servers) ──────────────────────
  const savedMcpServers = db.getSetting("mcpServers", []);
  if (Array.isArray(savedMcpServers)) {
    for (const srv of savedMcpServers) {
      if (!srv || typeof srv.name !== "string" || typeof srv.command !== "string") continue;
      mcpClient.addServer(srv.name, srv.command, srv.args || [], srv.env || {}).catch((err) => {
        log.error(`[mcp] failed to auto-start ${srv.name}:`, err.message);
      });
    }
  }

  // ── Background Services (wake word + Piper TTS) ────────────────────
  bgServices = createBackgroundServices({ app, db, log, mainWindow: { isDestroyed: () => mainWindow?.isDestroyed(), isVisible: () => mainWindow?.isVisible(), show: () => mainWindow?.show(), focus: () => mainWindow?.focus(), webContents: { send: (...a) => mainWindow?.webContents.send(...a) } } });
  bgServices.start();

  // ── Proactive events (boot greeting + Spotify watcher) ──────────────
  proactive = createProactiveEvents({
    log,
    getDb: () => db,
    getSpotifyClient: () => spotify,
    sendToRenderer: (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("voice-overlay:show");
        mainWindow.webContents.send("voice-overlay:proactive", payload);
      }
    },
  });
  const windowLoaded = mainWindow && !mainWindow.isDestroyed()
    ? new Promise((resolve) => {
        if (!mainWindow.webContents.isLoading()) resolve();
        else mainWindow.webContents.once("did-finish-load", () => resolve());
      })
    : Promise.resolve();
  proactive.start({ windowLoadedPromise: windowLoaded });

  // ── Pipeline Runner (Squad Orchestration) ────────────────────────────────
  // Bridge real LLM execution into the pipeline runner so each squad step
  // produces actual agent output (via the shared autonomous loop) instead of
  // a placeholder. Mirrors scheduler.cjs's runAgentTask wiring.
  const pipelineOrchestrator = {
    log,
    // Full tool-capable execution through the shared autonomous loop.
    async runAgentTask(agentId, userPrompt, { modelTier } = {}) {
      const prompt = `[PIPELINE STEP — ${agentId}]\n${userPrompt}`;
      const res = await autonomousLoop({
        messages: [{ role: "user", content: prompt }],
        agentId,
        sender: { isDestroyed: () => false, send: () => {} }, // no-op sender for background
        requestId: `pipeline-${agentId}-${Date.now()}`,
        cancelledRef: { cancelled: false },
      });
      return res;
    },
    // Plain chat fallback (no tools) through the ai-router.
    async chat(agentId, userPrompt, { modelTier } = {}) {
      const settings = resolveAISettings(agentId);
      const apiKeys = secretStore.getProviderApiKeys(settings.provider);
      const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
      const result = await aiRouter.routeChat({
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKeys,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[PIPELINE STEP — ${agentId}]\n${userPrompt}` },
        ],
      });
      return result.text;
    },
  };
  const pipelineRunner = new PipelineRunner(pipelineOrchestrator);

  // IPC Handlers for Pipeline Runner
  ipcMain.handle("pipeline:list-squads", async () => {
    try {
      const squads = await pipelineRunner.listSquads();
      return { success: true, squads };
    } catch (e) {
      log.error("[pipeline] list-squads failed:", e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("pipeline:metrics", async () => {
    try {
      const metrics = await pipelineRunner.getDashboardMetrics();
      return { success: true, metrics };
    } catch (e) {
      log.error("[pipeline] metrics failed:", e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("pipeline:run", async (_event, { squadName, options = {} }) => {
    try {
      const result = await pipelineRunner.runPipeline(squadName, options);
      return result;
    } catch (e) {
      log.error("[pipeline] run failed:", e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("pipeline:state", async (_event, { squadName }) => {
    try {
      const state = await pipelineRunner.getDashboardState(squadName);
      return { success: true, state };
    } catch (e) {
      log.error("[pipeline] state failed:", e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("pipeline:load", async (_event, { squadName }) => {
    try {
      const loaded = await pipelineRunner.loadSquad(squadName);
      return { success: true, ...loaded };
    } catch (e) {
      log.error("[pipeline] load failed:", e.message);
      return { success: false, error: e.message };
    }
  });

  // ── Pipeline Runner IPC Handlers (for renderer integration) ────────────
  ipcMain.handle("pipeline:active-runs", async () => {
    return { success: true, runs: pipelineRunner.getActiveRuns() };
  });
  // ───────────────────────────────────────────────────────────────────────

  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("before-quit", () => {
  if (isQuitting) return; // prevent double-run
  isQuitting = true;

  // Clear all intervals
  if (syncIntervalId) { clearInterval(syncIntervalId); syncIntervalId = null; }
  if (rateLimiterIntervalId) { clearInterval(rateLimiterIntervalId); rateLimiterIntervalId = null; }
  providerHealth.stop();
  try { supabaseSync.stopHeartbeat(); } catch { /* best effort */ }
  // Marca este dispositivo offline no ecossistema antes de sair.
  try {
    const controller = supabaseSync.getController();
    if (controller) controller.markOffline().catch(() => {});
  } catch { /* best effort */ }

  // Destroy quick chat window
  if (quickChatWindow && !quickChatWindow.isDestroyed()) { quickChatWindow.destroy(); quickChatWindow = null; }

  // Stop webhook receiver
  try { stopWebhookReceiver(); } catch {}

  // Stop background services (wake word + Piper + STT)
  if (bgServices) { bgServices.stop(); bgServices = null; }

  // Stop proactive events
  if (proactive) { proactive.stop(); proactive = null; }

  // Stop MCP server processes
  try { mcpClient.stopAll && mcpClient.stopAll(); } catch { /* ignore */ }

  // Disconnect WhatsApp
  try { whatsapp.disconnect && whatsapp.disconnect().catch(() => {}); } catch { /* ignore */ }

  // Stop Orun Shield monitors (watchers de arquivo, intervals)
  try { shutdownShield(); } catch { /* ignore */ }

  // Disconnect Spotify, Discord & Telegram
  try { spotify.stopCallbackServer(); } catch { /* ignore */ }
  try { discordBot.disconnect().catch(() => {}); } catch { /* ignore */ }
  try { telegram.disconnect().catch(() => {}); } catch { /* ignore */ }

  // Stop the group watcher (persiste histórico e desliga o timer de promoções)
  try { groupWatcher?.stop(); } catch { /* ignore */ }

  // Stop active stream requests
  for (const [id, req] of activeStreamRequests) {
    try { req.destroy && req.destroy(); } catch { /* ignore */ }
  }
  activeStreamRequests.clear();

  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "orun-os.sqlite3");

  // Auto-backup: keep last 3 backups before encrypting
  if (fs.existsSync(dbPath)) {
    try {
      const backupDir = path.join(userDataPath, "backups");
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `orun-os-${timestamp}.sqlite3`);
      fs.copyFileSync(dbPath, backupPath);
      // Prune old backups (keep last 3)
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith(".sqlite3"))
        .sort()
        .reverse();
      for (const old of backups.slice(3)) {
        try { fs.unlinkSync(path.join(backupDir, old)); } catch {}
      }
      log.info("[db-backup] Backup created:", backupPath);
    } catch (err) {
      log.error("[db-backup] Failed to create backup:", err.message);
    }
  }

  // Encrypt database on quit
  if (dbEncryption.initialized && !dbEncryption.isEncrypted(dbPath)) {
    try {
      const database = db.getDb();
      if (database) {
        database.close();
      }
      dbEncryption.encryptDB(dbPath);
      log.info("[db-encryption] Database encrypted on quit");
    } catch (err) {
      log.error("[db-encryption] Failed to encrypt database on quit:", err.message);
    }
  }
});
app.on("will-quit", () => { globalShortcut.unregisterAll(); });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !db.getSetting("runInBackground", true)) app.quit();
});

process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE") return; // suppress EPIPE when terminal closes
  log.error("Uncaught exception:", err);
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const { Notification } = require("electron");
      new Notification({
        title: "Orun OS",
        body: `Erro inesperado: ${err.message?.slice(0, 120) || "desconhecido"}`,
        silent: true,
      }).show();
    } catch {}
  }
});

process.on("unhandledRejection", (reason) => {
  if (reason?.code === "EPIPE") return; // suppress EPIPE
  log.error("Unhandled promise rejection:", reason);
});

process.on("exit", () => {
  // Safety net: force-kill any remaining child processes
  if (bgServices) { try { bgServices.stop(); } catch {} }
});

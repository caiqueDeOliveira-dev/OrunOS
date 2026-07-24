// electron/main.cjs
//
// Electron main process for Orun OS.

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, globalShortcut, shell, crashReporter } = require("electron");
const path = require("path");
const fs = require("fs");
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
const socialMedia = require("./social-media.cjs");
const musicProducer = require("./music-producer.cjs");
const supabaseSync = require("./supabase.cjs");
const toolsModule = require("./tools.cjs");
const mcpClient = require("./mcp-client.cjs");
const pluginSystem = require("./plugin-system.cjs");
const rag = require("./rag.cjs");
const secretStore = require("./secret-store.cjs");
const agentProcessor = require("./agent-processor.cjs");
const { responseCache } = require("./response-cache.cjs");
const logger = require("./logger.cjs");
const providerHealth = require("./provider-health.cjs");
const { telemetry } = require("./telemetry.cjs");
const { getErrorMessage, getErrorTitle } = require("./error-messages.cjs");
const waAutomation = require("./whatsapp-automation.cjs");
const { autonomousLoop: autonomousLoopImpl } = require("./autonomous-loop.cjs");
const { handleWhatsAppMessage: handleWhatsAppMessageImpl, saveNutritionToFile } = require("./whatsapp-handler.cjs");
const { createBackgroundServices } = require("./background-services.cjs");
const { SpotifyClient } = require("./spotify-client.cjs");
const { DiscordBot } = require("./discord-bot.cjs");
const telegram = require("./telegram.cjs");
const { createTelegramHandler } = require("./telegram-handler.cjs");
const { createTelegramAutomation } = require("./telegram-automation.cjs");

// ── Spotify & Discord instances ──────────────────────────────────────────────
const spotify = new SpotifyClient();
spotify.setLogger(log);
const discordBot = new DiscordBot();
discordBot.setLogger(log);

// ── Telegram instances ──────────────────────────────────────────────────────
telegram.setLogger(log);
const telegramAutomation = createTelegramAutomation({ log });

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

const DEFAULT_AI_SETTINGS = {
  provider: "groq",
  model: "llama-3.3-70b-versatile",
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
const AGENT_RECOMMENDED_MODELS = {
  Hampton:    { provider: "groq",        model: "llama-3.3-70b-versatile" },
  Developer:  { provider: "groq",        model: "qwen/qwen3-32b" },
  Designer:   { provider: "opencodezen", model: "big-pickle" },
  Creator:    { provider: "groq",        model: "llama-3.3-70b-versatile" },
  Health:     { provider: "groq",        model: "llama-3.3-70b-versatile" },
  Finance:    { provider: "groq",        model: "llama-3.3-70b-versatile" },
  Teacher:    { provider: "groq",        model: "qwen/qwen3-32b" },
  Marketing:  { provider: "opencodezen", model: "big-pickle" },
  Automation: { provider: "groq",        model: "llama-3.3-70b-versatile" },
  Automotive: { provider: "groq",        model: "llama-3.3-70b-versatile" },
  System:     { provider: "groq",        model: "llama-3.3-70b-versatile" },
};

// ── Agent Tool Permissions ──────────────────────────────────────────────
// Each agent only gets tools relevant to its function. Reduces token usage
// and prevents agents from calling irrelevant tools.

const AGENT_TOOL_PERMISSIONS = {
  Developer: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search", "trigger_agent", "workspace_action",
  ],
  Designer: [
    "read_file", "write_file", "list_files", "search_files",
    "generate_image", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search", "trigger_agent", "workspace_action",
  ],
  Health: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "workspace_action",
  ],
  Finance: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "workspace_action",
  ],
  Teacher: [
    "read_file", "write_file", "list_files",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "workspace_action",
  ],
  Marketing: [
    "read_file", "write_file", "list_files",
    "generate_image", "publish_to_social",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "web_search", "workspace_action",
  ],
  Automation: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent", "publish_to_social", "workspace_action",
  ],
  Automotive: [
    "web_search", "web_fetch", "memory_save", "memory_search", "rag_search",
    "read_file", "list_files", "notify",
  ],
  System: [
    "read_file", "write_file", "edit_file", "list_files", "search_files",
    "search_content", "run_command", "web_fetch", "web_search",
    "memory_save", "memory_search", "rag_search",
    "notify", "schedule_task", "trigger_agent",
    "clipboard_read", "clipboard_write", "screenshot",
    "publish_to_social", "generate_image", "workspace_action",
    "spotify_play", "spotify_search", "spotify_get_playlists", "spotify_get_now_playing",
  ],
  Hampton: null, // null = all tools (default agent)
};

function getToolsForAgent(agentId) {
  const allowed = AGENT_TOOL_PERMISSIONS[agentId];
  if (!allowed) return toolsModule.TOOL_DEFINITIONS; // null = all tools
  return toolsModule.TOOL_DEFINITIONS.filter((t) => allowed.includes(t.function.name));
}
let mainWindow;
let tray = null;
let isQuitting = false;
let bgServices = null;
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

  // ── Render-process crash handler ────────────────────────────────────
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log.error("[crash] Renderer process gone:", details.reason, details.exitCode);
    if (details.reason === "crashed") {
      mainWindow?.reload();
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    log.error("[load] Page failed to load:", errorCode, errorDescription);
  });

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
  const cspDev = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: ${fontSources}; connect-src 'self' blob: http://localhost:* ws://localhost:* https:; media-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'`;
  const cspProd = `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: ${fontSources}; connect-src 'self' blob: http://localhost:* ws://localhost:* https:; media-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'none'; object-src 'none'`;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [isDev ? cspDev : cspProd],
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
    log.error("Renderer process gone:", details);
  });
}

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "build", "tray-icon.png"));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("Orun OS — Hampton");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Orun OS", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
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

function resolveAISettings(agentId) {
  const global = getGlobalAISettings();
  if (!agentId) return global;
  const override = db.getSetting("agentModels", {})[agentId];
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
  const n8nCfg = db.getSetting("n8n", {});
  const actions = db.getSetting("automationActions", []);
  if (!n8nCfg.autoTrigger || !actions.length) return prompt;
  const list = actions.map((a) => `- ${a.name}: ${a.description || "no description"}`).join("\n");
  return `${prompt || ""}\n\nYou can trigger these automations when the user's request clearly calls for one:\n${list}\n\nTo trigger one, end your reply with exactly this (nothing after it): <<ACTION:name>>{"key":"value"}<</ACTION>>\nOnly do this when truly appropriate, at most once per reply, keep the JSON minimal, and never mention the tag syntax itself to the user.`;
}

/** Enqueue a row for Supabase cloud sync (fire-and-forget). */
function syncEnqueue(tableName, row) {
  try { supabaseSync.enqueue(db.getDb(), tableName, row); } catch { /* ignore */ }
}

// ── Autonomous loop ─────────────────────────────────────────────────────

/** Delegate to extracted module, passing context dependencies. */
function autonomousLoop(opts) {
  return autonomousLoopImpl(opts, {
    aiRouter, toolsModule, mcpClient, pluginSystem, responseCache, agentProcessor,
    logger, secretStore, resolveAISettings, buildSystemPrompt, getToolsForAgent, log,
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────────

function registerIpcHandlers() {
  const ctx = {
    aiRouter, ttsRouter, sttRouter, n8n, db, agentPrompts, whatsapp, scheduler,
    videoEditor, image3d, socialMedia, musicProducer, toolsModule, mcpClient,
    pluginSystem, rag, secretStore, agentProcessor, supabaseSync,
    activeStreamRequests, activeAutonomousRequests,
    telemetry,
    rateLimiter: ipcRateLimiter,
    readKeys: () => secretStore.readSecretStore(),
    syncEnqueue, resolveAISettings, buildSystemPrompt, getGlobalAISettings,
    autonomousLoop, isDev, log, app,
    agentRecommendedModels: AGENT_RECOMMENDED_MODELS,
    spotify, discordBot, telegram, telegramAutomation,
  };
  Object.defineProperty(ctx, "mainWindow", { get: () => mainWindow, enumerable: true });

  require("./ipc/ai-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/settings-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/data-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/media-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/update-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/spotify-handlers.cjs").register(ipcMain, ctx);
  require("./ipc/discord-handlers.cjs").register(ipcMain, ctx);

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
function setupAutoUpdate() {
  if (isDev) return;
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => log.warn("Auto-update check failed:", err.message));
  } catch (err) {
    log.warn("electron-updater not available:", err.message);
  }
}

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

function handleWhatsAppMessage({ jid, text, imageBase64, fromMe }) {
  return handleWhatsAppMessageImpl({ jid, text, imageBase64, fromMe }, {
    db, aiRouter, agentProcessor, secretStore, whatsapp, waAutomation,
    buildSystemPrompt, resolveAISettings, log,
    saveNutritionToFile: (text) => saveNutritionToFile(text, app.getPath("userData"), log),
    getErrorMessage,
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
  secretStore.init(app, fs);
  logger.window.info("Orun OS starting", { version: app.getVersion(), isDev });

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
  registerIpcHandlers();
  agentProcessor.init({ db, agentPrompts, n8n, syncEnqueue });
  toolsModule.init(app.getPath("userData"), { db, socialMedia, image3d, readSecretStore: secretStore.readSecretStore });
  logger.tools.info("Tools module initialized");
  toolsModule.setAllowedRoots([app.getPath("userData"), app.getPath("documents"), app.getPath("desktop"), app.getPath("home")]);
  rag.init(app.getPath("userData"), db.getSetting("ollama", {}).baseUrl);
  pluginSystem.init(app.getPath("userData"));
  pluginSystem.loadAll();
  waAutomation.loadKeywordRules(app.getPath("userData"));
  // Restore N8N webhook URL from settings
  const waCfg = db.getSetting("whatsapp", {});
  if (waCfg.n8nWebhookUrl) waAutomation.setN8nWebhook(waCfg.n8nWebhookUrl);
  log.info("[wa-automation] initialized");
  createWindow();
  createTray();
  setupAutoUpdate();
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

  // Auto-sync every N minutes (configurable via SYNC_INTERVAL_MS in .env)
  syncIntervalId = setInterval(() => {
    if (supabaseSync.isConnected()) {
      supabaseSync.sync(db.getDb()).then((r) => {
        if (r.ok && (r.pushed > 0 || r.pulled > 0)) log.info(`[sync] pushed=${r.pushed} pulled=${r.pulled}`);
      }).catch(() => {});
    }
  }, syncIntervalMs);

  whatsapp.setListeners({
    onStatus: (status, extra) => mainWindow?.webContents.send("whatsapp:status-update", { status, ...extra }),
    onQR: (dataUrl) => mainWindow?.webContents.send("whatsapp:qr", dataUrl),
    onMessage: (msg) => handleWhatsAppMessage(msg).catch((err) => log.error("[whatsapp] handler crashed:", err.message)),
  });

  // Telegram message handler
  const telegramHandler = createTelegramHandler({
    db, aiRouter, agentProcessor, buildSystemPrompt, resolveAISettings, log,
  });

  telegram.setListeners({
    onStatus: (statusData) => mainWindow?.webContents.send("telegram:status-update", statusData),
    onMessage: (msg) => telegramHandler.handleMessage(msg, telegram).catch((err) => log.error("[telegram] handler crashed:", err.message)),
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
    // Watchdog: if still "connecting" after 45s, force reset
    const watchdog = setInterval(() => {
      if (whatsapp.getStatus() === "connecting") {
        log.warn("[whatsapp] still connecting after 45s, forcing disconnect");
        whatsapp.disconnect().catch(() => {});
        clearInterval(watchdog);
      } else {
        clearInterval(watchdog);
      }
    }, 45000);
  }

  // Auto-connect Discord on startup if token exists
  const discordToken = secretStore.readSecretStore().discord_token;
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

  scheduler.init({ db, aiRouter, agentPrompts, log, getSecret: (provider) => secretStore.readSecretStore()[provider], deliver: deliverAgentMessage, processAgentReply: agentProcessor.processAgentReply, autonomousLoop });

  // Auto-start with Windows
  const autoStart = db.getSetting("autoStart", false);
  app.setLoginItemSettings({ openAtLogin: autoStart });

  // Notification forwarding: main process -> OS notifications (rate-limited)
  let lastNotifyTime = 0;
  ipcMain.on("app:notify", (_event, { title, body, silent }) => {
    const now = Date.now();
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

  // ── Background Services (wake word + Piper TTS) ────────────────────
  bgServices = createBackgroundServices({ app, db, log, mainWindow: { isDestroyed: () => mainWindow?.isDestroyed(), isVisible: () => mainWindow?.isVisible(), show: () => mainWindow?.show(), focus: () => mainWindow?.focus(), webContents: { send: (...a) => mainWindow?.webContents.send(...a) } } });
  bgServices.start();

  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("before-quit", () => {
  if (isQuitting) return; // prevent double-run
  isQuitting = true;

  // Clear all intervals
  if (syncIntervalId) { clearInterval(syncIntervalId); syncIntervalId = null; }
  if (rateLimiterIntervalId) { clearInterval(rateLimiterIntervalId); rateLimiterIntervalId = null; }
  providerHealth.stop();

  // Stop background services (wake word + Piper + STT)
  if (bgServices) { bgServices.stop(); bgServices = null; }

  // Stop MCP server processes
  try { mcpClient.stopAll && mcpClient.stopAll(); } catch { /* ignore */ }

  // Disconnect WhatsApp
  try { whatsapp.disconnect && whatsapp.disconnect().catch(() => {}); } catch { /* ignore */ }

  // Disconnect Spotify, Discord & Telegram
  try { spotify.stopCallbackServer(); } catch { /* ignore */ }
  try { discordBot.disconnect().catch(() => {}); } catch { /* ignore */ }
  try { telegram.disconnect().catch(() => {}); } catch { /* ignore */ }

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

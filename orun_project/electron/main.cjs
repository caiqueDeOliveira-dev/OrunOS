// electron/main.cjs
//
// Electron main process for Orun OS.

const { app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, nativeImage, Notification, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const log = require("electron-log");

const aiRouter = require("./ai-router.cjs");
const ttsRouter = require("./tts-router.cjs");
const n8n = require("./n8n.cjs");
const db = require("./db.cjs");
const agentPrompts = require("./agent-prompts.cjs");
const whatsapp = require("./whatsapp.cjs");
const scheduler = require("./scheduler.cjs");

const isDev = !app.isPackaged;
const KEYS_FILE = () => path.join(app.getPath("userData"), "keys.enc.json");
const DEFAULT_AI_SETTINGS = {
  provider: "ollama",
  model: "llama3.1",
  baseUrl: "http://localhost:11434",
  systemPrompt: "You are Hampton, the central AI of Orun OS, a personal AI operating system. Be direct, helpful, and concise.",
};
const ACTION_TAG = /<<ACTION:([^>]+)>>([\s\S]*?)<<\/ACTION>>/;

let mainWindow;
let tray = null;
let isQuitting = false;
const activeStreamRequests = new Map(); // requestId -> http(s) ClientRequest, for the Stop button

// ── Logging ──────────────────────────────────────────────────────────────
log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : false;
log.errorHandler.startCatching();
Object.assign(console, log.functions);

// ── Window + Tray ──────────────────────────────────────────────────────
// "Run in background" keeps Hampton reachable (and any future scheduled
// automations alive) after the window closes, instead of fully quitting —
// closer to how an actual OS component behaves. Off by default; the user
// opts in from Settings.

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: "#080808",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("close", (event) => {
    const runInBackground = db.getSetting("runInBackground", false);
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

// ── Encrypted secret storage (AI provider keys + n8n API key) ───────────

function readSecretStore() {
  try {
    const raw = fs.readFileSync(KEYS_FILE());
    const parsed = JSON.parse(raw.toString());
    const out = {};
    for (const [slot, base64] of Object.entries(parsed)) out[slot] = safeStorage.decryptString(Buffer.from(base64, "base64"));
    return out;
  } catch {
    return {};
  }
}

function writeSecret(slot, value) {
  const store = fs.existsSync(KEYS_FILE()) ? JSON.parse(fs.readFileSync(KEYS_FILE()).toString()) : {};
  store[slot] = safeStorage.encryptString(value).toString("base64");
  fs.writeFileSync(KEYS_FILE(), JSON.stringify(store));
}

// ── Settings resolution ───────────────────────────────────────────────────

function getGlobalAISettings() {
  return { ...DEFAULT_AI_SETTINGS, ...db.getSetting("ai", {}) };
}

function resolveAISettings(agentId) {
  const global = getGlobalAISettings();
  if (!agentId) return global;
  const override = db.getSetting("agentModels", {})[agentId];
  if (!override || !override.provider) return global;
  return { ...global, provider: override.provider, model: override.model, baseUrl: override.baseUrl || global.baseUrl };
}

/** Appends available automations to the system prompt, if Hampton is allowed to trigger them. */
function buildSystemPrompt(basePrompt, agentId) {
  let prompt = basePrompt;
  if (agentId) {
    const override = db.getSetting("agentModels", {})[agentId];
    prompt = agentPrompts.promptFor(agentId, override?.systemPrompt);
  }
  const n8nCfg = db.getSetting("n8n", {});
  const actions = db.getSetting("automationActions", []);
  if (!n8nCfg.autoTrigger || !actions.length) return prompt;
  const list = actions.map((a) => `- ${a.name}: ${a.description || "no description"}`).join("\n");
  return `${prompt || ""}\n\nYou can trigger these automations when the user's request clearly calls for one:\n${list}\n\nTo trigger one, end your reply with exactly this (nothing after it): <<ACTION:name>>{"key":"value"}<</ACTION>>\nOnly do this when truly appropriate, at most once per reply, keep the JSON minimal, and never mention the tag syntax itself to the user.`;
}

/** Nutritionist replies end with a JSON block — parse it and log the meal, appending a running daily total. */
function maybeLogNutrition(agentId, text) {
  if (agentId !== "Nutritionist") return text;
  const parsed = agentPrompts.extractNutritionJSON(text);
  if (!parsed) return text;
  db.recordMeal({ id: randomUUID(), description: text.slice(0, 200), ...parsed, source: "app" });
  const { totals } = db.getDailyNutrition();
  return `${text}\n\n📊 Today so far: ${Math.round(totals.calories)} kcal (${Math.round(totals.protein_g)}g protein, ${Math.round(totals.carbs_g)}g carbs, ${Math.round(totals.fat_g)}g fat).`;
}

/** Finance replies with a JSON block — parse and log the transaction, showing daily summary. */
function maybeLogFinance(agentId, text) {
  if (agentId !== "Finance") return text;
  const parsed = agentPrompts.extractFinanceJSON(text);
  if (!parsed) return text;
  db.recordExpense({ id: randomUUID(), ...parsed, source: "app" });
  const { totals, balance } = db.getDailyFinance();
  const emoji = parsed.type === "income" ? "💰" : "💸";
  return `${text}\n\n${emoji} Today: +$${totals.income.toFixed(2)} / -$${totals.expenses.toFixed(2)} (balance: $${balance.toFixed(2)}).`;
}

/** Health replies with a JSON block — parse and log the metric. */
function maybeLogHealth(agentId, text) {
  if (agentId !== "Health") return text;
  const parsed = agentPrompts.extractHealthJSON(text);
  if (!parsed) return text;
  db.recordHealthMetric({ id: randomUUID(), ...parsed, source: "app" });
  return `${text}\n\n❤️ Logged: ${parsed.metric} = ${parsed.value}${parsed.unit ? " " + parsed.unit : ""}.`;
}

/** Developer replies with a JSON block — parse and log the review. */
function maybeLogDeveloper(agentId, text) {
  if (agentId !== "Developer") return text;
  const parsed = agentPrompts.extractDeveloperJSON(text);
  if (!parsed) return text;
  db.recordReview({ id: randomUUID(), ...parsed, source: "app" });
  const severityEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[parsed.severity] || "⚪";
  return `${text}\n\n🔍 Review logged: ${parsed.issues_found} issue(s) found ${severityEmoji} ${parsed.severity}.`;
}

/** Teacher replies with a JSON block — parse and log the progress. */
function maybeLogTeacher(agentId, text) {
  if (agentId !== "Teacher") return text;
  const parsed = agentPrompts.extractTeacherJSON(text);
  if (!parsed) return text;
  db.recordProgress({ id: randomUUID(), ...parsed, source: "app" });
  const statusEmoji = { learning: "📖", reviewed: "✅", mastered: "🏆" }[parsed.status] || "📚";
  return `${text}\n\n${statusEmoji} Progress: ${parsed.subject} → ${parsed.topic} (${parsed.status}${parsed.score != null ? ", score: " + parsed.score : ""}).`;
}

/** Unified post-processing — runs all agent-specific extractors. */
function processAgentReply(agentId, text) {
  let result = text;
  result = maybeLogNutrition(agentId, result);
  result = maybeLogFinance(agentId, result);
  result = maybeLogHealth(agentId, result);
  result = maybeLogDeveloper(agentId, result);
  result = maybeLogTeacher(agentId, result);
  return result;
}

/** Scans a finished reply for an action tag and fires the matching n8n webhook, if enabled. */
async function processActions(text) {
  const n8nCfg = db.getSetting("n8n", {});
  if (!n8nCfg.autoTrigger) return text;
  const match = text.match(ACTION_TAG);
  if (!match) return text;
  const [full, rawName, payloadRaw] = match;
  const cleaned = text.replace(full, "").trim();
  const actions = db.getSetting("automationActions", []);
  const action = actions.find((a) => a.name === rawName.trim());
  if (!action) return cleaned;
  let payload;
  try { payload = JSON.parse(payloadRaw); } catch { payload = { raw: payloadRaw }; }
  try {
    await n8n.triggerWebhook({ webhookUrl: action.webhookUrl, payload, headerName: action.headerName, headerValue: action.headerValue });
    log.info(`[automation] triggered "${action.name}"`);
    return `${cleaned}\n\n✓ Triggered automation "${action.name}".`;
  } catch (err) {
    log.warn(`[automation] "${action.name}" failed:`, err.message);
    return `${cleaned}\n\n⚠️ Tried to trigger "${action.name}" but it failed: ${err.message}`;
  }
}

function recordUsageSafely(provider, usage) {
  try { db.recordUsage(provider, usage?.tokensIn || 0, usage?.tokensOut || 0); } catch (err) { log.warn("recordUsage failed:", err.message); }
}

// ── IPC handlers ─────────────────────────────────────────────────────────

function registerIpcHandlers() {
  ipcMain.handle("ai:chat", async (_event, { messages, agentId }) => {
    const settings = resolveAISettings(agentId);
    const keys = readSecretStore();
    const apiKey = keys[settings.provider];
    const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
    const { context } = await aiRouter.buildContext({ messages, systemPrompt, provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey });

    log.info(`[ai:chat] agent=${agentId || "hampton"} provider=${settings.provider} model=${settings.model}`);
    try {
      const result = await aiRouter.routeChat({ provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey, messages: context });
      recordUsageSafely(settings.provider, result.usage);
      return processAgentReply(agentId, await processActions(result.text));
    } catch (err) {
      const fallback = db.getSetting("aiFallback", null);
      if (fallback?.provider) {
        log.warn(`[ai:chat] ${settings.provider} failed (${err.message}), trying fallback ${fallback.provider}`);
        try {
          const result = await aiRouter.routeChat({ provider: fallback.provider, model: fallback.model, apiKey: keys[fallback.provider], messages: context });
          recordUsageSafely(fallback.provider, result.usage);
          return processAgentReply(agentId, await processActions(result.text));
        } catch (fallbackErr) {
          log.error("[ai:chat] fallback also failed:", fallbackErr.message);
          throw fallbackErr;
        }
      }
      log.error("[ai:chat] failed:", err.message);
      throw err;
    }
  });

  ipcMain.on("ai:chat-stream", async (event, { requestId, messages, agentId }) => {
    const sender = event.sender;
    const settings = resolveAISettings(agentId);
    const keys = readSecretStore();
    const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
    const send = (channel, payload) => { if (!sender.isDestroyed()) sender.send(channel, payload); };

    const attempt = async (provider, model, baseUrl, apiKey) => {
      let receivedAny = false;
      const { context } = await aiRouter.buildContext({ messages, systemPrompt, provider, model, baseUrl, apiKey });
      return aiRouter.streamChat({
        provider, model, baseUrl, apiKey, messages: context,
        onChunk: (delta) => { receivedAny = true; send(`ai:chat-stream:chunk:${requestId}`, delta); },
        onRequestReady: (req) => activeStreamRequests.set(requestId, req),
      }).then((result) => ({ result, receivedAny: true })).catch((err) => { throw Object.assign(err, { receivedAny }); });
    };

    log.info(`[ai:chat-stream] agent=${agentId || "hampton"} provider=${settings.provider} model=${settings.model}`);
    try {
      const { result } = await attempt(settings.provider, settings.model, settings.baseUrl, keys[settings.provider]);
      activeStreamRequests.delete(requestId);
      recordUsageSafely(settings.provider, result.usage);
      const finalText = processAgentReply(agentId, await processActions(result.text));
      send(`ai:chat-stream:done:${requestId}`, finalText);
    } catch (err) {
      activeStreamRequests.delete(requestId);
      if (err.cancelled) { log.info(`[ai:chat-stream] ${requestId} cancelled by user`); return; }

      const fallback = db.getSetting("aiFallback", null);
      if (fallback?.provider && !err.receivedAny) {
        log.warn(`[ai:chat-stream] ${settings.provider} failed (${err.message}), trying fallback ${fallback.provider}`);
        try {
          const { result } = await attempt(fallback.provider, fallback.model, undefined, keys[fallback.provider]);
          activeStreamRequests.delete(requestId);
          recordUsageSafely(fallback.provider, result.usage);
          const finalText = processAgentReply(agentId, await processActions(result.text));
          send(`ai:chat-stream:done:${requestId}`, finalText);
          return;
        } catch (fallbackErr) {
          activeStreamRequests.delete(requestId);
          log.error("[ai:chat-stream] fallback also failed:", fallbackErr.message);
          send(`ai:chat-stream:error:${requestId}`, fallbackErr.message || String(fallbackErr));
          return;
        }
      }
      log.error("[ai:chat-stream] failed:", err.message);
      send(`ai:chat-stream:error:${requestId}`, err.message || String(err));
    }
  });

  // Stop button — aborts the underlying HTTP request for an in-flight stream.
  ipcMain.on("ai:chat-stream-cancel", (_event, requestId) => {
    const req = activeStreamRequests.get(requestId);
    if (req) { req.destroy(new Error("Cancelled")); activeStreamRequests.delete(requestId); }
  });

  ipcMain.handle("ai:test-connection", async (_event, overrideSettings) => {
    const settings = { ...getGlobalAISettings(), ...(overrideSettings || {}) };
    const keys = readSecretStore();
    return aiRouter.testConnection({ provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] });
  });

  ipcMain.handle("ai:list-ollama-models", async (_event, baseUrl) => {
    try { return await aiRouter.listOllamaModels(baseUrl); } catch (err) { log.warn("[ai:list-ollama-models] failed:", err.message); return []; }
  });
  ipcMain.handle("ai:list-cloud-models", async (_event, provider) => aiRouter.listCloudModels(provider, readSecretStore()[provider]));
  ipcMain.handle("ai:known-free-models", () => aiRouter.KNOWN_FREE_MODELS);
  ipcMain.handle("ai:model-catalog", () => aiRouter.getModelCatalog());
  ipcMain.handle("ai:providers", () => aiRouter.PROVIDERS);
  ipcMain.handle("ai:usage-today", () => db.getUsageToday());

  // Settings
  ipcMain.handle("settings:get", (_event, key) => {
    if (key === "ai") return getGlobalAISettings();
    if (key === "agentModels" || key === "automationActions") return db.getSetting(key, key === "automationActions" ? [] : {});
    return db.getSetting(key);
  });
  ipcMain.handle("settings:set", (_event, key, value) => { db.setSetting(key, value); return true; });
  ipcMain.handle("settings:set-api-key", (_event, slot, value) => { writeSecret(slot, value); return true; });
  ipcMain.handle("settings:has-api-key", (_event, slot) => Boolean(readSecretStore()[slot]));

  // Conversations (agent omitted → Hampton's main chat only; pass an agent name to scope to that agent)
  ipcMain.handle("conversations:list", (_event, agent) => db.listConversations(agent === undefined ? null : agent));
  ipcMain.handle("conversations:create", (_event, title, agent) => db.createConversation(randomUUID(), title, agent || null));
  ipcMain.handle("conversations:messages", (_event, conversationId) => db.getMessages(conversationId));
  ipcMain.handle("conversations:add-message", (_event, conversationId, message) => { db.addMessage(conversationId, message); return true; });
  ipcMain.handle("conversations:delete", (_event, conversationId) => db.deleteConversation(conversationId));
  ipcMain.handle("conversations:truncate-from", (_event, conversationId, messageId) => { db.truncateFrom(conversationId, messageId); return true; });

  // n8n
  ipcMain.handle("n8n:list-workflows", async () => {
    const cfg = db.getSetting("n8n", {});
    return n8n.listWorkflows({ baseUrl: cfg.baseUrl, apiKey: readSecretStore().n8n });
  });
  ipcMain.handle("n8n:test-connection", async (_event, overrideCfg) => {
    const cfg = { ...db.getSetting("n8n", {}), ...(overrideCfg || {}) };
    return n8n.testConnection({ baseUrl: cfg.baseUrl, apiKey: readSecretStore().n8n });
  });
  ipcMain.handle("n8n:trigger-webhook", async (_event, { webhookUrl, payload, headerName, headerValue }) => {
    try { return { ok: true, result: await n8n.triggerWebhook({ webhookUrl, payload, headerName, headerValue }) }; }
    catch (err) { log.error("[n8n:trigger-webhook] failed:", err.message); return { ok: false, error: err.message || String(err) }; }
  });

  // App-level preferences
  ipcMain.handle("app:set-run-in-background", (_event, value) => { db.setSetting("runInBackground", value); return true; });

  // Text-to-speech
  ipcMain.handle("tts:list-voices", async (_event, engine) => {
    const secrets = readSecretStore();
    const engineCfg = db.getSetting("ttsEngineConfig", {})[engine] || {};
    try {
      return await ttsRouter.listVoices(engine, { apiKey: secrets[`tts-${engine}`], ...engineCfg });
    } catch (err) {
      log.warn(`[tts:list-voices] ${engine} failed:`, err.message);
      throw err;
    }
  });

  ipcMain.handle("tts:synthesize", async (_event, { engine, voiceId, text }) => {
    const secrets = readSecretStore();
    const engineCfg = db.getSetting("ttsEngineConfig", {})[engine] || {};
    try {
      const { buffer, mime } = await ttsRouter.synthesize(engine, { apiKey: secrets[`tts-${engine}`], ...engineCfg }, voiceId, text);
      try { db.recordTTSUsage(engine, text.length); } catch (e) { log.warn("recordTTSUsage failed:", e.message); }
      return { audioBase64: buffer.toString("base64"), mime };
    } catch (err) {
      log.warn(`[tts:synthesize] ${engine} failed:`, err.message);
      throw err;
    }
  });
  ipcMain.handle("tts:usage-today", () => db.getTTSUsageToday());

  ipcMain.handle("tts:engines", () => ttsRouter.ENGINES);
  ipcMain.handle("tts:set-engine-config", (_event, engine, cfg) => {
    const all = db.getSetting("ttsEngineConfig", {});
    all[engine] = { ...all[engine], ...cfg };
    db.setSetting("ttsEngineConfig", all);
    return true;
  });
  ipcMain.handle("tts:get-engine-config", (_event, engine) => db.getSetting("ttsEngineConfig", {})[engine] || {});

  // Manual "check for updates" button in Settings
  ipcMain.handle("app:check-for-updates", async (event) => {
    if (isDev) return { ok: false, error: "Updates are only checked in packaged builds." };
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.logger = log;
      const send = (status, extra = {}) => { if (!event.sender.isDestroyed()) event.sender.send("app:update-status", { status, ...extra }); };
      autoUpdater.once("update-available", (info) => send("available", { version: info.version }));
      autoUpdater.once("update-not-available", () => send("not-available"));
      autoUpdater.once("error", (err) => send("error", { message: err.message }));
      autoUpdater.once("download-progress", (p) => send("downloading", { percent: Math.round(p.percent) }));
      autoUpdater.once("update-downloaded", (info) => send("downloaded", { version: info.version }));
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (err) {
      log.warn("[app:check-for-updates] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("app:install-update", () => {
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.quitAndInstall();
      return true;
    } catch (err) {
      log.error("[app:install-update] failed:", err.message);
      return false;
    }
  });

  // Nutrition log
  ipcMain.handle("nutrition:get-daily", (_event, date) => db.getDailyNutrition(date));

  // Finance log
  ipcMain.handle("finance:get-daily", (_event, date) => db.getDailyFinance(date));

  // Health log
  ipcMain.handle("health:get-daily", (_event, date) => db.getDailyHealth(date));

  // Developer reviews
  ipcMain.handle("developer:get-reviews", (_event, date) => db.getDailyReviews(date));

  // Teacher progress
  ipcMain.handle("teacher:get-progress", (_event, date) => db.getDailyProgress(date));

  // WhatsApp connector
  ipcMain.handle("whatsapp:connect", async () => {
    try {
      await whatsapp.connect(app.getPath("userData"));
      return { ok: true };
    } catch (err) {
      log.error("[whatsapp:connect] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("whatsapp:disconnect", async () => { await whatsapp.disconnect(); return true; });
  ipcMain.handle("whatsapp:status", () => whatsapp.getStatus());
  ipcMain.handle("whatsapp:send-test", async (_event, { jid, text }) => {
    try { await whatsapp.sendMessage(jid, text); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  // Daily agent schedules (e.g. Personal Trainer's morning workout)
  ipcMain.handle("schedules:get", () => scheduler.getSchedules());
  ipcMain.handle("schedules:set", (_event, agentName, cfg) => { scheduler.setSchedule(agentName, cfg); return true; });
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
// Only the configured chat (default: your own "Message Yourself" chat) is
// ever acted on — Orun OS never responds to random incoming WhatsApp chats.

async function handleWhatsAppMessage({ jid, text, imageBase64, fromMe }) {
  const cfg = db.getSetting("whatsapp", {});
  if (!cfg.listenJid || jid !== cfg.listenJid) return;

  const agentId = imageBase64 ? "Nutritionist" : undefined;
  const userMessage = imageBase64
    ? { role: "user", content: text || "What is this meal? Estimate calories and macros.", image: { base64: imageBase64, mime: "image/jpeg" } }
    : { role: "user", content: text };
  if (!userMessage.content && !imageBase64) return;

  const settings = resolveAISettings(agentId);
  const keys = readSecretStore();
  const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
  try {
    const { context } = await aiRouter.buildContext({ messages: [userMessage], systemPrompt, provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] });
    const result = await aiRouter.routeChat({ provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider], messages: context });
    recordUsageSafely(settings.provider, result.usage);
    const finalText = processAgentReply(agentId, result.text);
    await whatsapp.sendMessage(jid, finalText);
  } catch (err) {
    log.error("[whatsapp] failed to handle message:", err.message);
    try { await whatsapp.sendMessage(jid, `Couldn't process that: ${err.message}`); } catch { /* ignore */ }
  }
}

/** Delivery used by the scheduler (e.g. Personal Trainer's morning workout) — WhatsApp if linked, always an OS notification too. */
async function deliverAgentMessage(agentName, text) {
  if (Notification.isSupported()) {
    new Notification({ title: `Orun OS — ${agentName}`, body: text.slice(0, 180) }).show();
  }
  const cfg = db.getSetting("whatsapp", {});
  if (cfg.listenJid && whatsapp.getStatus() === "connected") {
    try { await whatsapp.sendMessage(cfg.listenJid, `[${agentName}]\n${text}`); } catch (err) { log.warn("[deliver] WhatsApp send failed:", err.message); }
  }
}

app.whenReady().then(() => {
  log.info("Orun OS starting", { version: app.getVersion(), isDev });
  db.init(app.getPath("userData"));
  registerIpcHandlers();
  createWindow();
  createTray();
  setupAutoUpdate();

  whatsapp.setListeners({
    onStatus: (status, extra) => mainWindow?.webContents.send("whatsapp:status-update", { status, ...extra }),
    onQR: (dataUrl) => mainWindow?.webContents.send("whatsapp:qr", dataUrl),
    onMessage: (msg) => handleWhatsAppMessage(msg).catch((err) => log.error("[whatsapp] handler crashed:", err.message)),
  });

  scheduler.init({ db, aiRouter, agentPrompts, log, getSecret: (provider) => readSecretStore()[provider], deliver: deliverAgentMessage, processAgentReply });

  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (mainWindow?.isVisible()) { mainWindow.focus(); } else { mainWindow?.show(); mainWindow?.focus(); }
  });

  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("before-quit", () => { isQuitting = true; });
app.on("will-quit", () => { globalShortcut.unregisterAll(); });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !db.getSetting("runInBackground", false)) app.quit();
});

process.on("uncaughtException", (err) => log.error("Uncaught exception:", err));

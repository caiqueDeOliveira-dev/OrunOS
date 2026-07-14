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
const sttRouter = require("./stt-router.cjs");
const n8n = require("./n8n.cjs");
const db = require("./db.cjs");
const agentPrompts = require("./agent-prompts.cjs");
const whatsapp = require("./whatsapp.cjs");
const scheduler = require("./scheduler.cjs");
const videoEditor = require("./video-editor.cjs");
const image3d = require("./image-3d.cjs");
const socialMedia = require("./social-media.cjs");
const musicProducer = require("./music-producer.cjs");
const supabaseSync = require("./supabase.cjs");
const toolsModule = require("./tools.cjs");

const isDev = !app.isPackaged;
const KEYS_FILE = () => path.join(app.getPath("userData"), "keys.enc.json");
const DB_KEY_FILE = () => path.join(app.getPath("userData"), "db.key.enc");
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
    "When you store information in memory, it persists across sessions — use this for user preferences, context, and important facts." +
    "\n\nIMPORTANTE: Sempre responda em português do Brasil (pt-BR). Nunca use outro idioma.",
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

// ── Database encryption key ─────────────────────────────────────────────

function getOrCreateDBKey() {
  const keyPath = DB_KEY_FILE();
  try {
    const encrypted = fs.readFileSync(keyPath);
    const b64 = encrypted.toString();
    if (b64.startsWith(AES_PREFIX)) return aesDecrypt(b64);
    return safeStorage.decryptString(Buffer.from(b64, "base64"));
  } catch {
    const key = `orun-${randomUUID()}-${Date.now()}`;
    try {
      fs.writeFileSync(keyPath, safeStorage.encryptString(key).toString("base64"));
    } catch {
      try { fs.writeFileSync(keyPath, aesEncrypt(key)); } catch (e) { log.error("Failed to persist DB key:", e.message); }
    }
    return key;
  }
}

// ── Encrypted secret storage (AI provider keys + n8n API key) ───────────
//
// Two encryption backends:
//   1. Electron safeStorage (OS keyring) — preferred
//   2. AES-256-GCM derived from a machine-local key — fallback when
//      safeStorage is unavailable (e.g. CI, headless, or broken keyring)
//
// Stored format: JSON  { slot: "<base64>" }
// A "$v2$" prefix on a value signals the AES fallback so readSecretStore
// can decrypt it correctly regardless of which backend wrote it.

const crypto = require("crypto");
const AES_ALGO = "aes-256-gcm";
const AES_PREFIX = "$v2$";

function getMachineKey() {
  // Derive a 256-bit key from hostname + app name — not ultra-secure, but
  // far better than plaintext and consistent across runs on the same machine.
  const seed = `orun-os:${require("os").hostname()}:${app.getPath("userData")}`;
  return crypto.createHash("sha256").update(seed).digest();
}

function aesEncrypt(plaintext) {
  const key = getMachineKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return AES_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function aesDecrypt(encoded) {
  const raw = Buffer.from(encoded.slice(AES_PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const key = getMachineKey();
  const decipher = crypto.createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

function readSecretStore() {
  try {
    const raw = fs.readFileSync(KEYS_FILE());
    const parsed = JSON.parse(raw.toString());
    const out = {};
    let migrated = false;
    for (const [slot, encoded] of Object.entries(parsed)) {
      try {
        if (typeof encoded === "string" && encoded.startsWith(AES_PREFIX)) {
          out[slot] = aesDecrypt(encoded);
        } else {
          try {
            out[slot] = safeStorage.decryptString(Buffer.from(encoded, "base64"));
          } catch {
            // safeStorage failed — value may be from a previous install.
            // Try reading as AES (machine key) just in case.
            try {
              out[slot] = aesDecrypt(encoded);
            } catch {
              log.warn(`[readSecretStore] cannot decrypt slot "${slot}" — safeStorage and AES both failed`);
              continue;
            }
          }
        }
      } catch (err) {
        log.warn(`[readSecretStore] failed to decrypt slot "${slot}":`, err.message);
      }
    }
    // Re-encrypt any non-AES slots so future reads use AES (survives reinstalls)
    for (const [slot, encoded] of Object.entries(parsed)) {
      if (typeof encoded === "string" && !encoded.startsWith(AES_PREFIX) && out[slot]) {
        try {
          parsed[slot] = aesEncrypt(out[slot]);
          migrated = true;
        } catch { /* best effort */ }
      }
    }
    if (migrated) {
      try { fs.writeFileSync(KEYS_FILE(), JSON.stringify(parsed, null, 2)); } catch { /* best effort */ }
    }
    return out;
  } catch {
    return {};
  }
}

function writeSecret(slot, value) {
  try {
    const store = fs.existsSync(KEYS_FILE()) ? JSON.parse(fs.readFileSync(KEYS_FILE()).toString()) : {};
    // Prefer safeStorage; fall back to AES
    try {
      store[slot] = safeStorage.encryptString(value).toString("base64");
    } catch {
      store[slot] = aesEncrypt(value);
    }
    fs.writeFileSync(KEYS_FILE(), JSON.stringify(store, null, 2));
    return true;
  } catch (err) {
    log.error(`[writeSecret] failed for slot "${slot}":`, err.message);
    return false;
  }
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
  const id = randomUUID();
  db.recordMeal({ id, description: text.slice(0, 200), ...parsed, source: "app" });
  syncEnqueue("nutrition_log", { id, date: new Date().toISOString().slice(0, 10), description: text.slice(0, 200), ...parsed, source: "app", created_at: Date.now() });
  const { totals } = db.getDailyNutrition();
  return `${text}\n\n📊 Today so far: ${Math.round(totals.calories)} kcal (${Math.round(totals.protein_g)}g protein, ${Math.round(totals.carbs_g)}g carbs, ${Math.round(totals.fat_g)}g fat).`;
}

/** Finance replies with a JSON block — parse and log the transaction, showing daily summary. */
function maybeLogFinance(agentId, text) {
  if (agentId !== "Finance") return text;
  const parsed = agentPrompts.extractFinanceJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordExpense({ id, ...parsed, source: "app" });
  syncEnqueue("finance_log", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  const { totals, balance } = db.getDailyFinance();
  const emoji = parsed.type === "income" ? "💰" : "💸";
  return `${text}\n\n${emoji} Today: +$${totals.income.toFixed(2)} / -$${totals.expenses.toFixed(2)} (balance: $${balance.toFixed(2)}).`;
}

/** Health replies with a JSON block — parse and log the metric. */
function maybeLogHealth(agentId, text) {
  if (agentId !== "Health") return text;
  const parsed = agentPrompts.extractHealthJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordHealthMetric({ id, ...parsed, source: "app" });
  syncEnqueue("health_log", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  return `${text}\n\n❤️ Logged: ${parsed.metric} = ${parsed.value}${parsed.unit ? " " + parsed.unit : ""}.`;
}

/** Developer replies with a JSON block — parse and log the review. */
function maybeLogDeveloper(agentId, text) {
  if (agentId !== "Developer") return text;
  const parsed = agentPrompts.extractDeveloperJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordReview({ id, ...parsed, source: "app" });
  syncEnqueue("developer_reviews", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  const severityEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[parsed.severity] || "⚪";
  return `${text}\n\n🔍 Review logged: ${parsed.issues_found} issue(s) found ${severityEmoji} ${parsed.severity}.`;
}

/** Teacher replies with a JSON block — parse and log the progress. */
function maybeLogTeacher(agentId, text) {
  if (agentId !== "Teacher") return text;
  const parsed = agentPrompts.extractTeacherJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordProgress({ id, ...parsed, source: "app" });
  syncEnqueue("teacher_progress", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  const statusEmoji = { learning: "📖", reviewed: "✅", mastered: "🏆" }[parsed.status] || "📚";
  return `${text}\n\n${statusEmoji} Progress: ${parsed.subject} → ${parsed.topic} (${parsed.status}${parsed.score != null ? ", score: " + parsed.score : ""}).`;
}

/** Video Editor replies with a JSON block — parse and log the project. */
function maybeLogVideoEditor(agentId, text) {
  if (agentId !== "Video Editor") return text;
  const parsed = agentPrompts.extractVideoEditorJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordVideoProject({ id, ...parsed, source: "app" });
  syncEnqueue("video_projects", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  const statusEmoji = { draft: "📝", rendering: "🎬", completed: "✅", failed: "❌" }[parsed.status] || "📹";
  return `${text}\n\n${statusEmoji} Project logged: "${parsed.title}" (${parsed.template}, ${parsed.duration_sec}s).`;
}

/** 3D Designer replies with a JSON block — parse and log the generation. */
function maybeLogImage3D(agentId, text) {
  if (agentId !== "3D Designer") return text;
  const parsed = agentPrompts.extractImage3DJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordImage3DGeneration({ id, ...parsed, source: "app" });
  syncEnqueue("image3d_generations", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  return `${text}\n\n🎨 Generation logged via ${parsed.engine}: "${parsed.prompt.slice(0, 80)}".`;
}

/** Music Producer replies with a JSON block — parse and log the project. */
function maybeLogMusicProducer(agentId, text) {
  if (agentId !== "Music Producer") return text;
  const parsed = agentPrompts.extractMusicProducerJSON(text);
  if (!parsed) return text;
  const id = randomUUID();
  db.recordMusicProject({ id, ...parsed, source: "app" });
  syncEnqueue("music_projects", { id, date: new Date().toISOString().slice(0, 10), ...parsed, source: "app", created_at: Date.now() });
  const statusEmoji = { draft: "📝", processing: "🎵", completed: "✅", failed: "❌" }[parsed.status] || "🎶";
  return `${text}\n\n${statusEmoji} Music project logged: "${parsed.title}" (${parsed.engine}, ${parsed.duration_sec}s).`;
}

/** Unified post-processing — runs all agent-specific extractors. */
function processAgentReply(agentId, text) {
  let result = text;
  result = maybeLogNutrition(agentId, result);
  result = maybeLogFinance(agentId, result);
  result = maybeLogHealth(agentId, result);
  result = maybeLogDeveloper(agentId, result);
  result = maybeLogTeacher(agentId, result);
  result = maybeLogVideoEditor(agentId, result);
  result = maybeLogImage3D(agentId, result);
  result = maybeLogMusicProducer(agentId, result);
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

/** Enqueue a row for Supabase cloud sync (fire-and-forget). */
function syncEnqueue(tableName, row) {
  try { supabaseSync.enqueue(db.getDb(), tableName, row); } catch { /* ignore */ }
}

// ── Autonomous loop ─────────────────────────────────────────────────────
// Hampton calls tools in a loop: chat → tool_calls → execute → feed back → repeat.
// Max 10 iterations. The renderer is notified of each tool call/result via IPC.

const AUTONOMOUS_MAX_ITERATIONS = 10;

/**
 * @param {object} opts
 * @param {Array} opts.messages - conversation history [{role,content,image?}]
 * @param {string|null} opts.agentId
 * @param {Electron.WebContents} opts.sender
 * @param {string} opts.requestId
 * @param {{ cancelled: boolean }} opts.cancelledRef
 * @returns {Promise<string|null>} final text or null if cancelled
 */
async function autonomousLoop({ messages, agentId, sender, requestId, cancelledRef }) {
  const settings = resolveAISettings(agentId);
  const keys = readSecretStore();
  const apiKey = keys[settings.provider];
  const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);
  const send = (ch, p) => { if (!sender.isDestroyed()) sender.send(ch, p); };

  // Build initial context — system prompt + user/assistant history
  const context = [{ role: "system", content: systemPrompt }];
  for (const m of messages) {
    context.push({
      role: m.role === "hampton" ? "assistant" : "user",
      content: m.content,
      ...(m.image ? { image: m.image } : {}),
    });
  }

  let lastToolText = "";

  const fallbackProviders = ["groq", "openrouter", "github", "opencodezen"];
  const triedProviders = new Set([settings.provider]);
  let currentProvider = settings.provider;
  let currentModel = settings.model;
  let currentBaseUrl = settings.baseUrl;
  let currentApiKey = apiKey;

  // Auto-select: if the chosen provider has no API key, pick the first available
  if (!currentApiKey && currentProvider !== "ollama") {
    const fallbackProviders = ["groq", "openrouter", "github", "opencodezen"];
    for (const fp of fallbackProviders) {
      if (keys[fp]) {
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        log.info(`[autonomous] no key for ${currentProvider}, auto-selecting ${fp}/${fModels?.[0]}`);
        currentProvider = fp;
        currentModel = fModels?.[0] || currentModel;
        currentBaseUrl = undefined;
        currentApiKey = keys[fp];
        break;
      }
    }
  }

  for (let i = 0; i < AUTONOMOUS_MAX_ITERATIONS; i++) {
    if (cancelledRef.cancelled) return null;

    log.info(`[autonomous] iteration ${i + 1} provider=${currentProvider} model=${currentModel}`);

    let result;
    try {
      result = await Promise.race([
        aiRouter.chatWithTools({
          provider: currentProvider,
          model: currentModel,
          baseUrl: currentBaseUrl,
          apiKey: currentApiKey,
          messages: context,
          tools: toolsModule.TOOL_DEFINITIONS,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Autonomous iteration timed out")), 20000)),
      ]);
    } catch (err) {
      log.error(`[autonomous] chat failed on ${currentProvider}:`, err.message);
      // Try fallback on ANY error (rate limit, timeout, etc.)
      let switched = false;
      for (const fp of fallbackProviders) {
        if (triedProviders.has(fp)) continue;
        const fk = keys[fp];
        if (!fk) continue;
        const fModels = aiRouter.KNOWN_FREE_MODELS?.[fp];
        const fModel = fModels?.[0];
        if (!fModel) continue;
        log.info(`[autonomous] switching to ${fp}/${fModel} after error on ${currentProvider}`);
        currentProvider = fp;
        currentModel = fModel;
        currentBaseUrl = undefined;
        currentApiKey = fk;
        triedProviders.add(fp);
        switched = true;
        break;
      }
      if (switched) continue;
      throw err;
    }

    recordUsageSafely(currentProvider, result.usage);

    // No tool calls → return the final text response
    if (!result.toolCalls || result.toolCalls.length === 0) {
      return result.text || lastToolText || "";
    }

    // Store text from tool-calling iterations as fallback
    if (result.text && result.text.trim()) {
      lastToolText = result.text;
    }

    // Execute each tool call
    for (const tc of result.toolCalls) {
      if (cancelledRef.cancelled) return null;

      send(`ai:autonomous:tool-call:${requestId}`, { id: tc.id, name: tc.name, arguments: tc.arguments });
      log.info(`[autonomous] tool_call: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 200)})`);

      let toolResult;
      try {
        toolResult = await toolsModule.executeTool(tc.name, tc.arguments);
      } catch (err) {
        toolResult = { error: err.message };
      }

      send(`ai:autonomous:tool-result:${requestId}`, { id: tc.id, name: tc.name, result: toolResult });

      // Feed assistant + tool result back into context
      context.push({
        role: "assistant",
        content: result.text || null,
        tool_calls: [{ id: tc.id, type: "function", function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } }],
      });
      context.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return lastToolText || "I've reached the maximum number of autonomous steps. Here's what I accomplished so far.";
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

  // ── Autonomous agent (Hampton with tools) ────────────────────────────────
  // Runs the tool-call loop in the main process. Sends progress events back
  // to the renderer. Returns the final text when done.

  const activeAutonomousRequests = new Map(); // requestId → { cancelled: boolean }

  ipcMain.on("ai:autonomous", async (event, { requestId, messages, agentId }) => {
    const sender = event.sender;
    const cancelledRef = { cancelled: false };
    activeAutonomousRequests.set(requestId, cancelledRef);
    const send = (ch, p) => { if (!sender.isDestroyed()) sender.send(ch, p); };

    log.info(`[ai:autonomous] agent=${agentId || "hampton"} messages=${messages.length}`);
    try {
      const finalText = await autonomousLoop({ messages, agentId, sender, requestId, cancelledRef });
      activeAutonomousRequests.delete(requestId);
      if (finalText === null) return; // cancelled
      const processed = processAgentReply(agentId, await processActions(finalText));
      send(`ai:autonomous:done:${requestId}`, processed);
    } catch (err) {
      activeAutonomousRequests.delete(requestId);
      log.error("[ai:autonomous] failed:", err.message);
      send(`ai:autonomous:error:${requestId}`, err.message || String(err));
    }
  });

  ipcMain.on("ai:autonomous-cancel", (_event, requestId) => {
    const ref = activeAutonomousRequests.get(requestId);
    if (ref) { ref.cancelled = true; activeAutonomousRequests.delete(requestId); }
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
  ipcMain.handle("settings:set", (_event, key, value) => {
    db.setSetting(key, value);
    syncEnqueue("settings", { id: key, key, value: JSON.stringify(value), created_at: Date.now() });
    return true;
  });
  ipcMain.handle("settings:set-api-key", (_event, slot, value) => writeSecret(slot, value));
  ipcMain.handle("settings:has-api-key", (_event, slot) => Boolean(readSecretStore()[slot]));

  // Conversations (agent omitted → Hampton's main chat only; pass an agent name to scope to that agent)
  ipcMain.handle("conversations:list", (_event, agent) => db.listConversations(agent === undefined ? null : agent));
  ipcMain.handle("conversations:create", (_event, title, agent) => {
    const conv = db.createConversation(randomUUID(), title, agent || null);
    syncEnqueue("conversations", conv);
    return conv;
  });
  ipcMain.handle("conversations:messages", (_event, conversationId) => db.getMessages(conversationId));
  ipcMain.handle("conversations:add-message", (_event, conversationId, message) => {
    db.addMessage(conversationId, message);
    syncEnqueue("messages", { id: message.id, conversation_id: conversationId, role: message.role, content: message.content, created_at: Date.now() });
    return true;
  });
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

  // Social media publishing
  ipcMain.handle("social-media:get-config", () => socialMedia.getConfig(db));
  ipcMain.handle("social-media:set-config", (_event, cfg) => { socialMedia.setConfig(db, cfg); return true; });
  ipcMain.handle("social-media:publish", async (_event, opts) => {
    try {
      log.info(`[social-media] publishing to ${opts.platform}`);
      const result = await socialMedia.publish(opts, db);
      if (result.ok) log.info(`[social-media] ${opts.platform} published OK`);
      else log.warn(`[social-media] ${opts.platform} failed:`, result.error);
      return result;
    } catch (err) {
      log.error("[social-media:publish] failed:", err.message);
      return { ok: false, error: err.message || String(err) };
    }
  });
  ipcMain.handle("social-media:publish-multi", async (_event, opts) => {
    try {
      log.info(`[social-media] publishing to ${opts.platforms.join(", ")}`);
      const results = await socialMedia.publishMulti(opts, db);
      return results;
    } catch (err) {
      log.error("[social-media:publish-multi] failed:", err.message);
      return [{ ok: false, error: err.message || String(err) }];
    }
  });
  ipcMain.handle("social-media:test", async () => {
    try { return await socialMedia.testPlatforms(db); }
    catch (err) { log.error("[social-media:test] failed:", err.message); return {}; }
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

  // Speech-to-text
  ipcMain.handle("stt:engines", () => sttRouter.ENGINES);
  ipcMain.handle("stt:test-connection", async (_event, baseUrl) => sttRouter.testWhisperConnection(baseUrl));
  ipcMain.handle("stt:transcribe", async (_event, { baseUrl, audioBase64, mimeType, language }) => {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    return sttRouter.transcribeWhisper(baseUrl, audioBuffer, mimeType, language);
  });

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

  // Video Editor
  ipcMain.handle("videoeditor:get-projects", (_event, date) => db.getDailyVideoProjects(date));
  ipcMain.handle("videoeditor:list-templates", () => videoEditor.listTemplates());
  ipcMain.handle("videoeditor:create-composition", (_event, opts) => videoEditor.createComposition(opts));
  ipcMain.handle("videoeditor:render-video", async (_event, opts) => {
    try {
      const result = await videoEditor.renderVideo(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[videoeditor:render-video] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // 3D Designer (Image / 3D)
  ipcMain.handle("image3d:get-generations", (_event, date) => db.getDailyImage3DGenerations(date));
  ipcMain.handle("image3d:fal-models", () => image3d.FAL_MODELS);
  ipcMain.handle("image3d:tripo-models", () => image3d.TRIPO_MODELS);
  ipcMain.handle("image3d:generate-image", async (_event, opts) => {
    const keys = readSecretStore();
    try {
      const result = await image3d.generateImage(opts, keys.fal);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:generate-image] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("image3d:generate-3d", async (_event, opts) => {
    const keys = readSecretStore();
    try {
      const result = await image3d.generate3DModel(opts, keys.tripo);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:generate-3d] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("image3d:comfyui-test", async (_event, baseUrl) => image3d.testComfyUIConnection(baseUrl));
  ipcMain.handle("image3d:comfyui-submit", async (_event, opts) => {
    try {
      const result = await image3d.submitComfyUIWorkflow(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:comfyui-submit] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("image3d:comfyui-results", async (_event, promptId, baseUrl) => {
    try {
      const result = await image3d.getComfyUIResults(promptId, baseUrl);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[image3d:comfyui-results] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // Music Producer
  ipcMain.handle("musicproducer:get-projects", (_event, date) => db.getDailyMusicProjects(date));
  ipcMain.handle("musicproducer:wondera-models", () => musicProducer.listWonderaModels());
  ipcMain.handle("musicproducer:autotone-presets", () => musicProducer.listAutotonePresets());
  ipcMain.handle("musicproducer:generate-music", async (_event, opts) => {
    const keys = readSecretStore();
    try {
      const result = await musicProducer.generateMusic(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:generate-music] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:master", async (_event, opts) => {
    const keys = readSecretStore();
    try {
      const result = await musicProducer.masterTrack(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:master] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:separate-stems", async (_event, opts) => {
    const keys = readSecretStore();
    try {
      const result = await musicProducer.separateStems(opts, keys.wondera);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:separate-stems] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:autotone", async (_event, opts) => {
    try {
      const result = await musicProducer.applyAutotone(opts);
      return { ok: true, audioBase64: result.toString("base64") };
    } catch (err) {
      log.error("[musicproducer:autotone] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle("musicproducer:mix", async (_event, opts) => {
    try {
      const result = await musicProducer.mixTracks(opts);
      return { ok: true, ...result };
    } catch (err) {
      log.error("[musicproducer:mix] failed:", err.message);
      return { ok: false, error: err.message };
    }
  });

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
  ipcMain.handle("whatsapp:get-agent-jids", () => {
    const cfg = db.getSetting("whatsapp", {});
    return cfg.agentJids || {};
  });
  ipcMain.handle("whatsapp:set-agent-jids", (_event, agentJids) => {
    const cfg = db.getSetting("whatsapp", {});
    db.setSetting("whatsapp", { ...cfg, agentJids });
    return true;
  });
  ipcMain.handle("whatsapp:list-groups", () => {
    try { return whatsapp.listGroups(); } catch { return []; }
  });

  ipcMain.handle("whatsapp:test-group", async (_event, jid, agentName) => {
    try {
      await whatsapp.sendTestMessage(jid, agentName);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Daily agent schedules (e.g. Personal Trainer's morning workout)
  ipcMain.handle("schedules:get", () => scheduler.getSchedules());
  ipcMain.handle("schedules:set", (_event, agentName, cfg) => { scheduler.setSchedule(agentName, cfg); return true; });

  // Health goals & weight tracking
  ipcMain.handle("health:get-goals", () => db.getHealthGoals());
  ipcMain.handle("health:set-goals", (_event, goals) => { db.saveHealthGoals(goals); return true; });
  ipcMain.handle("health:weekly-weight", () => db.getWeeklyWeightComparison());
  ipcMain.handle("health:log-weight", (_event, weightKg) => {
    const id = randomUUID();
    db.recordHealthMetric({ id, metric: "peso", value: weightKg, unit: "kg", source: "app" });
    syncEnqueue("health_log", { id, date: new Date().toISOString().slice(0, 10), metric: "peso", value: weightKg, unit: "kg", source: "app", created_at: Date.now() });
    return true;
  });

  // Daily agenda
  ipcMain.handle("agenda:get", (_event, date) => db.getDailyAgenda(date));
  ipcMain.handle("agenda:add", (_event, entry) => { db.saveDailyAgenda(entry); return true; });
  ipcMain.handle("agenda:clear", (_event, date) => { db.clearDailyAgenda(date); return true; });

  // Nutrition file for today
  ipcMain.handle("nutrition:get-today-file", () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = path.join(app.getPath("userData"), "nutrition", `${date}.md`);
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    } catch { return null; }
  });

  // PostgreSQL cloud sync
  ipcMain.handle("sync:status", () => ({ connected: supabaseSync.isConnected() }));
  ipcMain.handle("sync:trigger", async () => {
    if (!supabaseSync.isConnected()) return { ok: false, error: "PostgreSQL not configured" };
    return supabaseSync.sync(db.getDb());
  });
  ipcMain.handle("sync:test", async () => {
    if (!supabaseSync.isConnected()) return { ok: false, error: "PostgreSQL not configured" };
    return supabaseSync.testConnection();
  });
  ipcMain.handle("sync:configure", async (_event, { databaseUrl }) => {
    try {
      // Write DATABASE_URL to .env
      const envPath = path.join(__dirname, "..", ".env");
      const directUrl = databaseUrl.replace(":6543/", ":5432/");
      const envContent = [
        "# Orun OS — PostgreSQL Connection",
        `DATABASE_URL="${databaseUrl}"`,
        `DIRECT_URL="${directUrl}"`,
        "# Sync interval in milliseconds (default: 5 minutes)",
        "SYNC_INTERVAL_MS=300000",
        "",
      ].join("\n");
      fs.writeFileSync(envPath, envContent);
      // Re-init from .env
      const ok = supabaseSync.init();
      if (!ok) return { ok: false, error: "Failed to init PostgreSQL from .env" };
      const test = await supabaseSync.testConnection();
      if (!test.ok) return { ok: false, error: test.error };
      const pull = await supabaseSync.pull(db.getDb());
      log.info(`[sync] configured, initial pull: ${pull.pulled} rows`);
      return { ok: true, pulled: pull.pulled };
    } catch (err) {
      return { ok: false, error: err.message };
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
// Routes messages to the correct agent based on which group/chat they came from.
// Config stored in: whatsapp.agentJids = { "Nutritionist": "group1@g.us", "Personal Trainer": "group1@g.us", "Personal Assistant": "group2@g.us" }

/** Find which agent is assigned to a given JID. */
function agentForJid(jid) {
  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};
  for (const [agent, agentJid] of Object.entries(agentJids)) {
    if (agentJid && jid === agentJid) return agent;
  }
  return null;
}

async function handleWhatsAppMessage({ jid, text, imageBase64, fromMe }) {
  const cfg = db.getSetting("whatsapp", {});
  const agentJids = cfg.agentJids || {};

  // Check if this JID belongs to any configured agent group
  const agentId = (() => {
    // First check per-agent JIDs
    const matched = agentForJid(jid);
    if (matched) {
      // If it's a photo, always route to Nutritionist regardless of group
      if (imageBase64) return "Nutritionist";
      // If it's text in the health group, route to Personal Trainer
      if (matched === "Personal Trainer") return "Personal Trainer";
      // If it's text in the agenda group, route to Personal Assistant
      if (matched === "Personal Assistant") return "Personal Assistant";
      // If it's text in the health group (Nutritionist assigned), route to Nutritionist
      if (matched === "Nutritionist") return "Nutritionist";
      return matched;
    }
    // Fallback: check legacy listenJid
    if (cfg.listenJid && jid === cfg.listenJid) return imageBase64 ? "Nutritionist" : undefined;
    return null;
  })();

  if (!agentId) return; // Not a monitored chat

  const userMessage = imageBase64
    ? { role: "user", content: text || "Analise essa foto de comida. Identifique o prato, estime calorias e macronutrientes. Responda em português do Brasil.", image: { base64: imageBase64, mime: "image/jpeg" } }
    : { role: "user", content: text };
  if (!userMessage.content && !imageBase64) return;

  log.info(`[whatsapp] message from ${jid} → agent=${agentId}`);

  const settings = resolveAISettings(agentId);
  const keys = readSecretStore();
  const systemPrompt = buildSystemPrompt(settings.systemPrompt, agentId);

  // Cross-provider fallback chain
  const fallbackChain = [
    { provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, apiKey: keys[settings.provider] },
    ...["groq", "openrouter", "github", "opencodezen"]
      .filter((p) => p !== settings.provider && keys[p])
      .map((p) => ({ provider: p, model: aiRouter.KNOWN_FREE_MODELS?.[p]?.[0], baseUrl: undefined, apiKey: keys[p] })),
  ];

  let lastErr;
  for (const attempt of fallbackChain) {
    if (!attempt.apiKey) continue;
    try {
      log.info(`[whatsapp] trying ${attempt.provider}/${attempt.model}`);
      const { context } = await aiRouter.buildContext({ messages: [userMessage], systemPrompt, provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey });
      const result = await aiRouter.routeChat({ provider: attempt.provider, model: attempt.model, baseUrl: attempt.baseUrl, apiKey: attempt.apiKey, messages: context });
      recordUsageSafely(attempt.provider, result.usage);
      const finalText = processAgentReply(agentId, result.text);

      if (imageBase64) saveNutritionToFile(finalText);

      await whatsapp.sendMessage(jid, finalText);
      return;
    } catch (err) {
      lastErr = err;
      log.warn(`[whatsapp] ${attempt.provider} failed: ${err.message}`);
    }
  }
  log.error("[whatsapp] all providers failed:", lastErr?.message);
  try { await whatsapp.sendMessage(jid, `Erro ao processar: ${lastErr?.message}`); } catch { /* ignore */ }
}

/** Save nutrition analysis to a daily markdown file in user data */
function saveNutritionToFile(text) {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(app.getPath("userData"), "nutrition");
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${date}.md`);
    const header = fs.existsSync(filePath) ? "" : `# Cardápio ${date}\n\n`;
    fs.appendFileSync(filePath, `${header}${text}\n\n---\n\n`);
    log.info(`[nutrition] saved to ${filePath}`);
  } catch (err) {
    log.warn("[nutrition] failed to save file:", err.message);
  }
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

app.whenReady().then(() => {
  log.info("Orun OS starting", { version: app.getVersion(), isDev });
  try {
    db.init(app.getPath("userData"), getOrCreateDBKey());
  } catch (err) {
    log.error("Database init failed, retrying with fresh database:", err.message);
    try {
      const userDataPath = app.getPath("userData");
      const dbPath = path.join(userDataPath, "orun-os.sqlite3");
      for (const ext of ["", "-wal", "-shm"]) {
        try { fs.unlinkSync(dbPath + ext); } catch { /* ignore */ }
      }
      db.init(userDataPath, getOrCreateDBKey());
    } catch (retryErr) {
      log.error("Database init failed permanently:", retryErr.message);
    }
  }
  registerIpcHandlers();
  toolsModule.init(app.getPath("userData"), { db, socialMedia });
  createWindow();
  createTray();
  setupAutoUpdate();

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
  setInterval(() => {
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

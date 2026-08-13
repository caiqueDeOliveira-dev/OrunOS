// electron/group-watcher.cjs
// Vigia de grupos (WhatsApp + Telegram): feed ao vivo persistido, watchlist com
// deteccao hibrida (palavra-chave + IA via Personal Assistant) e alerta ao dono
// (WhatsApp ou Telegram), mais robô de promocoes usando web search (Firecrawl).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const firecrawl = require("./firecrawl.cjs");

const HISTORY_LIMIT = 500;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const AI_RATE_LIMIT_MS = 20 * 1000;

function defaultSettings() {
  return {
    watchlist: [],
    watchedGroups: [],
    feedGroups: [],
    aiFilter: true,
    alertProvider: "whatsapp",
    alertTarget: "",
    deals: { enabled: false, intervalHours: 6, lastRun: null, status: "idle" },
  };
}

function createGroupWatcher({ db, log, aiRouter, secretStore, resolveAISettings, whatsapp, telegram, userDataPath }) {
  const logg = log || console;
  let historyFile = path.join(userDataPath || ".", "group-watcher-history.json");
  let history = [];
  let settings = defaultSettings();
  let knownTelegramChats = {};
  let alertedKeys = new Set();
  let lastAiCheck = {};
  let cooldown = {};
  let dealsTimer = null;
  let opts = {};

  function uuid() {
    return crypto.randomUUID();
  }

  function normalizeProvider(groups, provider) {
    return groups.map((g) => ({ provider, ...g }));
  }

  function getGroups() {
    const waGroups = [];
    if (whatsapp && typeof whatsapp.listGroups === "function") {
      try {
        const list = whatsapp.listGroups();
        if (Array.isArray(list)) waGroups.push(...list);
      } catch (err) {
        logg.warn("[group-watcher] whatsapp.listGroups failed:", err.message);
      }
    }
    const tgGroups = Object.values(knownTelegramChats).map((c) => ({ chatId: c.chatId, name: c.name }));
    const merged = [
      ...normalizeProvider(waGroups, "whatsapp").map((g) => ({ id: `wa:${g.jid || g.id}`, channelId: g.jid || g.id, provider: "whatsapp", name: g.name || (g.jid || "").split("@")[0] })),
      ...tgGroups.map((c) => ({ id: `tg:${c.chatId}`, channelId: c.chatId, provider: "telegram", name: c.name })),
    ];
    for (const key of settings.watchedGroups) {
      if (!merged.some((g) => g.id === key)) {
        merged.push({ id: key, channelId: key.replace(/^(wa|tg):/, ""), provider: key.startsWith("tg:") ? "telegram" : "whatsapp", name: key, known: false });
      }
    }
    return merged;
  }

  function load() {
    try {
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, "utf8"));
        if (Array.isArray(data.history)) history = data.history;
        if (data.knownTelegramChats) knownTelegramChats = data.knownTelegramChats;
      }
    } catch (err) {
      logg.warn("[group-watcher] load failed:", err.message);
    }
  }

  function persist() {
    try {
      fs.writeFileSync(historyFile, JSON.stringify({ history, knownTelegramChats }));
    } catch (err) {
      logg.warn("[group-watcher] persist failed:", err.message);
    }
  }

  function getSettings() {
    const saved = db.getSetting("groupWatcher", {});
    return { ...defaultSettings(), ...saved, deals: { ...defaultSettings().deals, ...(saved.deals || {}) } };
  }

  function refreshSettings() {
    settings = getSettings();
    return settings;
  }

  function updateSettings(patch) {
    const next = { ...settings, ...patch, deals: { ...settings.deals, ...(patch.deals || {}) } };
    db.setSetting("groupWatcher", next);
    settings = next;
    return next;
  }

  function setDealsSchedule() {
    if (dealsTimer) {
      clearInterval(dealsTimer);
      dealsTimer = null;
    }
    if (settings.deals.enabled && settings.deals.intervalHours > 0) {
      dealsTimer = setInterval(() => {
        runDealsScan().catch((err) => logg.warn("[group-watcher] deals scan failed:", err.message));
      }, Math.max(1, settings.deals.intervalHours) * 60 * 60 * 1000);
      dealsTimer.unref?.();
      logg.info(`[group-watcher] robô de promoções ativo a cada ${settings.deals.intervalHours}h`);
    }
  }

  function mediaTypeOf(msg) {
    if (msg.imageBase64) return "image";
    if (msg.audioBase64) return "audio";
    return "text";
  }

  function normalizeMessage(raw) {
    if (raw.provider === "telegram") {
      if (raw.chatType && raw.chatType !== "group" && raw.chatType !== "supergroup") return null;
      const chatId = raw.chatId;
      knownTelegramChats[chatId] = { chatId, name: raw.chatTitle || `TG ${chatId}` };
      return {
        id: uuid(),
        provider: "telegram",
        channelId: chatId,
        channelName: raw.chatTitle || `TG ${chatId}`,
        senderName: raw.from?.firstName || raw.from?.username || "Telegram",
        text: raw.text || "",
        mediaType: raw.imageFileId ? "image" : "text",
        ts: Date.now(),
        fromMe: false,
        externalId: `tg:${chatId}:${raw.messageId ?? raw.ts ?? Date.now()}`,
      };
    }
    const jid = raw.jid;
    if (!jid) return null;
    const isGroup = String(jid).endsWith("@g.us");
    if (!isGroup) return null;
    const channelName = raw.groupName || String(jid).split("@")[0];
    return {
      id: uuid(),
      provider: "whatsapp",
      channelId: jid,
      channelName,
      senderName: raw.senderName || (raw.fromMe ? "Eu" : "Contato"),
      text: raw.text || "",
      mediaType: mediaTypeOf(raw),
      ts: raw.timestamp || Date.now(),
      fromMe: Boolean(raw.fromMe),
      externalId: `wa:${jid}:${raw.externalMessageId || raw.timestamp || Date.now()}`,
    };
  }

  function recordMessage(normalized) {
    history.unshift(normalized);
    if (history.length > HISTORY_LIMIT) history = history.slice(0, HISTORY_LIMIT);
    persist();
  }

  function channelKey(provider, channelId) {
    return (provider === "telegram" ? "tg:" : "wa:") + channelId;
  }

  function isWatchedChannel(channelId, provider) {
    return settings.watchedGroups.includes(channelKey(provider, channelId));
  }

  function channelInFeed(normalized) {
    if (!settings.feedGroups || settings.feedGroups.length === 0) return true;
    return settings.feedGroups.includes(channelKey(normalized.provider, normalized.channelId));
  }

  function keywordMatch(term, text) {
    return text.toLowerCase().includes(term.toLowerCase());
  }

  async function aiRelevant(term, msg) {
    let aiSettings;
    try {
      aiSettings = resolveAISettings ? resolveAISettings("Personal Assistant") : null;
    } catch { aiSettings = null; }
    if (!aiSettings) return true;
    const keys = secretStore.readSecretStore();
    const apiKey = keys[aiSettings.provider];
    if (!apiKey || !aiRouter || typeof aiRouter.routeChat !== "function") return true;

    const now = Date.now();
    const last = lastAiCheck[term.id] || 0;
    if (now - last < AI_RATE_LIMIT_MS) return true;
    lastAiCheck[term.id] = now;

    const systemPrompt =
      "Voce e um filtro de relevancia. O usuario quer ser avisado quando aparecer conteudo relacionado a \"" + term.term + "\" " +
      "em grupos (ex: promocoes, ofertas, disponibilidade, novidades sobre o item). " +
      "Responda APENAS com SIM ou NAO se a mensagem e relevante para \"" + term.term + "\".";
    const userPrompt = `Grupo: ${msg.channelName}\nMensagem: ${(msg.text || "").slice(0, 1500)}`;

    try {
      const result = await aiRouter.routeChat({
        provider: aiSettings.provider,
        model: aiSettings.model,
        baseUrl: aiSettings.baseUrl,
        apiKey,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const answer = String(result?.text || result || "").trim().toUpperCase();
      return answer.startsWith("SIM");
    } catch (err) {
      logg.warn("[group-watcher] AI relevance check failed:", err.message);
      return true;
    }
  }

  async function checkWatchlist(normalized) {
    if (normalized.fromMe) return;
    const text = (normalized.text || "").trim();
    if (!text) return;

    for (const item of settings.watchlist) {
      if (!item.enabled) continue;
      if (!isWatchedChannel(normalized.channelId, normalized.provider)) continue;
      if (!keywordMatch(item.term, text)) continue;

      const key = `${item.id}:${normalized.externalId}`;
      if (alertedKeys.has(key)) continue;

      const cooldownKey = `${item.id}:${normalized.provider}:${normalized.channelId}`;
      const lastAlert = cooldown[cooldownKey] || 0;
      if (Date.now() - lastAlert < ALERT_COOLDOWN_MS) continue;

      let relevant = true;
      if (settings.aiFilter) relevant = await aiRelevant(item, normalized);
      if (!relevant) continue;

      cooldown[cooldownKey] = Date.now();
      alertedKeys.add(key);
      if (alertedKeys.size > 2000) alertedKeys.clear();

      await sendAlert(buildAlertText(item, normalized), { source: "watch", termId: item.id });
    }
  }

  function buildAlertText(item, msg) {
    const lines = [
      `👀 Vigia · ${item.term}`,
      `📌 ${msg.channelName} (${msg.provider === "whatsapp" ? "WhatsApp" : "Telegram"})`,
      `👤 ${msg.senderName}`,
      ``,
      msg.text.slice(0, 900),
    ];
    return lines.join("\n");
  }

  async function resolveAlertTarget() {
    const keys = secretStore.readSecretStore();
    if (settings.alertProvider === "telegram") {
      if (settings.alertTarget) return { kind: "telegram", target: settings.alertTarget };
      return null;
    }
    if (settings.alertTarget) return { kind: "whatsapp", target: settings.alertTarget };
    const cfg = db.getSetting("whatsapp", {});
    if (cfg.listenJid) return { kind: "whatsapp", target: cfg.listenJid };
    return null;
  }

  async function sendAlert(text, meta = {}) {
    const dest = await resolveAlertTarget();
    if (!dest) {
      logg.warn("[group-watcher] sem destino de alerta configurado");
      return false;
    }
    try {
      if (dest.kind === "telegram") {
        await telegram.sendMessage(dest.target, text);
      } else {
        await whatsapp.sendMessage(dest.target, text);
      }
      logg.info(`[group-watcher] alerta enviado (${dest.kind})`);
      return true;
    } catch (err) {
      logg.warn("[group-watcher] alerta falhou:", err.message);
      return false;
    }
  }

  async function onMessage(raw) {
    const normalized = normalizeMessage(raw);
    if (!normalized) return;
    refreshSettings();
    recordMessage(normalized);
    if (opts && typeof opts.onPush === "function") {
      try { opts.onPush(normalized); } catch { /* ignore */ }
    }
    if (settings.watchlist && settings.watchlist.some((w) => w.enabled)) {
      await checkWatchlist(normalized);
    }
  }

  function addWatchlistTerm(term) {
    const trimmed = String(term || "").trim();
    if (!trimmed) return null;
    const item = { id: uuid(), term: trimmed, enabled: true, createdAt: Date.now() };
    updateSettings({ watchlist: [...settings.watchlist, item] });
    return item;
  }

  function removeWatchlistTerm(id) {
    updateSettings({ watchlist: settings.watchlist.filter((w) => w.id !== id) });
  }

  function toggleWatchlistTerm(id, enabled) {
    updateSettings({ watchlist: settings.watchlist.map((w) => (w.id === id ? { ...w, enabled } : w)) });
  }

  function clearHistory() {
    history = [];
    persist();
  }

  function formatDeals(all) {
    const blocks = all.map((entry) => {
      const items = (entry.results || []).slice(0, 3)
        .map((r) => `- ${r.title}\n  ${r.url}`)
        .join("\n");
      return `🔎 *${entry.term}*\n${items || "nada encontrado"}`;
    });
    return blocks.join("\n\n");
  }

  async function runDealsScan() {
    const keys = secretStore.readSecretStore();
    if (!firecrawl.hasKey(keys)) {
      updateSettings({ deals: { ...settings.deals, status: "no-key", lastRun: Date.now() } });
      return { ok: false, error: "firecrawl-key" };
    }
    const enabled = settings.watchlist.filter((w) => w.enabled);
    if (!enabled.length) {
      updateSettings({ deals: { ...settings.deals, status: "no-watchlist", lastRun: Date.now() } });
      return { ok: false, error: "no-watchlist" };
    }

    const all = [];
    for (const w of enabled) {
      try {
        const res = await firecrawl.search(`${w.term} promoção`, { limit: 5, country: "br", langs: ["pt"] }, keys.firecrawl);
        if (res.results) all.push({ term: w.term, results: res.results });
      } catch (err) {
        logg.warn(`[group-watcher] busca por "${w.term}" falhou:`, err.message);
      }
    }

    const now = Date.now();
    updateSettings({ deals: { ...settings.deals, lastRun: now, status: all.length ? "ok" : "empty" } });

    if (all.length) {
      const summary = formatDeals(all);
      await sendAlert(`🛒 Robô de promoções\n\n${summary}`, { source: "deals" });
      if (opts && typeof opts.onDeals === "function") {
        try { opts.onDeals({ ok: true, at: now, deals: all }); } catch { /* ignore */ }
      }
    }
    return { ok: true, deals: all };
  }

  function getState() {
    return {
      history: history.slice(0, 300),
      groups: getGroups(),
      settings: getSettings(),
      groupsCount: getGroups().length,
    };
  }

  function start(userDataDir) {
    if (userDataDir) historyFile = path.join(userDataDir, "group-watcher-history.json");
    load();
    refreshSettings();
    setDealsSchedule();
    logg.info("[group-watcher] vigia de grupos iniciado");
  }

  function stop() {
    if (dealsTimer) {
      clearInterval(dealsTimer);
      dealsTimer = null;
    }
    persist();
  }

  function setCallbacks(cb) {
    opts = cb || {};
  }

  return {
    start, stop, setCallbacks,
    onMessage,
    getState, getGroups, getSettings, updateSettings, setDealsSchedule,
    addWatchlistTerm, removeWatchlistTerm, toggleWatchlistTerm,
    clearHistory, runDealsScan, sendAlert,
  };
}

module.exports = { createGroupWatcher, defaultSettings };

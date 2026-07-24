// electron/whatsapp-automation.cjs
//
// WhatsApp automation engine for Orun OS.
// Handles: auto-reply, keyword triggers, summaries, broadcasts, N8N webhooks, auto-schedule.
// Includes anti-ban protections: rate limiting, randomized delays, daily caps.

const fs = require("fs");
const path = require("path");
const logger = require("./logger.cjs");

// ── Anti-ban protections ───────────────────────────────────────────────────
const DAILY_MSG_LIMIT = 45; // stay under 50 to be safe
const MIN_DELAY_MS = 2000;  // minimum delay between messages
const MAX_DELAY_MS = 5000;  // maximum delay between messages
const TYPING_DELAY_MS = 1500; // simulate typing before reply

let dailyMsgCount = 0;
let dailyMsgDate = new Date().toISOString().slice(0, 10);
let messageQueue = [];
let processingQueue = false;

function resetDailyCount() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyMsgDate) {
    dailyMsgCount = 0;
    dailyMsgDate = today;
  }
}

function canSendMessage() {
  resetDailyCount();
  return dailyMsgCount < DAILY_MSG_LIMIT;
}

function randomDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processQueue(sendFn) {
  if (processingQueue) return;
  processingQueue = true;
  while (messageQueue.length > 0) {
    if (!canSendMessage()) {
      logger.wa.info("[wa-automation] daily limit reached, pausing queue");
      break;
    }
    const { jid, text, resolve, reject } = messageQueue.shift();
    try {
      await sleep(randomDelay());
      await sendFn(jid, text);
      dailyMsgCount++;
      resolve();
    } catch (err) {
      reject(err);
    }
  }
  processingQueue = false;
}

function queueMessage(jid, text, sendFn) {
  return new Promise((resolve, reject) => {
    messageQueue.push({ jid, text, resolve, reject });
    processQueue(sendFn);
  });
}

function getStats() {
  resetDailyCount();
  return {
    dailyMsgCount,
    dailyMsgLimit: DAILY_MSG_LIMIT,
    queueLength: messageQueue.length,
    date: dailyMsgDate,
  };
}

// ── Keyword Monitoring ─────────────────────────────────────────────────────
// Triggers actions when specific keywords appear in messages.

const KEYWORD_RULES_FILE = "whatsapp-keyword-rules.json";
let keywordRules = []; // [{ keywords: ["urgente","reunião"], agent: "Marketing", action: "notify"|"task"|"summary", enabled: true }]

function loadKeywordRules(userDataPath) {
  try {
    const file = path.join(userDataPath, KEYWORD_RULES_FILE);
    if (fs.existsSync(file)) keywordRules = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { /* ignore */ }
}

function saveKeywordRules(userDataPath) {
  try {
    fs.writeFileSync(path.join(userDataPath, KEYWORD_RULES_FILE), JSON.stringify(keywordRules, null, 2));
  } catch { /* ignore */ }
}

function addKeywordRule(userDataPath, rule) {
  keywordRules.push({ ...rule, id: Date.now().toString(36), enabled: true });
  saveKeywordRules(userDataPath);
}

function removeKeywordRule(userDataPath, ruleId) {
  keywordRules = keywordRules.filter((r) => r.id !== ruleId);
  saveKeywordRules(userDataPath);
}

function toggleKeywordRule(userDataPath, ruleId) {
  const rule = keywordRules.find((r) => r.id === ruleId);
  if (rule) { rule.enabled = !rule.enabled; saveKeywordRules(userDataPath); }
}

function checkKeywords(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const rule of keywordRules) {
    if (!rule.enabled) continue;
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push(rule);
    }
  }
  return matched;
}

// ── Date Extraction for Auto-Schedule ──────────────────────────────────────

const DATE_PATTERNS = [
  // "amanhã às 14h", "amanhã as 14:30"
  { regex: /amanh[ãa]\s+(?:(?:as|às)\s+)?(\d{1,2})[h:](\d{2})?/iu, relative: 1 },
  // "hoje às 15h"
  { regex: /hoje\s+(?:(?:as|às)\s+)?(\d{1,2})[h:](\d{2})?/iu, relative: 0 },
  // "segunda às 10h", "terça as 14h30"
  { regex: /(segunda|ter[ça]a|quarta|quinta|sexta|s[aá]bado|domingo)\s+(?:(?:as|às)\s+)?(\d{1,2})[h:](\d{2})?/iu, relative: null },
  // "dia 20 às 16h"
  { regex: /dia\s+(\d{1,2})\s+(?:(?:as|às)\s+)?(\d{1,2})[h:](\d{2})?/iu, relative: null },
  // "próxima segunda às 14h"
  { regex: /pr[oó]xim[ao]\s+(segunda|ter[ça]a|quarta|quinta|sexta|s[aá]bado|domingo)\s+(?:(?:as|às)\s+)?(\d{1,2})[h:](\d{2})?/iu, relative: null },
];

const DAY_MAP = { segunda: 1, terça: 2, terca: 2, quarta: 3, quinta: 4, sexta: 5, sábado: 6, sabado: 6, domingo: 0 };

function extractDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  for (const pattern of DATE_PATTERNS) {
    const match = lower.match(pattern.regex);
    if (!match) continue;

    let targetDate = new Date(now);
    const hour = parseInt(match[pattern.relative !== null ? 1 : 2]);
    const minute = parseInt(match[pattern.relative !== null ? 2 : 3]) || 0;

    if (pattern.relative !== null) {
      targetDate.setDate(targetDate.getDate() + pattern.relative);
    } else if (pattern.regex.source.includes("segunda|ter")) {
      const dayName = match[1].toLowerCase();
      const targetDay = DAY_MAP[dayName];
      if (targetDay !== undefined) {
        const currentDay = targetDate.getDay();
        let daysAhead = targetDay - currentDay;
        if (daysAhead <= 0) daysAhead += 7;
        targetDate.setDate(targetDate.getDate() + daysAhead);
      }
    } else if (pattern.regex.source.includes("dia\\s")) {
      const day = parseInt(match[1]);
      targetDate.setDate(day);
      if (targetDate < now) targetDate.setMonth(targetDate.getMonth() + 1);
    }

    targetDate.setHours(hour, minute, 0, 0);
    if (targetDate <= now) return null; // past date, skip

    return {
      date: targetDate.toISOString(),
      description: text.slice(0, 100),
      hour,
      minute,
    };
  }
  return null;
}

// ── Summary Generator ──────────────────────────────────────────────────────

let messageHistory = []; // [{ jid, text, from, timestamp, agent }]

function recordMessage(msg) {
  messageHistory.push({
    ...msg,
    timestamp: Date.now(),
  });
  // Keep last 500 messages
  if (messageHistory.length > 500) messageHistory = messageHistory.slice(-500);
}

function getGroupMessages(jid, hours = 24) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return messageHistory.filter((m) => m.jid === jid && m.timestamp > cutoff);
}

function generateSummary(agentName, jid, hours = 24) {
  const msgs = getGroupMessages(jid, hours);
  if (msgs.length === 0) return null;

  const byAgent = {};
  for (const m of msgs) {
    const a = m.agent || "user";
    if (!byAgent[a]) byAgent[a] = [];
    byAgent[a].push(m.text);
  }

  let summary = `📊 *Resumo das últimas ${hours}h — ${agentName}*\n\n`;
  summary += `Total de mensagens: ${msgs.length}\n\n`;

  for (const [agent, texts] of Object.entries(byAgent)) {
    summary += `*${agent}:* ${texts.length} msgs\n`;
    // Include last 3 messages as preview
    const preview = texts.slice(-3);
    for (const t of preview) {
      summary += `  > ${t.slice(0, 80)}${t.length > 80 ? "..." : ""}\n`;
    }
    summary += "\n";
  }

  return summary;
}

// ── N8N Webhook Integration ────────────────────────────────────────────────

let n8nWebhookUrl = "";

function setN8nWebhook(url) {
  n8nWebhookUrl = url;
}

function getN8nWebhook() {
  return n8nWebhookUrl;
}

async function sendToN8n(payload) {
  if (!n8nWebhookUrl) return { ok: false, error: "N8N webhook not configured" };
  try {
    const resp = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data = await resp.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── Broadcast (Marketing) ──────────────────────────────────────────────────

let broadcastQueue = [];
let broadcastActive = false;

async function broadcastMessage(text, groupJids, sendFn) {
  if (broadcastActive) return { ok: false, error: "Broadcast already in progress" };
  if (!canSendMessage()) return { ok: false, error: "Daily message limit reached" };

  broadcastActive = true;
  const results = [];

  for (const jid of groupJids) {
    if (!canSendMessage()) {
      results.push({ jid, ok: false, error: "Daily limit reached" });
      break;
    }
    try {
      await sleep(randomDelay());
      await sendFn(jid, text);
      dailyMsgCount++;
      results.push({ jid, ok: true });
    } catch (err) {
      results.push({ jid, ok: false, error: err.message });
    }
  }

  broadcastActive = false;
  return { ok: true, results };
}

// ── Main Message Processor ─────────────────────────────────────────────────

function processIncomingMessage(msg, ctx) {
  const { jid, text, agentId, sendFn, db, scheduleFn, log } = ctx;

  if (!text || !agentId) return;

  // Record for summaries
  recordMessage({ jid, text, agent: agentId });

  // Check keyword triggers
  const matchedRules = checkKeywords(text);
  for (const rule of matchedRules) {
    log.info(`[wa-automation] keyword trigger: "${rule.keywords.join(",")}" → action=${rule.action}`);
    switch (rule.action) {
      case "notify":
        // Already handled by auto-reply
        break;
      case "task":
        // Could integrate with scheduler
        break;
      case "summary":
        // Trigger immediate summary
        break;
    }
  }

  // Check for date mentions → auto-schedule
  const dateInfo = extractDate(text);
  if (dateInfo && scheduleFn) {
    log.info(`[wa-automation] date detected: ${dateInfo.date} from "${text.slice(0, 50)}"`);
    scheduleFn({
      agent: agentId,
      date: dateInfo.date,
      description: dateInfo.description,
      source: "whatsapp",
      groupJid: jid,
    });
  }

  // Forward to N8N if configured
  if (n8nWebhookUrl) {
    sendToN8n({
      event: "message",
      agent: agentId,
      jid,
      text,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }
}

module.exports = {
  // Anti-ban
  canSendMessage,
  getStats,
  queueMessage,
  DAILY_MSG_LIMIT,
  // Keywords
  loadKeywordRules,
  saveKeywordRules,
  addKeywordRule,
  removeKeywordRule,
  toggleKeywordRule,
  checkKeywords,
  // Date extraction
  extractDate,
  // Summaries
  recordMessage,
  getGroupMessages,
  generateSummary,
  // N8N
  setN8nWebhook,
  getN8nWebhook,
  sendToN8n,
  // Broadcast
  broadcastMessage,
  // Main processor
  processIncomingMessage,
  // Utils
  sleep,
  randomDelay,
};

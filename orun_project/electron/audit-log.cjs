const fs = require("fs");
const path = require("path");

const MAX_ENTRIES = 1000;

let auditFilePath = null;
let onNewEntry = null;

function init(userDataPath) {
  if (!userDataPath) return;
  auditFilePath = path.join(userDataPath, "audit.json");
  try {
    if (!fs.existsSync(auditFilePath)) {
      fs.writeFileSync(auditFilePath, JSON.stringify([], null, 2));
    }
  } catch (e) {
    console.error("[audit-log] init error:", e.message);
  }
}

function load() {
  if (!auditFilePath) return [];
  try {
    const raw = fs.readFileSync(auditFilePath, "utf8");
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function save(entries) {
  if (!auditFilePath) return;
  try {
    fs.writeFileSync(auditFilePath, JSON.stringify(entries, null, 2));
  } catch (e) {
    console.error("[audit-log] save error:", e.message);
  }
}

function sanitizeDetails(details) {
  if (!details) return "";
  if (typeof details === "string") {
    const str = details.replace(/[A-Za-z0-9_-]{20,}/g, "***REDACTED***");
    return str.length > 1000 ? str.slice(0, 1000) + "..." : str;
  }
  const str = JSON.stringify(details);
  const cleaned = str.replace(/[A-Za-z0-9_-]{20,}/g, "***REDACTED***");
  return cleaned.length > 1000 ? cleaned.slice(0, 1000) + "..." : cleaned;
}

function logAction(agentId, action, details, result) {
  const entries = load();
  const entry = {
    timestamp: Date.now(),
    agentId: agentId || "system",
    action,
    details: sanitizeDetails(details),
    result,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  save(entries);
  if (onNewEntry) onNewEntry(entry);
}

function setOnNewEntry(callback) {
  onNewEntry = callback;
}

function getRecentActions(count = 50) {
  return load().slice(-count);
}

function getActionsByAgent(agentId, count = 20) {
  return load().filter((e) => e.agentId === agentId).slice(-count);
}

function getActionsByType(action, count = 20) {
  return load().filter((e) => e.action === action).slice(-count);
}

function clearLog() {
  save([]);
}

module.exports = { init, logAction, getRecentActions, getActionsByAgent, getActionsByType, clearLog, setOnNewEntry };

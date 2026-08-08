// electron/logger.cjs
//
// Structured logger for Orun OS.
// Provides leveled logging (DEBUG, INFO, WARN, ERROR), tracing, and timing.
// Replaces scattered console.log / log.info calls with consistent structured output.

const log = require("electron-log");
const { randomUUID } = require("crypto");

// ── Log levels ───────────────────────────────────────────────────────────────
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let minLevel = LEVELS.DEBUG;

function setLevel(level) {
  minLevel = typeof level === "number" ? level : (LEVELS[level] ?? LEVELS.DEBUG);
}

// ── Secret masking ───────────────────────────────────────────────────────────
// Avoids leaking API keys / tokens / passwords into log files.
const SECRET_KEY_RE = /(api[_-]?key|secret|token|password|passwd|authorization|auth|cookie|private[_-]?key|client[_-]?secret|service[_-]?role|access[_-]?token|refresh[_-]?token|bearer)/i;
const TOKEN_RE = /\b(sk-[A-Za-z0-9_-]{8,}|gh[pousr]_[A-Za-z0-9]{10,}|xox[baprs]-[A-Za-z0-9-]{8,})\b/g;
const BEARER_RE = /(bearer|token)\s+[A-Za-z0-9._~+\-/]{8,}/gi;
const QUERY_KEY_RE = /([?&](?:api[_-]?key|key|token|secret|access_token|password)=)[^&\s"']+/gi;

function redactText(input) {
  if (typeof input !== "string") return input;
  return input
    .replace(TOKEN_RE, (m) => m.slice(0, 3) + "***")
    .replace(BEARER_RE, "$1 ***")
    .replace(QUERY_KEY_RE, "$1***");
}

function sanitize(value, key = "") {
  if (typeof value === "string") {
    if (SECRET_KEY_RE.test(key)) return "***";
    return redactText(value);
  }
  if (Array.isArray(value)) return value.map((v) => sanitize(v, key));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v, k);
    return out;
  }
  return value;
}

// ── Core logging ─────────────────────────────────────────────────────────────
function emit(level, category, message, data = {}) {
  if (LEVELS[level] < minLevel) return;
  const safeData = sanitize(data);
  const entry = {
    ts: new Date().toISOString(),
    level,
    cat: category,
    msg: redactText(message),
    ...safeData,
  };
  const line = `[${entry.ts}] [${level}] [${entry.cat}] ${entry.msg}`;
  const extra = Object.keys(safeData).length > 0 ? " " + JSON.stringify(safeData) : "";

  switch (level) {
    case "DEBUG": log.debug(line + extra); break;
    case "INFO":  log.info(line + extra);  break;
    case "WARN":  log.warn(line + extra);  break;
    case "ERROR": log.error(line + extra); break;
  }
}

// ── Category loggers ─────────────────────────────────────────────────────────
// Each category gets a scoped logger: logger.ai.info("...", data)
function createCategory(cat) {
  return {
    debug: (msg, data) => emit("DEBUG", cat, msg, data),
    info:  (msg, data) => emit("INFO",  cat, msg, data),
    warn:  (msg, data) => emit("WARN",  cat, msg, data),
    error: (msg, data) => emit("ERROR", cat, msg, data),
  };
}

// Pre-defined categories
const ai       = createCategory("ai");
const db       = createCategory("db");
const ipc      = createCategory("ipc");
const tools    = createCategory("tools");
const auth     = createCategory("auth");
const sync     = createCategory("sync");
const wa       = createCategory("whatsapp");
const plugin   = createCategory("plugin");
const mcp      = createCategory("mcp");
const tts      = createCategory("tts");
const stt      = createCategory("stt");
const sched    = createCategory("scheduler");
const window   = createCategory("window");
const perf     = createCategory("perf");
const security = createCategory("security");

// ── Tracing / Spans ──────────────────────────────────────────────────────────
// A "span" represents a unit of work with a start/end time.
// Use: const span = logger.span("ai:chat", { agent: "Health" }); ... span.end();

function span(name, attrs = {}) {
  const spanId = randomUUID().slice(0, 8);
  const start = performance.now();
  emit("DEBUG", "trace", `→ ${name} started`, { spanId, ...attrs });

  return {
    id: spanId,
    end: (result = {}) => {
      const durationMs = Math.round(performance.now() - start);
      const level = result.error ? "ERROR" : "INFO";
      emit(level, "trace", `← ${name} completed`, {
        spanId,
        durationMs,
        ...attrs,
        ...result,
      });
      return durationMs;
    },
    fail: (error) => {
      const durationMs = Math.round(performance.now() - start);
      emit("ERROR", "trace", `✗ ${name} failed`, {
        spanId,
        durationMs,
        error: redactText(error.message || String(error)),
        ...attrs,
      });
      return durationMs;
    },
  };
}

// ── Timing helper ────────────────────────────────────────────────────────────
// Measures how long a sync function takes.
// Use: const ms = logger.time("db:getDailyNutrition"); ... ms();
function time(label) {
  const start = performance.now();
  return () => {
    const durationMs = Math.round(performance.now() - start);
    emit("DEBUG", "perf", `${label}: ${durationMs}ms`, { durationMs });
    return durationMs;
  };
}

module.exports = {
  setLevel, emit, span, time, createCategory, redactText, sanitize,
  ai, db, ipc, tools, auth, sync, wa, plugin, mcp, tts, stt, sched, window, perf, security,
};

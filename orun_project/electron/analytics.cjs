// electron/analytics.cjs
//
// Módulo 6 — Analytics/Dashboard.
//
// Agrega o que o app JÁ loga: usage_events (novo log de eventos), tabelas de
// domínio (finance_log, health_log, marketing_log...), telemetria in-memory
// (ai:chat), stats dos engines (planner/memory/knowledge/skills) e métricas
// de sistema (CPU/RAM/disco/uptime) via `os` + `fs.statfsSync` — sem deps novas.
//
// `db` é injetado (better-sqlite3-like); `systemStats` e os getters de engine
// são injetáveis para testes.

const os = require("os");
const fs = require("fs");
const crypto = require("crypto");

function defaultSystemStats() {
  const cpus = os.cpus();
  const load = os.loadavg()[0] || 0;
  const cpu = Math.min(100, Math.round((load / (cpus.length || 1)) * 100));
  const totalMem = os.totalmem() || 1;
  const freeMem = os.freemem();
  const memory = Math.min(100, Math.round(((totalMem - freeMem) / totalMem) * 100));
  let disk = { freeGB: 0, totalGB: 0, usedPercent: 0 };
  try {
    const s = fs.statfsSync(os.homedir());
    const bsize = s.bsize || 4096;
    const total = (s.blocks || 0) * bsize;
    const free = (s.bfree || 0) * bsize;
    disk = {
      freeGB: +(free / 1e9).toFixed(1),
      totalGB: +(total / 1e9).toFixed(1),
      usedPercent: total ? Math.min(100, Math.round(((total - free) / total) * 100)) : 0,
    };
  } catch { /* statfs pode falhar em alguns ambientes */ }
  return {
    cpu,
    memory,
    disk,
    uptime: Math.floor(os.uptime()),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
  };
}

function createAnalytics(opts = {}) {
  const db = opts.db || null;
  const telemetry = opts.telemetry || null;
  const systemStats = opts.systemStats || defaultSystemStats;
  const getPlanner = opts.getPlanner || (() => null);
  const getMemory = opts.getMemory || (() => null);
  const getKnowledge = opts.getKnowledge || (() => null);
  const getSkills = opts.getSkills || (() => null);
  const syncEnqueue = opts.syncEnqueue || null;

  function count(table) {
    try {
      return db ? db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n : 0;
    } catch {
      return 0;
    }
  }

  /** Registra um evento de uso (persistente no SQLite + espelho cloud). */
  function logEvent({ type, agent = null, detail = "" } = {}) {
    if (!db || !type) return { ok: false, error: "db ou type ausentes" };
    try {
      const id = crypto.randomUUID();
      const created_at = Date.now();
      db.prepare(
        "INSERT INTO app_events (id, type, agent, detail, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(id, type, agent, String(detail || "").slice(0, 500), created_at);
      if (syncEnqueue) syncEnqueue("app_events", { id, type, agent, detail: String(detail || "").slice(0, 500), created_at });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /** Contagem de eventos por tipo (hoje e total). */
  function usageByType() {
    const out = { today: {}, total: {} };
    if (!db) return out;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    for (const row of db.prepare("SELECT type, COUNT(*) AS n FROM app_events GROUP BY type").all()) {
      out.total[row.type] = row.n;
    }
    for (const row of db.prepare("SELECT type, COUNT(*) AS n FROM app_events WHERE created_at >= ? GROUP BY type").all(startOfDay)) {
      out.today[row.type] = row.n;
    }
    return out;
  }

  function dbCounts() {
    return {
      conversations: count("conversations"),
      messages: count("messages"),
      financeLog: count("finance_log"),
      healthLog: count("health_log"),
      marketingLog: count("marketing_log"),
      agenda: count("daily_agenda"),
      usageEvents: count("app_events"),
    };
  }

  function aiUsage() {
    const out = { requests: 0, tokensIn: 0, tokensOut: 0 };
    if (!db) return out;
    try {
      for (const row of db.prepare("SELECT SUM(requests) AS r, SUM(tokens_in) AS i, SUM(tokens_out) AS o FROM usage").all()) {
        out.requests = row.r || 0;
        out.tokensIn = row.i || 0;
        out.tokensOut = row.o || 0;
      }
    } catch { /* tabela usage pode não existir ainda */ }
    return out;
  }

  /** Agrega tudo para o dashboard. */
  function aggregate() {
    const planner = getPlanner();
    const memory = getMemory();
    const knowledge = getKnowledge();
    const skills = getSkills();
    return {
      system: systemStats(),
      counts: dbCounts(),
      usage: usageByType(),
      ai: aiUsage(),
      telemetry: telemetry ? telemetry.summary() : { counters: {}, metrics: {}, recentTraces: 0 },
      engines: {
        planner: planner ? { total: planner.stats().total, byStatus: planner.stats().byStatus, goals: planner.stats().goals } : null,
        memory: memory ? { total: memory.stats().total, byScope: memory.stats().byScope } : null,
        knowledge: knowledge ? { total: knowledge.stats().total, byKind: knowledge.stats().byKind } : null,
        skills: skills ? { total: skills.length, enabled: skills.filter((s) => s.enabled).length } : null,
      },
    };
  }

  /** Só métricas de sistema (barato, usado pelo widget da sidebar). */
  function system() {
    return systemStats();
  }

  return { logEvent, usageByType, dbCounts, aiUsage, aggregate, system };
}

module.exports = { createAnalytics, defaultSystemStats };

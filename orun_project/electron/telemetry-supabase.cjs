// electron/telemetry-supabase.cjs
//
// Telemetria baseada em Supabase (tabela app_events) — substitui o PostHog
// self-hosted. Escrita local-first (SQLite) + espelho cloud via sync_outbox;
// leitura direta do SQLite local (funciona offline, sem Docker).
//
// Eventos obedecao o schema @orun/telemetry-core (envelope + tipo), e cada
// evento vira uma linha em app_events:
//   id        = eventId (uuid)
//   type      = event.type  (agent.invoked, agent.error, ...)
//   agent     = agentId
//   detail    = JSON do restante (timestamp, sessionId, durationMs, success...)
//   created_at= Date.now() (epoch ms, mesmo formato do analytics.logEvent)

const crypto = require("crypto");

// Normaliza payloads "solto" vindos da LLM (ferramenta telemetry_track) para
// o schema estrito do @orun/telemetry-core. Retorna null se incompatível.
function normalizeTelemetryPayload(args) {
  if (!args || typeof args !== "object") return null;
  const type = args.type;
  const out = { type };
  switch (type) {
    case "agent.invoked": {
      if (!args.agentId) return null;
      out.agentId = args.agentId;
      if (typeof args.agentName === "string") out.agentName = args.agentName;
      if (typeof args.circleModule === "string") out.circleModule = args.circleModule;
      if (Array.isArray(args.skillsUsed)) out.skillsUsed = args.skillsUsed.filter((s) => typeof s === "string");
      if (Number.isFinite(args.inputTokens)) out.inputTokens = args.inputTokens;
      return out;
    }
    case "agent.response_time": {
      if (!args.agentId || !Number.isFinite(args.durationMs)) return null;
      out.agentId = args.agentId;
      out.durationMs = args.durationMs;
      if (typeof args.provider === "string") out.provider = args.provider;
      return out;
    }
    case "agent.error": {
      if (!args.agentId) return null;
      out.agentId = args.agentId;
      out.errorCode = typeof args.errorCode === "string" && args.errorCode ? args.errorCode : "unknown";
      out.sanitizedMessage = String(args.error || args.sanitizedMessage || "Erro sem detalhes").slice(0, 500);
      out.boundaryTriggered = Boolean(args.isBoundaryError || args.boundaryTriggered);
      return out;
    }
    case "agent.action_registered": {
      if (!args.agentId) return null;
      out.agentId = args.agentId;
      out.expectedAction = String(args.expectedAction || "unknown");
      out.actionRegistered = Boolean(args.actionRegistered);
      out.responseModality = ["text_only", "action", "text_and_action"].includes(args.responseModality)
        ? args.responseModality
        : "action";
      return out;
    }
    case "mcp.call": {
      if (!args.mcpName || !["calendar", "gmail", "figma", "github"].includes(args.mcpName)) return null;
      out.mcpName = args.mcpName;
      if (typeof args.agentId === "string") out.agentId = args.agentId;
      out.success = Boolean(args.success);
      if (Number.isFinite(args.durationMs)) out.durationMs = args.durationMs;
      if (typeof args.errorCode === "string") out.errorCode = args.errorCode;
      return out;
    }
    case "user.session": {
      if (!args.action || !["start", "end"].includes(args.action)) return null;
      out.action = args.action;
      if (Number.isFinite(args.durationMs)) out.durationMs = args.durationMs;
      return out;
    }
    default:
      return null;
  }
}

function eventToRow(payload) {
  const type = payload.type;
  const agent = payload.agentId || null;
  const { type: _type, agentId: _agentId, eventId, ...rest } = payload;
  return {
    id: eventId || crypto.randomUUID(),
    type,
    agent,
    detail: JSON.stringify(rest),
    created_at: Date.now(),
  };
}

class SupabaseTelemetryStore {
  constructor({ db, syncEnqueue }) {
    this.db = db || null;
    this.syncEnqueue = syncEnqueue || null;
  }

  get providerName() {
    return "supabase-app_events";
  }

  async track(payload) {
    if (!this.db || !payload || !payload.type) return;
    const row = eventToRow(payload);
    try {
      this.db
        .prepare("INSERT INTO app_events (id, type, agent, detail, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(row.id, row.type, row.agent, row.detail, row.created_at);
      if (this.syncEnqueue) {
        try { this.syncEnqueue("app_events", row); } catch { /* espelho é best-effort */ }
      }
    } catch { /* telemetria nunca deve quebrar o fluxo do agente */ }
  }

  async flush() { /* push-first: o sync periódico cuida do envio */ }

  async identify() { /* sem PII por padrão — no-op no app_events */ }

  async shutdown() { /* sem recursos a liberar */ }
}

class SupabaseMetricsReader {
  constructor({ db }) {
    this.db = db || null;
  }

  async getAllAgentsHealth() {
    if (!this.db) return [];
    const since = Date.now() - 24 * 60 * 60 * 1000;
    let rows = [];
    try {
      rows = this.db
        .prepare(
          `SELECT
             agent,
             SUM(CASE WHEN type = 'agent.invoked' THEN 1 ELSE 0 END) AS invocations,
             SUM(CASE WHEN type = 'agent.error' THEN 1 ELSE 0 END) AS errors,
             AVG(CASE WHEN type = 'agent.response_time' THEN json_extract(detail, '$.durationMs') END) AS avgMs,
             SUM(CASE WHEN type = 'agent.action_registered' THEN 1 ELSE 0 END) AS expectedActions,
             SUM(CASE WHEN type = 'agent.action_registered' AND json_extract(detail, '$.actionRegistered') = 1 THEN 1 ELSE 0 END) AS registeredActions
           FROM app_events
           WHERE created_at >= ? AND agent IS NOT NULL AND agent != ''
           GROUP BY agent`
        )
        .all(since);
    } catch { return []; }
    return rows.map((r) => ({
      agentId: r.agent,
      invocations24h: r.invocations || 0,
      errorRate24h: r.invocations > 0 ? (r.errors || 0) / r.invocations : 0,
      avgResponseTimeMs: Math.round(r.avgMs || 0),
      actionRegistrationRate: r.expectedActions > 0 ? (r.registeredActions || 0) / r.expectedActions : 1,
    }));
  }

  async getAgentHealth(agentId) {
    const all = await this.getAllAgentsHealth();
    const found = all.find((s) => s.agentId === agentId);
    if (found) return found;
    return { agentId, invocations24h: 0, errorRate24h: 0, avgResponseTimeMs: 0, actionRegistrationRate: 1 };
  }

  async getMcpSuccessRate(mcpName, windowHours = 24) {
    if (!this.db) return 1;
    const since = Date.now() - windowHours * 60 * 60 * 1000;
    let row = null;
    try {
      row = this.db
        .prepare(
          `SELECT
             sum(CASE WHEN json_extract(detail, '$.success') = 1 THEN 1 ELSE 0 END) AS ok,
             count(*) AS total
           FROM app_events
           WHERE type = 'mcp.call' AND json_extract(detail, '$.mcpName') = ? AND created_at >= ?`
        )
        .get(mcpName, since);
    } catch { return 1; }
    if (!row || !row.total) return 1;
    return (row.ok || 0) / row.total;
  }
}

module.exports = {
  SupabaseTelemetryStore,
  SupabaseMetricsReader,
  normalizeTelemetryPayload,
  eventToRow,
};
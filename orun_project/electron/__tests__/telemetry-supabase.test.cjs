// electron/__tests__/telemetry-supabase.test.cjs
// Testes do store/reader de telemetria baseado em Supabase (app_events).
// O módulo só usa db.prepare(...).run/get/all — fake em memória (better-sqlite3
// é compilado para Electron, não roda no Node do runner).

const {
  SupabaseTelemetryStore,
  SupabaseMetricsReader,
  normalizeTelemetryPayload,
} = require("../telemetry-supabase.cjs");

function makeFakeDb() {
  const rows = [];
  function matches(row, since) {
    return row.created_at >= since;
  }
  return {
    _rows: rows,
    prepare(sql) {
      const lower = sql.toLowerCase();
      if (lower.includes("insert into app_events")) {
        return { run: (id, type, agent, detail, created_at) => { rows.push({ id, type, agent, detail, created_at }); return { changes: 1 }; } };
      }
      if (lower.includes("group by agent")) {
        return {
          all: (since) => {
            const m = {};
            for (const r of rows) {
              if (!matches(r, since) || !r.agent) continue;
              if (!m[r.agent]) m[r.agent] = { agent: r.agent, invocations: 0, errors: 0, sumMs: 0, nMs: 0, expectedActions: 0, registeredActions: 0 };
              const agg = m[r.agent];
              if (r.type === "agent.invoked") agg.invocations += 1;
              if (r.type === "agent.error") agg.errors += 1;
              if (r.type === "agent.response_time") {
                const ms = Number(JSON.parse(r.detail).durationMs);
                if (Number.isFinite(ms)) { agg.sumMs += ms; agg.nMs += 1; }
              }
              if (r.type === "agent.action_registered") {
                agg.expectedActions += 1;
                if (JSON.parse(r.detail).actionRegistered === true) agg.registeredActions += 1;
              }
            }
            return Object.values(m).map((a) => ({
              agent: a.agent,
              invocations: a.invocations,
              errors: a.errors,
              avgMs: a.nMs ? a.sumMs / a.nMs : null,
              expectedActions: a.expectedActions,
              registeredActions: a.registeredActions,
            }));
          },
        };
      }
      if (lower.includes("mcp.call")) {
        return {
          get: (mcpName, since) => {
            let ok = 0; let total = 0;
            for (const r of rows) {
              if (!matches(r, since) || r.type !== "mcp.call") continue;
              const d = JSON.parse(r.detail);
              if (d.mcpName !== mcpName) continue;
              total += 1;
              if (d.success === true) ok += 1;
            }
            return { ok, total };
          },
        };
      }
      throw new Error(`SQL não suportado no fake: ${sql}`);
    },
  };
}

function seedEvent(db, type, { agent, sinceDaysAgo = 0, detail = {} }) {
  db.prepare("INSERT INTO app_events (id, type, agent, detail, created_at) VALUES (?,?,?,?,?)")
    .run("evt-" + db._rows.length, type, agent, JSON.stringify(detail), Date.now() - sinceDaysAgo * 86400000);
}

describe("normalizeTelemetryPayload", () => {
  it("normaliza agent.invoked a partir de args soltos da LLM", () => {
    expect(normalizeTelemetryPayload({ type: "agent.invoked", agentId: "a1", agentName: "Developer", skillsUsed: ["s1"] })).toEqual({
      type: "agent.invoked", agentId: "a1", agentName: "Developer", skillsUsed: ["s1"],
    });
  });

  it("mapeia error -> sanitizedMessage e isBoundaryError -> boundaryTriggered", () => {
    expect(normalizeTelemetryPayload({ type: "agent.error", agentId: "a1", error: "boom", isBoundaryError: true })).toMatchObject({
      type: "agent.error", agentId: "a1", sanitizedMessage: "boom", boundaryTriggered: true,
    });
  });

  it("retorna null para tipo desconhecido ou payload inválido", () => {
    expect(normalizeTelemetryPayload({ type: "nope", agentId: "a1" })).toBeNull();
    expect(normalizeTelemetryPayload(null)).toBeNull();
    expect(normalizeTelemetryPayload({ type: "agent.invoked" })).toBeNull();
    expect(normalizeTelemetryPayload({ type: "mcp.call", mcpName: "unknown-mcp", success: true })).toBeNull();
  });
});

describe("SupabaseTelemetryStore", () => {
  it("track grava linha em app_events e enfileira sync", async () => {
    const db = makeFakeDb();
    const enqueued = [];
    const store = new SupabaseTelemetryStore({ db, syncEnqueue: (t, r) => enqueued.push([t, r]) });
    await store.track({ eventId: "abc-123", type: "agent.invoked", agentId: "a1", agentName: "Developer", timestamp: "t", sessionId: "s", platform: "desktop", appVersion: "1.0.0" });
    expect(db._rows.length).toBe(1);
    expect(db._rows[0].type).toBe("agent.invoked");
    expect(db._rows[0].agent).toBe("a1");
    expect(db._rows[0].id).toBe("abc-123");
    expect(JSON.parse(db._rows[0].detail).agentName).toBe("Developer");
    expect(enqueued.length).toBe(1);
    expect(enqueued[0][0]).toBe("app_events");
  });

  it("track é absorvido silenciosamente sem db ou com payload inválido", async () => {
    const store = new SupabaseTelemetryStore({ db: null, syncEnqueue: null });
    await expect(store.track({ type: "agent.invoked", agentId: "a1" })).resolves.toBeUndefined();
    const db = makeFakeDb();
    const withDb = new SupabaseTelemetryStore({ db, syncEnqueue: null });
    await expect(withDb.track(null)).resolves.toBeUndefined();
    expect(db._rows.length).toBe(0);
  });
});

describe("SupabaseMetricsReader", () => {
  it("allAgentsHealth agrega invocações, erros, latência e ação (janela 24h)", async () => {
    const db = makeFakeDb();
    seedEvent(db, "agent.invoked", { agent: "a1" });
    seedEvent(db, "agent.invoked", { agent: "a1" });
    seedEvent(db, "agent.invoked", { agent: "a1", detail: { old: true } });
    seedEvent(db, "agent.error", { agent: "a1" });
    seedEvent(db, "agent.response_time", { agent: "a1", detail: { durationMs: 100 } });
    seedEvent(db, "agent.response_time", { agent: "a1", detail: { durationMs: 300 } });
    seedEvent(db, "agent.action_registered", { agent: "a1", detail: { actionRegistered: true } });
    seedEvent(db, "agent.action_registered", { agent: "a1", detail: { actionRegistered: false } });
    // fora da janela (36h atrás) — não deve contar
    seedEvent(db, "agent.invoked", { agent: "a1", sinceDaysAgo: 1.5 });

    const reader = new SupabaseMetricsReader({ db });
    const all = await reader.getAllAgentsHealth();
    expect(all.length).toBe(1);
    expect(all[0]).toMatchObject({ agentId: "a1", invocations24h: 3, errorRate24h: 1 / 3, avgResponseTimeMs: 200, actionRegistrationRate: 0.5 });
  });

  it("getAgentHealth devolve snapshot zerado para agente sem eventos", async () => {
    const db = makeFakeDb();
    const reader = new SupabaseMetricsReader({ db });
    expect(await reader.getAgentHealth("ghost")).toEqual({ agentId: "ghost", invocations24h: 0, errorRate24h: 0, avgResponseTimeMs: 0, actionRegistrationRate: 1 });
  });

  it("getMcpSuccessRate calcula taxa de sucesso por mcpName", async () => {
    const db = makeFakeDb();
    seedEvent(db, "mcp.call", { agent: "a1", detail: { mcpName: "github", success: true } });
    seedEvent(db, "mcp.call", { agent: "a1", detail: { mcpName: "github", success: true } });
    seedEvent(db, "mcp.call", { agent: "a1", detail: { mcpName: "github", success: false } });
    seedEvent(db, "mcp.call", { agent: "a1", detail: { mcpName: "gmail", success: false } });
    const reader = new SupabaseMetricsReader({ db });
    expect(await reader.getMcpSuccessRate("github")).toBeCloseTo(2 / 3);
    expect(await reader.getMcpSuccessRate("gmail")).toBe(0);
    expect(await reader.getMcpSuccessRate("calendar")).toBe(1);
  });

  it("reader sem db não explode", async () => {
    const reader = new SupabaseMetricsReader({ db: null });
    expect(await reader.getAllAgentsHealth()).toEqual([]);
    expect(await reader.getMcpSuccessRate("github")).toBe(1);
  });
});
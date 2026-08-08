// electron/__tests__/analytics.test.cjs
// Testes do Analytics/Dashboard (Módulo 6) — agregação de métricas.
// O analytics só usa db.prepare(...).run/get/all — um fake em memória basta
// (better-sqlite3 nativo é compilado para Electron, não roda no Node do vitest).

const { createAnalytics, defaultSystemStats } = require("../analytics.cjs");

function makeFakeDb() {
  const events = [];
  return {
    _events: events,
    prepare(sql) {
      const lower = sql.toLowerCase();
      if (lower.startsWith("insert into app_events")) {
        return {
          run: (...args) => {
            events.push({ id: args[0], type: args[1], agent: args[2], detail: args[3], created_at: args[4] });
            return { changes: 1 };
          },
        };
      }
      if (lower.includes("select * from app_events")) {
        return { get: () => events[0] || null };
      }
      if (lower.includes("from app_events") && lower.includes("where created_at >=")) {
        return {
          all: (start) => {
            const m = {};
            for (const e of events) if (e.created_at >= start) m[e.type] = (m[e.type] || 0) + 1;
            return Object.entries(m).map(([type, n]) => ({ type, n }));
          },
        };
      }
      if (lower.includes("from app_events")) {
        return {
          all: () => {
            const m = {};
            for (const e of events) m[e.type] = (m[e.type] || 0) + 1;
            return Object.entries(m).map(([type, n]) => ({ type, n }));
          },
        };
      }
      if (lower.includes("sum(requests)")) {
        return { all: () => [{ r: null, i: null, o: null }] };
      }
      if (lower.includes("count(*) as n")) {
        const t = /from\s+(\w+)/.exec(lower)?.[1] || "";
        return { get: () => ({ n: t === "app_events" ? events.length : 0 }) };
      }
      throw new Error(`SQL não suportado no fake: ${sql}`);
    },
  };
}

function makeAnalytics(overrides = {}) {
  const db = overrides.db || makeFakeDb();
  const telemetry = overrides.telemetry || { summary: () => ({ counters: { "ai:chat:success": 3 }, metrics: {}, recentTraces: 5 }) };
  return {
    db,
    analytics: createAnalytics({
      db,
      telemetry,
      systemStats: overrides.systemStats || (() => ({ cpu: 42, memory: 61, disk: { freeGB: 120, totalGB: 512, usedPercent: 30 }, uptime: 3600, platform: "win32", arch: "x64", hostname: "test" })),
      getPlanner: overrides.getPlanner || (() => null),
      getMemory: overrides.getMemory || (() => null),
      getKnowledge: overrides.getKnowledge || (() => null),
      getSkills: overrides.getSkills || (() => null),
    }),
  };
}

describe("createAnalytics", () => {
  it("registra eventos e conta por tipo (hoje e total)", () => {
    const { db, analytics } = makeAnalytics();
    db.prepare("INSERT INTO app_events (id, type, agent, detail, created_at) VALUES (?,?,?,?,?)")
      .run("e1", "ai:chat", "Developer", "x", Date.now());
    db.prepare("INSERT INTO app_events (id, type, agent, detail, created_at) VALUES (?,?,?,?,?)")
      .run("e2", "ai:chat", "Developer", "x", Date.now() - 2 * 86400000);

    const out = analytics.usageByType();
    expect(out.total["ai:chat"]).toBe(2);
    expect(out.today["ai:chat"]).toBe(1);
    expect(out.today["planner:plan"]).toBeUndefined();
  });

  it("logEvent insere com id uuid e detail truncado", () => {
    const { db, analytics } = makeAnalytics();
    const res = analytics.logEvent({ type: "planner:run", agent: "System", detail: "a".repeat(600) });
    expect(res.ok).toBe(true);
    const row = db.prepare("SELECT * FROM app_events").get();
    expect(row.type).toBe("planner:run");
    expect(row.detail.length).toBeLessThanOrEqual(500);
  });

  it("logEvent sem db ou type retorna erro sem estourar", () => {
    const { analytics } = makeAnalytics({ db: null });
    expect(analytics.logEvent({}).ok).toBe(false);
  });

  it("aiUsage soma requests/tokens de forma segura sem tabela usage", () => {
    const { analytics } = makeAnalytics();
    expect(analytics.aiUsage()).toEqual({ requests: 0, tokensIn: 0, tokensOut: 0 });
  });

  it("aggregate retorna sistema, contagens, uso, ia, telemetria e engines", () => {
    const { analytics } = makeAnalytics({
      getPlanner: () => ({ stats: () => ({ total: 5, byStatus: { done: 3, pending: 2 }, goals: 1 }) }),
      getMemory: () => ({ stats: () => ({ total: 12, byScope: { global: 12 } }) }),
      getKnowledge: () => ({ stats: () => ({ total: 4, byKind: { changelog: 4 } }) }),
      getSkills: () => [{ id: "a", enabled: true }, { id: "b", enabled: false }],
    });
    const out = analytics.aggregate();
    expect(out.system.cpu).toBe(42);
    expect(out.system.hostname).toBe("test");
    expect(out.telemetry.counters["ai:chat:success"]).toBe(3);
    expect(out.engines.planner.total).toBe(5);
    expect(out.engines.planner.byStatus).toEqual({ done: 3, pending: 2 });
    expect(out.engines.memory.total).toBe(12);
    expect(out.engines.knowledge.byKind.changelog).toBe(4);
    expect(out.engines.skills).toEqual({ total: 2, enabled: 1 });
    expect(out.counts.usageEvents).toBe(0);
  });

  it("aggregate não explode quando engines são null", () => {
    const { analytics } = makeAnalytics();
    const out = analytics.aggregate();
    expect(out.engines.planner).toBeNull();
    expect(out.engines.skills).toBeNull();
  });

  it("system retorna métricas injetáveis", () => {
    const { analytics } = makeAnalytics();
    expect(analytics.system().cpu).toBe(42);
  });

  it("defaultSystemStats retorna shape esperado", () => {
    const s = defaultSystemStats();
    expect(s).toHaveProperty("cpu");
    expect(s).toHaveProperty("memory");
    expect(s).toHaveProperty("disk");
    expect(s).toHaveProperty("uptime");
    expect(s).toHaveProperty("platform");
    expect(s).toHaveProperty("arch");
    expect(s).toHaveProperty("hostname");
  });

  it("count de tabela inexistente retorna 0 sem estourar", () => {
    const { analytics } = makeAnalytics();
    const counts = analytics.dbCounts();
    expect(counts.financeLog).toBe(0);
    expect(counts.conversations).toBe(0);
  });
});

describe("defaultSystemStats (stress-free)", () => {
  it("nunca retorna NaN/infinity em valores percentuais", () => {
    const s = defaultSystemStats();
    for (const v of [s.cpu, s.memory, s.disk.usedPercent]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

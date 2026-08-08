// electron/__tests__/memory-consolidator.test.cjs
// Testes da consolidação automática (Fase 2 do Módulo 2).

const { init, consolidateAll } = require("../memory-consolidator.cjs");

describe("consolidateAll", () => {
  it("retorna sem memoryEngine configurado", async () => {
    expect(await consolidateAll()).toMatchObject({ ok: false, reason: "memoryEngine não configurado" });
  });

  it("consolida um escopo por agente presente no store (mais o global)", async () => {
    const consolidate = vi.fn(async (opts) =>
      opts.scopeAgent === "Health" ? { ok: true, candidates: 3, summarized: "fato" } : { ok: false, reason: "sem memórias maduras" }
    );
    const engine = {
      load: () => [
        { scopeAgent: "Health" },
        { scopeAgent: "Health" },
        { scopeAgent: null },
      ],
      consolidate,
    };
    const res = await consolidateAll({ memoryEngine: engine });
    expect(res.ok).toBe(true);
    expect(consolidate).toHaveBeenCalledTimes(2);
    const scopes = consolidate.mock.calls.map((c) => c[0].scopeAgent);
    expect(scopes).toContain("Health");
    expect(scopes).toContain(null);
    expect(res.consolidated).toEqual([{ scope: "Health", candidates: 3, chars: 4 }]);
  });

  it("não quebra quando um escopo falha", async () => {
    const engine = {
      load: () => [{ scopeAgent: "Finance" }],
      consolidate: vi.fn(async () => { throw new Error("provider offline"); }),
    };
    const res = await consolidateAll({ memoryEngine: engine, logger: { info: () => {}, warn: () => {} } });
    expect(res.ok).toBe(true);
    expect(res.consolidated).toEqual([]);
  });
});

describe("init", () => {
  it("agenda um cron diário quando há memoryEngine", () => {
    const engine = { load: () => [], consolidate: vi.fn(async () => ({ ok: false })) };
    const res = init({ memoryEngine: engine });
    expect(res.ok).toBe(true);
    expect(res.task).toBeTruthy();
    res.task.stop();
  });

  it("retorna sem memoryEngine", () => {
    expect(init()).toMatchObject({ ok: false });
  });
});

// electron/__tests__/planner-engine.test.cjs
// Testes do Planner Engine (Módulo 4 — orquestrador serial).

const os = require("os");
const path = require("path");

const { createPlannerEngine, makeTaskId, STATUS } = require("../planner-engine.cjs");

function tmpFile() {
  return path.join(os.tmpdir(), `planner-engine-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("makeTaskId", () => {
  it("combina goal + título", () => {
    expect(makeTaskId("semana", "revisar orçamento")).toBe("task::semana::revisar orçamento");
  });
});

describe("createTask", () => {
  it("valida title obrigatório", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile() });
    expect(await engine.createTask({ title: "" })).toMatchObject({ ok: false, error: "title é obrigatório" });
  });

  it("cria tarefa com id composto e espelha para a nuvem", async () => {
    const upsert = vi.fn().mockResolvedValue({ ok: true });
    const engine = createPlannerEngine({ filePath: tmpFile(), cloud: { upsert } });
    const res = await engine.createTask({ goalId: "semana", title: "Revisar orçamento", agent: "Finance", priority: 1 });
    expect(res.ok).toBe(true);
    expect(res.task.id).toBe("task::semana::Revisar orçamento");
    expect(res.task.status).toBe("pending");
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0].uid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("não duplica a mesma tarefa", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile() });
    await engine.createTask({ goalId: "g", title: "T1" });
    const second = await engine.createTask({ goalId: "g", title: "T1" });
    expect(second.updated).toBe(true);
    expect(engine.load()).toHaveLength(1);
  });
});

describe("execução serial com dependências", () => {
  it("executa apenas tarefas com dependências concluídas e na ordem de prioridade", async () => {
    const calls = [];
    const engine = createPlannerEngine({
      filePath: tmpFile(),
      executeTask: async (task) => { calls.push(task.title); return { ok: true, result: `feito: ${task.title}` }; },
    });
    await engine.createTask({ goalId: "g", title: "A", priority: 1 });
    await engine.createTask({ goalId: "g", title: "B", priority: 2 });
    const res = await engine.runGoal("g");
    expect(calls).toEqual(["A", "B"]);
    expect(res.counts.done).toBe(2);
    expect(res.counts.pending).toBe(0);
    const list = engine.listTasks({ goalId: "g" });
    expect(list.every((t) => t.status === "done")).toBe(true);
  });

  it("bloqueia tarefas cujas dependências não foram concluídas", async () => {
    const calls = [];
    const engine = createPlannerEngine({
      filePath: tmpFile(),
      executeTask: async (task) => { calls.push(task.title); return { ok: true, result: "ok" }; },
    });
    await engine.createTask({ goalId: "g", title: "B" });
    await engine.createTask({ goalId: "g", title: "A" });
    const b = engine.listTasks({ goalId: "g" }).find((t) => t.title === "B");
    await engine.updateTask(b.id, { dependencies: [makeTaskId("g", "A")] });

    expect(engine.nextReady("g").title).toBe("A");
    await engine.executeNext("g");
    expect(calls).toEqual(["A"]);
    expect(engine.getTask(b.id).task.status).toBe("pending");

    expect(engine.nextReady("g").title).toBe("B");
    await engine.executeNext("g");
    expect(calls).toEqual(["A", "B"]);
    expect(engine.getTask(b.id).task.status).toBe("done");
  });

  it("marca como failed quando a execução falha", async () => {
    const engine = createPlannerEngine({
      filePath: tmpFile(),
      executeTask: async () => ({ ok: false, error: "provider offline" }),
    });
    await engine.createTask({ goalId: "g", title: "Falha" });
    const res = await engine.runGoal("g");
    expect(res.counts.failed).toBe(1);
    expect(engine.listTasks({ goalId: "g" })[0].status).toBe("failed");
    expect(engine.listTasks({ goalId: "g" })[0].error).toBe("provider offline");
  });

  it("registra started_at/completed_at nas transições", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile(), executeTask: async () => ({ ok: true, result: "ok" }) });
    await engine.createTask({ goalId: "g", title: "T" });
    const res = await engine.executeNext("g");
    expect(res.task.status).toBe("done");
    expect(res.task.started_at).toBeTruthy();
    expect(res.task.completed_at).toBeTruthy();
  });
});

describe("plan", () => {
  it("cria subtarefas a partir do plano do LLM, resolvendo dependências por índice", async () => {
    const engine = createPlannerEngine({
      filePath: tmpFile(),
      plan: async () => [
        { title: "Pesquisar", priority: 1 },
        { title: "Escrever", agent: "Developer", priority: 2, dependencies: [0] },
      ],
    });
    const res = await engine.plan("montar doc");
    expect(res.ok).toBe(true);
    expect(res.tasks).toHaveLength(2);
    const escrever = res.tasks[1];
    expect(escrever.agent).toBe("Developer");
    expect(escrever.dependencies).toEqual([makeTaskId("montar doc", "Pesquisar")]);
  });

  it("retorna erro quando o plano é vazio", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile(), plan: async () => [] });
    expect(await engine.plan("algo")).toMatchObject({ ok: false, error: "plano vazio" });
  });

  it("retorna erro sem plan configurado", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile() });
    expect(await engine.plan("algo")).toMatchObject({ ok: false, error: "plan não configurado" });
  });
});

describe("review e stats", () => {
  it("gera resumo de revisão com contagem por status", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile(), executeTask: async () => ({ ok: true, result: "ok" }) });
    await engine.createTask({ goalId: "g", title: "T" });
    await engine.runGoal("g");
    const review = await engine.review("g");
    expect(review.ok).toBe(true);
    expect(review.summary.total).toBe(1);
    expect(review.summary.done).toBe(1);
  });

  it("computa stats por status e número de objetivos", async () => {
    const engine = createPlannerEngine({ filePath: tmpFile() });
    await engine.createTask({ goalId: "g1", title: "A" });
    await engine.createTask({ goalId: "g1", title: "B" });
    await engine.createTask({ goalId: "g2", title: "C" });
    const s = engine.stats();
    expect(s.total).toBe(3);
    expect(s.byStatus.pending).toBe(3);
    expect(s.goals).toBe(2);
  });
});

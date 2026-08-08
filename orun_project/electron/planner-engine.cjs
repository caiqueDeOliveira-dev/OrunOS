// electron/planner-engine.cjs
//
// Módulo 4 — Planner Engine (orquestrador serial).
//
// Objetivo → plano → subtarefas → prioridades → execução → revisão.
// Estado persistido no Supabase (planner_tasks, migration 0010) → o mobile
// enxerga. Local-first (JSON no userData) com espelho opcional para a nuvem.
//
// Começa com um `Task` simples (title, agent, status, priority, dependencies)
// e execução serial. NÃO faz: GTD completo, Kanban, scheduler com dependências
// de tempo, roadmaps automáticos.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  BLOCKED: "blocked",
  CANCELLED: "cancelled",
};

function defaultFileStore(filePath) {
  let cache = null;
  function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(cache) ? cache : (cache = []);
    } catch {
      return (cache = []);
    }
  }
  function save(records) {
    cache = records;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      return true;
    } catch {
      return false;
    }
  }
  return { load, save };
}

function createPlannerEngine(opts = {}) {
  const store = opts.store || defaultFileStore(opts.filePath || path.join(process.cwd(), "planner-engine.json"));
  const cloud = opts.cloud || null;
  const logger = opts.logger || { warn: () => {}, info: () => {}, error: () => {} };
  const planWith = opts.plan || null; // (goal, context) => Promise<PlanItem[]>
  const executeTask = opts.executeTask || null; // (task) => Promise<{ ok, result?, error? }>

  function load() {
    return store.load();
  }

  function persist(records) {
    return store.save(records);
  }

  /** Cria uma tarefa (upsert por id composto goal+title). */
  async function createTask({ goalId = "default", title, description = "", agent = null, priority = 3, dependencies = [], status = STATUS.PENDING } = {}) {
    if (typeof title !== "string" || !title.trim()) return { ok: false, error: "title é obrigatório" };
    const id = makeTaskId(goalId, title);
    const records = load();
    const idx = records.findIndex((r) => r.id === id);
    const existing = idx >= 0 ? records[idx] : null;
    const now = Date.now();
    const task = {
      id,
      uid: existing && existing.uid ? existing.uid : crypto.randomUUID(),
      goalId,
      title,
      description,
      agent: agent || null,
      status,
      priority,
      dependencies: Array.isArray(dependencies) ? dependencies : [],
      result: null,
      error: null,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
      started_at: existing ? existing.started_at : null,
      completed_at: existing ? existing.completed_at : null,
    };
    if (idx >= 0) records[idx] = task;
    else records.push(task);
    persist(records);

    if (cloud) {
      Promise.resolve(cloud.upsert(task)).catch((e) => logger.warn(`[planner] cloud upsert falhou: ${e.message}`));
    }
    return { ok: true, task, updated: Boolean(existing) };
  }

  function listTasks({ goalId = null, status = null } = {}) {
    return load()
      .filter((t) => (!goalId || t.goalId === goalId) && (!status || t.status === status))
      .sort((a, b) => (a.priority || 3) - (b.priority || 3) || (b.created_at || 0) - (a.created_at || 0));
  }

  function getTask(id) {
    const found = load().find((t) => t.id === id);
    return found ? { ok: true, task: found } : { ok: false, error: "tarefa não encontrada" };
  }

  /** Atualiza status/resultado/erro de uma tarefa e espelha para a nuvem. */
  async function updateTask(id, patch = {}) {
    const records = load();
    const target = records.find((t) => t.id === id);
    if (!target) return { ok: false, error: "tarefa não encontrada" };
    const now = Date.now();
    if (patch.status) target.status = patch.status;
    if (patch.result !== undefined) target.result = patch.result;
    if (patch.error !== undefined) target.error = patch.error;
    if (patch.agent) target.agent = patch.agent;
    if (patch.priority !== undefined) target.priority = patch.priority;
    if (Array.isArray(patch.dependencies)) target.dependencies = patch.dependencies;
    if (target.status === STATUS.RUNNING && !target.started_at) target.started_at = now;
    if (target.status === STATUS.DONE || target.status === STATUS.FAILED || target.status === STATUS.CANCELLED) {
      target.completed_at = now;
    }
    target.updated_at = now;
    persist(records);
    if (cloud) {
      Promise.resolve(cloud.upsert(target)).catch((e) => logger.warn(`[planner] cloud upsert falhou: ${e.message}`));
    }
    return { ok: true, task: target };
  }

  function depsMet(task, tasks) {
    for (const d of task.dependencies || []) {
      const dep = tasks.find((t) => t.id === d);
      if (dep && dep.status !== STATUS.DONE) return false;
    }
    return true;
  }

  /** Próxima tarefa pronta (pending + dependências concluídas), por prioridade. */
  function nextReady(goalId) {
    const tasks = listTasks({ goalId });
    const ready = tasks
      .filter((t) => t.status === STATUS.PENDING && depsMet(t, tasks))
      .sort((a, b) => (a.priority || 3) - (b.priority || 3));
    return ready[0] || null;
  }

  /** Executa a próxima tarefa pronta do objetivo (serial). */
  async function executeNext(goalId) {
    if (!executeTask) return { ok: false, error: "executeTask não configurado" };
    const task = nextReady(goalId);
    if (!task) return { ok: false, error: "nenhuma tarefa pronta", done: isGoalDone(goalId) };
    await updateTask(task.id, { status: STATUS.RUNNING });
    logger.info(`[planner] executando: ${task.title}`);
    let res;
    try {
      res = await Promise.resolve(executeTask(task));
    } catch (e) {
      res = { ok: false, error: e.message };
    }
    if (res && res.ok) {
      await updateTask(task.id, { status: STATUS.DONE, result: res.result ?? null });
    } else {
      await updateTask(task.id, { status: STATUS.FAILED, error: (res && res.error) || "falha desconhecida" });
    }
    return { ok: true, task: getTask(task.id).task };
  }

  function isGoalDone(goalId) {
    const tasks = listTasks({ goalId });
    if (tasks.length === 0) return true;
    return tasks.every((t) => t.status === STATUS.DONE || t.status === STATUS.FAILED || t.status === STATUS.CANCELLED);
  }

  /** Executa serialmente todas as tarefas prontas até o fim do objetivo. */
  async function runGoal(goalId) {
    const executed = [];
    let guard = 0;
    while (guard++ < 200) {
      const task = nextReady(goalId);
      if (!task) break;
      const res = await executeNext(goalId);
      executed.push({ id: res.task?.id, title: res.task?.title, status: res.task?.status });
    }
    const tasks = listTasks({ goalId });
    return {
      ok: true,
      executed,
      counts: {
        total: tasks.length,
        done: tasks.filter((t) => t.status === STATUS.DONE).length,
        failed: tasks.filter((t) => t.status === STATUS.FAILED).length,
        pending: tasks.filter((t) => t.status === STATUS.PENDING).length,
      },
    };
  }

  /** Plano a partir de um objetivo via LLM (cria as tarefas com dependências). */
  async function plan(goal, context = "") {
    if (!planWith) return { ok: false, error: "plan não configurado" };
    let items;
    try {
      items = await Promise.resolve(planWith(goal, context));
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!Array.isArray(items) || items.length === 0) return { ok: false, error: "plano vazio" };
    const created = [];
    const idsByIndex = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const deps = (item.dependencies || []).map((idx) => idsByIndex[idx]).filter(Boolean);
      const res = await createTask({
        goalId: item.goalId || goal,
        title: item.title,
        description: item.description || "",
        agent: item.agent || null,
        priority: item.priority ?? 3,
        dependencies: deps,
      });
      idsByIndex[i] = res.task?.id || null;
      if (res.ok) created.push(res.task);
    }
    return { ok: true, tasks: created };
  }

  /** Revisão do objetivo: resumo dos resultados (LLM opcional). */
  async function review(goalId, reviewWith = null) {
    const tasks = listTasks({ goalId });
    const fn = reviewWith || opts.review || null;
    const summary = {
      goalId,
      total: tasks.length,
      done: tasks.filter((t) => t.status === STATUS.DONE).length,
      failed: tasks.filter((t) => t.status === STATUS.FAILED).length,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, result: t.result, error: t.error })),
    };
    if (fn) {
      const text = await Promise.resolve(fn(summary)).catch(() => null);
      if (text) summary.review = text;
    }
    return { ok: true, summary };
  }

  function stats() {
    const records = load();
    const byStatus = {};
    for (const r of records) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    return { total: records.length, byStatus, goals: new Set(records.map((r) => r.goalId)).size };
  }

  return { createTask, listTasks, getTask, updateTask, executeNext, runGoal, plan, review, stats, load, nextReady, isGoalDone };
}

/** Chave composta: goal + título (identidade do upsert). */
function makeTaskId(goalId, title) {
  return ["task", goalId || "default", title].join("::");
}

module.exports = { createPlannerEngine, defaultFileStore, makeTaskId, STATUS };

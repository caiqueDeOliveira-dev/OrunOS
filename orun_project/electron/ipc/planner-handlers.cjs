// electron/ipc/planner-handlers.cjs
// Handlers IPC do Planner Engine (Módulo 4 — orquestrador serial).

function register(ipcMain, ctx) {
  // ctx.plannerEngine é lido em runtime (getter em main.cjs) — nunca null.
  const planner = () => ctx.plannerEngine;

  ipcMain.handle("planner:create", async (_event, opts) =>
    planner().createTask({
      goalId: opts?.goalId,
      title: opts?.title,
      description: opts?.description,
      agent: opts?.agent ?? null,
      priority: opts?.priority ?? 3,
      dependencies: opts?.dependencies ?? [],
    })
  );

  ipcMain.handle("planner:list", async (_event, opts) =>
    planner().listTasks({ goalId: opts?.goalId ?? null, status: opts?.status ?? null })
  );

  ipcMain.handle("planner:get", async (_event, { id }) => planner().getTask(id));
  ipcMain.handle("planner:update", async (_event, { id, patch }) => planner().updateTask(id, patch || {}));
  ipcMain.handle("planner:next", async (_event, { goalId }) => {
    const res = await planner().executeNext(goalId);
    if (ctx.analytics) {
      const t = res && res.task;
      ctx.analytics.logEvent({
        type: t && t.status === "done" ? "planner:task_done" : "planner:task_failed",
        agent: t?.agent || null,
        detail: t?.title || res?.error || "",
      });
    }
    return res;
  });
  ipcMain.handle("planner:run", async (_event, { goalId }) => {
    const res = await planner().runGoal(goalId);
    if (ctx.analytics && res) {
      ctx.analytics.logEvent({
        type: "planner:run",
        agent: "System",
        detail: `goalId=${goalId} done=${res.counts?.done} failed=${res.counts?.failed}`,
      });
    }
    return res;
  });
  ipcMain.handle("planner:plan", async (_event, { goal, context }) => {
    const res = await planner().plan(goal, context || "");
    if (ctx.analytics) {
      ctx.analytics.logEvent({ type: res.ok ? "planner:plan" : "planner:plan_failed", agent: "System", detail: String(goal).slice(0, 300) });
    }
    return res;
  });
  ipcMain.handle("planner:review", async (_event, { goalId }) => planner().review(goalId));
  ipcMain.handle("planner:stats", () => planner().stats());
}

module.exports = { register };

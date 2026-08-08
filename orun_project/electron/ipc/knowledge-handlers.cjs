// electron/ipc/knowledge-handlers.cjs
// Handlers IPC do Knowledge Engine (Módulo 3 — hub de docs auto-gerados).

function register(ipcMain, ctx) {
  // ctx.knowledgeEngine é lido em runtime (getter em main.cjs) — nunca null.
  const knowledge = () => ctx.knowledgeEngine;

  ipcMain.handle("knowledge:save", async (_event, doc) => {
    const res = knowledge().save(doc || {});
    if (res.ok && ctx.analytics) ctx.analytics.logEvent({ type: "knowledge:save", agent: doc?.agent || null, detail: `${doc?.kind || ""} ${String(doc?.title || "").slice(0, 200)}` });
    return res;
  });

  ipcMain.handle("knowledge:changelog", async (_event, opts) =>
    knowledge().generateChangelog({
      repoPath: opts?.repoPath,
      sinceDays: opts?.sinceDays ?? 30,
      title: opts?.title,
      date: opts?.date,
    })
  );

  ipcMain.handle("knowledge:diary", async (_event, opts) =>
    knowledge().generateDiary({
      date: opts?.date,
      repoPath: opts?.repoPath,
      memories: opts?.memories,
      title: opts?.title,
    })
  );

  ipcMain.handle("knowledge:adr", async (_event, opts) =>
    knowledge().recordADR({
      title: opts?.title,
      context: opts?.context,
      decision: opts?.decision,
      consequences: opts?.consequences,
      status: opts?.status,
    })
  );

  ipcMain.handle("knowledge:list", async (_event, opts) => knowledge().list({ kind: opts?.kind ?? null }));
  ipcMain.handle("knowledge:get", async (_event, { id }) => knowledge().get({ id }));
  ipcMain.handle("knowledge:remove", async (_event, { id }) => knowledge().remove({ id }));
  ipcMain.handle("knowledge:stats", () => knowledge().stats());
}

module.exports = { register };

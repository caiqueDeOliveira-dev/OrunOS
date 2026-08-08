// electron/ipc/memory-handlers.cjs
// Handlers IPC do Memory Engine (Módulo 2 — memória de longo prazo).

function register(ipcMain, ctx) {
  // ctx.memoryEngine é lido em runtime (getter em main.cjs) — nunca null.
  const memory = () => ctx.memoryEngine;

  ipcMain.handle("memory:save", async (_event, entry) => memory().save(entry || {}));

  ipcMain.handle("memory:search", async (_event, opts) =>
    memory().search({
      query: opts?.query,
      scopeAgent: opts?.scopeAgent ?? null,
      scopeProject: opts?.scopeProject ?? null,
      topK: opts?.topK ?? 5,
      threshold: opts?.threshold ?? 0,
    })
  );

  ipcMain.handle("memory:inject", async (_event, opts) =>
    memory().injectForPrompt({
      query: opts?.query,
      scopeAgent: opts?.scopeAgent ?? null,
      scopeProject: opts?.scopeProject ?? null,
      topK: opts?.topK ?? 5,
      maxChars: opts?.maxChars ?? 1500,
    })
  );

  ipcMain.handle("memory:consolidate", async (_event, opts) =>
    memory().consolidate({
      scopeAgent: opts?.scopeAgent ?? null,
      scopeProject: opts?.scopeProject ?? null,
      minAgeMs: opts?.minAgeMs,
    })
  );

  ipcMain.handle("memory:remove", async (_event, { id }) => memory().remove({ id }));
  ipcMain.handle("memory:stats", () => memory().stats());

  // Lista todas as memórias (para a UI de memória — Fase 2), com metadados
  // básicos e sem os embeddings (evita trafegar 768 floats por linha).
  ipcMain.handle("memory:list", () => {
    const records = memory().load();
    return records
      .map(({ id, uid, key, content, tags, scopeAgent, scopeProject, source, access_count, created_at, updated_at }) => ({
        id, uid, key, content, tags, scopeAgent, scopeProject, source,
        access_count: access_count || 0, created_at, updated_at,
      }))
      .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  });
}

module.exports = { register };

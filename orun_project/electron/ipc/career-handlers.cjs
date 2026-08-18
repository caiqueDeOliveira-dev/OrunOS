// electron/ipc/career-handlers.cjs
// IPC do agente Carreiras: vagas, perfis e estatísticas de candidatura.

const career = require("../career.cjs");

function register(ipcMain, ctx) {
  const { log } = ctx;

  ipcMain.handle("career:get-state", () => {
    return career.getState();
  });

  ipcMain.handle("career:get-stats", () => {
    return career.getStats();
  });

  ipcMain.handle("career:list-jobs", (_event, opts) => {
    return career.listJobs(opts || {});
  });

  ipcMain.handle("career:add-job", (_event, job) => {
    const result = career.addJob(job || {});
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, job: result.job };
  });

  ipcMain.handle("career:update-status", (_event, id, status) => {
    const result = career.updateJobStatus(id, status);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, job: result.job };
  });

  ipcMain.handle("career:remove-job", (_event, id) => {
    const result = career.removeJob(id);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true };
  });

  ipcMain.handle("career:get-profile", (_event, profileKey) => {
    return { profile: career.getProfile(profileKey) };
  });

  ipcMain.handle("career:save-profile", (_event, profileKey, data) => {
    const result = career.saveProfile(profileKey, data || {});
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, profile: result.profile };
  });

  ipcMain.handle("career:generate-profile", (_event, profileKey) => {
    return career.generateProfileContent(profileKey);
  });

  ipcMain.handle("career:prepare-application", (_event, jobId, profileKey, querySummary) => {
    return career.prepareApplication(jobId, profileKey, { querySummary });
  });

  ipcMain.handle("career:search-jobs", async (_event, query, profileKey, limit) => {
    try {
      const result = await career.searchJobs(query, profileKey, { limit });
      if (result.error) return { ok: false, error: result.error };
      return { ok: true, candidates: result.candidates || [], total: result.total || 0 };
    } catch (err) {
      log.warn("[career] busca de vagas falhou:", err.message);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { register };

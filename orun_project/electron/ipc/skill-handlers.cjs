// electron/ipc/skill-handlers.cjs
// Handlers IPC do Skill Manager (Módulo 1 — contrato de extensão).

const fs = require("fs");
const path = require("path");

function register(ipcMain, ctx) {
  // ctx.skillManager é lido em runtime (getter em main.cjs) — nunca null.
  const getSkillManager = () => ctx.skillManager;
  const { app } = ctx;

  ipcMain.handle("skills:list", () => getSkillManager().list());

  ipcMain.handle("skills:details", (_event, { id }) => {
    if (typeof id !== "string") return { ok: false, error: "id é obrigatório" };
    return getSkillManager().details(id);
  });

  ipcMain.handle("skills:install", async (_event, { srcDir, force }) => {
    if (typeof srcDir !== "string" || !srcDir) return { ok: false, error: "srcDir é obrigatório" };
    const result = getSkillManager().installFromDir(srcDir, { force: Boolean(force) });
    if (result.ok) {
      getSkillManager().reload();
      if (ctx.analytics) ctx.analytics.logEvent({ type: "skills:install", detail: srcDir });
    }
    return result;
  });

  ipcMain.handle("skills:install-dialog", async () => {
    try {
      const { dialog } = require("electron");
      const win = ctx.mainWindow || null;
      const res = win
        ? await dialog.showOpenDialog(win, { properties: ["openDirectory"], title: "Selecione a pasta da skill (com manifest.json)" })
        : await dialog.showOpenDialog({ properties: ["openDirectory"], title: "Selecione a pasta da skill (com manifest.json)" });
      if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false, canceled: true };
      const srcDir = res.filePaths[0];
      const result = getSkillManager().installFromDir(srcDir, { force: false });
      if (result.ok) getSkillManager().reload();
      return result;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("skills:uninstall", (_event, { id, force }) => {
    if (typeof id !== "string") return { ok: false, error: "id é obrigatório" };
    const result = getSkillManager().uninstall(id);
    if (result.ok) getSkillManager().reload();
    return result;
  });

  ipcMain.handle("skills:set-enabled", (_event, { id, enabled }) => {
    if (typeof id !== "string") return { ok: false, error: "id é obrigatório" };
    const result = getSkillManager().setEnabled(id, Boolean(enabled));
    if (result.ok) getSkillManager().reload();
    return result;
  });

  ipcMain.handle("skills:reload", () => getSkillManager().reload());

  ipcMain.handle("skills:tools", () => getSkillManager().surfaceTools());

  // Caminho da pasta de skills (para exibir/abrir no gerenciador de arquivos)
  ipcMain.handle("skills:dir", () => getSkillManager().dir);
  ipcMain.handle("skills:open-dir", async () => {
    const { shell } = require("electron");
    const dir = getSkillManager().dir;
    if (!dir || !fs.existsSync(dir)) return { ok: false, error: "pasta de skills não existe" };
    shell.openPath(dir);
    return { ok: true, dir };
  });
}

module.exports = { register };

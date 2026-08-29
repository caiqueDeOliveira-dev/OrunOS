// electron/ipc/github-handlers.cjs
//
// GitHub Control Center — IPC bridge between the renderer (Orun Code) and
// the GitHub service. The token lives only in the keychain (secret-store,
// slot "orun.github.token") and is never sent to the renderer.

const github = require("../github-service.cjs");

const GITHUB_TOKEN_SLOT = "orun.github.token";
const MAX_TOKEN_LEN = 500;
const MAX_STR_LEN = 400;

function clean(v) {
  return String(v || "").trim().slice(0, MAX_STR_LEN);
}

function register(ipcMain, ctx) {
  const log = ctx && ctx.log ? ctx.log : { info() {}, warn() {} };
  const getToken = () =>
    ctx && ctx.secretStore && typeof ctx.secretStore.get === "function"
      ? ctx.secretStore.get(GITHUB_TOKEN_SLOT)
      : Promise.resolve(null);

  ipcMain.handle("github:status", async () => {
    const token = await getToken();
    if (!token) return { ok: true, connected: false };
    const st = await github.getAuthStatus(token);
    if (!st.ok) {
      return { ok: true, connected: false, error: st.error, status: st.status };
    }
    return { ok: true, connected: true, user: st.user };
  });

  ipcMain.handle("github:connect", async (_event, payload) => {
    const token = clean(payload && payload.token);
    if (!token) return { ok: false, error: "Informe um token de acesso do GitHub." };
    if (token.length > MAX_TOKEN_LEN) return { ok: false, error: "Token inválido." };
    const st = await github.getAuthStatus(token);
    if (!st.ok) {
      return { ok: false, error: st.error, status: st.status };
    }
    await ctx.secretStore.set(GITHUB_TOKEN_SLOT, token);
    log.info(`[github] conectado como @${st.user ? st.user.login : "?"}`);
    return { ok: true, user: st.user };
  });

  ipcMain.handle("github:disconnect", async () => {
    await ctx.secretStore.del(GITHUB_TOKEN_SLOT);
    log.info("[github] desconectado");
    return { ok: true };
  });

  ipcMain.handle("github:list-repos", async (_event, opts) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const res = await github.listRepos(token, opts || {});
    return res;
  });

  ipcMain.handle("github:repo-info", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    return github.getRepo(token, clean(payload && payload.owner), clean(payload && payload.repo));
  });

  ipcMain.handle("github:doctor", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const staleDays = Math.min(Math.max(Number((payload || {}).staleDays) || 90, 1), 1095);
    return github.doctorReport(token, { staleDays });
  });

  ipcMain.handle("github:update-repo", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const owner = clean(payload && payload.owner);
    const repo = clean(payload && payload.repo);
    if (!owner || !repo) return { ok: false, error: "owner e repo são obrigatórios" };
    const patch = {};
    const p = payload || {};
    if (Object.prototype.hasOwnProperty.call(p, "archived")) patch.archived = !!p.archived;
    if (typeof p.description === "string") patch.description = p.description.slice(0, 120);
    return github.updateRepo(token, owner, repo, patch);
  });

  ipcMain.handle("github:list-branches", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    return github.listBranches(token, clean(payload && payload.owner), clean(payload && payload.repo));
  });

  ipcMain.handle("github:delete-repo", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const owner = clean(payload && payload.owner);
    const repo = clean(payload && payload.repo);
    const confirmName = clean(payload && payload.confirmName);
    const res = await github.deleteRepo(token, owner, repo, confirmName);
    if (res.ok) log.info(`[github] repositório excluído: ${owner}/${repo}`);
    return res;
  });

  ipcMain.handle("github:clone", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const url = clean(payload && payload.url);
    const dest = clean(payload && payload.dest);
    if (!/^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+(?:\/)?$/.test(url)) {
      return { ok: false, error: "URL inválida. Use https://github.com/owner/repo" };
    }
    if (!dest) return { ok: false, error: "Diretório de destino é obrigatório." };
    return github.cloneGit(token, url.replace(/\/$/, ""), dest);
  });

  ipcMain.handle("github:fetch", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const ws = clean(payload && payload.workspace);
    if (!ws) return { ok: false, error: "workspace é obrigatório." };
    return github.fetchGit(ws, token);
  });

  ipcMain.handle("github:pull", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const ws = clean(payload && payload.workspace);
    if (!ws) return { ok: false, error: "workspace é obrigatório." };
    return github.pullGit(ws, token, clean(payload.branch));
  });

  ipcMain.handle("github:push", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const ws = clean(payload && payload.workspace);
    if (!ws) return { ok: false, error: "workspace é obrigatório." };
    return github.pushGit(ws, token, clean(payload.branch) || null);
  });

  ipcMain.handle("github:configure-git", async (_event, payload) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "not-authenticated" };
    const ws = clean(payload && payload.workspace);
    if (!ws) return { ok: false, error: "workspace é obrigatório." };
    return github.configureCredentialHelper(ws);
  });
}

module.exports = { register };
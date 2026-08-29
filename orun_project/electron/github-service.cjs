// electron/github-service.cjs
//
// GitHub Control Center — REST client (official GitHub API) + git credential
// integration. Node-pure (no electron import) so it can be tested with vitest.
//
// Safety rules:
//   - The token is ALWAYS passed explicitly. The main process owns keychain
//     storage via secret-store.cjs — this module never reads/writes disk.
//   - No function ever returns or logs the token.
//   - Destructive operations (deleteRepo) require an explicit `confirmName`
//     that must match "owner/repo" exactly.

const { execFileSync } = require("child_process");
const path = require("path");
const http = require("http");
const https = require("https");

let GH_BASE = "https://api.github.com";
const GIT = "git";
const REQUEST_TIMEOUT = 15000;
const GIT_TIMEOUT = 60000;
const GIT_MAX_BUFFER = 4 * 1024 * 1024;

/** Test-only hook: point the API client at a local mock server. */
function setBaseUrl(url) {
  GH_BASE = url;
}

/**
 * The credential helper value stored in the repo's git config (never the
 * token itself — only a reference to the ORUN_GITHUB_TOKEN env var, which
 * the main process injects when running git).
 */
const CREDENTIAL_HELPER =
  '!f() { test "$1" = get && echo "username=x-access-token" && echo "password=$ORUN_GITHUB_TOKEN"; }; f';

// ── GitHub REST API ─────────────────────────────────────────────────────

function ghRequest(method, pathname, token, body) {
  return new Promise((resolve) => {
    const isHttps = GH_BASE.startsWith("https:");
    const lib = isHttps ? https : http;
    const req = lib.request(GH_BASE + pathname, {
      method,
      timeout: REQUEST_TIMEOUT,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "OrunOS (orun desktop)",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { /* non-json */ }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode, data: parsed });
        } else {
          const message = (parsed && (parsed.message || parsed.error)) || `HTTP ${res.statusCode}`;
          resolve({ ok: false, status: res.statusCode, error: message, data: parsed });
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, error: "Timeout ao consultar a API do GitHub" });
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Mappers (normalize API fields → Orun Code types) ────────────────────

function mapUser(u) {
  return {
    login: u.login,
    name: u.name || null,
    avatarUrl: u.avatar_url || null,
    htmlUrl: u.html_url || null,
  };
}

function mapRepo(r) {
  return {
    fullName: r.full_name,
    name: r.name,
    owner: (r.owner && r.owner.login) || null,
    description: r.description || null,
    language: r.language || null,
    privateRepo: !!r.private,
    fork: !!r.fork,
    archived: !!r.archived,
    defaultBranch: r.default_branch || null,
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    openIssues: r.open_issues_count || 0,
    pushedAt: r.pushed_at || null,
    updatedAt: r.updated_at || null,
    sizeKB: r.size || 0,
    htmlUrl: r.html_url || null,
    empty: (r.size || 0) === 0,
  };
}

// ── Auth / read-only endpoints ──────────────────────────────────────────

/** Validate a token and return the connected user (never the token). */
async function getAuthStatus(token) {
  if (!token || typeof token !== "string") {
    return { ok: false, authenticated: false, error: "no-token" };
  }
  const res = await ghRequest("GET", "/user", token);
  if (!res.ok) {
    return { ok: false, authenticated: false, error: res.error, status: res.status };
  }
  return { ok: true, authenticated: true, user: mapUser(res.data) };
}

/** Public profile of any GitHub user (token optional). Omit login → /user. */
async function getUser(token, login) {
  const endpoint = login ? `/users/${encodeURIComponent(String(login))}` : "/user";
  const res = await ghRequest("GET", endpoint, token || "");
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  return { ok: true, user: mapUser(res.data) };
}

/** Repos visible to the token (default: sort by last update). */
async function listRepos(token, opts = {}) {
  if (!token) return { ok: false, error: "no-token" };
  const q = new URLSearchParams();
  q.set("per_page", String(Math.min(Number(opts.perPage) || 100, 100)));
  q.set("sort", opts.sort || "updated");
  q.set("affiliation", opts.affiliation || "owner,collaborator");
  const res = await ghRequest("GET", `/user/repos?${q.toString()}`, token);
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  const repos = (Array.isArray(res.data) ? res.data : []).map(mapRepo);
  return { ok: true, total: repos.length, repos };
}

async function getRepo(token, owner, repo) {
  if (!owner || !repo) return { ok: false, error: "owner e repo são obrigatórios" };
  const slug = encodeURIComponent(String(owner)) + "/" + encodeURIComponent(String(repo));
  const res = await ghRequest("GET", `/repos/${slug}`, token);
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  return { ok: true, repo: mapRepo(res.data) };
}

// ── Repo Doctor (Fase 2) ────────────────────────────────────────────────

/** Branch names of a repo (for the empty/has-commits check). */
async function listBranches(token, owner, repo) {
  const slug = encodeURIComponent(String(owner)) + "/" + encodeURIComponent(String(repo));
  const res = await ghRequest("GET", `/repos/${slug}/branches?per_page=100`, token);
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  const branches = (Array.isArray(res.data) ? res.data : []).map((b) => b && b.name).filter(Boolean);
  return { ok: true, branches, defaultBranch: res.data && res.data.length ? true : false };
}

/** PATCH repo settings. Only allowed fields; renames are intentionally off. */
async function updateRepo(token, owner, repo, patch = {}) {
  const allowed = ["archived", "description"];
  const body = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) body[key] = patch[key];
  }
  if (Object.keys(body).length === 0) return { ok: false, error: "Nada para atualizar." };
  const slug = encodeURIComponent(String(owner)) + "/" + encodeURIComponent(String(repo));
  const res = await ghRequest("PATCH", `/repos/${slug}`, token, body);
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  return { ok: true, repo: mapRepo(res.data), updated: Object.keys(body) };
}

function daysSince(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!t) return Infinity;
  return Math.floor((Date.now() - t) / 86400000);
}

/**
 * Pure health analysis of a single repo (no I/O) — easy to unit test.
 * severity: high = destructive/likely cleanup, medium = flag, low/info = polish.
 */
function repoHealth(repo, branches, staleDays) {
  const issues = [];
  const hasBranches = Array.isArray(branches) && branches.length > 0;
  const stale = daysSince(repo.pushedAt);

  if (!repo.archived && !hasBranches) {
    issues.push({ code: "empty", label: "Sem commits/branches — candidato a exclusão", severity: "high", action: "excluir" });
  } else if (!repo.archived && stale > Number(staleDays)) {
    issues.push({ code: "stale", label: `Sem push há ${stale} dias`, severity: "medium", action: "arquivar" });
  }
  if (repo.archived) {
    issues.push({ code: "archived", label: "Arquivado (read-only)", severity: "info", action: "desarquivar" });
  }
  if (!repo.description) {
    issues.push({ code: "noDescription", label: "Sem descrição", severity: "low", action: "adicionar descrição" });
  }
  if (!hasBranches) {
    issues.push({ code: "noDefaultBranch", label: "Sem branch padrão", severity: "info", action: "" });
  }
  return { repo, issues, hasBranches };
}

function mapLimit(items, limit, fn) {
  return items.reduce(async (acc, item, i) => {
    const arr = await acc;
    if (i % limit === 0) await new Promise((r) => setTimeout(r, 0));
    arr.push(await fn(item));
    return arr;
  }, Promise.resolve([]));
}

/**
 * Doctor report: repos + branches → health rows grouped into actionable
 * buckets. Read-only (no alteration). Branches are fetched with bounded
 * concurrency to avoid hammering the API.
 */
async function doctorReport(token, opts = {}) {
  if (!token) return { ok: false, error: "no-token" };
  const staleDays = Math.min(Math.max(Number(opts.staleDays) || 90, 1), 1095);
  const listed = await listRepos(token, { sort: "pushed", affiliation: "owner", perPage: 100 });
  if (!listed.ok) return { ok: false, error: listed.error, status: listed.status };

  const rows = await mapLimit(listed.repos, 5, async (repo) => {
    const b = await listBranches(token, repo.owner, repo.name);
    return repoHealth(repo, b.ok ? b.branches : [], staleDays);
  });

  const empty = rows.filter((r) => r.issues.some((i) => i.code === "empty"));
  const stale = rows.filter((r) => !r.issues.some((i) => i.code === "empty") && r.issues.some((i) => i.code === "stale"));
  const attention = rows.filter((r) => r.issues.some((i) => i.code === "noDescription"));
  const archived = rows.filter((r) => r.issues.some((i) => i.code === "archived"));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    staleDays,
    rows,
    counts: {
      checked: rows.length,
      empty: empty.length,
      stale: stale.length,
      attention: attention.length,
      archived: archived.length,
    },
    empty,
    stale,
    attention,
    archived,
  };
}

/** Compact doctor report for agent tools (trimmed, no internals). */
function summarizeDoctorReport(report) {
  const line = (r) =>
    `${r.repo.fullName}: ${r.issues.map((i) => i.code).join(", ") || "ok"}`;
  return {
    ok: true,
    generatedAt: report.generatedAt,
    staleDays: report.staleDays,
    counts: report.counts,
    empty: report.empty.map(line),
    stale: report.stale.map(line),
    attention: report.attention.map(line),
  };
}

// ── Destructive (guarded) ───────────────────────────────────────────────

function confirmNameMatches(owner, repo, confirmName) {
  return String(confirmName || "").trim() === `${String(owner)}/${String(repo)}`;
}

/**
 * Delete a repository. Irreversible. Requires confirmName === "owner/repo"
 * typed exactly — the renderer shows a hard confirmation modal, and this
 * guard also protects against accidental agent/devtools calls.
 */
async function deleteRepo(token, owner, repo, confirmName) {
  if (!owner || !repo) return { ok: false, error: "owner e repo são obrigatórios" };
  if (!confirmNameMatches(owner, repo, confirmName)) {
    return {
      ok: false,
      guard: "confirm-name",
      error: `Confirmação inválida. Digite exatamente "${owner}/${repo}".`,
    };
  }
  const slug = encodeURIComponent(String(owner)) + "/" + encodeURIComponent(String(repo));
  const res = await ghRequest("DELETE", `/repos/${slug}`, token);
  if (!res.ok) return { ok: false, error: res.error, status: res.status };
  return { ok: true, deleted: `${owner}/${repo}` };
}

// ── Git integration (token injected via env, never written to disk) ─────

function gitRun(cwd, args, token, opts = {}) {
  try {
    const output = execFileSync(GIT, args, {
      encoding: "utf8",
      cwd,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
      timeout: opts.timeout || GIT_TIMEOUT,
      env: { ...process.env, ORUN_GITHUB_TOKEN: token || "" },
    });
    return { ok: true, output: output.trim() };
  } catch (err) {
    const detail = (err.stderr && err.stderr.toString().trim()) || err.message || String(err);
    return { ok: false, error: detail.slice(0, 500) };
  }
}

/** Point the repo at the ORUN_GITHUB_TOKEN credential helper (idempotent). */
function configureCredentialHelper(workspace) {
  const res = gitRun(workspace, ["config", "credential.helper", CREDENTIAL_HELPER], "");
  if (!res.ok) return res;
  return {
    ok: true,
    message: "Credencial configurada (o token é injetado no ambiente; nunca gravado em disco).",
  };
}

/** Clone a GitHub repo. Safe: token only lives in process env of the clone. */
function cloneGit(token, cloneUrl, destDir) {
  const parent = path.dirname(path.resolve(destDir));
  const args = ["-c", `credential.helper=${CREDENTIAL_HELPER}`, "clone", cloneUrl, path.resolve(destDir)];
  return gitRun(parent, args, token, { timeout: 120000 });
}

function fetchGit(workspace, token) {
  configureCredentialHelper(workspace);
  const res = gitRun(workspace, ["fetch", "--all", "--prune"], token, { timeout: 120000 });
  return res.ok
    ? { ok: true, message: res.output || "Fetch concluído." }
    : res;
}

function pullGit(workspace, token, branch) {
  configureCredentialHelper(workspace);
  const args = ["pull", "--ff-only"];
  if (branch) args.push("origin", String(branch));
  const res = gitRun(workspace, args, token, { timeout: 120000 });
  return res.ok
    ? { ok: true, message: res.output || "Pull concluído." }
    : res;
}

/** Push. Force push is intentionally not supported. */
function pushGit(workspace, token, branch, setUpstream = true) {
  configureCredentialHelper(workspace);
  const args = ["push"];
  if (branch && setUpstream) args.push("-u");
  args.push("origin");
  args.push(branch || "HEAD");
  const res = gitRun(workspace, args, token, { timeout: 120000 });
  return res.ok
    ? { ok: true, message: res.output || "Push concluído.", pushed: branch || "HEAD" }
    : res;
}

module.exports = {
  setBaseUrl,
  ghRequest,
  getAuthStatus,
  getUser,
  listRepos,
  getRepo,
  listBranches,
  updateRepo,
  repoHealth,
  doctorReport,
  summarizeDoctorReport,
  deleteRepo,
  confirmNameMatches,
  configureCredentialHelper,
  cloneGit,
  fetchGit,
  pullGit,
  pushGit,
  mapUser,
  mapRepo,
  CREDENTIAL_HELPER,
};
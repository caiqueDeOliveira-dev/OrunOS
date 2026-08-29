const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const github = require("../github-service.cjs");

const TOKEN = "ghp_test_secret_token";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orun-github-"));
}

function hasGit() {
  try {
    execFileSync("git", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

const gitSuite = hasGit() ? describe : describe.skip;

/** In-memory fake of the GitHub REST surface we consume. */
function createMockServer() {
  const STALE_DAY = new Date(Date.now() - 130 * 864e5).toISOString();
  const FRESH_DAY = new Date(Date.now() - 5 * 864e5).toISOString();
  const repos = [
    {
      full_name: "caique/orun-os",
      name: "orun-os",
      owner: { login: "caique" },
      description: "Desktop multi-agente",
      language: "TypeScript",
      private: true,
      fork: false,
      archived: false,
      default_branch: "main",
      stargazers_count: 3,
      forks_count: 1,
      open_issues_count: 0,
      pushed_at: STALE_DAY,
      updated_at: "2026-08-01T10:00:00Z",
      size: 4200,
      html_url: "https://github.com/caique/orun-os",
    },
    {
      full_name: "caique/empty-repo",
      name: "empty-repo",
      owner: { login: "caique" },
      description: null,
      language: null,
      private: false,
      fork: false,
      archived: false,
      default_branch: "main",
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      pushed_at: null,
      updated_at: "2026-07-01T10:00:00Z",
      size: 0,
      html_url: "https://github.com/caique/empty-repo",
    },
    {
      full_name: "caique/readme-heavy",
      name: "readme-heavy",
      owner: { login: "caique" },
      description: "Repo com readme mas sem linguagem",
      language: null,
      private: false,
      fork: false,
      archived: false,
      default_branch: "main",
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      pushed_at: FRESH_DAY,
      updated_at: FRESH_DAY,
      size: 90,
      html_url: "https://github.com/caique/readme-heavy",
    },
  ];
  const branches = {
    "orun-os": [{ name: "main" }, { name: "dev" }],
    "empty-repo": [],
    "readme-heavy": [{ name: "main" }],
  };
  let deleted = [];

  const server = http.createServer((req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };

    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: "Bad credentials" });

    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/user") {
      return send(200, { login: "caique", name: "Caique", avatar_url: "https://example.com/a.png", html_url: "https://github.com/caique" });
    }
    if (req.method === "GET" && url.pathname === "/user/repos") {
      return send(200, repos);
    }
    const branchMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/branches$/);
    if (branchMatch && req.method === "GET") {
      const r = repos.find((x) => x.owner.login === branchMatch[1] && x.name === branchMatch[2]);
      if (!r) return send(404, { message: "Not Found" });
      return send(200, branches[r.name] || []);
    }
    const repoMatch = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)$/);
    if (repoMatch) {
      const r = repos.find((x) => x.owner.login === repoMatch[1] && x.name === repoMatch[2]);
      if (!r) return send(404, { message: "Not Found" });
      if (req.method === "GET") return send(200, r);
      if (req.method === "DELETE") {
        deleted.push(`${repoMatch[1]}/${repoMatch[2]}`);
        return send(204, null);
      }
      if (req.method === "PATCH") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const patch = JSON.parse(body || "{}");
          if (Object.prototype.hasOwnProperty.call(patch, "archived")) r.archived = !!patch.archived;
          if (typeof patch.description === "string") r.description = patch.description;
          return send(200, r);
        });
        return;
      }
    }
    return send(404, { message: "Not Found" });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        base: `http://127.0.0.1:${server.address().port}`,
        repoCount: repos.length,
        server,
        getDeleted: () => deleted,
      });
    });
  });
}

describe("github-service.cjs", () => {
  let mock;
  beforeAll(async () => {
    mock = await createMockServer();
    github.setBaseUrl(mock.base);
  });
  afterAll(() => {
    github.setBaseUrl("https://api.github.com");
    if (mock) mock.server.close();
  });

  it("getAuthStatus autentica e NUNCA devolve o token", async () => {
    const res = await github.getAuthStatus(TOKEN);
    expect(res.ok).toBe(true);
    expect(res.authenticated).toBe(true);
    expect(res.user.login).toBe("caique");
    expect(JSON.stringify(res)).not.toContain(TOKEN);
  });

  it("getAuthStatus sem token → not authenticated", async () => {
    const res = await github.getAuthStatus(null);
    expect(res.ok).toBe(false);
    expect(res.authenticated).toBe(false);
    expect(res.error).toBe("no-token");
  });

  it("getAuthStatus com token inválido → erro 401", async () => {
    const res = await github.getAuthStatus("ghp_errado");
    expect(res.ok).toBe(false);
    expect(res.authenticated).toBe(false);
    expect(res.status).toBe(401);
  });

  it("listRepos normaliza os campos do GitHub", async () => {
    const res = await github.listRepos(TOKEN, { sort: "updated", perPage: 100 });
    expect(res.ok).toBe(true);
    expect(res.total).toBe(mock.repoCount);
    const r = res.repos[0];
    expect(r.fullName).toBe("caique/orun-os");
    expect(r.privateRepo).toBe(true);
    expect(r.language).toBe("TypeScript");
    expect(r.defaultBranch).toBe("main");
    expect(r.sizeKB).toBe(4200);
    const empty = res.repos[1];
    expect(empty.empty).toBe(true);
  });

  it("getRepo busca um repositório específico", async () => {
    const res = await github.getRepo(TOKEN, "caique", "orun-os");
    expect(res.ok).toBe(true);
    expect(res.repo.owner).toBe("caique");
    expect(res.repo.stars).toBe(3);
  });

  it("getRepo 404 → erro amigável", async () => {
    const res = await github.getRepo(TOKEN, "caique", "nao-existe");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.error).toBe("Not Found");
  });

  it("listBranches devolve nomes de branch por repo (vazio = sem commits)", async () => {
    const r1 = await github.listBranches(TOKEN, "caique", "orun-os");
    expect(r1.ok).toBe(true);
    expect(r1.branches).toEqual(["main", "dev"]);
    const r2 = await github.listBranches(TOKEN, "caique", "empty-repo");
    expect(r2.ok).toBe(true);
    expect(r2.branches).toEqual([]);
  });

  it("repoHealth classifica empty/stale/archived (função pura)", async () => {
    const empty = github.repoHealth({ fullName: "o/e", pushedAt: null, archived: false, description: "x", sizeKB: 0 }, [], 90);
    expect(empty.issues.map((i) => i.code)).toContain("empty");
    expect(empty.issues.find((i) => i.code === "empty").severity).toBe("high");

    const stale = github.repoHealth({ fullName: "o/s", pushedAt: new Date(Date.now() - 200 * 864e5).toISOString(), archived: false, description: "x" }, ["main"], 90);
    expect(stale.issues.map((i) => i.code)).toContain("stale");

    const fresh = github.repoHealth({ fullName: "o/f", pushedAt: new Date().toISOString(), archived: false, description: "x" }, ["main"], 90);
    const freshCodes = fresh.issues.map((i) => i.code);
    expect(freshCodes).not.toContain("stale");
    expect(freshCodes).not.toContain("empty");

    const arch = github.repoHealth({ fullName: "o/a", pushedAt: null, archived: true, description: null }, ["main"], 90);
    expect(arch.issues.map((i) => i.code)).toContain("archived");
    expect(arch.issues.some((i) => i.code === "empty")).toBe(false);
  });

  it("doctorReport agrupa vazios, obsoletos e atenção", async () => {
    const res = await github.doctorReport(TOKEN, { staleDays: 90 });
    expect(res.ok).toBe(true);
    expect(res.counts.checked).toBe(3);
    expect(res.counts.empty).toBe(1);
    expect(res.counts.stale).toBe(1);
    expect(res.counts.archived).toBe(0);
    expect(res.empty[0].repo.fullName).toBe("caique/empty-repo");
    expect(res.stale[0].repo.fullName).toBe("caique/orun-os");
  });

  it("summarizeDoctorReport produz linhas compactas para o agente", async () => {
    const res = await github.doctorReport(TOKEN, { staleDays: 90 });
    const sum = github.summarizeDoctorReport(res);
    expect(sum.ok).toBe(true);
    expect(sum.stale).toEqual(["caique/orun-os: stale"]);
    expect(JSON.stringify(sum)).not.toContain(TOKEN);
  });

  it("updateRepo arquiva e só aceita campos permitidos", async () => {
    const arch = await github.updateRepo(TOKEN, "caique", "orun-os", { archived: true });
    expect(arch.ok).toBe(true);
    expect(arch.updated).toEqual(["archived"]);
    expect(arch.repo.archived).toBe(true);

    const block = await github.updateRepo(TOKEN, "caique", "orun-os", { name: "hackeado", privateRepo: true });
    expect(block.ok).toBe(false);
    expect(block.error).toBe("Nada para atualizar.");
  });

  it("confirmNameMatches valida owner/repo exato", () => {
    expect(github.confirmNameMatches("caique", "x", "caique/x")).toBe(true);
    expect(github.confirmNameMatches("caique", "x", "caique/x ")).toBe(true);
    expect(github.confirmNameMatches("caique", "x", "caique/xx")).toBe(false);
    expect(github.confirmNameMatches("caique", "x", "Caique/x")).toBe(false);
  });

  it("deleteRepo com confirmação errada NUNCA chama a API", async () => {
    const res = await github.deleteRepo(TOKEN, "caique", "orun-os", "caique/orun-oss");
    expect(res.ok).toBe(false);
    expect(res.guard).toBe("confirm-name");
    expect(mock.getDeleted()).toHaveLength(0);
  });

  it("deleteRepo com confirmação exata exclui", async () => {
    const res = await github.deleteRepo(TOKEN, "caique", "empty-repo", "caique/empty-repo");
    expect(res.ok).toBe(true);
    expect(res.deleted).toBe("caique/empty-repo");
    expect(mock.getDeleted()).toContain("caique/empty-repo");
  });

  it("CREDENTIAL_HELPER referencia env var, jamais o token", () => {
    expect(github.CREDENTIAL_HELPER).toContain("$ORUN_GITHUB_TOKEN");
    expect(github.CREDENTIAL_HELPER).not.toContain(TOKEN);
    expect(github.CREDENTIAL_HELPER).not.toContain("ghp_");
  });

  gitSuite("Git integration (token via env)", () => {
    it("push envia o commit para o remoto e grava helper sem token em disco", () => {
      const bare = path.join(tmpDir(), "origin.git");
      execFileSync("git", ["init", "-q", "--bare", bare]);

      const work = tmpDir();
      execFileSync("git", ["init", "-q", "-b", "main"], { cwd: work });
      execFileSync("git", ["config", "user.email", "test@orun.local"], { cwd: work });
      execFileSync("git", ["config", "user.name", "Orun Test"], { cwd: work });
      fs.writeFileSync(path.join(work, "app.js"), "console.log('oi')\n");
      execFileSync("git", ["add", "."], { cwd: work });
      execFileSync("git", ["commit", "-q", "-m", "feat: inicial"], { cwd: work });
      execFileSync("git", ["remote", "add", "origin", bare], { cwd: work });

      const res = github.pushGit(work, TOKEN, "main");
      expect(res.ok).toBe(true);

      const remoteLog = execFileSync("git", ["--git-dir", bare, "log", "refs/heads/main", "--oneline", "-1"], { encoding: "utf8" });
      expect(remoteLog).toContain("feat: inicial");

      const helper = execFileSync("git", ["config", "credential.helper"], { cwd: work, encoding: "utf8" });
      expect(helper).toContain("$ORUN_GITHUB_TOKEN");
      expect(helper).not.toContain(TOKEN);
    });

    it("fetch traz refs do remoto para um repo vazio", () => {
      const bare = path.join(tmpDir(), "origin2.git");
      execFileSync("git", ["init", "-q", "--bare", bare]);
      const seed = tmpDir();
      execFileSync("git", ["init", "-q"], { cwd: seed });
      execFileSync("git", ["config", "user.email", "t@o.local"], { cwd: seed });
      execFileSync("git", ["config", "user.name", "T"], { cwd: seed });
      fs.writeFileSync(path.join(seed, "a.txt"), "a");
      execFileSync("git", ["add", "."], { cwd: seed });
      execFileSync("git", ["commit", "-q", "-m", "seed"], { cwd: seed });
      execFileSync("git", ["push", "-q", bare, "HEAD:main"], { cwd: seed });

      const work = tmpDir();
      execFileSync("git", ["init", "-q"], { cwd: work });
      execFileSync("git", ["remote", "add", "origin", bare], { cwd: work });

      const res = github.fetchGit(work, TOKEN);
      expect(res.ok).toBe(true);
      const refs = execFileSync("git", ["--git-dir", path.join(work, ".git"), "for-each-ref", "--format=%(refname:short)", "refs/remotes/origin"], { encoding: "utf8" });
      expect(refs).toContain("origin/main");
    });

    it("clone baixa o repositório para o diretório destino", () => {
      const bare = path.join(tmpDir(), "origin3.git");
      execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare]);
      const seed = tmpDir();
      execFileSync("git", ["init", "-q"], { cwd: seed });
      execFileSync("git", ["config", "user.email", "t@o.local"], { cwd: seed });
      execFileSync("git", ["config", "user.name", "T"], { cwd: seed });
      fs.writeFileSync(path.join(seed, "b.txt"), "b");
      execFileSync("git", ["add", "."], { cwd: seed });
      execFileSync("git", ["commit", "-q", "-m", "seed"], { cwd: seed });
      execFileSync("git", ["push", "-q", bare, "HEAD:main"], { cwd: seed });

      const base = tmpDir();
      const dest = path.join(base, "clonado");
      const res = github.cloneGit(TOKEN, "file://" + bare.replace(/\\/g, "/"), dest);
      expect(res.ok).toBe(true);
      expect(fs.existsSync(path.join(dest, ".git"))).toBe(true);
      expect(fs.existsSync(path.join(dest, "b.txt"))).toBe(true);
    });
  });
});
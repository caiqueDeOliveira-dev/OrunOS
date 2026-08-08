const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const devTools = require("../developer-tools.cjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orun-dev-"));
}

/** Create a real git repo with an initial commit and return its path. */
function makeRepo() {
  const dir = tmpDir();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@orun.local"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Orun Test"], { cwd: dir });
  fs.writeFileSync(path.join(dir, "app.js"), "const x = 1;\n");
  execFileSync("git", ["add", "."], { cwd: dir });
  execFileSync("git", ["commit", "-q", "-m", "feat: initial"], { cwd: dir });
  return dir;
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

describe("developer-tools.cjs", () => {
  afterEach(() => devTools.setContext7Base("https://context7.com/api"));

  gitSuite("Git Intelligence", () => {
    it("gitStatus retorna branch + mudanças do working tree", () => {
      const dir = makeRepo();
      fs.writeFileSync(path.join(dir, "app.js"), "const x = 2;\n");
      fs.writeFileSync(path.join(dir, "novo.txt"), "novo");
      const res = devTools.gitStatus(dir);
      expect(res.ok).toBe(true);
      expect(res.branch).toBeTruthy();
      expect(res.modified).toBe(1);
      expect(res.untracked).toBe(1);
      expect(res.changes.some((c) => c.path === "app.js")).toBe(true);
    });

    it("gitStatus falha graciosamente fora de um repo", () => {
      const dir = tmpDir();
      const res = devTools.gitStatus(dir);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("não é um repositório git");
    });

    it("gitLog lista commits recentes", () => {
      const dir = makeRepo();
      const res = devTools.gitLog(dir);
      expect(res.ok).toBe(true);
      expect(res.total).toBe(1);
      expect(res.commits[0].hash).toBeTruthy();
      expect(res.commits[0].subject).toContain("initial");
    });

    it("gitDiff mostra mudanças não commitadas", () => {
      const dir = makeRepo();
      fs.writeFileSync(path.join(dir, "app.js"), "const x = 42;\n");
      const res = devTools.gitDiff(dir, { path: "app.js" });
      expect(res.ok).toBe(true);
      expect(res.output).toContain("+const x = 42");
      expect(res.output).toContain("-const x = 1");
    });

    it("gitDiff entre dois commits", () => {
      const dir = makeRepo();
      fs.writeFileSync(path.join(dir, "app.js"), "const x = 9;\n");
      execFileSync("git", ["add", "."], { cwd: dir });
      execFileSync("git", ["commit", "-q", "-m", "feat: second"], { cwd: dir });
      const first = execFileSync("git", ["rev-parse", "HEAD~1"], { cwd: dir }).toString().trim();
      const res = devTools.gitDiff(dir, { base: first, head: "HEAD" });
      expect(res.ok).toBe(true);
      expect(res.output).toContain("+const x = 9");
    });

    it("gitStash push/pop preserva mudanças", () => {
      const dir = makeRepo();
      fs.writeFileSync(path.join(dir, "app.js"), "const x = 7;\n");
      const pushed = devTools.gitStash(dir, { action: "push", message: "wip teste" });
      expect(pushed.ok).toBe(true);
      const list = devTools.gitStash(dir, { action: "list" });
      expect(list.ok).toBe(true);
      expect(list.total).toBe(1);
      const popped = devTools.gitStash(dir, { action: "pop" });
      expect(popped.ok).toBe(true);
      expect(fs.readFileSync(path.join(dir, "app.js"), "utf8")).toContain("const x = 7");
    });

    it("gitRemote lista remotes do repo", () => {
      const dir = makeRepo();
      execFileSync("git", ["remote", "add", "origin", "https://github.com/orun/test.git"], { cwd: dir });
      const res = devTools.gitRemote(dir);
      expect(res.ok).toBe(true);
      expect(res.total).toBe(2); // fetch + push
      expect(res.remotes.some((r) => r.name === "origin" && r.url.includes("github.com"))).toBe(true);
    });

    it("gitRemote fora de repo falha graciosamente", () => {
      const dir = tmpDir();
      const res = devTools.gitRemote(dir);
      expect(res.ok).toBe(false);
    });

    it("ghPr falha graciosamente fora de repo", () => {
      const dir = tmpDir();
      const res = devTools.ghPr(dir, { action: "list" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("não é um repositório git");
    });

    it("codeReview retorna bundle de revisão (arquivos + diff)", () => {
      const dir = makeRepo();
      fs.writeFileSync(path.join(dir, "app.js"), "const x = 42;\n");
      const res = devTools.codeReview(dir, {});
      expect(res.ok).toBe(true);
      expect(res.changeCount).toBeGreaterThanOrEqual(1);
      expect(res.changedFiles).toContain("app.js");
      expect(res.diffOutput).toContain("+const x = 42");
    });

    it("codeReview falha graciosamente fora de repo", () => {
      const dir = tmpDir();
      const res = devTools.codeReview(dir, {});
      expect(res.ok).toBe(false);
    });
  });

  it("detectTestCommand reconhece vitest no package.json", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "teste", scripts: { test: "vitest run" }, devDependencies: { vitest: "^1.0.0" },
    }));
    const detected = devTools.detectTestCommand(dir);
    expect(detected).not.toBeNull();
    expect(detected.framework).toBe("vitest");
  });

  it("detectTestCommand reconhece pytest por pytest.ini", () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, "pytest.ini"), "[pytest]\n");
    const detected = devTools.detectTestCommand(dir);
    expect(detected).not.toBeNull();
    expect(detected.framework).toBe("pytest");
  });

  it("detectTestCommand retorna null sem framework detectável", () => {
    const dir = tmpDir();
    const detected = devTools.detectTestCommand(dir);
    expect(detected).toBeNull();
  });

  it("runTests sem framework detectável orienta o usuário", () => {
    const dir = tmpDir();
    const res = devTools.runTests(dir, {});
    expect(res.ok).toBe(false);
    expect(res.error).toContain("framework");
  });

  it("semgrep ruleset bundlado existe e é YAML válido", () => {
    expect(devTools.SEMGREP_RULESET).toBeTruthy();
    expect(fs.existsSync(devTools.SEMGREP_RULESET)).toBe(true);
    const content = fs.readFileSync(devTools.SEMGREP_RULESET, "utf8");
    expect(content).toContain("rules:");
    expect(content).toContain("- id:");
  });

  it("semgrepScan avisa quando semgrep não está instalado", () => {
    if (devTools.semgrepAvailable()) {
      console.log("semgrep instalado — pulando teste de indisponibilidade");
      return;
    }
    const dir = tmpDir();
    const res = devTools.semgrepScan(dir);
    expect(res.ok).toBe(false);
    expect(res.available).toBe(false);
    expect(res.error).toContain("semgrep");
  });

  it("libraryDocs exige query", async () => {
    const res = await devTools.libraryDocs(tmpDir(), {});
    expect(res.ok).toBe(false);
    expect(res.error).toContain("query");
  });

  it("libraryDocs resolve libraryName via /v2/libs/search", async () => {
    const server = http.createServer((req, res) => {
      if (req.url.includes("/v2/libs/search")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          results: [
            { id: "/facebook/react", title: "React", description: "A JS library for building UIs", stars: 220000 },
          ],
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    devTools.setContext7Base(`http://127.0.0.1:${port}`);
    try {
      const res = await devTools.libraryDocs(tmpDir(), { libraryName: "react", query: "como usar hooks" });
      expect(res.ok).toBe(true);
      expect(res.step).toBe("search");
      expect(res.results[0].id).toBe("/facebook/react");
    } finally {
      server.close();
    }
  });

  it("libraryDocs retorna snippets com libraryId resolvido", async () => {
    const server = http.createServer((req, res) => {
      if (req.url.includes("/v2/context")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          snippets: [{ content: "useState manages state", repo: "/facebook/react" }],
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    devTools.setContext7Base(`http://127.0.0.1:${port}`);
    try {
      const res = await devTools.libraryDocs(tmpDir(), { libraryId: "/facebook/react", query: "state" });
      expect(res.ok).toBe(true);
      expect(res.step).toBe("context");
      expect(res.snippets[0].text).toContain("useState");
    } finally {
      server.close();
    }
  });

  it("libraryDocs trata erro HTTP do servidor", async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "boom" }));
    });
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;
    devTools.setContext7Base(`http://127.0.0.1:${port}`);
    try {
      const res = await devTools.libraryDocs(tmpDir(), { libraryName: "react", query: "x" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Context7 indisponível");
    } finally {
      server.close();
    }
  });
});

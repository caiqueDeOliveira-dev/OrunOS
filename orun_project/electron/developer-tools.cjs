// electron/developer-tools.cjs
//
// Developer Elite tools for the autonomous loop: Git Intelligence,
// Semgrep dev-time scan, and Context7 library docs lookup.
//
// Design rules:
//   - Node-pure (no electron import) so it can be tested with vitest.
//   - All git/semgrep calls go through execFile (args array, no shell),
//     which avoids shell-metacharacter injection and is cross-platform.
//   - Every function returns a plain object (never throws), so the
//     autonomous loop gets a structured result.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const GIT = "git";
const SEMGREP = "semgrep";
const GH = "gh";
const MAX_OUTPUT = 20000;
const GIT_TIMEOUT = 30000;
const HTTP_TIMEOUT = 15000;
const TEST_TIMEOUT = 120000;
// Bundled Semgrep ruleset (Developer Elite) used as the default config.
const SEMGREP_RULESET = path.join(__dirname, "developer-semgrep-rules.yml");
let CONTEXT7_BASE = "https://context7.com/api";

/** Test-only hook: point Context7 at a local mock server. */
function setContext7Base(url) {
  CONTEXT7_BASE = url;
}

// ── Low-level helpers ───────────────────────────────────────────────────

/** Run a command via execFile (args array — no shell). Returns {ok, output|error}. */
function run(cmd, args, cwd, opts = {}) {
  try {
    const output = execFileSync(cmd, args, {
      encoding: "utf8",
      cwd,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      timeout: opts.timeout || GIT_TIMEOUT,
      // Only used for npm/npx .cmd shims on Windows (never for git/semgrep/gh).
      shell: opts.shell === true,
    });
    return { ok: true, output: output.trim() };
  } catch (err) {
    const detail = (err.stderr && err.stderr.toString().trim()) || err.message || String(err);
    return { ok: false, error: detail.slice(0, 500) };
  }
}

function isInsideGitRepo(workspace) {
  const res = run(GIT, ["rev-parse", "--is-inside-work-tree"], workspace);
  return res.ok && res.output === "true";
}

function gitNotRepoError(workspace) {
  return {
    ok: false,
    error:
      `"${workspace}" não é um repositório git. Rode "git init" nele (ou em uma subpasta) ` +
      `para usar as tools de Git Intelligence.`,
  };
}

function capOutput(s) {
  if (s.length <= MAX_OUTPUT) return s;
  return s.slice(0, MAX_OUTPUT) + "\n... [truncated]";
}

function toArray(v) {
  if (v === undefined || v === null || v === "") return [];
  return Array.isArray(v) ? v : String(v).split(",").map((x) => x.trim()).filter(Boolean);
}

// ── Git Intelligence ────────────────────────────────────────────────────

/** Current branch, ahead/behind, and porcelain status of the working tree. */
function gitStatus(workspace) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const branchRes = run(GIT, ["rev-parse", "--abbrev-ref", "HEAD"], workspace);
  const statusRes = run(GIT, ["status", "--porcelain=v1", "-b"], workspace);
  const lines = statusRes.ok ? statusRes.output.split("\n") : [];
  const header = lines.shift() || "";
  const changes = lines
    .map((l) => ({ index: (l[0] || "-").trim() || "-", worktree: (l[1] || "-").trim() || "-", path: l.slice(3) }))
    .filter((c) => c.path);
  return {
    ok: true,
    branch: branchRes.ok ? branchRes.output : null,
    branchLine: header,
    changes,
    changeCount: changes.length,
    modified: changes.filter((c) => c.index === "M" || c.worktree === "M").length,
    added: changes.filter((c) => c.index === "A").length,
    deleted: changes.filter((c) => c.index === "D" || c.worktree === "D").length,
    untracked: changes.filter((c) => c.index === "?" || c.worktree === "?").length,
  };
}

/** Recent commit history: one line per commit (short hash + subject + refs). */
function gitLog(workspace, n = 15) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const count = Math.min(Math.max(Number(n) || 15, 1), 100);
  const res = run(GIT, ["log", `-n ${count}`, "--oneline", "--decorate=short"], workspace);
  if (!res.ok) {
    if (res.error.toLowerCase().includes("does not have any commits")) {
      return { ok: true, commits: [], message: "Repo sem commits ainda." };
    }
    return res;
  }
  const commits = res.output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+)\s+(.*)$/);
      return match ? { hash: match[1], subject: match[2] } : { hash: line, subject: "" };
    });
  return { ok: true, commits, total: commits.length };
}

/**
 * Diff of the working tree (default), a single ref, or between two refs.
 * args: { base?, head?, path?, staged?, stat? }
 */
function gitDiff(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const argv = ["diff"];
  if (args.staged) argv.push("--cached");
  if (args.stat) argv.push("--stat");
  if (args.base && args.head) {
    argv.push(args.base, args.head);
  } else if (args.base) {
    argv.push(args.base);
  }
  const paths = toArray(args.path);
  if (paths.length) {
    argv.push("--");
    argv.push(...paths);
  }
  const res = run(GIT, argv, workspace);
  if (!res.ok) return res;
  return { ok: true, output: capOutput(res.output), diff: res.output };
}

/** Stash management. args: { action: "list"|"push"|"pop", message? } */
function gitStash(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const action = args.action || "list";
  if (action === "push") {
    const argv = ["stash", "push"];
    if (args.message) argv.push("-m", String(args.message));
    const res = run(GIT, argv, workspace);
    if (!res.ok) return res;
    return { ok: true, message: res.output || "Stash criado.", action };
  }
  if (action === "pop") {
    const res = run(GIT, ["stash", "pop"], workspace);
    if (!res.ok) return res;
    return { ok: true, message: res.output || "Stash restaurado.", action };
  }
  // list (default)
  const res = run(GIT, ["stash", "list"], workspace);
  if (!res.ok) return res;
  const stashes = res.output
    .split("\n")
    .filter(Boolean)
    .map((l) => ({ label: l, name: (l.match(/^stash@\{\d+\}/) || [null])[0] || l }));
  return { ok: true, stashes, total: stashes.length, action: "list" };
}

// ── GitHub CLI / remotes (advanced Git Intelligence) ─────────────────────

function ghAvailable() {
  return run(GH, ["--version"], undefined).ok;
}

function ghAuthed() {
  const res = run(GH, ["auth", "status"], undefined);
  return res.ok;
}

/**
 * List git remotes (name + URL + fetch/push).
 */
function gitRemote(workspace) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const res = run(GIT, ["remote", "-v"], workspace);
  if (!res.ok) return res;
  const remotes = res.output
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      return m ? { name: m[1], url: m[2], direction: m[3] } : { raw: l };
    });
  return { ok: true, remotes, total: remotes.length };
}

/**
 * GitHub PR via gh CLI. args: { action: "list"|"create"|"view", base?, head?,
 * title?, body?, number? }
 * - list: open PRs in the repo.
 * - create: open a PR (base is the target branch; head defaults to current branch).
 * - view: show a specific PR (by number, or current branch's PR if omitted).
 */
function ghPr(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  if (!ghAvailable()) {
    return { ok: false, error: "gh (GitHub CLI) não está instalado. Instale em https://cli.github.com/." };
  }
  if (!ghAuthed()) {
    return { ok: false, error: "gh não está autenticado. Rode `gh auth login` no Terminal." };
  }
  const action = args.action || "list";
  try {
    if (action === "list") {
      const res = run(GH, ["pr", "list", "--limit", "20"], workspace);
      if (!res.ok) return res;
      const prs = res.output
        .split("\n")
        .filter(Boolean)
        .map((l) => ({ line: l }));
      return { ok: true, prs, total: prs.length, action };
    }
    if (action === "create") {
      const argv = ["pr", "create", "--fill"];
      if (args.base) argv.push("--base", String(args.base));
      if (args.head) argv.push("--head", String(args.head));
      if (args.title) argv.push("--title", String(args.title));
      if (args.body) argv.push("--body", String(args.body));
      const res = run(GH, argv, workspace, { timeout: 120000 });
      if (!res.ok) return res;
      return { ok: true, prUrl: res.output, action };
    }
    if (action === "view") {
      const argv = ["pr", "view"];
      if (args.number) argv.push(String(args.number));
      const res = run(GH, argv, workspace, { timeout: 60000 });
      if (!res.ok) return res;
      return { ok: true, prInfo: res.output.slice(0, MAX_OUTPUT), action };
    }
    return { ok: false, error: `Ação desconhecida: ${action}. Use list|create|view.` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Semgrep (dev-time static analysis) ──────────────────────────────────
function semgrepAvailable() {
  return run(SEMGREP, ["--version"], undefined).ok;
}

/**
 * Run a semgrep scan over a directory. args: { dir?, pattern?|rules?|config? }
 * Returns findings in a compact format. Semgrep must be installed.
 */
function semgrepScan(workspace, args = {}) {
  if (!semgrepAvailable()) {
    return {
      ok: false,
      available: false,
      error:
        "semgrep não está instalado. Instale com: pip install semgrep " +
        "(https://semgrep.dev/docs/getting-started/).",
    };
  }
  const target = args.dir ? path.resolve(workspace, String(args.dir)) : workspace;
  const argv = ["scan", "--json", "--quiet", "--timeout", "30", "--max-memory", "2048"];
  const patterns = toArray(args.pattern).concat(toArray(args.rules));
  if (patterns.length) {
    argv.push("--pattern", patterns.join(" || "));
  }
  const configs = toArray(args.config);
  if (configs.length) {
    argv.push("--config", configs.join(","));
  } else if (!patterns.length && fs.existsSync(SEMGREP_RULESET)) {
    // Developer Elite bundled ruleset as default
    argv.push("--config", SEMGREP_RULESET);
  }
  argv.push("--");
  argv.push(target);
  const res = run(SEMGREP, argv, workspace, { timeout: 60000 });
  if (!res.ok) return { ...res, available: true };
  try {
    const parsed = JSON.parse(res.output);
    const results = (parsed.results || []).slice(0, 50).map((r) => ({
      ruleId: (r.check_id || "").replace("python.lang.security.", "").replace("javascript.lang.security.", ""),
      severity: r.extra?.severity || "ERROR",
      file: r.path || "",
      line: r.start?.line || 0,
      message: (r.extra?.message || "").split("\n")[0],
    }));
    return {
      ok: true,
      available: true,
      ruleset: configs.length ? configs.join(",") : "bundled developer-semgrep-rules",
      totalFindings: parsed.results?.length || 0,
      findings: results,
      scannedFiles: (parsed.scans && parsed.scans.reduce((a, s) => a + (s.num_targets || 0), 0)) || null,
    };
  } catch (e) {
    return { ok: false, available: true, error: "Falha ao parsear JSON do semgrep: " + e.message };
  }
}

// ── Test Generator (run the project's test suite) ────────────────────────

/**
 * Detect the test command/framework for a workspace.
 * Returns { framework, command, args } or null if nothing detectable.
 */
function detectTestCommand(workspace) {
  const pkgPath = path.join(workspace, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.vitest) return { framework: "vitest", args: ["vitest", "run"] };
      if (deps.jest) return { framework: "jest", args: ["jest", "--silent"] };
      if (deps.mocha) return { framework: "mocha", args: ["mocha"] };
      if (pkg.scripts && pkg.scripts.test) return { framework: "npm-test", args: ["test"] };
    } catch {}
  }
  if (
    fs.existsSync(path.join(workspace, "pytest.ini")) ||
    fs.existsSync(path.join(workspace, "pyproject.toml")) ||
    fs.existsSync(path.join(workspace, "setup.cfg"))
  ) {
    return { framework: "pytest", args: ["-m", "pytest", "-q"] };
  }
  if (fs.existsSync(path.join(workspace, "go.mod"))) {
    return { framework: "go", args: ["test", "./..."] };
  }
  if (fs.existsSync(path.join(workspace, "Cargo.toml"))) {
    return { framework: "cargo", args: ["test"] };
  }
  return null;
}

function testsPassedOutput(output) {
  const summary = output.split("\n").slice(-12).join("\n");
  const failed = /(\d+) failed/.exec(output);
  const passed = /(\d+) passed/.exec(output);
  const failedGo = /FAIL\s*$/.test(output) ? true : false;
  return {
    passed: passed ? Number(passed[1]) : null,
    failed: failed ? Number(failed[1]) : (failedGo ? 1 : 0),
    tail: capOutput(summary),
  };
}

/**
 * Run the project's test suite (Test Generator): auto-detects the framework
 * (vitest/jest/mocha/npm test/pytest/go/cargo) and returns pass/fail + tail
 * of output. args: { command?, file? } — command overrides detection
 * (array-like string), file runs a single test file where supported.
 */
function runTests(workspace, args = {}) {
  const base = args.dir ? path.resolve(workspace, String(args.dir)) : workspace;
  let framework = "detected";
  let argv;
  const pkgPath = path.join(base, "package.json");
  const isNode = fs.existsSync(pkgPath);
  if (args.command) {
    // When run through a .cmd shim (shell:true), args are concatenated, so
    // reject shell metacharacters in agent-supplied commands/files.
    if (/[&|;<>^()$`"']|(\s+)&&/.test(String(args.command))) {
      return { ok: false, error: "command contém caracteres de shell — use um comando simples (ex.: 'vitest run')." };
    }
    argv = String(args.command).split(" ").filter(Boolean);
  } else {
    const detected = detectTestCommand(base);
    if (!detected) {
      return {
        ok: false,
        error:
          "Nenhum framework de teste detectado nesse diretório (procurei vitest/jest/mocha/npm test, " +
          "pytest, go test, cargo test). Informe 'command' para forçar um comando de teste.",
      };
    }
    framework = detected.framework;
    argv = detected.args;
  }
  if (args.file) {
    if (/[&|;<>^()$`"']/.test(String(args.file))) {
      return { ok: false, error: "file contém caracteres de shell — informe apenas o caminho do arquivo." };
    }
    if (framework === "vitest" || framework === "jest" || framework === "mocha" || framework === "pytest") {
      argv = argv.concat([String(args.file)]);
    }
  }
  const runner = isNode ? "npx" : (framework === "pytest" ? "python" : (framework === "go" ? "go" : (framework === "cargo" ? "cargo" : null)));
  // npm/npx are .cmd shims on Windows — execFile needs shell:true for them.
  const isCmdShim = process.platform === "win32" && (runner === "npx" || runner === "npm");
  let cmd = runner;
  let finalArgs = argv;
  if (runner === "npx") {
    finalArgs = ["-y", ...argv];
  }
  const opts = { timeout: TEST_TIMEOUT, shell: isCmdShim };
  const res = run(cmd, finalArgs, base, opts);
  const status = testsPassedOutput(res.ok ? res.output : res.error);
  return {
    ok: res.ok,
    framework,
    command: `${cmd} ${finalArgs.join(" ")}`,
    dir: base,
    passed: status.passed,
    failed: status.failed,
    output: status.tail,
    ...(res.ok ? {} : { error: res.error.slice(0, 500) }),
  };
}

// ── Code Review bundle (diff + semgrep + changed files) ──────────────────

/**
 * One-shot review material for the agent: changed files (git status), the
 * diff (working tree or between refs), and an optional semgrep scan over the
 * changed paths. args: { base?, head?, includeSemgrep? }
 */
function codeReview(workspace, args = {}) {
  const inRepo = isInsideGitRepo(workspace);
  if (!inRepo) {
    return { ok: false, error: gitNotRepoError(workspace).error };
  }
  const status = gitStatus(workspace);
  const changed = (status.ok ? status.changes : []).filter((c) => c.path).map((c) => c.path);
  const diffArgs = { ...args };
  delete diffArgs.includeSemgrep;
  const diff = gitDiff(workspace, diffArgs);
  const bundle = {
    ok: true,
    branch: status.ok ? status.branch : null,
    changeCount: status.ok ? status.changeCount : 0,
    changedFiles: changed,
    diffOutput: diff.ok ? diff.diff : null,
  };
  if (args.includeSemgrep) {
    const scan = semgrepScan(workspace, {});
    bundle.semgrep = scan.ok ? { totalFindings: scan.totalFindings, findings: scan.findings } : { error: scan.error };
  }
  return bundle;
}

// ── Context7 library docs ───────────────────────────────────────────────

/** HTTP GET that returns parsed JSON (or raw text). Injected transport for tests. */
function httpGetJson(urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = urlString.startsWith("https:") ? https : http;
    const req = lib.get(urlString, { timeout: opts.timeout || HTTP_TIMEOUT }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const status = res.statusCode || 0;
        if (status >= 400) {
          return reject(new Error(`HTTP ${status}: ${data.slice(0, 200)}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Resposta não-JSON do Context7: " + e.message));
        }
      });
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout ao consultar Context7"));
    });
    req.on("error", reject);
  });
}

/**
 * Context7 library docs lookup.
 * - With a libraryId: returns doc snippets for a specific question.
 * - Without one: resolves the library name first (search), then returns
 *   top matches so the agent can call again with the resolved ID.
 * args: { query, libraryId?, libraryName?, type? }
 */
async function libraryDocs(workspace, args = {}) {
  const query = (args.query || args.question || "").slice(0, 500);
  if (!query.trim()) return { ok: false, error: "Parâmetro 'query' (pergunta) é obrigatório." };

  const libId = (args.libraryId || "").trim();

  // Step 1: resolve library name -> library ID (no auth, low rate limits)
  if (!libId) {
    const name = (args.libraryName || args.lib || "").trim();
    if (!name) return { ok: false, error: "Informe 'libraryName' (ou 'libraryId' já resolvido) + 'query'." };
    try {
      const search = await httpGetJson(
        `${CONTEXT7_BASE}/v2/libs/search?libraryName=${encodeURIComponent(name)}&query=${encodeURIComponent(query)}`
      );
      const results = (search.results || []).slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
        description: (r.description || "").slice(0, 160),
        stars: r.stars ?? null,
        trustScore: r.trustScore ?? null,
        totalSnippets: r.totalSnippets ?? null,
      }));
      return {
        ok: true,
        step: "search",
        results,
        note:
          results.length
            ? `Use libraryDocs com libraryId="${results[0].id}" + query para obter os snippets.`
            : "Nenhuma biblioteca encontrada. Confira o nome ou use o libraryId completo.",
      };
    } catch (e) {
      return { ok: false, error: `Context7 indisponível: ${e.message}` };
    }
  }

  // Step 2: get docs context for the resolved library
  try {
    const type = args.type === "txt" ? "txt" : "json";
    const url = `${CONTEXT7_BASE}/v2/context?libraryId=${encodeURIComponent(libId)}&query=${encodeURIComponent(query)}&type=${type}`;
    const body = await httpGetJson(url);
    const snippets = (body.snippets || body.content || []).slice(0, 10).map((s) => ({
      text: (typeof s === "string" ? s : s.content || s.text || "").slice(0, 600),
      source: (typeof s === "object" && (s.repo || s.file || s.url)) || null,
    }));
    return {
      ok: true,
      step: "context",
      libraryId: libId,
      query,
      snippets,
      total: snippets.length,
    };
  } catch (e) {
    return { ok: false, error: `Context7 indisponível para ${libId}: ${e.message}` };
  }
}

// ── Git Write Operations (Developer Elite) ──────────────────────────────

/** Stage files and create a commit. */
function gitCommit(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const { message, files } = args;
  if (!message || !message.trim()) return { ok: false, error: "message é obrigatório" };

  const fileArgs = toArray(files);
  if (fileArgs.length === 0) {
    // Stage all changes
    const addRes = run(GIT, ["add", "-A"], workspace);
    if (!addRes.ok) return addRes;
  } else {
    const addRes = run(GIT, ["add", ...fileArgs], workspace);
    if (!addRes.ok) return addRes;
  }

  const res = run(GIT, ["commit", "-m", message.trim()], workspace);
  if (!res.ok) return res;

  // Parse commit hash from output
  const hashMatch = res.output.match(/\[[\w\s]+ ([a-f0-9]+)\]/);
  return {
    ok: true,
    commit: hashMatch ? hashMatch[1] : null,
    message: message.trim(),
    output: res.output,
  };
}

/** Create, list, or delete branches. */
function gitBranch(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const { action, name, startPoint } = args;

  if (action === "delete") {
    if (!name) return { ok: false, error: "name é obrigatório para delete" };
    const res = run(GIT, ["branch", "-D", name], workspace);
    return res.ok ? { ok: true, deleted: name } : res;
  }

  if (action === "create") {
    if (!name) return { ok: false, error: "name é obrigatório para create" };
    const branchArgs = ["branch", name];
    if (startPoint) branchArgs.push(startPoint);
    const res = run(GIT, branchArgs, workspace);
    return res.ok ? { ok: true, created: name } : res;
  }

  // Default: list
  const res = run(GIT, ["branch", "--list"], workspace);
  if (!res.ok) return res;

  const branches = res.output.split("\n").filter(Boolean).map((line) => ({
    name: line.replace(/^\*?\s+/, "").trim(),
    current: line.startsWith("*"),
  }));

  return { ok: true, branches, current: branches.find((b) => b.current)?.name || null };
}

/** Switch branches or restore working tree files. */
function gitCheckout(workspace, args = {}) {
  if (!isInsideGitRepo(workspace)) return gitNotRepoError(workspace);
  const { branch, create, file } = args;

  if (file) {
    const res = run(GIT, ["checkout", "--", file], workspace);
    return res.ok ? { ok: true, restored: file } : res;
  }

  if (!branch) return { ok: false, error: "branch é obrigatório" };
  const flags = create ? ["-b"] : [];
  const res = run(GIT, ["checkout", ...flags, branch], workspace);
  return res.ok ? { ok: true, switchedTo: branch } : res;
}

// ── Test Generator (Developer Elite) ────────────────────────────────────

/**
 * Generate a test scaffold from a source file.
 * Analyzes exports and generates a test file with placeholder tests.
 */
function generateTests(workspace, args = {}) {
  const { sourceFile, framework } = args;
  if (!sourceFile) return { ok: false, error: "sourceFile é obrigatório" };

  const srcPath = path.resolve(workspace, sourceFile);
  if (!fs.existsSync(srcPath)) return { ok: false, error: `arquivo não encontrado: ${sourceFile}` };

  const content = fs.readFileSync(srcPath, "utf8");
  const ext = path.extname(srcPath);
  const baseName = path.basename(srcPath, ext);
  const dir = path.dirname(srcPath);

  // Detect framework
  const detected = framework || detectTestFramework(workspace, dir);
  let testFileName;
  if (detected === "pytest") {
    testFileName = `test_${baseName}.py`;
  } else if (detected === "go") {
    testFileName = `${baseName}_test.go`;
  } else if (detected === "cargo") {
    testFileName = `${baseName}_test.rs`;
  } else {
    testFileName = `${baseName}.test${ext}`;
  }
  const testPath = path.join(dir, testFileName);

  if (fs.existsSync(testPath)) {
    return { ok: false, error: `arquivo de teste já existe: ${path.relative(workspace, testPath)}` };
  }

  // Extract exports/functions
  const exports = extractExports(content, ext);
  if (exports.length === 0) {
    return { ok: false, error: "nenhum export/função encontrada no arquivo" };
  }

  // Generate test content
  const testContent = renderTestFile(exports, baseName, sourceFile, detected, ext);

  try {
    fs.writeFileSync(testPath, testContent, "utf8");
    return {
      ok: true,
      testFile: path.relative(workspace, testPath),
      framework: detected,
      testsGenerated: exports.length,
      exports: exports.map((e) => e.name),
    };
  } catch (e) {
    return { ok: false, error: `falha ao escrever: ${e.message}` };
  }
}

/** Detect which test framework is used. */
function detectTestFramework(workspace, dir) {
  try {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.vitest) return "vitest";
      if (deps.jest) return "jest";
      if (deps.mocha) return "mocha";
    }
    if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml"))) return "pytest";
    if (fs.existsSync(path.join(dir, "go.mod"))) return "go";
    if (fs.existsSync(path.join(dir, "Cargo.toml"))) return "cargo";
  } catch {}
  return "vitest"; // default
}

/** Extract exported functions/classes from source. */
function extractExports(content, ext) {
  const results = [];
  const patterns = [
    // JS/TS: export function/class/const/arrow
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+const\s+(\w+)\s*=/g,
    /export\s+default\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+default\s+class\s+(\w+)/g,
    // JS/TS: module.exports / module.exports.name
    /module\.exports\s*=\s*\{([^}]+)\}/g,
    /module\.exports\s*=\s*(\w+)/g,
    // Python: def (top-level)
    /^def\s+(\w+)\s*\(/gm,
    /class\s+(\w+)\s*[:\(]/g,
    // Go: func
    /^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/gm,
    // Rust: pub fn
    /pub\s+fn\s+(\w+)/g,
  ];

  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(content)) !== null) {
      const name = m[1] || m[0];
      if (name && !name.startsWith("_") && !["module", "exports", "default"].includes(name)) {
        results.push({ name: name.trim(), type: m[0].includes("class") ? "class" : "function" });
      }
    }
  }

  // Deduplicate by name
  const seen = new Set();
  return results.filter((e) => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });
}

/** Render a test file from exports. */
function renderTestFile(exports, baseName, sourceFile, framework, ext) {
  const importPath = `./${baseName}`;

  if (framework === "pytest") {
    const imports = exports.filter((e) => e.type === "function").map((e) => `from ${baseName} import ${e.name}`).join("\n");
    const tests = exports.filter((e) => e.type === "function").map((e) => `
def test_${e.name.toLowerCase()}():
    """Test ${e.name}."""
    result = ${e.name}()
    assert result is not None
`).join("\n");
    return `"""Tests for ${baseName}."""\n${imports}\n${tests}`;
  }

  if (framework === "go") {
    const tests = exports.filter((e) => e.type === "function").map((e) => `
func Test${e.name}(t *testing.T) {
    result := ${e.name}()
    if result == nil {
        t.Error("expected non-nil result")
    }
}
`).join("\n");
    return `package main\n\nimport "testing"\n${tests}`;
  }

  if (framework === "cargo") {
    const tests = exports.filter((e) => e.type === "function").map((e) => `
#[test]
fn test_${e.name.toLowerCase()}() {
    let result = ${e.name}();
    assert!(result.is_some());
}
`).join("\n");
    return `#[cfg(test)]\nmod tests {\n    use super::*;\n${tests}\n}`;
  }

  // JS/TS (vitest/jest/mocha)
  const isTypeScript = ext === ".ts" || ext === ".tsx";
  const importLine = isTypeScript
    ? `import { ${exports.map((e) => e.name).join(", ")} } from "${importPath}";`
    : `const { ${exports.map((e) => e.name).join(", ")} } = require("${importPath}");`;

  const tests = exports.map((e) => `
describe("${e.name}", () => {
  it("should work correctly", () => {
    const result = ${e.name}();
    expect(result).toBeDefined();
  });
});
`).join("\n");

  return `${importLine}\n${tests}`;
}

// ── Refactor Tools (Developer Elite) ────────────────────────────────────

/**
 * Safely rename a symbol (function/class/const) across all files.
 * Finds all references and updates them atomically.
 */
function refactorRename(workspace, args = {}) {
  const { oldName, newName, dir } = args;
  if (!oldName || !newName) return { ok: false, error: "oldName e newName são obrigatórios" };
  if (oldName === newName) return { ok: false, error: "oldName e newName são idênticos" };

  const searchDir = dir ? path.resolve(workspace, dir) : workspace;
  if (!fs.existsSync(searchDir)) return { ok: false, error: `diretório não encontrado: ${dir || "."}` };

  // Find all files containing the old name
  const files = findFilesWithSymbol(searchDir, oldName);
  if (files.length === 0) {
    return { ok: false, error: `nenhum arquivo contém "${oldName}"` };
  }

  const changes = [];
  let totalReplacements = 0;

  for (const file of files) {
    try {
      let content = fs.readFileSync(file, "utf8");
      const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "g");
      const matches = content.match(regex);
      if (!matches) continue;

      const newContent = content.replace(regex, newName);
      if (newContent !== content) {
        fs.writeFileSync(file, newContent, "utf8");
        changes.push({ file: path.relative(workspace, file), replacements: matches.length });
        totalReplacements += matches.length;
      }
    } catch {
      // Skip files we can't read/write
    }
  }

  return {
    ok: true,
    oldName,
    newName,
    filesChanged: changes.length,
    totalReplacements,
    changes,
  };
}

/**
 * Safely move a file to a new location, updating all imports/requires.
 */
function refactorMove(workspace, args = {}) {
  const { from, to } = args;
  if (!from || !to) return { ok: false, error: "from e to são obrigatórios" };

  const srcPath = path.resolve(workspace, from);
  const destPath = path.resolve(workspace, to);

  if (!fs.existsSync(srcPath)) return { ok: false, error: `arquivo não encontrado: ${from}` };
  if (fs.existsSync(destPath)) return { ok: false, error: `destino já existe: ${to}` };

  // Ensure dest directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Move the file
  try {
    fs.copyFileSync(srcPath, destPath);
    fs.unlinkSync(srcPath);
  } catch (e) {
    return { ok: false, error: `falha ao mover: ${e.message}` };
  }

  // Find and update imports
  const fromRelative = path.relative(workspace, srcPath);
  const toRelative = path.relative(workspace, destPath);
  const importUpdates = updateImports(workspace, fromRelative, toRelative);

  return {
    ok: true,
    from: fromRelative,
    to: toRelative,
    importsUpdated: importUpdates.length,
    changes: importUpdates.map((f) => path.relative(workspace, f)),
  };
}

/**
 * Extract a function/section from one file into a new file.
 */
function refactorExtract(workspace, args = {}) {
  const { sourceFile, startLine, endLine, targetFile, functionName } = args;
  if (!sourceFile || startLine == null || endLine == null) {
    return { ok: false, error: "sourceFile, startLine e endLine são obrigatórios" };
  }

  const srcPath = path.resolve(workspace, sourceFile);
  if (!fs.existsSync(srcPath)) return { ok: false, error: `arquivo não encontrado: ${sourceFile}` };

  const content = fs.readFileSync(srcPath, "utf8");
  const lines = content.split("\n");

  if (startLine < 1 || endLine > lines.length || startLine > endLine) {
    return { ok: false, error: `intervalo inválido: ${startLine}-${endLine} (arquivo tem ${lines.length} linhas)` };
  }

  const extracted = lines.slice(startLine - 1, endLine).join("\n");
  const destFile = targetFile || `${functionName || "extracted"}${path.extname(sourceFile)}`;
  const destPath = path.resolve(workspace, destFile);

  if (fs.existsSync(destPath)) return { ok: false, error: `arquivo de destino já existe: ${destFile}` };

  try {
    fs.writeFileSync(destPath, extracted, "utf8");

    // Replace original lines with an import placeholder
    const importLine = `// TODO: import ${functionName || "extracted"} from "./${path.basename(destFile, path.extname(destFile))}"`;
    const newLines = [...lines.slice(0, startLine - 1), importLine, ...lines.slice(endLine)];
    fs.writeFileSync(srcPath, newLines.join("\n"), "utf8");

    return {
      ok: true,
      source: sourceFile,
      target: destFile,
      linesExtracted: endLine - startLine + 1,
      range: `${startLine}-${endLine}`,
    };
  } catch (e) {
    return { ok: false, error: `falha ao extrair: ${e.message}` };
  }
}

// ── Refactor Helpers ────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFilesWithSymbol(dir, symbol) {
  const results = [];
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === "build") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (/\.(js|cjs|mjs|ts|tsx|jsx|py|go|rs|vue|svelte)$/.test(e.name)) {
        try {
          const content = fs.readFileSync(full, "utf8");
          if (new RegExp(`\\b${escapeRegex(symbol)}\\b`).test(content)) {
            results.push(full);
          }
        } catch {}
      }
    }
  };
  walk(dir);
  return results;
}

function updateImports(workspace, fromPath, toPath) {
  const updated = [];
  const fromBase = path.basename(fromPath, path.extname(fromPath));
  const toBase = path.basename(toPath, path.extname(toPath));

  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (/\.(js|cjs|mjs|ts|tsx|jsx)$/.test(e.name)) {
        try {
          let content = fs.readFileSync(full, "utf8");
          // Update require/import paths
          const fromDir = path.dirname(fromPath);
          const toDir = path.dirname(toPath);
          const fromBaseNoExt = fromBase;
          const toBaseNoExt = toBase;

          // Replace relative path references
          const fromNorm = fromPath.replace(/\\/g, "/");
          const toNorm = toPath.replace(/\\/g, "/");

          let changed = false;

          // require("./old") or import from "./old"
          const patterns = [
            new RegExp(`(require\\(["'])(\\.[^"']*?/${escapeRegex(fromBaseNoExt)})(["'])`, "g"),
            new RegExp(`(from ["'])(\\.[^"']*?/${escapeRegex(fromBaseNoExt)})(["'])`, "g"),
          ];

          for (const pat of patterns) {
            const newContent = content.replace(pat, (match, prefix, p, suffix) => {
              changed = true;
              return `${prefix}${toNorm}${suffix}`;
            });
            content = newContent;
          }

          if (changed) {
            fs.writeFileSync(full, content, "utf8");
            updated.push(full);
          }
        } catch {}
      }
    }
  };
  walk(workspace);
  return updated;
}

module.exports = {
  gitStatus,
  gitLog,
  gitDiff,
  gitStash,
  gitRemote,
  ghPr,
  ghAvailable,
  ghAuthed,
  semgrepScan,
  semgrepAvailable,
  runTests,
  detectTestCommand,
  codeReview,
  libraryDocs,
  httpGetJson,
  isInsideGitRepo,
  setContext7Base,
  SEMGREP_RULESET,
  // Developer Elite additions
  gitCommit,
  gitBranch,
  gitCheckout,
  generateTests,
  refactorRename,
  refactorMove,
  refactorExtract,
};

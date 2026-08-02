// electron/security-audit.cjs
// Local security auditor for the "Cyber Security" agent.
//
// Runs a set of read-only checks against the local machine and project and
// produces a scored report with actionable findings. Everything is defensive:
// every external command is wrapped in try/catch and never modifies the system.

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const log = require("electron-log");

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_SCORE = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };

const SECRET_PATTERNS = [
  { name: "OpenAI API Key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "Anthropic API Key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: "GitHub Token", re: /(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: "AWS Access Key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Private Key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Stripe Key", re: /\b(sk_live|sk_test)_[A-Za-z0-9]{20,}\b/g },
  { name: "Google API Key", re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "Generic Secret", re: /\b(?:secret|password|api_key|apikey|access_token)\s*[:=]\s*["'][^"']{12,}["']/gi },
];

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", "coverage", "target", "venv", "__pycache__", ".cache"]);
const SOURCE_EXTS = new Set([".js", ".ts", ".cjs", ".mjs", ".tsx", ".jsx", ".py", ".env", ".json", ".yaml", ".yml", ".toml", ".md"]);

// ── State ───────────────────────────────────────────────────────────────

let lastReport = null;
let mitigatedIds = new Set();
let rootDir = process.cwd();

function setRootDir(dir) {
  if (dir) rootDir = dir;
}

function setMitigated(ids) {
  mitigatedIds = new Set(Array.isArray(ids) ? ids : []);
}

function dataFile(app) {
  try {
    return path.join(app.getPath("userData"), "security-audit-mitigated.json");
  } catch {
    return path.join(process.env.TEMP || ".", "orun-security-audit-mitigated.json");
  }
}

function loadMitigated(app) {
  try {
    const file = dataFile(app);
    if (fs.existsSync(file)) mitigatedIds = new Set(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch { /* ignore */ }
}

function persistMitigated(app) {
  try {
    fs.writeFileSync(dataFile(app), JSON.stringify([...mitigatedIds], null, 2));
  } catch { /* ignore */ }
}

// ── Check implementations ───────────────────────────────────────────────

function walk(dir, depth, out) {
  if (depth > 3) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) walk(full, depth + 1, out);
      else if (entry.isFile()) out.push(full);
    } catch { /* ignore */ }
  }
  return out;
}

async function checkApiKeys() {
  const findings = [];
  let scanned = 0;
  const files = walk(rootDir, 0, []);
  for (const file of files) {
    if (!SOURCE_EXTS.has(path.extname(file).toLowerCase())) continue;
    let content;
    try {
      if (fs.statSync(file).size > 512 * 1024) continue;
      content = fs.readFileSync(file, "utf8");
    } catch { continue; }
    scanned++;
    for (const { name, re } of SECRET_PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(content);
      if (m) {
        findings.push({
          id: `api_${files.indexOf(file)}_${name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
          title: `Possivel ${name} detectada`,
          severity: "high",
          category: "api_keys",
          description: `Foi encontrado um conteudo que se parece com "${name}" no arquivo ${path.relative(rootDir, file) || file}.`,
          recommendation: "Remova o segredo do codigo e rotacione a chave imediatamente. Use um cofre de segredos ou variaveis de ambiente.",
          file: path.relative(rootDir, file) || file,
        });
        break; // one finding per file per pattern
      }
    }
  }
  if (scanned > 0 && findings.length === 0) {
    findings.push({
      id: "api_keys_ok",
      title: "Nenhuma credencial exposta encontrada",
      severity: "info",
      category: "api_keys",
      description: `${scanned} arquivos de codigo foram verificados e nenhum segredo conhecido foi encontrado.`,
      recommendation: "Mantenha esse padrao: nunca commite .env, tokens ou chaves privadas.",
    });
  }
  return findings;
}

async function checkDependencies() {
  const findings = [];
  let count = 0;
  for (const name of ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod"]) {
    const file = path.join(rootDir, name);
    if (fs.existsSync(file)) {
      if (name === "package.json") {
        try {
          const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
          count = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
        } catch { /* ignore */ }
      } else {
        try { count += fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length; } catch { /* ignore */ }
      }
    }
  }
  const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Cargo.lock"];
  const hasLock = lockFiles.some((f) => fs.existsSync(path.join(rootDir, f)));
  const hasNodeModules = fs.existsSync(path.join(rootDir, "node_modules"));

  if (count > 0 && !hasLock) {
    findings.push({
      id: "deps_no_lock",
      title: "Projeto sem lockfile de dependencias",
      severity: "medium",
      category: "dependencies",
      description: `Foram encontradas ${count} dependencias mas nenhum lockfile (package-lock.json, yarn.lock, etc.) foi localizado.`,
      recommendation: "Gere e commite um lockfile para garantir que versoes identicas e verificadas sejam instaladas em todos os ambientes.",
    });
  }
  if (hasNodeModules) {
    findings.push({
      id: "deps_audit_recommended",
      title: "Auditoria de vulnerabilidades recomendada",
      severity: "low",
      category: "dependencies",
      description: `${count} dependencias instaladas em node_modules. Dependencias desatualizadas sao a principal porta de entrada para malware.`,
      recommendation: "Execute 'npm audit' (ou equivalente) periodicamente e mantenha as dependencias atualizadas.",
    });
  } else if (count > 0) {
    findings.push({
      id: "deps_not_installed",
      title: "Dependencias ainda nao instaladas",
      severity: "info",
      category: "dependencies",
      description: `${count} dependencias declaradas mas node_modules nao foi encontrado.`,
      recommendation: "Instale as dependencias antes de executar a aplicacao.",
    });
  }
  return findings;
}

async function checkOpenPorts() {
  const findings = [];
  let lines = [];
  try {
    const { stdout } = await execFileAsync("netstat", ["-an"]);
    lines = stdout.split(/\r?\n/);
  } catch (e) {
    log.warn("[security-audit] netstat unavailable:", e.message);
    return findings;
  }
  const listening = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== "TCP" && parts[0] !== "UDP") continue;
    if (parts[0] === "TCP" && parts[3] !== "LISTENING") continue;
    const addr = parts[1];
    if (!addr || addr === "0.0.0.0:0") continue;
    const portMatch = addr.match(/:(\d+)$/);
    if (portMatch) listening.push(portMatch[1]);
  }
  const unique = [...new Set(listening)].sort((a, b) => a - b).map(Number);
  const known = { 22: "SSH", 80: "HTTP", 443: "HTTPS", 3389: "RDP", 445: "SMB", 3000: "Dev server", 8080: "HTTP alt" };
  const open = unique.filter((p) => known[p]);

  if (open.length > 0) {
    findings.push({
      id: "ports_known_open",
      title: "Portas de servicos comuns expostas",
      severity: open.some((p) => p === 22 || p === 3389 || p === 445) ? "medium" : "low",
      category: "network",
      description: `Portas em LISTENING que coincidem com servicos conhecidos: ${open.map((p) => `${p} (${known[p]})`).join(", ")}.`,
      recommendation: "Feche portas que nao estejam em uso ativo. Para acesso remoto, use VPN ou SSH com chaves em vez de expor RDP.",
    });
  } else {
    findings.push({
      id: "ports_ok",
      title: "Nenhuma porta de servico comum aberta",
      severity: "info",
      category: "network",
      description: `${unique.length} porta(s) em escuta, nenhuma coincidindo com servicos de alto risco.`,
      recommendation: "Mantenha o firewall ativo e revise portas abertas periodicamente.",
    });
  }
  return findings;
}

async function execFileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 15000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(err); else resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

async function checkWindowsSecurity() {
  const findings = [];
  if (process.platform !== "win32") return findings;
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "netsh advfirewall show allprofiles state"]);
    const profileStates = stdout.split(/\r?\n/).filter((l) => /Estado\s*:/.test(l) || /State\s*:/.test(l)).map((l) => l.replace(/Estado\s*:\s*|State\s*:\s*/i, "").trim().toLowerCase());
    const enabledCount = profileStates.filter((s) => s.includes("ativado") || s.includes("enabled")).length;
    const totalProfiles = profileStates.length;
    if (totalProfiles > 0 && enabledCount < totalProfiles) {
      findings.push({
        id: "windows_firewall",
        title: "Firewall do Windows desativado em alguns perfis",
        severity: "high",
        category: "windows_security",
        description: `${enabledCount}/${totalProfiles} perfis de rede com firewall ativado.`,
        recommendation: "Ative o firewall em todos os perfis (netsh advfirewall set allprofiles state on).",
      });
    } else if (totalProfiles > 0) {
      findings.push({
        id: "windows_firewall_ok",
        title: "Firewall do Windows ativado",
        severity: "info",
        category: "windows_security",
        description: `Todos os ${totalProfiles} perfis de rede estao com firewall ativado.`,
        recommendation: "Nenhuma acao necessaria.",
      });
    }
  } catch { /* firewall check unavailable */ }

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", "Get-MpComputerStatus | Select-Object -ExpandProperty AntivirusEnabled"]);
    const enabled = stdout.trim();
    if (enabled === "True") {
      findings.push({ id: "windows_defender_ok", title: "Windows Defender ativado", severity: "info", category: "windows_security", description: "A protecao antivirus em tempo real esta ativa.", recommendation: "Nenhuma acao necessaria." });
    } else if (enabled === "False") {
      findings.push({ id: "windows_defender", title: "Windows Defender desativado", severity: "high", category: "windows_security", description: "A protecao antivirus em tempo real esta desligada.", recommendation: "Ative o Microsoft Defender ou instale um antivirus confiavel." });
    }
  } catch { /* defender check unavailable */ }
  return findings;
}

async function checkSecretsInRepo() {
  const findings = [];
  const candidates = [".env", ".env.local", ".env.development", "credentials.json", "client_secret.json", "id_rsa"];
  const gitignore = path.join(rootDir, ".gitignore");
  let gitignoreContent = "";
  try { gitignoreContent = fs.readFileSync(gitignore, "utf8"); } catch { /* no gitignore */ }

  const found = candidates.filter((name) => fs.existsSync(path.join(rootDir, name)));
  const unignored = found.filter((name) => !gitignoreContent.split(/\r?\n/).some((l) => l.trim() === name || l.trim() === `/${name}`));

  if (found.length > 0 && unignored.length > 0) {
    findings.push({
      id: "secrets_unignored",
      title: "Arquivos sensiveis presentes e fora do .gitignore",
      severity: "high",
      category: "secrets",
      description: `Arquivos como ${unignored.join(", ")} existem no diretorio mas nao estao listados no .gitignore.`,
      recommendation: "Adicione esses arquivos ao .gitignore e verifique o historico do git para segredos ja commitados.",
      file: unignored[0],
    });
  } else if (found.length > 0) {
    findings.push({
      id: "secrets_ignored_ok",
      title: "Arquivos sensiveis protegidos pelo .gitignore",
      severity: "info",
      category: "secrets",
      description: `${found.join(", ")} presente(s) e devidamente ignorado(s) pelo git.`,
      recommendation: "Nenhuma acao necessaria.",
    });
  } else {
    findings.push({
      id: "secrets_absent",
      title: "Nenhum arquivo de credencial encontrado",
      severity: "info",
      category: "secrets",
      description: "Nenhum .env, credentials.json ou chave privada foi encontrado no diretorio raiz.",
      recommendation: "Nenhuma acao necessaria.",
    });
  }
  return findings;
}

async function checkUpdates() {
  const findings = [];
  const pkgFile = path.join(rootDir, "package.json");
  let appVersion = "desconhecida";
  let depsCount = 0;
  try {
    if (fs.existsSync(pkgFile)) {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
      appVersion = pkg.version || "desconhecida";
      depsCount = Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
    }
  } catch { /* ignore */ }
  findings.push({
    id: "updates_policy",
    title: "Politica de atualizacao do sistema",
    severity: "low",
    category: "updates",
    description: `Aplicativo na versao ${appVersion} com ${depsCount} dependencias de npm declaradas.`,
    recommendation: "Mantenha o sistema e as dependencias atualizados. Verifique manualmente por novas versoes do Orun OS.",
  });
  return findings;
}

// ── Public API ──────────────────────────────────────────────────────────

async function runAudit(app) {
  loadMitigated(app);
  const checks = await Promise.all([
    checkApiKeys(),
    checkDependencies(),
    checkOpenPorts(),
    checkWindowsSecurity(),
    checkSecretsInRepo(),
    checkUpdates(),
  ]);

  const all = checks.flat().map((f) => ({
    ...f,
    status: mitigatedIds.has(f.id) ? "mitigated" : "open",
  }));
  const open = all.filter((f) => f.status === "open");
  const score = Math.max(0, Math.min(100, 100 - open.reduce((acc, f) => acc + (SEVERITY_SCORE[f.severity] || 0), 0)));

  lastReport = {
    score,
    grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 55 ? "C" : score >= 35 ? "D" : "F",
    ranAt: new Date().toISOString(),
    summary: {
      total: all.length,
      open: open.length,
      mitigated: all.length - open.length,
      critical: open.filter((f) => f.severity === "critical").length,
      high: open.filter((f) => f.severity === "high").length,
      medium: open.filter((f) => f.severity === "medium").length,
      low: open.filter((f) => f.severity === "low").length,
      info: open.filter((f) => f.severity === "info").length,
      categories: [...new Set(open.map((f) => f.category))],
    },
    findings: all,
  };
  return lastReport;
}

function getLastReport() {
  return lastReport || null;
}

function fixFinding(findingId, app) {
  if (!lastReport) return { success: false, error: "Nenhum relatorio carregado. Rode um scan antes." };
  const finding = lastReport.findings.find((f) => f.id === findingId);
  if (!finding) return { success: false, error: `Finding not found: ${findingId}` };
  if (finding.status === "mitigated") return { success: true, data: finding, message: "Finding ja mitigado" };
  finding.status = "mitigated";
  mitigatedIds.add(findingId);
  persistMitigated(app);
  lastReport.score = Math.max(0, lastReport.score - (SEVERITY_SCORE[finding.severity] || 0));
  return { success: true, data: finding, message: `Finding mitigado: ${finding.title}` };
}

function exportReport() {
  if (!lastReport) return { ok: false, error: "Nenhum relatorio carregado" };
  return { ok: true, report: JSON.stringify(lastReport, null, 2) };
}

function init(app, toolsModule) {
  try { loadMitigated(app); } catch { /* ignore */ }
  try {
    const roots = toolsModule && toolsModule.getAllowedRoots && toolsModule.getAllowedRoots();
    if (Array.isArray(roots) && roots.length) setRootDir(roots[0]);
  } catch { /* keep cwd */ }
  return {
    runAudit: () => runAudit(app),
    getLastReport,
    fixFinding: (id) => fixFinding(id, app),
    exportReport,
    setMitigated,
  };
}

module.exports = { init };

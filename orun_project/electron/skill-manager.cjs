// electron/skill-manager.cjs
// Skill Manager — contrato de extensão do Orun OS (Módulo 1 do roadmap v1).
//
// Camada de REGISTRO sobre o diretório de skills: validação de manifest v1,
// semver, dependências, install/uninstall/enable/disable e superfície de tools
// respeitando permissões declaradas. O carregamento em runtime (VM sandbox)
// continua no plugin-system.cjs — este módulo decide O QUE carregar e em que ordem.

const fs = require("fs");
const path = require("path");
const log = require("electron-log");

const MANIFEST_VERSION = 1;

// Permissões conhecidas do contrato. Desconhecidas geram warning (não bloqueiam),
// para não quebrar skills futuras; o carregamento é bloqueado se o manifest for inválido.
const KNOWN_PERMISSIONS = [
  "fs:read",
  "fs:write",
  "network",
  "shell",
  "audio",
  "voice",
  "clipboard",
  "window",
];

const ID_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

function isSemver(v) {
  return typeof v === "string" && SEMVER_RE.test(v);
}

function compareSemver(a, b) {
  const coreA = a.split("+")[0].split("-")[0].split(".").map(Number);
  const coreB = b.split("+")[0].split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const na = coreA[i] || 0;
    const nb = coreB[i] || 0;
    if (na !== nb) return na - nb;
  }
  const preA = a.split("+")[0].split("-")[1];
  const preB = b.split("+")[0].split("-")[1];
  if (!preA && !preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;
  return preA < preB ? -1 : preA > preB ? 1 : 0;
}

// Suporta: "*", "x", versão exata, prefixo, >=, <=, >, <, ^, ~ e ranges separados
// por espaço ou vírgula (AND). Faixas não reconhecidas não bloqueiam (fail-open).
function satisfiesRange(version, range) {
  if (!isSemver(version) || typeof range !== "string") return false;
  const parts = range.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((part) => {
    const bare = part.trim();
    if (bare === "*" || bare === "x" || bare === "X") return true;
    const wc = bare.match(/^(\d+)(?:\.(\d+))?(?:\.([xX*]))?$/);
    if (wc) {
      const [coreVersion] = version.split("+")[0].split("-");
      const [vMajor, vMinor] = coreVersion.split(".").map(Number);
      const major = Number(wc[1]);
      if (wc[2] === undefined) return vMajor === major;
      const minor = Number(wc[2]);
      if (wc[3] !== undefined) return vMajor === major && vMinor === minor;
      return compareSemver(version, `${major}.${minor}.0`) >= 0 && compareSemver(version, `${major}.${minor + 1}.0`) < 0;
    }
    const m = bare.match(/^(>=|<=|>|<|\^|~|=)?(.*)$/);
    const op = m[1] || "=";
    const ver = m[2].trim();
    if (!isSemver(ver)) return true;
    if (op === "^") {
      const [major, minor, patch] = ver.split(".").map(Number);
      if (major > 0) return compareSemver(version, `${major}.0.0`) >= 0 && compareSemver(version, `${major + 1}.0.0`) < 0;
      if (minor > 0) return compareSemver(version, `0.${minor}.0`) >= 0 && compareSemver(version, `0.${minor + 1}.0`) < 0;
      return compareSemver(version, `0.0.${patch}`) >= 0 && compareSemver(version, `0.0.${patch + 1}`) < 0;
    }
    if (op === "~") {
      const [major, minor] = ver.split(".").map(Number);
      return compareSemver(version, `${major}.${minor}.0`) >= 0 && compareSemver(version, `${major}.${minor + 1}.0`) < 0;
    }
    if (op === ">") return compareSemver(version, ver) > 0;
    if (op === ">=") return compareSemver(version, ver) >= 0;
    if (op === "<") return compareSemver(version, ver) < 0;
    if (op === "<=") return compareSemver(version, ver) <= 0;
    return compareSemver(version, ver) === 0;
  });
}

// Valida um manifest. Retorna { ok, errors, warnings }.
function validateManifest(manifest, { id } = {}) {
  const errors = [];
  const warnings = [];
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, errors: ["manifest.json inválido ou ausente"], warnings: [] };
  }
  const idVal = manifest.id ?? id;
  if (typeof idVal !== "string" || !ID_RE.test(idVal)) {
    errors.push(`id: obrigatório, 1-64 chars, apenas [a-zA-Z0-9._-] (recebido: ${JSON.stringify(idVal)})`);
  }
  if (manifest.id != null && id != null && manifest.id !== id) {
    errors.push(`id: divergente ('${manifest.id}' no manifest vs pasta '${id}')`);
  }
  if (typeof manifest.name !== "string" || !manifest.name.trim()) {
    errors.push("name: obrigatório");
  }
  if (manifest.name != null && typeof manifest.name === "string" && manifest.name.length > 100) {
    warnings.push("name: longo demais (>100 chars)");
  }
  if (!isSemver(manifest.version)) {
    errors.push(`version: deve ser semver (ex.: 1.0.0) — recebido: ${JSON.stringify(manifest.version)}`);
  }
  if (manifest.entry != null && typeof manifest.entry !== "string") {
    errors.push("entry: deve ser string");
  }
  if (manifest.main != null) {
    warnings.push("main: obsoleto, usar 'entry' (mesmo valor aceito)");
    if (typeof manifest.main !== "string") errors.push("main: deve ser string");
  }
  if (manifest.author != null && typeof manifest.author !== "string") {
    errors.push("author: deve ser string");
  }
  if (manifest.description != null && typeof manifest.description !== "string") {
    errors.push("description: deve ser string");
  }
  if (!Array.isArray(manifest.permissions)) {
    if (manifest.permissions == null) {
      warnings.push("permissions: ausente — assumindo nenhuma permissão");
    } else {
      errors.push("permissions: deve ser array");
    }
  } else {
    for (const p of manifest.permissions) {
      if (typeof p !== "string" || !KNOWN_PERMISSIONS.includes(p)) {
        warnings.push(`permissions: '${String(p)}' desconhecida (ignorada)`);
      }
    }
  }
  if (manifest.dependencies != null) {
    if (typeof manifest.dependencies !== "object" || Array.isArray(manifest.dependencies)) {
      errors.push("dependencies: deve ser objeto { skillId: \"faixa-semver\" }");
    } else {
      for (const [dep, range] of Object.entries(manifest.dependencies)) {
        if (!ID_RE.test(dep)) errors.push(`dependencies: chave '${dep}' inválida`);
        if (typeof range !== "string") errors.push(`dependencies['${dep}']: range deve ser string`);
      }
    }
  }
  if (manifest.compat != null) {
    if (typeof manifest.compat !== "object" || Array.isArray(manifest.compat)) {
      errors.push("compat: deve ser objeto { minOrun?, platforms? }");
    } else {
      if (manifest.compat.minOrun != null && !isSemver(manifest.compat.minOrun)) {
        errors.push(`compat.minOrun: deve ser semver (recebido: ${JSON.stringify(manifest.compat.minOrun)})`);
      }
      if (manifest.compat.platforms != null) {
        if (!Array.isArray(manifest.compat.platforms)) {
          errors.push("compat.platforms: deve ser array");
        } else {
          for (const p of manifest.compat.platforms) {
            if (!["win32", "darwin", "linux"].includes(p)) warnings.push(`compat.platforms: '${p}' desconhecida`);
          }
        }
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}

const DISABLED_MARKER = ".disabled";

function copyDirSync(src, dest) {
  if (fs.cpSync) {
    fs.cpSync(src, dest, { recursive: true });
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

class SkillManager {
  constructor(dir, opts = {}) {
    if (!dir) throw new Error("SkillManager requires a directory");
    this.dir = dir;
    this.runtime = opts.runtime || null; // plugin-system.cjs (sandbox VM) quando disponível
  }

  init() {
    fs.mkdirSync(this.dir, { recursive: true });
    return this;
  }

  _skillDir(id) {
    if (typeof id !== "string" || !ID_RE.test(id)) return null;
    const target = path.resolve(this.dir, id);
    const root = path.resolve(this.dir);
    if (!target.startsWith(root + path.sep)) return null;
    return target;
  }

  readManifest(id) {
    const dir = this._skillDir(id);
    if (!dir || !fs.existsSync(dir)) return null;
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch {
      return null;
    }
  }

  isEnabled(id) {
    const dir = this._skillDir(id);
    if (!dir) return false;
    return !fs.existsSync(path.join(dir, DISABLED_MARKER));
  }

  setEnabled(id, enabled) {
    const dir = this._skillDir(id);
    if (!dir || !fs.existsSync(dir)) return { ok: false, error: `Skill '${id}' não instalada` };
    const marker = path.join(dir, DISABLED_MARKER);
    try {
      if (enabled) {
        if (fs.existsSync(marker)) fs.unlinkSync(marker);
      } else {
        fs.writeFileSync(marker, new Date().toISOString(), "utf8");
      }
      return { ok: true, id, enabled: Boolean(enabled) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Lista todas as skills instaladas com estado enriquecido.
  list() {
    if (!fs.existsSync(this.dir)) return [];
    const result = [];
    let dirs = [];
    try {
      dirs = fs.readdirSync(this.dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    } catch {
      return [];
    }
    for (const d of dirs) {
      const id = d.name;
      const manifest = this.readManifest(id);
      const validation = validateManifest(manifest, { id });
      const deps = manifest && manifest.dependencies ? Object.keys(manifest.dependencies) : [];
      const installed = new Set(result.map((s) => s.id));
      const allIds = dirs.map((x) => x.name);
      const missingDeps = deps.filter((dep) => !allIds.includes(dep));
      result.push({
        id,
        name: manifest && manifest.name ? manifest.name : id,
        version: manifest && manifest.version ? manifest.version : "0.0.0",
        author: manifest && manifest.author ? manifest.author : "",
        description: manifest && manifest.description ? manifest.description : "",
        enabled: this.isEnabled(id),
        status: validation.ok ? "ok" : "invalid",
        errors: validation.errors,
        warnings: validation.warnings,
        permissions: manifest && Array.isArray(manifest.permissions) ? manifest.permissions : [],
        dependencies: manifest && manifest.dependencies ? manifest.dependencies : {},
        missingDeps,
        manifestVersion: manifest && manifest.manifestVersion != null ? manifest.manifestVersion : MANIFEST_VERSION,
        installed: installed.has(id),
      });
    }
    return result;
  }

  details(id) {
    const dir = this._skillDir(id);
    if (!dir || !fs.existsSync(dir)) return { ok: false, error: `Skill '${id}' não instalada` };
    const manifest = this.readManifest(id);
    const validation = validateManifest(manifest, { id });
    const all = new Map(this.list().map((s) => [s.id, s]));
    const depState = {};
    for (const [dep, range] of Object.entries((manifest && manifest.dependencies) || {})) {
      const depSkill = all.get(dep);
      if (!depSkill) depState[dep] = { satisfied: false, reason: "não instalada", range };
      else if (!depSkill.enabled) depState[dep] = { satisfied: false, reason: "desabilitada", range, version: depSkill.version };
      else if (!satisfiesRange(depSkill.version, range)) depState[dep] = { satisfied: false, reason: `versão ${depSkill.version} fora da faixa`, range, version: depSkill.version };
      else depState[dep] = { satisfied: true, range, version: depSkill.version };
    }
    return {
      ok: true,
      id,
      manifest: manifest || {},
      validation,
      enabled: this.isEnabled(id),
      dependencies: depState,
      loaded: this.runtime ? this.runtime.isLoaded ? this.runtime.isLoaded(id) : false : false,
    };
  }

  // Instala uma skill a partir de uma pasta local (manifest.json na raiz).
  installFromDir(srcDir, { force = false } = {}) {
    if (typeof srcDir !== "string" || !srcDir) return { ok: false, error: "srcDir é obrigatório" };
    const absSrc = path.resolve(srcDir);
    if (!fs.existsSync(absSrc)) return { ok: false, error: `Diretório não encontrado: ${absSrc}` };
    if (!fs.statSync(absSrc).isDirectory()) return { ok: false, error: "srcDir deve ser um diretório" };
    const manifestPath = path.join(absSrc, "manifest.json");
    if (!fs.existsSync(manifestPath)) return { ok: false, error: `manifest.json ausente em ${absSrc}` };
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
      return { ok: false, error: `manifest.json inválido: ${e.message}` };
    }
    const validation = validateManifest(manifest);
    if (!validation.ok) return { ok: false, error: `Manifest inválido: ${validation.errors.join("; ")}` };
    const id = manifest.id;
    const target = this._skillDir(id);
    if (!target) return { ok: false, error: "id inválido" };
    if (fs.existsSync(target)) {
      if (!force) return { ok: false, error: `Skill '${id}' já instalada (use force=true para substituir)` };
      try {
        fs.rmSync(target, { recursive: true, force: true });
      } catch (e) {
        return { ok: false, error: `Falha ao remover versão anterior: ${e.message}` };
      }
    }
    try {
      copyDirSync(absSrc, target);
      // instalada = habilitada por padrão
      const marker = path.join(target, DISABLED_MARKER);
      if (fs.existsSync(marker)) fs.unlinkSync(marker);
      return { ok: true, id, version: manifest.version, warnings: validation.warnings };
    } catch (e) {
      return { ok: false, error: `Falha ao copiar skill: ${e.message}` };
    }
  }

  uninstall(id) {
    const target = this._skillDir(id);
    if (!target || !fs.existsSync(target)) return { ok: false, error: `Skill '${id}' não instalada` };
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return { ok: true, id };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Resolve a ordem de carregamento (topológica) das skills habilitadas e válidas.
  resolveLoadOrder() {
    const all = this.list();
    const byId = new Map(all.map((s) => [s.id, s]));
    const enabled = all.filter((s) => s.enabled && s.status === "ok");
    const state = new Map();
    const order = [];
    const errors = [];

    const visit = (id, stack) => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") {
        errors.push(`ciclo de dependência: ${[...stack, id].join(" -> ")}`);
        return;
      }
      const skill = byId.get(id);
      if (!skill) {
        errors.push(`dependência ausente: '${id}'`);
        return;
      }
      state.set(id, "visiting");
      for (const [dep, range] of Object.entries(skill.dependencies)) {
        const depSkill = byId.get(dep);
        if (!depSkill) {
          errors.push(`skill '${id}' depende de '${dep}' que não está instalada`);
          continue;
        }
        if (!depSkill.enabled) {
          errors.push(`skill '${id}' depende de '${dep}' que está desabilitada`);
          continue;
        }
        if (!satisfiesRange(depSkill.version, range)) {
          errors.push(`skill '${id}' requer '${dep}' na faixa ${range}, mas '${dep}' está na ${depSkill.version} (fora da faixa)`);
          continue;
        }
        visit(dep, [...stack, id]);
      }
      state.set(id, "done");
      order.push(id);
    };

    for (const s of enabled) visit(s.id, []);
    return { order, errors, enabled: enabled.map((s) => s.id) };
  }

  // Recarrega o runtime respeitando enable/disable + dependências.
  reload() {
    if (!this.runtime) return { ok: false, error: "runtime não configurado" };
    const { order, errors } = this.resolveLoadOrder();
    let loaded = 0;
    const failed = [];
    if (this.runtime.unloadAll) this.runtime.unloadAll();
    for (const id of order) {
      const res = this.runtime.loadPlugin(id);
      if (res && res.error) failed.push({ id, error: res.error });
      else loaded += 1;
    }
    return { ok: errors.length === 0 && failed.length === 0, order, errors, failed, loaded };
  }

  // Tools das skills carregadas e habilitadas (com permissões declaradas).
  surfaceTools() {
    if (!this.runtime || !this.runtime.getPluginTools) return [];
    return this.runtime.getPluginTools().filter((t) => {
      const id = extractSkillIdFromTool(t.name);
      if (!id) return false;
      const dir = this._skillDir(id);
      if (!dir || !fs.existsSync(dir)) return false;
      return this.isEnabled(id);
    });
  }

  executeTool(fullName, args) {
    if (!this.runtime || !this.runtime.executePluginTool) {
      return { error: "runtime não configurado" };
    }
    const id = extractSkillIdFromTool(fullName);
    if (!id) return { error: "tool inválida" };
    if (!this.isEnabled(id)) return { error: `skill '${id}' está desabilitada` };
    const manifest = this.readManifest(id);
    if (manifest) {
      const validation = validateManifest(manifest, { id });
      if (!validation.ok) return { error: `skill '${id}' com manifest inválido` };
    }
    return this.runtime.executePluginTool(fullName, args);
  }

  static validateManifest = validateManifest;
  static satisfiesRange = satisfiesRange;
  static compareSemver = compareSemver;
  static KNOWN_PERMISSIONS = KNOWN_PERMISSIONS;
  static MANIFEST_VERSION = MANIFEST_VERSION;
}

function extractSkillIdFromTool(fullName) {
  if (typeof fullName !== "string") return null;
  const sep = fullName.indexOf("__");
  if (sep === -1) return null;
  const prefix = fullName.slice(0, sep);
  if (!prefix.startsWith("plugin_")) return null;
  return prefix.slice("plugin_".length);
}

// Helper de logging (evita require não usado de electron-log quando só módulos puros são importados)
function debug(msg) {
  try {
    log.info(`[skills] ${msg}`);
  } catch { /* ignore */ }
}

module.exports = { SkillManager, validateManifest, satisfiesRange, compareSemver, KNOWN_PERMISSIONS, MANIFEST_VERSION };

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  SkillManager,
  validateManifest,
  satisfiesRange,
  compareSemver,
  KNOWN_PERMISSIONS,
} = require("../skill-manager.cjs");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orun-skills-"));
}

function writeSkill(dir, id, manifest, files = {}) {
  const skillDir = path.join(dir, id);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(skillDir, name), content);
  }
  return skillDir;
}

describe("validateManifest", () => {
  it("aceita um manifest válido mínimo", () => {
    const res = validateManifest({ id: "hello-skill", name: "Hello", version: "1.0.0" });
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("rejeita manifest sem id", () => {
    const res = validateManifest({ name: "Hello", version: "1.0.0" });
    expect(res.ok).toBe(false);
    expect(res.errors.join()).toContain("id");
  });

  it("rejeita id com caracteres inválidos", () => {
    const res = validateManifest({ id: "ola mundo!", name: "X", version: "1.0.0" });
    expect(res.ok).toBe(false);
  });

  it("rejeita id divergente entre manifest e pasta", () => {
    const res = validateManifest({ id: "a", name: "X", version: "1.0.0" }, { id: "b" });
    expect(res.ok).toBe(false);
    expect(res.errors.join()).toContain("divergente");
  });

  it("rejeita versão que não é semver", () => {
    const res = validateManifest({ id: "x", name: "X", version: "abc" });
    expect(res.ok).toBe(false);
    expect(res.errors.join()).toContain("semver");
  });

  it("avisa sobre permissão desconhecida mas não bloqueia", () => {
    const res = validateManifest({ id: "x", name: "X", version: "1.0.0", permissions: ["fs:read", "hack"] });
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => w.includes("hack"))).toBe(true);
  });

  it("rejeita permissions não-array", () => {
    const res = validateManifest({ id: "x", name: "X", version: "1.0.0", permissions: "fs:read" });
    expect(res.ok).toBe(false);
  });

  it("rejeita dependências não-objeto", () => {
    const res = validateManifest({ id: "x", name: "X", version: "1.0.0", dependencies: ["dep"] });
    expect(res.ok).toBe(false);
  });

  it("avisa quando usa main no lugar de entry", () => {
    const res = validateManifest({ id: "x", name: "X", version: "1.0.0", main: "index.js" });
    expect(res.ok).toBe(true);
    expect(res.warnings.some((w) => w.includes("obsoleto"))).toBe(true);
  });

  it("rejeita compat.minOrun não-semver", () => {
    const res = validateManifest({ id: "x", name: "X", version: "1.0.0", compat: { minOrun: "0.6" } });
    expect(res.ok).toBe(false);
  });
});

describe("semver helpers", () => {
  it("compareSemver ordena corretamente", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("1.2.4", "1.2.3")).toBeGreaterThan(0);
    expect(compareSemver("1.2.3", "1.10.0")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.0-rc.1")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0-rc.1", "1.0.0")).toBeLessThan(0);
  });

  it("satisfiesRange aceita faixas", () => {
    expect(satisfiesRange("1.2.3", "*")).toBe(true);
    expect(satisfiesRange("1.2.3", "1.2.3")).toBe(true);
    expect(satisfiesRange("1.2.4", "1.2.3")).toBe(false);
    expect(satisfiesRange("1.5.0", "^1.2.3")).toBe(true);
    expect(satisfiesRange("2.0.0", "^1.2.3")).toBe(false);
    expect(satisfiesRange("1.2.9", "~1.2.3")).toBe(true);
    expect(satisfiesRange("1.3.0", "~1.2.3")).toBe(false);
    expect(satisfiesRange("1.9.0", ">=1.2.3")).toBe(true);
    expect(satisfiesRange("1.0.0", ">=1.2.3")).toBe(false);
    expect(satisfiesRange("1.2.5", ">=1.2.3 <1.3.0")).toBe(true);
    expect(satisfiesRange("1.3.0", ">=1.2.3 <1.3.0")).toBe(false);
    expect(satisfiesRange("1.2.3", "0.6.x")).toBe(false);
  });

  it("KNOWN_PERMISSIONS cobre o contrato", () => {
    expect(KNOWN_PERMISSIONS).toContain("fs:read");
    expect(KNOWN_PERMISSIONS).toContain("network");
    expect(KNOWN_PERMISSIONS).toContain("voice");
  });
});

describe("SkillManager lifecycle", () => {
  let manager;
  let dir;

  beforeEach(() => {
    dir = tmpDir();
    manager = new SkillManager(dir);
    manager.init();
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("lista vazio quando não há skills", () => {
    expect(manager.list()).toEqual([]);
  });

  it("instala a partir de pasta local e lista com estado ok", () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), "orun-src-"));
    writeSkill(src, "whatever", { id: "my-skill", name: "My Skill", version: "1.2.3", author: "eu" }, { "index.js": "console.log(1)" });

    const res = manager.installFromDir(path.join(src, "whatever"));
    expect(res.ok).toBe(true);
    expect(res.id).toBe("my-skill");

    const list = manager.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("my-skill");
    expect(list[0].status).toBe("ok");
    expect(list[0].enabled).toBe(true);
    expect(list[0].version).toBe("1.2.3");
  });

  it("recusa instalar manifest inválido", () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), "orun-src-"));
    writeSkill(src, "bad", { name: "sem id" });
    const res = manager.installFromDir(path.join(src, "bad"));
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Manifest inválido");
    expect(manager.list()).toEqual([]);
  });

  it("recusa instalar sem manifest.json", () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), "orun-src-"));
    const res = manager.installFromDir(src);
    expect(res.ok).toBe(false);
  });

  it("recusa duplicar sem force e substitui com force", () => {
    const src = fs.mkdtempSync(path.join(os.tmpdir(), "orun-src-"));
    writeSkill(src, "s", { id: "dup", name: "Dup", version: "1.0.0" });
    manager.installFromDir(path.join(src, "s"));

    writeSkill(src, "s", { id: "dup", name: "Dup", version: "2.0.0" });
    const res = manager.installFromDir(path.join(src, "s"));
    expect(res.ok).toBe(false);
    expect(res.error).toContain("já instalada");

    const res2 = manager.installFromDir(path.join(src, "s"), { force: true });
    expect(res2.ok).toBe(true);
    expect(manager.list()[0].version).toBe("2.0.0");
  });

  it("desinstala", () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0" });
    const res = manager.uninstall("a");
    expect(res.ok).toBe(true);
    expect(manager.list()).toEqual([]);
    expect(manager.uninstall("nao-existe").ok).toBe(false);
  });

  it("bloqueia path traversal", () => {
    expect(manager._skillDir("../../etc")).toBeNull();
    expect(manager._skillDir("a/b")).toBeNull();
    expect(manager._skillDir("valid-skill-1")).not.toBeNull();
  });

  it("habilita/desabilita via marker", () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0" });
    expect(manager.isEnabled("a")).toBe(true);
    const off = manager.setEnabled("a", false);
    expect(off.ok).toBe(true);
    expect(manager.isEnabled("a")).toBe(false);
    expect(manager.list()[0].enabled).toBe(false);
    manager.setEnabled("a", true);
    expect(manager.isEnabled("a")).toBe(true);
  });

  it("resolve ordem topológica das dependências", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "1.0.0" });
    writeSkill(dir, "mid", { id: "mid", name: "Mid", version: "1.0.0", dependencies: { base: "^1.0.0" } });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { mid: "1.x", base: "*" } });

    const { order, errors } = manager.resolveLoadOrder();
    expect(errors).toEqual([]);
    expect(order).toHaveLength(3);
    expect(order.indexOf("base")).toBeLessThan(order.indexOf("mid"));
    expect(order.indexOf("mid")).toBeLessThan(order.indexOf("top"));
  });

  it("aponta dependência ausente", () => {
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { ghost: "1.0.0" } });
    const { errors } = manager.resolveLoadOrder();
    expect(errors.some((e) => e.includes("ghost") && e.includes("não está instalada"))).toBe(true);
  });

  it("aponta dependência desabilitada", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "1.0.0" });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { base: "1.0.0" } });
    manager.setEnabled("base", false);
    const { errors } = manager.resolveLoadOrder();
    expect(errors.some((e) => e.includes("desabilitada"))).toBe(true);
  });

  it("aponta versão incompatível", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "2.0.0" });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { base: "^1.0.0" } });
    const { errors } = manager.resolveLoadOrder();
    expect(errors.some((e) => e.includes("fora da faixa"))).toBe(true);
  });

  it("detecta ciclo de dependência", () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0", dependencies: { b: "1.0.0" } });
    writeSkill(dir, "b", { id: "b", name: "B", version: "1.0.0", dependencies: { a: "1.0.0" } });
    const { errors } = manager.resolveLoadOrder();
    expect(errors.some((e) => e.includes("ciclo"))).toBe(true);
  });
});

describe("SkillManager runtime integration", () => {
  let manager;
  let dir;
  let runtime;

  beforeEach(() => {
    dir = tmpDir();
    runtime = {
      loaded: new Set(),
      unloadAll() { this.loaded.clear(); return { success: true, unloaded: 0 }; },
      isLoaded: (id) => runtime.loaded.has(id),
      loadPlugin(id) { if (id === "boom") return { error: "falhou" }; runtime.loaded.add(id); return { success: true, tools: 0, hooks: [] }; },
      getPluginTools() {
        return [...runtime.loaded].map((id) => ({ name: `plugin_${id}__tool`, description: "x", parameters: { type: "object", properties: {} } }));
      },
      executePluginTool(fullName, args) {
        const id = fullName.split("__")[0].replace("plugin_", "");
        return runtime.loaded.has(id) ? { ok: true, id, args } : { error: "não carregada" };
      },
    };
    manager = new SkillManager(dir, { runtime });
    manager.init();
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("reload carrega na ordem correta", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "1.0.0" });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { base: "1.0.0" } });
    const res = manager.reload();
    expect(res.ok).toBe(true);
    expect(res.order).toEqual(["base", "top"]);
    expect(runtime.loaded.has("base")).toBe(true);
    expect(runtime.loaded.has("top")).toBe(true);
  });

  it("reload ignora skill desabilitada e não carrega deps de skill desabilitada", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "1.0.0" });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { base: "1.0.0" } });
    manager.setEnabled("top", false);
    const res = manager.reload();
    expect(res.order).toEqual(["base"]);
    expect(runtime.loaded.has("top")).toBe(false);
  });

  it("reload reporta falhas e preserva o resto", () => {
    writeSkill(dir, "boom", { id: "boom", name: "Boom", version: "1.0.0" });
    writeSkill(dir, "ok", { id: "ok", name: "Ok", version: "1.0.0" });
    const res = manager.reload();
    expect(res.ok).toBe(false);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].id).toBe("boom");
    expect(runtime.loaded.has("ok")).toBe(true);
  });

  it("surfaceTools só expõe tools de skills habilitadas", () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0" });
    writeSkill(dir, "b", { id: "b", name: "B", version: "1.0.0" });
    manager.reload();
    manager.setEnabled("b", false);
    const tools = manager.surfaceTools();
    expect(tools.map((t) => t.name)).toEqual(["plugin_a__tool"]);
  });

  it("executeTool bloqueia skill desabilitada", async () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0" });
    manager.reload();
    manager.setEnabled("a", false);
    const res = await manager.executeTool("plugin_a__tool", {});
    expect(res.error).toContain("desabilitada");
  });

  it("executeTool repassa para o runtime quando habilidada", async () => {
    writeSkill(dir, "a", { id: "a", name: "A", version: "1.0.0" });
    manager.reload();
    const res = await manager.executeTool("plugin_a__tool", { x: 1 });
    expect(res.ok).toBe(true);
    expect(res.args).toEqual({ x: 1 });
  });

  it("details reporta estado das dependências", () => {
    writeSkill(dir, "base", { id: "base", name: "Base", version: "1.0.0" });
    writeSkill(dir, "top", { id: "top", name: "Top", version: "1.0.0", dependencies: { base: "^1.0.0" } });
    const d = manager.details("top");
    expect(d.ok).toBe(true);
    expect(d.dependencies.base.satisfied).toBe(true);
    const d2 = manager.details("base");
    expect(d2.dependencies).toEqual({});
  });
});

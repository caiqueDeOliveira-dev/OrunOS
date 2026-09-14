import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @orun/ai-router-node depende de better-sqlite3 NATIVO, compilado contra a
// ABI do Electron. Quando o vitest roda em Node puro (ou ABI diferente),
// o módulo .node não carrega. Detectamos e pulamos os testes nesse caso —
// o comportamento real da migração também é validado no app em runtime.
let Database = null;
let nodePkg = null;
let sqliteAvailable = false;
try {
  const mod = await import("better-sqlite3");
  Database = mod.default ?? mod.Database;
  nodePkg = await import("@orun/ai-router-node");
  const probe = new Database(":memory:");
  probe.close();
  sqliteAvailable = true;
} catch {
  Database = null;
  nodePkg = null;
  sqliteAvailable = false;
}

const tmpDirs = [];

function makeTmpDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orun-mig4-"));
  tmpDirs.push(dir);
  return path.join(dir, "ai-router.sqlite");
}

const canUseSqlite = () => sqliteAvailable;

function seedOldState(dbPath) {
  const raw = new Database(dbPath);
  raw.exec(`
    CREATE TABLE IF NOT EXISTS combos (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));
  `);
  // estado ANTIGO do banco real (build instalado): kiro → opencode-free → vertex → ollama
  const insert = raw.prepare("INSERT INTO combos (id, data) VALUES (?, ?)");
  insert.run(
    "free-forever",
    JSON.stringify({
      id: "free-forever",
      name: "Free Forever",
      kind: "text",
      isSystemDefault: true,
      rtkEnabled: true,
      steps: [
        { providerId: "kiro", models: ["claude-sonnet-4.5"], maxRetries: 1 },
        { providerId: "opencode-free", model: "auto", maxRetries: 1 },
        { providerId: "vertex-ai", model: "gemini-3.1-pro-preview", maxRetries: 1 },
        { providerId: "ollama", model: "qwen2.5:14b", maxRetries: 0 },
      ],
    }),
  );
  insert.run(
    "Orun Router Provider",
    JSON.stringify({
      id: "Orun Router Provider",
      name: "Orun Router Provider",
      kind: "text",
      steps: [
        { providerId: "opencode-free", model: "auto", maxRetries: 1 },
        { providerId: "groq", models: ["llama-3.3-70b-versatile"], maxRetries: 1 },
      ],
    }),
  );
  // v1..v3 já aplicadas (banco velho), v4 ainda não
  for (const v of [1, 2, 3]) {
    raw.prepare("INSERT INTO _migrations (version) VALUES (?)").run(v);
  }
  raw.close();
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe.skipIf(!canUseSqlite())("ai-router migration v4 (re-seed dos combos builtin)", () => {
  it("atualiza combos builtin antigos para a definicao nova sem tocar em customizados", async () => {
    const dbPath = makeTmpDb();
    seedOldState(dbPath);
    const db = nodePkg.openAiRouterDatabase(dbPath);
    const store = new nodePkg.SqliteComboStore(db);
    const combos = await store.listCombos();

    const forever = combos.find((c) => c.id === "free-forever");
    const custom = combos.find((c) => c.id === "Orun Router Provider");

    // builtin foi re-seedado: primeiro provider agora é groq (não kiro), com gpt-oss
    expect(forever).toBeTruthy();
    expect(forever.steps[0].providerId).toBe("groq");
    expect(forever.steps[0].models).toContain("openai/gpt-oss-120b");
    expect(forever.steps[0].providerId).not.toBe("kiro");

    // customizado permanece intacto
    expect(custom).toBeTruthy();
    expect(custom.steps[0].providerId).toBe("opencode-free");

    // migração marcada como aplicada
    const applied = db.prepare("SELECT version FROM _migrations").all().map((r) => r.version);
    expect(applied).toContain(4);
    db.close();
  });

  it("idempotente: segunda abertura nao re-altera o estado", async () => {
    const dbPath = makeTmpDb();
    seedOldState(dbPath);
    const db1 = nodePkg.openAiRouterDatabase(dbPath);
    const store1 = new nodePkg.SqliteComboStore(db1);
    const forever1 = (await store1.listCombos()).find((c) => c.id === "free-forever");
    expect(forever1.steps[0].providerId).toBe("groq");
    const applied1 = db1.prepare("SELECT version FROM _migrations").all().map((r) => r.version);
    db1.close();

    const db2 = nodePkg.openAiRouterDatabase(dbPath);
    const store2 = new nodePkg.SqliteComboStore(db2);
    const forever2 = (await store2.listCombos()).find((c) => c.id === "free-forever");
    expect(forever2.steps[0].providerId).toBe("groq");
    const applied2 = db2.prepare("SELECT version FROM _migrations").all().map((r) => r.version);
    expect(applied2).toEqual(applied1);
    db2.close();
  });
});
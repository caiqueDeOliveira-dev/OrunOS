// electron/__tests__/knowledge-engine.test.cjs
// Testes do Knowledge Engine (Módulo 3).

const fs = require("fs");
const os = require("os");
const path = require("path");

const { createKnowledgeEngine, makeId, renderADR, renderChangelog } = require("../knowledge-engine.cjs");

function tmpFile() {
  return path.join(os.tmpdir(), `knowledge-engine-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("makeId", () => {
  it("combina kind, título e data", () => {
    expect(makeId("adr", "Usar pgvector", "2026-08-04")).toBe("doc::adr::2026-08-04::Usar pgvector");
  });
});

describe("renderChangelog / renderADR", () => {
  it("gera changelog markdown a partir das linhas do git log", () => {
    const md = renderChangelog(["2026-08-04 | feat: memory engine", "2026-08-03 | fix: avatar"], { title: "Changelog", date: "2026-08-04" });
    expect(md).toContain("# Changelog");
    expect(md).toContain("- 2026-08-04 | feat: memory engine");
  });

  it("gera ADR estruturado", () => {
    const md = renderADR({ title: "Supabase como fonte de verdade", context: "Mobile precisa herdar", decision: "Usar Supabase", consequences: ["Estado compartilhado"], status: "Accepted", date: "2026-08-04" });
    expect(md).toContain("ADR-20260804");
    expect(md).toContain("## Contexto");
    expect(md).toContain("## Decisão");
    expect(md).toContain("Usar Supabase");
    expect(md).toContain("- Estado compartilhado");
  });
});

describe("save", () => {
  it("valida title e content obrigatórios", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    expect(await engine.save({ title: "", content: "x" })).toMatchObject({ ok: false, error: "title é obrigatório" });
    expect(await engine.save({ title: "a", content: "" })).toMatchObject({ ok: false, error: "content é obrigatório" });
  });

  it("salva um documento com id composto e espelha para a nuvem", async () => {
    const upsert = vi.fn().mockResolvedValue({ ok: true });
    const engine = createKnowledgeEngine({ filePath: tmpFile(), cloud: { upsert, remove: vi.fn() } });
    const res = await engine.save({ kind: "adr", title: "Decisão X", content: "contexto", date: "2026-08-04" });
    expect(res.ok).toBe(true);
    expect(res.record.id).toBe("doc::adr::2026-08-04::Decisão X");
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(upsert.mock.calls[0][0].uid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("atualiza o mesmo documento em vez de duplicar", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    await engine.save({ kind: "note", title: "Nota", content: "v1", date: "2026-08-04" });
    const second = await engine.save({ kind: "note", title: "Nota", content: "v2", date: "2026-08-04" });
    expect(second.updated).toBe(true);
    expect(engine.load()).toHaveLength(1);
    expect(engine.load()[0].content).toBe("v2");
  });
});

describe("generateChangelog / generateDiary / recordADR", () => {
  it("gera changelog a partir de um gitLog fake", async () => {
    const engine = createKnowledgeEngine({
      filePath: tmpFile(),
      gitLog: async () => ({ ok: true, lines: ["2026-08-04 | feat: m3"] }),
    });
    const res = await engine.generateChangelog({ repoPath: "/repo", title: "Changelog M3", date: "2026-08-04" });
    expect(res.ok).toBe(true);
    expect(res.record.content).toContain("feat: m3");
    expect(res.record.kind).toBe("changelog");
  });

  it("falha sem repoPath no changelog", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    const res = await engine.generateChangelog({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain("repoPath");
  });

  it("gera diário com resumo por LLM quando disponível", async () => {
    const summarize = vi.fn().mockResolvedValue("# Diário\n## Destaques\nFeito o M3");
    const engine = createKnowledgeEngine({
      filePath: tmpFile(),
      gitLog: async () => ({ ok: true, lines: ["2026-08-04 | feat: m3"] }),
      summarize,
    });
    const res = await engine.generateDiary({ date: "2026-08-04", repoPath: "/repo", memories: [{ content: "decisão" }] });
    expect(res.ok).toBe(true);
    expect(summarize).toHaveBeenCalledTimes(1);
    expect(res.record.content).toContain("Feito o M3");
  });

  it("gera diário raw sem summarize", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile(), gitLog: async () => ({ ok: false, error: "no git" }) });
    const res = await engine.generateDiary({ date: "2026-08-04", memories: [{ content: "memória X" }] });
    expect(res.ok).toBe(true);
    expect(res.record.content).toContain("# Diário 2026-08-04");
    expect(res.record.content).toContain("memória X");
  });

  it("gera ADR com metadata de status", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    const res = await engine.recordADR({ title: "Usar nomic", context: "ctx", decision: "dec", status: "Accepted" });
    expect(res.ok).toBe(true);
    expect(res.record.tags).toContain("adr");
    expect(res.record.metadata.status).toBe("Accepted");
  });
});

describe("list / get / remove / stats", () => {
  it("lista, busca, remove e conta por tipo", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    await engine.recordADR({ title: "Decisão A", decision: "x", context: "c" });
    await engine.save({ kind: "note", title: "Nota", content: "n", date: "2026-08-04" });

    const list = engine.list({ kind: "adr" });
    expect(list).toHaveLength(1);
    expect(list[0].title).toContain("Decisão A");

    const got = engine.get({ id: list[0].id });
    expect(got.ok).toBe(true);
    expect(got.record.content).toContain("## Decisão");

    const stats = engine.stats();
    expect(stats.total).toBe(2);
    expect(stats.byKind.adr).toBe(1);
    expect(stats.byKind.note).toBe(1);

    expect(engine.remove({ id: list[0].id })).toMatchObject({ ok: true, removed: 1 });
    expect(engine.load()).toHaveLength(1);
  });

  it("get retorna não encontrado", async () => {
    const engine = createKnowledgeEngine({ filePath: tmpFile() });
    expect(engine.get({ id: "doc::note::::nope" })).toMatchObject({ ok: false });
  });
});

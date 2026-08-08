// electron/__tests__/memory-engine.test.cjs
// Testes do Memory Engine (Módulo 2). Vitest globals (describe/it/expect/vi) habilitados.

const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  createMemoryEngine,
  defaultFileStore,
  makeId,
  cosineSimilarity,
} = require("../memory-engine.cjs");

function tmpFile() {
  return path.join(os.tmpdir(), `memory-engine-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

// Embedder fake: 2-dimensões baseado em palavras-chave.
function keywordEmbed(text) {
  return Promise.resolve([
    text.includes("vitamina") || text.includes("dieta") ? 1 : 0,
    text.includes("cardio") || text.includes("treino") ? 1 : 0,
  ]);
}

describe("makeId", () => {
  it("combina escopo de agente, projeto e key", () => {
    expect(makeId("Health", null, "preferencia")).toBe("Health::::preferencia");
    expect(makeId(null, null, "global")).toBe("::::global");
  });
});

describe("cosineSimilarity", () => {
  it("retorna 1 para vetores idênticos", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });
  it("retorna 0 para vetores ortogonais", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });
  it("retorna 0 para dimensões diferentes", () => {
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
  });
});

describe("defaultFileStore", () => {
  it("carrega lista vazia quando o arquivo não existe", () => {
    const store = defaultFileStore(tmpFile());
    expect(store.load()).toEqual([]);
  });
  it("persiste e recupera registros", () => {
    const file = tmpFile();
    const store = defaultFileStore(file);
    store.save([{ id: "a", content: "x" }]);
    const fresh = defaultFileStore(file);
    expect(fresh.load()).toEqual([{ id: "a", content: "x" }]);
    fs.unlinkSync(file);
  });
});

describe("save", () => {
  let engine;
  beforeEach(() => { engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed }); });

  it("valida key e content obrigatórios", async () => {
    expect(await engine.save({ key: "", content: "x" })).toMatchObject({ ok: false, error: "key é obrigatório" });
    expect(await engine.save({ key: "a", content: "" })).toMatchObject({ ok: false, error: "content é obrigatório" });
  });

  it("cria memória com id composto e embedding", async () => {
    const res = await engine.save({ key: "pref", content: "toma vitamina D todo dia", scopeAgent: "Health" });
    expect(res.ok).toBe(true);
    expect(res.deduped).toBe(false);
    expect(res.record.id).toBe("Health::::pref");
    expect(res.record.embedding).toEqual([1, 0]);
    expect(res.record.scopeAgent).toBe("Health");
  });

  it("gera uid uuid único e estável entre updates", async () => {
    const first = await engine.save({ key: "pref", content: "v1", scopeAgent: "Health" });
    expect(first.record.uid).toMatch(/^[0-9a-f-]{36}$/);
    const second = await engine.save({ key: "pref", content: "v2", scopeAgent: "Health" });
    expect(second.record.uid).toBe(first.record.uid);
    const other = await engine.save({ key: "outra", content: "x", scopeAgent: "Health" });
    expect(other.record.uid).not.toBe(first.record.uid);
  });

  it("deduplica conteúdo idêntico", async () => {
    await engine.save({ key: "pref", content: "mesmo texto", scopeAgent: "Health" });
    const second = await engine.save({ key: "pref", content: "mesmo texto", scopeAgent: "Health" });
    expect(second.deduped).toBe(true);
    expect(engine.load().length).toBe(1);
  });

  it("atualiza conteúdo diferente mantendo created_at", async () => {
    const first = await engine.save({ key: "pref", content: "v1", scopeAgent: "Health" });
    const second = await engine.save({ key: "pref", content: "v2", scopeAgent: "Health" });
    expect(second.deduped).toBe(false);
    expect(second.record.content).toBe("v2");
    expect(second.record.created_at).toBe(first.record.created_at);
    expect(second.record.updated_at).toBeGreaterThanOrEqual(first.record.updated_at);
    expect(engine.load().length).toBe(1);
  });

  it("guarda embedding null quando o embedder falha", async () => {
    const broken = createMemoryEngine({ filePath: tmpFile(), embed: () => Promise.reject(new Error("offline")) });
    const res = await broken.save({ key: "k", content: "x" });
    expect(res.record.embedding).toBeNull();
  });

  it("espelha para a nuvem quando há embedding", async () => {
    const upsert = vi.fn().mockResolvedValue({ ok: true });
    const eng = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed, cloud: { upsert, remove: vi.fn() } });
    await eng.save({ key: "k", content: "treino de cardio hoje", scopeAgent: "Health" });
    await vi.waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    const [record] = upsert.mock.calls[0];
    expect(record.uid).toMatch(/^[0-9a-f-]{36}$/);
    expect(record.id).toBe("Health::::k");
  });

  it("remove espelha para a nuvem usando o uid", async () => {
    const remove = vi.fn().mockResolvedValue({ ok: true });
    const eng = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed, cloud: { upsert: vi.fn().mockResolvedValue({ ok: true }), remove } });
    await eng.save({ key: "k", content: "treino de cardio hoje", scopeAgent: "Health" });
    const rec = eng.load()[0];
    eng.remove({ id: rec.id });
    expect(remove).toHaveBeenCalledWith(rec.uid);
  });

  it("não espelha para a nuvem sem embedding", async () => {
    const upsert = vi.fn();
    const eng = createMemoryEngine({ filePath: tmpFile(), embed: () => Promise.resolve(null), cloud: { upsert, remove: vi.fn() } });
    await eng.save({ key: "k", content: "x" });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("search", () => {
  it("retorna empty sem query", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile() });
    expect(await engine.search({ query: "" })).toMatchObject({ method: "empty", results: [] });
  });

  it("faz busca textual por substring", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: () => Promise.resolve(null) });
    await engine.save({ key: "a", content: "preferência de café forte", scopeAgent: "Health" });
    await engine.save({ key: "b", content: "meta de corrida 5km", scopeAgent: "Health" });
    const res = await engine.search({ query: "café", scopeAgent: "Health" });
    expect(res.method).toBe("text-fallback");
    expect(res.results).toHaveLength(1);
    expect(res.results[0].content).toContain("café");
  });

  it("faz busca semântica rankeada por cosine", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "toma vitamina D todos os dias", scopeAgent: "Health" });
    await engine.save({ key: "b", content: "faz 30min de cardio no treino", scopeAgent: "Health" });
    const res = await engine.search({ query: "vitamina", scopeAgent: "Health", threshold: 0.5 });
    expect(res.method).toBe("semantic");
    expect(res.results[0].key).toBe("a");
  });

  it("respeita escopo de agente (memórias globais aparecem em qualquer escopo)", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "global1", content: "usuário gosta de vitamina C" });
    await engine.save({ key: "mkt", content: "campanha de vitamina para dieta", scopeAgent: "Marketing" });
    await engine.save({ key: "health", content: "dieta rica em vitamina C", scopeAgent: "Health" });
    const res = await engine.search({ query: "vitamina", scopeAgent: "Health", threshold: 0.5 });
    const keys = res.results.map((r) => r.key);
    expect(keys).toContain("health");
    expect(keys).toContain("global1");
    expect(keys).not.toContain("mkt");
  });

  it("incrementa access_count das memórias retornadas (TTL/decay)", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "toma vitamina D todos os dias", scopeAgent: "Health" });
    await engine.save({ key: "b", content: "treino de cardio", scopeAgent: "Health" });
    await engine.search({ query: "vitamina", scopeAgent: "Health" });
    await engine.search({ query: "vitamina", scopeAgent: "Health" });
    const rec = engine.load().find((r) => r.key === "a");
    expect(rec.access_count).toBe(2);
    expect(engine.load().find((r) => r.key === "b").access_count).toBe(0);
  });

  it("decay favorece memórias recentes sobre as antigas", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "nova", content: "toma vitamina D", scopeAgent: "Health" });
    await engine.save({ key: "antiga", content: "toma vitamina C", scopeAgent: "Health" });
    engine.load().find((r) => r.key === "antiga").updated_at = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const res = await engine.search({ query: "vitamina", scopeAgent: "Health", topK: 2 });
    expect(res.results[0].key).toBe("nova");
  });

  it("access_count dá boost no ranking (memória revisitada sobe)", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "usada", content: "toma vitamina D", scopeAgent: "Health" });
    await engine.save({ key: "nova", content: "toma vitamina C", scopeAgent: "Health" });
    engine.load().find((r) => r.key === "usada").access_count = 10;
    const res = await engine.search({ query: "vitamina", scopeAgent: "Health", topK: 2 });
    expect(res.results[0].key).toBe("usada");
  });
});

describe("injectForPrompt", () => {
  it("retorna bloco com memórias quando há match", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "usuário toma vitamina D todo dia", scopeAgent: "Health" });
    const block = await engine.injectForPrompt({ query: "vitamina", scopeAgent: "Health" });
    expect(block).toContain("<memorias_relevantes>");
    expect(block).toContain("vitamina D");
    expect(block).toContain("[Health,");
  });

  it("retorna string vazia sem match", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "treino de cardio", scopeAgent: "Health" });
    expect(await engine.injectForPrompt({ query: "finanças", scopeAgent: "Finance" })).toBe("");
  });
});

describe("consolidate", () => {
  it("retorna sem summarize configurado", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    expect(await engine.consolidate()).toMatchObject({ ok: false, reason: "summarize não configurado" });
  });

  it("consolida memórias maduras em um fato de longo prazo", async () => {
    const summarize = vi.fn().mockResolvedValue("Usuário tem rotina de vitamina D e cardio.");
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed, summarize });
    const old = Date.now() - 2 * 24 * 60 * 60 * 1000;
    await engine.save({ key: "a", content: "toma vitamina D", scopeAgent: "Health" });
    const rec = engine.load().find((r) => r.key === "a");
    rec.updated_at = old;
    await engine.save({ key: "b", content: "faz cardio", scopeAgent: "Health" });
    const rec2 = engine.load().find((r) => r.key === "b");
    rec2.updated_at = old;

    const res = await engine.consolidate({ scopeAgent: "Health" });
    expect(res.ok).toBe(true);
    expect(res.summarized).toContain("rotina");
    const saved = engine.load().find((r) => r.source === "consolidation");
    expect(saved).toBeTruthy();
    expect(saved.tags).toContain("long-term");
    expect(saved.scopeAgent).toBe("Health");
  });

  it("não consolida sem memórias maduras", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed, summarize: vi.fn().mockResolvedValue("x") });
    await engine.save({ key: "a", content: "recém-criada", scopeAgent: "Health" });
    const res = await engine.consolidate({ scopeAgent: "Health", minAgeMs: 24 * 60 * 60 * 1000 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("sem memórias maduras");
  });
});

describe("remove e stats", () => {
  it("remove pelo id composto", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "x", scopeAgent: "Health" });
    const rec = engine.load()[0];
    expect(engine.remove({ id: rec.id })).toMatchObject({ ok: true, removed: 1 });
    expect(engine.load()).toHaveLength(0);
  });

  it("computa stats por escopo", async () => {
    const engine = createMemoryEngine({ filePath: tmpFile(), embed: keywordEmbed });
    await engine.save({ key: "a", content: "dieta de vitamina", scopeAgent: "Health" });
    await engine.save({ key: "b", content: "global" });
    const s = engine.stats();
    expect(s.total).toBe(2);
    expect(s.withEmbedding).toBe(2);
    expect(s.byScope.Health).toBe(1);
    expect(s.byScope.global).toBe(1);
  });
});

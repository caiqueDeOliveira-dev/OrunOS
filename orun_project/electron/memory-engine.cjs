// electron/memory-engine.cjs
//
// Módulo 2 — Memory Engine.
//
// Memória de longo prazo com escopos por agente/projeto, embeddings semânticos
// (Ollama nomic-embed-text via `embed` injetado), deduplicação, busca por
// similaridade com fallback textual, injeção de contexto no prompt e
// consolidação de memórias de curto prazo em fatos de longo prazo.
//
// Local-first: o store é um JSON no userData (fonte de verdade offline).
// Um adapter de nuvem opcional (memory-supabase.cjs) espelha para o Supabase
// quando a migration 0008 estiver aplicada e o DATABASE_URL estiver presente.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/** Chave composta única de uma memória (identidade do upsert).
 *  Escopo completo: workspace + user + agent + project + conversation + key.
 *  Retrocompatível: sem escopos novos, mantém o formato antigo
 *  [agent][project][key] (preserva ids de memórias existentes). */
function makeId(scopeAgent, scopeProject, key, scopeWorkspace, scopeUser, scopeConversation) {
  const extra = [scopeWorkspace, scopeUser, scopeConversation].filter(Boolean);
  if (extra.length === 0) return [scopeAgent || "", scopeProject || "", key].join("::");
  return [scopeWorkspace || "", scopeUser || "", scopeAgent || "", scopeProject || "", scopeConversation || "", key].join("::");
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Store padrão em arquivo JSON (lazy, com cache em memória). */
function defaultFileStore(filePath) {
  let cache = null;
  function load() {
    if (cache) return cache;
    try {
      cache = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(cache) ? cache : (cache = []);
    } catch {
      return (cache = []);
    }
  }
  function save(records) {
    cache = records;
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      return true;
    } catch {
      return false;
    }
  }
  return { load, save };
}

/** Embedder padrão: sem Ollama no contexto — retorna null → busca textual. */
function defaultEmbed() {
  return Promise.resolve(null);
}

function createMemoryEngine(opts = {}) {
  const store = opts.store || defaultFileStore(opts.filePath || path.join(process.cwd(), "memory-engine.json"));
  const embed = opts.embed || defaultEmbed;
  const cloud = opts.cloud || null;
  const summarize = opts.summarize || null;
  const logger = opts.logger || { warn: () => {}, info: () => {}, error: () => {} };

  function load() {
    return store.load();
  }

  function persist(records) {
    return store.save(records);
  }

  function scopeMatches(record, scopeAgent, scopeProject, scopeWorkspace, scopeUser, scopeConversation) {
    if (scopeAgent && record.scopeAgent && record.scopeAgent !== scopeAgent) return false;
    if (scopeProject && record.scopeProject && record.scopeProject !== scopeProject) return false;
    if (scopeWorkspace && record.workspaceId && record.workspaceId !== scopeWorkspace) return false;
    if (scopeUser && record.userId && record.userId !== scopeUser) return false;
    if (scopeConversation && record.conversationId && record.conversationId !== scopeConversation) return false;
    return true;
  }

  // Decay de relevância (TTL suave): memórias mais recentes e mais acessadas
  // sobem; memórias antigas e nunca revisitadas caem. Aplicado em cima da
  // similaridade base (semântica ou textual) antes do ranking final.
  function decayFor(record, { recencyHalfLifeDays, accessBoost } = {}) {
    const halfLife = recencyHalfLifeDays || 90;
    const boost = accessBoost == null ? 0.5 : accessBoost;
    const ageMs = Date.now() - (record.updated_at || record.created_at || Date.now());
    const ageDays = ageMs / 86400000;
    const recency = Math.pow(0.5, ageDays / halfLife);
    const usage = 1 + boost * Math.min(1, (record.access_count || 0) / 10);
    return { recency, usage, factor: recency * usage };
  }

  /**
   * Salva (ou atualiza) uma memória. Deduplica conteúdo idêntico na mesma
   * chave composta e espelha para a nuvem quando há embedding.
   */
  async function save(entry = {}) {
    const { key, content, tags = [], scopeAgent = null, scopeProject = null, source = "manual", workspaceId = null, userId = null, conversationId = null } = entry;
    if (typeof key !== "string" || !key.trim()) return { ok: false, error: "key é obrigatório" };
    if (typeof content !== "string" || !content.trim()) return { ok: false, error: "content é obrigatório" };

    const id = makeId(scopeAgent, scopeProject, key, workspaceId, userId, conversationId);
    const records = load();
    const idx = records.findIndex((r) => r.id === id);
    const existing = idx >= 0 ? records[idx] : null;

    if (existing && existing.content === content) {
      existing.updated_at = Date.now();
      persist(records);
      return { ok: true, record: existing, deduped: true };
    }

    const embedding = await Promise.resolve(embed(content)).catch(() => null);
    const now = Date.now();
    const record = {
      id,
      uid: existing && existing.uid ? existing.uid : crypto.randomUUID(),
      key,
      content,
      tags,
      scopeAgent: scopeAgent || null,
      scopeProject: scopeProject || null,
      workspaceId: workspaceId || null,
      userId: userId || null,
      conversationId: conversationId || null,
      source,
      embedding: Array.isArray(embedding) ? embedding : null,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
      access_count: existing ? existing.access_count || 0 : 0,
    };

    if (idx >= 0) records[idx] = record;
    else records.push(record);
    persist(records);

    if (cloud && Array.isArray(embedding)) {
      Promise.resolve(cloud.upsert(record)).catch((e) => logger.warn(`[memory] cloud upsert falhou: ${e.message}`));
    }

    return { ok: true, record, deduped: false };
  }

  /**
   * Busca semântica (cosine) com fallback textual e decay de relevância.
   * Memórias globais (sem escopo) aparecem em qualquer escopo; memórias
   * escopadas só no seu escopo. Acessos incrementam `access_count`.
   */
  async function search({ query, scopeAgent = null, scopeProject = null, topK = 5, threshold = 0, workspaceId = null, userId = null, conversationId = null }) {
    const q = (query || "").trim();
    if (!q) return { results: [], method: "empty" };

    const records = load().filter((r) => scopeMatches(r, scopeAgent, scopeProject, workspaceId, userId, conversationId));
    if (records.length === 0) return { results: [], method: "empty" };

    const queryEmbedding = await Promise.resolve(embed(q)).catch(() => null);
    const scored = queryEmbedding
      ? records
          .filter((r) => r.embedding)
          .map((r) => ({ ...r, baseScore: cosineSimilarity(queryEmbedding, r.embedding) }))
      : records.map((r) => ({
          ...r,
          baseScore: (r.content || "").toLowerCase().includes(q.toLowerCase())
            ? 0.5
            : (r.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase()))
              ? 0.3
              : 0,
        }));

    const decayed = scored.map((r) => ({
      ...r,
      score: r.baseScore * decayFor(r, opts).factor,
    }));

    const results = decayed
      .filter((r) => r.baseScore > 0 && r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // TTL/decay: conta o acesso das memórias retornadas.
    if (results.length > 0) {
      const all = load();
      let changed = false;
      for (const hit of results) {
        const target = all.find((rec) => rec.id === hit.id);
        if (target) {
          target.access_count = (target.access_count || 0) + 1;
          changed = true;
        }
      }
      if (changed) persist(all);
    }

    const clean = results.map(({ baseScore, ...rest }) => rest);
    return { results: clean, method: queryEmbedding ? "semantic" : "text-fallback" };
  }

  /** Gera o bloco <memorias_relevantes> para append no system prompt. */
  async function injectForPrompt({ query, scopeAgent = null, scopeProject = null, topK = 5, maxChars = 1500, workspaceId = null, userId = null, conversationId = null }) {
    const { results } = await search({ query, scopeAgent, scopeProject, topK, workspaceId, userId, conversationId });
    if (results.length === 0) return "";

    const lines = results.map((r) => {
      const when = new Date(r.updated_at).toISOString().slice(0, 10);
      const who = [r.scopeAgent, r.scopeProject].filter(Boolean).join("/");
      return `- [${who || "global"}, ${when}] ${r.content}`;
    });

    let block = lines.join("\n");
    if (block.length > maxChars) block = block.slice(0, maxChars) + "...";
    return `\n\n<memorias_relevantes>\n${block}\n</memorias_relevantes>`;
  }

  /**
   * Consolida memórias maduras (antigas o suficiente) de um escopo em um
   * resumo de longo prazo, chamando `summarize`. Não apaga as originais.
   */
  async function consolidate({ scopeAgent = null, scopeProject = null, minAgeMs = 24 * 60 * 60 * 1000, cap = 50, date } = {}) {
    if (!summarize) return { ok: false, reason: "summarize não configurado" };

    const cutoff = Date.now() - minAgeMs;
    const candidates = load()
      .filter((r) => scopeMatches(r, scopeAgent, scopeProject) && r.source !== "consolidation" && r.updated_at <= cutoff)
      .slice(0, cap);
    if (candidates.length === 0) return { ok: false, reason: "sem memórias maduras" };

    const text = await Promise.resolve(summarize({ agent: scopeAgent, project: scopeProject, memories: candidates })).catch(() => null);
    if (!text || !text.trim()) return { ok: false, reason: "sumarização vazia" };

    const day = date || new Date().toISOString().slice(0, 10);
    const saved = await save({
      key: `consolidation:${day}`,
      content: text.trim(),
      tags: ["long-term", "consolidation"],
      scopeAgent,
      scopeProject,
      source: "consolidation",
    });
    return { ok: true, summarized: text.trim(), candidates: candidates.length, saved };
  }

  /** Esquece uma memória pelo id composto (forget mecanicista). */
  function remove({ id }) {
    const records = load();
    const target = records.find((r) => r.id === id);
    const before = records.length;
    const filtered = records.filter((r) => r.id !== id);
    persist(filtered);
    if (cloud && target) {
      Promise.resolve(cloud.remove(target.uid)).catch((e) => logger.warn(`[memory] cloud remove falhou: ${e.message}`));
    }
    return { ok: true, removed: before - filtered.length };
  }

  function stats() {
    const records = load();
    const byScope = {};
    for (const r of records) {
      const k = r.scopeAgent || "global";
      byScope[k] = (byScope[k] || 0) + 1;
    }
    return {
      total: records.length,
      withEmbedding: records.filter((r) => r.embedding).length,
      byScope,
      sizeKB: Math.round(JSON.stringify(records).length / 1024),
    };
  }

  return { save, search, injectForPrompt, consolidate, remove, stats, load };
}

module.exports = {
  createMemoryEngine,
  defaultFileStore,
  defaultEmbed,
  makeId,
  cosineSimilarity,
};

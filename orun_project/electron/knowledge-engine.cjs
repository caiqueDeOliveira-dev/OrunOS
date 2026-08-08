// electron/knowledge-engine.cjs
//
// Módulo 3 — Knowledge Engine.
//
// Hub de docs auto-gerados: changelog, diário, ADR, roadmap e notas.
// Fonte de verdade local-first (JSON no userData) com espelho opcional para o
// Supabase (tabela `documents`, migration 0009) para o mobile herdar.
//
// Geração:
//   - changelog: a partir de `git log` de um repositório.
//   - diário: `git log` do dia + memórias recentes + resumo por LLM (opcional).
//   - adr: decisão estruturada → markdown.
//
// Obsidian NÃO é storage primário (usuário não usa PKM) — apenas export/sync
// opcional no futuro.

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const crypto = require("crypto");

/** Chave composta única de um documento (identidade do upsert). */
function makeId(kind, title, date) {
  return ["doc", kind || "note", date || "", title || "untitled"].join("::");
}

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** `git log` formatado: `YYYY-MM-DD | assunto`. */
function gitLog({ repoPath, since, maxLines = 50, timeout = 15_000 }) {
  return new Promise((resolve) => {
    const args = ["log", "--pretty=%ad | %s", "--date=short"];
    if (since) args.push(`--since=${since}`);
    if (maxLines) args.push(`-n ${maxLines}`);
    execFile("git", args, { cwd: repoPath, timeout }, (err, stdout) => {
      if (err) return resolve({ ok: false, error: err.message });
      resolve({ ok: true, lines: stdout.split("\n").filter(Boolean) });
    });
  });
}

function renderChangelog(lines, { title, date }) {
  const header = [
    `# ${title || "Changelog"}`,
    "",
    date ? `> Gerado em ${date}` : "",
    "",
    lines.length === 0 ? "_Nenhum commit no período._" : "",
    lines.map((l) => `- ${l}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
  return header.trim();
}

function renderDiaryRaw({ day, commits, memories }) {
  const parts = [
    `# Diário ${day}`,
    "",
    "## Commits",
    commits.length === 0 ? "_Nenhum commit._" : commits.map((c) => `- ${c}`).join("\n"),
    "",
    "## Memórias",
    memories.length === 0 ? "_Nenhuma memória no período._" : memories.map((m) => `- ${m.content}`).join("\n"),
  ];
  return parts.join("\n");
}

function renderADR({ title, context, decision, consequences, status, date }) {
  const id = `ADR-${(date || today()).replace(/-/g, "")}`;
  return [
    `# ${id}: ${title}`,
    "",
    `- Status: ${status || "Accepted"}`,
    `- Data: ${date || today()}`,
    "",
    "## Contexto",
    context || "_A definir._",
    "",
    "## Decisão",
    decision || "_A definir._",
    "",
    "## Consequências",
    ...(consequences && consequences.length ? consequences.map((c) => `- ${c}`) : ["_Nenhuma registrada._"]),
  ].join("\n");
}

function createKnowledgeEngine(opts = {}) {
  const store = opts.store || defaultFileStore(opts.filePath || path.join(process.cwd(), "knowledge-engine.json"));
  const cloud = opts.cloud || null;
  const logger = opts.logger || { warn: () => {}, info: () => {}, error: () => {} };
  const summarize = opts.summarize || null;
  const git = opts.gitLog || gitLog;

  function load() {
    return store.load();
  }

  function persist(records) {
    return store.save(records);
  }

  /** Salva (ou atualiza) um documento e espelha para a nuvem quando possível. */
  async function save(doc = {}) {
    const { kind = "note", title, content, tags = [], metadata = {}, date = null } = doc;
    if (typeof title !== "string" || !title.trim()) return { ok: false, error: "title é obrigatório" };
    if (typeof content !== "string" || !content.trim()) return { ok: false, error: "content é obrigatório" };

    const day = date || today();
    const id = makeId(kind, title, day);
    const records = load();
    const idx = records.findIndex((r) => r.id === id);
    const existing = idx >= 0 ? records[idx] : null;
    const now = Date.now();
    const record = {
      id,
      uid: existing && existing.uid ? existing.uid : crypto.randomUUID(),
      kind,
      title,
      content,
      tags,
      metadata,
      date: day,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
    };
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    persist(records);

    if (cloud) {
      Promise.resolve(cloud.upsert(record)).catch((e) => logger.warn(`[knowledge] cloud upsert falhou: ${e.message}`));
    }
    return { ok: true, record, updated: Boolean(existing) };
  }

  /** Changelog a partir de `git log` de um repositório. */
  async function generateChangelog({ repoPath, sinceDays = 30, title, date } = {}) {
    if (!repoPath) return { ok: false, error: "repoPath é obrigatório" };
    const since = sinceDays ? new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10) : null;
    const res = await git({ repoPath, since });
    if (!res.ok) return { ok: false, error: res.error };
    const day = date || today();
    const content = renderChangelog(res.lines, { title: title || `Changelog ${day}`, date: day });
    return save({ kind: "changelog", title: title || `Changelog ${day}`, content, tags: ["changelog"], date: day });
  }

  /** Diário do dia: commits + memórias (+ resumo por LLM quando disponível). */
  async function generateDiary({ date, repoPath, memories = [], title } = {}) {
    const day = date || today();
    const commits = [];
    if (repoPath) {
      const res = await git({ repoPath, since: day });
      if (res.ok) commits.push(...res.lines);
    }
    const raw = renderDiaryRaw({ day, commits, memories });
    let content = raw;
    if (summarize) {
      const text = await Promise.resolve(summarize({ date: day, commits, memories })).catch(() => null);
      if (text && text.trim()) content = text.trim();
    }
    return save({ kind: "diary", title: title || `Diário ${day}`, content, tags: ["diary"], date: day });
  }

  /** ADR estruturado. */
  async function recordADR({ title, context, decision, consequences = [], status, date } = {}) {
    if (!title) return { ok: false, error: "title é obrigatório" };
    const day = date || today();
    const content = renderADR({ title, context, decision, consequences, status, date: day });
    return save({
      kind: "adr",
      title: `ADR: ${title}`,
      content,
      tags: ["adr"],
      metadata: { status: status || "Accepted" },
      date: day,
    });
  }

  /** Lista documentos (com filtro por tipo). */
  function list({ kind = null } = {}) {
    return load()
      .filter((r) => !kind || r.kind === kind)
      .map(({ id, uid, kind: k, title, tags, date, metadata, created_at, updated_at }) => ({
        id, uid, kind: k, title, tags, date, metadata, created_at, updated_at,
      }))
      .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  }

  function get({ id }) {
    const found = load().find((r) => r.id === id);
    return found ? { ok: true, record: found } : { ok: false, error: "documento não encontrado" };
  }

  function remove({ id }) {
    const records = load();
    const target = records.find((r) => r.id === id);
    const filtered = records.filter((r) => r.id !== id);
    persist(filtered);
    if (cloud && target) {
      Promise.resolve(cloud.remove(target.uid)).catch((e) => logger.warn(`[knowledge] cloud remove falhou: ${e.message}`));
    }
    return { ok: true, removed: records.length - filtered.length };
  }

  function stats() {
    const records = load();
    const byKind = {};
    for (const r of records) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    return {
      total: records.length,
      byKind,
      sizeKB: Math.round(JSON.stringify(records).length / 1024),
    };
  }

  return { save, generateChangelog, generateDiary, recordADR, list, get, remove, stats, load };
}

module.exports = {
  createKnowledgeEngine,
  defaultFileStore,
  makeId,
  gitLog,
  renderChangelog,
  renderADR,
};

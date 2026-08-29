// electron/ipc/neural-handlers.cjs
// Handlers IPC do espaço NEURAL (segundo cérebro estilo Obsidian) em cima do
// Knowledge Engine: grafo de [[wikilinks]], busca full-text e backlinks.
//
//   neural:snapshot → { ok, nodes, edges, stats }
//     nodes: notas reais + "fantasmas" (links para notas que ainda não existem)
//     edges: wikilinks resolvidos por título (case-insensitive)
//   neural:search {q} → { ok, results:[{id,title,kind,tags,date,snippet}] }

const path = require("path");

/** Extrai destinos de [[wikilink]] do conteúdo. Suporta [[Nota]] e [[Nota|alias]]. */
function extractLinks(content) {
  const out = [];
  const re = /\[\[([^\[\]\n]+?)\]\]/g;
  let m;
  while ((m = re.exec(String(content || "")))) {
    const raw = m[1].split("|")[0].trim();
    if (raw) out.push(raw);
  }
  return out;
}

function slug(title) {
  return String(title || "").trim().toLowerCase();
}

function makeSnippet(content, q, width = 120) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, width);
  const start = Math.max(0, idx - Math.floor(width / 3));
  return (start > 0 ? "…" : "") + text.slice(start, start + width);
}

function buildSnapshot(records) {
  // Índice título→nó (case-insensitive; primeira ocorrência vence)
  const byTitle = new Map();
  const nodes = records.map((r) => {
    const key = slug(r.title);
    if (!byTitle.has(key)) byTitle.set(key, r.id);
    return {
      id: r.id,
      title: r.title,
      kind: r.kind || "note",
      tags: Array.isArray(r.tags) ? r.tags : [],
      date: r.date,
      updated_at: r.updated_at,
      linkCount: 0,
      ghost: false,
    };
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edgeKey = new Set();
  const edges = [];

  for (const r of records) {
    for (const target of extractLinks(r.content)) {
      const key = slug(target);
      const resolvedId = byTitle.get(key);
      if (resolvedId && resolvedId !== r.id) {
        const ek = `${r.id}->${resolvedId}`;
        if (edgeKey.has(ek)) continue;
        edgeKey.add(ek);
        edges.push({ source: r.id, target: resolvedId });
        nodeById.get(resolvedId).linkCount += 1;
      } else if (!resolvedId) {
        // Nota fantasma: referenciada mas ainda inexistente
        const ghostId = `ghost:${key}`;
        if (!nodeById.has(ghostId)) {
          nodeById.set(ghostId, {
            id: ghostId,
            title: target,
            kind: "ghost",
            tags: [],
            date: null,
            updated_at: 0,
            linkCount: 1,
            ghost: true,
          });
          nodes.push(nodeById.get(ghostId));
        } else {
          nodeById.get(ghostId).linkCount += 1;
        }
        const ek = `${r.id}->${ghostId}`;
        if (!edgeKey.has(ek)) {
          edgeKey.add(ek);
          edges.push({ source: r.id, target: ghostId });
        }
      }
    }
  }

  nodes.sort((a, b) => b.linkCount - a.linkCount || b.updated_at - a.updated_at);

  return {
    nodes,
    edges,
    stats: {
      totalNotes: records.length,
      ghosts: nodes.filter((n) => n.ghost).length,
      links: edges.length,
    },
  };
}

/** Busca full-text em notas (título, conteúdo, tags). Retorna resultados com snippet. */
function searchNotes(records, q, limit = 8) {
  const notes = records.filter((r) => (r.kind || "note") === "note");
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) {
    return {
      ok: true,
      results: notes
        .sort((a, b) => b.updated_at - a.updated_at)
        .slice(0, limit)
        .map((r) => ({ id: r.id, title: r.title, kind: r.kind, tags: r.tags, date: r.date, updated_at: r.updated_at, snippet: "" })),
    };
  }
  return {
    ok: true,
    results: notes
      .filter(
        (r) =>
          String(r.title || "").toLowerCase().includes(needle) ||
          String(r.content || "").toLowerCase().includes(needle) ||
          (Array.isArray(r.tags) && r.tags.some((t) => String(t).toLowerCase().includes(needle)))
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        tags: r.tags,
        date: r.date,
        updated_at: r.updated_at,
        snippet: makeSnippet(r.content, needle),
      }))
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, limit),
  };
}

/** Lista resumida das notas mais recentes. */
function listNotes(records, limit = 20) {
  return {
    ok: true,
    notes: records
      .filter((r) => (r.kind || "note") === "note")
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        title: r.title,
        tags: Array.isArray(r.tags) ? r.tags : [],
        date: r.date,
        updated_at: r.updated_at,
        summary: String(r.content || "").replace(/\s+/g, " ").trim().slice(0, 160),
        links: extractLinks(r.content).length,
      })),
  };
}

/** Busca nota por id ou título exato (case-insensitive). */
function getNote(records, id, title) {
  const notes = records.filter((r) => (r.kind || "note") === "note");
  let found = null;
  if (id) found = notes.find((r) => r.id === id);
  if (!found && title) found = notes.find((r) => slug(r.title) === slug(title));
  if (!found) return { ok: false, error: "nota não encontrada" };
  const keys = new Set([slug(found.title)]);
  const backlinks = notes
    .filter((r) => r.id !== found.id)
    .filter((r) => extractLinks(r.content).some((l) => keys.has(slug(l))))
    .map((r) => ({ id: r.id, title: r.title }));
  return { ok: true, note: { id: found.id, title: found.title, content: found.content, tags: found.tags, date: found.date, updated_at: found.updated_at }, backlinks };
}

function register(ipcMain, ctx) {
  const knowledge = () => ctx.knowledgeEngine;

  ipcMain.handle("neural:snapshot", async () => {
    try {
      const records = knowledge().load().filter((r) => (r.kind || "note") === "note");
      const snap = buildSnapshot(records);
      return { ok: true, ...snap };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e), nodes: [], edges: [], stats: {} };
    }
  });

  ipcMain.handle("neural:search", async (_event, payload) => {
    try {
      const q = String(payload?.q || "").trim();
      const notes = knowledge().load().filter((r) => (r.kind || "note") === "note");
      if (!q) {
        return { ok: true, results: notes.map((r) => ({ id: r.id, title: r.title, kind: r.kind, tags: r.tags, date: r.date, updated_at: r.updated_at, snippet: "" })) };
      }
      const needle = q.toLowerCase();
      const results = notes
        .filter((r) =>
          String(r.title || "").toLowerCase().includes(needle) ||
          String(r.content || "").toLowerCase().includes(needle) ||
          (Array.isArray(r.tags) && r.tags.some((t) => String(t).toLowerCase().includes(needle)))
        )
        .map((r) => ({
          id: r.id,
          title: r.title,
          kind: r.kind,
          tags: r.tags,
          date: r.date,
          updated_at: r.updated_at,
          snippet: makeSnippet(r.content, q),
        }))
        .sort((a, b) => b.updated_at - a.updated_at);
      return { ok: true, results };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e), results: [] };
    }
  });

  ipcMain.handle("neural:backlinks", async (_event, payload) => {
    try {
      const id = String(payload?.id || "");
      const notes = knowledge().load().filter((r) => (r.kind || "note") === "note");
      const alvo = notes.find((r) => r.id === id);
      if (!alvo) return { ok: false, error: "nota não encontrada", items: [] };
      const keys = new Set([slug(alvo.title)]);
      const items = notes
        .filter((r) => r.id !== id)
        .filter((r) => extractLinks(r.content).some((l) => keys.has(slug(l))))
        .map((r) => ({ id: r.id, title: r.title, snippet: makeSnippet(r.content, alvo.title) }));
      return { ok: true, items };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e), items: [] };
    }
  });
}

module.exports = { register, buildSnapshot, extractLinks, searchNotes, listNotes, getNote };

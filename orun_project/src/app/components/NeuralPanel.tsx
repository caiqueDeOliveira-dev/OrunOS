// components/NeuralPanel.tsx
// NEURAL — segundo cérebro estilo Obsidian: notas com [[wikilinks]], grafo,
// backlinks e busca. Persistência via Knowledge Engine (kind="note").

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, WheelEvent } from "react";
import { motion } from "motion/react";
import {
  X, Atom, Search, Plus, Save, Trash2, Link2, Hash, ArrowLeft,
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import type { NeuralSnapshot, NeuralNode, NeuralBacklink, KnowledgeDoc } from "../../types/orun";

type OrunApi = {
  neural?: {
    snapshot?: () => Promise<NeuralSnapshot>;
    search?: (q: string) => Promise<{ ok: boolean; results?: { id: string; title: string; snippet: string; tags: string[] | null }[] }>;
    backlinks?: (id: string) => Promise<{ ok: boolean; items?: NeuralBacklink[] }>;
  };
  knowledge?: {
    save?: (doc: { kind?: string; title: string; content: string; tags?: string[] }) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    get?: (id: string) => Promise<{ ok: boolean; record?: KnowledgeDoc; error?: string }>;
    remove?: (id: string) => Promise<{ ok: boolean; removed?: number }>;
  };
};

const api = (window as unknown as { orun?: OrunApi }).orun;

// ── Grafo: layout força-direção determinístico ───────────────────────────────

interface GraphPos { x: number; y: number }

function computeLayout(nodes: NeuralNode[], edges: { source: string; target: string }[], w: number, h: number): Map<string, GraphPos> {
  const pos = new Map<string, GraphPos>();
  const n = nodes.length;
  if (!n) return pos;
  // seed em círculo (determinístico)
  nodes.forEach((node, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    pos.set(node.id, { x: w / 2 + Math.cos(a) * (w * 0.32), y: h / 2 + Math.sin(a) * (h * 0.34) });
  });
  const k = Math.sqrt((w * h) / Math.max(1, n)) * 0.9;
  for (let tick = 0; tick < 160; tick++) {
    const fx = new Map<string, number>();
    const fy = new Map<string, number>();
    nodes.forEach((nd) => { fx.set(nd.id, 0); fy.set(nd.id, 0); });
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos.get(nodes[i].id)!;
        const b = pos.get(nodes[j].id)!;
        let dx = a.x - b.x; let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = (i % 2 ? 1 : -1) * 0.5; dy = 0.5; d2 = 0.5; }
        const f = (k * k) / d2;
        const d = Math.sqrt(d2);
        const ux = dx / d; const uy = dy / d;
        fx.set(nodes[i].id, fx.get(nodes[i].id)! + f * ux);
        fy.set(nodes[i].id, fy.get(nodes[i].id)! + f * uy);
        fx.set(nodes[j].id, fx.get(nodes[j].id)! - f * ux);
        fy.set(nodes[j].id, fy.get(nodes[j].id)! - f * uy);
      }
    }
    edges.forEach((e) => {
      const a = pos.get(e.source); const b = pos.get(e.target);
      if (!a || !b || a === b) return;
      const dx = b.x - a.x; const dy = b.y - a.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const f = ((d - k) * 0.06) / d;
      fx.set(e.source, fx.get(e.source)! + dx * f);
      fy.set(e.source, fy.get(e.source)! + dy * f);
      fx.set(e.target, fx.get(e.target)! - dx * f);
      fy.set(e.target, fy.get(e.target)! - dy * f);
    });
    nodes.forEach((nd) => {
      const p = pos.get(nd.id)!;
      const damp = nd.ghost ? 0.4 : 1;
      p.x += Math.max(-14, Math.min(14, fx.get(nd.id)! * damp));
      p.y += Math.max(-14, Math.min(14, fy.get(nd.id)! * damp));
      p.x = Math.max(24, Math.min(w - 24, p.x));
      p.y = Math.max(20, Math.min(h - 20, p.y));
    });
  }
  return pos;
}

// ── Markdown-lite inline → React (sem dangerouslySetInnerHTML) ───────────────

function renderInline(text: string, onOpenLink: (t: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[\[[^\[\]\n]+?\]\]|#[\w-]+)/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(
      <code key={key++} className="px-1 py-0.5 rounded text-[11px]" style={{ background: "var(--surface-3)", fontFamily: "'JetBrains Mono', monospace" }}>{tok.slice(1, -1)}</code>
    );
    else if (tok.startsWith("[[")) out.push(
      <button key={key++} onClick={() => onOpenLink(tok.slice(2, -2).split("|")[0])}
        className="underline underline-offset-2 transition-colors hover:opacity-80"
        style={{ color: "var(--primary)" }}>{tok.slice(2, -2).split("|")[1] || tok.slice(2, -2)}</button>
    );
    else if (tok.startsWith("#")) out.push(
      <span key={key++} className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-px rounded-full align-middle mx-0.5"
        style={{ background: "rgba(195,0,47,0.12)", color: "var(--primary)" }}>
        <Hash size={9} />{tok.slice(1)}
      </span>
    );
    else out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownLite({ content, onOpenLink }: { content: string; onOpenLink: (t: string) => void }) {
  const blocks = useMemo(() => content.split("\n"), [content]);
  const rendered: ReactNode[] = [];
  blocks.forEach((line, i) => {
    const key = `b${i}`;
    if (!line.trim()) { rendered.push(<div key={key} className="h-2" />); return; }
    if (line.startsWith("### ")) rendered.push(<h4 key={key} className="text-[13px] font-semibold mt-3 mb-1">{renderInline(line.slice(4), onOpenLink)}</h4>);
    else if (line.startsWith("## ")) rendered.push(<h3 key={key} className="text-[15px] font-semibold mt-3 mb-1">{renderInline(line.slice(3), onOpenLink)}</h3>);
    else if (line.startsWith("# ")) rendered.push(<h2 key={key} className="text-[17px] font-semibold mt-3 mb-1.5" style={{ fontFamily: "'Sora', sans-serif" }}>{renderInline(line.slice(2), onOpenLink)}</h2>);
    else if (/^[-*] /.test(line)) rendered.push(
      <div key={key} className="flex gap-2 items-start ml-1 my-0.5">
        <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ background: "var(--primary)" }} />
        <span>{renderInline(line.slice(2), onOpenLink)}</span>
      </div>
    );
    else if (line.startsWith("> ")) rendered.push(
      <blockquote key={key} className="border-l-2 pl-3 my-1.5 italic" style={{ borderColor: "var(--primary)", color: "var(--text-secondary)" }}>{renderInline(line.slice(2), onOpenLink)}</blockquote>
    );
    else if (line.trim() === "---") rendered.push(<hr key={key} className="my-2.5 border-t" style={{ borderColor: "var(--border)" }} />);
    else rendered.push(<p key={key} className="leading-relaxed">{renderInline(line, onOpenLink)}</p>);
  });
  return <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{rendered}</div>;
}

// ── Painel principal ─────────────────────────────────────────────────────────

interface Draft { id: string | null; title: string; content: string; tags: string }

const emptyDraft = (): Draft => ({ id: null, title: "", content: "", tags: "" });

export function NeuralPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [snap, setSnap] = useState<NeuralSnapshot | null>(null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);   // null = nada aberto
  const [viewDoc, setViewDoc] = useState<KnowledgeDoc | null>(null); // nota em modo leitura
  const [backlinks, setBacklinks] = useState<NeuralBacklink[]>([]);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const GW = 300; const GH = 250;

  const loadSnapshot = useCallback(async () => {
    try {
      const s = await api?.neural?.snapshot?.();
      if (s) setSnap(s);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  const notes = useMemo(
    () => (snap?.nodes || []).filter((n) => !n.ghost).sort((a, b) => b.updated_at - a.updated_at),
    [snap],
  );

  const searchResults = useMemo(() => {
    if (!q.trim()) return null;
    return snap?.nodes?.filter((n) => !n.ghost && (
      n.title.toLowerCase().includes(q.toLowerCase()) ||
      n.tags.some((tg) => tg.toLowerCase().includes(q.toLowerCase()))
    )) ?? [];
  }, [q, snap]);

  const openNote = useCallback(async (id: string) => {
    setDraft(null); setViewDoc(null);
    try {
      const res = await api?.knowledge?.get?.(id);
      if (res?.ok && res.record && api?.neural?.backlinks) {
        setViewDoc(res.record);
        const bl = await api.neural.backlinks(id);
        setBacklinks(bl?.items || []);
      }
    } catch { /* noop */ }
  }, []);

  const openByTitle = useCallback(async (title: string) => {
    const found = notes.find((n) => n.title.toLowerCase() === title.trim().toLowerCase());
    if (found) { void openNote(found.id); return; }
    setViewDoc(null);
    setDraft({ ...emptyDraft(), title });
  }, [notes, openNote]);

  const newNote = () => { setViewDoc(null); setDraft(emptyDraft()); };

  const saveDraft = useCallback(async () => {
    if (!draft || !draft.title.trim() || !draft.content.trim()) return;
    setSaving(true);
    try {
      const tags = draft.tags.split(",").map((s) => s.trim()).filter(Boolean);
      await api?.knowledge?.save?.({ kind: "note", title: draft.title.trim(), content: draft.content, tags });
      setDraft(null);
      await loadSnapshot();
    } finally { setSaving(false); }
  }, [draft, loadSnapshot]);

  const removeNote = useCallback(async (id: string) => {
    await api?.knowledge?.remove?.(id);
    if (viewDoc?.id === id) { setViewDoc(null); setBacklinks([]); }
    if (draft?.id === id) setDraft(null);
    await loadSnapshot();
  }, [viewDoc, draft, loadSnapshot]);

  // Grafo: recalcula quando snapshot muda
  const graphNodes = useMemo(() => (snap?.nodes || []).slice(0, 60), [snap]);
  const graphEdges = useMemo(
    () => (snap?.edges || []).filter((e) => graphNodes.some((n) => n.id === e.source) && graphNodes.some((n) => n.id === e.target)),
    [snap, graphNodes],
  );
  const positions = useMemo(() => computeLayout(graphNodes, graphEdges, GW, GH), [graphNodes, graphEdges]);

  const onWheel = (e: WheelEvent) => {
    setZoom((z) => Math.min(2.6, Math.max(0.45, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  };

  const relTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const stats = snap?.stats || {};

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[1060px] max-w-[94vw] h-[86vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "radial-gradient(circle at 35% 30%, rgba(195,0,47,0.35), rgba(195,0,47,0.10))", border: "1px solid rgba(195,0,47,0.3)" }}>
            <Atom size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Neural</p>
            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {stats.totalNotes ?? 0} notas · {stats.links ?? 0} links · {stats.ghosts ?? 0} fantasmas
            </p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
            <Search size={13} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={t("neuralSearchPlaceholder")}
              className="bg-transparent outline-none text-xs w-44"
              style={{ color: "var(--foreground)" }}
            />
          </div>
          <button onClick={newNote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85"
            style={{ background: "var(--primary)", color: "#fff" }}>
            <Plus size={13} />{t("neuralNewNote")}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-3)]" aria-label="close">
            <X size={15} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 flex min-h-0">
          {/* Coluna esquerda: lista */}
          <div className="w-[230px] shrink-0 border-r overflow-y-auto scrollbar-hide py-2" style={{ borderColor: "var(--border)" }}>
            {searchResults ? (
              searchResults.length === 0
                ? <p className="px-3 py-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>—</p>
                : searchResults.map((n) => (
                  <button key={n.id} onClick={() => void openNote(n.id)}
                    className="w-full text-left px-3 py-2 transition-colors hover:bg-[var(--surface-3)]">
                    <p className="text-xs truncate" style={{ color: "var(--foreground)" }}>{n.title}</p>
                  </button>
                ))
            ) : notes.length === 0 ? (
              <p className="px-3 py-3 text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{t("neuralEmpty")}</p>
            ) : notes.map((n: NeuralNode) => (
              <button key={n.id} onClick={() => void openNote(n.id)}
                className="w-full text-left px-3 py-2 group transition-colors hover:bg-[var(--surface-3)]"
                style={{ background: viewDoc?.id === n.id ? "var(--surface-3)" : undefined }}>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs truncate flex-1" style={{ color: viewDoc?.id === n.id ? "var(--primary)" : "var(--foreground)" }}>{n.title}</p>
                  {n.linkCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                      <Link2 size={9} />{n.linkCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>{relTime(n.updated_at)}</span>
                  {n.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[9px] px-1 rounded-full" style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>#{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Centro: leitura ou edição */}
          <div className="flex-1 min-w-0 overflow-y-auto scrollbar-hide p-5">
            {!draft && !viewDoc && (
              <div className="h-full flex flex-col items-center justify-center gap-3 opacity-70">
                <Atom size={40} strokeWidth={1} style={{ color: "var(--text-tertiary)" }} />
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("neuralEmpty")}</p>
              </div>
            )}
            {draft && (
              <div className="flex flex-col gap-3 max-w-[520px]">
                <input
                  autoFocus value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder={t("neuralUntitled")}
                  className="bg-transparent outline-none text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
                />
                <input
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder={t("neuralTagsPlaceholder")}
                  className="bg-transparent outline-none text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  placeholder={"# Título\n\nIdeia conectada com [[Outra Nota]]…"}
                  rows={12}
                  className="w-full bg-transparent outline-none text-xs leading-relaxed resize-y rounded-lg border p-3"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace", background: "var(--surface-2)" }}
                />
                <MarkdownLite content={draft.content} onOpenLink={() => { /* preview dentro do editor não navega */ }} />
                <div className="flex items-center gap-2">
                  <button onClick={() => void saveDraft()} disabled={saving || !draft.title.trim() || !draft.content.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
                    style={{ background: "var(--primary)", color: "#fff" }}>
                    <Save size={13} />{t("neuralSave")}
                  </button>
                  <button onClick={() => setDraft(null)}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-[var(--surface-3)]"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    <ArrowLeft size={13} />
                  </button>
                </div>
              </div>
            )}
            {viewDoc && (
              <div className="max-w-[520px]">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{viewDoc.title}</h2>
                  <button onClick={() => void removeNote(viewDoc.id)} title={t("neuralDelete")}
                    className="p-1.5 rounded-md transition-colors hover:bg-[rgba(195,0,47,0.12)] shrink-0">
                    <Trash2 size={13} style={{ color: "var(--primary)" }} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  {viewDoc.date && <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{viewDoc.date}</span>}
                  {viewDoc.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-px rounded-full" style={{ background: "rgba(195,0,47,0.12)", color: "var(--primary)" }}>
                      <Hash size={8} />{tag}
                    </span>
                  ))}
                </div>
                <MarkdownLite content={viewDoc.content} onOpenLink={openByTitle} />
                <button
                  onClick={() => setDraft({ id: viewDoc.id, title: viewDoc.title, content: viewDoc.content, tags: viewDoc.tags.join(", ") })}
                  className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-[var(--surface-3)]"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  ✎ editar
                </button>
              </div>
            )}
          </div>

          {/* Coluna direita: grafo + backlinks */}
          <div className="w-[310px] shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="relative select-none" style={{ height: GH + 28 }} onWheel={onWheel}
              onMouseDown={(e) => { dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }; }}
              onMouseMove={(e) => { const d = dragRef.current; if (d) setPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) }); }}
              onMouseUp={() => { dragRef.current = null; }}
              onMouseLeave={() => { dragRef.current = null; }}>
              <p className="absolute top-2 left-3 text-[9px] font-semibold uppercase tracking-[0.14em] z-10" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{t("neuralGraph")}</p>
              <svg width="100%" height={GH + 28} viewBox={`0 0 ${GW} ${GH}`} style={{ cursor: dragRef.current ? "grabbing" : "grab" }}>
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: "center" }}>
                  {graphEdges.map((e, i) => {
                    const a = positions.get(e.source); const b = positions.get(e.target);
                    if (!a || !b) return null;
                    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={0.8} opacity={0.8} />;
                  })}
                  {graphNodes.map((n) => {
                    const p = positions.get(n.id);
                    if (!p) return null;
                    const r = n.ghost ? 3.5 : Math.min(9, 3.5 + n.linkCount * 0.9);
                    return (
                      <g key={n.id} onClick={() => (n.ghost ? openByTitle(n.title) : void openNote(n.id))}
                        style={{ cursor: "pointer" }}>
                        <circle cx={p.x} cy={p.y} r={r}
                          fill={n.ghost ? "transparent" : "var(--primary)"}
                          stroke={n.ghost ? "var(--text-tertiary)" : "rgba(195,0,47,0.5)"}
                          strokeWidth={n.ghost ? 1 : 0}
                          strokeDasharray={n.ghost ? "2 2" : undefined}
                          opacity={viewDoc?.id === n.id ? 1 : 0.85} />
                        <circle cx={p.x} cy={p.y} r={r + 4} fill="transparent" />
                        <text x={p.x} y={p.y - r - 3} textAnchor="middle" fontSize={7.5}
                          fill={n.ghost ? "var(--text-tertiary)" : "var(--text-secondary)"}>
                          {n.title.length > 16 ? `${n.title.slice(0, 15)}…` : n.title}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide border-t p-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>
                {t("neuralBacklinks")} {viewDoc ? `(${backlinks.length})` : ""}
              </p>
              {!viewDoc && <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>—</p>}
              {viewDoc && backlinks.length === 0 && <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>—</p>}
              {viewDoc && backlinks.map((bl) => (
                <button key={bl.id} onClick={() => void openNote(bl.id)}
                  className="w-full text-left p-2 rounded-lg mb-1.5 border transition-colors hover:bg-[var(--surface-3)]"
                  style={{ borderColor: "var(--border)" }}>
                  <p className="text-[11px] font-medium truncate" style={{ color: "var(--foreground)" }}>{bl.title}</p>
                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>{bl.snippet}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

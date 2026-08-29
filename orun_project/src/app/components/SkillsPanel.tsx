import { useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Puzzle, Download, Trash2, FolderOpen, RefreshCw,
  AlertTriangle, CheckCircle2, Power, Search, ChevronRight,
  Wrench, Info
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import type { SkillInfo, SkillDetails } from "../../types/orun";

const api = (window as any).orun?.skills as {
  list: () => Promise<SkillInfo[]>;
  details: (id: string) => Promise<SkillDetails>;
  setEnabled: (id: string, enabled: boolean) => Promise<{ ok: boolean; error?: string }>;
  uninstall: (id: string, force?: boolean) => Promise<{ ok: boolean; error?: string }>;
  installDialog: () => Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  reload: () => Promise<{ ok: boolean }>;
  tools: () => Promise<Array<{ name: string; description: string }>>;
  openDir: () => Promise<{ ok: boolean; dir?: string; error?: string }>;
} | undefined;

type View = "list" | "detail";

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: "#C00018" }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--muted-foreground)" }}>{label}</div>
      <div className="text-[11px]" style={{ color: warn ? "#f59e0b" : "var(--foreground)" }}>{value}</div>
    </div>
  );
}

export function SkillsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<SkillDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState("");
  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([]);

  const load = useCallback(async () => {
    if (!api?.list) return;
    setLoading(true);
    try { setSkills(await api.list()); } finally { setLoading(false); }
  }, []);

  const loadTools = useCallback(async () => {
    if (!api?.tools) return;
    try { setTools(await api.tools()); } catch {}
  }, []);

  useEffect(() => { load(); loadTools(); }, [load, loadTools]);

  const toggle = async (s: SkillInfo) => { if (api?.setEnabled) { await api.setEnabled(s.id, !s.enabled); await load(); } };
  const uninstall = async (s: SkillInfo) => {
    if (!api?.uninstall) return;
    await api.uninstall(s.id);
    await load();
    if (view === "detail" && selectedId === s.id) { setView("list"); setSelectedId(null); }
  };
  const install = async () => { if (api?.installDialog) { await api.installDialog(); await load(); } };
  const reloadAll = async () => { if (api?.reload) { await api.reload(); await load(); await loadTools(); } };
  const openDir = async () => { if (api?.openDir) await api.openDir(); };

  const openDetail = async (s: SkillInfo) => {
    if (!api?.details) return;
    setSelectedId(s.id); setView("detail"); setLoadingDetails(true);
    try { setDetails(await api.details(s.id)); } catch { setDetails(null); } finally { setLoadingDetails(false); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(s => s.name.toLowerCase().includes(q) || s.id.includes(q) || s.description.toLowerCase().includes(q) || s.author.toLowerCase().includes(q));
  }, [skills, search]);

  const enabledCount = skills.filter(s => s.enabled).length;
  const skillTools = useMemo(() => !selectedId ? [] : tools.filter(t => t.name.startsWith(`plugin_${selectedId}__`)), [tools, selectedId]);
  const selected = skills.find(s => s.id === selectedId);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="w-[620px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            {view === "detail" && <button onClick={() => { setView("list"); setSelectedId(null); setDetails(null); }} className="mr-1 hover:opacity-70" style={{ color: "var(--muted-foreground)" }}><ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /></button>}
            <Puzzle size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{view === "detail" ? "Detalhes" : "Skills"}</span>
            {view === "list" && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{enabledCount}/{skills.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (<>
              <button onClick={openDir} title="Abrir pasta" style={{ color: "var(--muted-foreground)" }}><FolderOpen size={13} /></button>
              <button onClick={install} title="Instalar skill" style={{ color: "var(--muted-foreground)" }}><Download size={13} /></button>
            </>)}
            <button onClick={reloadAll} title="Recarregar" style={{ color: "var(--muted-foreground)" }}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="px-6 py-4">
              {skills.length > 0 && (
                <div className="relative mb-3">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar skills..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] outline-none"
                    style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif", border: "1px solid var(--border)" }} />
                </div>
              )}
              {loading && skills.length === 0 ? (
                <div className="py-8 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Puzzle size={18} style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{skills.length === 0 ? "Nenhuma skill instalada" : "Nenhuma skill encontrada"}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(s => (
                    <div key={s.id} className="group px-3 py-3 rounded-lg cursor-pointer transition-colors hover:opacity-90"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }} onClick={() => openDetail(s)}>
                      <div className="flex items-center gap-2 mb-1">
                        {s.status === "ok" && s.enabled ? <CheckCircle2 size={11} style={{ color: "#22c55e" }} /> : s.status === "ok" ? <Power size={11} style={{ color: "var(--muted-foreground)" }} /> : <AlertTriangle size={11} style={{ color: "#f59e0b" }} />}
                        <span className="text-[11px] font-medium truncate" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{s.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>v{s.version}</span>
                        {s.author && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{s.author}</span>}
                        <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => uninstall(s)} title="Desinstalar" className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }}><Trash2 size={11} /></button>
                          <button onClick={() => toggle(s)} title={s.enabled ? "Desativar" : "Ativar"} className="relative w-8 h-4 rounded-full transition-colors" style={{ background: s.enabled ? "rgba(192,0,24,0.8)" : "var(--border)" }}>
                            <span className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left: s.enabled ? "18px" : "2px", background: "#fff" }} />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] mb-1.5 line-clamp-1" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>{s.description || s.id}</div>
                      <div className="flex flex-wrap gap-1">
                        {s.permissions.slice(0, 4).map(p => <span key={p} className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{p}</span>)}
                        {s.permissions.length > 4 && <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>+{s.permissions.length - 4}</span>}
                        {s.missingDeps.length > 0 && <span className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{s.missingDeps.length} dep(s) faltando</span>}
                        {s.errors.map(e => <span key={e} className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{e}</span>)}
                        <ChevronRight size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="px-6 py-4">
              {loadingDetails ? (
                <div className="py-8 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Carregando detalhes...</div>
              ) : !details ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Erro ao carregar detalhes</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[13px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{selected?.name || details.id}</h3>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>{selected?.description || ""}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${details.loaded ? "bg-green-500/15 text-green-400" : "bg-zinc-500/15 text-zinc-400"}`}>{details.loaded ? "Carregada" : "Descarregada"}</span>
                  </div>

                  <Section icon={<Info size={11} />} label="Status">
                    <div className="grid grid-cols-2 gap-2">
                      <InfoItem label="ID" value={details.id} />
                      <InfoItem label="Habilitada" value={details.enabled ? "Sim" : "Nao"} />
                      <InfoItem label="Validacao" value={details.validation.ok ? "OK" : "Invalida"} warn={!details.validation.ok} />
                      <InfoItem label="Manifesto" value={`v${selected?.manifestVersion || "?"}`} />
                    </div>
                    {details.error && <div className="mt-2 text-[10px] px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>{details.error}</div>}
                    {details.validation.errors.length > 0 && <div className="mt-2 space-y-1">{details.validation.errors.map(e => <div key={e} className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{e}</div>)}</div>}
                  </Section>

                  {selected && selected.permissions.length > 0 && (
                    <Section icon={<Wrench size={11} />} label="Permissoes">
                      <div className="flex flex-wrap gap-1">{selected.permissions.map(p => <span key={p} className="px-2 py-0.5 rounded text-[9px] tracking-wider uppercase" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{p}</span>)}</div>
                    </Section>
                  )}

                  {Object.keys(details.dependencies).length > 0 && (
                    <Section icon={<AlertTriangle size={11} />} label="Dependencias">
                      <div className="space-y-1">
                        {Object.entries(details.dependencies).map(([id, dep]) => (
                          <div key={id} className="flex items-center gap-2 text-[10px]">
                            <CheckCircle2 size={9} style={{ color: dep.satisfied ? "#22c55e" : "#ef4444" }} />
                            <span style={{ color: "var(--foreground)" }}>{id}</span>
                            <span style={{ color: "var(--muted-foreground)" }}>{dep.range}</span>
                            {dep.version && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>({dep.version})</span>}
                            {!dep.satisfied && dep.reason && <span className="text-[9px]" style={{ color: "#ef4444" }}>{dep.reason}</span>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {skillTools.length > 0 && (
                    <Section icon={<Wrench size={11} />} label={`Tools (${skillTools.length})`}>
                      <div className="space-y-1">{skillTools.map(tool => (
                        <div key={tool.name} className="text-[10px]">
                          <span className="font-mono" style={{ color: "var(--foreground)" }}>{tool.name.replace(`plugin_${selectedId}__`, "")}</span>
                          {tool.description && <span className="ml-2" style={{ color: "var(--muted-foreground)" }}>{tool.description}</span>}
                        </div>
                      ))}</div>
                    </Section>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { toggle(details as any); openDetail({ ...selected!, enabled: !selected!.enabled } as SkillInfo); }}
                      className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-opacity hover:opacity-90"
                      style={{ background: details.enabled ? "rgba(192,0,24,0.9)" : "var(--secondary)", color: details.enabled ? "#fff" : "var(--foreground)", border: "1px solid var(--border)" }}>
                      {details.enabled ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => { uninstall(details as any); }}
                      className="px-4 py-2 rounded-lg text-[11px] transition-opacity hover:opacity-90"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase, Search, Plus, CheckCircle2, XCircle, FileText, Send,
  RefreshCw, User, Users, ExternalLink, Loader2, Trash2, ClipboardList,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { P, PremiumRoot, ScrollArea, SectionHeader, Badge } from "../premium";
import { isElectron } from "../../../constants";
import { useToast } from "../../../components/Toast";
import type { OrunJob, OrunCareerProfile, OrunCareerState, OrunProfileKey, OrunJobStatus } from "../../../../types/orun";

type TabId = "vagas" | "perfis";

const PROFILE_LABELS: Record<OrunProfileKey, string> = { caique: "Caíque", esposa: "Esposa" };

const STATUS_META: Record<OrunJobStatus, { label: string; color: string; bg: string }> = {
  nova: { label: "Nova", color: "var(--info)", bg: "color-mix(in srgb, var(--info) 12%, transparent)" },
  curriculo_pronto: { label: "Currículo pronto", color: "var(--warn)", bg: "color-mix(in srgb, var(--warn) 12%, transparent)" },
  enviada: { label: "Enviada", color: "var(--ok)", bg: "color-mix(in srgb, var(--ok) 12%, transparent)" },
  descartada: { label: "Descartada", color: "var(--err)", bg: "color-mix(in srgb, var(--err) 12%, transparent)" },
};

const EMPTY_PROFILE: OrunCareerProfile = {
  name: "", area: "", level: "", city: "", remote: "", targetRoles: [],
  headline: "", about: "", skills: [], experiences: [], education: [], linkedinUrl: "", updatedAt: null,
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch { return "—"; }
}

export function CareerWorkspace(_props: WorkspaceProps) {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("vagas");
  const [state, setState] = useState<OrunCareerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileFilter, setProfileFilter] = useState<OrunProfileKey | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<OrunJobStatus | "todos">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Array<{ title: string; url: string; company: string; location: string; remote: string; source: string; snippet: string }>>([]);
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({ profileKey: "caique" as OrunProfileKey, title: "", company: "", location: "", remote: "", url: "", notes: "" });
  const [profileDraft, setProfileDraft] = useState<Record<OrunProfileKey, OrunCareerProfile>>({ caique: { ...EMPTY_PROFILE }, esposa: { ...EMPTY_PROFILE } });
  const [genResult, setGenResult] = useState<Record<OrunProfileKey, { headlines?: string[]; about?: string[]; keywords?: string[]; checklist?: string[] } | null>>({ caique: null, esposa: null });

  const load = async () => {
    if (!isElectron) return;
    const s = await window.orun.career.getState();
    setState(s);
    setProfileDraft({
      caique: { ...EMPTY_PROFILE, ...(s.profiles.caique || {}) },
      esposa: { ...EMPTY_PROFILE, ...(s.profiles.esposa || {}) },
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredJobs = useMemo(() => {
    if (!state) return [];
    let jobs = state.jobs;
    if (profileFilter !== "todos") jobs = jobs.filter((j) => j.profileKey === profileFilter);
    if (statusFilter !== "todos") jobs = jobs.filter((j) => j.status === statusFilter);
    return jobs;
  }, [state, profileFilter, statusFilter]);

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await window.orun.career.searchJobs(searchQuery, profileFilter !== "todos" ? profileFilter : undefined, 8);
      if (res.ok) setCandidates(res.candidates || []);
      else toast.show(res.error || "Busca falhou", "error");
    } finally {
      setSearching(false);
    }
  };

  const addCandidate = async (c: (typeof candidates)[number]) => {
    const res = await window.orun.career.addJob({
      profileKey: profileFilter !== "todos" ? profileFilter : "caique",
      title: c.title,
      company: c.company || "",
      location: c.location || "",
      remote: c.remote || "",
      url: c.url,
      notes: c.snippet || "",
    });
    if (res.ok) {
      toast.show("Vaga cadastrada", "success");
      setCandidates((prev) => prev.filter((x) => x.url !== c.url));
      load();
    } else toast.show(res.error || "Falha ao cadastrar", "error");
  };

  const addManual = async () => {
    if (!newJob.title.trim()) return;
    const res = await window.orun.career.addJob({
      profileKey: newJob.profileKey,
      title: newJob.title,
      company: newJob.company,
      location: newJob.location,
      remote: newJob.remote,
      url: newJob.url,
      notes: newJob.notes,
    });
    if (res.ok) {
      toast.show("Vaga cadastrada", "success");
      setNewJob({ profileKey: "caique", title: "", company: "", location: "", remote: "", url: "", notes: "" });
      setShowAddJob(false);
      load();
    } else toast.show(res.error || "Falha ao cadastrar", "error");
  };

  const setStatus = async (job: OrunJob, status: OrunJobStatus) => {
    const res = await window.orun.career.updateStatus(job.id, status);
    if (res.ok) {
      toast.show(`Status: ${STATUS_META[status].label}`, "success");
      load();
    } else toast.show(res.error || "Falha ao atualizar", "error");
  };

  const removeJob = async (job: OrunJob) => {
    await window.orun.career.removeJob(job.id);
    toast.show("Vaga removida", "success");
    load();
  };

  const prepare = async (job: OrunJob) => {
    const res = await window.orun.career.prepareApplication(job.id, job.profileKey);
    if (res.ok) {
      toast.show(`Currículo e carta gerados em:\n${res.resumePath}`, "success");
      load();
    } else toast.show(res.error || "Falha ao preparar", "error");
  };

  const saveProfile = async (key: OrunProfileKey) => {
    const data = profileDraft[key];
    const res = await window.orun.career.saveProfile(key, {
      name: data.name, area: data.area, level: data.level, city: data.city, remote: data.remote,
      targetRoles: data.targetRoles, headline: data.headline, about: data.about, skills: data.skills,
      experiences: data.experiences, education: data.education, linkedinUrl: data.linkedinUrl,
    });
    if (res.ok) {
      toast.show(`Perfil ${PROFILE_LABELS[key]} salvo`, "success");
      load();
    } else toast.show(res.error || "Falha ao salvar", "error");
  };

  const generateProfile = async (key: OrunProfileKey) => {
    const res = await window.orun.career.generateProfile(key);
    if (res.error) { toast.show(res.error, "error"); return; }
    setGenResult((prev) => ({ ...prev, [key]: { headlines: res.headlines, about: res.about, keywords: res.keywords, checklist: res.checklist } }));
    toast.show("Sugestões geradas", "success");
  };

  const parseList = (value: string) => value.split(",").map((s) => s.trim()).filter(Boolean);

  if (!isElectron) {
    return (
      <PremiumRoot>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px]" style={{ color: P.sub }}>Disponível apenas no Orun OS desktop.</p>
        </div>
      </PremiumRoot>
    );
  }

  const s = state?.stats;

  return (
    <PremiumRoot>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(77,163,255,0.12)", color: P.info }}>
          <Briefcase size={15} />
        </div>
        <div>
          <h2 className="text-[13px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>Carreiras</h2>
          <p className="text-[9px]" style={{ color: P.sub }}>
            {s ? `${s.total} vagas · ${s.enviadas} enviadas (${s.enviadasHoje} hoje) · ${s.pendentes} pendentes` : "Carregando…"}
          </p>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button onClick={load} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.sub }} title="Atualizar">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 px-3 shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
        {([
          { id: "vagas" as TabId, icon: ClipboardList, label: "Vagas" },
          { id: "perfis" as TabId, icon: Users, label: "Perfis" },
        ]).map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] transition-all"
              style={{
                background: active ? "rgba(77,163,255,0.12)" : "transparent",
                color: active ? P.info : P.sub,
                border: `1px solid ${active ? "rgba(77,163,255,0.3)" : "transparent"}`,
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={12} /> {tb.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="p-4 space-y-4">
        {/* ═══ VAGAS ═══ */}
        {tab === "vagas" && (
          <div className="space-y-4">
            {/* Busca */}
            <div className="p-3.5 rounded-2xl space-y-2.5" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <SectionHeader icon={Search} title="Buscar vagas" />
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="Ex.: desenvolvedor react remoto, estágio análise de dados, vendedora loja…"
                  className="flex-1 px-3 py-2 rounded-xl text-[11px] outline-none"
                  style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }}
                />
                <button onClick={runSearch} disabled={searching} className="px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5 disabled:opacity-40" style={{ background: P.info, color: "#fff" }}>
                  {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  Buscar
                </button>
              </div>
              {candidates.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: P.sub }}>Candidatas encontradas (revise antes de cadastrar)</div>
                  {candidates.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl flex items-start gap-2.5" style={{ background: P.card2 }}>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium" style={{ color: P.text }}>{c.title}</div>
                        <div className="text-[9px] mt-0.5 flex items-center gap-2" style={{ color: P.sub }}>
                          {c.company && <span>{c.company}</span>}
                          {c.location && <span>· {c.location}</span>}
                          {c.remote && <span>· {c.remote}</span>}
                        </div>
                        {c.snippet && <div className="text-[9px] mt-1 line-clamp-2" style={{ color: P.dim }}>{c.snippet}</div>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.sub }}>
                            <ExternalLink size={11} />
                          </a>
                        )}
                        <button onClick={() => addCandidate(c)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,210,106,0.12)", color: P.success }} title="Cadastrar vaga">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filtros + nova vaga */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                {(["todos", "caique", "esposa"] as const).map((p) => (
                  <button key={p} onClick={() => setProfileFilter(p)} className="px-2.5 py-1 rounded-lg text-[10px]" style={{ background: profileFilter === p ? "rgba(77,163,255,0.15)" : "transparent", color: profileFilter === p ? P.info : P.sub }}>
                    {p === "todos" ? "Todos" : PROFILE_LABELS[p]}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                {(["todos", "nova", "curriculo_pronto", "enviada", "descartada"] as const).map((st) => (
                  <button key={st} onClick={() => setStatusFilter(st)} className="px-2.5 py-1 rounded-lg text-[10px]" style={{ background: statusFilter === st ? "rgba(255,181,71,0.15)" : "transparent", color: statusFilter === st ? P.alert : P.sub }}>
                    {st === "todos" ? "Status" : STATUS_META[st].label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddJob((v) => !v)} className="ml-auto px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5" style={{ background: "rgba(77,163,255,0.15)", color: P.info }}>
                <Plus size={11} /> Nova vaga
              </button>
            </div>

            {showAddJob && (
              <div className="p-3.5 rounded-2xl space-y-2" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                <div className="flex gap-2 flex-wrap">
                  <input value={newJob.title} onChange={(e) => setNewJob((p) => ({ ...p, title: e.target.value }))} placeholder="Título da vaga *" className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  <input value={newJob.company} onChange={(e) => setNewJob((p) => ({ ...p, company: e.target.value }))} placeholder="Empresa" className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  <select value={newJob.profileKey} onChange={(e) => setNewJob((p) => ({ ...p, profileKey: e.target.value as OrunProfileKey }))} className="px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }}>
                    <option value="caique">Caíque</option>
                    <option value="esposa">Esposa</option>
                  </select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input value={newJob.location} onChange={(e) => setNewJob((p) => ({ ...p, location: e.target.value }))} placeholder="Local" className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  <input value={newJob.remote} onChange={(e) => setNewJob((p) => ({ ...p, remote: e.target.value }))} placeholder="Remoto/Híbrido" className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  <input value={newJob.url} onChange={(e) => setNewJob((p) => ({ ...p, url: e.target.value }))} placeholder="Link da vaga" className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addManual} className="px-4 py-1.5 rounded-lg text-[10px]" style={{ background: P.info, color: "#fff" }}>Cadastrar</button>
                  <button onClick={() => setShowAddJob(false)} className="px-4 py-1.5 rounded-lg text-[10px]" style={{ background: P.card2, color: P.sub }}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista de vagas */}
            <div className="space-y-1.5">
              {!state ? (
                <div className="text-[11px] py-8 text-center flex items-center justify-center gap-2" style={{ color: P.sub }}><Loader2 size={14} className="animate-spin" /> Carregando vagas…</div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-[11px] py-8 text-center" style={{ color: P.sub }}>Nenhuma vaga aqui. Busque vagas acima ou cadastre manualmente.</div>
              ) : (
                filteredJobs.map((job) => {
                  const meta = STATUS_META[job.status];
                  return (
                    <div key={job.id} className="p-3 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: job.profileKey === "esposa" ? "rgba(255,181,71,0.15)" : "rgba(77,163,255,0.15)", color: job.profileKey === "esposa" ? P.alert : P.info }}>
                              {PROFILE_LABELS[job.profileKey]}
                            </span>
                            <span className="text-[12px] font-medium truncate" style={{ color: P.text }}>{job.title}</span>
                          </div>
                          <div className="text-[10px] mt-1 flex items-center gap-2 flex-wrap" style={{ color: P.sub }}>
                            {job.company && <span className="font-medium" style={{ color: P.sub }}>{job.company}</span>}
                            {job.location && <span>· {job.location}</span>}
                            {job.remote && <span>· {job.remote}</span>}
                            <span className="text-[9px]" style={{ color: P.dim }}>· achada em {fmtDate(job.foundAt)}</span>
                          </div>
                          {job.notes && <div className="text-[9px] mt-1 line-clamp-1" style={{ color: P.dim }}>{job.notes}</div>}
                        </div>
                        <Badge tone="neutral">
                          <span style={{ color: meta.color }}>{meta.label}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <button onClick={() => prepare(job)} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: "rgba(255,181,71,0.12)", color: P.alert }}>
                          <FileText size={10} /> Preparar currículo
                        </button>
                        {job.status !== "enviada" && (
                          <button onClick={() => setStatus(job, "enviada")} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: "rgba(0,210,106,0.12)", color: P.success }}>
                            <Send size={10} /> Marcar enviada
                          </button>
                        )}
                        {job.status !== "descartada" && job.status !== "nova" && (
                          <button onClick={() => setStatus(job, "nova")} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: P.card2, color: P.sub }}>
                            <RefreshCw size={10} /> Reabrir
                          </button>
                        )}
                        {job.status !== "descartada" && (
                          <button onClick={() => setStatus(job, "descartada")} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: "rgba(255,75,75,0.1)", color: P.error }}>
                            <XCircle size={10} /> Descartar
                          </button>
                        )}
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: P.card2, color: P.sub }}>
                            <ExternalLink size={10} /> Abrir
                          </a>
                        )}
                        <button onClick={() => removeJob(job)} className="ml-auto w-6 h-6 rounded flex items-center justify-center" style={{ color: P.dim }} title="Remover">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══ PERFIS ═══ */}
        {tab === "perfis" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(["caique", "esposa"] as OrunProfileKey[]).map((key) => {
              const p = profileDraft[key] || { ...EMPTY_PROFILE };
              const gen = genResult[key];
              return (
                <div key={key} className="p-4 rounded-2xl space-y-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: key === "esposa" ? "rgba(255,181,71,0.15)" : "rgba(77,163,255,0.15)", color: key === "esposa" ? P.alert : P.info }}>
                      {PROFILE_LABELS[key].charAt(0)}
                    </div>
                    <div>
                      <span className="text-[12px] font-semibold" style={{ color: P.text }}>{PROFILE_LABELS[key]}</span>
                      {p.updatedAt && <span className="text-[8px] block" style={{ color: P.dim }}>atualizado em {fmtDate(p.updatedAt)}</span>}
                    </div>
                    <div className="ml-auto flex gap-1.5">
                      <button onClick={() => generateProfile(key)} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: "rgba(139,92,246,0.15)", color: P.violet }}>
                        <User size={10} /> Sugestões p/ recrutadores
                      </button>
                      <button onClick={() => saveProfile(key)} className="px-2.5 py-1.5 rounded-lg text-[9px] flex items-center gap-1" style={{ background: P.info, color: "#fff" }}>
                        <CheckCircle2 size={10} /> Salvar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input value={p.name} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, name: e.target.value } }))} placeholder="Nome" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                    <input value={p.linkedinUrl} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, linkedinUrl: e.target.value } }))} placeholder="LinkedIn (url)" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                    <input value={p.area} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, area: e.target.value } }))} placeholder="Área (ex.: desenvolvimento)" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                    <input value={p.level} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, level: e.target.value } }))} placeholder="Nível (ex.: pleno)" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                    <input value={p.city} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, city: e.target.value } }))} placeholder="Cidade" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                    <input value={p.remote} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, remote: e.target.value } }))} placeholder="Regime (remoto/presencial)" className="px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: P.sub }}>Cargos-alvo (separados por vírgula)</div>
                    <input value={(p.targetRoles || []).join(", ")} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, targetRoles: parseList(e.target.value) } }))} placeholder="Ex.: desenvolvedor react, dev pleno" className="w-full px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: P.sub }}>Skills (separadas por vírgula)</div>
                    <input value={(p.skills || []).join(", ")} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, skills: parseList(e.target.value) } }))} placeholder="Ex.: React, TypeScript, Node" className="w-full px-2.5 py-1.5 rounded-lg text-[10px] outline-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: P.sub }}>Sobre</div>
                    <textarea value={p.about} onChange={(e) => setProfileDraft((d) => ({ ...d, [key]: { ...p, about: e.target.value } }))} rows={3} className="w-full px-2.5 py-1.5 rounded-lg text-[10px] outline-none resize-none" style={{ background: P.panel, border: `1px solid ${P.border}`, color: P.text }} />
                  </div>

                  {gen && (
                    <div className="space-y-2 p-3 rounded-xl" style={{ background: "rgba(139,92,246,0.06)", border: `1px solid rgba(139,92,246,0.2)` }}>
                      <div className="text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1.5" style={{ color: P.violet }}><User size={10} /> Sugestões para recrutadores</div>
                      {gen.headlines && gen.headlines.length > 0 && (
                        <div>
                          <div className="text-[8px] uppercase" style={{ color: P.dim }}>Headline</div>
                          {gen.headlines.map((h, i) => <div key={i} className="text-[10px] mt-0.5" style={{ color: P.sub }}>• {h}</div>)}
                        </div>
                      )}
                      {gen.about && gen.about.length > 0 && (
                        <div>
                          <div className="text-[8px] uppercase mt-1" style={{ color: P.dim }}>Sobre</div>
                          {gen.about.map((a, i) => <div key={i} className="text-[10px] mt-0.5" style={{ color: P.sub }}>• {a}</div>)}
                        </div>
                      )}
                      {gen.keywords && gen.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {gen.keywords.map((k, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: "rgba(139,92,246,0.12)", color: P.violet }}>{k}</span>
                          ))}
                        </div>
                      )}
                      {gen.checklist && gen.checklist.length > 0 && (
                        <div>
                          <div className="text-[8px] uppercase mt-1" style={{ color: P.dim }}>Checklist</div>
                          {gen.checklist.map((c, i) => <div key={i} className="text-[9px] mt-0.5" style={{ color: P.dim }}>□ {c}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </PremiumRoot>
  );
}

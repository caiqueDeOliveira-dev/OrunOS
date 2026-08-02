import { useState, useEffect, useCallback, type DragEvent } from "react";
import {
  Scale, FileText, Image, Video, File, Plus, Trash2, Download,
  Search, Calendar, Tag, FolderOpen, MessageSquare, Camera,
  Shield, BookOpen, Clock, Files, ChevronRight, Filter,
  Upload, Link2, Info, X, HardDrive, Smartphone,
  Briefcase, User, CheckCircle, AlertTriangle, Award,
  BarChart3, TrendingUp, type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { EvidenceService, type EvidenceEntry } from "../../../services/evidenceService";
import { sanitizeText } from "../../../utils/sanitize";
import { usePersonalization, useWorkspaceNotes, useWorkspaceGoals, useWorkspaceStats } from "../../../hooks/usePersonalization";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { getPluginSettings, setPluginSettings } from "../../PluginRegistry";

// ── Types ──────────────────────────────────────────────────────────────

interface CasoJuridico {
  id: string;
  numero: string;
  cliente: string;
  tipo: "trabalhista" | "civil" | "criminal" | "previdenciario";
  status: "aberto" | "andamento" | "arquivado";
  dataAbertura: string;
  descricao: string;
}

type TabId = "painel" | "evidencias" | "casos" | "whatsapp";

// ── Tab configuration ──────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "painel", label: "Painel", icon: Scale },
  { id: "evidencias", label: "Evidências", icon: Camera },
  { id: "casos", label: "Casos", icon: Briefcase },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

// ── Icons by type ─────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, LucideIcon> = {
  foto: Camera,
  video: Video,
  audio: File,
  documento: FileText,
};

const TYPE_LABELS: Record<string, string> = {
  foto: "Foto",
  video: "Vídeo",
  audio: "Áudio",
  documento: "Documento",
};

const STATUS_COLORS: Record<string, string> = {
  aberto: "#EAB308",
  andamento: "#1E40AF",
  arquivado: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  andamento: "Andamento",
  arquivado: "Arquivado",
};

const STAT_CARD_STYLE: React.CSSProperties = {
  padding: "16px",
  borderRadius: "12px",
  background: "var(--card)",
  border: "1px solid var(--border)",
};

// ── Component ─────────────────────────────────────────────────────────

export function JuridicoWorkspace(_props: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Juridico");
  const { goals, updateGoals, incrementGoal } = useWorkspaceGoals("Juridico");
  const { stats: personalStats, logAction } = useWorkspaceStats("Juridico");
  const { confirm, dialogElement } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<TabId>("painel");
  const [evidenceList, setEvidenceList] = useState<EvidenceEntry[]>([]);
  const [casos, setCasos] = useState<CasoJuridico[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState<string>("todos");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceEntry | null>(null);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [showAddCase, setShowAddCase] = useState(false);
  const [newEvidenceType, setNewEvidenceType] = useState<EvidenceEntry["type"]>("foto");
  const [newEvidenceName, setNewEvidenceName] = useState("");
  const [newEvidenceDesc, setNewEvidenceDesc] = useState("");
  const [newEvidenceTags, setNewEvidenceTags] = useState("");
  const [newCaseCliente, setNewCaseCliente] = useState("");
  const [newCaseTipo, setNewCaseTipo] = useState<CasoJuridico["tipo"]>("trabalhista");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [whatsAutoSave, setWhatsAutoSave] = useState(true);
  const [whatsConnected, setWhatsConnected] = useState(false);
  const [recentWhatsFiles, setRecentWhatsFiles] = useState<EvidenceEntry[]>([]);
  const [evidenceDetailTab, setEvidenceDetailTab] = useState<"info" | "caso">("info");
  const [dragOver, setDragOver] = useState(false);
  const [droppedPreviews, setDroppedPreviews] = useState<{ name: string; dataUrl: string }[]>([]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const previews: { name: string; dataUrl: string }[] = [];

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setDroppedPreviews((prev) => [...prev.slice(-9), { name: file.name, dataUrl }]);
        };
        reader.readAsDataURL(file);
      }

      EvidenceService.addEntry({
        type: file.type.startsWith("image/") ? "foto" : file.type.startsWith("video/") ? "video" : "documento",
        fileName: file.name,
        originalName: file.name.replace(/\.[^/.]+$/, ""),
        filePath: "",
        dateReceived: new Date().toISOString(),
        description: "Importado por arrastar e soltar",
        tags: [],
        size: file.size,
      });
    });

    setEvidenceList(EvidenceService.loadAll());
  }, []);

  useEffect(() => {
    setEvidenceList(EvidenceService.loadAll());
    const settings = getPluginSettings("Juridico");
    const saved = settings.casos as CasoJuridico[] | undefined;
    if (saved) setCasos(saved);
  }, []);

  function saveCasos(updated: CasoJuridico[]) {
    setCasos(updated);
    setPluginSettings("Juridico", { casos: updated });
  }

  function handleAddEvidence() {
    const safeName = sanitizeText(newEvidenceName);
    const safeDesc = sanitizeText(newEvidenceDesc);
    const safeTags = newEvidenceTags.split(",").map((t) => sanitizeText(t.trim())).filter(Boolean);
    const entry = EvidenceService.addEntry({
      type: newEvidenceType,
      fileName: safeName.toLowerCase().replace(/\s+/g, "-") + "." + (newEvidenceType === "foto" ? "jpg" : newEvidenceType === "video" ? "mp4" : "pdf"),
      originalName: safeName,
      filePath: "",
      dateReceived: new Date().toISOString(),
      description: safeDesc,
      tags: safeTags,
      size: 0,
    });
    setEvidenceList(EvidenceService.loadAll());
    setShowAddEvidence(false);
    setNewEvidenceName("");
    setNewEvidenceDesc("");
    setNewEvidenceTags("");
    logAction("evidencia_adicionada");
  }

  function handleRemoveEvidence(id: string) {
    EvidenceService.removeEntry(id);
    setEvidenceList(EvidenceService.loadAll());
    setSelectedEvidence(null);
    logAction("evidencia_removida");
  }

  function handleAddCase() {
    const newCase: CasoJuridico = {
      id: `caso-${Date.now()}`,
      numero: `ORUN-${String(casos.length + 1).padStart(3, "0")}/${new Date().getFullYear()}`,
      cliente: sanitizeText(newCaseCliente),
      tipo: newCaseTipo,
      status: "aberto",
      dataAbertura: new Date().toISOString().slice(0, 10),
      descricao: sanitizeText(newCaseDesc),
    };
    const updated = [...casos, newCase];
    saveCasos(updated);
    setShowAddCase(false);
    setNewCaseCliente("");
    setNewCaseDesc("");
    logAction("caso_criado");
  }

  function handleLinkEvidenceToCase(evidenceId: string, casoId: string) {
    EvidenceService.updateEntry(evidenceId, { caseRef: casoId });
    setEvidenceList(EvidenceService.loadAll());
  }

  const stats = EvidenceService.getStats();

  const filteredEvidence = evidenceFilter === "todos"
    ? evidenceList
    : evidenceList.filter((e) => e.type === evidenceFilter);

  const recentEvidence = evidenceList.slice(0, 5);

  const evidenceByCase = selectedEvidence?.caseRef
    ? casos.find((c) => c.id === selectedEvidence.caseRef)
    : null;

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto" style={{ background: "var(--background)" }}>
      {dialogElement}
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E40AF, #D4AF37)" }}>
            <Scale size={18} color="#fff" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{greeting}, Dr. {userName}</h2>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Escritório Jurídico · Catálogo de Provas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "linear-gradient(135deg, #1E40AF, #D4AF37)", color: "#fff" }}>
            {avatarInitials}
          </div>
          <span className="text-[9px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>
            <Award size={10} /> Premium
          </span>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all flex-1 justify-center"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: active ? "linear-gradient(135deg, rgba(30,64,175,0.12), rgba(212,175,55,0.08))" : "transparent",
                color: active ? "#1E40AF" : "var(--muted-foreground)",
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={14} />
              {tab.label}
              {tab.id === "evidencias" && evidenceList.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "#1E40AF", color: "#fff" }}>
                  {evidenceList.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          PAINEL (Dashboard)
         ════════════════════════════════════════════════════ */}
      {activeTab === "painel" && (
        <div className="flex flex-col gap-4">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Evidências", value: String(stats.total), icon: Camera, color: "#1E40AF" },
              { label: "Fotos", value: String(stats.fotos), icon: Image, color: "#D4AF37" },
              { label: "Vídeos", value: String(stats.videos), icon: Video, color: "#22C55E" },
              { label: "Casos", value: String(casos.length), icon: Briefcase, color: "#8B5CF6" },
            ].map((s) => (
              <div key={s.label} style={STAT_CARD_STYLE}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={14} style={{ color: s.color }} />
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
                </div>
                <span className="text-lg font-bold" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Receber Mídia", icon: Camera, action: () => setActiveTab("whatsapp"), color: "#D4AF37" },
              { label: "Abrir WhatsApp", icon: MessageSquare, action: () => setActiveTab("whatsapp"), color: "#25D366" },
              { label: "Catalogar Evidência", icon: Upload, action: () => { setShowAddEvidence(true); setActiveTab("evidencias"); }, color: "#1E40AF" },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <btn.icon size={16} style={{ color: btn.color }} />
                {btn.label}
                <ChevronRight size={12} style={{ color: "var(--muted-foreground)", marginLeft: "auto" }} />
              </button>
            ))}
          </div>

          {/* Recent Evidence + Cases */}
          <div className="grid grid-cols-2 gap-4">
            <div style={STAT_CARD_STYLE}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: "#1E40AF" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Evidências Recentes</span>
              </div>
              {recentEvidence.length === 0 ? (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma evidência cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {recentEvidence.map((ev) => {
                    const Icon = TYPE_ICONS[ev.type] || File;
                    return (
                      <div key={ev.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                        <Icon size={12} style={{ color: "#1E40AF" }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] block truncate" style={{ color: "var(--foreground)" }}>{ev.originalName}</span>
                          <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{new Date(ev.dateReceived).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {ev.tags.length > 0 && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(30,64,175,0.08)", color: "#1E40AF" }}>
                            {ev.tags[0]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={STAT_CARD_STYLE}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} style={{ color: "#1E40AF" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Casos Ativos</span>
              </div>
              {casos.length === 0 ? (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhum caso cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {casos.filter((c) => c.status !== "arquivado").slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <div>
                        <span className="text-[10px] block" style={{ color: "var(--foreground)" }}>{c.numero} — {c.cliente}</span>
                        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{c.tipo}</span>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{
                        background: STATUS_COLORS[c.status] + "18",
                        color: STATUS_COLORS[c.status],
                      }}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Storage info */}
          <div style={STAT_CARD_STYLE}>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={14} style={{ color: "var(--muted-foreground)" }} />
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Armazenamento de Evidências</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span style={{ color: "var(--foreground)" }}>Total: <strong>{(stats.totalSize / 1024 / 1024).toFixed(1)} MB</strong></span>
              <span style={{ color: "#1E40AF" }}>📷 {stats.fotos} fotos</span>
              <span style={{ color: "#22C55E" }}>🎬 {stats.videos} vídeos</span>
              <span style={{ color: "#8B5CF6" }}>📄 {stats.documentos} documentos</span>
            </div>
          </div>

          {/* Personal Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div style={STAT_CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={12} style={{ color: "#D4AF37" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Hoje</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{personalStats["evidencia_adicionada"] || 0}</span>
              <span className="text-[8px] ml-1" style={{ color: "var(--muted-foreground)" }}>ações</span>
            </div>
            <div style={STAT_CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={12} style={{ color: "#22C55E" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Total ações</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{Object.values(personalStats).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div style={STAT_CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <Award size={12} style={{ color: "#D4AF37" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Mais usado</span>
              </div>
              <span className="text-xs font-medium truncate block" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>
                {Object.entries(personalStats).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") || "—"}
              </span>
            </div>
          </div>

          {/* Metas */}
          <div style={STAT_CARD_STYLE}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award size={14} style={{ color: "#D4AF37" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Minhas Metas</span>
              </div>
              <button
                onClick={() => {
                  const label = prompt("Nova meta (ex: Concluir casos este mês):");
                  if (label) {
                    const target = Number(prompt("Meta numérica (ex: 5):") || "1");
                    updateGoals([...goals, { label, target, current: 0 }]);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px]"
                style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}
              >
                <Plus size={8} /> Nova Meta
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Crie metas para acompanhar seu progresso.</p>
            ) : (
              <div className="space-y-2">
                {goals.map((g, i) => {
                  const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span style={{ color: "var(--foreground)" }}>{g.label}</span>
                          <span style={{ color: pct >= 100 ? "#22C55E" : "#D4AF37" }}>{g.current}/{g.target}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "var(--secondary)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#22C55E" : "linear-gradient(90deg, #1E40AF, #D4AF37)" }} />
                        </div>
                      </div>
                      <button
                        onClick={() => incrementGoal(i)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px]"
                        style={{ background: "rgba(30,64,175,0.1)", color: "#1E40AF" }}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => updateGoals(goals.filter((_, j) => j !== i))}
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notas Pessoais */}
          <div style={STAT_CARD_STYLE}>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} style={{ color: "#8B5CF6" }} />
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Notas Pessoais</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
              style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "60px" }}
              placeholder="Suas anotações pessoais rápidas..."
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          EVIDÊNCIAS (Evidence)
         ════════════════════════════════════════════════════ */}
      {activeTab === "evidencias" && (
        <div className="flex flex-1 gap-4">
          {/* Evidence List */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {["todos", "foto", "video", "documento"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setEvidenceFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-[9px] transition-all"
                    style={{
                      background: evidenceFilter === f ? "#1E40AF" : "var(--secondary)",
                      color: evidenceFilter === f ? "#fff" : "var(--muted-foreground)",
                      fontWeight: evidenceFilter === f ? 500 : 300,
                    }}
                  >
                    {f === "todos" ? "Todos" : f === "foto" ? "Fotos" : f === "video" ? "Vídeos" : "Documentos"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("whatsapp")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
                  style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}
                >
                  <Smartphone size={11} /> Importar WhatsApp
                </button>
                <button
                  onClick={() => setShowAddEvidence(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
                  style={{ background: "#1E40AF", color: "#fff" }}
                >
                  <Plus size={11} /> Adicionar Evidência
                </button>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-6"
              style={{
                borderColor: dragOver ? "#1E40AF" : "var(--border)",
                background: dragOver ? "rgba(30,64,175,0.05)" : "var(--card)",
              }}
            >
              {droppedPreviews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {droppedPreviews.map((f, i) => (
                    f.dataUrl ? (
                      <img key={i} src={f.dataUrl} alt={f.name} className="w-12 h-12 rounded-lg object-cover border" style={{ borderColor: "var(--border)" }} />
                    ) : (
                      <div key={i} className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                        <File size={16} />
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <>
                  <Upload size={24} style={{ color: dragOver ? "#1E40AF" : "var(--muted-foreground)", opacity: 0.4 }} />
                  <p className="text-[11px] mt-2" style={{ color: dragOver ? "#1E40AF" : "var(--muted-foreground)" }}>
                    Arraste fotos e vídeos aqui
                  </p>
                </>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-3 flex-1">
              {filteredEvidence.length === 0 ? (
                <div className="col-span-3 flex flex-col items-center justify-center p-8 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
                  <Camera size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                  <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>Nenhuma evidência encontrada</p>
                  <button
                    onClick={() => setShowAddEvidence(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] mt-2"
                    style={{ background: "#1E40AF", color: "#fff" }}
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
              ) : (
                filteredEvidence.map((ev) => {
                  const Icon = TYPE_ICONS[ev.type] || File;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvidence(ev)}
                      className="flex flex-col p-3 rounded-xl text-left transition-all"
                      style={{
                        background: selectedEvidence?.id === ev.id ? "rgba(30,64,175,0.08)" : "var(--card)",
                        border: selectedEvidence?.id === ev.id ? "1px solid #1E40AF" : "1px solid var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(30,64,175,0.1)" }}>
                          <Icon size={14} style={{ color: "#1E40AF" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-medium block truncate" style={{ color: "var(--foreground)" }}>{ev.originalName}</span>
                          <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{TYPE_LABELS[ev.type]} · {new Date(ev.dateReceived).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                      {ev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ev.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {ev.caseRef && (
                        <span className="text-[8px] mt-1 flex items-center gap-1" style={{ color: "#8B5CF6" }}>
                          <Link2 size={8} /> Vinculado a caso
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Evidence Detail Panel */}
          {selectedEvidence && (
            <div className="w-72 flex flex-col gap-3" style={{ minWidth: "240px" }}>
              <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Detalhes</span>
                  <button onClick={() => setSelectedEvidence(null)} style={{ color: "var(--muted-foreground)" }}>
                    <X size={14} />
                  </button>
                </div>

                <div className="flex flex-col items-center mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(30,64,175,0.1)" }}>
                    {(() => { const Icon = TYPE_ICONS[selectedEvidence.type] || File; return <Icon size={28} style={{ color: "#1E40AF" }} />; })()}
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: "var(--foreground)" }}>{selectedEvidence.originalName}</span>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{TYPE_LABELS[selectedEvidence.type]}</span>
                </div>

                {/* Detail tabs */}
                <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: "var(--secondary)" }}>
                  {(["info", "caso"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEvidenceDetailTab(t)}
                      className="flex-1 py-1 rounded text-[9px]"
                      style={{
                        background: evidenceDetailTab === t ? "var(--card)" : "transparent",
                        color: evidenceDetailTab === t ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {t === "info" ? "Info" : "Caso"}
                    </button>
                  ))}
                </div>

                {evidenceDetailTab === "info" && (
                  <div className="space-y-2 text-[10px]">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--muted-foreground)" }}>Data</span>
                      <span style={{ color: "var(--foreground)" }}>{new Date(selectedEvidence.dateReceived).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--muted-foreground)" }}>Arquivo</span>
                      <span className="truncate max-w-[120px]" style={{ color: "var(--foreground)" }}>{selectedEvidence.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--muted-foreground)" }}>Tamanho</span>
                      <span style={{ color: "var(--foreground)" }}>{(selectedEvidence.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {selectedEvidence.description && (
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Descrição</span>
                        <p style={{ color: "var(--foreground)" }} className="mt-1">{selectedEvidence.description}</p>
                      </div>
                    )}
                    {selectedEvidence.tags.length > 0 && (
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Tags</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedEvidence.tags.map((tag) => (
                            <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {evidenceDetailTab === "caso" && (
                  <div className="space-y-2">
                    {evidenceByCase ? (
                      <div className="p-2 rounded-lg" style={{ background: "var(--secondary)" }}>
                        <span className="text-[10px] font-medium block" style={{ color: "var(--foreground)" }}>{evidenceByCase.numero}</span>
                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{evidenceByCase.cliente} · {evidenceByCase.tipo}</span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] mb-2" style={{ color: "var(--muted-foreground)" }}>Não vinculado a nenhum caso.</p>
                        {casos.length > 0 && (
                          <select
                            className="w-full p-1.5 rounded-lg text-[10px]"
                            style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                            onChange={(e) => {
                              if (e.target.value) handleLinkEvidenceToCase(selectedEvidence.id, e.target.value);
                            }}
                          >
                            <option value="">Vincular a caso...</option>
                            {casos.map((c) => (
                              <option key={c.id} value={c.id}>{c.numero} — {c.cliente}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
                    <Download size={10} /> Baixar
                  </button>
                  <button
                    onClick={() => confirm({
                      title: "Excluir Evidência",
                      message: `Tem certeza que deseja excluir "${selectedEvidence.originalName}"? Esta ação não pode ser desfeita.`,
                      confirmLabel: "Excluir",
                      variant: "danger",
                      onConfirm: () => handleRemoveEvidence(selectedEvidence.id),
                    })}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px]" style={{ background: "rgba(192,0,24,0.1)", color: "#C00018" }}
                  >
                    <Trash2 size={10} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CASOS (Cases)
         ════════════════════════════════════════════════════ */}
      {activeTab === "casos" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Meus Casos</span>
            <button
              onClick={() => setShowAddCase(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
              style={{ background: "#1E40AF", color: "#fff" }}
            >
              <Plus size={11} /> Novo Caso
            </button>
          </div>

          {casos.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
              <Briefcase size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
              <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>Nenhum caso cadastrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {casos.map((c) => {
                const caseEvidence = evidenceList.filter((e) => e.caseRef === c.id);
                return (
                  <div key={c.id} className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} style={{ color: "#1E40AF" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{c.numero}</span>
                      </div>
                      <span className="text-[8px] px-2 py-0.5 rounded-full" style={{
                        background: STATUS_COLORS[c.status] + "18",
                        color: STATUS_COLORS[c.status],
                      }}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <User size={10} style={{ color: "var(--muted-foreground)" }} />
                        <span style={{ color: "var(--foreground)" }}>{c.cliente}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag size={10} style={{ color: "var(--muted-foreground)" }} />
                        <span style={{ color: "var(--muted-foreground)" }}>{c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={10} style={{ color: "var(--muted-foreground)" }} />
                        <span style={{ color: "var(--muted-foreground)" }}>{new Date(c.dataAbertura).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{c.descricao}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Camera size={10} style={{ color: "#D4AF37" }} />
                        <span style={{ color: "#D4AF37" }}>{caseEvidence.length} evidência(s) vinculada(s)</span>
                      </div>
                    </div>
                    {caseEvidence.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {caseEvidence.slice(0, 5).map((ev) => {
                          const Icon = TYPE_ICONS[ev.type] || File;
                          return (
                            <span key={ev.id} className="text-[7px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(30,64,175,0.08)", color: "#1E40AF" }}>
                              <Icon size={7} /> {ev.originalName.slice(0, 12)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          WHATSAPP
         ════════════════════════════════════════════════════ */}
      {activeTab === "whatsapp" && (
        <div className="flex flex-col gap-4">
          {/* Connection Status */}
          <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: "#25D366" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>WhatsApp</span>
              </div>
              <label className="flex items-center gap-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                <input
                  type="checkbox"
                  checked={whatsAutoSave}
                  onChange={(e) => setWhatsAutoSave(e.target.checked)}
                  className="rounded"
                />
                Auto-salvar mídia
              </label>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: whatsConnected ? "#22C55E" : "#6B7280" }} />
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {whatsConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              <button
                onClick={() => setWhatsConnected(!whatsConnected)}
                className="px-3 py-1.5 rounded-lg text-[9px]"
                style={{
                  background: whatsConnected ? "rgba(192,0,24,0.1)" : "#25D366",
                  color: whatsConnected ? "#C00018" : "#fff",
                }}
              >
                {whatsConnected ? "Desconectar" : "Conectar WhatsApp"}
              </button>
            </div>

            {!whatsConnected && (
              <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  Envie fotos e vídeos para o número <strong style={{ color: "var(--foreground)" }}>(XX) XXXXX-XXXX</strong> para registrar como evidência automaticamente.
                </p>
                <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                  Após conectar, todas as mídias recebidas serão salvas no catálogo de evidências e organizadas por data e caso.
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={14} style={{ color: "#25D366" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Como Funciona</span>
              </div>
              <ol className="space-y-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                <li>1. Conecte seu WhatsApp escaneando o QR Code</li>
                <li>2. Envie fotos/vídeos para seu próprio número</li>
                <li>3. O agente Jurídico salva automaticamente como evidência</li>
                <li>4. Acesse a aba "Evidências" para ver tudo catalogado</li>
                <li>5. Vincule evidências a casos específicos</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} style={{ color: "#D4AF37" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Dicas Legais</span>
              </div>
              <ul className="space-y-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                <li>• Nomeie os arquivos com data e descrição do evento</li>
                <li>• Use tags para categorizar: #contrato, #acidente, #prova</li>
                <li>• Vincule cada mídia ao caso correspondente</li>
                <li>• Mantenha o original sem edições para validade legal</li>
                <li>• Exporte o catálogo periodicamente como backup</li>
              </ul>
            </div>
          </div>

          {/* Recently received via WhatsApp */}
          {recentWhatsFiles.length > 0 && (
            <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Download size={14} style={{ color: "#25D366" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Recebidos Recentemente</span>
              </div>
              <div className="space-y-2">
                {recentWhatsFiles.map((ev) => {
                  const Icon = TYPE_ICONS[ev.type] || File;
                  return (
                    <div key={ev.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <Icon size={12} style={{ color: "#25D366" }} />
                      <span className="text-[10px]" style={{ color: "var(--foreground)" }}>{ev.originalName}</span>
                      <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{new Date(ev.dateReceived).toLocaleString("pt-BR")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAIS
         ════════════════════════════════════════════════════ */}

      {/* Add Evidence Modal */}
      {showAddEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Nova Evidência</span>
              <button onClick={() => setShowAddEvidence(false)} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Tipo</label>
                <div className="flex gap-2">
                  {(["foto", "video", "documento"] as const).map((t) => {
                    const Icon = TYPE_ICONS[t];
                    const active = newEvidenceType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setNewEvidenceType(t)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] flex-1 justify-center"
                        style={{
                          background: active ? "#1E40AF" : "var(--secondary)",
                          color: active ? "#fff" : "var(--muted-foreground)",
                        }}
                      >
                        <Icon size={12} /> {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome do Arquivo</label>
                <input
                  value={newEvidenceName}
                  onChange={(e) => setNewEvidenceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  placeholder="Ex: Contrato assinado"
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Descrição</label>
                <textarea
                  value={newEvidenceDesc}
                  onChange={(e) => setNewEvidenceDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[11px] resize-none"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "60px" }}
                  placeholder="Descreva a evidência..."
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Tags (separadas por vírgula)</label>
                <input
                  value={newEvidenceTags}
                  onChange={(e) => setNewEvidenceTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  placeholder="contrato, trabalhista, assinado"
                />
              </div>

              <button
                onClick={handleAddEvidence}
                disabled={!newEvidenceName.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: newEvidenceName.trim() ? "#1E40AF" : "var(--secondary)", color: newEvidenceName.trim() ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> Registrar Evidência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Case Modal */}
      {showAddCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Novo Caso</span>
              <button onClick={() => setShowAddCase(false)} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Cliente</label>
                <input
                  value={newCaseCliente}
                  onChange={(e) => setNewCaseCliente(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[11px]"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Tipo</label>
                <div className="flex gap-2">
                  {(["trabalhista", "civil", "criminal", "previdenciario"] as const).map((t) => {
                    const active = newCaseTipo === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setNewCaseTipo(t)}
                        className="flex-1 py-2 rounded-lg text-[9px]"
                        style={{
                          background: active ? "#1E40AF" : "var(--secondary)",
                          color: active ? "#fff" : "var(--muted-foreground)",
                        }}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Descrição</label>
                <textarea
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[11px] resize-none"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "60px" }}
                  placeholder="Descreva o caso..."
                />
              </div>

              <button
                onClick={handleAddCase}
                disabled={!newCaseCliente.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: newCaseCliente.trim() ? "#1E40AF" : "var(--secondary)", color: newCaseCliente.trim() ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> Criar Caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

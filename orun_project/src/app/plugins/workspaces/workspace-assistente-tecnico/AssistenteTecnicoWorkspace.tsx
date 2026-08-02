import { useState, useEffect } from "react";
import {
  Wrench, Cpu, Package, ShoppingCart, AlertTriangle, CheckCircle,
  Plus, Search, Filter, X, Edit, Trash2, ClipboardList, Clock, ChevronRight,
  Upload, Download, User, Phone, Calendar, DollarSign, Archive, Box, ScanLine,
  BarChart3, TrendingUp, Award,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { InventoryService, type RepairItem, type Part, type Tool as ToolType } from "../../../services/inventoryService";
import { sanitizeText, sanitizeNumeric } from "../../../utils/sanitize";
import { usePersonalization, useWorkspaceNotes, useWorkspaceGoals, useWorkspaceStats } from "../../../hooks/usePersonalization";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";

type TabId = "painel" | "consertos" | "pecas" | "ferramentas" | "compras";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "painel", label: "Painel", icon: Wrench },
  { id: "consertos", label: "Consertos", icon: Cpu },
  { id: "pecas", label: "Peças", icon: Package },
  { id: "ferramentas", label: "Ferramentas", icon: Wrench },
  { id: "compras", label: "Compras", icon: ShoppingCart },
];

const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando",
  diagnosticando: "Diagnosticando",
  em_conserto: "Em Conserto",
  aguardando_peca: "Aguard. Peça",
  concluido: "Concluído",
  entregue: "Entregue",
};

const STATUS_COLORS: Record<string, string> = {
  aguardando: "#9CA3AF",
  diagnosticando: "#EAB308",
  em_conserto: "#D97706",
  aguardando_peca: "#EF4444",
  concluido: "#22C55E",
  entregue: "#3B82F6",
};

const PART_CATEGORIES: Record<string, string> = {
  resistores: "Resistores",
  capacitores: "Capacitores",
  transistores: "Transistores",
  diodos: "Diodos",
  cis: "CIs",
  conectores: "Conectores",
  cabos: "Cabos",
  fontes: "Fontes",
  motores: "Motores",
  outros: "Outros",
};

const TOOL_CATEGORIES: Record<string, string> = {
  ferramentas_manuais: "Manuais",
  ferramentas_eletricas: "Elétricas",
  instrumentos_medicao: "Medição",
  equipamentos: "Equipamentos",
  consumiveis: "Consumíveis",
};

const TOOL_STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em Uso",
  em_manutencao: "Em Manutenção",
  quebrado: "Quebrado",
  faltando: "Faltando",
};

const TOOL_STATUS_COLORS: Record<string, string> = {
  disponivel: "#22C55E",
  em_uso: "#EAB308",
  em_manutencao: "#D97706",
  quebrado: "#EF4444",
  faltando: "#EF4444",
};

const CARD_STYLE: React.CSSProperties = {
  padding: "16px",
  borderRadius: "12px",
  background: "var(--card)",
  border: "1px solid var(--border)",
};

const ACCENT = "#D97706";

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch { return d; }
}

export function AssistenteTecnicoWorkspace(_props: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("AssistenteTecnico");
  const { goals, updateGoals, incrementGoal } = useWorkspaceGoals("AssistenteTecnico");
  const { stats: personalStats, logAction } = useWorkspaceStats("AssistenteTecnico");
  const { confirm, dialogElement } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<TabId>("painel");
  const [repairs, setRepairs] = useState<RepairItem[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [tools, setTools] = useState<ToolType[]>([]);
  const [repairFilter, setRepairFilter] = useState<string>("todos");
  const [partFilter, setPartFilter] = useState<string>("todos");
  const [toolCatFilter, setToolCatFilter] = useState<string>("todas");
  const [toolStatusFilter, setToolStatusFilter] = useState<string>("todas");
  const [selectedRepair, setSelectedRepair] = useState<RepairItem | null>(null);
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddTool, setShowAddTool] = useState(false);
  const [showAddPartToRepair, setShowAddPartToRepair] = useState(false);
  const [addPartRepairId, setAddPartRepairId] = useState<string | null>(null);
  const [editPartId, setEditPartId] = useState<string | null>(null);
  const [editToolId, setEditToolId] = useState<string | null>(null);

  const [newRepairProduct, setNewRepairProduct] = useState("");
  const [newRepairProblem, setNewRepairProblem] = useState("");
  const [newRepairClient, setNewRepairClient] = useState("");
  const [newRepairPhone, setNewRepairPhone] = useState("");
  const [newRepairPrice, setNewRepairPrice] = useState("");
  const [newRepairNotes, setNewRepairNotes] = useState("");

  const [newPartName, setNewPartName] = useState("");
  const [newPartCategory, setNewPartCategory] = useState<Part["category"]>("outros");
  const [newPartQty, setNewPartQty] = useState("");
  const [newPartMin, setNewPartMin] = useState("");
  const [newPartUnit, setNewPartUnit] = useState("un");
  const [newPartLocation, setNewPartLocation] = useState("");
  const [newPartSupplier, setNewPartSupplier] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("");
  const [newPartNotes, setNewPartNotes] = useState("");
  const [newPartBarcode, setNewPartBarcode] = useState("");

  const [partsSearch, setPartsSearch] = useState("");

  const [newToolName, setNewToolName] = useState("");
  const [newToolCategory, setNewToolCategory] = useState<ToolType["category"]>("ferramentas_manuais");
  const [newToolQty, setNewToolQty] = useState("");
  const [newToolStatus, setNewToolStatus] = useState<ToolType["status"]>("disponivel");
  const [newToolLocation, setNewToolLocation] = useState("");
  const [newToolNotes, setNewToolNotes] = useState("");

  const [selectedPartToAdd, setSelectedPartToAdd] = useState("");

  function loadAll() {
    setRepairs(InventoryService.getRepairs());
    setParts(InventoryService.getParts());
    setTools(InventoryService.getTools());
  }

  useEffect(() => { loadAll(); }, []);

  function resetNewRepair() {
    setNewRepairProduct(""); setNewRepairProblem(""); setNewRepairClient("");
    setNewRepairPhone(""); setNewRepairPrice(""); setNewRepairNotes("");
  }

  function handleAddRepair() {
    InventoryService.addRepair({
      productName: sanitizeText(newRepairProduct),
      problem: sanitizeText(newRepairProblem),
      clientName: sanitizeText(newRepairClient) || undefined,
      clientPhone: sanitizeText(newRepairPhone) || undefined,
      entryDate: new Date().toISOString(),
      estimatedPrice: newRepairPrice ? Number(sanitizeNumeric(newRepairPrice)) : undefined,
      status: "aguardando",
      partsUsed: [],
      notes: sanitizeText(newRepairNotes),
    });
    loadAll();
    setShowAddRepair(false);
    resetNewRepair();
    logAction("conserto_criado");
  }

  function handleUpdateRepairStatus(id: string, status: RepairItem["status"]) {
    InventoryService.updateRepair(id, { status });
    loadAll();
    if (selectedRepair?.id === id) {
      setSelectedRepair({ ...selectedRepair, status });
    }
  }

  function handleDeleteRepair(id: string) {
    InventoryService.deleteRepair(id);
    loadAll();
    if (selectedRepair?.id === id) setSelectedRepair(null);
  }

  function handleAddPart() {
    InventoryService.addPart({
      name: sanitizeText(newPartName),
      barcode: newPartBarcode,
      category: newPartCategory,
      quantity: Number(sanitizeNumeric(newPartQty)) || 0,
      minQuantity: Number(sanitizeNumeric(newPartMin)) || 1,
      unit: newPartUnit,
      location: sanitizeText(newPartLocation),
      supplier: sanitizeText(newPartSupplier) || undefined,
      price: newPartPrice ? Number(sanitizeNumeric(newPartPrice)) : undefined,
      notes: sanitizeText(newPartNotes),
    });
    loadAll();
    setShowAddPart(false);
    setEditPartId(null);
    setNewPartName(""); setNewPartCategory("outros"); setNewPartQty(""); setNewPartMin("");
    setNewPartUnit("un"); setNewPartLocation(""); setNewPartSupplier(""); setNewPartPrice(""); setNewPartNotes("");
    logAction("peca_adicionada");
  }

  function handleEditPart(part: Part) {
    setEditPartId(part.id);
    setNewPartName(part.name);
    setNewPartBarcode(part.barcode);
    setNewPartCategory(part.category);
    setNewPartQty(String(part.quantity));
    setNewPartMin(String(part.minQuantity));
    setNewPartUnit(part.unit);
    setNewPartLocation(part.location);
    setNewPartSupplier(part.supplier || "");
    setNewPartPrice(part.price ? String(part.price) : "");
    setNewPartNotes(part.notes);
    setShowAddPart(true);
  }

  function handleUpdatePart() {
    if (!editPartId) return;
    InventoryService.updatePart(editPartId, {
      name: sanitizeText(newPartName),
      barcode: newPartBarcode,
      category: newPartCategory,
      quantity: Number(sanitizeNumeric(newPartQty)) || 0,
      minQuantity: Number(sanitizeNumeric(newPartMin)) || 1,
      unit: newPartUnit,
      location: sanitizeText(newPartLocation),
      supplier: sanitizeText(newPartSupplier) || undefined,
      price: newPartPrice ? Number(sanitizeNumeric(newPartPrice)) : undefined,
      notes: sanitizeText(newPartNotes),
    });
    loadAll();
    setShowAddPart(false);
    setEditPartId(null);
    setNewPartName(""); setNewPartBarcode(""); setNewPartCategory("outros"); setNewPartQty(""); setNewPartMin("");
    setNewPartUnit("un"); setNewPartLocation(""); setNewPartSupplier(""); setNewPartPrice(""); setNewPartNotes("");
  }

  function handleDeletePart(id: string) {
    InventoryService.deletePart(id);
    loadAll();
  }

  function handleAddTool() {
    InventoryService.addTool({
      name: sanitizeText(newToolName),
      category: newToolCategory,
      quantity: Number(sanitizeNumeric(newToolQty)) || 1,
      status: newToolStatus,
      location: sanitizeText(newToolLocation),
      notes: sanitizeText(newToolNotes),
    });
    loadAll();
    setShowAddTool(false);
    setEditToolId(null);
    setNewToolName(""); setNewToolCategory("ferramentas_manuais"); setNewToolQty("");
    setNewToolStatus("disponivel"); setNewToolLocation(""); setNewToolNotes("");
    logAction("ferramenta_adicionada");
  }

  function handleEditTool(tool: ToolType) {
    setEditToolId(tool.id);
    setNewToolName(tool.name);
    setNewToolCategory(tool.category);
    setNewToolQty(String(tool.quantity));
    setNewToolStatus(tool.status);
    setNewToolLocation(tool.location);
    setNewToolNotes(tool.notes);
    setShowAddTool(true);
  }

  function handleUpdateTool() {
    if (!editToolId) return;
    InventoryService.updateTool(editToolId, {
      name: sanitizeText(newToolName),
      category: newToolCategory,
      quantity: Number(sanitizeNumeric(newToolQty)) || 1,
      status: newToolStatus,
      location: sanitizeText(newToolLocation),
      notes: sanitizeText(newToolNotes),
    });
    loadAll();
    setShowAddTool(false);
    setEditToolId(null);
    setNewToolName(""); setNewToolCategory("ferramentas_manuais"); setNewToolQty("");
    setNewToolStatus("disponivel"); setNewToolLocation(""); setNewToolNotes("");
  }

  function handleDeleteTool(id: string) {
    InventoryService.deleteTool(id);
    loadAll();
  }

  function handleAddPartToRepair() {
    if (!addPartRepairId || !selectedPartToAdd) return;
    const repair = repairs.find((r) => r.id === addPartRepairId);
    if (!repair) return;
    const updated = [...repair.partsUsed, selectedPartToAdd];
    InventoryService.updateRepair(addPartRepairId, { partsUsed: updated });
    loadAll();
    if (selectedRepair?.id === addPartRepairId) {
      setSelectedRepair({ ...selectedRepair, partsUsed: updated });
    }
    setShowAddPartToRepair(false);
    setSelectedPartToAdd("");
    setAddPartRepairId(null);
  }

  const stats = InventoryService.getStats();

  const filteredRepairs = repairFilter === "todos"
    ? repairs
    : repairs.filter((r) => r.status === repairFilter);

  const filteredParts = parts.filter((p) => {
    const catMatch = partFilter === "todos" || p.category === partFilter;
    const searchMatch = !partsSearch ||
      p.name.toLowerCase().includes(partsSearch.toLowerCase()) ||
      p.barcode.toLowerCase().includes(partsSearch.toLowerCase());
    return catMatch && searchMatch;
  });

  const filteredTools = tools.filter((t) => {
    const catMatch = toolCatFilter === "todas" || t.category === toolCatFilter;
    const statusMatch = toolStatusFilter === "todas" || t.status === toolStatusFilter;
    return catMatch && statusMatch;
  });

  const lowStockParts = parts.filter((p) => p.quantity < p.minQuantity);
  const toolsWithProblems = tools.filter((t) => t.status !== "disponivel");
  const missingParts = parts.filter((p) => p.quantity < p.minQuantity);
  const missingTools = tools.filter((t) => t.status === "faltando");

  function renderStatusBadge(status: string) {
    return (
      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{
        background: (STATUS_COLORS[status] || "#9CA3AF") + "18",
        color: STATUS_COLORS[status] || "#9CA3AF",
      }}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  }

  function renderToolStatusBadge(status: string) {
    return (
      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{
        background: (TOOL_STATUS_COLORS[status] || "#9CA3AF") + "18",
        color: TOOL_STATUS_COLORS[status] || "#9CA3AF",
      }}>
        {TOOL_STATUS_LABELS[status] || status}
      </span>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto" style={{ background: "var(--background)" }}>
      {dialogElement}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(217,119,6,0.1)" }}>
            <Wrench size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{greeting}, {userName}</h2>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Assistência Técnica Profissional</p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: ACCENT, color: "#fff" }}>
          {avatarInitials}
        </div>
      </div>

      {/* Tabs */}
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
                background: active ? "rgba(217,119,6,0.1)" : "transparent",
                color: active ? ACCENT : "var(--muted-foreground)",
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={14} />
              {tab.label}
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
              { label: "Consertos Ativos", value: String(stats.ongoing), icon: Cpu, color: ACCENT },
              { label: "Concluídos", value: String(stats.completed), icon: CheckCircle, color: "#22C55E" },
              { label: "Peças em Falta", value: String(stats.lowStock), icon: AlertTriangle, color: "#EF4444" },
              { label: "Ferr. com Problema", value: String(stats.toolsMissing), icon: Wrench, color: "#EAB308" },
            ].map((s) => (
              <div key={s.label} style={CARD_STYLE}>
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
              { label: "Registrar Conserto", icon: Plus, action: () => setShowAddRepair(true), color: ACCENT },
              { label: "Adicionar Peça", icon: Package, action: () => setShowAddPart(true), color: "#3B82F6" },
              { label: "Nova Ferramenta", icon: Plus, action: () => setShowAddTool(true), color: "#8B5CF6" },
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

          {/* Personal Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={12} style={{ color: ACCENT }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Hoje</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{personalStats["conserto_criado"] || 0}</span>
              <span className="text-[8px] ml-1" style={{ color: "var(--muted-foreground)" }}>consertos</span>
            </div>
            <div style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={12} style={{ color: "#22C55E" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Total ações</span>
              </div>
              <span className="text-lg font-bold" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{Object.values(personalStats).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-1">
                <Award size={12} style={{ color: ACCENT }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Mais usado</span>
              </div>
              <span className="text-xs font-medium truncate block" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>
                {Object.entries(personalStats).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, " ") || "—"}
              </span>
            </div>
          </div>

          {/* Consertos Recentes + Alertas */}
          <div className="grid grid-cols-2 gap-4">
            <div style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: ACCENT }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Consertos Recentes</span>
              </div>
              {repairs.length === 0 ? (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhum conserto registrado.</p>
              ) : (
                <div className="space-y-2">
                  {repairs.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="text-[10px] block truncate" style={{ color: "var(--foreground)" }}>{r.productName}</span>
                        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{r.problem}</span>
                      </div>
                      {renderStatusBadge(r.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={CARD_STYLE}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} style={{ color: "#EF4444" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Alertas de Estoque</span>
              </div>
              {lowStockParts.length === 0 && toolsWithProblems.length === 0 ? (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhum alerta no momento.</p>
              ) : (
                <div className="space-y-2">
                  {lowStockParts.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <Package size={10} style={{ color: "#EF4444" }} />
                      <span className="text-[9px] flex-1" style={{ color: "var(--foreground)" }}>{p.name}</span>
                      <span className="text-[8px] font-bold" style={{ color: "#EF4444" }}>{p.quantity}/{p.minQuantity}</span>
                    </div>
                  ))}
                  {toolsWithProblems.slice(0, 2).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                      <Wrench size={10} style={{ color: "#EAB308" }} />
                      <span className="text-[9px] flex-1" style={{ color: "var(--foreground)" }}>{t.name}</span>
                      {renderToolStatusBadge(t.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metas */}
          <div style={CARD_STYLE}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award size={14} style={{ color: ACCENT }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Minhas Metas</span>
              </div>
              <button
                onClick={() => {
                  const label = prompt("Nova meta (ex: Concluir 10 consertos esta semana):");
                  if (label) {
                    const target = Number(prompt("Meta numérica (ex: 10):") || "1");
                    updateGoals([...goals, { label, target, current: 0 }]);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[8px]"
                style={{ background: "rgba(217,119,6,0.1)", color: ACCENT }}
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
                          <span style={{ color: pct >= 100 ? "#22C55E" : ACCENT }}>{g.current}/{g.target}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "var(--secondary)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#22C55E" : `linear-gradient(90deg, ${ACCENT}, #22C55E)` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => incrementGoal(i)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[9px]"
                        style={{ background: "rgba(217,119,6,0.1)", color: ACCENT }}
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
          <div style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={14} style={{ color: "#8B5CF6" }} />
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
          CONSERTOS (Repairs)
         ════════════════════════════════════════════════════ */}
      {activeTab === "consertos" && (
        <div className="flex flex-1 gap-4">
          {/* Repair List */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {["todos", "aguardando", "diagnosticando", "em_conserto", "aguardando_peca", "concluido", "entregue"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRepairFilter(f)}
                    className="px-2.5 py-1.5 rounded-lg text-[9px] transition-all"
                    style={{
                      background: repairFilter === f ? ACCENT : "var(--secondary)",
                      color: repairFilter === f ? "#fff" : "var(--muted-foreground)",
                      fontWeight: repairFilter === f ? 500 : 300,
                    }}
                  >
                    {f === "todos" ? "Todos" : STATUS_LABELS[f] || f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddRepair(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
                style={{ background: ACCENT, color: "#fff" }}
              >
                <Plus size={11} /> Novo Conserto
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {filteredRepairs.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center p-8 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
                  <Cpu size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
                  <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>Nenhum conserto encontrado</p>
                </div>
              ) : (
                filteredRepairs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRepair(r)}
                    className="flex flex-col p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selectedRepair?.id === r.id ? "rgba(217,119,6,0.08)" : "var(--card)",
                      border: selectedRepair?.id === r.id ? `1px solid ${ACCENT}` : "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(217,119,6,0.1)" }}>
                        <Cpu size={14} style={{ color: ACCENT }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium block truncate" style={{ color: "var(--foreground)" }}>{r.productName}</span>
                        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{formatDate(r.entryDate)}</span>
                      </div>
                    </div>
                    <p className="text-[9px] mb-2 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{r.problem}</p>
                    <div className="flex items-center justify-between">
                      {renderStatusBadge(r.status)}
                      {r.estimatedPrice != null && (
                        <span className="text-[9px]" style={{ color: "#22C55E" }}>R$ {r.estimatedPrice.toFixed(2)}</span>
                      )}
                    </div>
                    {r.clientName && (
                      <span className="text-[8px] mt-1 flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                        <User size={8} /> {r.clientName}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Repair Detail Panel */}
          {selectedRepair && (
            <div className="w-72 flex flex-col gap-3" style={{ minWidth: "240px" }}>
              <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Detalhes</span>
                  <button onClick={() => setSelectedRepair(null)} style={{ color: "var(--muted-foreground)" }}><X size={14} /></button>
                </div>

                <div className="space-y-2 text-[10px] mb-4">
                  <div>
                    <span className="text-[8px] block" style={{ color: "var(--muted-foreground)" }}>Aparelho</span>
                    <span className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{selectedRepair.productName}</span>
                  </div>
                  <div>
                    <span className="text-[8px] block" style={{ color: "var(--muted-foreground)" }}>Problema</span>
                    <span style={{ color: "var(--foreground)" }}>{selectedRepair.problem}</span>
                  </div>
                  {selectedRepair.clientName && (
                    <div className="flex items-center gap-2">
                      <User size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ color: "var(--foreground)" }}>{selectedRepair.clientName}</span>
                    </div>
                  )}
                  {selectedRepair.clientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ color: "var(--foreground)" }}>{selectedRepair.clientPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar size={10} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ color: "var(--muted-foreground)" }}>{formatDate(selectedRepair.entryDate)}</span>
                  </div>
                  {selectedRepair.estimatedPrice != null && (
                    <div className="flex items-center gap-2">
                      <DollarSign size={10} style={{ color: "#22C55E" }} />
                      <span style={{ color: "#22C55E" }}>R$ {selectedRepair.estimatedPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--muted-foreground)" }}>Status</span>
                    {renderStatusBadge(selectedRepair.status)}
                  </div>
                  {selectedRepair.notes && (
                    <div>
                      <span className="text-[8px] block" style={{ color: "var(--muted-foreground)" }}>Observações</span>
                      <p style={{ color: "var(--foreground)" }}>{selectedRepair.notes}</p>
                    </div>
                  )}
                </div>

                {/* Status Update */}
                <div className="mb-3">
                  <span className="text-[9px] font-medium block mb-2" style={{ color: "var(--foreground)" }}>Atualizar Status</span>
                  <div className="flex flex-wrap gap-1">
                    {(["aguardando", "diagnosticando", "em_conserto", "aguardando_peca", "concluido", "entregue"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateRepairStatus(selectedRepair.id, s)}
                        className="text-[8px] px-2 py-1 rounded-lg"
                        style={{
                          background: selectedRepair.status === s ? (STATUS_COLORS[s] || "#9CA3AF") : "var(--secondary)",
                          color: selectedRepair.status === s ? "#fff" : "var(--muted-foreground)",
                        }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parts Used */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-medium" style={{ color: "var(--foreground)" }}>Peças Utilizadas</span>
                    <button
                      onClick={() => { setAddPartRepairId(selectedRepair.id); setSelectedPartToAdd(""); setShowAddPartToRepair(true); }}
                      className="text-[8px] px-2 py-1 rounded-lg"
                      style={{ background: "rgba(217,119,6,0.1)", color: ACCENT }}
                    >
                      <Plus size={8} className="inline mr-1" />Adicionar
                    </button>
                  </div>
                  {selectedRepair.partsUsed.length === 0 ? (
                    <p className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma peça vinculada.</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedRepair.partsUsed.map((pid) => {
                        const part = parts.find((p) => p.id === pid);
                        return (
                          <div key={pid} className="flex items-center gap-1.5 py-1 px-2 rounded-lg" style={{ background: "var(--secondary)" }}>
                            <Package size={8} style={{ color: ACCENT }} />
                            <span className="text-[8px]" style={{ color: "var(--foreground)" }}>{part?.name || pid}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => confirm({
                      title: "Excluir Conserto",
                      message: `Tem certeza que deseja excluir o conserto de "${selectedRepair.productName}"? Esta ação não pode ser desfeita.`,
                      confirmLabel: "Excluir",
                      variant: "danger",
                      onConfirm: () => handleDeleteRepair(selectedRepair.id),
                    })}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px]"
                    style={{ background: "rgba(192,0,24,0.1)", color: "#C00018" }}
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
          PEÇAS (Parts)
         ════════════════════════════════════════════════════ */}
      {activeTab === "pecas" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {["todos", "resistores", "capacitores", "transistores", "diodos", "cis", "conectores", "cabos", "fontes", "motores", "outros"].map((f) => (
                <button
                  key={f}
                  onClick={() => setPartFilter(f)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] transition-all"
                  style={{
                    background: partFilter === f ? ACCENT : "var(--secondary)",
                    color: partFilter === f ? "#fff" : "var(--muted-foreground)",
                    fontWeight: partFilter === f ? 500 : 300,
                  }}
                >
                  {f === "todos" ? "Todos" : PART_CATEGORIES[f] || f}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setEditPartId(null); setNewPartName(""); setNewPartBarcode(""); setNewPartCategory("outros"); setNewPartQty(""); setNewPartMin(""); setNewPartUnit("un"); setNewPartLocation(""); setNewPartSupplier(""); setNewPartPrice(""); setNewPartNotes(""); setShowAddPart(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
              style={{ background: ACCENT, color: "#fff" }}
            >
              <Plus size={11} /> Nova Peça
            </button>
          </div>

          {/* Search by name or barcode */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <ScanLine size={14} style={{ color: "var(--muted-foreground)" }} />
            <input
              value={partsSearch}
              onChange={(e) => setPartsSearch(e.target.value)}
              className="flex-1 bg-transparent text-[11px] outline-none"
              style={{ color: "var(--foreground)" }}
              placeholder="Buscar por nome ou código de barras..."
            />
            {partsSearch && (
              <button onClick={() => setPartsSearch("")} style={{ color: "var(--muted-foreground)" }}>
                <X size={12} />
              </button>
            )}
          </div>

          {filteredParts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
              <Package size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
              <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>{partsSearch ? "Nenhuma peça encontrada para esta busca" : "Nenhuma peça cadastrada"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredParts.map((p) => {
                const isLow = p.quantity < p.minQuantity;
                return (
                  <div key={p.id} className="p-3 rounded-xl" style={{ background: "var(--card)", border: isLow ? "1px solid #EF4444" : "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isLow ? "rgba(239,68,68,0.1)" : "rgba(217,119,6,0.1)" }}>
                          <Package size={14} style={{ color: isLow ? "#EF4444" : ACCENT }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-[10px] font-medium block truncate ${isLow ? "font-bold" : ""}`} style={{ color: isLow ? "#EF4444" : "var(--foreground)" }}>
                            {p.name}
                          </span>
                          <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{PART_CATEGORIES[p.category]}</span>
                          {p.barcode && <span className="text-[7px] block mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>Cód.: {p.barcode}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEditPart(p)} style={{ color: "var(--muted-foreground)" }} className="hover:opacity-70"><Edit size={10} /></button>
                        <button onClick={() => confirm({
                          title: "Excluir Peça",
                          message: `Tem certeza que deseja excluir "${p.name}"? Esta ação não pode ser desfeita.`,
                          confirmLabel: "Excluir",
                          variant: "danger",
                          onConfirm: () => handleDeletePart(p.id),
                        })} style={{ color: "#C00018" }} className="hover:opacity-70"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span style={{ color: "var(--muted-foreground)" }}>
                        Qtd: <strong style={{ color: isLow ? "#EF4444" : "var(--foreground)" }}>{p.quantity}</strong>
                        {" / Min: "}{p.minQuantity}
                      </span>
                      <span style={{ color: "var(--muted-foreground)" }}>{p.location || "—"}</span>
                    </div>
                    {p.supplier && <span className="text-[8px] block mt-1" style={{ color: "var(--muted-foreground)" }}>Fornecedor: {p.supplier}</span>}
                    {p.price != null && <span className="text-[8px] block" style={{ color: "#22C55E" }}>R$ {p.price.toFixed(2)}</span>}
                    {isLow && (
                      <span className="text-[8px] mt-1 flex items-center gap-1" style={{ color: "#EF4444" }}>
                        <AlertTriangle size={8} /> Estoque baixo!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          FERRAMENTAS (Tools)
         ════════════════════════════════════════════════════ */}
      {activeTab === "ferramentas" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {["todas", "ferramentas_manuais", "ferramentas_eletricas", "instrumentos_medicao", "equipamentos", "consumiveis"].map((f) => (
                <button
                  key={f}
                  onClick={() => setToolCatFilter(f)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] transition-all"
                  style={{
                    background: toolCatFilter === f ? ACCENT : "var(--secondary)",
                    color: toolCatFilter === f ? "#fff" : "var(--muted-foreground)",
                    fontWeight: toolCatFilter === f ? 500 : 300,
                  }}
                >
                  {f === "todas" ? "Todas" : TOOL_CATEGORIES[f] || f}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1.5">
                {["todas", "disponivel", "em_uso", "em_manutencao", "quebrado", "faltando"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setToolStatusFilter(f)}
                    className="px-2 py-1 rounded-lg text-[8px] transition-all"
                    style={{
                      background: toolStatusFilter === f ? (TOOL_STATUS_COLORS[f] || ACCENT) : "var(--secondary)",
                      color: toolStatusFilter === f ? "#fff" : "var(--muted-foreground)",
                    }}
                  >
                    {f === "todas" ? "Todas" : TOOL_STATUS_LABELS[f] || f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setEditToolId(null); setNewToolName(""); setNewToolCategory("ferramentas_manuais"); setNewToolQty(""); setNewToolStatus("disponivel"); setNewToolLocation(""); setNewToolNotes(""); setShowAddTool(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
                style={{ background: ACCENT, color: "#fff" }}
              >
                <Plus size={11} /> Nova Ferramenta
              </button>
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
              <Wrench size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3 }} />
              <p className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>Nenhuma ferramenta encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredTools.map((t) => {
                const hasProblem = t.status !== "disponivel";
                return (
                  <div key={t.id} className="p-3 rounded-xl" style={{ background: "var(--card)", border: hasProblem ? "1px solid #EF4444" : "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: hasProblem ? "rgba(239,68,68,0.1)" : "rgba(217,119,6,0.1)" }}>
                          <Wrench size={14} style={{ color: hasProblem ? "#EF4444" : ACCENT }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-medium block truncate" style={{ color: "var(--foreground)" }}>{t.name}</span>
                          <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{TOOL_CATEGORIES[t.category]}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEditTool(t)} style={{ color: "var(--muted-foreground)" }}><Edit size={10} /></button>
                        <button onClick={() => confirm({
                          title: "Excluir Ferramenta",
                          message: `Tem certeza que deseja excluir "${t.name}"? Esta ação não pode ser desfeita.`,
                          confirmLabel: "Excluir",
                          variant: "danger",
                          onConfirm: () => handleDeleteTool(t.id),
                        })} style={{ color: "#C00018" }}><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span style={{ color: "var(--muted-foreground)" }}>Qtd: {t.quantity}</span>
                      {renderToolStatusBadge(t.status)}
                    </div>
                    <span className="text-[8px] block mt-1" style={{ color: "var(--muted-foreground)" }}>Local: {t.location || "—"}</span>
                    {t.notes && <span className="text-[8px] block" style={{ color: "var(--muted-foreground)" }}>{t.notes}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          COMPRAS (Purchasing)
         ════════════════════════════════════════════════════ */}
      {activeTab === "compras" && (
        <div className="flex flex-col gap-4">
          {/* Peças em Falta */}
          <div style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} style={{ color: "#EF4444" }} />
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Peças em Falta</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
                {missingParts.length}
              </span>
            </div>
            {missingParts.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma peça em falta.</p>
            ) : (
              <div className="space-y-2">
                {missingParts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package size={12} style={{ color: "#EF4444" }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] block truncate" style={{ color: "var(--foreground)" }}>{p.name}</span>
                        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>
                          Falta: <strong>{p.minQuantity - p.quantity}</strong> {p.unit} · Atual: {p.quantity}/{p.minQuantity}
                          {p.supplier ? ` · Fornec: ${p.supplier}` : ""}
                          {p.price ? ` · R$ ${(p.price * (p.minQuantity - p.quantity)).toFixed(2)}` : ""}
                        </span>
                      </div>
                    </div>
                    {p.supplier && (
                      <span className="text-[8px] px-2 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", whiteSpace: "nowrap" }}>
                        {p.supplier}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ferramentas Faltando */}
          <div style={CARD_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={14} style={{ color: "#EAB308" }} />
              <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Ferramentas Faltando</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.1)", color: "#EAB308" }}>
                {missingTools.length}
              </span>
            </div>
            {missingTools.length === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma ferramenta faltando.</p>
            ) : (
              <div className="space-y-2">
                {missingTools.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <Wrench size={12} style={{ color: "#EAB308" }} />
                      <div>
                        <span className="text-[10px] block" style={{ color: "var(--foreground)" }}>{t.name}</span>
                        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{TOOL_CATEGORIES[t.category]} · {t.location || "—"}</span>
                      </div>
                    </div>
                    {renderToolStatusBadge(t.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Compras Gerada */}
          <div style={CARD_STYLE}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={14} style={{ color: ACCENT }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Lista de Compras</span>
              </div>
              <button
                onClick={() => {
                  const list = [
                    ...missingParts.map((p) => `- ${p.name}: ${p.minQuantity - p.quantity} ${p.unit}${p.supplier ? ` (Fornecedor: ${p.supplier})` : ""}${p.price ? ` ~R$${(p.price * (p.minQuantity - p.quantity)).toFixed(2)}` : ""}`),
                    ...missingTools.map((t) => `- ${t.name} (${TOOL_CATEGORIES[t.category]})`),
                  ].join("\n");
                  const blob = new Blob([`Lista de Compras - Assistência Técnica\n${new Date().toLocaleDateString("pt-BR")}\n\nPEÇAS EM FALTA:\n${missingParts.map((p) => `- ${p.name}: ${p.minQuantity - p.quantity} ${p.unit}${p.supplier ? ` (Fornecedor: ${p.supplier})` : ""}`).join("\n")}\n\nFERRAMENTAS FALTANDO:\n${missingTools.map((t) => `- ${t.name} (${TOOL_CATEGORIES[t.category]})`).join("\n")}`], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `lista-compras-${new Date().toISOString().slice(0, 10)}.txt`;
                  a.click(); URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
                style={{ background: ACCENT, color: "#fff" }}
              >
                <Download size={11} /> Exportar Lista
              </button>
            </div>

            {(missingParts.length + missingTools.length) === 0 ? (
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nada a comprar. Estoque completo!</p>
            ) : (
              <div className="space-y-2">
                {missingParts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] block" style={{ color: "var(--foreground)" }}>{p.name}</span>
                      <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>
                        Qtd necessária: <strong>{p.minQuantity - p.quantity}</strong> {p.unit}
                        {p.supplier ? ` · Fornecedor: ${p.supplier}` : ""}
                      </span>
                    </div>
                    {p.price != null && (
                      <span className="text-[9px]" style={{ color: "#22C55E" }}>
                        R$ {(p.price * (p.minQuantity - p.quantity)).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
                {missingTools.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <span className="text-[10px] block" style={{ color: "var(--foreground)" }}>{t.name}</span>
                      <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{TOOL_CATEGORIES[t.category]} · Substituir/Adquirir</span>
                    </div>
                    {renderToolStatusBadge(t.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAIS
         ════════════════════════════════════════════════════ */}

      {/* Add Repair Modal */}
      {showAddRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Novo Conserto</span>
              <button onClick={() => { setShowAddRepair(false); resetNewRepair(); }} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Produto *</label>
                <input value={newRepairProduct} onChange={(e) => setNewRepairProduct(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Ex: Fonte ATX" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Problema *</label>
                <textarea value={newRepairProblem} onChange={(e) => setNewRepairProblem(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px] resize-none" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "50px" }} placeholder="Descreva o problema..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Cliente</label>
                  <input value={newRepairClient} onChange={(e) => setNewRepairClient(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Nome" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Telefone</label>
                  <input value={newRepairPhone} onChange={(e) => setNewRepairPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Preço Estimado (R$)</label>
                <input type="number" value={newRepairPrice} onChange={(e) => setNewRepairPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="150.00" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Observações</label>
                <textarea value={newRepairNotes} onChange={(e) => setNewRepairNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px] resize-none" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "50px" }} placeholder="Observações adicionais..." />
              </div>
              <button
                onClick={handleAddRepair}
                disabled={!newRepairProduct.trim() || !newRepairProblem.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: (newRepairProduct.trim() && newRepairProblem.trim()) ? ACCENT : "var(--secondary)", color: (newRepairProduct.trim() && newRepairProblem.trim()) ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> Registrar Conserto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{editPartId ? "Editar Peça" : "Nova Peça"}</span>
              <button onClick={() => { setShowAddPart(false); setEditPartId(null); }} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome *</label>
                <input value={newPartName} onChange={(e) => setNewPartName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Ex: Resistor 10kΩ" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Código de Barras</label>
                <div className="flex gap-2">
                  <input value={newPartBarcode} onChange={(e) => setNewPartBarcode(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="789..." />
                  <button
                    type="button"
                    onClick={() => {
                      alert("Escaneamento via câmera será implementado em breve");
                      setNewPartBarcode(`MOCK${Date.now().toString().slice(-8)}`);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-[9px] whitespace-nowrap"
                    style={{ background: ACCENT, color: "#fff" }}
                  >
                    <ScanLine size={11} /> Escanear
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Categoria</label>
                <select value={newPartCategory} onChange={(e) => setNewPartCategory(e.target.value as Part["category"])} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  {Object.entries(PART_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Quantidade</label>
                  <input type="number" value={newPartQty} onChange={(e) => setNewPartQty(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="10" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Estoque Mín.</label>
                  <input type="number" value={newPartMin} onChange={(e) => setNewPartMin(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="5" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Unidade</label>
                  <select value={newPartUnit} onChange={(e) => setNewPartUnit(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    <option value="un">un</option>
                    <option value="metro">metro</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Localização</label>
                <input value={newPartLocation} onChange={(e) => setNewPartLocation(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Gaveta 3 / Estante A" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Fornecedor</label>
                  <input value={newPartSupplier} onChange={(e) => setNewPartSupplier(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Fornecedor" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Preço (R$)</label>
                  <input type="number" value={newPartPrice} onChange={(e) => setNewPartPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="2.50" />
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Observações</label>
                <textarea value={newPartNotes} onChange={(e) => setNewPartNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px] resize-none" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "50px" }} />
              </div>
              <button
                onClick={editPartId ? handleUpdatePart : handleAddPart}
                disabled={!newPartName.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: newPartName.trim() ? ACCENT : "var(--secondary)", color: newPartName.trim() ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> {editPartId ? "Atualizar Peça" : "Adicionar Peça"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Tool Modal */}
      {showAddTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{editToolId ? "Editar Ferramenta" : "Nova Ferramenta"}</span>
              <button onClick={() => { setShowAddTool(false); setEditToolId(null); }} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome *</label>
                <input value={newToolName} onChange={(e) => setNewToolName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Ex: Multímetro Digital" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Categoria</label>
                <select value={newToolCategory} onChange={(e) => setNewToolCategory(e.target.value as ToolType["category"])} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  {Object.entries(TOOL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Quantidade</label>
                  <input type="number" value={newToolQty} onChange={(e) => setNewToolQty(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="1" />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Status</label>
                  <select value={newToolStatus} onChange={(e) => setNewToolStatus(e.target.value as ToolType["status"])} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                    {Object.entries(TOOL_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Localização</label>
                <input value={newToolLocation} onChange={(e) => setNewToolLocation(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} placeholder="Caixa de ferramentas 1" />
              </div>
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Observações</label>
                <textarea value={newToolNotes} onChange={(e) => setNewToolNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px] resize-none" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "50px" }} />
              </div>
              <button
                onClick={editToolId ? handleUpdateTool : handleAddTool}
                disabled={!newToolName.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: newToolName.trim() ? ACCENT : "var(--secondary)", color: newToolName.trim() ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> {editToolId ? "Atualizar Ferramenta" : "Adicionar Ferramenta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part to Repair Modal */}
      {showAddPartToRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 p-6 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Adicionar Peça ao Conserto</span>
              <button onClick={() => { setShowAddPartToRepair(false); setSelectedPartToAdd(""); }} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Selecionar Peça</label>
                <select value={selectedPartToAdd} onChange={(e) => setSelectedPartToAdd(e.target.value)} className="w-full px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  <option value="">Selecione uma peça...</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.quantity} {p.unit})</option>
                  ))}
                </select>
              </div>
              {parts.length === 0 && (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhuma peça cadastrada. Adicione peças primeiro.</p>
              )}
              <button
                onClick={handleAddPartToRepair}
                disabled={!selectedPartToAdd}
                className="w-full py-2 rounded-lg text-[11px] font-medium"
                style={{ background: selectedPartToAdd ? ACCENT : "var(--secondary)", color: selectedPartToAdd ? "#fff" : "var(--muted-foreground)" }}
              >
                <Plus size={12} className="inline mr-1" /> Vincular Peça
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

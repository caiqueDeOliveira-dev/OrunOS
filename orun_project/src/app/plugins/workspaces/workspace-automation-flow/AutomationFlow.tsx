// plugins/workspaces/workspace-automation-flow/AutomationFlow.tsx
//
// Visual flow editor — draggable nodes, SVG connections, and execution log.
// Nodes represent triggers, conditions, and actions in an automation pipeline.

import { useState, useRef, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerAutomationActions, unregisterAutomationActions, setFlowStoreGetter, saveFlow, loadFlow, exportFlow, importFlow } from "./automation-actions";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { P, PremiumRoot, ScrollArea } from "../premium";

// ── Types ───────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  type: "trigger" | "condition" | "action";
  label: string;
  icon: string;
  x: number;
  y: number;
  status?: "idle" | "running" | "done" | "error";
}

interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface LogEntry {
  id: string;
  timestamp: string | number;
  nodeId?: string;
  message: string;
  status?: "success" | "error" | "info";
}

interface FlowState {
  [key: string]: unknown;
  nodes: FlowNode[];
  edges: FlowEdge[];
  logs: LogEntry[];
  isRunning: boolean;
}

const useFlowStore = createStore<FlowState>({
  nodes: [],
  edges: [],
  logs: [],
  isRunning: false,
});

// ── Node Colors ─────────────────────────────────────────────────────────

const NODE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "rgba(195,0,47,0.07)", border: P.primary, text: P.primary },
  condition: { bg: "rgba(255,181,71,0.07)", border: P.alert, text: P.alert },
  action: { bg: "rgba(77,163,255,0.07)", border: P.info, text: P.info },
};

// ── Flow Canvas ─────────────────────────────────────────────────────────

function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging(nodeId);
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - offset.x;
    const y = e.clientY - canvasRect.top - offset.y;
    useFlowStore.setState((s) => ({
      nodes: s.nodes.map((n) => n.id === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n),
    }));
  }, [dragging, offset]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  // Compute edge paths (SVG)
  const getNodeCenter = (id: string) => {
    const n = nodes.find((nd) => nd.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.x + 70, y: n.y + 28 };
  };

  return (
    <div
      ref={canvasRef}
      className="relative overflow-auto hs-scroll rounded-[18px] m-3"
      style={{
        background: P.panel,
        border: `1px solid ${P.border}`,
        height: "min(460px, 56vh)",
        cursor: dragging ? "grabbing" : "default",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.25)",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge) => {
          const from = getNodeCenter(edge.from);
          const to = getNodeCenter(edge.to);
          const midX = (from.x + to.x) / 2;
          const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
          return (
            <g key={edge.id}>
              <path d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
              {edge.label && (
                <text x={midX} y={(from.y + to.y) / 2 - 6} textAnchor="middle"
                  fill={P.sub} fontSize={8} fontFamily="'JetBrains Mono', monospace">
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const style = NODE_STYLES[node.type];
        return (
          <div
            key={node.id}
            className="absolute flex items-center gap-2 px-3 py-2 rounded-xl border cursor-grab select-none transition-shadow"
            style={{
              left: node.x,
              top: node.y,
              width: 140,
              background: style.bg,
              borderColor: style.border,
              boxShadow: dragging === node.id ? `0 4px 20px ${style.border}30` : "0 2px 8px rgba(0,0,0,0.3)",
            }}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
          >
            <span className="text-sm">{node.icon}</span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium truncate" style={{ color: style.text }}>{node.label}</p>
              <p className="text-[8px] uppercase tracking-wider" style={{ color: P.sub }}>{node.type}</p>
            </div>
            {node.status && node.status !== "idle" && (
              <span className="ml-auto text-[8px]">
                {node.status === "running" ? "⏳" : node.status === "done" ? "✅" : "❌"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Execution Log ───────────────────────────────────────────────────────

function ExecutionLog() {
  const logs = useFlowStore((s) => s.logs);
  const statusColors: Record<string, string> = {
    success: P.success,
    error: P.error,
    info: P.info,
  };

  return (
    <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto hs-scroll">
      <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ fontFamily: "'Sora', sans-serif", color: P.dim }}>
        Log de Execução
      </h3>
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2 py-1">
          <span className="text-[8px] mt-0.5 w-14 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: P.dim }}>
            {log.timestamp}
          </span>
          <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: statusColors[log.status ?? ""], boxShadow: `0 0 6px ${statusColors[log.status ?? ""]}` }} />
          <span className="text-[10px]" style={{ color: P.text }}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function AutomationFlow({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Automation");
  const isRunning = useFlowStore((s) => s.isRunning);
  const [showLog, setShowLog] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    saveFlow("default");
  }, []);

  const handleLoad = useCallback(() => {
    loadFlow("default");
  }, []);

  const handleExport = useCallback(() => {
    exportFlow("default");
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      importFlow(json);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  useEffect(() => {
    registerAutomationActions();
    setFlowStoreGetter(() => useFlowStore);
    return () => unregisterAutomationActions();
  }, []);

  const handleSimulate = useCallback(() => {
    useFlowStore.setState({ isRunning: true });
    // Simulate execution
    const nodes = useFlowStore.getState().nodes;
    let delay = 0;
    nodes.forEach((node, i) => {
      setTimeout(() => {
        useFlowStore.setState((s) => ({
          nodes: s.nodes.map((n) => n.id === node.id ? { ...n, status: "running" } : n),
        }));
        setTimeout(() => {
          useFlowStore.setState((s) => ({
            nodes: s.nodes.map((n) => n.id === node.id ? { ...n, status: "done" } : n),
            logs: [...s.logs, {
              id: `log-${Date.now()}-${i}`,
              timestamp: new Date().toLocaleTimeString("pt-BR"),
              nodeId: node.id,
              message: `${node.label} executado com sucesso`,
              status: "success" as const,
            }],
          }));
        }, 400);
      }, delay);
      delay += 600;
    });
    setTimeout(() => {
      useFlowStore.setState({ isRunning: false });
    }, delay + 500);
  }, []);

  const handleReset = useCallback(() => {
    useFlowStore.setState((s) => ({
      nodes: s.nodes.map((n) => ({ ...n, status: "idle" as const })),
      isRunning: false,
    }));
  }, []);

  return (
    <PremiumRoot>
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0" style={{ borderBottom: `1px solid ${P.border}`, background: P.panel }}>
        <span className="text-[10px]" style={{ color: P.sub }}>{greeting}, {userName}</span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "rgba(195,0,47,0.16)", color: P.primary }}>{avatarInitials}</div>
      </div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 flex-wrap" style={{ borderColor: P.border, background: P.bg }}>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: P.sub }}>
          Flow: Lead Nurturing
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSimulate}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-semibold hover:scale-[1.03] hover:brightness-110"
          style={{
            fontFamily: "'Sora', sans-serif",
            background: isRunning ? "rgba(0,210,106,0.15)" : P.primary,
            color: isRunning ? P.success : "#fff",
            opacity: isRunning ? 0.7 : 1,
            border: `1px solid ${isRunning ? "rgba(0,210,106,0.35)" : "transparent"}`,
          }}
        >
          {isRunning ? "Executando..." : "Simular"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Resetar
        </button>
        <button
          onClick={() => setShowLog((p) => !p)}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Log
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Salvar
        </button>
        <button
          onClick={handleLoad}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Carregar
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Exportar
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1.5 rounded-lg text-[9px] tracking-wider uppercase transition-all font-medium hover:scale-[1.03]"
          style={{ fontFamily: "'Sora', sans-serif", background: P.card, color: P.sub, border: `1px solid ${P.border}` }}
        >
          Importar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      <ScrollArea>
        {/* Canvas */}
        <FlowCanvas />

        {/* Log Panel */}
        {showLog && (
          <div className="border-t mx-3 rounded-b-[18px]" style={{ borderColor: P.border, background: P.panel, borderLeft: `1px solid ${P.border}`, borderRight: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}` }}>
            <ExecutionLog />
          </div>
        )}

        <div className="px-3 pb-3">
          <div style={{ padding: "12px", borderRadius: "18px", background: P.card, border: `1px solid ${P.border}` }}>
            <span className="text-xs font-medium mb-2 block" style={{ color: P.text }}>Notas Pessoais</span>
            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
              style={{ background: P.panel, color: P.text, border: `1px solid ${P.borderHi}`, minHeight: "60px" }}
              placeholder="Suas anotações de automação..."
            />
          </div>
        </div>
      </ScrollArea>
    </PremiumRoot>
  );
}

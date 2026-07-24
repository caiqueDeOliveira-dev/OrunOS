// plugins/workspaces/workspace-automation-flow/AutomationFlow.tsx
//
// Visual flow editor — draggable nodes, SVG connections, and execution log.
// Nodes represent triggers, conditions, and actions in an automation pipeline.

import { useState, useRef, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerAutomationActions, unregisterAutomationActions, saveFlow, loadFlow, exportFlow, importFlow } from "./automation-actions";

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
  timestamp: string;
  nodeId: string;
  message: string;
  status: "success" | "error" | "info";
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
  trigger: { bg: "rgba(192,0,24,0.06)", border: "#C00018", text: "#C00018" },
  condition: { bg: "rgba(245,158,11,0.06)", border: "#F59E0B", text: "#F59E0B" },
  action: { bg: "rgba(59,130,246,0.06)", border: "#3B82F6", text: "#3B82F6" },
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
      className="relative flex-1 overflow-auto"
      style={{ background: "var(--background, #0D1117)", cursor: dragging ? "grabbing" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
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
              <path d={d} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
              {edge.label && (
                <text x={midX} y={(from.y + to.y) / 2 - 6} textAnchor="middle"
                  fill="var(--muted-foreground)" fontSize={8} fontFamily="'JetBrains Mono', monospace">
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
            className="absolute flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab select-none transition-shadow"
            style={{
              left: node.x,
              top: node.y,
              width: 140,
              background: style.bg,
              borderColor: style.border,
              boxShadow: dragging === node.id ? `0 4px 20px ${style.border}30` : "none",
            }}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
          >
            <span className="text-sm">{node.icon}</span>
            <div className="min-w-0">
              <p className="text-[9px] font-medium truncate" style={{ color: style.text }}>{node.label}</p>
              <p className="text-[8px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{node.type}</p>
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
    success: "#22C55E",
    error: "#EF4444",
    info: "#3B82F6",
  };

  return (
    <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
      <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
        Log de Execução
      </h3>
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-2 py-1">
          <span className="text-[8px] mt-0.5 w-14 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
            {log.timestamp}
          </span>
          <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: statusColors[log.status] }} />
          <span className="text-[10px]" style={{ color: "var(--foreground)" }}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function AutomationFlow({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
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
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Flow: Lead Nurturing
        </span>
        <div className="flex-1" />
        <button
          onClick={handleSimulate}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{
            fontFamily: "'Sora', sans-serif",
            background: isRunning ? "rgba(34,197,94,0.15)" : "#C00018",
            color: isRunning ? "#22C55E" : "#fff",
            opacity: isRunning ? 0.7 : 1,
          }}
        >
          {isRunning ? "Executando..." : "Simular"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
        >
          Resetar
        </button>
        <button
          onClick={() => setShowLog((p) => !p)}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
        >
          Log
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
        >
          Salvar
        </button>
        <button
          onClick={handleLoad}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
        >
          Carregar
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
        >
          Exportar
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
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

      {/* Canvas */}
      <FlowCanvas />

      {/* Log Panel */}
      {showLog && (
        <div className="border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <ExecutionLog />
        </div>
      )}
    </div>
  );
}

// plugins/workspaces/workspace-orun-code/components/BottomPanel.tsx
import { useState } from "react";
import {
  Terminal,
  AlertCircle,
  ScrollText,
  FlaskConical,
  GitBranch,
  Scroll,
  Puzzle,
  ChevronDown,
  ChevronUp,
  Play,
  X,
} from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";
import type { BottomTabId } from "../types";

const TABS: Array<{ id: BottomTabId; label: string; icon: typeof Terminal }> = [
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "problems", label: "Problems", icon: AlertCircle },
  { id: "output", label: "Output", icon: ScrollText },
  { id: "tests", label: "Tests", icon: FlaskConical },
  { id: "git", label: "Git", icon: GitBranch },
  { id: "agentlog", label: "Agent Log", icon: Scroll },
  { id: "mcp", label: "MCP", icon: Puzzle },
];

export function BottomPanel() {
  const bottomOpen = useOrunCodeStore((s) => s.bottomOpen);
  const activeTab = useOrunCodeStore((s) => s.activeBottomTab);
  const terminalLines = useOrunCodeStore((s) => s.terminalLines);
  const tests = useOrunCodeStore((s) => s.tests);
  const mcpServers = useOrunCodeStore((s) => s.mcpServers);
  const setState = useOrunCodeStore.setState;
  const [cmd, setCmd] = useState("");

  if (!bottomOpen) {
    return (
      <button
        onClick={() => setState({ bottomOpen: true })}
        className="border-t py-0.5 px-3 text-[9px] uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/[0.02] shrink-0"
        style={{ borderColor: OC.border, color: OC.dim }}
      >
        <ChevronUp size={11} /> Mostrar painéis
      </button>
    );
  }

  const runCommand = () => {
    const text = cmd.trim();
    if (!text) return;
    const outLine = { id: `in-${Date.now()}`, type: "input" as const, text: `$ ${text}` };
    const resultLine = { id: `out-${Date.now()}`, type: "output" as const, text: `[simulado] comando não conectado ao shell real` };
    setState((s: any) => ({ terminalLines: [...s.terminalLines, outLine, resultLine] }));
    setCmd("");
  };

  return (
    <div className="border-t shrink-0 flex flex-col" style={{ borderColor: OC.border, background: OC.panel }}>
      <div className="flex items-center border-b" style={{ borderColor: OC.border }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setState({ activeBottomTab: t.id })}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[9px] transition-colors relative"
              style={{ color: isActive ? OC.text : OC.dim, borderBottom: isActive ? `2px solid ${OC.primary}` : "2px solid transparent" }}
            >
              <Icon size={11} />
              {t.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button onClick={() => setState({ bottomOpen: false })} className="p-1 mr-1 hover:bg-white/[0.05] rounded" style={{ color: OC.dim }}>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto oc-scroll px-3 py-2 font-mono text-[10px] leading-relaxed" style={{ color: OC.sub }}>
        {activeTab === "terminal" && (
          <div>
            {terminalLines.map((l) => (
              <div key={l.id} style={{ color: l.type === "error" ? OC.error : l.type === "input" ? OC.text : OC.sub, whiteSpace: "pre-wrap" }}>
                {l.text}
              </div>
            ))}
            <div className="flex items-center gap-1 mt-1">
              <span style={{ color: OC.primary }}>❯</span>
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runCommand(); }}
                className="flex-1 bg-transparent outline-none"
                style={{ color: OC.text }}
                autoFocus
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {activeTab === "problems" && (
          <div>
            <p style={{ color: OC.sub }}>Nenhum problema detectado. A análise resolve símbolos e dependências.</p>
          </div>
        )}

        {activeTab === "output" && (
          <div>
            <p>[Orun Code] IDE inicializada. Intelligence e Orun AI prontos.</p>
          </div>
        )}

        {activeTab === "tests" && (
          <div>
            {tests.length === 0 ? (
              <p style={{ color: OC.sub }}>Nenhum teste executado ainda. O Test Lab gera e roda testes automaticamente.</p>
            ) : (
              tests.map((t, i) => (
                <div key={i} style={{ color: t.status === "passed" ? OC.success : t.status === "failed" ? OC.error : OC.alert }}>
                  {t.status === "passed" ? "✓" : t.status === "failed" ? "✕" : "●"} {t.name}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "git" && (
          <div>
            <p style={{ color: OC.sub }}>Git Intelligence: histórico de commits, branches e análise de regressão.</p>
            <p className="mt-1" style={{ color: OC.info }}>main ● — sem commits analisados neste workspace ainda.</p>
          </div>
        )}

        {activeTab === "agentlog" && (
          <div>
            <p style={{ color: OC.sub }}>[Orun] Modo carregado: Plan. Aguardando tarefa.</p>
          </div>
        )}

        {activeTab === "mcp" && (
          <div>
            {mcpServers.map((m) => (
              <div key={m.id} className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.status === "connected" ? OC.success : OC.dim }} />
                <span style={{ color: OC.text }}>{m.name}</span>
                <span className="text-[9px]" style={{ color: OC.dim }}>{m.tools} ferramentas</span>
              </div>
            ))}
            <button className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded text-[10px]" style={{ background: OC.primary, color: "#fff" }}>
              <Play size={10} /> Conectar servidores MCP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

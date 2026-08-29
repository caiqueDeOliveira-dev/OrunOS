// plugins/workspaces/workspace-orun-code/components/AgentsPanel.tsx
import { Bot, Play, GitBranch, Bug, ShieldCheck, Zap, BookOpen, Search } from "lucide-react";
import { OC } from "../orun-code";

export interface CircleAgent {
  id: string;
  name: string;
  status: "idle" | "working" | "done" | "waiting";
  icon: typeof Bot;
}

const AGENTS: CircleAgent[] = [
  { id: "architect", name: "Architect", status: "done", icon: GitBranch },
  { id: "planner", name: "Planner", status: "done", icon: Search },
  { id: "coder", name: "Coder", status: "working", icon: Bot },
  { id: "debugger", name: "Debugger", status: "waiting", icon: Bug },
  { id: "tester", name: "Tester", status: "waiting", icon: Zap },
  { id: "reviewer", name: "Reviewer", status: "idle", icon: Search },
  { id: "security", name: "Security", status: "idle", icon: ShieldCheck },
  { id: "documenter", name: "Documenter", status: "idle", icon: BookOpen },
];

const STATUS_META: Record<CircleAgent["status"], { color: string; dot: string }> = {
  working: { color: OC.primary, dot: OC.primaryBright },
  done: { color: OC.success, dot: OC.success },
  waiting: { color: OC.alert, dot: OC.alert },
  idle: { color: OC.dim, dot: OC.dim },
};

export function AgentsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: OC.dim }}>Agent Center</span>
      </div>
      <div className="flex-1 overflow-y-auto oc-scroll py-2 px-3">
        <p className="text-[10px] mb-3" style={{ color: OC.sub, lineHeight: 1.6 }}>
          Equipe de engenharia do Orun Code. Cada especialista pode assumir uma etapa da cadeia de desenvolvimento.
        </p>

        <button
          className="w-full py-2 rounded-lg mb-3 flex items-center justify-center gap-2 text-[11px] font-semibold"
          style={{ background: OC.primary, color: "#fff" }}
        >
          <Play size={13} /> Executar Pipeline Completo
        </button>

        {AGENTS.map((a) => {
          const Icon = a.icon;
          const meta = STATUS_META[a.status];
          return (
            <div key={a.id} className="flex items-center gap-2.5 px-2.5 py-2 mb-1.5 rounded-lg" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${meta.dot}18`, color: meta.dot }}>
                <Icon size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: OC.text }}>{a.name}</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>{a.status}</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

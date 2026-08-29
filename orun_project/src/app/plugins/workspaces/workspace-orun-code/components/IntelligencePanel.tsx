// plugins/workspaces/workspace-orun-code/components/IntelligencePanel.tsx
import { BrainCircuit, Network, GitBranch, Database, Boxes } from "lucide-react";
import { OC } from "../orun-code";

const METRICS = [
  { label: "Architecture", value: 94, color: OC.success },
  { label: "Code Health", value: 88, color: OC.success },
  { label: "Security", value: 85, color: OC.success },
  { label: "Test Coverage", value: 72, color: OC.alert },
  { label: "Documentation", value: 58, color: OC.alert },
  { label: "Technical Debt", value: 21, color: OC.info },
];

export function IntelligencePanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: OC.dim }}>Intelligence</span>
      </div>
      <div className="flex-1 overflow-y-auto oc-scroll py-2 px-3">
        <p className="text-[10px] mb-3" style={{ color: OC.sub, lineHeight: 1.6 }}>
          O cérebro do Orun Code: AST, grafos de dependência/símbolos/chamadas, busca semântica e memória do projeto.
        </p>

        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BrainCircuit size={12} style={{ color: OC.primary }} />
            <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: OC.dim }}>Project Health</span>
          </div>
          {METRICS.map((m) => (
            <div key={m.label} className="mb-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px]" style={{ color: OC.sub }}>{m.label}</span>
                <span className="text-[9px] font-mono" style={{ color: OC.dim }}>{m.value}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: OC.card2 }}>
                <div className="h-1.5 rounded-full" style={{ width: `${m.value}%`, background: m.color, boxShadow: `0 0 6px ${m.color}66` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Network size={12} style={{ color: OC.info }} />
            <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: OC.dim }}>Architecture Map</span>
          </div>
          <div className="p-2 rounded-lg text-center text-[9px] font-mono space-y-1" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
            <div className="py-1 rounded" style={{ background: OC.primaryDark, color: "#fff" }}>App</div>
            <div className="text-[10px]" style={{ color: OC.dim }}>│</div>
            <div className="flex gap-1">
              {["Frontend", "Backend", "Services"].map((n) => (
                <div key={n} className="flex-1 py-1 rounded" style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.text }}>{n}</div>
              ))}
            </div>
            <div className="text-[10px]" style={{ color: OC.dim }}>│</div>
            <div className="py-1 rounded" style={{ background: OC.card2, border: `1px solid ${OC.borderHi}`, color: OC.sub }}>Database</div>
          </div>
        </div>

        {[
          { icon: GitBranch, label: "Call Graph", detail: "quem chama quem" },
          { icon: Database, label: "Dependency Graph", detail: "imports e pacotes" },
          { icon: Boxes, label: "Symbol Graph", detail: "classes, funções, tipos" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2.5 px-2.5 py-2 mb-1.5 rounded-lg" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
              <Icon size={15} style={{ color: OC.info }} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold" style={{ color: OC.text }}>{item.label}</p>
                <p className="text-[9px]" style={{ color: OC.dim }}>{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

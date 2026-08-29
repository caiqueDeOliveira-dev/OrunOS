// plugins/workspaces/workspace-orun-code/components/GitPanel.tsx
import { GitBranch, GitCommitHorizontal, Check, AlertTriangle, Boxes } from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";

const MOCK_CHANGES = [
  { path: "src/app/OrunCode.tsx", status: "M" as const },
  { path: "src/app/orun-code.ts", status: "A" as const },
  { path: "docs/roadmap.md", status: "A" as const },
];

export function GitPanel() {
  const gitStatus = useOrunCodeStore((s) => s.gitStatus);
  const branch = gitStatus?.branch || "main";
  const changes = gitStatus?.changes ?? MOCK_CHANGES.length;
  const files = gitStatus?.files ?? MOCK_CHANGES;

  const statusColor: Record<string, string> = { M: OC.alert, A: OC.success, D: OC.error, R: OC.info, "?": OC.dim };
  const statusText: Record<string, string> = { M: "MOD", A: "ADD", D: "DEL", R: "REN", "?": "UN" };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold" style={{ color: OC.dim }}>Source Control</span>
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono" style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}>
          <GitBranch size={10} /> {branch}
        </span>
      </div>

      <div className="px-3 py-3 border-b" style={{ borderColor: OC.border }}>
        <div className="flex items-center gap-2 mb-1.5">
          <GitCommitHorizontal size={13} style={{ color: OC.info }} />
          <span className="text-[11px] font-semibold" style={{ color: OC.text }}>Mudanças ({changes})</span>
        </div>
        <p className="text-[10px] mb-2" style={{ color: OC.dim }}>Git Intelligence analisa commits e histórico para entender o porquê das mudanças.</p>
        <div className="flex gap-1.5">
          <button className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1" style={{ background: OC.success, color: "#fff" }}>
            <Check size={11} /> Stage All
          </button>
          <button className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1" style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}>
            <Boxes size={11} /> Commit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto oc-scroll py-1">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.02] rounded-sm">
            <span className="w-8 text-center px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: `${statusColor[f.status]}22`, color: statusColor[f.status] }}>
              {statusText[f.status]}
            </span>
            <span className="text-[11px] font-mono truncate" style={{ color: OC.sub }}>{f.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

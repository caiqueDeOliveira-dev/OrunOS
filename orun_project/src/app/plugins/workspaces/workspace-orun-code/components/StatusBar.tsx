// plugins/workspaces/workspace-orun-code/components/StatusBar.tsx
import { useOrunCodeStore } from "../store";
import { OC, AI_MODE_META } from "../orun-code";
import { GitBranch, Files } from "lucide-react";

export function StatusBar() {
  const aiMode = useOrunCodeStore((s) => s.aiMode);
  const aiPanelOpen = useOrunCodeStore((s) => s.aiPanelOpen);
  const cursorLine = useOrunCodeStore((s) => s.cursorLine);
  const cursorCol = useOrunCodeStore((s) => s.cursorCol);
  const setState = useOrunCodeStore.setState;
  const modeMeta = AI_MODE_META[aiMode];

  const modeColor = modeMeta.color;

  return (
    <div className="flex items-center justify-between px-3 py-[3px] border-t text-[10px] shrink-0 select-none" style={{ borderColor: OC.borderHi, background: OC.card, color: OC.sub }}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setState({ aiPanelOpen: !aiPanelOpen })}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all"
          style={{
            background: aiPanelOpen ? `${modeColor}1A` : "transparent",
            color: aiPanelOpen ? modeColor : OC.sub,
            border: `1px solid ${aiPanelOpen ? `${modeColor}44` : "transparent"}`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: modeColor, boxShadow: `0 0 6px ${modeColor}` }} />
          {aiMode.toUpperCase()}
        </button>
        <span className="flex items-center gap-1">
          <GitBranch size={10} /> main
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setState({ sidebarVisible: !useOrunCodeStore.getState().sidebarVisible })} className="flex items-center gap-1 hover:text-white transition-colors">
          <Files size={10} /> {useOrunCodeStore.getState().sidebarVisible ? "Ocultar" : "Mostrar"} Sidebar
        </button>
        <span className="cursor-default">Ln {cursorLine}, Col {cursorCol}</span>
        <span className="cursor-default font-mono" style={{ color: OC.info }}>TS</span>
      </div>
    </div>
  );
}

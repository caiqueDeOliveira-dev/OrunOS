// plugins/workspaces/workspace-orun-code/components/ActivityBar.tsx
import {
  Files,
  Search,
  GitBranch,
  Github,
  BrainCircuit,
  Bot,
  Terminal,
  FlaskConical,
  ShieldCheck,
  Boxes,
  Puzzle,
  Settings,
} from "lucide-react";
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";

type Item = { id: string; icon: typeof Files; label: string };

const top: Item[] = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Buscar" },
  { id: "git", icon: GitBranch, label: "Source Control" },
  { id: "github", icon: Github, label: "GitHub Control Center" },
  { id: "intelligence", icon: BrainCircuit, label: "Intelligence" },
  { id: "agents", icon: Bot, label: "Agents" },
  { id: "testing", icon: FlaskConical, label: "Testing" },
  { id: "security", icon: ShieldCheck, label: "Security" },
  { id: "dependencies", icon: Boxes, label: "Dependencies" },
  { id: "mcp", icon: Puzzle, label: "MCP" },
];

const bottom: Item[] = [
  { id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar({ activeTab, onTabChange }: {
  activeTab: string; onTabChange: (tab: string) => void;
}) {
  const setState = useOrunCodeStore.setState;
  const aiPanelOpen = useOrunCodeStore((s) => s.aiPanelOpen);

  const handleClick = (id: string) => {
    if (id === "settings") {
      setState({ activeSidebarTab: "settings", sidebarVisible: true });
      return;
    }
    onTabChange(id);
  };

  const renderItem = (item: Item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleClick(item.id)}
        title={item.label}
        className="w-9 h-9 flex items-center justify-center rounded-md transition-all relative mb-0.5"
        style={{
          color: isActive ? OC.text : OC.dim,
          background: isActive ? "rgba(229,9,20,0.12)" : "transparent",
        }}
      >
        {isActive && <div className="absolute left-[-6px] w-0.5 h-5 rounded-full" style={{ background: OC.primary }} />}
        <Icon size={17} strokeWidth={1.6} />
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center py-2 w-11 border-r shrink-0" style={{ background: OC.panel, borderColor: OC.border }}>
      <div className="mb-1 flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-extrabold tracking-tight"
          style={{ background: "linear-gradient(135deg,#E50914,#8F050D)", color: "#fff", fontFamily: OC.mono }}
        >
          OC
        </div>
      </div>

      {top.map(renderItem)}

      <div className="flex-1" />

      <button
        onClick={() => setState({ aiPanelOpen: !aiPanelOpen })}
        title="Orun AI"
        className="w-9 h-9 flex items-center justify-center rounded-md transition-all relative mb-0.5"
        style={{
          color: aiPanelOpen ? OC.primaryBright : OC.sub,
          background: aiPanelOpen ? "rgba(229,9,20,0.12)" : "transparent",
        }}
      >
        <BrainCircuit size={17} strokeWidth={1.6} />
        {aiPanelOpen && <div className="absolute right-[-6px] w-0.5 h-5 rounded-full" style={{ background: OC.primary }} />}
      </button>

      <button
        onClick={() => setState({ bottomOpen: !useOrunCodeStore.getState().bottomOpen })}
        title="Terminal / Painéis inferiores"
        className="w-9 h-9 flex items-center justify-center rounded-md transition-all mb-0.5"
        style={{ color: useOrunCodeStore.getState().bottomOpen ? OC.text : OC.sub }}
      >
        <Terminal size={17} strokeWidth={1.6} />
      </button>

      {bottom.map(renderItem)}
    </div>
  );
}

import { Terminal, Files, Search, GitBranch, BugPlay } from "lucide-react";
import { useIDEStore } from "../developer-store";

export function ActivityBar({ activeTab, onTabChange, onToggleTerminal }: {
  activeTab: string; onTabChange: (tab: string) => void; onToggleTerminal: () => void;
}) {
  const showTerminal = useIDEStore((s) => s.showTerminal);
  const items = [
    { id: "explorer", icon: Files, label: "Explorer" },
    { id: "search", icon: Search, label: "Search" },
    { id: "git", icon: GitBranch, label: "Source Control" },
    { id: "debug", icon: BugPlay, label: "Run and Debug" },
  ];

  return (
    <div className="flex flex-col items-center py-2 gap-1 w-10 border-r shrink-0" style={{ background: "#141414", borderColor: "#252525" }}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={item.label}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all relative"
            style={{
              color: isActive ? "#FFFFFF" : "#A0A0A0",
              background: isActive ? "rgba(195,0,47,0.1)" : "transparent",
            }}
          >
            {isActive && (
              <div className="absolute left-[-8px] w-0.5 h-5 rounded-full" style={{ background: "#C3002F" }} />
            )}
            <Icon size={16} />
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        onClick={onToggleTerminal}
        title="Toggle Terminal"
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
        style={{
          color: showTerminal ? "#FFFFFF" : "#A0A0A0",
          background: showTerminal ? "rgba(195,0,47,0.1)" : "transparent",
        }}
      >
        <Terminal size={16} />
      </button>
    </div>
  );
}

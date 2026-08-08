import { useCallback, useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { useIDEStore } from "./developer-store";
import { registerDeveloperActions, unregisterDeveloperActions, setIDEStoreGetter } from "./developer-actions";
import { usePersonalization, useWorkspaceNotes, useWorkspaceGoals, useWorkspaceStats } from "../../../hooks/usePersonalization";
import { Terminal } from "lucide-react";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { P, PremiumRoot } from "../premium";
import { ActivityBar } from "./components/ActivityBar";
import { FileExplorer } from "./components/FileExplorer";
import { SearchPanel } from "./components/SearchPanel";
import { GitPanel } from "./components/GitPanel";
import { DebugPanel } from "./components/DebugPanel";
import { CodeEditor } from "./components/CodeEditor";
import { Minimap } from "./components/Minimap";
import { TerminalPanel } from "./components/TerminalPanel";
import { StatusBar } from "./components/StatusBar";

export function DeveloperIDE({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Developer");
  const { goals, updateGoals, incrementGoal } = useWorkspaceGoals("Developer");
  const { stats: personalStats, logAction } = useWorkspaceStats("Developer");
  const activeSidebarTab = useIDEStore((s) => s.activeSidebarTab);
  const sidebarVisible = useIDEStore((s) => s.sidebarVisible);
  const sidebarWidth = useIDEStore((s) => s.sidebarWidth);
  const showTerminal = useIDEStore((s) => s.showTerminal);
  const terminalHeight = useIDEStore((s) => s.terminalHeight);
  const showMinimap = useIDEStore((s) => s.showMinimap);

  useEffect(() => {
    setIDEStoreGetter(() => useIDEStore);
    registerDeveloperActions();
    (async () => {
      try {
        const existing = await (window as any).orun?.developer?.getWorkspace?.();
        if (!existing) {
          const appPath = await (window as any).orun?.settings?.get?.("appPath") || "";
          if (appPath) {
            await (window as any).orun?.developer?.setWorkspace?.(appPath);
          }
        }
      } catch {}
    })();
    const handleFileWritten = () => {
      setTimeout(() => window.dispatchEvent(new CustomEvent("developer:refresh-explorer")), 300);
    };
    window.addEventListener("developer:file-written", handleFileWritten);
    return () => {
      unregisterDeveloperActions();
      window.removeEventListener("developer:file-written", handleFileWritten);
    };
  }, []);

  const handleSidebarTabChange = useCallback((tab: string) => {
    if (tab === activeSidebarTab && sidebarVisible) {
      useIDEStore.setState({ sidebarVisible: false });
    } else {
      useIDEStore.setState({ activeSidebarTab: tab, sidebarVisible: true });
    }
  }, [activeSidebarTab, sidebarVisible]);

  const handleToggleTerminal = useCallback(() => {
    useIDEStore.setState((s) => ({ showTerminal: !s.showTerminal }));
  }, []);

  const renderSidebarContent = useCallback(() => {
    switch (activeSidebarTab) {
      case "explorer": return <FileExplorer />;
      case "search": return <SearchPanel />;
      case "git": return <GitPanel />;
      case "debug": return <DebugPanel />;
      default: return <FileExplorer />;
    }
  }, [activeSidebarTab]);

  return (
    <PremiumRoot>
      <div className="flex flex-1 min-h-0">
        <ActivityBar activeTab={activeSidebarTab} onTabChange={handleSidebarTabChange} onToggleTerminal={handleToggleTerminal} />

        {sidebarVisible && (
          <div className="border-r shrink-0 overflow-hidden flex flex-col ws-scrollbar" style={{ borderColor: P.border, background: P.card, width: sidebarWidth }}>
            {renderSidebarContent()}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 overflow-hidden" style={{ background: P.bg }}>
            <CodeEditor />
          </div>

          {showTerminal && (
            <div className="border-t shrink-0 flex flex-col" style={{ borderColor: P.border, height: terminalHeight }}>
              <div className="flex-1 min-h-0">
                <TerminalPanel />
              </div>
            </div>
          )}

          {!showTerminal && (
            <button
              onClick={handleToggleTerminal}
              className="border-t py-1 text-[9px] tracking-wider uppercase hover:bg-white/[0.02] transition-colors"
              style={{ borderColor: P.border, color: P.sub, fontFamily: "'Sora', sans-serif" }}
            >
              <Terminal size={10} className="inline mr-1" /> Show Terminal
            </button>
          )}
        </div>

        {showMinimap && <Minimap />}
      </div>

      <StatusBar />
      <AIFloatingPrompt onSendMessage={onSendMessage} />
    </PremiumRoot>
  );
}

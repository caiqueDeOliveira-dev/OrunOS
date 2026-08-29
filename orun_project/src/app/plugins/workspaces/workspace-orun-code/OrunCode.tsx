// plugins/workspaces/workspace-orun-code/OrunCode.tsx
import { useCallback, useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { useOrunCodeStore } from "./store";
import { registerOrunCodeActions, unregisterOrunCodeActions, setOCStoreGetter } from "./actions";
import { OCRoot } from "./orun-code";
import { ActivityBar } from "./components/ActivityBar";
import { FileExplorer } from "./components/FileExplorer";
import { SearchPanel } from "./components/SearchPanel";
import { GitPanel } from "./components/GitPanel";
import { IntelligencePanel } from "./components/IntelligencePanel";
import { AgentsPanel } from "./components/AgentsPanel";
import { CodeEditor } from "./components/CodeEditor";
import { OrunAIPanel } from "./components/OrunAIPanel";
import { BottomPanel } from "./components/BottomPanel";
import { Minimap } from "./components/Minimap";
import { StatusBar } from "./components/StatusBar";

export function OrunCode(_props: WorkspaceProps) {
  const activeSidebarTab = useOrunCodeStore((s) => s.activeSidebarTab);
  const sidebarVisible = useOrunCodeStore((s) => s.sidebarVisible);
  const sidebarWidth = useOrunCodeStore((s) => s.sidebarWidth);
  const aiPanelOpen = useOrunCodeStore((s) => s.aiPanelOpen);
  const showMinimap = useOrunCodeStore((s) => s.showMinimap);

  useEffect(() => {
    setOCStoreGetter(() => useOrunCodeStore);
    registerOrunCodeActions();
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
    const fire = () => {
      setTimeout(() => window.dispatchEvent(new CustomEvent("oruncode:refresh-explorer")), 300);
    };
    window.addEventListener("oruncode:file-written", fire);
    return () => {
      unregisterOrunCodeActions();
      window.removeEventListener("oruncode:file-written", fire);
    };
  }, []);

  const handleSidebarTabChange = useCallback((tab: string) => {
    if (tab === activeSidebarTab && sidebarVisible) {
      useOrunCodeStore.setState({ sidebarVisible: false });
    } else {
      useOrunCodeStore.setState({ activeSidebarTab: tab, sidebarVisible: true });
    }
  }, [activeSidebarTab, sidebarVisible]);

  const renderSidebar = useCallback(() => {
    switch (activeSidebarTab) {
      case "explorer": return <FileExplorer />;
      case "search": return <SearchPanel />;
      case "git": return <GitPanel />;
      case "intelligence": return <IntelligencePanel />;
      case "agents": return <AgentsPanel />;
      default: return <FileExplorer />;
    }
  }, [activeSidebarTab]);

  return (
    <OCRoot>
      <div className="flex flex-1 min-h-0">
        <ActivityBar activeTab={activeSidebarTab} onTabChange={handleSidebarTabChange} />

        {sidebarVisible && (
          <div
            className="border-r shrink-0 overflow-hidden flex flex-col oc-scroll"
            style={{ borderColor: "var(--oc-border)", background: "var(--oc-panel)", width: sidebarWidth }}
          >
            {renderSidebar()}
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeEditor />
            </div>
            {showMinimap && <Minimap />}
          </div>
          <BottomPanel />
        </div>

        {aiPanelOpen && (
          <div
            className="border-l shrink-0 overflow-hidden flex flex-col oc-scroll"
            style={{ borderColor: "var(--oc-border)", background: "var(--oc-panel)", width: 300 }}
          >
            <OrunAIPanel />
          </div>
        )}
      </div>

      <StatusBar />
    </OCRoot>
  );
}

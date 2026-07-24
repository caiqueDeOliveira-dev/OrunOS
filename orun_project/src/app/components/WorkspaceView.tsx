import { Suspense, useCallback, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getPlugin, getPluginActiveTab, setPluginActiveTab } from "../plugins/PluginRegistry";
import { PluginErrorBoundary } from "../plugins/PluginErrorBoundary";
import type { HamptonState, Message } from "../types";
import { ChatInput } from "./ChatInput";

interface WorkspaceViewProps {
  workspacePluginId: string;
  hamptonState: HamptonState;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onMicClick: () => void;
  voiceVolume: number;
  partialTranscript: string;
  onClose: () => void;
}

export function WorkspaceView({
  workspacePluginId,
  hamptonState,
  messages,
  onSendMessage,
  onMicClick,
  voiceVolume,
  partialTranscript,
  onClose,
}: WorkspaceViewProps) {
  const { t } = useTranslation();
  const plugin = getPlugin(workspacePluginId);
  const [workspaceTab, setWorkspaceTab] = useState<string | null>(() => workspacePluginId ? getPluginActiveTab(workspacePluginId) : null);

  const handleTabChange = useCallback((tabId: string) => {
    setWorkspaceTab(tabId);
    setPluginActiveTab(workspacePluginId, tabId);
  }, [workspacePluginId]);

  if (!plugin) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Workspace Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
            <span className="text-[9px]" style={{ color: "#C00018" }}>{plugin.name.charAt(0)}</span>
          </div>
          <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            {plugin.name}
          </span>
          {plugin.tabs && plugin.tabs.length > 1 && (
            <div className="flex items-center gap-1 ml-3">
              {plugin.tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase transition-all"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: workspaceTab === tab.id ? 500 : 300,
                    color: workspaceTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                    background: workspaceTab === tab.id ? "rgba(192,0,24,0.08)" : "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md transition-all hover:bg-[rgba(255,255,255,0.05)]"
          style={{ color: "var(--muted-foreground)" }}
          title={t("close")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Workspace fills all space */}
      <div className="flex-1 overflow-hidden">
        <PluginErrorBoundary pluginId={workspacePluginId}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full" style={{ background: "var(--background)" }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(192,0,24,0.3)", borderTopColor: "#C00018" }} />
                <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                  {t("loadingWorkspace")}
                </span>
              </div>
            </div>
          }>
            {(() => {
              const WC = plugin.components.workspace;
              return <WC plugin={plugin} activeTab={workspaceTab} onTabChange={handleTabChange} onSendMessage={onSendMessage} lastToolResult={null} />;
            })()}
          </Suspense>
        </PluginErrorBoundary>
      </div>

      {/* Minimal chat bar at bottom */}
      <div className="shrink-0 border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        {messages.length > 0 && (
          <div className="max-h-[120px] overflow-y-auto px-4 py-2 space-y-2 scrollbar-hide">
            {messages.slice(-4).map((msg) => (
              <div key={msg.id} className="flex gap-2 items-start">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: msg.role === "hampton" ? "#C00018" : "var(--muted-foreground)" }} />
                <p className="text-[10px] leading-relaxed" style={{ color: msg.role === "hampton" ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {msg.content.length > 120 ? msg.content.slice(0, 120) + "..." : msg.content}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#C00018", boxShadow: "0 0 6px #C00018", animation: hamptonState !== "idle" ? "orunStatePulse 1s ease-in-out infinite" : "none" }} />
          <ChatInput
            onSend={onSendMessage}
            onMicClick={onMicClick}
            listening={hamptonState === "listening"}
            volume={voiceVolume}
            partialTranscript={partialTranscript}
          />
        </div>
      </div>
    </div>
  );
}

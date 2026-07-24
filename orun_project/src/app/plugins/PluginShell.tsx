// plugins/PluginShell.tsx
//
// The shell layout for workspace plugins.
// Renders a split-panel: workspace (left) + chat (right).
// Uses react-resizable-panels for adjustable split.
//
// This is the main container that integrates the plugin workspace
// with the existing chat system, keeping the chat always accessible.

import { useState, useCallback, useRef, useEffect, Suspense, type ReactNode } from "react";
import { motion } from "motion/react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { getPlugin, getPluginActiveTab, setPluginActiveTab } from "./PluginRegistry";
import { PluginErrorBoundary } from "./PluginErrorBoundary";
import { createPluginLogger } from "./lib/logger";
import { useWorkspaceShortcuts } from "./lib/keyboard-shortcuts";
import type { WorkspacePlugin } from "./types";

// ── Tab Bar ─────────────────────────────────────────────────────────────

function TabBar({ plugin, activeTab, onTabChange }: { plugin: WorkspacePlugin; activeTab: string | null; onTabChange: (id: string) => void }) {
  if (!plugin.tabs || plugin.tabs.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      {plugin.tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: activeTab === tab.id ? 500 : 300,
            color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
            background: activeTab === tab.id ? "rgba(192,0,24,0.08)" : "transparent",
          }}
        >
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Workspace Header ────────────────────────────────────────────────────

function WorkspaceHeader({ plugin, onClose }: { plugin: WorkspacePlugin; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
          <span className="text-[9px]" style={{ color: "#C00018" }}>{plugin.name.charAt(0)}</span>
        </div>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {plugin.name}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", fontFamily: "'JetBrains Mono', monospace" }}>
          v{plugin.version}
        </span>
      </div>
      <button
        onClick={onClose}
        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-colors"
        style={{ color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        ✕
      </button>
    </div>
  );
}

// ── Main Shell ──────────────────────────────────────────────────────────

interface PluginShellProps {
  /** Agent ID */
  agentId: string;
  /** Chat messages (passed through to workspace) */
  children: ReactNode;
  /** Send message to chat */
  onSendMessage: (message: string) => void;
  /** Last tool result from chat */
  lastToolResult: { toolName: string; result: unknown } | null;
  /** Close the workspace */
  onClose: () => void;
}

export function PluginShell({ agentId, children, onSendMessage, lastToolResult, onClose }: PluginShellProps) {
  const log = createPluginLogger(agentId);
  const plugin = getPlugin(agentId);

  const [activeTab, setActiveTab] = useState<string | null>(() => getPluginActiveTab(agentId));

  // ── Keyboard Shortcuts ───────────────────────────────────────────────
  useWorkspaceShortcuts([
    { key: "w", ctrl: true, shift: true, handler: () => onClose() },
  ]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      setPluginActiveTab(agentId, tabId);
      log.info("shell:tab-change", { tabId });
    },
    [agentId, log]
  );

  if (!plugin) return null;

  const WorkspaceComponent = plugin.components.workspace;

  return (
    <PluginErrorBoundary pluginId={agentId}>
      <motion.div
        className="flex-1 flex overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <PanelGroup direction="horizontal" className="h-full">
          {/* ── Workspace Panel (Left) ─────────────────────── */}
          <Panel defaultSize={60} minSize={30} maxSize={80}>
            <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
              {/* Workspace Header with close button */}
              <WorkspaceHeader plugin={plugin} onClose={onClose} />

              {/* Tab Bar */}
              <TabBar plugin={plugin} activeTab={activeTab} onTabChange={handleTabChange} />

              {/* Workspace Content */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full" style={{ background: "var(--background)" }}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(192,0,24,0.3)", borderTopColor: "#C00018" }} />
                      <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                        Carregando workspace...
                      </span>
                    </div>
                  </div>
                }>
                  <WorkspaceComponent
                    plugin={plugin}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onSendMessage={onSendMessage}
                    lastToolResult={lastToolResult}
                  />
                </Suspense>
              </div>
            </div>
          </Panel>

          {/* ── Resize Handle ──────────────────────────────── */}
          <PanelResizeHandle className="relative group" style={{ width: 6, background: "var(--border)", cursor: "col-resize" }}>
            <div
              className="absolute inset-y-0 left-0 right-0 group-hover:bg-[rgba(192,0,24,0.3)] group-active:bg-[rgba(192,0,24,0.5)] transition-colors"
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(192,0,24,0.5)" }}
            />
          </PanelResizeHandle>

          {/* ── Chat Panel (Right) ─────────────────────────── */}
          <Panel defaultSize={40} minSize={25} maxSize={70}>
            <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
              {children}
            </div>
          </Panel>
        </PanelGroup>
      </motion.div>
    </PluginErrorBoundary>
  );
}

// plugins/PluginHost.tsx
//
// Host component that loads and renders workspace plugins.
// Handles lazy loading, compatibility checking, error boundaries,
// and communicates with the chat system.

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PluginErrorBoundary } from "./PluginErrorBoundary";
import { getPlugin, isPluginEnabled, getPluginActiveTab, setPluginActiveTab } from "./PluginRegistry";
import { checkCompatibility, type CompatibilityResult } from "./lib/compatibility";
import { createPluginLogger } from "./lib/logger";

interface PluginHostProps {
  /** Agent ID (e.g., "Developer", "Creator") */
  agentId: string;
  /** Send message to chat */
  onSendMessage: (message: string) => void;
  /** Last tool result from chat (for workspace to react to) */
  lastToolResult: { toolName: string; result: unknown } | null;
  /** Whether the plugin workspace is visible */
  visible: boolean;
}

function PluginLoadingSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: "rgba(192,0,24,0.15)" }} />
        <span className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Carregando workspace...
        </span>
      </div>
    </div>
  );
}

function CompatibilityWarning({ result, onForceLoad }: { result: CompatibilityResult; onForceLoad: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: "var(--background)" }}>
      <div className="text-center max-w-sm space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.1)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Recursos insuficientes
          </h3>
          <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)" }}>
            Seu dispositivo pode não ter recursos suficientes para este workspace.
          </p>
        </div>

        <div className="space-y-1.5 text-left">
          {[...result.errors, ...result.warnings].map((msg, i) => (
            <div
              key={i}
              className="text-[10px] px-3 py-2 rounded-lg"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: result.errors.includes(msg) ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.08)",
                border: `1px solid ${result.errors.includes(msg) ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
                color: "var(--muted-foreground)",
              }}
            >
              {msg}
            </div>
          ))}
        </div>

        <button
          onClick={onForceLoad}
          className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            fontFamily: "'Sora', sans-serif",
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          Carregar mesmo assim
        </button>
      </div>
    </div>
  );
}

export function PluginHost({ agentId, onSendMessage, lastToolResult, visible }: PluginHostProps) {
  const log = useMemo(() => createPluginLogger(agentId), [agentId]);
  const plugin = getPlugin(agentId);

  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [forceLoad, setForceLoad] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(() => getPluginActiveTab(agentId));

  // Check compatibility on mount
  useEffect(() => {
    if (!plugin) return;
    const result = checkCompatibility(plugin.requirements);
    setCompatibility(result);
    log.info("host:compatibility-check", {
      ok: result.ok,
      errors: result.errors.length,
      warnings: result.warnings.length,
    });
  }, [plugin, log]);

  // Persist tab changes
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      setPluginActiveTab(agentId, tabId);
      log.info("host:tab-change", { tabId });
    },
    [agentId, log]
  );

  // Lifecycle: mount/unmount
  useEffect(() => {
    if (!plugin || !visible) return;
    plugin.lifecycle?.onMount?.();
    log.info("host:mount");
    return () => {
      plugin.lifecycle?.onUnmount?.();
      log.info("host:unmount");
    };
  }, [plugin, visible, log]);

  // Forward tool results to plugin
  useEffect(() => {
    if (!plugin || !lastToolResult || !visible) return;
    plugin.lifecycle?.onToolResult?.(lastToolResult.toolName, lastToolResult.result);
  }, [plugin, lastToolResult, visible, log]);

  // Not registered or not enabled
  if (!plugin || !isPluginEnabled(agentId)) {
    return null;
  }

  // Compatibility check failed and user hasn't forced load
  if (compatibility && !compatibility.ok && !forceLoad) {
    return <CompatibilityWarning result={compatibility} onForceLoad={() => setForceLoad(true)} />;
  }

  const WorkspaceComponent = plugin.components.workspace;
  const ToolbarComponent = plugin.components.toolbar;

  return (
    <PluginErrorBoundary pluginId={agentId}>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={`workspace-${agentId}`}
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ background: "var(--background)" }}
          >
            {/* Optional Toolbar */}
            {ToolbarComponent && (
              <Suspense fallback={null}>
                <ToolbarComponent plugin={plugin} activeTab={activeTab} onTabChange={handleTabChange} />
              </Suspense>
            )}

            {/* Main Workspace */}
            <Suspense fallback={<PluginLoadingSkeleton />}>
              <WorkspaceComponent plugin={plugin} activeTab={activeTab} onTabChange={handleTabChange} onSendMessage={onSendMessage} lastToolResult={lastToolResult} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </PluginErrorBoundary>
  );
}

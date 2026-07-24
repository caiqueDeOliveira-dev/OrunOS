// plugins/PluginSettings.tsx
//
// Settings panel for managing workspace plugins — enable/disable, check compatibility.

import { useState, useCallback } from "react";
import { getAllPlugins, isPluginEnabled, setPluginEnabled, getPluginCompatibility } from "./PluginRegistry";
import type { WorkspacePlugin } from "./types";

interface Props {
  onClose: () => void;
}

function CompatibilityBadge({ plugin }: { plugin: WorkspacePlugin }) {
  const result = getPluginCompatibility(plugin.id);
  if (!result) return null;

  if (result.ok) {
    return (
      <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{
        background: "rgba(34,197,94,0.1)",
        color: "#22C55E",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        Compatível
      </span>
    );
  }

  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{
      background: "rgba(239,68,68,0.1)",
      color: "#EF4444",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {result.warnings[0] || "Incompatível"}
    </span>
  );
}

export function PluginSettings({ onClose }: Props) {
  const plugins = getAllPlugins();
  const [pluginStates, setPluginStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {};
    plugins.forEach((p) => { states[p.id] = isPluginEnabled(p.id); });
    return states;
  });

  const togglePlugin = useCallback((pluginId: string) => {
    const newValue = !pluginStates[pluginId];
    setPluginStates((prev) => ({ ...prev, [pluginId]: newValue }));
    setPluginEnabled(pluginId, newValue);
  }, [pluginStates]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-[440px] max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              Configurações de Plugins
            </h2>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Gerencie os workspaces dos agentes
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px]"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}
          >
            ✕
          </button>
        </div>

        {/* Plugin List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
          {plugins.map((plugin) => {
            const enabled = pluginStates[plugin.id] ?? true;
            return (
              <div
                key={plugin.id}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: enabled ? "rgba(192,0,24,0.15)" : "var(--border)",
                  background: enabled ? "rgba(192,0,24,0.03)" : "transparent",
                }}
              >
                {/* Toggle */}
                <button
                  onClick={() => togglePlugin(plugin.id)}
                  className="relative w-9 h-5 rounded-full transition-all shrink-0"
                  style={{ background: enabled ? "#C00018" : "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                    style={{
                      background: "#fff",
                      left: enabled ? 18 : 2,
                    }}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{plugin.name}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--muted-foreground)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      v{plugin.version}
                    </span>
                    <CompatibilityBadge plugin={plugin} />
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {plugin.description}
                  </p>
                  <p className="text-[8px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                    RAM estimada: {plugin.requirements.estimatedRAMMB}MB · Mínimo: {plugin.requirements.minRamMB}MB
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
            {plugins.length} plugins · {Object.values(pluginStates).filter(Boolean).length} ativos
          </p>
        </div>
      </div>
    </div>
  );
}

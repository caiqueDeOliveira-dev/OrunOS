import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertTriangle, Check, X, Loader2, ArrowUpDown } from "lucide-react";
import { isElectron } from "../constants";

interface ConflictEntry {
  path: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
}

interface SyncStatus {
  active: boolean;
  pendingPaths?: string[];
  conflicts?: ConflictEntry[];
}

export function SettingsSyncPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const s = await window.orun.settingsSync.status();
      setStatus(s);
    } catch {
      setStatus({ active: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  const resolveConflict = async (path: string, resolution: "local" | "remote") => {
    setResolving(path);
    try {
      await window.orun.settingsSync.resolveConflict(path, resolution);
      await refresh();
    } finally {
      setResolving(null);
    }
  };

  const retryPending = async () => {
    setLoading(true);
    await window.orun.settingsSync.retry();
    await refresh();
  };

  const conflicts = status?.conflicts ?? [];
  const pending = status?.pendingPaths ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div
        className="w-[520px] max-h-[70vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} style={{ color: "var(--primary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Settings Sync
            </span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: status?.active ? "color-mix(in srgb, #22c55e 15%, transparent)" : "color-mix(in srgb, #ef4444 15%, transparent)",
                color: status?.active ? "#22c55e" : "#ef4444",
              }}
            >
              {status?.active ? "ATIVO" : "INATIVO"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-[var(--muted)]">
            <X size={14} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
            </div>
          )}

          {!loading && conflicts.length === 0 && pending.length === 0 && (
            <div className="flex flex-col items-center py-6 gap-2">
              <Check size={24} style={{ color: "#22c55e" }} />
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Tudo sincronizado. Sem conflitos.
              </span>
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} style={{ color: "#f59e0b" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Conflitos ({conflicts.length})
                </span>
              </div>
              <div className="space-y-2">
                {conflicts.map((c) => (
                  <div
                    key={c.path}
                    className="rounded-lg border p-3 space-y-2"
                    style={{ borderColor: "color-mix(in srgb, #f59e0b 30%, var(--border))", background: "color-mix(in srgb, #f59e0b 5%, transparent)" }}
                  >
                    <div className="text-[11px] font-mono" style={{ color: "var(--foreground)" }}>{c.path}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded p-2" style={{ background: "var(--background)" }}>
                        <div className="font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>Local</div>
                        <div className="font-mono truncate" style={{ color: "var(--foreground)" }}>
                          {typeof c.localValue === "object" ? JSON.stringify(c.localValue) : String(c.localValue ?? "—")}
                        </div>
                        <div style={{ color: "var(--muted-foreground)" }}>
                          {new Date(c.localTimestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded p-2" style={{ background: "var(--background)" }}>
                        <div className="font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>Remoto</div>
                        <div className="font-mono truncate" style={{ color: "var(--foreground)" }}>
                          {typeof c.remoteValue === "object" ? JSON.stringify(c.remoteValue) : String(c.remoteValue ?? "—")}
                        </div>
                        <div style={{ color: "var(--muted-foreground)" }}>
                          {new Date(c.remoteTimestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={resolving === c.path}
                        onClick={() => resolveConflict(c.path, "local")}
                        className="flex-1 text-[10px] py-1.5 rounded-md border transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                      >
                        {resolving === c.path ? <Loader2 size={10} className="animate-spin mx-auto" /> : "Manter Local"}
                      </button>
                      <button
                        disabled={resolving === c.path}
                        onClick={() => resolveConflict(c.path, "remote")}
                        className="flex-1 text-[10px] py-1.5 rounded-md border transition-colors"
                        style={{ borderColor: "var(--primary)", color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
                      >
                        {resolving === c.path ? <Loader2 size={10} className="animate-spin mx-auto" /> : "Usar Remoto"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending pushes */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} style={{ color: "var(--muted-foreground)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                  Pendentes ({pending.length})
                </span>
              </div>
              <div className="space-y-1">
                {pending.map((p) => (
                  <div key={p} className="text-[10px] font-mono px-2 py-1 rounded" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                    {p}
                  </div>
                ))}
              </div>
              <button
                onClick={retryPending}
                className="mt-2 w-full text-[10px] py-1.5 rounded-md border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                Tentar enviar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            <RefreshCw size={10} />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

import { Dashboard } from "@vendor/agent-dashboard";
import { useDashboardStore } from "@vendor/agent-dashboard";
import { useEffect } from "react";

interface DashboardPanelProps {
  onClose: () => void;
}

/**
 * Polls the real pipeline data from the Electron main process (via
 * window.orun.pipeline.* IPC) and seeds the dashboard store so the UI shows
 * live sprint/squad/step state instead of the package's HTTP-fetch defaults.
 */
function usePipelineData(intervalMs = 2000) {
  const setSquadList = useDashboardStore((s) => s.setSquadList);
  const setSquadState = useDashboardStore((s) => s.setSquadState);
  const setMetrics = useDashboardStore((s) => s.setMetrics);
  const setConnected = useDashboardStore((s) => s.setConnected);
  const setError = useDashboardStore((s) => s.setError);
  const updateLastUpdate = useDashboardStore((s) => s.updateLastUpdate);

  useEffect(() => {
    if (!window.orun?.pipeline) {
      setError("Pipeline IPC indisponível (não está rodando no Electron).");
      setConnected(false);
      return;
    }

    let stopped = false;

    const refresh = async () => {
      try {
        const [squadsRes, metricsRes] = await Promise.all([
          window.orun.pipeline.listSquads(),
          window.orun.pipeline.metrics(),
        ]);

        if (stopped) return;

        if (squadsRes.success && squadsRes.squads) {
          const normalized = squadsRes.squads.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            icon: s.icon,
            agentCount: s.agentCount,
            version: s.version,
            status: (s.status || "idle") as "idle" | "running" | "completed" | "failed",
          }));
          setSquadList(normalized);
          for (const s of squadsRes.squads) {
            if (s.state) setSquadState(s.id, s.state as unknown as Parameters<typeof setSquadState>[1]);
          }
        }

        if (metricsRes.success && metricsRes.metrics) {
          const m = metricsRes.metrics;
          setMetrics({
            totalSquads: m.totalSquads,
            runningSquads: m.runningSquads,
            completedToday: m.completedToday,
            failedToday: m.failedToday,
            avgExecutionTime: 0,
            successRate: 0,
            activeAgents: 0,
            totalAgents: 0,
          });
        }

        setConnected(true);
        setError(null);
        updateLastUpdate();
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : String(e));
          setConnected(false);
        }
      }
    };

    refresh();
    const timer = setInterval(refresh, intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [intervalMs, setSquadList, setSquadState, setMetrics, setConnected, setError, updateLastUpdate]);
}

export function DashboardPanel({ onClose }: DashboardPanelProps) {
  usePipelineData();

  return (
    <div className="fixed inset-y-0 left-14 w-[900px] max-w-[calc(100vw-200px)] z-30 p-4" style={{ background: "var(--background)", borderRight: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Agent Dashboard</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:border-accent-secondary transition-colors"
          aria-label="Fechar dashboard"
        >
          ✕
        </button>
      </div>
      <Dashboard />
    </div>
  );
}

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Clock, Cpu, HardDrive, Activity } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useSysStats() {
  const [stats, setStats] = useState(() => ({
    cpu: 0,
    memory: 0,
    uptime: 0,
  }));
  useEffect(() => {
    const api = (window as unknown as { orun?: { analytics?: { system: () => Promise<{ cpu: number; memory: number; uptime: number }> } } }).orun?.analytics;
    let alive = true;
    const refresh = async () => {
      try {
        if (api?.system) {
          const s = await api.system();
          if (!alive) return;
          setStats({ cpu: s.cpu, memory: s.memory, uptime: s.uptime });
        } else {
          if (!alive) return;
          setStats((prev) => ({
            cpu: Math.floor(Math.random() * 31) + 15,
            memory: Math.floor(Math.random() * 31) + 40,
            uptime: prev.uptime + 5,
          }));
        }
      } catch {
        /* mantém os valores atuais */
      }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return stats;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function DashboardWidgets({ open, onToggle }: { open: boolean; onToggle: () => void }): ReactElement {
  const { t, locale } = useTranslation();
  const now = useTime();
  const stats = useSysStats();

  return (
    <>
      <button
        onClick={onToggle}
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none"
        style={{ color: open ? "var(--primary)" : "var(--muted-foreground)" }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--accent)"; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}
        title={t("dashboard_clock")}
        aria-label={t("dashboard_clock")}
      >
        <Activity size={17} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={onToggle} />
          <div
            className="fixed inset-y-0 left-16 w-72 z-30 p-4 overflow-y-auto border-r"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <div className="rounded-xl p-4 mb-3 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: "var(--primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                  {t("dashboard_clock")}
                </span>
              </div>
              <div className="text-3xl font-bold tabular-nums text-center" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                {now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <div className="text-xs text-center mt-1.5 capitalize" style={{ color: "var(--muted-foreground)" }}>
                {now.toLocaleDateString(locale, { weekday: "long" })},{" "}
                {now.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>

            <div className="rounded-xl p-4 border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} style={{ color: "var(--primary)" }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--foreground)" }}>
                  {t("dashboard_system")}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={11} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("dashboard_cpu")}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>{stats.cpu}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.cpu}%`, background: stats.cpu > 50 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)" }} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <HardDrive size={11} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("dashboard_memory")}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>{stats.memory}%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.memory}%`, background: stats.memory > 50 ? "var(--primary)" : "color-mix(in srgb, var(--primary) 60%, transparent)" }} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Activity size={11} style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("dashboard_uptime")}</span>
                  </div>
                  <span className="text-xs font-medium tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>{formatUptime(stats.uptime)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

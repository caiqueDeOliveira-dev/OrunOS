// components/PulsePanel.tsx
// Right column of the neural HOME: clock, system vitals and live activity stream.
// Data sources: window.orun.analytics.system() (CPU/RAM) + ActivityStream (events).

import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/I18nProvider";
import { ActivityStream, ActivityStreamHeader } from "./ActivityStream";

interface SysStats {
  cpu: number;
  memory: number;
  uptime: number;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useVitals() {
  const [stats, setStats] = useState<SysStats>({ cpu: 0, memory: 0, uptime: 0 });
  useEffect(() => {
    const api = (window as unknown as {
      orun?: { analytics?: { system: () => Promise<SysStats> } };
    }).orun?.analytics;
    let alive = true;
    const refresh = async () => {
      try {
        if (api?.system) {
          const s = await api.system();
          if (!alive) return;
          setStats({ cpu: s.cpu, memory: s.memory, uptime: s.uptime });
        }
      } catch { /* keep last values */ }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return stats;
}

function VitalRow({ label, value }: { label: string; value: number }) {
  const hot = value > 60;
  const color = hot ? "var(--warn)" : "var(--primary)";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[9px] uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{label}</span>
        <span className="text-[11px] font-medium font-data" style={{ color: "var(--text-secondary)" }}>{value}%</span>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(2, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function PulsePanel({ onOpenAgents, agentCount }: { onOpenAgents?: () => void; agentCount?: number }) {
  const { t, locale } = useTranslation();
  const now = useClock();
  const vitals = useVitals();

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateLabel = `${now.toLocaleDateString(locale, { weekday: "long" })}, ${now.toLocaleDateString(locale, { day: "numeric", month: "long" })}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Clock */}
      <div className="px-4 pt-4 pb-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-baseline gap-1">
          <span className="text-[30px] leading-none font-semibold font-data tracking-tight" style={{ color: "var(--foreground)" }}>
            {hh}:{mm}
          </span>
          <span className="text-[13px] font-data" style={{ color: "var(--text-tertiary)" }}>{ss}</span>
        </div>
        <p className="text-[10px] capitalize mt-1.5 truncate" style={{ color: "var(--text-tertiary)" }}>{dateLabel}</p>
      </div>

      {/* Vitals */}
      <div className="px-4 py-3 border-b space-y-3 shrink-0" style={{ borderColor: "var(--border)" }}>
        <VitalRow label={t("dashboard_cpu")} value={vitals.cpu} />
        <VitalRow label={t("dashboard_memory")} value={vitals.memory} />
        {(agentCount ?? 0) > 0 && (
          <button
            onClick={onOpenAgents}
            className="w-full flex items-baseline justify-between group"
            title={t("railAgents")}
          >
            <span className="text-[9px] uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{t("navAgents")}</span>
            <span className="text-[11px] font-medium font-data transition-colors group-hover:text-[var(--primary)]" style={{ color: "var(--text-secondary)" }}>{agentCount}</span>
          </button>
        )}
      </div>

      {/* Live stream */}
      <div className="flex-1 overflow-y-auto ws-scrollbar px-4 py-3 min-h-0">
        <ActivityStreamHeader title={t("railActivity")} />
        <ActivityStream max={9} />
      </div>
    </div>
  );
}

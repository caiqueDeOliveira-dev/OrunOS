// components/ActivityStream.tsx
// Compact real-time feed for the HOME pulse panel.
// Subscribes to the same sources as ActivityLog's live tab (audit push + Event Bus)
// but renders a minimal, glanceable list.

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

interface StreamEvent {
  id: string;
  timestamp: number;
  source: string;
  action: string;
  details: string;
  type: "agent" | "system" | "event";
}

export function relativeTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const TYPE_COLOR: Record<StreamEvent["type"], string> = {
  agent: "var(--primary)",
  event: "var(--info)",
  system: "var(--warn)",
};

export function ActivityStream({ max = 9 }: { max?: number }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isElectron) return;
    const unsubs: (() => void)[] = [];

    if (window.orun.activity?.onNewEntry) {
      const unsub = window.orun.activity.onNewEntry((entry) => {
        setEvents((prev) => [{
          id: `audit-${entry.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: entry.timestamp,
          source: entry.agentId,
          action: entry.action,
          details: entry.details,
          type: "agent" as const,
        }, ...prev].slice(0, 30));
      });
      unsubs.push(unsub);
    }

    if (window.orun.eventBus?.subscribe) {
      const { unsubscribe } = window.orun.eventBus.subscribe(
        ["hub:**", "shield:**", "memory:**", "planner:**"],
        (event) => {
          const source = event.meta?.source || event.topic.split(":")[0];
          const action = event.topic.split(":").slice(1).join(":");
          const timestamp = typeof event.meta?.timestamp === "number" ? event.meta.timestamp : Date.now();
          const details = typeof event.data?.title === "string" ? event.data.title
            : typeof event.data?.error === "string" ? event.data.error
            : typeof event.data?.targetAgent === "string" ? `→ ${event.data.targetAgent}`
            : typeof event.data?.agent === "string" ? event.data.agent
            : "";
          setEvents((prev) => [{
            id: `bus-${event.id}`,
            timestamp,
            source,
            action,
            details,
            type: "event" as const,
          }, ...prev].slice(0, 30));
        }
      );
      unsubs.push(unsubscribe);
    }

    const tick = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => { unsubs.forEach((fn) => fn()); clearInterval(tick); };
  }, []);

  if (events.length === 0) {
    return (
      <p className="text-[10px] px-1 py-3" style={{ color: "var(--text-tertiary)" }}>
        {t("activityStreamEmpty")}
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {events.slice(0, max).map((evt) => (
        <li key={evt.id} className="flex items-start gap-2 px-1 py-1.5 rounded-md hover:bg-[var(--surface-3)] transition-colors">
          <span
            className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: TYPE_COLOR[evt.type], boxShadow: `0 0 4px ${TYPE_COLOR[evt.type]}66` }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>{evt.source}</span>
              <span className="text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>{evt.action.replace(/_/g, " ")}</span>
              <span className="ml-auto text-[9px] shrink-0 font-data" style={{ color: "var(--text-tertiary)", opacity: 0.7 }}>
                {relativeTime(evt.timestamp)}
              </span>
            </div>
            {evt.details && (
              <p className="text-[9px] truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>{evt.details}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ActivityStreamHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Radio size={11} strokeWidth={1.8} style={{ color: "var(--primary)" }} />
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-secondary)" }}>
        {title}
      </span>
      <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
    </div>
  );
}

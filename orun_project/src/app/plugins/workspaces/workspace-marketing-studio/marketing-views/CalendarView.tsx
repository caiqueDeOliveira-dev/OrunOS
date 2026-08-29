import { Calendar } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";
import { TYPE_COLORS } from "../marketing-types";
import { P } from "../../premium";

const MONO = "'JetBrains Mono', monospace";

export function CalendarView() {
  const { t } = useTranslation();
  const events = useMarketingStore((s) => s.events);

  if (events.length === 0) {
    return (
      <div className="p-4">
        <WorkspaceEmptyState
          icon={<Calendar size={22} color="var(--primary)" strokeWidth={1.6} />}
          message={t("Nenhum evento no calendário")}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: P.sub }} role="heading" aria-level={2}>
        {t("Calendário de Conteúdo")}
      </h3>
      {events.map((e) => (
        <WorkspaceCard key={e.id}>
          <div className="flex items-center gap-3 p-2.5">
            <span className="text-[9px] font-medium w-10" style={{ fontFamily: MONO, color: TYPE_COLORS[e.type] }}>
              {e.date}
            </span>
            <div className="w-1.5 h-8 rounded-full" style={{ background: TYPE_COLORS[e.type] }} />
            <div className="flex-1">
              <p className="text-[11px]" style={{ color: P.text }}>{e.title}</p>
              <p className="text-[9px]" style={{ color: P.sub }}>{e.platform}</p>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase" style={{ background: `${TYPE_COLORS[e.type]}15`, color: TYPE_COLORS[e.type] }}>
              {e.type}
            </span>
          </div>
        </WorkspaceCard>
      ))}
    </div>
  );
}

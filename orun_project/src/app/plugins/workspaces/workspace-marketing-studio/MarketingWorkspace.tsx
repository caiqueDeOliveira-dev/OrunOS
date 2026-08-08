import { useState, useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerMarketingActions, unregisterMarketingActions, setMarketingStoreGetter } from "./marketing-actions";
import { useMarketingStore } from "./marketing-store";
import { usePersonalization } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { WorkspaceSkeleton } from "../../components/WorkspaceSkeleton";
import { PremiumRoot, ScrollArea } from "../premium";
import { CampaignsView } from "./marketing-views/CampaignsView";
import { CalendarView } from "./marketing-views/CalendarView";
import { ABTestsView } from "./marketing-views/ABTestsView";
import { AnalyticsView } from "./marketing-views/AnalyticsView";
import { ScheduleView } from "./marketing-views/ScheduleView";
import { DiscordView } from "./marketing-views/DiscordView";
import { MarketingNotes } from "./marketing-views/MarketingNotes";

type View = "campaigns" | "calendar" | "abtests" | "analytics" | "schedule" | "discord";

const VIEWS: { key: View; label: string }[] = [
  { key: "campaigns", label: "Campanhas" },
  { key: "calendar", label: "Calendário" },
  { key: "abtests", label: "A/B Tests" },
  { key: "analytics", label: "Analytics" },
  { key: "schedule", label: "Agendamento" },
  { key: "discord", label: "Discord" },
];

export { useMarketingStore };

export function MarketingWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const [activeView, setActiveView] = useState<View>("campaigns");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registerMarketingActions();
    setMarketingStoreGetter(() => useMarketingStore);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => { unregisterMarketingActions(); clearTimeout(timer); };
  }, []);

  if (loading) return <WorkspaceSkeleton lines={5} />;

  return (
    <PremiumRoot>
      <ScrollArea>
        <div className="flex items-center justify-between px-4 py-1">
          <span className="text-xs font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
            {greeting || "Olá"}, {userName || "usuário"}
          </span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#EC4899", color: "#fff" }} aria-label={avatarInitials || "User"}>
            {avatarInitials || "U"}
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "#252525" }} role="tablist" aria-label="Views">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setActiveView(v.key)}
              className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
              role="tab"
              aria-selected={activeView === v.key}
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: activeView === v.key ? 500 : 300,
                color: activeView === v.key ? "#FFFFFF" : "#A0A0A0",
                background: activeView === v.key ? "rgba(195,0,47,0.14)" : "transparent",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={activeView}>
          {activeView === "campaigns" && <CampaignsView />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "abtests" && <ABTestsView />}
          {activeView === "analytics" && <AnalyticsView />}
          {activeView === "schedule" && <ScheduleView />}
          {activeView === "discord" && <DiscordView />}
        </div>

        <MarketingNotes />
      </ScrollArea>
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </PremiumRoot>
  );
}

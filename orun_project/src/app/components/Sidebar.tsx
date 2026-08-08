import React, { useState } from "react";
import { Settings, History, Puzzle, User, Award, Activity, Mail, Calendar, Target, Bot, BarChart3 } from "lucide-react";import { useTranslation } from "../../i18n/I18nProvider";
import { getNavTop } from "../constants";
import { DashboardWidgets } from "./DashboardWidgets";

export const Sidebar = React.memo(function Sidebar({
  activeNav,
  onNavClick,
  onSettingsClick,
  onHistoryClick,
  onPluginsClick,
  onProfileClick,
  onAchievementsClick,
  onActivityClick,
  onEmailClick,
  onCalendarClick,
  badgeCounts,
}: {
  activeNav: string;
  onNavClick: (id: string) => void;
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onPluginsClick: () => void;
  onProfileClick: () => void;
  onAchievementsClick?: () => void;
  onActivityClick: () => void;
  onEmailClick: () => void;
  onCalendarClick: () => void;
  badgeCounts?: Record<string, number>;
}) {
  const { t } = useTranslation();
  const NAV_TOP = getNavTop(t);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  return (
    <>
      <DashboardWidgets open={dashboardOpen} onToggle={() => setDashboardOpen(p => !p)} />
      <nav className="fixed left-0 top-8 h-[calc(100%-2rem)] z-40 flex flex-col items-center py-5 border-r" style={{ width: 64, background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }} role="navigation" aria-label="Sidebar">
        {/* Mark */}
        <button className="mb-7 p-0.5" onClick={() => onNavClick("home")} aria-label={t("sidebarHome") || "Home"}>
          <img
            src="./LogoIA.png"
            alt="Orun OS"
            className="rounded-full"
            style={{
              width: 26,
              height: 26,
              objectFit: "cover",
              border: "1px solid rgba(195,0,47,0.5)",
              boxShadow: "0 0 10px rgba(195,0,47,0.25)",
            }}
          />
        </button>

        {/* Top nav items */}
      <div className="flex flex-col gap-0.5 flex-1">
        {NAV_TOP.map(item => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavClick(item.id)}
              title={item.label}
              aria-label={item.label}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none"
              style={{ background: isActive ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: isActive ? "var(--primary)" : "var(--muted-foreground)" }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--accent)"; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; } }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full" style={{ width: 2, height: 18, background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }} />
              )}
              <Icon size={17} />
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5">
        {[
          { icon: Mail, id: "email", title: "Email", onClick: onEmailClick },
          { icon: Calendar, id: "calendar", title: "Calendário", onClick: onCalendarClick },
          { icon: Activity, id: "activity", title: "Atividade", onClick: onActivityClick, badge: badgeCounts?.activity },
          { icon: Puzzle, id: "skills", title: "Skills", onClick: () => onNavClick("skills") },
          { icon: Target, id: "planner", title: "Planner", onClick: () => onNavClick("planner") },
          { icon: Bot, id: "agentHub", title: "Agent Hub", onClick: () => onNavClick("agentHub") },
          { icon: BarChart3, id: "analytics", title: "Analytics", onClick: () => onNavClick("analytics") },
          { icon: History, id: "history", title: t("sidebarHistory"), onClick: onHistoryClick },
          { icon: Puzzle, id: "plugins", title: t("plugins"), onClick: onPluginsClick },
          { icon: User, id: "profile", title: t("profileTitle"), onClick: onProfileClick },
          ...(onAchievementsClick ? [{ icon: Award, id: "achievements", title: t("achievements_title"), onClick: onAchievementsClick }] : []),
          { icon: Settings, id: "settings", title: t("sidebarSettings"), onClick: onSettingsClick },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={item.onClick} title={item.title} aria-label={item.title} className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none" style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
            >
              <Icon size={17} />
              {"badge" in item && item.badge != null && item.badge > 0 && (
                <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                  style={{
                    minWidth: 14, height: 14, borderRadius: 7,
                    background: "#C00018", color: "#fff",
                    fontSize: 8, fontWeight: 600, lineHeight: 1,
                    padding: "0 3px",
                    boxShadow: "0 0 6px #C00018",
                  }}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
    </>
  );
});



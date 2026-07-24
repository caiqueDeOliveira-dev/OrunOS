import React from "react";
import { Settings, History, Puzzle, User } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getNavTop } from "../constants";

export const Sidebar = React.memo(function Sidebar({
  activeNav,
  onNavClick,
  onSettingsClick,
  onHistoryClick,
  onPluginsClick,
  onProfileClick,
}: {
  activeNav: string;
  onNavClick: (id: string) => void;
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  onPluginsClick: () => void;
  onProfileClick: () => void;
}) {
  const { t } = useTranslation();
  const NAV_TOP = getNavTop(t);
  return (
    <nav className="fixed left-0 top-8 h-[calc(100%-2rem)] z-40 flex flex-col items-center py-5 border-r" style={{ width: 64, background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }} role="navigation" aria-label="Sidebar">
      {/* Mark */}
      <button className="mb-7 p-1" onClick={() => onNavClick("home")} aria-label={t("sidebarHome") || "Home"}>
        <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" stroke="var(--primary)" strokeWidth="2" fill="none" />
          <circle cx="26" cy="26" r="5.5" fill="var(--primary)" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }} />
        </svg>
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
          { icon: History, id: "history", title: t("sidebarHistory"), onClick: onHistoryClick },
          { icon: Puzzle, id: "plugins", title: t("plugins"), onClick: onPluginsClick },
          { icon: User, id: "profile", title: t("profileTitle"), onClick: onProfileClick },
          { icon: Settings, id: "settings", title: t("sidebarSettings"), onClick: onSettingsClick },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={item.onClick} title={item.title} aria-label={item.title} className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] outline-none" style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
    </nav>
  );
});



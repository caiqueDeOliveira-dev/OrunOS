import { Settings, User, History } from "lucide-react";
import { NAV_TOP } from "../constants";

export function Sidebar({
  activeNav,
  onNavClick,
  onSettingsClick,
  onHistoryClick,
}: {
  activeNav: string;
  onNavClick: (id: string) => void;
  onSettingsClick: () => void;
  onHistoryClick: () => void;
}) {
  return (
    <div className="fixed left-0 top-0 h-full z-40 flex flex-col items-center py-5 border-r" style={{ width: 64, background: "#090909", borderColor: "#161616" }}>
      {/* Mark */}
      <button className="mb-7 p-1" onClick={() => onNavClick("home")}>
        <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" stroke="#C00018" strokeWidth="2" fill="none" />
          <circle cx="26" cy="26" r="5.5" fill="#C00018" style={{ filter: "drop-shadow(0 0 4px #C00018)" }} />
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
              className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all"
              style={{ background: isActive ? "rgba(192,0,24,0.1)" : "transparent", color: isActive ? "#FF1A2D" : "#3e3e3e" }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "#3e3e3e"; e.currentTarget.style.background = "transparent"; } }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full" style={{ width: 2, height: 18, background: "#C00018", boxShadow: "0 0 6px #C00018" }} />
              )}
              <Icon size={17} />
            </button>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5">
        {[
          { icon: History, id: "history", title: "Histórico de Conversas", onClick: onHistoryClick },
          { icon: Settings, id: "settings", title: "Configurações", onClick: onSettingsClick },
          { icon: User, id: "profile", title: "Perfil", onClick: () => {} },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={item.onClick} title={item.title} className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors" style={{ color: "#2e2e2e" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#888")}
              onMouseLeave={e => (e.currentTarget.style.color = "#2e2e2e")}
            >
              <Icon size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

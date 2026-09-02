import React, { useEffect, useState } from "react";
import { NAV } from "./nav";
import { api } from "./lib/api";

import Home from "./pages/Home";
import Combos from "./pages/Combos";
import Providers from "./pages/Providers";
import Usage from "./pages/Usage";
import Health from "./pages/Health";
import Console from "./pages/Console";
import Chat from "./pages/Chat";
import TokenSaver from "./pages/TokenSaver";
import Translator from "./pages/Translator";
import ProxyPool from "./pages/ProxyPool";
import Tunnel from "./pages/Tunnel";
import CliTools from "./pages/CliTools";
import Settings from "./pages/Settings";

const VIEWS = {
  home: Home,
  combos: Combos,
  providers: Providers,
  usage: Usage,
  health: Health,
  console: Console,
  chat: Chat,
  "token-saver": TokenSaver,
  translator: Translator,
  "proxy-pool": ProxyPool,
  tunnel: Tunnel,
  "cli-tools": CliTools,
  settings: Settings,
};

export default function App() {
  const [current, setCurrent] = useState("home");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const View = VIEWS[current] ?? Home;

  return (
    <div className="min-h-screen bg-orun-bg text-orun-text font-sans">
      <Sidebar current={current} onNavigate={setCurrent} health={health} />
      <main className="ml-56 p-6">
        <View onNavigate={setCurrent} />
      </main>
    </div>
  );
}

function Sidebar({ current, onNavigate, health }) {
  return (
    <aside className="w-56 h-screen bg-orun-surface border-r border-orun-border flex flex-col fixed left-0 top-0 z-40">
      <div className="px-4 py-4 border-b border-orun-border">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-orun-bg border border-orun-border flex items-center justify-center overflow-hidden">
            <span className="font-display text-lg font-semibold text-orun-text leading-none">O</span>
            <div className="absolute inset-0 bg-orun-accent/5" />
          </div>
          <div>
            <div className="text-sm font-display font-semibold text-orun-text leading-none tracking-tight">
              Orun Router
            </div>
            <div className="text-2xs text-orun-muted mt-1 font-mono uppercase tracking-widest">AI Gateway</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group, gi) => (
          <div key={group.title} className={gi > 0 ? "mt-5" : ""}>
            <div className="px-3 mb-1.5 text-2xs font-display font-semibold uppercase tracking-widest text-orun-muted/50 select-none">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = current === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                      active
                        ? "bg-orun-accentMuted text-orun-accent"
                        : "text-orun-textSecondary hover:text-orun-text hover:bg-white/[0.03]"
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-orun-accent rounded-r" />
                    )}
                    <span className="shrink-0">
                      <Icon />
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-orun-border">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full ${
              health != null && health.ok
                ? "bg-orun-success shadow-[0_0_6px_rgba(0,210,106,0.4)]"
                : "bg-orun-error"
            }`}
          />
          <span className="text-2xs text-orun-muted font-mono">
            {health ? `${health.combosCount} combos` : "Connecting..."}
          </span>
        </div>
      </div>
    </aside>
  );
}

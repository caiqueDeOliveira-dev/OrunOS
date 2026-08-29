// components/WorkspaceLauncher.tsx
//
// Launchpad screen for the "workspaces" space: a searchable grid of every
// registered workspace plugin. Mirrors WorldScreen's visual language.

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AppWindow,
  Briefcase,
  Car,
  Code,
  Film,
  GraduationCap,
  Heart,
  House,
  KeyRound,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  MessageSquareText,
  Music,
  Palette,
  Scale,
  Search,
  Settings,
  Shield,
  Wallet,
  Wrench,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getAllPlugins, getPluginCompatibility, isPluginEnabled } from "../plugins/PluginRegistry";
import { WORKSPACE_PLUGIN_LOADERS } from "../plugins/workspace-loaders";
import type { WorkspacePlugin } from "../plugins/types";

const ICONS: Record<string, LucideIcon> = {
  Wrench,
  Workflow,
  Car,
  Briefcase,
  Music,
  Film,
  Shield,
  Palette,
  Code,
  Wallet,
  MessageSquareText,
  Heart,
  Home: House,
  Scale,
  Megaphone,
  KeyRound,
  LifeBuoy,
  Settings,
  GraduationCap,
  Activity,
  MessageSquare,
};

function pluginIcon(name: string): LucideIcon {
  return ICONS[name] ?? AppWindow;
}

interface Props {
  onOpenWorkspace: (pluginId: string) => void;
}

export function WorkspaceLauncher({ onOpenWorkspace }: Props) {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<WorkspacePlugin[]>(getAllPlugins);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all(WORKSPACE_PLUGIN_LOADERS.map((load) => load().catch(() => null))).then(() => {
      if (alive) setPlugins(getAllPlugins());
    });
    return () => {
      alive = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    return plugins
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
  }, [plugins, q]);

  const activeCount = plugins.filter((p) => isPluginEnabled(p.id)).length;

  return (
    <div className="flex-1 overflow-y-auto ws-scrollbar">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-[22px] font-semibold tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
              >
                {t("navWorkspaces")}
              </h1>
              <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                {t("launcherSubtitle")}
              </p>
            </div>
            <div className="relative shrink-0 w-[220px]">
              <Search
                size={13}
                strokeWidth={1.8}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--muted-foreground)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("launcherSearch")}
                spellCheck={false}
                className="w-full h-8 pl-7 pr-3 rounded-lg text-[11px] outline-none border transition-all focus-within:border-[var(--line-hi)]"
                style={{
                  background: "var(--surface-1)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Grid */}
        {visible.length === 0 ? (
          <p className="text-[11px] py-10 text-center" style={{ color: "var(--text-tertiary)" }}>
            {t("launcherEmpty")}
          </p>
        ) : (
          <div className="mt-6 grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
            {visible.map((plugin, i) => {
              const Icon = pluginIcon(plugin.icon);
              const enabled = isPluginEnabled(plugin.id);
              const compat = getPluginCompatibility(plugin.id);
              const compatWarn = compat && !compat.ok;
              return (
                <motion.button
                  key={plugin.id}
                  type="button"
                  onClick={() => enabled && onOpenWorkspace(plugin.id)}
                  disabled={!enabled}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: enabled ? 1 : 0.45, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  whileHover={enabled ? { y: -2 } : undefined}
                  className={`group text-left rounded-xl border p-3 transition-colors ${enabled ? "cursor-pointer" : "cursor-default"}`}
                  style={{
                    background: "var(--surface-1)",
                    borderColor: "var(--border)",
                  }}
                  onMouseEnter={(e) => {
                    if (enabled) e.currentTarget.style.borderColor = "rgba(192,0,24,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                  title={compatWarn ? compat?.warnings[0] || undefined : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "rgba(192,0,24,0.08)", color: "var(--muted-foreground)" }}
                    >
                      <Icon size={17} strokeWidth={1.7} className="group-hover:text-[#C00018]" />
                    </div>
                    <span
                      className="text-[9px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-tertiary)" }}
                    >
                      v{plugin.version}
                      {compatWarn && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full ml-1.5 align-middle"
                          style={{ background: "var(--warn)" }}
                        />
                      )}
                    </span>
                  </div>
                  <p
                    className="mt-2.5 text-[12px] font-medium truncate"
                    style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
                  >
                    {plugin.name}
                  </p>
                  <p
                    className="mt-0.5 text-[10px] leading-snug line-clamp-2 min-h-[26px]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {enabled ? plugin.description : t("launcherDisabled")}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-tertiary)" }}>
          {t("launcherActiveCount", { active: String(activeCount), total: String(plugins.length) })}
        </p>
      </div>
    </div>
  );
}

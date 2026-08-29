// components/SpaceRail.tsx
// Orun OS navigation v2 — 7 spaces with contextual flyouts.
// Replaces the old 13-icon flat sidebar: fewer anchors, resources grouped by domain.

import { useEffect, useRef, useState } from "react";
import {
  House, Globe, Brain, LayoutGrid, MonitorSmartphone, AudioLines, SlidersHorizontal,
  History, FolderOpen, Files, Mail, CalendarDays,   MessageSquare, Send, Share2, Activity, MessageSquareText,
  Users, Network, Zap, Clock3, Puzzle, Waypoints, Bot, Route, ChartColumn, Mic, Gauge,
  Music, Video, Palette, Settings, Blocks, FileOutput, UserRound, Trophy, LifeBuoy,
  Keyboard, Newspaper, Atom, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

export interface SpaceRailActions {
  history: () => void;
  projects: () => void;
  files: () => void;
  email: () => void;
  calendar: () => void;
  whatsapp: () => void;
  telegram: () => void;
  groupFeed: () => void;
  social: () => void;
  activity: () => void;
  agents: () => void;
  agentHub: () => void;
  memory: () => void;
  neural: () => void;
  automation: () => void;
  schedules: () => void;
  skills: () => void;
  planner: () => void;
  agentModels: () => void;
  router: () => void;
  usage: () => void;
  voices: () => void;
  homeIa: () => void;
  telemetry: () => void;
  music: () => void;
  creatorAudio: () => void;
  creatorVideo: () => void;
  designer: () => void;
  settings: () => void;
  plugins: () => void;
  analytics: () => void;
  exportImport: () => void;
  profile: () => void;
  achievements: () => void;
  support: () => void;
  shortcuts: () => void;
  changelog: () => void;
}

interface SpaceRailProps {
  activeSpace: string;
  activityBadge?: number;
  onSpace: (id: string) => void;
  actions: SpaceRailActions;
}

type RailItem = { label: string; icon: LucideIcon; run: () => void };
type RailGroup = { title?: string; items: RailItem[] };

interface SpaceDef {
  id: string;
  icon: LucideIcon;
  labelKey: "navHome" | "navWorld" | "navIntelligence" | "navWorkspaces" | "navDevices" | "navMedia" | "navSystem";
}

const SPACES: SpaceDef[] = [
  { id: "home", icon: House, labelKey: "navHome" },
  { id: "world", icon: Globe, labelKey: "navWorld" },
  { id: "intelligence", icon: Brain, labelKey: "navIntelligence" },
  { id: "workspaces", icon: LayoutGrid, labelKey: "navWorkspaces" },
  { id: "devices", icon: MonitorSmartphone, labelKey: "navDevices" },
  { id: "media", icon: AudioLines, labelKey: "navMedia" },
  { id: "system", icon: SlidersHorizontal, labelKey: "navSystem" },
];

export function SpaceRail({ activeSpace, activityBadge = 0, onSpace, actions }: SpaceRailProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current !== null) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const scheduleOpen = (id: string) => {
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpen(id), 120);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(null), 180);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => clearTimers, []);

  const flyouts: Record<string, RailGroup[]> = {
    home: [
      {
        title: t("railPersonal"),
        items: [
          { label: t("railHistory"), icon: History, run: actions.history },
          { label: t("railProjects"), icon: FolderOpen, run: actions.projects },
          { label: t("railFiles"), icon: Files, run: actions.files },
          { label: t("railEmail"), icon: Mail, run: actions.email },
          { label: t("railCalendar"), icon: CalendarDays, run: actions.calendar },
        ],
      },
      {
        title: t("railChannels"),
        items: [
          { label: t("railWhatsapp"), icon: MessageSquare, run: actions.whatsapp },
          { label: t("railTelegram"), icon: Send, run: actions.telegram },
          { label: t("navGroupFeed"), icon: MessageSquareText, run: actions.groupFeed },
          { label: t("railSocial"), icon: Share2, run: actions.social },
        ],
      },
      {
        items: [{ label: t("railActivity"), icon: Activity, run: actions.activity }],
      },
    ],
    intelligence: [
      {
        title: t("railAgentsGroup"),
        items: [
          { label: t("railAgents"), icon: Users, run: actions.agents },
          { label: t("railAgentHub"), icon: Network, run: actions.agentHub },
        ],
      },
      {
        title: t("railBrain"),
        items: [
          { label: t("railMemory"), icon: Brain, run: actions.memory },
          { label: t("railNeural"), icon: Atom, run: actions.neural },
          { label: t("railSkills"), icon: Puzzle, run: actions.skills },
          { label: t("railPlanner"), icon: Waypoints, run: actions.planner },
        ],
      },
      {
        title: t("railAutomationGroup"),
        items: [
          { label: t("railAutomation"), icon: Zap, run: actions.automation },
          { label: t("railSchedules"), icon: Clock3, run: actions.schedules },
        ],
      },
      {
        title: t("railModelsGroup"),
        items: [
          { label: t("railAgentModels"), icon: Bot, run: actions.agentModels },
          { label: t("railRouter"), icon: Route, run: actions.router },
          { label: t("railUsage"), icon: ChartColumn, run: actions.usage },
          { label: t("railVoices"), icon: Mic, run: actions.voices },
        ],
      },
    ],
    devices: [
      {
        title: t("railHomeGroup"),
        items: [
          { label: t("railHomeIA"), icon: House, run: actions.homeIa },
          { label: t("railTelemetry"), icon: Gauge, run: actions.telemetry },
        ],
      },
    ],
    media: [
      {
        title: t("railStudio"),
        items: [
          { label: t("railCreatorAudio"), icon: AudioLines, run: actions.creatorAudio },
          { label: t("railCreatorVideo"), icon: Video, run: actions.creatorVideo },
          { label: t("railDesigner"), icon: Palette, run: actions.designer },
        ],
      },
      {
        title: t("railMusic"),
        items: [{ label: t("railOrunMusic"), icon: Music, run: actions.music }],
      },
    ],
    system: [
      {
        title: t("navSystem"),
        items: [
          { label: t("railSettings"), icon: Settings, run: actions.settings },
          { label: t("railPlugins"), icon: Blocks, run: actions.plugins },
          { label: t("railAnalytics"), icon: ChartColumn, run: actions.analytics },
          { label: t("railExportImport"), icon: FileOutput, run: actions.exportImport },
        ],
      },
      {
        title: t("railAccount"),
        items: [
          { label: t("railProfile"), icon: UserRound, run: actions.profile },
          { label: t("railAchievements"), icon: Trophy, run: actions.achievements },
          { label: t("railSupport"), icon: LifeBuoy, run: actions.support },
        ],
      },
      {
        title: t("railHelp"),
        items: [
          { label: t("railShortcuts"), icon: Keyboard, run: actions.shortcuts },
          { label: t("railChangelog"), icon: Newspaper, run: actions.changelog },
        ],
      },
    ],
  };

  const hasFlyout = (id: string) => !!flyouts[id];

  return (
    <nav
      aria-label="Orun OS"
      className="fixed left-0 top-8 bottom-0 w-14 z-40 flex flex-col items-center py-3 border-r"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
      onMouseLeave={scheduleClose}
    >
      {/* Brand node */}
      <button
        onClick={() => onSpace("home")}
        className="mb-4 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
        style={{ background: "radial-gradient(circle at 35% 30%, rgba(195,0,47,0.35), rgba(195,0,47,0.12))", border: "1px solid rgba(195,0,47,0.35)" }}
        title="Orun OS"
        aria-label="Orun OS"
      >
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--primary)", boxShadow: "0 0 8px var(--primary)" }} />
      </button>

      {/* Spaces */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {SPACES.map((space) => {
          const Icon = space.icon;
          const active = activeSpace === space.id;
          return (
            <div key={space.id} className="relative">
              <button
                onMouseEnter={() => { if (hasFlyout(space.id)) scheduleOpen(space.id); else scheduleClose(); }}
                onClick={() => { clearTimers(); setOpen(null); onSpace(space.id); }}
                className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors group"
                style={{
                  background: active ? "var(--surface-3)" : "transparent",
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                }}
                title={t(space.labelKey)}
                aria-label={t(space.labelKey)}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <span
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full"
                    style={{ background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }}
                  />
                )}
                <Icon size={17} strokeWidth={1.8} className="transition-transform group-hover:scale-110" />
              </button>

              {open === space.id && flyouts[space.id] && (
                <div
                  className="absolute left-full top-0 ml-2 z-50 min-w-[210px] p-1.5 max-h-[72vh] overflow-y-auto ws-scrollbar"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
                  }}
                  onMouseEnter={clearTimers}
                  onMouseLeave={scheduleClose}
                >
                  {flyouts[space.id].map((group, gi) => (
                    <div key={gi} className={gi > 0 ? "mt-1 pt-1 border-t" : ""} style={{ borderColor: "var(--border)" }}>
                      {group.title && (
                        <p className="px-2.5 pt-1.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>
                          {group.title}
                        </p>
                      )}
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={() => { clearTimers(); setOpen(null); item.run(); }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors hover:bg-[var(--surface-3)] group/item"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            <ItemIcon size={14} strokeWidth={1.7} style={{ color: "var(--text-tertiary)" }} className="shrink-0 transition-colors group-hover/item:text-[var(--text-secondary)]" />
                            <span className="truncate transition-colors group-hover/item:text-[var(--foreground)]">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom cluster */}
      <div className="flex flex-col items-center gap-1 mt-auto">
        <button
          onClick={actions.activity}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--muted-foreground)", background: activeSpace === "activity" ? "var(--surface-3)" : "transparent" }}
          title={t("railActivity")}
          aria-label={t("railActivity")}
        >
          <Activity size={17} strokeWidth={1.8} />
          {activityBadge > 0 && (
            <span
              className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center text-[8px] font-semibold"
              style={{ background: "var(--primary)", color: "#fff", boxShadow: "0 0 6px rgba(195,0,47,0.6)" }}
            >
              {activityBadge > 99 ? "99+" : activityBadge}
            </span>
          )}
        </button>
        <div className="w-6 h-px my-1" style={{ background: "var(--border)" }} />
        <button
          onClick={actions.profile}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{ color: "var(--muted-foreground)", background: activeSpace === "profile" ? "var(--surface-3)" : "transparent" }}
          title={t("railProfile")}
          aria-label={t("railProfile")}
        >
          <UserRound size={17} strokeWidth={1.8} />
        </button>
      </div>
    </nav>
  );
}

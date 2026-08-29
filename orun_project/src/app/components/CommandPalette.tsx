import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Brain, Atom, Code, Sparkles, Video, Heart, DollarSign, BookOpen, Megaphone, Zap, Settings, MessageCircle, Clock, Trash2, ArrowRight, Car, Globe, Music, AudioLines, Palette, House, Gauge, Shield, Activity, Mail, CalendarDays, Files, Mic } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onAgentSelect: (name: string) => void;
  onNewChat: () => void;
  onOpenWorkspace?: (pluginId: string) => void;
}

const AGENT_ICONS: Record<string, any> = {
  Hampton: Brain, Developer: Code, Designer: Sparkles, Creator: Video,
  Health: Heart, Finance: DollarSign, Teacher: BookOpen, Marketing: Megaphone,
  Automation: Zap, Automotive: Car, System: Settings,
};

// Workspaces exposed to the Command Center (ids match the plugin registry).
const WORKSPACES: Array<{ id: string; icon: any }> = [
  { id: "Developer", icon: Code },
  { id: "Designer", icon: Palette },
  { id: "Health", icon: Heart },
  { id: "FinanceReal", icon: DollarSign },
  { id: "Teacher", icon: BookOpen },
  { id: "Marketing", icon: Megaphone },
  { id: "Automation", icon: Zap },
  { id: "Automotive", icon: Car },
  { id: "HomeIA", icon: House },
  { id: "Telemetry", icon: Gauge },
  { id: "CyberSecurity", icon: Shield },
  { id: "System", icon: Settings },
  { id: "OrunMusic", icon: Music },
  { id: "Creator_Audio", icon: AudioLines },
  { id: "Creator_Video", icon: Video },
];

const WS_LABEL_KEY: Record<string, "railDesigner" | "railHomeIA" | "railTelemetry" | "railOrunMusic" | "railCreatorAudio" | "railCreatorVideo"> = {
  Designer: "railDesigner",
  HomeIA: "railHomeIA",
  Telemetry: "railTelemetry",
  OrunMusic: "railOrunMusic",
  Creator_Audio: "railCreatorAudio",
  Creator_Video: "railCreatorVideo",
};

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: any;
  section: string;
  action: () => void;
}

export function CommandPalette({ open, onClose, onNavigate, onAgentSelect, onNewChat, onOpenWorkspace }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(() => [
    { id: "home", label: t("command_palette_home_label"), description: t("command_palette_home_description"), icon: Brain, section: t("command_palette_section_navigation"), action: () => { onNavigate("home"); onClose(); } },
    { id: "world", label: t("worldTitle"), description: t("worldSubtitle"), icon: Globe, section: t("command_palette_section_navigation"), action: () => { onNavigate("world"); onClose(); } },
    { id: "agents", label: t("command_palette_agents_label"), description: t("command_palette_agents_description"), icon: Code, section: t("command_palette_section_navigation"), action: () => { onNavigate("agents"); onClose(); } },
    { id: "projects", label: t("command_palette_projects_label"), description: t("command_palette_projects_description"), icon: Sparkles, section: t("command_palette_section_navigation"), action: () => { onNavigate("projects"); onClose(); } },
    { id: "settings", label: t("command_palette_settings_label"), description: t("command_palette_settings_description"), icon: Settings, section: t("command_palette_section_navigation"), action: () => { onNavigate("settings"); onClose(); } },
    { id: "new-chat", label: t("command_palette_new_chat_label"), description: t("command_palette_new_chat_description"), icon: MessageCircle, section: t("command_palette_section_actions"), action: () => { onNewChat(); onClose(); } },
    { id: "history", label: t("command_palette_history_label"), description: t("command_palette_history_description"), icon: Clock, section: t("command_palette_section_actions"), action: () => { onNavigate("history"); onClose(); } },
    ...[
      { id: "memory", label: t("railMemory"), icon: Brain },
      { id: "neural", label: t("railNeural"), icon: Atom },
      { id: "files", label: t("railFiles"), icon: Files },
      { id: "email", label: t("railEmail"), icon: Mail },
      { id: "calendar", label: t("railCalendar"), icon: CalendarDays },
      { id: "activity", label: t("railActivity"), icon: Activity },
    ].map((c) => ({ ...c, section: t("command_palette_section_actions"), action: () => { onNavigate(c.id); onClose(); } })),
    ...(onOpenWorkspace ? WORKSPACES.map((ws) => ({
      id: `ws-${ws.id}`,
      label: WS_LABEL_KEY[ws.id] ? t(WS_LABEL_KEY[ws.id]) : ws.id,
      description: undefined,
      icon: ws.icon,
      section: t("navWorkspaces"),
      action: () => { onOpenWorkspace(ws.id); onClose(); },
    })) : []),
    ...Object.keys(AGENT_ICONS).map((name) => ({
      id: `agent-${name}`,
      label: name,
      description: t("command_palette_agent_description", { name }),
      icon: AGENT_ICONS[name],
      section: t("command_palette_section_agents"),
      action: () => { onAgentSelect(name); onClose(); },
    })),
  ], [t, onNavigate, onClose, onAgentSelect, onNewChat, onOpenWorkspace]);

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.description?.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && filtered[selectedIndex]) { filtered[selectedIndex].action(); }
    else if (e.key === "Escape") { onClose(); }
  }, [filtered, selectedIndex, onClose]);

  const sections = [...new Set(filtered.map((c) => c.section))];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-[480px] max-h-[400px] overflow-hidden rounded-xl border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <Search size={16} style={{ color: "var(--muted-foreground)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("command_palette_search_placeholder")}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
            />
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>ESC</span>
          </div>
          <div className="overflow-y-auto max-h-[340px] scrollbar-hide">
            {sections.map((section) => (
              <div key={section}>
                <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{section}</div>
                {filtered.filter((c) => c.section === section).map((cmd, i) => {
                  const globalIdx = filtered.indexOf(cmd);
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: globalIdx === selectedIndex ? "var(--accent)" : "transparent",
                        color: "var(--foreground)",
                      }}
                    >
                      <Icon size={15} style={{ color: "var(--primary)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium">{cmd.label}</div>
                        {cmd.description && <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{cmd.description}</div>}
                      </div>
                      <ArrowRight size={12} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#666" }}>
                {t("command_palette_no_results")} "{query}"
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

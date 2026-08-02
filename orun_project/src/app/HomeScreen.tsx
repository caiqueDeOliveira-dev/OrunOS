import { useEffect, useRef, useState, useCallback, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Focus } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { AgentsPanel } from "./components/AgentsPanel";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { ChatInput } from "./components/ChatInput";
import { VoiceLevelBar } from "./components/VoiceLevelBar";
import { getHamptonReplies, isElectron, getAgents } from "./constants";
import type { HamptonState } from "./types";
import { usePanelNavigation } from "./hooks/usePanelNavigation";
import { useChat } from "./hooks/useChat";
import { useVoice } from "./hooks/useVoice";
import { useTTS } from "./hooks/useTTS";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useVoiceSettings } from "./hooks/useVoiceSettings";
import { AgentCardSkeleton } from "./components/Skeleton";
import { ChatView } from "./components/ChatView";
import { WorkspaceView } from "./components/WorkspaceView";
import { PluginSettings } from "./plugins/PluginSettings";
import { ProfilePanel } from "./components/ProfilePanel";
import { TelegramPanel } from "./components/TelegramPanel";
import { OfflineBanner } from "./components/OfflineBanner";
import { useToast } from "./components/Toast";
import { checkEasterEgg, getAll as getAllEggs } from "./services/easterEggs";
import { unlock as unlockAchievement, progress as progressAchievement } from "./services/achievements";
import type { AttachedImage } from "./components/ChatInput";
import { hasPlugin, getWorkspacePluginId } from "./plugins/PluginRegistry";
import { AutoBackup } from "./services/autoBackup";

const WORKSPACE_PLUGINS = [
  () => import("./plugins/workspaces/workspace-system-console"),
  () => import("./plugins/workspaces/workspace-health-dashboard"),
  () => import("./plugins/workspaces/workspace-finance-ledger"),
  () => import("./plugins/workspaces/workspace-teacher-whiteboard"),
  () => import("./plugins/workspaces/workspace-marketing-studio"),
  () => import("./plugins/workspaces/workspace-automation-flow"),
  () => import("./plugins/workspaces/workspace-developer-ide"),
  () => import("./plugins/workspaces/workspace-designer-image"),
  () => import("./plugins/workspaces/workspace-creator-audio"),
  () => import("./plugins/workspaces/workspace-creator-video"),
  () => import("./plugins/workspaces/workspace-automotive-garage"),
  () => import("./plugins/workspaces/workspace-juridico"),
  () => import("./plugins/workspaces/workspace-assistente-tecnico"),
  () => import("./plugins/workspaces/workspace-personal-assistant"),
  () => import("./plugins/workspaces/workspace-home-ia"),
  () => import("./plugins/workspaces/workspace-cyber-security"),
];

const HamptonAvatar = lazy(() => import("./components/HamptonAvatar").then(m => ({ default: m.HamptonAvatar })));
const HamptonWolf = lazy(() => import("./components/HamptonWolf").then(m => ({ default: m.HamptonWolf })));
const SettingsPanel = lazy(() => import("./components/SettingsPanel").then(m => ({ default: m.SettingsPanel })));
const AgentModelsPanel = lazy(() => import("./components/AgentModelsPanel").then(m => ({ default: m.AgentModelsPanel })));
const AutomationPanel = lazy(() => import("./components/AutomationPanel").then(m => ({ default: m.AutomationPanel })));
const UsagePanel = lazy(() => import("./components/UsagePanel").then(m => ({ default: m.UsagePanel })));
const ConversationList = lazy(() => import("./components/ConversationList").then(m => ({ default: m.ConversationList })));
const VoicesPicker = lazy(() => import("./components/VoicesPicker").then(m => ({ default: m.VoicesPicker })));
const ModelPicker = lazy(() => import("./components/ModelPicker").then(m => ({ default: m.ModelPicker })));
const WhatsAppPanel = lazy(() => import("./components/WhatsAppPanel").then(m => ({ default: m.WhatsAppPanel })));
const AgentDataPanel = lazy(() => import("./components/AgentDataPanel").then(m => ({ default: m.AgentDataPanel })));
const ProjectsPanel = lazy(() => import("./components/ProjectsPanel").then(m => ({ default: m.ProjectsPanel })));
const FilesPanel = lazy(() => import("./components/FilesPanel").then(m => ({ default: m.FilesPanel })));
const SchedulesPanel = lazy(() => import("./components/SchedulesPanel").then(m => ({ default: m.SchedulesPanel })));
const SocialMediaPanel = lazy(() => import("./components/SocialMediaPanel").then(m => ({ default: m.SocialMediaPanel })));
const MemoryPanel = lazy(() => import("./components/MemoryPanel").then(m => ({ default: m.MemoryPanel })));
const CommandPalette = lazy(() => import("./components/CommandPalette").then(m => ({ default: m.CommandPalette })));
const ExportPanel = lazy(() => import("./components/ExportPanel").then(m => ({ default: m.ExportPanel })));
const AgentPage = lazy(() => import("./components/AgentPage").then(m => ({ default: m.AgentPage })));
const SuportePanel = lazy(() => import("./components/SuportePanel").then(m => ({ default: m.SuportePanel })));
const KeyboardShortcutsModal = lazy(() => import("./components/KeyboardShortcutsModal").then(m => ({ default: m.KeyboardShortcutsModal })));
const ChangelogModal = lazy(() => import("./components/ChangelogModal").then(m => ({ default: m.ChangelogModal })));
const AchievementsPanel = lazy(() => import("./components/AchievementsPanel").then(m => ({ default: m.AchievementsPanel })));
const ActivityLog = lazy(() => import("./components/ActivityLog").then(m => ({ default: m.ActivityLog })));
const EmailPanel = lazy(() => import("./components/EmailPanel").then(m => ({ default: m.EmailPanel })));
const CalendarPanel = lazy(() => import("./components/CalendarPanel").then(m => ({ default: m.CalendarPanel })));
const PWAUpdatePrompt = lazy(() => import("./components/PWAUpdatePrompt").then(m => ({ default: m.PWAUpdatePrompt })));

export function HomeScreen() {
  const { t } = useTranslation();
  const [hamptonState, setHamptonState] = useState<HamptonState>("idle");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [pluginSettingsOpen, setPluginSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [suporteOpen, setSuporteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const focusCountRef = useRef(0);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voicePartial, setVoicePartial] = useState("");
  const [konamiSpinning, setKonamiSpinning] = useState(false);
  const [matrixMode, setMatrixMode] = useState(false);
  const [activityBadge, setActivityBadge] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingAgents(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    WORKSPACE_PLUGINS.forEach((load) => load().catch(() => {}));
    AutoBackup.init(60);
  }, []);

  const spokenUpToRef = useRef(0);

  const voiceSettings = useVoiceSettings();
  const nav = usePanelNavigation();
  const tts = useTTS({ spokenUpToRef });

  const chat = useChat({
    t,
    onHamptonStateChange: setHamptonState,
    speak: tts.speak,
    speakIncremental: tts.speakIncremental,
    speakRemainder: tts.speakRemainder,
    getHamptonReplies: () => getHamptonReplies(t),
    spokenUpToRef,
  });

  const startNewChat = useCallback(() => {
    chat.startNewChat();
  }, [chat]);

  const toast = useToast();
  const konamiBufferRef = useRef<string[]>([]);
  const KONAMI_SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

  const handleEasterEgg = useCallback((eggId: string) => {
    switch (eggId) {
      case "coffee":
        console.log("☕ Here's your coffee!");
        toast.show("☕ Here's your coffee!", "info");
        break;
      case "hal":
        console.log("I'm sorry, Dave. I'm afraid I can't do that.");
        toast.show("🖥️ I'm sorry, Dave. I'm afraid I can't do that.", "info");
        break;
      case "42":
        console.log("The answer to life, the universe and everything is 42.");
        toast.show("🔢 The answer to life, the universe and everything is 42.", "info");
        break;
      case "matrix":
        toast.show("💊 Welcome to the real world.", "info");
        setMatrixMode(true);
        setTimeout(() => setMatrixMode(false), 2000);
        break;
      case "konami":
        break;
    }
    const eggs = getAllEggs();
    if (eggs.length > 0 && eggs.every(e => e.discovered)) {
      unlockAchievement("all_eggs");
    }
  }, [toast]);

  const msgCountRef = useRef(0);
  const usedAgentsRef = useRef<Set<string>>(new Set());

  const handleSelectAgent = useCallback((name: string) => {
    chat.openAgentChat(name);
    usedAgentsRef.current.add(name);
    const agents = getAgents(t);
    if (agents.every(a => usedAgentsRef.current.has(a.name))) {
      unlockAchievement("all_agents");
    }
  }, [chat.openAgentChat, t]);

  const handleSendWithEggs = useCallback((text: string, image?: AttachedImage) => {
    const eggId = checkEasterEgg(text);
    if (eggId) handleEasterEgg(eggId);
    chat.handleSend(text, image);
    msgCountRef.current += 1;
    const count = msgCountRef.current;
    if (count === 1) unlockAchievement("first_message");
    else if (count === 10) unlockAchievement("ten_messages");
    else if (count === 100) unlockAchievement("hundred_messages");
    progressAchievement("ten_messages", (count / 10) * 100);
    progressAchievement("hundred_messages", (count / 100) * 100);
  }, [chat.handleSend, handleEasterEgg]);

  const voice = useVoice({
    onTranscript: (text) => chat.handleSend(text),
    onStateChange: (state) => setHamptonState(state),
    onVolume: setVoiceVolume,
    onPartialTranscript: setVoicePartial,
    onStopTTS: tts.stopTTS,
    wakeWordEnabled: voiceSettings.wakeWordEnabled,
    whisperConfig: voiceSettings.whisperUrl ? { baseUrl: voiceSettings.whisperUrl, language: "pt" } : undefined,
    conversationalMode: voiceSettings.conversationalMode,
    externalHamptonState: hamptonState,
    noiseSuppression: voiceSettings.noiseSuppression,
    responseDelay: voiceSettings.responseDelay,
    t,
  });

  useKeyboardShortcuts({ nav, setCommandPaletteOpen, setProfileOpen, setTelegramOpen });

  useEffect(() => {
    if (!isElectron || !window.orun.activity?.onNewEntry) return;
    const unsub = window.orun.activity.onNewEntry(() => {
      if (!nav.activityOpen) setActivityBadge((p) => p + 1);
    });
    return unsub;
  }, [nav.activityOpen]);

  useEffect(() => {
    if (nav.activityOpen) setActivityBadge(0);
  }, [nav.activityOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      konamiBufferRef.current.push(e.key);
      if (konamiBufferRef.current.length > KONAMI_SEQUENCE.length) {
        konamiBufferRef.current.shift();
      }
      if (konamiBufferRef.current.length === KONAMI_SEQUENCE.length &&
          konamiBufferRef.current.every((k, i) => k === KONAMI_SEQUENCE[i])) {
        konamiBufferRef.current = [];
        setKonamiSpinning(true);
        setTimeout(() => setKonamiSpinning(false), 2000);
        unlockAchievement("konami");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => () => chat.cleanup(), [chat.cleanup]);

  useEffect(() => {
    if (!isElectron) return;
    const skipResume = sessionStorage.getItem("orun-skip-resume");
    if (skipResume) { sessionStorage.removeItem("orun-skip-resume"); return; }
    chat.autoResumeLastConversation();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const { workspaceId } = (e as CustomEvent).detail;
      if (!workspaceId) return;
      const PLUGIN_MAP: Record<string, string> = {
        health: "Health", finance: "Finance", developer: "Developer",
        marketing: "Marketing", designer: "Designer", teacher: "Teacher",
        system: "System", "automation-flow": "Automation",
        "automotive-garage": "Automotive", "creator-audio": "Creator_Audio",
        "creator-video": "Creator_Audio",
        "personal-assistant": "PersonalAssistant",
        "juridico": "Juridico",
        "assistente-tecnico": "AssistenteTecnico",
        "suporte": "Suporte",
        "home-ia": "HomeIA",
        "cyber-security": "CyberSecurity",
      };
      nav.setWorkspaceOpen(PLUGIN_MAP[workspaceId] || workspaceId);
    };
    window.addEventListener("workspace:open", handler);
    return () => window.removeEventListener("workspace:open", handler);
  }, [nav]);

  const isStreaming = hamptonState === "speaking" || hamptonState === "thinking";
  const anyPanelOpen = nav.anyPanelOpen;
  const agents = getAgents(t);
  const currentAgent = chat.activeAgent ? agents.find(a => a.name === chat.activeAgent) : null;
  const workspacePluginId = nav.workspaceOpen ? getWorkspacePluginId(nav.workspaceOpen) : null;

  const handleSlashCommand = useCallback((cmd: string) => {
    if (cmd === "vozes") nav.setVoicesOpen(true);
    else if (cmd === "model") nav.setModelPickerOpen(true);
    else if (cmd === "limpar") chat.startNewChat();
    else if (cmd === "historico") nav.setHistoryOpen(true);
    else if (cmd === "agentes") nav.setAgentsOpen(true);
    else if (cmd === "resumir") chat.handleSend("Resuma esta conversa");
    else if (cmd === "exportar") chat.handleSend("Exporte esta conversa");
    else if (cmd === "memoria") chat.handleSend("Busque na minha memoria");
    else if (cmd === "ajuda") chat.handleSend("Quais comandos estao disponiveis?");
  }, [nav, chat]);

  return (
    <div className="fixed inset-0 flex pt-8" style={{ background: "var(--background)", ...(matrixMode ? { filter: "invert(1) hue-rotate(180deg)", transition: "filter 0.5s ease" } : { transition: "filter 0.5s ease" }) }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-[var(--primary-foreground)] focus:rounded">
        {t("skipToContent")}
      </a>

      {!focusMode && (
        <Sidebar
          activeNav={nav.activeNav}
          onNavClick={nav.handleNavClick}
          onSettingsClick={() => nav.setSettingsOpen(p => !p)}
          onHistoryClick={() => { nav.setHistoryOpen(p => !p); nav.setAgentsOpen(false); }}
          onPluginsClick={() => setPluginSettingsOpen(p => !p)}
          onProfileClick={() => setProfileOpen(p => !p)}
          onAchievementsClick={() => setAchievementsOpen(p => !p)}
          onActivityClick={() => { nav.setActivityOpen(p => !p); nav.setActiveNav("activity"); }}
          onEmailClick={() => { nav.setEmailOpen(p => !p); nav.setActiveNav("email"); }}
          onCalendarClick={() => { nav.setCalendarOpen(p => !p); nav.setActiveNav("calendar"); }}
          badgeCounts={{ activity: activityBadge }}
        />
      )}

      {/* ── Panel overlays ─────────────────────────────────────────── */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {nav.agentsOpen && (
            loadingAgents ? (
              <div className="fixed inset-y-0 left-16 w-80 z-30 p-4 space-y-4 overflow-y-auto" style={{ background: "var(--background)", borderRight: "1px solid var(--border)" }}>
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <AgentCardSkeleton key={i} />)}
                </div>
              </div>
            ) : (
              <AgentsPanel onClose={() => { nav.setAgentsOpen(false); nav.setActiveNav("home"); }} onSelectAgent={(name) => { nav.setAgentsOpen(false); handleSelectAgent(name); }} onOpenAgentPage={(name) => { nav.setAgentsOpen(false); nav.setAgentPage(name); }} onViewData={(name) => { nav.setAgentsOpen(false); nav.setAgentDataOpen(name); }} />
            )
          )}
          {nav.historyOpen && <ConversationList activeId={chat.conversationId} onClose={() => nav.setHistoryOpen(false)} onSelect={(id) => { chat.openConversation(id); nav.setHistoryOpen(false); }} onNew={() => { startNewChat(); nav.setHistoryOpen(false); }} />}
          {nav.settingsOpen && !nav.agentModelsOpen && !nav.usageOpen && (
            <SettingsPanel onClose={() => nav.setSettingsOpen(false)} onOpenAgentModels={() => { nav.setSettingsOpen(false); nav.setAgentModelsOpen(true); }} onOpenUsage={() => { nav.setSettingsOpen(false); nav.setUsageOpen(true); }} onOpenWhatsApp={() => { nav.setSettingsOpen(false); nav.setWhatsappOpen(true); }} onOpenTelegram={() => { nav.setSettingsOpen(false); setTelegramOpen(true); }} onOpenSuporte={() => { nav.setSettingsOpen(false); setSuporteOpen(true); }} onOpenAchievements={() => { nav.setSettingsOpen(false); setAchievementsOpen(true); }} />
          )}
          {nav.agentModelsOpen && <AgentModelsPanel onClose={() => nav.setAgentModelsOpen(false)} onBack={() => { nav.setAgentModelsOpen(false); nav.setSettingsOpen(true); }} />}
          {nav.usageOpen && <UsagePanel onClose={() => nav.setUsageOpen(false)} onBack={() => { nav.setUsageOpen(false); nav.setSettingsOpen(true); }} />}
          {nav.automationOpen && <AutomationPanel onClose={() => { nav.setAutomationOpen(false); nav.setActiveNav("home"); }} onOpenSchedules={() => nav.setSchedulesOpen(true)} onOpenSocialMedia={() => nav.setSocialMediaOpen(true)} />}
          {nav.schedulesOpen && <SchedulesPanel onClose={() => { nav.setSchedulesOpen(false); nav.setActiveNav("home"); }} />}
          {nav.voicesOpen && <VoicesPicker onClose={() => nav.setVoicesOpen(false)} />}
          {nav.modelPickerOpen && <ModelPicker onClose={() => nav.setModelPickerOpen(false)} />}
          {nav.whatsappOpen && <WhatsAppPanel onClose={() => nav.setWhatsappOpen(false)} />}
          {nav.agentDataOpen && <AgentDataPanel agent={nav.agentDataOpen as "Finance" | "Health" | "Developer" | "Teacher" | "Creator" | "Designer"} onClose={() => nav.setAgentDataOpen(null)} />}
          {nav.projectsOpen && <ProjectsPanel onClose={() => { nav.setProjectsOpen(false); nav.setActiveNav("home"); }} />}
          {nav.filesOpen && <FilesPanel onClose={() => { nav.setFilesOpen(false); nav.setActiveNav("home"); }} />}
          {nav.memoryOpen && <MemoryPanel onClose={() => { nav.setMemoryOpen(false); nav.setActiveNav("home"); }} />}
          {nav.socialMediaOpen && <SocialMediaPanel onClose={() => { nav.setSocialMediaOpen(false); nav.setActiveNav("home"); }} onSelectAgent={(name) => { nav.setSocialMediaOpen(false); nav.setActiveNav("home"); handleSelectAgent(name); }} />}
          {nav.exportImportOpen && <ExportPanel onClose={() => nav.setExportImportOpen(false)} />}
          {nav.activityOpen && <ActivityLog onClose={() => { nav.setActivityOpen(false); nav.setActiveNav("home"); }} />}
          {nav.emailOpen && <EmailPanel onClose={() => { nav.setEmailOpen(false); nav.setActiveNav("home"); }} />}
          {nav.calendarOpen && <CalendarPanel onClose={() => { nav.setCalendarOpen(false); nav.setActiveNav("home"); }} />}
          {pluginSettingsOpen && <PluginSettings onClose={() => setPluginSettingsOpen(false)} />}
          {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
          {telegramOpen && <TelegramPanel onClose={() => setTelegramOpen(false)} />}
          {nav.agentPage && (
            <AgentPage agent={nav.agentPage} onClose={() => nav.setAgentPage(null)} onStartChat={(name) => { nav.setAgentPage(null); handleSelectAgent(name); }} onOpenWorkspace={(name) => { nav.setAgentPage(null); chat.openAgentChat(name); nav.setWorkspaceOpen(name); }} />
          )}
          {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
          {changelogOpen && <ChangelogModal onClose={() => setChangelogOpen(false)} />}
          {suporteOpen && <SuportePanel onClose={() => setSuporteOpen(false)} />}
          {achievementsOpen && <AchievementsPanel onClose={() => setAchievementsOpen(false)} />}
        </AnimatePresence>
      </Suspense>

      {anyPanelOpen && <div className="fixed inset-0 z-20" onClick={() => { nav.closeAll(); nav.setActiveNav("home"); setPluginSettingsOpen(false); setProfileOpen(false); setAchievementsOpen(false); setTelegramOpen(false); setSuporteOpen(false); setShortcutsOpen(false); setChangelogOpen(false); }} />}

      {/* ── Main content ──────────────────────────────────────────── */}
      <div id="main-content" className={`flex-1 flex flex-col ${focusMode ? '' : 'ml-16'} overflow-hidden relative`}>
        {focusMode ? (
          <div className="flex items-center justify-end px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <button
              onClick={() => setFocusMode(false)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-[var(--accent)]"
              style={{ color: "var(--muted-foreground)" }}
              title={t("focus_mode_exit")}
              aria-label={t("focus_mode_exit")}
            >
              <Focus size={14} />
              <span className="text-xs">{t("focus_mode_exit")}</span>
            </button>
          </div>
        ) : (
          <StatusBar onOpenModelPicker={() => nav.setModelPickerOpen(true)} hamptonState={hamptonState} />
        )}
        {!focusMode && (
          <button
            onClick={() => {
              setFocusMode(true);
              focusCountRef.current += 1;
              progressAchievement("focus_mode", (focusCountRef.current / 5) * 100);
              if (focusCountRef.current >= 5) unlockAchievement("focus_mode");
            }}
            className="absolute top-3 right-4 z-50 p-1.5 rounded-md transition-colors hover:bg-[var(--accent)]"
            style={{ color: "var(--muted-foreground)" }}
            title={t("focus_mode")}
            aria-label={t("focus_mode")}
          >
            <Focus size={14} />
          </button>
        )}
        <OfflineBanner />

        {workspacePluginId && hasPlugin(workspacePluginId) ? (
          <WorkspaceView
            workspacePluginId={workspacePluginId}
            hamptonState={hamptonState}
            messages={chat.messages}
            onSendMessage={chat.handleSend}
            onMicClick={voice.toggleRecording}
            voiceVolume={voiceVolume}
            partialTranscript={voicePartial}
            onClose={() => { nav.setWorkspaceOpen(null); nav.setActiveNav("home"); }}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden pb-12">
            <AnimatePresence mode="wait">
              {!chat.chatMode ? (
                <motion.div className="flex-1 flex items-center justify-center" animate={konamiSpinning ? { rotate: 360, scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.8 }}>
                  <Suspense fallback={null}>
                    <HamptonAvatar state={hamptonState} />
                  </Suspense>
                </motion.div>
              ) : (
                <ChatView
                  messages={chat.messages}
                  hamptonState={hamptonState}
                  isStreaming={isStreaming}
                  isLoadingMessages={chat.isLoadingMessages}
                  activeAgentName={chat.activeAgent}
                  onStopStreaming={chat.stopStreaming}
                  onEditMessage={chat.editMessage}
                  onRegenerate={chat.regenerate}
                  onStartNewChat={startNewChat}
                  speechEnabled={tts.speechEnabled}
                  hasVoiceConfigured={tts.hasVoiceConfigured}
                  onToggleSpeech={() => tts.setSpeechEnabled(p => !p)}
                />
              )}
            </AnimatePresence>

            <VoiceLevelBar
              volume={voiceVolume}
              active={hamptonState === "listening" || hamptonState === "thinking"}
              state={hamptonState}
            />
            <ChatInput
              onSend={handleSendWithEggs}
              onMicClick={voice.toggleRecording}
              listening={hamptonState === "listening"}
              volume={voiceVolume}
              partialTranscript={voicePartial}
              onSlashCommand={handleSlashCommand}
            />
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onNavigate={(id) => {
          if (id === "home") nav.setActiveNav("home");
          else if (id === "agents") nav.setAgentsOpen(true);
          else if (id === "projects") nav.setProjectsOpen(true);
          else if (id === "settings") nav.setSettingsOpen(true);
          else if (id === "history") nav.setHistoryOpen(true);
        }} onAgentSelect={(name) => handleSelectAgent(name)} onNewChat={startNewChat} />
      </Suspense>

      {nav.exportImportOpen && <div className="fixed inset-0 z-20" onClick={() => nav.setExportImportOpen(false)} />}

      <Suspense fallback={null}>
        <PWAUpdatePrompt />
      </Suspense>

      {/* CRT scan line + vignette overlays */}
      <div className="fixed inset-0 pointer-events-none z-[9990]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 55% 45%, rgba(192,0,24,0.038) 0%, transparent 55%)" }} />
    </div>
  );
}

import { useEffect, useRef, useState, useCallback, Suspense, lazy } from "react";
import { AnimatePresence } from "motion/react";
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
import { AvatarHome } from "./components/AvatarHome";
import { ChatView } from "./components/ChatView";
import { WorkspaceView } from "./components/WorkspaceView";
import { PluginSettings } from "./plugins/PluginSettings";
import { ProfilePanel } from "./components/ProfilePanel";
import { TelegramPanel } from "./components/TelegramPanel";
import { OfflineBanner } from "./components/OfflineBanner";
import { hasPlugin, getWorkspacePluginId } from "./plugins/PluginRegistry";

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
  () => import("./plugins/workspaces/workspace-automotive-garage"),
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

export function HomeScreen() {
  const { t } = useTranslation();
  const [hamptonState, setHamptonState] = useState<HamptonState>("idle");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [pluginSettingsOpen, setPluginSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voicePartial, setVoicePartial] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoadingAgents(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    WORKSPACE_PLUGINS.forEach((load) => load().catch(() => {}));
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

  useEffect(() => () => chat.cleanup(), [chat.cleanup]);

  useEffect(() => {
    if (!isElectron) return;
    const skipResume = sessionStorage.getItem("orun-skip-resume");
    if (skipResume) { sessionStorage.removeItem("orun-skip-resume"); return; }
    chat.autoResumeLastConversation();
  }, []);

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
    <div className="fixed inset-0 flex pt-8" style={{ background: "var(--background)" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--primary)] focus:text-[var(--primary-foreground)] focus:rounded">
        {t("skipToContent")}
      </a>

      <Sidebar
        activeNav={nav.activeNav}
        onNavClick={nav.handleNavClick}
        onSettingsClick={() => nav.setSettingsOpen(true)}
        onHistoryClick={() => { nav.setHistoryOpen(p => !p); nav.setAgentsOpen(false); }}
        onPluginsClick={() => setPluginSettingsOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
      />

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
              <AgentsPanel onClose={() => { nav.setAgentsOpen(false); nav.setActiveNav("home"); }} onSelectAgent={(name) => { nav.setAgentsOpen(false); chat.openAgentChat(name); }} onOpenAgentPage={(name) => { nav.setAgentsOpen(false); nav.setAgentPage(name); }} onViewData={(name) => { nav.setAgentsOpen(false); nav.setAgentDataOpen(name); }} />
            )
          )}
          {nav.historyOpen && <ConversationList activeId={chat.conversationId} onClose={() => nav.setHistoryOpen(false)} onSelect={(id) => { chat.openConversation(id); nav.setHistoryOpen(false); }} onNew={() => { startNewChat(); nav.setHistoryOpen(false); }} />}
          {nav.settingsOpen && !nav.agentModelsOpen && !nav.usageOpen && (
            <SettingsPanel onClose={() => nav.setSettingsOpen(false)} onOpenAgentModels={() => { nav.setSettingsOpen(false); nav.setAgentModelsOpen(true); }} onOpenUsage={() => { nav.setSettingsOpen(false); nav.setUsageOpen(true); }} onOpenWhatsApp={() => { nav.setSettingsOpen(false); nav.setWhatsappOpen(true); }} onOpenTelegram={() => { nav.setSettingsOpen(false); setTelegramOpen(true); }} />
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
          {nav.socialMediaOpen && <SocialMediaPanel onClose={() => { nav.setSocialMediaOpen(false); nav.setActiveNav("home"); }} onSelectAgent={(name) => { nav.setSocialMediaOpen(false); nav.setActiveNav("home"); chat.openAgentChat(name); }} />}
          {nav.exportImportOpen && <ExportPanel onClose={() => nav.setExportImportOpen(false)} />}
          {pluginSettingsOpen && <PluginSettings onClose={() => setPluginSettingsOpen(false)} />}
          {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
          {telegramOpen && <TelegramPanel onClose={() => setTelegramOpen(false)} />}
          {nav.agentPage && (
            <AgentPage agent={nav.agentPage} onClose={() => nav.setAgentPage(null)} onStartChat={(name) => { nav.setAgentPage(null); chat.openAgentChat(name); }} onOpenWorkspace={(name) => { nav.setAgentPage(null); chat.openAgentChat(name); nav.setWorkspaceOpen(name); }} />
          )}
        </AnimatePresence>
      </Suspense>

      {anyPanelOpen && <div className="fixed inset-0 z-20" onClick={() => { nav.setAgentsOpen(false); nav.setHistoryOpen(false); nav.setActiveNav("home"); }} />}

      {/* ── Main content ──────────────────────────────────────────── */}
      <div id="main-content" className="flex-1 flex flex-col ml-16 overflow-hidden">
        <StatusBar onOpenModelPicker={() => nav.setModelPickerOpen(true)} hamptonState={hamptonState} />
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
          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {!chat.chatMode ? (
                <AvatarHome hamptonState={hamptonState} />
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
              onSend={chat.handleSend}
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
        }} onAgentSelect={(name) => chat.openAgentChat(name)} onNewChat={startNewChat} />
      </Suspense>

      {nav.exportImportOpen && <div className="fixed inset-0 z-20" onClick={() => nav.setExportImportOpen(false)} />}

      {/* CRT scan line + vignette overlays */}
      <div className="fixed inset-0 pointer-events-none z-[9990]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 55% 45%, rgba(192,0,24,0.038) 0%, transparent 55%)" }} />
    </div>
  );
}

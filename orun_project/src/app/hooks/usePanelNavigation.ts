import { useReducer, useCallback, useEffect, useRef } from "react";

// ── Reducer state & actions ──────────────────────────────────────────────────

interface PanelState {
  currentPanel: string | null;
  agentDataOpen: string | null;
  agentPage: string | null;
  activeNav: string;
  workspaceOpen: string | null;
}

type PanelAction =
  | { type: "SET_PANEL"; panel: string; valueOrFn: boolean | ((prev: boolean) => boolean) }
  | { type: "SET_AGENT_DATA_OPEN"; value: string | null }
  | { type: "SET_AGENT_PAGE"; value: string | null }
  | { type: "SET_ACTIVE_NAV"; value: string }
  | { type: "SET_WORKSPACE_OPEN"; value: string | null }
  | { type: "TOGGLE"; panel: string }
  | { type: "SHOW"; panel: string }
  | { type: "HIDE" }
  | { type: "CLOSE_ALL" };

const initialState: PanelState = {
  currentPanel: null,
  agentDataOpen: null,
  agentPage: null,
  activeNav: "home",
  workspaceOpen: null,
};

function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "SET_PANEL": {
      const currentValue = state.currentPanel === action.panel;
      const nextValue =
        typeof action.valueOrFn === "function"
          ? action.valueOrFn(currentValue)
          : action.valueOrFn;
      if (nextValue) return { ...state, currentPanel: action.panel };
      return state.currentPanel === action.panel
        ? { ...state, currentPanel: null }
        : state;
    }
    case "SET_AGENT_DATA_OPEN":
      return { ...state, agentDataOpen: action.value };
    case "SET_AGENT_PAGE":
      return { ...state, agentPage: action.value };
    case "SET_ACTIVE_NAV":
      return { ...state, activeNav: action.value };
    case "SET_WORKSPACE_OPEN":
      return { ...state, workspaceOpen: action.value };
    case "TOGGLE":
      return {
        ...state,
        currentPanel: state.currentPanel === action.panel ? null : action.panel,
      };
    case "SHOW":
      return { ...state, currentPanel: action.panel };
    case "HIDE":
      return { ...state, currentPanel: null };
    case "CLOSE_ALL":
      return {
        ...state,
        currentPanel: null,
        agentDataOpen: null,
        agentPage: null,
        workspaceOpen: null,
      };
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePanelNavigation(onNewChat?: () => void) {
  const [state, dispatch] = useReducer(panelReducer, initialState);

  const onNewChatRef = useRef(onNewChat);
  onNewChatRef.current = onNewChat;

  // ── Boolean panel setters (supports value or functional updater) ────────

  const makePanelSetter = useCallback(
    (panel: string) =>
      (valueOrFn: boolean | ((prev: boolean) => boolean)) =>
        dispatch({ type: "SET_PANEL", panel, valueOrFn }),
    [],
  );

  const setAgentsOpen = useCallback(makePanelSetter("agents"), []);
  const setHistoryOpen = useCallback(makePanelSetter("history"), []);
  const setSettingsOpen = useCallback(makePanelSetter("settings"), []);
  const setAgentModelsOpen = useCallback(makePanelSetter("agentModels"), []);
  const setUsageOpen = useCallback(makePanelSetter("usage"), []);
  const setRouterOpen = useCallback(makePanelSetter("router"), []);
  const setAutomationOpen = useCallback(makePanelSetter("automation"), []);
  const setSchedulesOpen = useCallback(makePanelSetter("schedules"), []);
  const setVoicesOpen = useCallback(makePanelSetter("voices"), []);
  const setModelPickerOpen = useCallback(makePanelSetter("modelPicker"), []);
  const setWhatsappOpen = useCallback(makePanelSetter("whatsapp"), []);
  const setProjectsOpen = useCallback(makePanelSetter("projects"), []);
  const setFilesOpen = useCallback(makePanelSetter("files"), []);
  const setMemoryOpen = useCallback(makePanelSetter("memory"), []);
  const setNeuralOpen = useCallback(makePanelSetter("neural"), []);
  const setSkillsOpen = useCallback(makePanelSetter("skills"), []);
  const setPlannerOpen = useCallback(makePanelSetter("planner"), []);
  const setAgentHubOpen = useCallback(makePanelSetter("agentHub"), []);
  const setAnalyticsOpen = useCallback(makePanelSetter("analytics"), []);
  const setSocialMediaOpen = useCallback(makePanelSetter("socialMedia"), []);
  const setExportImportOpen = useCallback(makePanelSetter("exportImport"), []);
  const setActivityOpen = useCallback(makePanelSetter("activity"), []);
  const setEmailOpen = useCallback(makePanelSetter("email"), []);
  const setCalendarOpen = useCallback(makePanelSetter("calendar"), []);
  const setDashboardOpen = useCallback(makePanelSetter("dashboard"), []);

  // ── Non-panel setters ────────────────────────────────────────────────────

  const setAgentDataOpen = useCallback(
    (value: string | null) => dispatch({ type: "SET_AGENT_DATA_OPEN", value }),
    [],
  );
  const setAgentPage = useCallback(
    (value: string | null) => dispatch({ type: "SET_AGENT_PAGE", value }),
    [],
  );
  const setActiveNav = useCallback(
    (value: string) => dispatch({ type: "SET_ACTIVE_NAV", value }),
    [],
  );
  const setWorkspaceOpen = useCallback(
    (value: string | null) => dispatch({ type: "SET_WORKSPACE_OPEN", value }),
    [],
  );

  // ── Convenience actions ──────────────────────────────────────────────────

  const togglePanel = useCallback(
    (panel: string) => dispatch({ type: "TOGGLE", panel }),
    [],
  );
  const showPanel = useCallback(
    (panel: string) => dispatch({ type: "SHOW", panel }),
    [],
  );
  const hidePanel = useCallback(() => dispatch({ type: "HIDE" }), []);
  const closeAll = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);

  // ── Navigation click handler ─────────────────────────────────────────────

  const handleNavClick = useCallback(
    (id: string) => {
      setActiveNav(id);
      setAgentsOpen(id === "agents");
      if (id === "agents") setHistoryOpen(false);
      if (id === "automation") setAutomationOpen(true);
      if (id === "projects") setProjectsOpen(true);
      if (id === "files") setFilesOpen(true);
      if (id === "memory") setMemoryOpen(true);
      if (id === "neural") setNeuralOpen(true);
      if (id === "skills") setSkillsOpen(true);
      if (id === "planner") setPlannerOpen(true);
      if (id === "agentHub") setAgentHubOpen(true);
      if (id === "analytics") setAnalyticsOpen(true);
      if (id === "groupFeed") setWorkspaceOpen("GroupFeed");
    },
    [setActiveNav, setAgentsOpen, setHistoryOpen, setAutomationOpen, setProjectsOpen, setFilesOpen, setMemoryOpen, setNeuralOpen, setSkillsOpen, setPlannerOpen, setAgentHubOpen, setAnalyticsOpen, setWorkspaceOpen],
  );

  // ── Escape key closes all panels ─────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch({ type: "CLOSE_ALL" });
        setActiveNav("home");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        onNewChatRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived boolean state ────────────────────────────────────────────────

  const agentsOpen = state.currentPanel === "agents";
  const historyOpen = state.currentPanel === "history";
  const settingsOpen = state.currentPanel === "settings";
  const agentModelsOpen = state.currentPanel === "agentModels";
  const usageOpen = state.currentPanel === "usage";
  const routerOpen = state.currentPanel === "router";
  const automationOpen = state.currentPanel === "automation";
  const schedulesOpen = state.currentPanel === "schedules";
  const voicesOpen = state.currentPanel === "voices";
  const modelPickerOpen = state.currentPanel === "modelPicker";
  const whatsappOpen = state.currentPanel === "whatsapp";
  const projectsOpen = state.currentPanel === "projects";
  const filesOpen = state.currentPanel === "files";
  const memoryOpen = state.currentPanel === "memory";
  const neuralOpen = state.currentPanel === "neural";
  const skillsOpen = state.currentPanel === "skills";
  const plannerOpen = state.currentPanel === "planner";
  const agentHubOpen = state.currentPanel === "agentHub";
  const analyticsOpen = state.currentPanel === "analytics";
  const socialMediaOpen = state.currentPanel === "socialMedia";
  const exportImportOpen = state.currentPanel === "exportImport";
  const activityOpen = state.currentPanel === "activity";
  const emailOpen = state.currentPanel === "email";
  const calendarOpen = state.currentPanel === "calendar";
  const dashboardOpen = state.currentPanel === "dashboard";
  const anyPanelOpen = state.currentPanel !== null || state.agentDataOpen !== null || state.agentPage !== null;

  return {
    // State
    agentsOpen, historyOpen, settingsOpen, agentModelsOpen, usageOpen,
    routerOpen,
    automationOpen, schedulesOpen, voicesOpen, modelPickerOpen, whatsappOpen,
    agentDataOpen: state.agentDataOpen, agentPage: state.agentPage,
    projectsOpen, filesOpen, memoryOpen, neuralOpen, skillsOpen, socialMediaOpen,
    exportImportOpen, activityOpen, emailOpen, calendarOpen, dashboardOpen, activeNav: state.activeNav, anyPanelOpen,
    workspaceOpen: state.workspaceOpen,
    plannerOpen,
    agentHubOpen,
    analyticsOpen,
    // Setters
    setAgentsOpen, setHistoryOpen, setSettingsOpen, setAgentModelsOpen,
    setUsageOpen, setRouterOpen, setAutomationOpen, setSchedulesOpen, setVoicesOpen,
    setModelPickerOpen, setWhatsappOpen, setAgentDataOpen, setAgentPage,
    setProjectsOpen, setFilesOpen, setMemoryOpen, setNeuralOpen, setSkillsOpen, setSocialMediaOpen,
    setExportImportOpen, setActivityOpen, setEmailOpen, setCalendarOpen, setDashboardOpen, setActiveNav, setWorkspaceOpen,
    setPlannerOpen,
    setAgentHubOpen,
    setAnalyticsOpen,
    // Actions
    handleNavClick, closeAll, togglePanel, showPanel, hidePanel,
  };
}

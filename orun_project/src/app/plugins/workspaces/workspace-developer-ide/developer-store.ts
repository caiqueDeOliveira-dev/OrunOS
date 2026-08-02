import { createStore } from "../../lib/store";
import type { IDEState, TerminalTab } from "./developer-types";
import { generateId } from "./developer-types";

const STORAGE_KEY = "orun_developer_state";

function loadPersisted(): Partial<IDEState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function persist(state: IDEState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      files: state.files,
      rootIds: state.rootIds,
      openTabs: state.openTabs,
      activeFileId: state.activeFileId,
      terminalTabs: state.terminalTabs,
      activeTerminal: state.activeTerminal,
      sidebarVisible: state.sidebarVisible,
      sidebarWidth: state.sidebarWidth,
      showMinimap: state.showMinimap,
      showTerminal: state.showTerminal,
      terminalHeight: state.terminalHeight,
    }));
  } catch {}
}

const DEFAULT_TERMINAL: TerminalTab = {
  id: "term-1", label: "bash", lines: [
    { id: "welcome", type: "output", text: "Orun OS Developer Terminal v1.0" },
    { id: "welcome2", type: "output", text: "Type 'help' for available commands" },
  ],
};

const defaults: IDEState = {
  files: {},
  rootIds: [],
  activeFileId: null,
  openTabs: [],
  terminalTabs: [DEFAULT_TERMINAL],
  activeTerminal: "term-1",
  showTerminal: true,
  terminalHeight: 180,
  sidebarVisible: true,
  sidebarWidth: 220,
  activeSidebarTab: "explorer",
  searchQuery: "",
  searchResults: [],
  gitStatus: null,
  showMinimap: true,
  contextMenu: null,
  isCreatingFile: false,
  creatingInFolder: "",
  creatingIsFolder: false,
  newFileName: "",
  cursorLine: 1,
  cursorCol: 1,
};

const persisted = loadPersisted();
const initialState: IDEState = { ...defaults, ...persisted };

export const useIDEStore = createStore<IDEState>(initialState);

const origSetState = useIDEStore.setState.bind(useIDEStore);
useIDEStore.setState = (updater: any) => {
  origSetState(updater);
  const next = useIDEStore.getState();
  persist(next);
};

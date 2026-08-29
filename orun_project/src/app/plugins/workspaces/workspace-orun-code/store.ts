// plugins/workspaces/workspace-orun-code/store.ts
import { createStore } from "../../lib/store";
import type { OrunCodeState, TerminalLine } from "./types";
import { generateId } from "./types";

const STORAGE_KEY = "orun_code_state";

function loadPersisted(): Partial<OrunCodeState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function persist(state: OrunCodeState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        files: state.files,
        rootIds: state.rootIds,
        openTabs: state.openTabs,
        activeFileId: state.activeFileId,
        sidebarWidth: state.sidebarWidth,
        sidebarVisible: state.sidebarVisible,
        showMinimap: state.showMinimap,
        githubDoctorStaleDays: state.githubDoctorStaleDays,
        aiChat: state.aiChat,
        aiContext: state.aiContext,
        aiChanges: state.aiChanges,
        aiMode: state.aiMode,
      })
    );
  } catch {}
}

const WELCOME_TERMINAL: TerminalLine[] = [
  { id: "w1", type: "output", text: "Orun Code — Engineering Terminal v0.1" },
  { id: "w2", type: "output", text: "Use 'help' para comandos. Mude o mode Orun AI para ACT para aplicar mudanças." },
];

const DEFAULT_CHAT = [
  {
    id: "greet",
    role: "system" as const,
    text: "Orun Code pronto. Estou no mode Plan — analiso e proponho sem alterar arquivos.",
    ts: Date.now(),
  },
];

const DEFAULT_FILES: Record<string, FileNodeLike> = {
  root: { id: "root", name: "orun-project", type: "folder", children: [], expanded: true },
};

interface FileNodeLike {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: string[];
  expanded?: boolean;
}

const defaults: OrunCodeState = {
  files: DEFAULT_FILES,
  rootIds: ["root"],
  activeFileId: null,
  openTabs: [],
  sidebarVisible: true,
  sidebarWidth: 230,
  activeSidebarTab: "explorer",
  searchQuery: "",
  searchResults: [],
  gitStatus: null,
  showMinimap: true,

  githubAuth: null,
  githubRepos: [],
  githubReposLoading: false,
  githubReposFilter: "",
  githubError: null,
  githubDeleteTarget: null,
  githubNotice: null,
  githubGitBusy: false,
  githubGitResult: null,
  githubGitBranch: "",
  githubDoctorTab: "repos",
  githubDoctorReport: null,
  githubDoctorStaleDays: 90,
  githubDoctorLoading: false,
  cursorLine: 1,
  cursorCol: 1,

  bottomOpen: true,
  bottomHeight: 170,
  activeBottomTab: "terminal",
  terminalLines: WELCOME_TERMINAL,
  problems: [],
  tests: [],
  agentLog: [],
  mcpServers: [
    { id: "mcp-git", name: "Git", status: "connected", tools: 8 },
    { id: "mcp-fs", name: "Filesystem", status: "connected", tools: 6 },
    { id: "mcp-supabase", name: "Supabase", status: "disconnected", tools: 12 },
  ],

  aiPanelOpen: true,
  aiPanelTab: "chat",
  aiMode: "plan",
  aiChat: DEFAULT_CHAT,
  aiInput: "",
  aiContext: [
    { id: "ctx-1", kind: "folder", label: "src/", detail: "pasta raiz do código" },
    { id: "ctx-2", kind: "git", label: "main", detail: "branch atual" },
  ],
  aiChanges: [],
  aiPlanSteps: [],
};

const persisted = loadPersisted();
const initialState: OrunCodeState = { ...defaults, ...persisted };

export const useOrunCodeStore = createStore<OrunCodeState>(initialState);

const origSetState = useOrunCodeStore.setState.bind(useOrunCodeStore);
useOrunCodeStore.setState = (updater: any) => {
  origSetState(updater);
  const next = useOrunCodeStore.getState();
  persist(next);
};

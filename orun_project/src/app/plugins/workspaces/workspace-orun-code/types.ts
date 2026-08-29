// plugins/workspaces/workspace-orun-code/types.ts
// Orun Code — types for the engineering workspace + Orun AI layer.

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: string;
  content?: string;
  path?: string;
  children?: string[];
  expanded?: boolean;
}

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error";
  text: string;
}

export interface SearchMatch {
  fileId: string;
  fileName: string;
  line: number;
  content: string;
}

export interface GitFileStatus {
  path: string;
  status: "M" | "A" | "D" | "R" | "?";
}

export interface GitStatus {
  branch: string;
  changes: number;
  staged: number;
  files: GitFileStatus[];
}

// ── Orun AI ─────────────────────────────────────────────────────────────

export type AIChatRole = "user" | "assistant" | "system";

export interface AIChatMessage {
  id: string;
  role: AIChatRole;
  text: string;
  mode?: string;
  ts: number;
  pending?: boolean;
}

export interface AIContextEntry {
  id: string;
  kind: "file" | "folder" | "symbol" | "rule" | "memory" | "git";
  label: string;
  detail?: string;
}

export type AIChangesStatus = "pending" | "applied" | "rejected";

export interface AIChangeEntry {
  id: string;
  file: string;
  action: "create" | "edit" | "delete" | "rename";
  summary: string;
  status: AIChangesStatus;
  ts: number;
}

// ── Bottom panel tabs ───────────────────────────────────────────────────

export type BottomTabId = "terminal" | "problems" | "output" | "tests" | "git" | "agentlog" | "mcp";

// ── Store state ─────────────────────────────────────────────────────────

export type OrunCodeState = {
  files: Record<string, FileNode>;
  rootIds: string[];
  activeFileId: string | null;
  openTabs: string[];
  sidebarVisible: boolean;
  sidebarWidth: number;
  activeSidebarTab: string;
  searchQuery: string;
  searchResults: SearchMatch[];
  gitStatus: GitStatus | null;
  showMinimap: boolean;
  cursorLine: number;
  cursorCol: number;

  // Bottom panel
  bottomOpen: boolean;
  bottomHeight: number;
  activeBottomTab: BottomTabId;
  terminalLines: TerminalLine[];
  problems: Array<{ severity: "error" | "warning" | "info"; file: string; line: number; message: string }>;
  tests: Array<{ name: string; status: "passed" | "failed" | "skipped" | "running" }>;
  agentLog: TerminalLine[];
  mcpServers: Array<{ id: string; name: string; status: "connected" | "disconnected" | "connecting"; tools: number }>;

  // Orun AI
  aiPanelOpen: boolean;
  aiPanelTab: "chat" | "context" | "plan" | "changes" | "review";
  aiMode: "plan" | "act";
  aiChat: AIChatMessage[];
  aiInput: string;
  aiContext: AIContextEntry[];
  aiChanges: AIChangeEntry[];
  aiPlanSteps: string[];
};

export const LANG_MAP: Record<string, string> = {
  ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  html: "html", css: "css", scss: "scss", less: "less", json: "json",
  md: "markdown", yml: "yaml", yaml: "yaml", sh: "shell", bash: "shell",
  ps1: "powershell", sql: "sql", graphql: "graphql", xml: "xml",
  svg: "xml", dockerfile: "dockerfile", conf: "conf", ini: "ini",
  toml: "toml", env: "dotenv", gitignore: "ignore", lock: "json",
  c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp",
  swift: "swift", kt: "kotlin", dart: "dart", lua: "lua",
  php: "php", pl: "perl", r: "r", m: "objectivec",
};

export function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "text";
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

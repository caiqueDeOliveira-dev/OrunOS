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

export interface TerminalTab {
  id: string;
  label: string;
  lines: TerminalLine[];
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

export interface ContextMenu {
  x: number;
  y: number;
  fileId: string;
}

export interface CursorPosition {
  line: number;
  col: number;
}

export interface IDEState {[key: string]: unknown;
  files: Record<string, FileNode>;
  rootIds: string[];
  activeFileId: string | null;
  openTabs: string[];
  terminalTabs: TerminalTab[];
  activeTerminal: string;
  showTerminal: boolean;
  terminalHeight: number;
  sidebarVisible: boolean;
  sidebarWidth: number;
  activeSidebarTab: string;
  searchQuery: string;
  searchResults: SearchMatch[];
  gitStatus: GitStatus | null;
  showMinimap: boolean;
  contextMenu: ContextMenu | null;
  isCreatingFile: boolean;
  creatingInFolder: string;
  creatingIsFolder: boolean;
  newFileName: string;
  cursorLine: number;
  cursorCol: number;
}

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

const FILE_ICON_MAP: Record<string, string> = {
  ts: "🔷", tsx: "⚛️", js: "🟨", jsx: "⚛️", py: "🐍", rb: "💎",
  go: "🐹", rs: "🦀", java: "☕", html: "🌐", css: "🎨", scss: "🎨",
  json: "📋", md: "📝", yml: "⚙️", yaml: "⚙️", sh: "💻", bash: "💻",
  ps1: "💻", sql: "🗃️", xml: "📰", svg: "🖼️", toml: "⚙️",
  env: "🔒", gitignore: "🙈", lock: "🔒", dockerfile: "🐳",
  c: "⚡", cpp: "⚡", cs: "💠", swift: "🐦", kt: "🅺", dart: "🎯",
  lua: "🌙", php: "🐘", pl: "🐪", r: "📊",
};

export function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_MAP[ext] || "text";
}

export function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICON_MAP[ext] || "📄";
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function highlightSyntax(code: string, language?: string): string {
  if (!language) return escapeHtml(code);
  let result = escapeHtml(code);

  const patterns: Array<[RegExp, string]> = [
    [/(\/\/.*$)/gm, "rgba(255,255,255,0.25)"],
    [/(\/\*[\s\S]*?\*\/)/g, "rgba(255,255,255,0.25)"],
  ];

  for (const [re, color] of patterns) {
    result = result.replace(re, `<span style="color:${color}">$1</span>`);
  }

  const keywords = [
    "import", "export", "from", "const", "let", "var", "function", "return",
    "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "throw", "new", "typeof", "instanceof", "this", "super", "class", "extends",
    "interface", "type", "enum", "as", "default", "async", "await", "yield",
    "try", "catch", "finally", "in", "of", "with", "debugger", "delete", "void",
    "true", "false", "null", "undefined", "import type", "declare", "namespace",
    "module", "require", "process", "console", "Buffer", "globalThis",
    "String", "Number", "Boolean", "Array", "Object", "Map", "Set", "Promise",
    "Error", "Date", "RegExp", "Function", "Symbol", "BigInt",
    "never", "any", "unknown", "string", "number", "boolean", "void",
    "object", "symbol", "bigint", "null", "undefined", "readonly", "keyof",
    "typeof", "infer", "is", "satisfies", "asserts", "expect", "describe",
    "it", "test", "beforeEach", "afterEach", "beforeAll", "afterAll",
  ];

  const kwColor = "#C00018";
  const sortedKW = [...keywords].sort((a, b) => b.length - a.length);
  for (const kw of sortedKW) {
    result = result.replace(new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "g"), `<span style="color:${kwColor};font-weight:500">$1</span>`);
  }

  result = result.replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;|&#39;(?:[^&]|&(?!#39;))*&#39;|`[^`]*`)/g, '<span style="color:#22C55E">$1</span>');
  result = result.replace(/\b([A-Z][a-zA-Z0-9]+)\b/g, (match) => {
    if (["The", "This", "That", "These", "Those", "With", "From", "When"].includes(match)) return match;
    return `<span style="color:#F59E0B">${match}</span>`;
  });
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#8B5CF6">$1</span>');
  result = result.replace(/(#[a-fA-F0-9]{3,8})\b/g, '<span style="color:#EC4899">$1</span>');
  result = result.replace(/(`[^`]*`)/g, (m) => {
    const inner = m.slice(1, -1);
    const escaped = inner.replace(/&amp;lt;/g, "&lt;").replace(/&amp;gt;/g, "&gt;");
    return `<span style="color:#22C55E">\`${escaped}\`</span>`;
  });

  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ACCENT = "#C00018";

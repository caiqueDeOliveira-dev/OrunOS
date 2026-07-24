// plugins/workspaces/workspace-developer-ide/DeveloperIDE.tsx
//
// Developer workspace — file explorer, code editor with syntax highlighting,
// terminal emulator, and output panel. Fully functional mini-IDE.

import { useState, useCallback, useRef, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerDeveloperActions, unregisterDeveloperActions, setIDEStoreGetter } from "./developer-actions";
import { useTranslation } from "../../../../i18n/I18nProvider";

// ── Types ───────────────────────────────────────────────────────────────

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  language?: string;
  content?: string;
  children?: string[];
  expanded?: boolean;
}

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error";
  text: string;
}

interface IDEState {
  [key: string]: unknown;
  files: Record<string, FileNode>;
  rootIds: string[];
  activeFileId: string | null;
  openTabs: string[];
  terminalLines: TerminalLine[];
  showTerminal: boolean;
}

const useIDEStore = createStore<IDEState>({
  files: {},
  rootIds: [],
  activeFileId: null,
  openTabs: [],
  terminalLines: [],
  showTerminal: true,
});

// ── Syntax Highlighter (basic) ──────────────────────────────────────────

function highlightSyntax(code: string, language?: string): string {
  if (!language) return escapeHtml(code);

  let result = escapeHtml(code);

  // Keywords
  const keywords = ["import", "export", "from", "const", "let", "var", "function", "return", "if", "else", "throw", "new", "typeof", "interface", "type", "extends", "as", "default", "process", "console", "this"];
  keywords.forEach((kw) => {
    result = result.replace(new RegExp(`\\b(${kw})\\b`, "g"), `<span style="color:#C00018">$1</span>`);
  });

  // Strings
  result = result.replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;|&#39;(?:[^&]|&(?!#39;))*&#39;|`[^`]*`)/g, '<span style="color:#22C55E">$1</span>');

  // Types (capitalized words)
  result = result.replace(/\b([A-Z][a-zA-Z]+)\b/g, '<span style="color:#F59E0B">$1</span>');

  // Numbers
  result = result.replace(/\b(\d+)\b/g, '<span style="color:#8B5CF6">$1</span>');

  // Comments
  result = result.replace(/(\/\/.*$)/gm, '<span style="color:rgba(255,255,255,0.3)">$1</span>');

  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    html: "html", css: "css", json: "json", md: "markdown",
    yml: "yaml", yaml: "yaml", sh: "bash", bash: "bash",
  };
  return map[ext] || "text";
}

// ── File Explorer ───────────────────────────────────────────────────────

function FileExplorer() {
  const { t } = useTranslation();
  const files = useIDEStore((s) => s.files);
  const rootIds = useIDEStore((s) => s.rootIds);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const fileInputRef = useCallback((node: HTMLInputElement | null) => {}, []) as any;

  const toggleFolder = useCallback((id: string) => {
    useIDEStore.setState((s) => ({
      files: { ...s.files, [id]: { ...s.files[id], expanded: !s.files[id].expanded } },
    }));
  }, []);

  const openFile = useCallback((id: string) => {
    useIDEStore.setState((s) => ({
      activeFileId: id,
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
    }));
  }, []);

  // Refresh files from disk via IPC
  const refreshFiles = useCallback(async () => {
    try {
      const wsPath = await (window as any).orun?.developer?.getWorkspace?.();
      if (!wsPath) return;
      const entries = await (window as any).orun?.developer?.listFiles?.(wsPath);
      if (!entries || entries.error) return;
      const newFiles: Record<string, any> = {};
      const newRootIds: string[] = [];
      const entryPaths: Record<string, string> = {};
      function scanEntries(items: any[], parentId: string) {
        for (const entry of items) {
          const id = `${parentId}_${entry.name}`;
          entryPaths[id] = entry.path;
          if (entry.isDirectory) {
            const childIds: string[] = [];
            newFiles[id] = { id, name: entry.name, type: "folder", children: childIds, expanded: true };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
          } else {
            newFiles[id] = { id, name: entry.name, type: "file", language: getLanguage(entry.name) };
            if (parentId === "root") newRootIds.push(id);
            const parent = newFiles[parentId];
            if (parent?.children) parent.children.push(id);
          }
        }
      }
      scanEntries(entries, "root");
      // Preserve content of files that were already open
      const oldState = useIDEStore.getState();
      for (const [id, node] of Object.entries(newFiles)) {
        if (node.type === "file") {
          const oldFile = oldState.files[id];
          if (oldFile?.content) {
            newFiles[id] = { ...newFiles[id], content: oldFile.content };
          } else {
            // Read content for new files
            try {
              const result = await (window as any).orun?.developer["read-file"]?.({ filePath: entryPaths[id] });
              if (result?.content) newFiles[id] = { ...newFiles[id], content: result.content };
            } catch {}
          }
        }
      }
      useIDEStore.setState({ files: newFiles, rootIds: newRootIds });
    } catch (err) {
      console.warn("[FileExplorer] refresh failed:", err);
    }
  }, []);

  // Auto-refresh when agent writes a file
  useEffect(() => {
    window.addEventListener("developer:refresh-explorer", refreshFiles);
    return () => window.removeEventListener("developer:refresh-explorer", refreshFiles);
  }, [refreshFiles]);

  const handleImportFolder = useCallback(async () => {
    try {
      // Use Electron dialog for folder selection
      const result = await (window as any).orun?.shell?.openDirectory?.();
      if (!result || result.canceled || !result.path) return;
      const dirPath = result.path;

      // Set this as the developer workspace
      await (window as any).orun?.developer?.setWorkspace?.(dirPath);

      // Read directory recursively using IPC
      const files: Record<string, any> = {};
      const rootIds: string[] = [];
      const entryPaths: Record<string, string> = {};

      async function readDirRecursive(dirPath: string, parentId: string) {
        const entries = await (window as any).orun?.developer?.listFiles?.(dirPath);
        if (!entries || entries.error) return;
        for (const entry of entries) {
          const id = `${parentId}_${entry.name}`;
          entryPaths[id] = entry.path;
          if (entry.isDirectory) {
            const childIds: string[] = [];
            files[id] = { id, name: entry.name, type: "folder", children: childIds, expanded: true };
            if (parentId === "root") rootIds.push(id);
            const parent = files[parentId];
            if (parent?.children) parent.children.push(id);
            await readDirRecursive(entry.path, id);
          } else {
            // Read file content
            let content = "";
            try {
              const result = await (window as any).orun?.developer["read-file"]?.({ filePath: entry.path });
              if (result?.content) content = result.content;
            } catch {}
            files[id] = { id, name: entry.name, type: "file", content, language: getLanguage(entry.name) };
            if (parentId === "root") rootIds.push(id);
            const parent = files[parentId];
            if (parent?.children) parent.children.push(id);
          }
        }
      }

      const dirName = dirPath.split(/[/\\]/).pop() || dirPath;
      await readDirRecursive(dirPath, "root");
      const rootFolderId = `root_${dirName}`;
      files[rootFolderId] = { id: rootFolderId, name: dirName, type: "folder", children: rootIds, expanded: true };

      useIDEStore.setState({ files, rootIds: [rootFolderId] });
    } catch (e) {
      // User cancelled or error
    }
  }, []);

  const renderNode = (id: string, depth: number) => {
    const node = files[id];
    if (!node) return null;

    if (node.type === "folder") {
      return (
        <div key={id}>
          <button
            onClick={() => toggleFolder(id)}
            className="w-full flex items-center gap-1.5 py-1 px-2 text-[10px] hover:bg-white/[0.03] transition-colors"
            style={{ paddingLeft: depth * 12 + 8, color: "var(--muted-foreground)" }}
          >
            <span className="text-[8px]">{node.expanded ? "▼" : "▶"}</span>
            <span>📁</span>
            <span>{node.name}</span>
          </button>
          {node.expanded && node.children?.map((childId) => renderNode(childId, depth + 1))}
        </div>
      );
    }

    const isActive = activeFileId === id;
    return (
      <button
        key={id}
        onClick={() => openFile(id)}
        className="w-full flex items-center gap-1.5 py-1 px-2 text-[10px] transition-colors"
        style={{
          paddingLeft: depth * 12 + 20,
          color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
          background: isActive ? "rgba(192,0,24,0.06)" : "transparent",
          borderRight: isActive ? "2px solid #C00018" : "2px solid transparent",
        }}
      >
        <span>{node.name.endsWith(".tsx") ? "⚛️" : "📄"}</span>
        <span>{node.name}</span>
      </button>
    );
  };

  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[9px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {t("developer_ide_explorer_label")}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshFiles}
            className="text-[8px] px-2 py-0.5 rounded transition-colors"
            style={{ background: "var(--secondary)", color: "var(--foreground)" }}
            title="Refresh from disk"
          >
            ↻
          </button>
          <button
            onClick={handleImportFolder}
            className="text-[8px] px-2 py-0.5 rounded transition-colors"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {t("developer_ide_import_button")}
          </button>
        </div>
      </div>
      {rootIds.map((id) => renderNode(id, 0))}
    </div>
  );
}

// ── Code Editor ─────────────────────────────────────────────────────────

function CodeEditor() {
  const { t } = useTranslation();
  const files = useIDEStore((s) => s.files);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const openTabs = useIDEStore((s) => s.openTabs);

  const closeTab = useCallback((id: string) => {
    useIDEStore.setState((s) => {
      const newTabs = s.openTabs.filter((t) => t !== id);
      return {
        openTabs: newTabs,
        activeFileId: s.activeFileId === id ? (newTabs[0] || null) : s.activeFileId,
      };
    });
  }, []);

  const activeFile = activeFileId ? files[activeFileId] : null;
  const lines = activeFile?.content?.split("\n") || [];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center border-b overflow-x-auto scrollbar-hide" style={{ borderColor: "var(--border)" }}>
        {openTabs.map((tabId) => {
          const f = files[tabId];
          if (!f) return null;
          return (
            <div
              key={tabId}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] cursor-pointer border-r shrink-0"
              style={{
                borderColor: "var(--border)",
                background: tabId === activeFileId ? "var(--background)" : "transparent",
                color: tabId === activeFileId ? "var(--foreground)" : "var(--muted-foreground)",
                borderBottom: tabId === activeFileId ? "2px solid #C00018" : "2px solid transparent",
              }}
              onClick={() => useIDEStore.setState({ activeFileId: tabId })}
            >
              <span>{f.name.endsWith(".tsx") ? "⚛️" : "📄"}</span>
              <span>{f.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tabId); }}
                className="ml-1 text-[8px] opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor */}
      {activeFile ? (
        <div className="flex-1 overflow-auto font-mono text-[11px] leading-5">
          <table className="w-full">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="text-right pr-4 pl-3 select-none" style={{ color: "rgba(255,255,255,0.15)", width: 40, fontFamily: "'JetBrains Mono', monospace" }}>
                    {i + 1}
                  </td>
                  <td className="pr-4" style={{ whiteSpace: "pre", fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                    <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line, activeFile.language) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("developer_ide_no_file_open")}</p>
        </div>
      )}
    </div>
  );
}

// ── Terminal ────────────────────────────────────────────────────────────

function Terminal() {
  const { t } = useTranslation();
  const terminalLines = useIDEStore((s) => s.terminalLines);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();

    if (trimmed === "clear") {
      useIDEStore.setState({ terminalLines: [] });
      setInput("");
      return;
    }

    const inputId = `cmd-${Date.now()}`;
    useIDEStore.setState((s) => ({
      terminalLines: [...s.terminalLines, { id: inputId, type: "input" as const, text: `$ ${cmd}` }],
    }));
    setInput("");

    if (trimmed === "help") {
      useIDEStore.setState((s) => ({
        terminalLines: [...s.terminalLines, { id: `out-${Date.now()}`, type: "output" as const, text: t("developer_ide_terminal_help") }],
      }));
      return;
    }

    if (typeof window !== "undefined" && (window as any).orun?.developer?.["execute-command"]) {
      (window as any).orun.developer["execute-command"]({ command: cmd }).then((result: any) => {
        const lines: TerminalLine[] = [];
        if (result.stdout) {
          result.stdout.trim().split("\n").forEach((line: string) => {
            lines.push({ id: `out-${Date.now()}-${Math.random()}`, type: "output" as const, text: line });
          });
        }
        if (result.stderr) {
          result.stderr.trim().split("\n").forEach((line: string) => {
            lines.push({ id: `err-${Date.now()}-${Math.random()}`, type: "error" as const, text: line });
          });
        }
        if (result.exitCode && result.exitCode !== 0 && !result.stderr) {
          lines.push({ id: `err-${Date.now()}`, type: "error" as const, text: `exit code ${result.exitCode}` });
        }
        useIDEStore.setState((s) => ({
          terminalLines: [...s.terminalLines, ...lines],
        }));
      }).catch((e: any) => {
        useIDEStore.setState((s) => ({
          terminalLines: [...s.terminalLines, { id: `err-${Date.now()}`, type: "error" as const, text: e.message || "Command failed" }],
        }));
      });
    } else {
      useIDEStore.setState((s) => ({
        terminalLines: [...s.terminalLines, { id: `err-${Date.now()}`, type: "error" as const, text: "Terminal not connected to backend" }],
      }));
    }
  }, [t]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background, #0D1117)" }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-2 font-mono text-[10px]">
        {terminalLines.map((line) => (
          <div key={line.id} className="py-0.5" style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: line.type === "input" ? "#C00018" : line.type === "error" ? "#EF4444" : "#22C55E",
          }}>
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ color: "#C00018", fontFamily: "'JetBrains Mono', monospace" }}>$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && handleCommand(input)}
            className="flex-1 bg-transparent outline-none text-[10px]"
            style={{ color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
            placeholder={t("developer_ide_terminal_placeholder")}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function DeveloperIDE({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { t } = useTranslation();
  const showTerminal = useIDEStore((s) => s.showTerminal);

  useEffect(() => {
    setIDEStoreGetter(() => useIDEStore);
    registerDeveloperActions();
    // Initialize workspace path - use app root as default
    (async () => {
      try {
        const existing = await (window as any).orun?.developer?.getWorkspace?.();
        if (!existing) {
          // Default to the app's working directory (project root)
          const appPath = await (window as any).orun?.settings?.get?.("appPath")
            || "";
          if (appPath) {
            await (window as any).orun?.developer?.setWorkspace?.(appPath);
          }
        }
      } catch {}
    })();
    // Auto-refresh file explorer when agent writes a file
    const handleFileWritten = () => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("developer:refresh-explorer"));
      }, 300);
    };
    window.addEventListener("developer:file-written", handleFileWritten);
    return () => {
      unregisterDeveloperActions();
      window.removeEventListener("developer:file-written", handleFileWritten);
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* File Explorer Sidebar */}
      <div className="w-48 border-r overflow-y-auto scrollbar-hide shrink-0" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <FileExplorer />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Code Editor */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ background: "var(--background)" }}>
          <CodeEditor />
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center px-3 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-[9px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                {t("developer_ide_terminal_label")}
              </span>
              <div className="flex-1" />
              <button
                onClick={() => useIDEStore.setState({ showTerminal: false })}
                className="text-[8px] opacity-50 hover:opacity-100"
                style={{ color: "var(--muted-foreground)" }}
              >
                ✕
              </button>
            </div>
            <div className="h-32">
              <Terminal />
            </div>
          </div>
        )}

        {!showTerminal && (
          <button
            onClick={() => useIDEStore.setState({ showTerminal: true })}
            className="border-t py-1.5 text-[9px] tracking-wider uppercase"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
          >
            {t("developer_ide_show_terminal")}
          </button>
        )}
      </div>
    </div>
  );
}

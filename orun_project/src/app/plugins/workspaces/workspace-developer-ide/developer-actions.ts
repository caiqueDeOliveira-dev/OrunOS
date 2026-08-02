import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "developer";

let registered = false;

let getStore: (() => any) | null = null;
export function setIDEStoreGetter(getter: () => any) { getStore = getter; }

function getIDEState() {
  if (!getStore) throw new Error("IDE store not initialized");
  return getStore();
}

async function apiCall(endpoint: string, body: Record<string, unknown>): Promise<any> {
  if (typeof window !== "undefined" && (window as any).orun?.developer) {
    return (window as any).orun.developer[endpoint](body);
  }

  const resp = await fetch(`/api/developer/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  }

  return resp.json();
}

function getFileId(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  let current = "root";
  for (const part of parts) {
    if (!part) continue;
    current = `${current}_${part}`;
  }
  return current;
}

const actions = {
  async read_file(params: Record<string, unknown>) {
    const filePath = String(params.path || "");
    if (!filePath) return { success: false, error: "path is required" };

    try {
      const result = await apiCall("read-file", { filePath });
      return { success: true, data: { path: filePath, content: result.content }, message: `Read file "${filePath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();
      const fileId = getFileId(filePath);
      const file = state.files[fileId];
      if (file?.content) {
        return { success: true, data: { path: filePath, content: file.content }, message: `Read from local store: "${filePath}"` };
      }
      return { success: false, error: e.message || `Could not read "${filePath}"` };
    }
  },

  async write_file(params: Record<string, unknown>) {
    const filePath = String(params.path || "");
    const content = String(params.content || "");
    if (!filePath) return { success: false, error: "path is required" };

    try {
      const result = await apiCall("write-file", { filePath, content });
      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { path: filePath, bytes: content.length }, message: `Wrote ${content.length} bytes to "${filePath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();
      const fileId = getFileId(filePath);

      if (state.files[fileId]) {
        store.setState((s: any) => ({
          files: { ...s.files, [fileId]: { ...s.files[fileId], content } },
        }));
        try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
        return { success: true, data: { path: filePath, bytes: content.length, source: "local" }, message: `Wrote to local store: "${filePath}"` };
      }

      const fileName = filePath.split("/").pop() || filePath;
      const parentDir = filePath.replace(/[/\\][^/\\]+$/, "") || ".";
      const parentId = parentDir === "." ? "root" : getFileId(parentDir);
      const newId = `${parentId}_${fileName}`;

      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const langMap: Record<string, string> = {
        ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
        py: "python", html: "html", css: "css", json: "json", md: "markdown",
        yml: "yaml", yaml: "yaml", sh: "shell", sql: "sql", rs: "rust",
        go: "go", rb: "ruby", java: "java",
      };
      const language = langMap[ext] || "text";

      store.setState((s: any) => {
        const newFiles = { ...s.files, [newId]: { id: newId, name: fileName, type: "file", content, language, path: filePath } };
        const parent = newFiles[parentId];
        if (parent && parent.children && !parent.children.includes(newId)) {
          parent.children = [...parent.children, newId];
        }
        return {
          files: newFiles,
          rootIds: parentId === "root" && !s.rootIds.includes(newId) ? [...s.rootIds, newId] : s.rootIds,
        };
      });

      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { path: filePath, bytes: content.length, source: "new" }, message: `Created file "${filePath}" with ${content.length} bytes` };
    }
  },

  async list_files(params: Record<string, unknown>) {
    const dirPath = String(params.path || ".");

    try {
      const result = await apiCall("listFiles", { dirPath });
      return { success: true, data: { path: dirPath, files: result.files || result }, message: `Listed directory "${dirPath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();

      const entries = Object.values(state.files).map((f: any) => ({
        name: f.name,
        type: f.type,
        language: f.language,
        path: f.path,
      }));

      return {
        success: true,
        data: { path: dirPath, files: entries, source: "local" },
        message: `Listed from local store: "${dirPath}"`,
      };
    }
  },

  async create_file(params: Record<string, unknown>) {
    const filePath = String(params.path || "");
    const content = String(params.content || "");
    if (!filePath) return { success: false, error: "path is required" };

    return actions.write_file({ path: filePath, content });
  },

  async delete_file(params: Record<string, unknown>) {
    const filePath = String(params.path || "");
    if (!filePath) return { success: false, error: "path is required" };

    try {
      const result = await apiCall("delete-file", { filePath });
      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { path: filePath }, message: `Deleted file "${filePath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();
      const fileId = getFileId(filePath);

      if (!state.files[fileId]) {
        return { success: false, error: `File not found: "${filePath}"` };
      }

      store.setState((s: any) => {
        const newFiles = { ...s.files };
        delete newFiles[fileId];

        for (const [fid] of Object.entries(newFiles)) {
          const node = newFiles[fid];
          if (node && node.type === "folder" && node.children) {
            newFiles[fid] = { ...node, children: node.children.filter((c: string) => c !== fileId) };
          }
        }

        return {
          files: newFiles,
          rootIds: s.rootIds.filter((r: string) => r !== fileId),
          openTabs: s.openTabs.filter((t: string) => t !== fileId),
          activeFileId: s.activeFileId === fileId ? (s.openTabs.filter((t: string) => t !== fileId)[0] || null) : s.activeFileId,
        };
      });

      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { path: filePath, source: "local" }, message: `Deleted from local store: "${filePath}"` };
    }
  },

  async rename_file(params: Record<string, unknown>) {
    const oldPath = String(params.oldPath || params.path || "");
    const newPath = String(params.newPath || params.name || "");
    if (!oldPath || !newPath) return { success: false, error: "oldPath and newPath are required" };

    try {
      const result = await apiCall("rename-file", { oldPath, newPath });
      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { oldPath, newPath }, message: `Renamed "${oldPath}" to "${newPath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();
      const oldId = getFileId(oldPath);
      const newId = getFileId(newPath);

      if (!state.files[oldId]) {
        return { success: false, error: `File not found: "${oldPath}"` };
      }

      const newName = newPath.split("/").pop() || newPath;
      const ext = newName.split(".").pop()?.toLowerCase() || "";
      const langMap: Record<string, string> = { ts: "typescript", tsx: "typescriptreact", js: "javascript", py: "python" };
      const language = langMap[ext] || "text";

      store.setState((s: any) => {
        const newFiles = { ...s.files };
        const oldNode = newFiles[oldId];
        newFiles[newId] = { ...oldNode, id: newId, name: newName, language: oldNode.type === "file" ? language : oldNode.language };
        delete newFiles[oldId];

        for (const [fid] of Object.entries(newFiles)) {
          const n = newFiles[fid];
          if (n && n.type === "folder" && n.children) {
            newFiles[fid] = { ...n, children: n.children.map((c: string) => c === oldId ? newId : c) };
          }
        }

        return {
          files: newFiles,
          rootIds: s.rootIds.map((r: string) => r === oldId ? newId : r),
          openTabs: s.openTabs.map((t: string) => t === oldId ? newId : t),
          activeFileId: s.activeFileId === oldId ? newId : s.activeFileId,
        };
      });

      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { oldPath, newPath, source: "local" }, message: `Renamed in local store` };
    }
  },

  async search_files(params: Record<string, unknown>) {
    const query = String(params.query || "");
    if (!query) return { success: false, error: "query is required" };

    const store = getIDEState();
    const state = store.getState();
    const results: Array<{ fileName: string; filePath: string; line: number; content: string }> = [];
    const q = query.toLowerCase();

    for (const [, node] of Object.entries(state.files) as any) {
      if (node.type === "file" && node.content) {
        const lines = node.content.split("\n");
        lines.forEach((line: string, idx: number) => {
          if (line.toLowerCase().includes(q)) {
            results.push({
              fileName: node.name,
              filePath: node.path || node.name,
              line: idx + 1,
              content: line.trim().substring(0, 120),
            });
          }
        });
      }
    }

    return {
      success: true,
      data: { query, matches: results.length, results: results.slice(0, 200) },
      message: `Found ${results.length} matches for "${query}"`,
    };
  },

  async execute_command(params: Record<string, unknown>) {
    const command = String(params.command || "");
    if (!command) return { success: false, error: "command is required" };

    try {
      const result = await apiCall("execute-command", { command });
      const store = getIDEState();
      const lines: Array<{ id: string; type: string; text: string }> = [
        { id: `cmd-${Date.now()}`, type: "input", text: `$ ${command}` },
      ];
      if (result.stdout) {
        String(result.stdout).trim().split("\n").forEach((line) => {
          lines.push({ id: `out-${Date.now()}-${Math.random()}`, type: "output", text: line });
        });
      }
      if (result.stderr) {
        String(result.stderr).trim().split("\n").forEach((line) => {
          lines.push({ id: `err-${Date.now()}-${Math.random()}`, type: "error", text: line });
        });
      }
      if (result.exitCode && result.exitCode !== 0 && !result.stderr) {
        lines.push({ id: `err-${Date.now()}`, type: "error", text: `exit code ${result.exitCode}` });
      }
      store.setState((s: any) => ({
        terminalTabs: s.terminalTabs.map((t: any) =>
          t.id === s.activeTerminal ? { ...t, lines: [...t.lines, ...lines] } : t
        ),
      }));
      return { success: true, data: { command, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }, message: `Command executed: ${command}` };
    } catch (e: any) {
      const store = getIDEState();
      const lineId = `cmd-${Date.now()}`;
      const outputId = `out-${Date.now()}`;

      store.setState((s: any) => ({
        terminalTabs: s.terminalTabs.map((t: any) =>
          t.id === s.activeTerminal
            ? { ...t, lines: [...t.lines, { id: lineId, type: "input", text: `$ ${command}` }, { id: outputId, type: "error", text: e.message || `Failed to execute: ${command}` }] }
            : t
        ),
      }));

      return { success: false, error: e.message || `Failed to execute: ${command}` };
    }
  },

  async analyze_security(params: Record<string, unknown>) {
    const filePath = String(params.path || params.file || params.target || "");
    const content = String(params.content || "");

    let code = content;
    let targetFile = filePath;

    if (!code && targetFile) {
      const store = getIDEState();
      const state = store.getState();
      const fileId = getFileId(targetFile);
      const file = state.files[fileId];
      if (file?.content) {
        code = file.content;
        targetFile = file.name;
      }
    }

    if (!code) {
      return { success: false, error: "No code content or file path provided" };
    }

    const issues: Array<{ severity: "low" | "medium" | "high" | "critical"; line: number | null; message: string; recommendation: string }> = [];
    const lines = code.split("\n");

    const dangerousPatterns: Array<{ pattern: RegExp; severity: "low" | "medium" | "high" | "critical"; message: string; recommendation: string }> = [
      { pattern: /eval\s*\(/g, severity: "high", message: "Use of eval() can lead to code injection", recommendation: "Avoid eval(). Use JSON.parse() or Function constructor only if absolutely necessary." },
      { pattern: /innerHTML\s*=/g, severity: "high", message: "Setting innerHTML can lead to XSS attacks", recommendation: "Use textContent or insertAdjacentText() to safely insert text." },
      { pattern: /document\.write\s*\(/g, severity: "high", message: "document.write() is dangerous", recommendation: "Use DOM manipulation methods like createElement() and appendChild()." },
      { pattern: /localStorage/g, severity: "low", message: "Sensitive data in localStorage", recommendation: "Avoid storing tokens or PII in localStorage. Use httpOnly cookies for auth tokens." },
      { pattern: /sessionStorage/g, severity: "low", message: "Sensitive data in sessionStorage", recommendation: "sessionStorage is scoped to tabs. Still avoid storing secrets." },
      { pattern: /\.env/g, severity: "low", message: "Environment variable referenced in code", recommendation: "Ensure .env files are in .gitignore. Never commit secrets." },
      { pattern: /password|secret|apikey|api_key|token|auth|credential/i, severity: "medium", message: "Possible hardcoded credential", recommendation: "Use environment variables or a secrets manager. Never hardcode credentials." },
      { pattern: /new\s+Function\s*\(/g, severity: "high", message: "Dynamic function creation can be exploited", recommendation: "Use predefined functions instead of dynamically creating them." },
      { pattern: /setTimeout\s*\(\s*["']/g, severity: "medium", message: "Passing string to setTimeout", recommendation: "Pass a function reference instead of a string to setTimeout()." },
      { pattern: /\\\.\\\.\\\//g, severity: "medium", message: "Directory traversal pattern detected", recommendation: "Sanitize and validate file paths. Use path.resolve() and path.normalize()." },
      { pattern: /process\.env\./g, severity: "low", message: "Environment variable access", recommendation: "Ensure env vars are properly validated before use." },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const dp of dangerousPatterns) {
        if (dp.pattern.test(line)) {
          issues.push({
            severity: dp.severity,
            line: i + 1,
            message: dp.message,
            recommendation: dp.recommendation,
          });
        }
        dp.pattern.lastIndex = 0;
      }
    }

    const stats = {
      totalLines: lines.length,
      emptyLines: lines.filter((l: string) => !l.trim()).length,
      commentLines: lines.filter((l: string) => l.trim().startsWith("//") || l.trim().startsWith("#") || l.trim().startsWith("/*") || l.trim().startsWith("*")).length,
      codeLines: lines.filter((l: string) => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("#")).length,
    };

    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const highCount = issues.filter((i) => i.severity === "high").length;
    const mediumCount = issues.filter((i) => i.severity === "medium").length;
    const lowCount = issues.filter((i) => i.severity === "low").length;

    const overallScore = Math.max(0, 100 - (criticalCount * 25 + highCount * 10 + mediumCount * 5 + lowCount * 2));
    const healthLabel = overallScore >= 90 ? "Good" : overallScore >= 70 ? "Needs Review" : overallScore >= 40 ? "Significant Issues" : "Critical";

    return {
      success: true,
      data: {
        target: targetFile || "unknown",
        score: overallScore,
        health: healthLabel,
        stats,
        issues: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount, total: issues.length },
        details: issues.slice(0, 50),
      },
      message: `Security analysis complete. Score: ${overallScore}/100 (${healthLabel}). Found ${issues.length} issue(s).`,
    };
  },

  async get_workspace_info() {
    const store = getIDEState();
    const state = store.getState();
    const fileCount = Object.values(state.files).filter((f: any) => f.type === "file").length;
    const folderCount = Object.values(state.files).filter((f: any) => f.type === "folder").length;
    const tabCount = state.openTabs.length;

    return {
      success: true,
      data: {
        files: fileCount,
        folders: folderCount,
        openTabs: tabCount,
        rootFolders: state.rootIds.length,
        terminalTabs: state.terminalTabs.length,
        sidebarVisible: state.sidebarVisible,
      },
      message: `Workspace: ${fileCount} files, ${folderCount} folders, ${tabCount} open tabs`,
    };
  },
};

export function registerDeveloperActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterDeveloperActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

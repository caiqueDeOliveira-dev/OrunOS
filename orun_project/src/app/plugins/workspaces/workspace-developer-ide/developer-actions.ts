import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "developer";

let registered = false;

let getStore: (() => any) | null = null;
export function setIDEStoreGetter(getter: () => any) { getStore = getter; }

function getIDEState() {
  if (!getStore) throw new Error("IDE store not initialized");
  return getStore();
}

function pathJoin(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
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
      const file = Object.values(state.files).find((f: any) => f.name === filePath.split("/").pop());
      if (file && (file as any).content) {
        return { success: true, data: { path: filePath, content: (file as any).content }, message: `Read from local store: "${filePath}"` };
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
      // Signal file explorer to refresh
      try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
      return { success: true, data: { path: filePath, bytes: content.length }, message: `Wrote ${content.length} bytes to "${filePath}"` };
    } catch (e: any) {
      const store = getIDEState();
      const state = store.getState();
      const fileName = filePath.split("/").pop() || filePath;
      const existingId = Object.keys(state.files).find((id) => state.files[id].name === fileName);

      if (existingId) {
        store.setState((s: any) => ({
          files: { ...s.files, [existingId]: { ...s.files[existingId], content } },
        }));
        try { window.dispatchEvent(new CustomEvent("developer:file-written")); } catch {}
        return { success: true, data: { path: filePath, bytes: content.length, source: "local" }, message: `Wrote to local store: "${filePath}"` };
      }
      return { success: false, error: e.message || `Could not write "${filePath}"` };
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
      }));

      return {
        success: true,
        data: { path: dirPath, files: entries, source: "local" },
        message: `Listed from local store: "${dirPath}"`,
      };
    }
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
        terminalLines: [...s.terminalLines, ...lines],
      }));
      return { success: true, data: { command, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }, message: `Command executed: ${command}` };
    } catch (e: any) {
      const store = getIDEState();
      const lineId = `cmd-${Date.now()}`;
      const outputId = `out-${Date.now()}`;

      store.setState((s: any) => ({
        terminalLines: [
          ...s.terminalLines,
          { id: lineId, type: "input", text: `$ ${command}` },
          { id: outputId, type: "error", text: e.message || `Failed to execute: ${command}` },
        ],
      }));

      return { success: false, error: e.message || `Failed to execute: ${command}` };
    }
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

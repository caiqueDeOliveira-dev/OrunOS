import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "system";

let registered = false;

let getStore: (() => any) | null = null;
export function setConsoleStoreGetter(getter: () => any) { getStore = getter; }

function getConsoleState() {
  if (!getStore) throw new Error("Console store not initialized");
  return getStore();
}

const BLOCKED_COMMANDS = [
  /rm\s+-rf\s+[\/~]/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:()\s*\{\s*:\|:&\s*\};/i,
  /shutdown/i,
  /reboot/i,
  /format/i,
  /del\s+\/[sSqQ]/i,
];

function sanitizeCommand(command: string): string {
  const trimmed = command.trim();
  for (const pattern of BLOCKED_COMMANDS) {
    if (pattern.test(trimmed)) {
      throw new Error(`Blocked dangerous command: ${trimmed}`);
    }
  }
  return trimmed;
}

const actions = {
  async execute_command(params: Record<string, unknown>) {
    const command = String(params.command || "");
    if (!command) return { success: false, error: "command is required" };

    let sanitized: string;
    try {
      sanitized = sanitizeCommand(command);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    const store = getConsoleState();
    const state = store.getState();

    const inputLine = {
      id: Date.now(),
      type: "input" as const,
      text: sanitized,
      timestamp: Date.now(),
    };

    try {
      const result = await (window as any).orun.system.executeCommand(sanitized);
      if (result.success) {
        const outputLine = {
          id: Date.now() + 1,
          type: "output" as const,
          text: result.stdout || "(no output)",
          timestamp: Date.now(),
        };

        store.setState((s: any) => ({
          lines: [...s.lines, inputLine, outputLine],
        }));

        return { success: true, data: { stdout: result.stdout }, message: `Command executed: ${sanitized}` };
      } else {
        const errorLine = {
          id: Date.now() + 1,
          type: "error" as const,
          text: result.error || "Command failed",
          timestamp: Date.now(),
        };

        store.setState((s: any) => ({
          lines: [...s.lines, inputLine, errorLine],
        }));

        return { success: false, error: result.error || "Command failed" };
      }
    } catch (err: any) {
      const errorLine = {
        id: Date.now() + 1,
        type: "error" as const,
        text: err.message || "Command failed",
        timestamp: Date.now(),
      };

      store.setState((s: any) => ({
        lines: [...s.lines, inputLine, errorLine],
      }));

      return { success: false, error: err.message || "Command failed" };
    }
  },

  async get_processes() {
    const mockProcesses = [
      { pid: 1, name: "orun-main", cpu: 2.1, memory: 128, status: "running" },
      { pid: 423, name: "electron", cpu: 5.4, memory: 512, status: "running" },
      { pid: 1089, name: "node", cpu: 1.8, memory: 86, status: "running" },
      { pid: 2341, name: "vite-dev", cpu: 3.2, memory: 256, status: "running" },
      { pid: 3892, name: "typescript", cpu: 0.8, memory: 192, status: "idle" },
      { pid: 4521, name: "postgres", cpu: 1.5, memory: 340, status: "running" },
      { pid: 5102, name: "redis", cpu: 0.3, memory: 64, status: "running" },
    ];

    return {
      success: true,
      data: {
        processes: mockProcesses,
        count: mockProcesses.length,
      },
    };
  },

  async get_resources() {
    const store = getConsoleState();
    const state = store.getState();

    const nav = navigator;
    const deviceRAM = (nav as any).deviceMemory;

    const cpuUsage = typeof state.cpuUsage === "number" ? state.cpuUsage : 0;
    const ramUsage = typeof state.ramUsage === "number" ? state.ramUsage : 0;
    const diskUsage = typeof state.diskUsage === "number" ? state.diskUsage : 0;

    return {
      success: true,
      data: {
        cpu: { usage: Math.round(cpuUsage * 10) / 10, cores: navigator.hardwareConcurrency || 8 },
        ram: {
          usage: Math.round(ramUsage * 10) / 10,
          total: deviceRAM ? `${deviceRAM}GB` : "unknown",
          estimatedFree: deviceRAM ? `${Math.round(deviceRAM * (1 - ramUsage / 100) * 10) / 10}GB` : "~2.4GB",
        },
        disk: { usage: Math.round(diskUsage * 10) / 10 },
      },
    };
  },
};

export function registerSystemActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterSystemActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

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
    const command = `Get-Process | Select-Object Id, ProcessName, CPU, WorkingSet64, Status | ConvertTo-Json`;
    try {
      const result = await (window as any).orun.system.executeCommand(command, { timeout: 10000 });
      if (result.success && result.stdout) {
        let processes = JSON.parse(result.stdout);
        if (!Array.isArray(processes)) processes = [processes];
        const mapped = processes.slice(0, 50).map((p: any) => ({
          pid: p.Id,
          name: p.ProcessName,
          cpu: p.CPU ? Math.round(parseFloat(p.CPU) * 100) / 100 : 0,
          memory: Math.round((p.WorkingSet64 || 0) / 1024 / 1024),
          status: (p.Status || "running").toLowerCase(),
        }));
        return { success: true, data: { processes: mapped, count: mapped.length } };
      }
    } catch {}
    return { success: true, data: { processes: [], count: 0 } };
  },

  async get_resources() {
    async function ps(command: string) {
      try {
        const r = await (window as any).orun.system.executeCommand(command, { timeout: 10000 });
        return r.success ? r.stdout.trim() : null;
      } catch { return null; }
    }

    const [cpuLine, ramLine, diskLine, cpuCount] = await Promise.all([
      ps(`Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage`),
      ps(`$os = Get-CimInstance Win32_OperatingSystem; $os.TotalVisibleMemorySize / 1MB; $os.FreePhysicalMemory / 1MB`),
      ps(`Get-PSDrive C | Select-Object @{N='Pct';E={[math]::Round(($_.Used + 1) / ($_.Used + $_.Free + 1) * 100, 1)}} | Select-Object -ExpandProperty Pct`),
      ps(`(Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors`),
    ]);

    const cpuUsage = cpuLine ? parseFloat(cpuLine) || 0 : 0;
    const cores = cpuCount ? parseInt(cpuCount) || navigator.hardwareConcurrency || 8 : navigator.hardwareConcurrency || 8;

    let ramTotalGb = 0;
    let ramFreeGb = 0;
    if (ramLine) {
      const parts = ramLine.split('\n').filter(Boolean);
      if (parts.length >= 2) {
        ramTotalGb = parseFloat(parts[0]) || 0;
        ramFreeGb = parseFloat(parts[1]) || 0;
      }
    }
    const ramUsage = ramTotalGb > 0 ? Math.round((1 - ramFreeGb / ramTotalGb) * 1000) / 10 : 0;

    const diskUsage = diskLine ? parseFloat(diskLine) || 0 : 0;

    return {
      success: true,
      data: {
        cpu: { usage: cpuUsage, cores },
        ram: {
          usage: ramUsage,
          total: ramTotalGb > 0 ? `${ramTotalGb.toFixed(1)}GB` : "unknown",
          estimatedFree: ramFreeGb > 0 ? `${ramFreeGb.toFixed(1)}GB` : "unknown",
        },
        disk: { usage: diskUsage },
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

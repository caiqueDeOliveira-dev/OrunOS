// plugins/workspaces/workspace-system-console/SystemWorkspace.tsx
//
// System Console workspace plugin for the System agent.
// Shows a terminal emulator + system resource monitor.
// This is a functional example of a workspace plugin.

import { useState, useCallback, useRef, useEffect, lazy } from "react";
import type { WorkspaceProps } from "../../types";
import { createStore } from "../../lib/store";
import { createPluginLogger } from "../../lib/logger";
import { registerSystemActions, unregisterSystemActions } from "./system-actions";
import { useTranslation } from "../../../../i18n/I18nProvider";

const log = createPluginLogger("system-console");

// ── Store ───────────────────────────────────────────────────────────────

interface ConsoleLine {
  id: number;
  type: "input" | "output" | "error" | "system";
  text: string;
  timestamp: number;
}

interface SystemState {
  [key: string]: unknown;
  lines: ConsoleLine[];
  history: string[];
  historyIndex: number;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
}

const useConsoleStore = createStore<SystemState>({
  lines: [{ id: 0, type: "system", text: "Orun OS System Console v1.0 — Type 'help' for commands", timestamp: Date.now() }],
  history: [],
  historyIndex: -1,
  cpuUsage: 0,
  ramUsage: 0,
  diskUsage: 0,
});

// ── Built-in commands ───────────────────────────────────────────────────

type TFunc = (key: string, params?: Record<string, string | number>) => string;

function getCommands(t: TFunc): Record<string, (args: string) => string> {
  return {
    help: () => [
      t("system_console_help_title"),
      `  ${t("system_console_help_help")}`,
      `  ${t("system_console_help_clear")}`,
      `  ${t("system_console_help_date")}`,
      `  ${t("system_console_help_echo")}`,
      `  ${t("system_console_help_uptime")}`,
      `  ${t("system_console_help_version")}`,
      `  ${t("system_console_help_agents")}`,
      `  ${t("system_console_help_ram")}`,
      `  ${t("system_console_help_clearmemory")}`,
    ].join("\n"),
    clear: () => "__CLEAR__",
    date: () => new Date().toLocaleString("pt-BR"),
    uptime: () => {
      const hrs = Math.floor(performance.now() / 3600000);
      const mins = Math.floor((performance.now() % 3600000) / 60000);
      return t("system_console_uptime", { hrs: String(hrs), mins: String(mins) });
    },
    version: () => t("system_console_version"),
    agents: () => [t("system_console_agents_list_1"), t("system_console_agents_list_2"), t("system_console_agents_list_3")].join("\n"),
    ram: () => {
      const nav = navigator;
      const deviceRAM = (nav as { deviceMemory?: number }).deviceMemory;
      const ram = deviceRAM ? deviceRAM + "GB" : "unknown";
      const available = deviceRAM ? Math.round(deviceRAM * 0.6) + "GB" : "~2.4GB";
      return `${t("system_console_ram_device", { ram: String(deviceRAM ?? "unknown") })}\n${t("system_console_ram_available", { available })}`;
    },
    clearmemory: () => "__CLEAR_MEMORY__",
  };
}

function processCommand(input: string, t: TFunc): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");

  const commands = getCommands(t);
  if (commands[cmd]) return commands[cmd](args);
  return t("system_console_command_not_found", { cmd });
}

// ── Console Line Component ──────────────────────────────────────────────

function ConsoleLineView({ line }: { line: ConsoleLine }) {
  const colorMap: Record<string, string> = {
    input: "var(--foreground)",
    output: "var(--muted-foreground)",
    error: "#EF4444",
    system: "#C00018",
  };

  return (
    <div className="flex gap-2 text-[11px] leading-relaxed" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <span className="select-none opacity-30" style={{ color: "var(--muted-foreground)" }}>
        {line.type === "input" ? ">" : line.type === "error" ? "!" : "·"}
      </span>
      <span style={{ color: colorMap[line.type] || "var(--muted-foreground)" }}>
        {line.text}
      </span>
    </div>
  );
}

// ── Resource Bar ────────────────────────────────────────────────────────

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[9px]" style={{ fontFamily: "'Sora', sans-serif" }}>
      <span className="w-8 text-right" style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

// ── Main Workspace Component ────────────────────────────────────────────

export function SystemWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lines = useConsoleStore((s) => s.lines);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    useConsoleStore.setState({
      lines: [{ id: 0, type: "system", text: t("system_console_welcome"), timestamp: Date.now() }],
    });
  }, []);

  useEffect(() => {
    registerSystemActions();
    return () => unregisterSystemActions();
  }, []);

  // Simulate resource usage (in a real app, this would come from Electron IPC)
  useEffect(() => {
    const interval = setInterval(() => {
      useConsoleStore.setState({
        cpuUsage: 20 + Math.random() * 40,
        ramUsage: 35 + Math.random() * 25,
        diskUsage: 55 + Math.random() * 15,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const lineId = Date.now();

      // Add input line
      const currentLines = useConsoleStore.getState().lines;
      useConsoleStore.setState({
        lines: [...currentLines, { id: lineId, type: "input", text: input, timestamp: Date.now() }],
        history: [...useConsoleStore.getState().history, input],
        historyIndex: -1,
      });

      log.info("command", { input });

      // Process command
      const result = processCommand(input, t);

      if (result === "__CLEAR__") {
        useConsoleStore.setState({
          lines: [{ id: Date.now(), type: "system", text: t("system_console_cleared"), timestamp: Date.now() }],
        });
      } else if (result === "__CLEAR_MEMORY__") {
        useConsoleStore.setState({
          lines: [{ id: Date.now(), type: "system", text: t("system_console_history_cleared"), timestamp: Date.now() }],
          history: [],
        });
      } else if (result) {
        const updatedLines = useConsoleStore.getState().lines;
        useConsoleStore.setState({
          lines: [...updatedLines, { id: Date.now(), type: "output", text: result, timestamp: Date.now() }],
        });
      }

      setInput("");
    },
    [input, t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Arrow up: history navigation
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const history = useConsoleStore.getState().history;
        const idx = useConsoleStore.getState().historyIndex;
        const newIdx = Math.min(idx + 1, history.length - 1);
        if (newIdx >= 0) {
          setInput(history[history.length - 1 - newIdx]);
          useConsoleStore.setState({ historyIndex: newIdx });
        }
      }
      // Arrow down: history navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const history = useConsoleStore.getState().history;
        const idx = useConsoleStore.getState().historyIndex;
        const newIdx = Math.max(idx - 1, -1);
        if (newIdx < 0) {
          setInput("");
          useConsoleStore.setState({ historyIndex: -1 });
        } else {
          setInput(history[history.length - 1 - newIdx]);
          useConsoleStore.setState({ historyIndex: newIdx });
        }
      }
    },
    []
  );

  const cpuUsage = useConsoleStore((s) => s.cpuUsage);
  const ramUsage = useConsoleStore((s) => s.ramUsage);
  const diskUsage = useConsoleStore((s) => s.diskUsage);

  return (
    <div className="flex flex-col h-full">
      {/* Resource Monitor Bar */}
      <div className="px-4 py-2.5 border-b flex flex-col gap-1" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <ResourceBar label={t("system_console_resource_cpu")} value={cpuUsage} color="#C00018" />
        <ResourceBar label={t("system_console_resource_ram")} value={ramUsage} color="#EAB308" />
        <ResourceBar label={t("system_console_resource_disk")} value={diskUsage} color="#3B82F6" />
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 cursor-text scrollbar-hide"
        onClick={() => inputRef.current?.focus()}
        style={{ background: "rgba(0,0,0,0.15)" }}
      >
        {lines.map((line) => (
          <ConsoleLineView key={line.id} line={line} />
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2 border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <span className="text-[11px] select-none" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C00018" }}>
          &gt;
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-[11px]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}
          placeholder={t("system_console_placeholder")}
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
}

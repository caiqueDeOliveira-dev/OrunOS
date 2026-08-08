import { useState, useCallback, useRef, useEffect } from "react";
import { useIDEStore } from "../developer-store";
import { generateId } from "../developer-types";
import type { TerminalLine } from "../developer-types";
import { Terminal, X, Plus } from "lucide-react";

export function TerminalPanel() {
  const terminalTabs = useIDEStore((s) => s.terminalTabs);
  const activeTerminal = useIDEStore((s) => s.activeTerminal);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeLines = terminalTabs.find((t) => t.id === activeTerminal)?.lines || [];
  const inputVal = inputs[activeTerminal] || "";

  useEffect(() => {
    const ref = scrollRefs.current[activeTerminal];
    if (ref) ref.scrollTop = ref.scrollHeight;
  }, [activeLines, activeTerminal]);

  const addTerminal = useCallback(() => {
    const id = generateId();
    const count = terminalTabs.length + 1;
    useIDEStore.setState((s) => ({
      terminalTabs: [...s.terminalTabs, {
        id, label: `bash ${count}`, lines: [
          { id: `welcome-${id}`, type: "output" as const, text: `Terminal ${count}` },
        ],
      }],
      activeTerminal: id,
    }));
  }, [terminalTabs.length]);

  const closeTerminal = useCallback((id: string) => {
    if (terminalTabs.length <= 1) return;
    useIDEStore.setState((s) => {
      const newTabs = s.terminalTabs.filter((t) => t.id !== id);
      return {
        terminalTabs: newTabs,
        activeTerminal: s.activeTerminal === id ? (newTabs[0]?.id || "") : s.activeTerminal,
      };
    });
  }, [terminalTabs.length]);

  const executeCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setInputs((prev) => ({ ...prev, [activeTerminal]: "" }));

    if (trimmed.toLowerCase() === "clear") {
      useIDEStore.setState((s) => ({
        terminalTabs: s.terminalTabs.map((t) =>
          t.id === activeTerminal ? { ...t, lines: [] } : t
        ),
      }));
      return;
    }

    if (trimmed.toLowerCase() === "help") {
      const helpText = [
        "Available commands:",
        "  clear  - Clear terminal",
        "  help   - Show this message",
        "  node   - Run Node.js (requires IPC)",
        "  npm    - Run npm commands (requires IPC)",
        "  git    - Run git commands (requires IPC)",
        "All other commands are forwarded to the system shell via IPC.",
      ].join("\n");
      useIDEStore.setState((s) => ({
        terminalTabs: s.terminalTabs.map((t) =>
          t.id === activeTerminal ? {
            ...t,
            lines: [...t.lines,
              { id: `input-${generateId()}`, type: "input" as const, text: `$ ${cmd}` },
              { id: `out-${generateId()}`, type: "output" as const, text: helpText },
            ],
          } : t
        ),
      }));
      return;
    }

    useIDEStore.setState((s) => ({
      terminalTabs: s.terminalTabs.map((t) =>
        t.id === activeTerminal ? {
          ...t,
          lines: [...t.lines, { id: `input-${generateId()}`, type: "input" as const, text: `$ ${cmd}` }],
        } : t
      ),
    }));

    if (typeof window !== "undefined" && (window as any).orun?.developer?.["execute-command"]) {
      (window as any).orun.developer["execute-command"]({ command: cmd }).then((result: any) => {
        const lines: TerminalLine[] = [];
        if (result.stdout) {
          result.stdout.trim().split("\n").forEach((line: string) => {
            lines.push({ id: `out-${generateId()}`, type: "output" as const, text: line });
          });
        }
        if (result.stderr) {
          result.stderr.trim().split("\n").forEach((line: string) => {
            lines.push({ id: `err-${generateId()}`, type: "error" as const, text: line });
          });
        }
        if (result.exitCode && result.exitCode !== 0 && !result.stderr) {
          lines.push({ id: `err-${generateId()}`, type: "error" as const, text: `exit code ${result.exitCode}` });
        }
        useIDEStore.setState((s) => ({
          terminalTabs: s.terminalTabs.map((t) =>
            t.id === activeTerminal ? { ...t, lines: [...t.lines, ...lines] } : t
          ),
        }));
      }).catch((e: any) => {
        useIDEStore.setState((s) => ({
          terminalTabs: s.terminalTabs.map((t) =>
            t.id === activeTerminal ? {
              ...t,
              lines: [...t.lines, { id: `err-${generateId()}`, type: "error" as const, text: e.message || "Command failed" }],
            } : t
          ),
        }));
      });
    } else {
      useIDEStore.setState((s) => ({
        terminalTabs: s.terminalTabs.map((t) =>
          t.id === activeTerminal ? {
            ...t,
            lines: [...t.lines, { id: `err-${generateId()}`, type: "error" as const, text: "Terminal not connected to backend" }],
          } : t
        ),
      }));
    }
  }, [activeTerminal]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#050505" }}>
      <div className="flex items-center border-b shrink-0 overflow-x-auto hs-scroll" style={{ borderColor: "#252525", background: "#141414" }}>
        {terminalTabs.map((tab) => (
          <div
            key={tab.id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] cursor-pointer border-r shrink-0"
            style={{
              borderColor: "#252525",
              background: tab.id === activeTerminal ? "#050505" : "transparent",
              color: tab.id === activeTerminal ? "#FFFFFF" : "#A0A0A0",
              borderBottom: tab.id === activeTerminal ? "2px solid #C3002F" : "2px solid transparent",
            }}
            onClick={() => useIDEStore.setState({ activeTerminal: tab.id })}
          >
            <Terminal size={10} />
            <span>{tab.label}</span>
            {terminalTabs.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); closeTerminal(tab.id); }}
                className="p-0.5 rounded hover:bg-white/[0.1]">
                <X size={8} />
              </button>
            )}
          </div>
        ))}
        <button onClick={addTerminal} className="px-2 py-1.5 hover:bg-white/[0.03]" title="New Terminal">
          <Plus size={11} />
        </button>
      </div>
      <div
        ref={(el) => { scrollRefs.current[activeTerminal] = el; }}
        className="flex-1 overflow-y-auto hs-scroll p-2 font-mono text-[10px]"
        style={{ background: "#050505" }}
        onClick={() => {
          const inputEl = document.querySelector(`[data-terminal-input="${activeTerminal}"]`) as HTMLInputElement;
          inputEl?.focus();
        }}
      >
        {activeLines.length === 0 && (
          <div className="text-[10px] py-1" style={{ color: "#A0A0A0" }}>Terminal cleared</div>
        )}
        {activeLines.map((line) => (
          <div key={line.id} className="py-[1px] leading-[1.4]" style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: line.type === "input" ? "#C3002F" : line.type === "error" ? "#EF4444" : "#22C55E",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ color: "#C3002F", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>$</span>
          <input
            data-terminal-input={activeTerminal}
            value={inputVal}
            onChange={(e) => setInputs((prev) => ({ ...prev, [activeTerminal]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") executeCommand(inputVal); }}
            className="flex-1 bg-transparent outline-none text-[10px]"
            style={{ color: "#FFFFFF", fontFamily: "'JetBrains Mono', monospace" }}
            placeholder="Type a command..."
          />
        </div>
      </div>
    </div>
  );
}

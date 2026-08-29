// plugins/workspaces/workspace-orun-code/components/OrunAIPanel.tsx
import { useState } from "react";
import {
  Send,
  MessageSquare,
  Layers,
  ListChecks,
  FileDiff,
  ScanSearch,
  X,
  Plus,
  GitBranch,
  File,
  Folder,
  BookMarked,
} from "lucide-react";
import { useOrunCodeStore } from "../store";
import { runOrunCodeAction } from "../actions";
import { OC, AI_MODE_META, modePillStyle } from "../orun-code";
import { generateId } from "../types";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "context", label: "Context", icon: Layers },
  { id: "plan", label: "Plan", icon: ListChecks },
  { id: "changes", label: "Changes", icon: FileDiff },
  { id: "review", label: "Review", icon: ScanSearch },
] as const;

const CONTEXT_BOOTSTRAP = [
  { kind: "file", label: "orun_project/src/app/OrunCode.tsx", icon: File },
  { kind: "folder", label: "orun_project/src/", icon: Folder },
  { kind: "git", label: "git: main", icon: GitBranch },
  { kind: "memory", label: "memory: architecture.md", icon: BookMarked },
];

export function OrunAIPanel() {
  const tab = useOrunCodeStore((s) => s.aiPanelTab);
  const mode = useOrunCodeStore((s) => s.aiMode);
  const chat = useOrunCodeStore((s) => s.aiChat);
  const input = useOrunCodeStore((s) => s.aiInput);
  const setState = useOrunCodeStore.setState;
  const [thinking, setThinking] = useState(false);

  const modeMeta = AI_MODE_META[mode];

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { id: generateId(), role: "user" as const, text, mode, ts: Date.now() };
    setState({ aiChat: [...chat, userMsg], aiInput: "" });
    setThinking(true);

    const activeFileId = useOrunCodeStore.getState().activeFileId;
    const activeFile = activeFileId ? useOrunCodeStore.getState().files[activeFileId] : undefined;

    let replyText: string;
    if (mode === "plan") {
      replyText = `Análisei o pedido. Plano proposto (mode Plan — nada alterado):\n1. Localizar os arquivos relevantes\n2. Validar dependências e fluxo\n3. Propor a implementação\n\nMude para o mode Act para eu aplicar as mudanças.`;
      setState((s: any) => ({ aiPlanSteps: ["Localizar arquivos relevantes", "Validar dependências e fluxo", "Propor implementação"] }));
    } else {
      const result = await runOrunCodeAction("execute_command", { command: text });
      const security = activeFile?.content
        ? await runOrunCodeAction("analyze_security", { path: activeFile.path || activeFile.name, content: activeFile.content })
        : null;

      const cmdLines = result.success && (result.data?.stdout || result.data?.stderr)
        ? [`$ ${text}`, String(result.data.stdout || result.data.stderr || "").trim()]
        : [];
      setState((s: any) => ({ terminalLines: [...s.terminalLines, ...cmdLines] }));

      let appliedFile = "";
      let appliedSummary = "";
      if (activeFile) {
        const w = await runOrunCodeAction("write_file", { path: activeFile.path || activeFile.name, content: activeFile.content });
        appliedFile = activeFile.path || activeFile.name;
        appliedSummary = w.success ? "Reescrito via bridge (mesmo conteúdo atual)" : "Registrado localmente";
      }

      const health = security?.success ? security.data.health : null;
      replyText = `Executando no mode Act.\n• Terminal: ${result.success ? "comando enviado" : "sem terminal disponível (simulado)"}\n${
        activeFile ? `• Arquivo ativo: ${appliedFile}\n• Segurança: score ${security?.data?.score ?? "—"}/100 (${health ?? "—"})\n• Mudança: ${appliedSummary}` : "• Nenhum arquivo aberto — abra um arquivo no editor para ver análise real de segurança."
      }`;
      setState((s: any) => ({
        aiChanges: [
          ...(activeFile
            ? [{ id: generateId(), file: activeFile.path || activeFile.name, action: "edit" as const, summary: appliedSummary, status: "applied" as const, ts: Date.now() }]
            : []),
          ...s.aiChanges,
        ],
      }));
    }

    const reply = {
      id: generateId(),
      role: "assistant" as const,
      text: replyText,
      mode,
      ts: Date.now(),
    };
    setState((s: any) => ({ aiChat: [...s.aiChat, reply] }));
    setThinking(false);
  };

  const toggleMode = () => {
    setState({ aiMode: mode === "plan" ? "act" : "plan" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: OC.border }}>
        <span className="text-[9px] uppercase tracking-[0.16em] font-semibold flex items-center gap-1.5" style={{ color: OC.dim }}>
          Orun AI
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMode}
            className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide transition-all flex items-center gap-1.5"
            style={modePillStyle(mode)}
            title={modeMeta.desc}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: modeMeta.color, boxShadow: `0 0 6px ${modeMeta.color}` }} />
            {modeMeta.label}
          </button>
          <button onClick={() => setState({ aiPanelOpen: false })} className="p-1 rounded hover:bg-white/[0.05]" style={{ color: OC.dim }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Mode description */}
      <div className="px-3 py-1.5 border-b text-[9px]" style={{ borderColor: OC.border, color: OC.dim, background: OC.card }}>
        {modeMeta.desc}
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: OC.border }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setState({ aiPanelTab: t.id })}
              className="flex items-center gap-1 px-2 py-2 text-[9px] transition-colors relative"
              style={{ color: isActive ? OC.text : OC.dim, borderBottom: isActive ? `2px solid ${OC.primary}` : "2px solid transparent" }}
            >
              <Icon size={11} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto oc-scroll">
        {tab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto oc-scroll px-3 py-3 space-y-2">
              {chat.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg px-2.5 py-2 text-[11px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: m.role === "user" ? "rgba(229,9,20,0.12)" : OC.card,
                    border: `1px solid ${m.role === "user" ? "rgba(229,9,20,0.3)" : OC.border}`,
                    color: OC.text,
                  }}
                >
                  {m.text}
                </div>
              ))}
              {thinking && (
                <div className="rounded-lg px-2.5 py-2 text-[11px]" style={{ background: OC.card, border: `1px solid ${OC.border}`, color: OC.sub }}>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: OC.primary }} />
                    Orun pensando...
                  </span>
                </div>
              )}
            </div>
            <div className="p-2 border-t" style={{ borderColor: OC.border }}>
              <div className="flex items-end gap-1.5">
                <textarea
                  value={input}
                  onChange={(e) => setState({ aiInput: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  rows={2}
                  placeholder={mode === "plan" ? "Descreva a tarefa (mode Plan)..." : "Descreva a tarefa a executar (mode Act)..."}
                  className="flex-1 resize-none outline-none rounded-lg px-2.5 py-2 text-[11px]"
                  style={{ background: OC.card, border: `1px solid ${OC.borderHi}`, color: OC.text }}
                />
                <button
                  onClick={sendMessage}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: OC.primary, color: "#fff" }}
                  title="Enviar"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "context" && (
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-[0.14em] font-semibold" style={{ color: OC.dim }}>Contexto</span>
              <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px]" style={{ background: OC.card2, color: OC.sub, border: `1px solid ${OC.borderHi}` }}>
                <Plus size={10} /> Adicionar
              </button>
            </div>
            {CONTEXT_BOOTSTRAP.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
                  <Icon size={12} style={{ color: OC.info }} />
                  <span className="text-[10px] font-mono truncate" style={{ color: OC.sub }}>{c.label}</span>
                </div>
              );
            })}
            <p className="text-[9px] mt-3 leading-relaxed" style={{ color: OC.dim }}>
              O Orun usa contexto da codebase (AST, grafos, git, memória do projeto) para responder com precisão.
            </p>
          </div>
        )}

        {tab === "plan" && (
          <PlanView />
        )}

        {tab === "changes" && (
          <ChangesView />
        )}

        {tab === "review" && (
          <ReviewView />
        )}
      </div>
    </div>
  );
}

function PlanView() {
  const steps = useOrunCodeStore((s) => s.aiPlanSteps);
  return (
    <div className="px-3 py-3">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold block mb-2" style={{ color: OC.dim }}>Plano de Implementação</span>
      {steps.length === 0 && (
        <p className="text-[10px]" style={{ color: OC.dim }}>Nenhum plano ainda. Peça uma tarefa no mode Plan.</p>
      )}
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2 px-2 py-1.5 mb-1 rounded-md text-[10px]" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0" style={{ background: OC.primaryDark, color: "#fff" }}>
            {i + 1}
          </span>
          <span style={{ color: OC.text }}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function ChangesView() {
  const changes = useOrunCodeStore((s) => s.aiChanges);
  const actionColor: Record<string, string> = { create: OC.success, edit: OC.info, delete: OC.error, rename: OC.alert };
  return (
    <div className="px-3 py-3">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold block mb-2" style={{ color: OC.dim }}>Mudanças</span>
      {changes.length === 0 && (
        <p className="text-[10px]" style={{ color: OC.dim }}>Nenhuma mudança. Use o mode Act para aplicar edições de arquivos.</p>
      )}
      {changes.map((c) => (
        <div key={c.id} className="px-2 pt-2 pb-1.5 mb-1.5 rounded-md" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${actionColor[c.action]}22`, color: actionColor[c.action] }}>
              {c.action}
            </span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: c.status === "applied" ? OC.success : OC.alert }}>{c.status}</span>
          </div>
          <p className="text-[10px] font-mono truncate" style={{ color: OC.sub }}>{c.file}</p>
          <p className="text-[9px]" style={{ color: OC.dim }}>{c.summary}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewView() {
  const issues = [
    { sev: "medium", file: "orun_project/src/app/app.ts", line: 42, msg: "eval() pode permitir injeção de código" },
    { sev: "low", file: "orun_project/src/app/store.ts", line: 88, msg: "secreto armazenado em localStorage" },
  ];
  const sevColor: Record<string, string> = { critical: OC.error, high: OC.error, medium: OC.alert, low: OC.info };
  return (
    <div className="px-3 py-3">
      <span className="text-[9px] uppercase tracking-[0.14em] font-semibold block mb-2" style={{ color: OC.dim }}>Revisão de Código</span>
      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 rounded-md text-[10px]" style={{ background: OC.success, color: "#fff" }}>
        ✓ Nenhum problema crítico
      </div>
      {issues.map((i, idx) => (
        <div key={idx} className="px-2 py-2 mb-1.5 rounded-md" style={{ background: OC.card, border: `1px solid ${OC.border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${sevColor[i.sev]}22`, color: sevColor[i.sev] }}>{i.sev}</span>
            <span className="text-[9px] font-mono truncate" style={{ color: OC.dim }}>{i.file}:{i.line}</span>
          </div>
          <p className="text-[10px]" style={{ color: OC.text }}>{i.msg}</p>
        </div>
      ))}
    </div>
  );
}

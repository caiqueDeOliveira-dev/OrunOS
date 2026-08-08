import { useState, useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerTeacherActions, unregisterTeacherActions, setWhiteboardStoreGetter } from "./teacher-actions";
import { useWhiteboardStore, undo, redo, clearCanvas } from "./teacher-store";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { QuizPanel } from "./components/QuizPanel";
import { LessonPlanner } from "./components/LessonPlanner";
import { PALETTE, STROKE_WIDTHS, ACCENT } from "./teacher-types";
import { P, PremiumRoot } from "../premium";

type PanelKey = "board" | "quiz" | "lessons";

const TOOL_ICONS: Record<string, string> = { pen: "✏️", rect: "□", circle: "○", text: "T", eraser: "◻", select: "👆" };
const TOOL_SHORTCUTS: Record<string, string> = { pen: "P", rect: "R", circle: "C", text: "T", eraser: "E", select: "S" };

export function TeacherWorkspace({ onSendMessage }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Teacher");
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const elements = useWhiteboardStore((s) => s.elements);
  const [activePanel, setActivePanel] = useState<PanelKey>("board");

  useEffect(() => {
    setWhiteboardStoreGetter(() => useWhiteboardStore);
    registerTeacherActions();
    return () => unregisterTeacherActions();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      const keyMap: Record<string, string> = { p: "pen", r: "rect", c: "circle", t: "text", e: "eraser", s: "select" };
      if (keyMap[e.key] && !e.ctrlKey && !e.metaKey) { useWhiteboardStore.setState({ tool: keyMap[e.key] as any }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <PremiumRoot>
      <div className="flex items-center justify-between px-4 py-1" style={{ borderBottom: `1px solid ${P.border}` }}>
        <span className="ws-small">{greeting}, Professor(a) {userName}</span>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: P.violet, color: "#fff" }}>{avatarInitials}</div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: P.border }}>
        <div className="flex gap-1 mr-2">
          {(["board", "quiz", "lessons"] as const).map((p) => (
            <button key={p} onClick={() => setActivePanel(p)}
              className="px-2.5 py-1 rounded-md ws-label transition-all"
              style={{
                fontWeight: activePanel === p ? 500 : 300,
                color: activePanel === p ? P.text : P.sub,
                background: activePanel === p ? "rgba(195,0,47,0.08)" : "transparent",
              }}>
              {p === "board" ? "Quadro" : p === "quiz" ? "Quiz" : "Planos"}
            </button>
          ))}
        </div>

        {activePanel === "board" && (
          <>
            <div className="w-px h-4" style={{ background: P.border }} />
            {(["pen", "rect", "circle", "text", "eraser"] as const).map((t) => (
              <button key={t} onClick={() => useWhiteboardStore.setState({ tool: t })}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] transition-all relative group"
                style={{ background: tool === t ? "rgba(195,0,47,0.15)" : "transparent", color: tool === t ? ACCENT : P.sub }}
                title={`${t.charAt(0).toUpperCase() + t.slice(1)} (${TOOL_SHORTCUTS[t]})`}>
                {TOOL_ICONS[t] || t}
                <span className="absolute -top-1.5 -right-1.5 text-[6px] px-0.5 rounded"
                  style={{ background: P.primary, color: P.text, opacity: 0.8 }}>
                  {TOOL_SHORTCUTS[t]}
                </span>
              </button>
            ))}
            <div className="w-px h-4" style={{ background: P.border }} />
            <div className="flex gap-1">
              {PALETTE.map((c) => (
                <button key={c} onClick={() => useWhiteboardStore.setState({ color: c })}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{ background: c, border: color === c ? `2px solid ${P.text}` : "2px solid transparent", transform: color === c ? "scale(1.15)" : "scale(1)" }} />
              ))}
            </div>
            <div className="w-px h-4" style={{ background: P.border }} />
            <div className="flex gap-1">
              {STROKE_WIDTHS.map((w) => (
                <button key={w} onClick={() => useWhiteboardStore.setState({ strokeWidth: w })}
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: strokeWidth === w ? "rgba(195,0,47,0.15)" : "transparent" }}>
                  <div className="rounded-full" style={{ width: w * 2, height: w * 2, background: strokeWidth === w ? ACCENT : P.sub }} />
                </button>
              ))}
            </div>
            <div className="w-px h-4" style={{ background: P.border }} />
            <button onClick={undo} className="px-1.5 py-1 rounded text-[9px]" style={{ color: P.sub }} title="Desfazer (Ctrl+Z)">↩</button>
            <button onClick={redo} className="px-1.5 py-1 rounded text-[9px]" style={{ color: P.sub }} title="Refazer (Ctrl+Y)">↪</button>
            <div className="flex-1" />
            <span className="ws-small">{elements.length} elem</span>
            <button onClick={clearCanvas}
              className="ws-button text-[9px]" style={{ color: P.error }}>
              Limpar
            </button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activePanel === "board" && <WhiteboardCanvas />}
        {activePanel === "quiz" && <QuizPanel />}
        {activePanel === "lessons" && <LessonPlanner />}
      </div>

      <div className="ws-card p-3 mx-3 mb-14">
        <span className="ws-body font-medium block mb-2">Notas Pessoais</span>
        <textarea value={notes} onChange={(e) => updateNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
          style={{ background: P.card2, color: P.text, border: `1px solid ${P.border}`, minHeight: "60px" }}
          placeholder="Anotações da aula..." />
      </div>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </PremiumRoot>
  );
}

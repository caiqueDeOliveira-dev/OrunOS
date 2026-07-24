// plugins/workspaces/workspace-teacher-whiteboard/TeacherWorkspace.tsx
//
// Teacher workspace — interactive whiteboard with drawing, text, shapes,
// quiz builder, and lesson planner. Uses SVG for drawing.

import { useState, useRef, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerTeacherActions, unregisterTeacherActions, setWhiteboardStoreGetter } from "./teacher-actions";

// ── Types ───────────────────────────────────────────────────────────────

interface DrawElement {
  id: string;
  type: "pen" | "text" | "rect" | "circle" | "eraser";
  points?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth?: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  objectives: string[];
  duration: string;
}

interface WhiteboardState {
  [key: string]: unknown;
  elements: DrawElement[];
  tool: "pen" | "text" | "rect" | "circle" | "eraser" | "select";
  color: string;
  strokeWidth: number;
  questions: QuizQuestion[];
  lessons: LessonPlan[];
}

const useWhiteboardStore = createStore<WhiteboardState>({
  elements: [],
  tool: "pen",
  color: "#C00018",
  strokeWidth: 3,
  questions: [],
  lessons: [],
});

// ── Color Palette ───────────────────────────────────────────────────────

const PALETTE = ["#C00018", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#06B6D4", "#FFFFFF", "#1A1A2E"];

// ── SVG Canvas ──────────────────────────────────────────────────────────

function WhiteboardCanvas() {
  const elements = useWhiteboardStore((s) => s.elements);
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<string>("");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<DrawElement | null>(null);

  const getPos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPoints(`${pos.x},${pos.y}`);
    } else if (tool === "text") {
      const text = prompt("Digite o texto:");
      if (text) {
        const newEl: DrawElement = {
          id: `el-${Date.now()}`,
          type: "text",
          x: pos.x,
          y: pos.y,
          text,
          color,
        };
        useWhiteboardStore.setState((s) => ({
          elements: [...s.elements, newEl],
        }));
      }
      setIsDrawing(false);
    }
  }, [tool, color, getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if ((tool === "pen" || tool === "eraser") && currentPoints) {
      setCurrentPoints((prev) => `${prev} ${pos.x},${pos.y}`);
    } else if (startPos && (tool === "rect" || tool === "circle")) {
      const newEl: DrawElement = {
        id: "preview",
        type: tool,
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
        color,
      };
      setShapePreview(newEl);
    }
  }, [isDrawing, tool, currentPoints, startPos, color, getPos]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === "pen" || tool === "eraser") && currentPoints) {
      const newEl: DrawElement = {
        id: `el-${Date.now()}`,
        type: tool,
        points: currentPoints,
        color: tool === "eraser" ? "#1A1A2E" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 4 : strokeWidth,
      };
      useWhiteboardStore.setState((s) => ({
        elements: [...s.elements, newEl],
      }));
      setCurrentPoints("");
    } else if (shapePreview && startPos) {
      const newEl: DrawElement = { ...shapePreview, id: `el-${Date.now()}` };
      useWhiteboardStore.setState((s) => ({
        elements: [...s.elements, newEl],
      }));
      setShapePreview(null);
    }
    setStartPos(null);
  }, [isDrawing, tool, currentPoints, shapePreview, startPos, color, strokeWidth]);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: "var(--background, #0D1117)" }}>
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Rendered elements */}
        {elements.map((el) => {
          if (el.type === "pen" || el.type === "eraser") {
            return (
              <polyline
                key={el.id}
                points={el.points || ""}
                fill="none"
                stroke={el.color}
                strokeWidth={el.strokeWidth || 3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }
          if (el.type === "rect") {
            return (
              <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height}
                fill="none" stroke={el.color} strokeWidth={2} rx={4} />
            );
          }
          if (el.type === "circle") {
            return (
              <ellipse key={el.id} cx={(el.x || 0) + (el.width || 0) / 2} cy={(el.y || 0) + (el.height || 0) / 2}
                rx={(el.width || 0) / 2} ry={(el.height || 0) / 2}
                fill="none" stroke={el.color} strokeWidth={2} />
            );
          }
          if (el.type === "text") {
            return (
              <text key={el.id} x={el.x} y={el.y} fill={el.color}
                fontFamily="'Sora', sans-serif" fontSize="14">
                {el.text}
              </text>
            );
          }
          return null;
        })}

        {/* Shape preview */}
        {shapePreview && (
          <g opacity={0.5}>
            {shapePreview.type === "rect" && (
              <rect x={shapePreview.x} y={shapePreview.y} width={shapePreview.width} height={shapePreview.height}
                fill="none" stroke={shapePreview.color} strokeWidth={2} strokeDasharray="5,5" rx={4} />
            )}
            {shapePreview.type === "circle" && (
              <ellipse cx={(shapePreview.x || 0) + (shapePreview.width || 0) / 2} cy={(shapePreview.y || 0) + (shapePreview.height || 0) / 2}
                rx={(shapePreview.width || 0) / 2} ry={(shapePreview.height || 0) / 2}
                fill="none" stroke={shapePreview.color} strokeWidth={2} strokeDasharray="5,5" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Quiz Builder ────────────────────────────────────────────────────────

function QuizPanel() {
  const questions = useWhiteboardStore((s) => s.questions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const score = showResults
    ? questions.filter((q) => answers[q.id] === q.correct).length
    : 0;

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Quiz — {questions.length} questões
        </h3>
        {showResults && (
          <span className="text-[10px] px-2 py-1 rounded-full" style={{
            background: score >= questions.length * 0.7 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: score >= questions.length * 0.7 ? "#22C55E" : "#EF4444",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
          </span>
        )}
      </div>

      {questions.map((q, qi) => (
        <div key={q.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--foreground)" }}>
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-1">
            {q.options.map((opt, oi) => {
              const isSelected = answers[q.id] === oi;
              const isCorrect = showResults && oi === q.correct;
              const isWrong = showResults && isSelected && oi !== q.correct;
              return (
                <button
                  key={oi}
                  onClick={() => !showResults && setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-[10px] transition-all"
                  style={{
                    background: isCorrect ? "rgba(34,197,94,0.1)" : isWrong ? "rgba(239,68,68,0.1)" : isSelected ? "rgba(192,0,24,0.08)" : "rgba(255,255,255,0.02)",
                    color: isCorrect ? "#22C55E" : isWrong ? "#EF4444" : "var(--foreground)",
                    border: `1px solid ${isCorrect ? "rgba(34,197,94,0.3)" : isWrong ? "rgba(239,68,68,0.3)" : isSelected ? "rgba(192,0,24,0.2)" : "var(--border)"}`,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowResults(true)}
        disabled={Object.keys(answers).length < questions.length}
        className="w-full py-2 rounded-lg text-[10px] tracking-wider uppercase transition-all"
        style={{
          fontFamily: "'Sora', sans-serif",
          background: Object.keys(answers).length >= questions.length ? "#C00018" : "rgba(255,255,255,0.05)",
          color: Object.keys(answers).length >= questions.length ? "#fff" : "var(--muted-foreground)",
          opacity: Object.keys(answers).length >= questions.length ? 1 : 0.5,
        }}
      >
        Verificar Respostas
      </button>
    </div>
  );
}

// ── Lesson Planner ──────────────────────────────────────────────────────

function LessonPlanner() {
  const lessons = useWhiteboardStore((s) => s.lessons);

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
        Planos de Aula
      </h3>
      {lessons.map((lesson) => (
        <div key={lesson.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{lesson.title}</p>
              <p className="text-[9px]" style={{ color: "#C00018" }}>{lesson.subject}</p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
              background: "rgba(59,130,246,0.1)",
              color: "#3B82F6",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {lesson.duration}
            </span>
          </div>
          <div className="space-y-1">
            {lesson.objectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full" style={{ background: "#C00018" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{obj}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function TeacherWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const [activePanel, setActivePanel] = useState<"board" | "quiz" | "lessons">("board");

  useEffect(() => {
    setWhiteboardStoreGetter(() => useWhiteboardStore);
    registerTeacherActions();
    return () => unregisterTeacherActions();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {/* Panel tabs */}
        <div className="flex gap-1 mr-2">
          {(["board", "quiz", "lessons"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePanel(p)}
              className="px-2.5 py-1 rounded-md text-[9px] tracking-wider uppercase transition-all"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: activePanel === p ? 500 : 300,
                color: activePanel === p ? "var(--foreground)" : "var(--muted-foreground)",
                background: activePanel === p ? "rgba(192,0,24,0.08)" : "transparent",
              }}
            >
              {p === "board" ? "Quadro" : p === "quiz" ? "Quiz" : "Planos"}
            </button>
          ))}
        </div>

        {activePanel === "board" && (
          <>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            {/* Drawing tools */}
            {(["pen", "rect", "circle", "text", "eraser"] as const).map((t) => (
              <button
                key={t}
                onClick={() => useWhiteboardStore.setState({ tool: t })}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] transition-all"
                style={{
                  background: tool === t ? "rgba(192,0,24,0.15)" : "transparent",
                  color: tool === t ? "#C00018" : "var(--muted-foreground)",
                }}
              >
                {t === "pen" ? "✏️" : t === "rect" ? "□" : t === "circle" ? "○" : t === "text" ? "T" : "◻"}
              </button>
            ))}
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            {/* Color palette */}
            <div className="flex gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => useWhiteboardStore.setState({ color: c })}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{
                    background: c,
                    border: color === c ? "2px solid var(--foreground)" : "2px solid transparent",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <div className="w-px h-4" style={{ background: "var(--border)" }} />
            {/* Stroke width */}
            <div className="flex gap-1">
              {[1, 3, 6].map((w) => (
                <button
                  key={w}
                  onClick={() => useWhiteboardStore.setState({ strokeWidth: w })}
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    background: strokeWidth === w ? "rgba(192,0,24,0.15)" : "transparent",
                  }}
                >
                  <div className="rounded-full" style={{ width: w * 2, height: w * 2, background: strokeWidth === w ? "#C00018" : "var(--muted-foreground)" }} />
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {/* Clear */}
            <button
              onClick={() => useWhiteboardStore.setState({ elements: [] })}
              className="px-2.5 py-1 rounded-md text-[9px] tracking-wider uppercase"
              style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}
            >
              Limpar
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "board" && <WhiteboardCanvas />}
        {activePanel === "quiz" && (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <QuizPanel />
          </div>
        )}
        {activePanel === "lessons" && (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <LessonPlanner />
          </div>
        )}
      </div>
    </div>
  );
}

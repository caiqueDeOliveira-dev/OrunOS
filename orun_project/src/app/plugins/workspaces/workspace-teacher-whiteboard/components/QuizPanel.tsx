import { useState } from "react";
import { useWhiteboardStore } from "../teacher-store";
import type { QuizQuestion } from "../teacher-types";

export function QuizPanel() {
  const questions = useWhiteboardStore((s) => s.questions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const answeredCount = Object.keys(answers).length;
  const score = showResults ? questions.filter((q) => answers[q.id] === q.correct).length : 0;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide" style={{ maxHeight: "100%" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Quiz — {questions.length} {questions.length === 1 ? "questão" : "questões"}
        </h3>
        {showResults && (
          <span className="text-[10px] px-2 py-1 rounded-full" style={{
            background: score >= questions.length * 0.7 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: score >= questions.length * 0.7 ? "var(--ok)" : "var(--err)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {score}/{questions.length} ({pct}%)
          </span>
        )}
      </div>

      {questions.length === 0 && (
        <p className="text-[10px] text-center py-6" style={{ color: "var(--muted-foreground)" }}>
          Nenhuma questão cadastrada. Use a IA para adicionar questões.
        </p>
      )}

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
                <button key={oi}
                  onClick={() => !showResults && setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                  className="w-full text-left px-2.5 py-1.5 rounded-md text-[10px] transition-all"
                  style={{
                    background: isCorrect ? "rgba(34,197,94,0.1)" : isWrong ? "rgba(239,68,68,0.1)" : isSelected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "rgba(255,255,255,0.02)",
                    color: isCorrect ? "var(--ok)" : isWrong ? "var(--err)" : "var(--foreground)",
                    border: `1px solid ${isCorrect ? "rgba(34,197,94,0.3)" : isWrong ? "rgba(239,68,68,0.3)" : isSelected ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "var(--border)"}`,
                  }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {questions.length > 0 && (
        <button onClick={() => { if (answeredCount >= questions.length) setShowResults(true); }}
          disabled={answeredCount < questions.length}
          className="w-full py-2 rounded-lg text-[10px] tracking-wider uppercase transition-all"
          style={{
            fontFamily: "'Sora', sans-serif",
            background: answeredCount >= questions.length ? "var(--primary)" : "rgba(255,255,255,0.05)",
            color: answeredCount >= questions.length ? "#fff" : "var(--muted-foreground)",
            opacity: answeredCount >= questions.length ? 1 : 0.5,
          }}>
          {showResults ? "Corrigido" : "Verificar Respostas"}
        </button>
      )}
    </div>
  );
}

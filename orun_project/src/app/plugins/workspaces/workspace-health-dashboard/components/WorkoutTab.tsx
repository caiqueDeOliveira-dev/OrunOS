import { useState } from "react";
import type { WorkoutSession, WorkoutExercise } from "../health-types";
import { useHealthStore, addWorkout } from "../health-store";

const EXERCISE_LIBRARY = [
  { name: "Supino Reto", muscleGroup: "Peito" },
  { name: "Supino Inclinado", muscleGroup: "Peito" },
  { name: "Crucifixo", muscleGroup: "Peito" },
  { name: "Flexão", muscleGroup: "Peito" },
  { name: "Puxada Alta", muscleGroup: "Costas" },
  { name: "Remada Curvada", muscleGroup: "Costas" },
  { name: "Agachamento", muscleGroup: "Pernas" },
  { name: "Leg Press", muscleGroup: "Pernas" },
  { name: "Cadeira Extensora", muscleGroup: "Pernas" },
  { name: "Rosca Direta", muscleGroup: "Bíceps" },
  { name: "Rosca Martelo", muscleGroup: "Bíceps" },
  { name: "Tríceps Pulley", muscleGroup: "Tríceps" },
  { name: "Tríceps Testa", muscleGroup: "Tríceps" },
  { name: "Mergulho", muscleGroup: "Tríceps" },
  { name: "Desenvolvimento", muscleGroup: "Ombro" },
  { name: "Elevação Lateral", muscleGroup: "Ombro" },
  { name: "Abdominal", muscleGroup: "Core" },
  { name: "Prancha", muscleGroup: "Core" },
];

const COMMON_WORKOUTS = [
  { name: "Peito & Tríceps", exercises: ["Supino Reto", "Supino Inclinado", "Crucifixo", "Tríceps Pulley", "Tríceps Testa", "Mergulho"] },
  { name: "Costas & Bíceps", exercises: ["Puxada Alta", "Remada Curvada", "Rosca Direta", "Rosca Martelo"] },
  { name: "Pernas", exercises: ["Agachamento", "Leg Press", "Cadeira Extensora", "Abdominal"] },
  { name: "Ombro & Core", exercises: ["Desenvolvimento", "Elevação Lateral", "Abdominal", "Prancha"] },
];

export function WorkoutTab() {
  const workouts = useHealthStore((s) => s.workouts);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = workouts.find((w) => w.date === today);

  const startWorkout = (name: string, exNames: string[]) => {
    const exs: WorkoutExercise[] = exNames.map((en) => ({
      name: en, series: "4x10", load: "", done: false, muscleGroup: EXERCISE_LIBRARY.find((e) => e.name === en)?.muscleGroup || "",
    }));
    setExercises(exs);
    setActiveWorkout(name);
  };

  const toggleExercise = (index: number) => {
    setExercises((exs) => exs.map((e, i) => i === index ? { ...e, done: !e.done } : e));
  };

  const finishWorkout = () => {
    if (!activeWorkout || exercises.length === 0) return;
    addWorkout({ date: today, name: activeWorkout, exercises });
    setActiveWorkout(null);
    setExercises([]);
  };

  return (
    <div className="p-4 space-y-4">
      {todayWorkout && (
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "rgba(34,197,94,0.03)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-1" style={{ fontFamily: "'Sora', sans-serif", color: "var(--ok)" }}>
            Treino de Hoje: {todayWorkout.name} ✓
          </h3>
          <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
            {todayWorkout.exercises.filter((e) => e.done).length}/{todayWorkout.exercises.length} exercícios concluídos
          </p>
        </div>
      )}

      {!activeWorkout && (
        <>
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Iniciar Treino</h3>
          <div className="grid grid-cols-2 gap-2">
            {COMMON_WORKOUTS.map((w) => (
              <button key={w.name} onClick={() => startWorkout(w.name, w.exercises)}
                className="p-3 rounded-xl border text-left transition-all hover:bg-white/[0.02]"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <span className="text-[10px] font-medium block" style={{ color: "var(--foreground)" }}>{w.name}</span>
                <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{w.exercises.length} exercícios</span>
              </button>
            ))}
          </div>

          {workouts.filter((w) => w.date !== today).length > 0 && (
            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Histórico</h3>
              {workouts.filter((w) => w.date !== today).slice(-5).reverse().map((w) => (
                <div key={w.id} className="flex justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>{w.date}</span>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{w.name} — {w.exercises.filter((e) => e.done).length}/{w.exercises.length}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeWorkout && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {activeWorkout}
            </h3>
            <button onClick={finishWorkout}
              className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase"
              style={{ fontFamily: "'Sora', sans-serif", background: "var(--ok)", color: "white" }}>
              Finalizar Treino
            </button>
          </div>
          {exercises.map((ex, i) => (
            <div key={i} onClick={() => toggleExercise(i)}
              className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
              style={{ borderColor: "var(--border)", background: ex.done ? "rgba(34,197,94,0.05)" : "var(--card)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                background: ex.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                color: ex.done ? "var(--ok)" : "var(--muted-foreground)",
              }}>
                <span className="text-[10px]">{ex.done ? "✓" : i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: "var(--foreground)", opacity: ex.done ? 0.5 : 1 }}>{ex.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                  {ex.muscleGroup} · {ex.series}
                  {ex.load ? ` — ${ex.load}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

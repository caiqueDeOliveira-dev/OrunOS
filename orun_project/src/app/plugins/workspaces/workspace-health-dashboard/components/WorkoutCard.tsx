import { Dumbbell, Play } from "lucide-react";
import { useHealthStore } from "../health-store";

export function WorkoutCard({ onNavigate }: { onNavigate?: () => void }) {
  const workouts = useHealthStore((s) => s.workouts);
  const today = new Date().toISOString().split("T")[0];
  const todayWorkout = workouts.find((w) => w.date === today);

  const defaultWorkout = {
    name: "PEITO + TRICEPS",
    exercises: [
      { name: "Supino reto", series: "4 x 10" },
      { name: "Supino inclinado", series: "4 x 10" },
      { name: "Crucifixo", series: "3 x 12" },
      { name: "Triceps pulley", series: "3 x 12" },
    ],
    summary: "4 exercicios - 12 series - ~52 min",
  };

  const workout = todayWorkout
    ? { name: todayWorkout.name, exercises: todayWorkout.exercises.map((e) => ({ name: e.name, series: e.series })), summary: `${todayWorkout.exercises.length} exercicios` }
    : defaultWorkout;

  return (
    <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
          Treino de Hoje
        </h3>
        <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "rgba(229,9,20,0.1)", color: "#E50914", fontFamily: "'Sora', sans-serif" }}>
          VER PLANO
        </span>
      </div>

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,9,20,0.12)" }}>
          <Dumbbell size={16} style={{ color: "#E50914" }} />
        </div>
        <div>
          <p className="text-[11px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#E50914" }}>{workout.name}</p>
          <p className="text-[8px]" style={{ color: "#6B7280" }}>{workout.summary}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {workout.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] w-4 text-center" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#6B7280" }}>{i + 1}</span>
              <span className="text-[10px]" style={{ color: "#FFFFFF" }}>{ex.name}</span>
            </div>
            <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#9CA3AF" }}>{ex.series}</span>
          </div>
        ))}
      </div>

      <button onClick={onNavigate}
        className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110"
        style={{ background: "#E50914", color: "#FFFFFF", fontFamily: "'Sora', sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>
        <Play size={12} fill="currentColor" />
        INICIAR TREINO
      </button>
    </div>
  );
}

import { useHealthStore } from "../health-store";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function NutritionCard() {
  const meals = useHealthStore((s) => s.meals);
  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat, 0);
  const targetCalories = 2200;

  const lastMeal = [...meals].sort((a, b) => b.time.localeCompare(a.time))[0];

  const macros = [
    { label: "Proteina", value: totalProtein, unit: "g", color: "#E50914" },
    { label: "Carboidratos", value: totalCarbs, unit: "g", color: "#3B82F6" },
    { label: "Gorduras", value: totalFat, unit: "g", color: "#F59E0B" },
  ];

  const donutData = [
    { name: "consumido", value: totalCalories },
    { name: "restante", value: Math.max(0, targetCalories - totalCalories) },
  ];

  return (
    <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
          Nutricao Hoje
        </h3>
        <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "rgba(229,9,20,0.1)", color: "#E50914", fontFamily: "'Sora', sans-serif" }}>
          VER DIARIO
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {/* donut */}
        <div className="relative w-20 h-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={34} startAngle={90} endAngle={-270} paddingAngle={0}>
                <Cell fill="#E50914" />
                <Cell fill="rgba(255,255,255,0.06)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>{totalCalories}</span>
            <span className="text-[7px]" style={{ color: "#6B7280" }}>/ {targetCalories} kcal</span>
          </div>
        </div>

        {/* macros */}
        <div className="flex-1 space-y-2">
          {macros.map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <span className="text-[9px] w-16 shrink-0" style={{ color: "#9CA3AF" }}>{m.label}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((m.value / (m.label === "Proteina" ? 150 : m.label === "Carboidratos" ? 250 : 70)) * 100, 100)}%`, background: m.color }} />
              </div>
              <span className="text-[9px] font-medium w-8 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: m.color }}>{m.value} {m.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* last meal */}
      {lastMeal && (
        <div className="p-2.5 rounded-xl border flex items-center gap-3" style={{ borderColor: "#22222A", background: "rgba(255,255,255,0.02)" }}>
          <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
            <span className="text-lg">🍽</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium" style={{ color: "#FFFFFF" }}>{lastMeal.description}</p>
            <p className="text-[8px]" style={{ color: "#9CA3AF" }}>Almoco - {lastMeal.time}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>{lastMeal.calories}</span>
            <span className="text-[7px] block" style={{ color: "#6B7280" }}>kcal</span>
          </div>
        </div>
      )}
    </div>
  );
}

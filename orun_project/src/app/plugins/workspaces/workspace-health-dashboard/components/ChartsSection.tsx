import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { HEALTH_CHART_COLORS, type Metric, type Meal } from "../health-types";

function getWeekDay(dateStr: string): string {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  return days[new Date(dateStr + "T12:00:00").getDay()];
}

function getLast7Days(): string[] {
  const result: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

export function ChartsSection({ metrics, meals }: { metrics: Metric[]; meals: Meal[] }) {
  const stepsMetric = metrics.find((m) => m.id === "steps");
  const waterMetric = metrics.find((m) => m.id === "water");

  const weeklyData = useMemo(() => {
    const days = getLast7Days();
    const caloriesByDay: Record<string, number> = {};
    for (const d of days) caloriesByDay[d] = 0;
    for (const meal of meals) {
      const mealDate = meal.time.includes(":") ? new Date().toISOString().split("T")[0] : meal.time;
      if (mealDate in caloriesByDay) caloriesByDay[mealDate] += meal.calories;
    }
    return days.map((d) => ({
      day: getWeekDay(d),
      calorias: caloriesByDay[d],
      passos: stepsMetric?.value && d === days[days.length - 1] ? stepsMetric.value : Math.round((stepsMetric?.target || 10000) * (0.5 + Math.random() * 0.5)),
      agua: waterMetric?.value && d === days[days.length - 1] ? waterMetric.value : Math.round((waterMetric?.target || 2000) * (0.5 + Math.random() * 0.5)),
    }));
  }, [meals, stepsMetric, waterMetric]);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Calorias da Semana
        </h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }} />
            <Bar dataKey="calorias" fill={HEALTH_CHART_COLORS.calories} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Passos
          </h3>
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--info)" }}>
            {stepsMetric?.value ?? 0}
          </span>
          <span className="text-[9px] ml-1" style={{ color: "var(--muted-foreground)" }}>/ {stepsMetric?.target ?? 10000}</span>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={weeklyData}>
              <Bar dataKey="passos" fill={HEALTH_CHART_COLORS.steps} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Agua
          </h3>
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--ok)" }}>
            {waterMetric?.value ?? 0}
          </span>
          <span className="text-[9px] ml-1" style={{ color: "var(--muted-foreground)" }}>ml / {waterMetric?.target ?? 2000}</span>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={weeklyData}>
              <Bar dataKey="agua" fill={HEALTH_CHART_COLORS.water} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

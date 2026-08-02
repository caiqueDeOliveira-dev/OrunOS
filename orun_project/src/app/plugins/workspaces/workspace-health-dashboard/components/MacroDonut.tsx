import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { HEALTH_CHART_COLORS } from "../health-types";

export function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const data = [
    { name: "Proteína", value: protein, color: HEALTH_CHART_COLORS.protein },
    { name: "Carboidratos", value: carbs, color: HEALTH_CHART_COLORS.carbs },
    { name: "Gordura", value: fat, color: HEALTH_CHART_COLORS.fat },
  ];
  const total = protein + carbs + fat;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontFamily: "'Inter', sans-serif" }} formatter={(v: number, name: string) => [`${v}g`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{total}g</span>
          <span className="block text-[9px]" style={{ color: "var(--muted-foreground)" }}>total</span>
        </div>
      </div>
    </div>
  );
}

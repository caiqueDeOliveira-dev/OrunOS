import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { HEALTH_CHART_COLORS, type Metric } from "../health-types";

const weeklyMock = [
  { day: "Seg", calorias: 1800, passos: 7200, agua: 1600 },
  { day: "Ter", calorias: 2100, passos: 9100, agua: 2000 },
  { day: "Qua", calorias: 1650, passos: 5800, agua: 1400 },
  { day: "Qui", calorias: 2000, passos: 8400, agua: 2200 },
  { day: "Sex", calorias: 1900, passos: 7600, agua: 1800 },
  { day: "Sáb", calorias: 2200, passos: 10200, agua: 2500 },
  { day: "Dom", calorias: 1450, passos: 6420, agua: 1500 },
];

export function ChartsSection({ metrics }: { metrics: Metric[] }) {
  const stepsMetric = metrics.find((m) => m.id === "steps");
  const waterMetric = metrics.find((m) => m.id === "water");

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Calorias da Semana
        </h3>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={weeklyMock}>
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
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "#3B82F6" }}>
            {stepsMetric?.value ?? 0}
          </span>
          <span className="text-[9px] ml-1" style={{ color: "var(--muted-foreground)" }}>/ {stepsMetric?.target ?? 10000}</span>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={weeklyMock}>
              <Bar dataKey="passos" fill={HEALTH_CHART_COLORS.steps} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Água
          </h3>
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "#22C55E" }}>
            {waterMetric?.value ?? 0}
          </span>
          <span className="text-[9px] ml-1" style={{ color: "var(--muted-foreground)" }}>ml / {waterMetric?.target ?? 2000}</span>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={weeklyMock}>
              <Bar dataKey="agua" fill={HEALTH_CHART_COLORS.water} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Flame, Activity, TrendingDown, Dumbbell, Droplets } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { isElectron } from "../../constants";
import type { NutritionRange, HealthEntry } from "../agentPageData";

export function HealthCharts({ accent }: { accent: string }) {
  const [nutrition, setNutrition] = useState<NutritionRange | null>(null);
  const [healthData, setHealthData] = useState<HealthEntry[]>([]);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    window.orun.nutrition.getRange(s, e).then(setNutrition).catch((err: unknown) => console.warn("[IPC error]", err));
    window.orun.health.getRange(s, e).then(setHealthData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const weightData = healthData
    .filter((e) => e.metric === "peso")
    .map((e) => ({ date: new Date(e.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), peso: e.value }));

  return (
    <div className="space-y-4">
      {nutrition && nutrition.daily.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FED7D7", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={14} style={{ color: accent }} />
            <div className="text-xs font-medium" style={{ color: accent }}>Calorias - Ultimos 7 dias</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={nutrition.daily}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${Math.round(v)} kcal`} />
              <Bar dataKey="calories" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {nutrition && nutrition.daily.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FED7D7", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} style={{ color: accent }} />
            <div className="text-xs font-medium" style={{ color: accent }}>Macros Hoje</div>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Proteina", value: nutrition.daily[nutrition.daily.length - 1]?.protein_g || 0, color: "#E53E3E", icon: Dumbbell },
              { label: "Carbs", value: nutrition.daily[nutrition.daily.length - 1]?.carbs_g || 0, color: "#DD6B20", icon: Flame },
              { label: "Gordura", value: nutrition.daily[nutrition.daily.length - 1]?.fat_g || 0, color: "#D69E2E", icon: Droplets },
            ].map((m) => (
              <div key={m.label} className="flex-1 text-center p-3 rounded-xl" style={{ background: "#FFF5F5", border: "1px solid #FED7D7" }}>
                <m.icon size={16} style={{ color: m.color, margin: "0 auto 4px" }} />
                <div className="text-lg font-bold" style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(m.value)}g</div>
                <div className="text-[10px]" style={{ color: "#718096" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {weightData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FED7D7", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} style={{ color: accent }} />
            <div className="text-xs font-medium" style={{ color: accent }}>Peso - Ultimos 7 dias</div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip formatter={(v: number) => `${v} kg`} />
              <Line type="monotone" dataKey="peso" stroke={accent} strokeWidth={2} dot={{ fill: accent, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

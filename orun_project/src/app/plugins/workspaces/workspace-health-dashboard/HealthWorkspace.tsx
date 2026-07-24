// plugins/workspaces/workspace-health-dashboard/HealthWorkspace.tsx
//
// Health Dashboard workspace — interactive charts, metric cards,
// meal timeline, and workout tracker. Uses Recharts (already in project).

import { useState, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerHealthActions, unregisterHealthActions } from "./health-actions";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ── Store ───────────────────────────────────────────────────────────────

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  icon: string;
  color: string;
}

interface Meal {
  id: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface HealthState {
  [key: string]: unknown;
  metrics: Metric[];
  meals: Meal[];
  selectedRange: "today" | "week" | "month";
}

const useHealthStore = createStore<HealthState>({
  metrics: [],
  meals: [],
  selectedRange: "today",
});

// ── Macro Donut ─────────────────────────────────────────────────────────

function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const data = [
    { name: "Proteína", value: protein, color: "#C00018" },
    { name: "Carboidratos", value: carbs, color: "#3B82F6" },
    { name: "Gordura", value: fat, color: "#F59E0B" },
  ];
  const total = protein + carbs + fat;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontFamily: "'Inter', sans-serif" }}
            formatter={(v: number, name: string) => [`${v}g`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{total}g</span>
          <span className="block text-[9px]" style={{ color: "var(--muted-foreground)" }}>total</span>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: Metric }) {
  const progress = Math.min((metric.value / metric.target) * 100, 100);
  const isOnTrack = metric.value >= metric.target * 0.8;

  return (
    <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {metric.icon} {metric.name}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
          background: isOnTrack ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: isOnTrack ? "#22C55E" : "#EF4444",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isOnTrack ? "✓" : "↓"}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
          {metric.value}
        </span>
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{metric.unit}</span>
      </div>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: metric.color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>0</span>
        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{metric.target} {metric.unit}</span>
      </div>
    </div>
  );
}

// ── Meal Entry ──────────────────────────────────────────────────────────

function MealEntry({ meal }: { meal: Meal }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-medium mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C00018" }}>
        {meal.time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{meal.description}</p>
        <div className="flex gap-3 mt-1">
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{meal.calories} kcal</span>
          <span className="text-[9px]" style={{ color: "#C00018" }}>{meal.protein}g P</span>
          <span className="text-[9px]" style={{ color: "#3B82F6" }}>{meal.carbs}g C</span>
          <span className="text-[9px]" style={{ color: "#F59E0B" }}>{meal.fat}g G</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function HealthWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const metrics = useHealthStore((s) => s.metrics);
  const meals = useHealthStore((s) => s.meals);
  const selectedRange = useHealthStore((s) => s.selectedRange);
  const [activeView, setActiveView] = useState<"overview" | "meals" | "workout">("overview");

  useEffect(() => {
    registerHealthActions();
    return () => unregisterHealthActions();
  }, []);

  // Simulated weekly data for charts
  const weeklyData = [
    { day: "Seg", calorias: 1800, passos: 7200, peso: 78.8 },
    { day: "Ter", calorias: 2100, passos: 9100, peso: 78.6 },
    { day: "Qua", calorias: 1650, passos: 5800, peso: 78.5 },
    { day: "Qui", calorias: 2000, passos: 8400, peso: 78.3 },
    { day: "Sex", calorias: 1900, passos: 7600, peso: 78.5 },
    { day: "Sáb", calorias: 2200, passos: 10200, peso: 78.4 },
    { day: "Dom", calorias: 1450, passos: 6420, peso: 78.5 },
  ];

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* View Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {(["overview", "meals", "workout"] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === view ? 500 : 300,
              color: activeView === view ? "var(--foreground)" : "var(--muted-foreground)",
              background: activeView === view ? "rgba(192,0,24,0.08)" : "transparent",
            }}
          >
            {view === "overview" ? "Visão Geral" : view === "meals" ? "Refeições" : "Treino"}
          </button>
        ))}
      </div>

      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>

          {/* Weekly Calories Chart */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Calorias da Semana
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C00018" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C00018" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} />
                <Area type="monotone" dataKey="calorias" stroke="#C00018" fill="url(#calGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Macros Today */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Macros Hoje
            </h3>
            <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[9px]" style={{ color: "#C00018" }}>● Proteína {totalProtein}g</span>
              <span className="text-[9px]" style={{ color: "#3B82F6" }}>● Carbs {totalCarbs}g</span>
              <span className="text-[9px]" style={{ color: "#F59E0B" }}>● Gordura {totalFat}g</span>
            </div>
          </div>
        </div>
      )}

      {activeView === "meals" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              Refeições de Hoje
            </h3>
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", fontFamily: "'JetBrains Mono', monospace" }}>
              {totalCalories} kcal
            </span>
          </div>
          {meals.map((meal) => (
            <MealEntry key={meal.id} meal={meal} />
          ))}
        </div>
      )}

      {activeView === "workout" && (
        <div className="p-4 space-y-4">
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Treino de Hoje — Peito & Tríceps
          </h3>
          {[
            { name: "Supino Reto", series: "4x10", load: "60kg", done: true },
            { name: "Supino Inclinado", series: "3x12", load: "40kg", done: true },
            { name: "Crucifixo", series: "3x12", load: "14kg", done: false },
            { name: "Tríceps Pulley", series: "4x10", load: "25kg", done: false },
            { name: "Tríceps Testa", series: "3x12", load: "20kg", done: false },
            { name: "Mergulho", series: "3x até falha", load: "Corpo", done: false },
          ].map((ex, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: "var(--border)", background: ex.done ? "rgba(34,197,94,0.03)" : "var(--card)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                background: ex.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                color: ex.done ? "#22C55E" : "var(--muted-foreground)",
              }}>
                <span className="text-[10px]">{ex.done ? "✓" : i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: "var(--foreground)", opacity: ex.done ? 0.5 : 1 }}>{ex.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{ex.series} — {ex.load}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import type { WorkspaceProps } from "../../types";
import { registerHealthActions, unregisterHealthActions, setHealthStoreGetter } from "./health-actions";
import { useHealthStore } from "./health-store";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { MetricCard } from "./components/MetricCard";
import { MacroDonut } from "./components/MacroDonut";
import { MealEntry } from "./components/MealEntry";
import { BodyView } from "./components/BodyView";
import { ExamsView } from "./components/ExamsView";
import { WorkoutTab } from "./components/WorkoutTab";
import { ChartsSection } from "./components/ChartsSection";

type ViewKey = "overview" | "meals" | "workout" | "body" | "exams";

export function HealthWorkspace({ onSendMessage }: WorkspaceProps) {
  const metrics = useHealthStore((s) => s.metrics);
  const meals = useHealthStore((s) => s.meals);
  const bodyMeasurements = useHealthStore((s) => s.bodyMeasurements);
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Health");
  const [activeView, setActiveView] = useState<ViewKey>("overview");

  useEffect(() => {
    registerHealthActions();
    setHealthStoreGetter(() => useHealthStore);
    return () => unregisterHealthActions();
  }, []);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  const tabs: { key: ViewKey; label: string }[] = [
    { key: "overview", label: "Visão Geral" },
    { key: "meals", label: "Refeições" },
    { key: "workout", label: "Treino" },
    { key: "body", label: "Corpo" },
    { key: "exams", label: "Exames" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto ws-scrollbar">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <span className="ws-subtitle">{greeting}, {userName}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#22C55E", color: "#fff" }}>{avatarInitials}</div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveView(tab.key)}
            className="px-3 py-1.5 rounded-md ws-label transition-all"
            style={{
              fontWeight: activeView === tab.key ? 500 : 300,
              color: activeView === tab.key ? "var(--foreground)" : "var(--muted-foreground)",
              background: activeView === tab.key ? "rgba(192,0,24,0.08)" : "transparent",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => <MetricCard key={m.id} metric={m} />)}
          </div>
          <ChartsSection metrics={metrics} />
          <div className="ws-card p-3">
            <h3 className="ws-label mb-2">Macros Hoje</h3>
            <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            <div className="flex justify-center gap-4 mt-2">
              <span className="ws-small" style={{ color: "#C00018" }}>● Proteína {totalProtein}g</span>
              <span className="ws-small" style={{ color: "#3B82F6" }}>● Carbs {totalCarbs}g</span>
              <span className="ws-small" style={{ color: "#F59E0B" }}>● Gordura {totalFat}g</span>
            </div>
          </div>
        </div>
      )}

      {activeView === "meals" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="ws-subtitle">Refeições de Hoje</span>
            <span className="ws-badge ws-badge-red">{totalCalories} kcal</span>
          </div>
          {meals.length === 0 && <p className="ws-small text-center py-4">Nenhuma refeição registrada hoje.</p>}
          {meals.map((meal) => <MealEntry key={meal.id} meal={meal} />)}
        </div>
      )}

      {activeView === "workout" && <WorkoutTab />}
      {activeView === "body" && <BodyView measurements={bodyMeasurements} />}
      {activeView === "exams" && <ExamsView />}

      <div className="ws-card p-3 mx-4 mb-4">
        <span className="ws-body font-medium block mb-2">Notas Pessoais</span>
        <textarea value={notes} onChange={(e) => updateNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "60px" }}
          placeholder="Suas anotações de saúde..." />
      </div>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </div>
  );
}

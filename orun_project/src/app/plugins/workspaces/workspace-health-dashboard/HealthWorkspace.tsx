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
import { P, PremiumRoot, ScrollArea, Card } from "../premium";

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
    <PremiumRoot className="relative">
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        <span className="text-[12px] font-medium" style={{ color: P.text }}>{greeting}, {userName}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(195,0,47,0.16)", color: P.primary }}>{avatarInitials}</div>
      </div>

      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: P.border, background: P.bg }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveView(tab.key)}
            className="px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase transition-all hover:brightness-110"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === tab.key ? 500 : 300,
              color: activeView === tab.key ? P.text : P.sub,
              background: activeView === tab.key ? "rgba(195,0,47,0.14)" : "transparent",
              border: `1px solid ${activeView === tab.key ? "rgba(195,0,47,0.35)" : "transparent"}`,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea>
      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {metrics.map((m) => <MetricCard key={m.id} metric={m} />)}
          </div>
          <ChartsSection metrics={metrics} />
          <Card className="p-3">
            <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ fontFamily: "'Sora', sans-serif", color: P.dim }}>Macros Hoje</h3>
            <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[10px]" style={{ color: P.primary }}>● Proteína {totalProtein}g</span>
              <span className="text-[10px]" style={{ color: P.info }}>● Carbs {totalCarbs}g</span>
              <span className="text-[10px]" style={{ color: P.alert }}>● Gordura {totalFat}g</span>
            </div>
          </Card>
        </div>
      )}

      {activeView === "meals" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium" style={{ color: P.text }}>Refeições de Hoje</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider uppercase" style={{ background: `${P.primary}1F`, color: P.primary, border: `1px solid ${P.primary}33` }}>
              {totalCalories} kcal
            </span>
          </div>
          {meals.length === 0 && <p className="text-[10px] text-center py-4" style={{ color: P.sub }}>Nenhuma refeição registrada hoje.</p>}
          {meals.map((meal) => <MealEntry key={meal.id} meal={meal} />)}
        </div>
      )}

      {activeView === "workout" && <WorkoutTab />}
      {activeView === "body" && <BodyView measurements={bodyMeasurements} />}
      {activeView === "exams" && <ExamsView />}

      <div className="p-4">
        <div className="rounded-[18px] p-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
          <span className="text-xs font-medium block mb-2" style={{ color: P.text }}>Notas Pessoais</span>
          <textarea value={notes} onChange={(e) => updateNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
            style={{ background: P.panel, color: P.text, border: `1px solid ${P.borderHi}`, minHeight: "60px" }}
            placeholder="Suas anotações de saúde..." />
        </div>
      </div>
      </ScrollArea>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </PremiumRoot>
  );
}

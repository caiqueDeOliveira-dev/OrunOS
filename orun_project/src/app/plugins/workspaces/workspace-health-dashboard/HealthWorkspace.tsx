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
import { HealthBodyMap } from "./components/HealthBodyMap";
import { WellBeingCard } from "./components/WellBeingCard";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { VitalSignsGrid } from "./components/VitalSignsGrid";
import { NutritionCard } from "./components/NutritionCard";
import { WorkoutCard } from "./components/WorkoutCard";
import { P, PremiumRoot, ScrollArea, Card } from "../premium";
import { AlertTriangle, Pill } from "lucide-react";
import { INTENSITY_COLORS, BODY_REGION_LABELS, type BodyRegion } from "./health-types";

type ViewKey = "overview" | "meals" | "workout" | "body" | "exams";

export function HealthWorkspace({ onSendMessage }: WorkspaceProps) {
  const metrics = useHealthStore((s) => s.metrics);
  const meals = useHealthStore((s) => s.meals);
  const bodyMeasurements = useHealthStore((s) => s.bodyMeasurements);
  const symptoms = useHealthStore((s) => s.symptoms);
  const medications = useHealthStore((s) => s.medications);
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Health");
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<BodyRegion | null>(null);

  useEffect(() => {
    registerHealthActions();
    setHealthStoreGetter(() => useHealthStore);
    return () => unregisterHealthActions();
  }, []);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  const activeMeds = medications.filter((m) => m.active);
  const recentSymptoms = [...symptoms].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  const tabs: { key: ViewKey; label: string }[] = [
    { key: "overview", label: "Inicio" },
    { key: "meals", label: "Nutricao" },
    { key: "workout", label: "Treinos" },
    { key: "body", label: "Meu Corpo" },
    { key: "exams", label: "Exames" },
  ];

  return (
    <PremiumRoot className="relative" style={{ background: "#08080A" }}>
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1 shrink-0">
        <div>
          <span className="text-[13px] font-semibold block" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>Orun Health</span>
          <span className="text-[9px]" style={{ color: "#6B7280" }}>Seu centro pessoal de saude</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
            <span className="text-[8px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "#9CA3AF" }}>HEALTH ONLINE</span>
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(229,9,20,0.16)", color: "#E50914" }}>{avatarInitials}</div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: "#22222A", background: "#0D0D10" }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveView(tab.key)}
            className="px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase transition-all hover:brightness-110"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === tab.key ? 500 : 300,
              color: activeView === tab.key ? "#FFFFFF" : "#6B7280",
              background: activeView === tab.key ? "rgba(229,9,20,0.12)" : "transparent",
              border: `1px solid ${activeView === tab.key ? "rgba(229,9,20,0.3)" : "transparent"}`,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea>
        {/* ===== OVERVIEW — 3-column layout ===== */}
        {activeView === "overview" && (
          <div className="p-4">
            {/* alerts bar */}
            {(recentSymptoms.length > 0 || activeMeds.length > 0) && (
              <div className="flex gap-2 mb-4">
                {recentSymptoms.length > 0 && (
                  <div className="flex-1 p-2.5 rounded-xl border flex items-center gap-2"
                    style={{ borderColor: `${INTENSITY_COLORS[recentSymptoms[0].intensity]}33`, background: `${INTENSITY_COLORS[recentSymptoms[0].intensity]}08` }}>
                    <AlertTriangle size={12} style={{ color: INTENSITY_COLORS[recentSymptoms[0].intensity] }} />
                    <div className="min-w-0">
                      <span className="text-[9px] font-medium block truncate" style={{ color: "#FFFFFF" }}>
                        {recentSymptoms[0].description}
                      </span>
                      <span className="text-[7px]" style={{ color: "#6B7280" }}>
                        {BODY_REGION_LABELS[recentSymptoms[0].region]} - {recentSymptoms[0].date}
                      </span>
                    </div>
                    {recentSymptoms.length > 1 && (
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "rgba(229,9,20,0.12)", color: "#E50914", fontFamily: "'JetBrains Mono', monospace" }}>
                        +{recentSymptoms.length - 1}
                      </span>
                    )}
                  </div>
                )}
                {activeMeds.length > 0 && (
                  <div className="flex-1 p-2.5 rounded-xl border flex items-center gap-2"
                    style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.04)" }}>
                    <Pill size={12} style={{ color: "#3B82F6" }} />
                    <div className="min-w-0">
                      <span className="text-[9px] font-medium block truncate" style={{ color: "#FFFFFF" }}>
                        {activeMeds[0].name}
                      </span>
                      <span className="text-[7px]" style={{ color: "#6B7280" }}>
                        {activeMeds[0].dosage} - {activeMeds[0].frequency}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* LEFT — Body Map */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
                  <h3 className="text-[11px] font-semibold tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>
                    Mapa Corporal
                  </h3>
                  <div className="flex justify-center">
                    <HealthBodyMap
                      symptoms={symptoms}
                      onRegionClick={(region) => setSelectedBodyRegion(region === selectedBodyRegion ? null : region)}
                      selectedRegion={selectedBodyRegion}
                    />
                  </div>
                </div>
                <ActivityTimeline />
              </div>

              {/* CENTER — Vitals + Metrics */}
              <div className="lg:col-span-4 space-y-3">
                <VitalSignsGrid />
                <ChartsSection metrics={metrics} meals={meals} />
                <Card className="p-3 rounded-2xl" style={{ background: "#121216", borderColor: "#22222A" }}>
                  <h3 className="text-[9px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "#6B7280" }}>Macros Hoje</h3>
                  <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
                  <div className="flex justify-center gap-4 mt-2">
                    <span className="text-[10px]" style={{ color: "#E50914" }}>● Proteina {totalProtein}g</span>
                    <span className="text-[10px]" style={{ color: "#3B82F6" }}>● Carbs {totalCarbs}g</span>
                    <span className="text-[10px]" style={{ color: "#F59E0B" }}>● Gordura {totalFat}g</span>
                  </div>
                </Card>
              </div>

              {/* RIGHT — Nutrition + Workout + Wellbeing */}
              <div className="lg:col-span-3 space-y-3">
                <NutritionCard />
                <WorkoutCard onNavigate={() => setActiveView("workout")} />
                <WellBeingCard />
              </div>
            </div>

            {/* notes */}
            <div className="mt-4 p-4 rounded-2xl border" style={{ background: "#121216", borderColor: "#22222A" }}>
              <span className="text-[11px] font-semibold block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "#FFFFFF" }}>Notas Pessoais</span>
              <textarea value={notes} onChange={(e) => updateNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-[10px] resize-none outline-none"
                style={{ background: "#0D0D10", color: "#FFFFFF", border: "1px solid #22222A", minHeight: "60px" }}
                placeholder="Suas anotacoes de saude..." />
            </div>
          </div>
        )}

        {activeView === "meals" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium" style={{ color: "#FFFFFF" }}>Refeicoes de Hoje</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wider uppercase" style={{ background: "rgba(229,9,20,0.12)", color: "#E50914", border: "1px solid rgba(229,9,20,0.25)" }}>
                {totalCalories} kcal
              </span>
            </div>
            {meals.length === 0 && <p className="text-[10px] text-center py-4" style={{ color: "#6B7280" }}>Nenhuma refeicao registrada hoje.</p>}
            {meals.map((meal) => <MealEntry key={meal.id} meal={meal} />)}
          </div>
        )}

        {activeView === "workout" && <WorkoutTab />}
        {activeView === "body" && <BodyView measurements={bodyMeasurements} />}
        {activeView === "exams" && <ExamsView />}
      </ScrollArea>

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar a IA" />
    </PremiumRoot>
  );
}

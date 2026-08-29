import type { Meal } from "../health-types";

export function MealEntry({ meal }: { meal: Meal }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-medium mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
        {meal.time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{meal.description}</p>
        <div className="flex gap-3 mt-1">
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{meal.calories} kcal</span>
          <span className="text-[9px]" style={{ color: "var(--primary)" }}>{meal.protein}g P</span>
          <span className="text-[9px]" style={{ color: "var(--info)" }}>{meal.carbs}g C</span>
          <span className="text-[9px]" style={{ color: "var(--warn)" }}>{meal.fat}g G</span>
        </div>
      </div>
    </div>
  );
}

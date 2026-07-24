import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "health";

let registered = false;

let getStore: (() => any) | null = null;
export function setHealthStoreGetter(getter: () => any) { getStore = getter; }

function getHealthState() {
  if (!getStore) throw new Error("Health store not initialized");
  return getStore();
}

let mealIdCounter = 0;
function nextMealId() { return `hm_${Date.now()}_${++mealIdCounter}`; }

const actions = {
  async log_meal(params: Record<string, unknown>) {
    const name = String(params.name || "");
    const calories = typeof params.calories === "number" ? params.calories : 0;
    const protein = typeof params.protein === "number" ? params.protein : 0;
    const carbs = typeof params.carbs === "number" ? params.carbs : 0;
    const fat = typeof params.fat === "number" ? params.fat : 0;

    if (!name) return { success: false, error: "name is required" };

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const newMeal = {
      id: nextMealId(),
      time,
      description: name,
      calories,
      protein,
      carbs,
      fat,
    };

    const store = getHealthState();
    store.setState((s: any) => ({ meals: [...s.meals, newMeal] }));

    return { success: true, data: newMeal, message: `Logged meal "${name}" (${calories} kcal)` };
  },

  async log_workout(params: Record<string, unknown>) {
    const exerciseName = String(params.exerciseName || "");
    if (!exerciseName) return { success: false, error: "exerciseName is required" };

    const store = getHealthState();
    const state = store.getState();
    const calorieMetric = state.metrics.find((m: any) => m.id === "calories");

    if (calorieMetric) {
      store.setState((s: any) => ({
        metrics: s.metrics.map((m: any) =>
          m.id === "calories"
            ? { ...m, value: m.value + 300 }
            : m
        ),
      }));
    }

    return { success: true, message: `Workout logged: "${exerciseName}" (+300 kcal burned)` };
  },

  async log_metric(params: Record<string, unknown>) {
    const metric = String(params.metric || "");
    const value = typeof params.value === "number" ? params.value : 0;

    if (!metric) return { success: false, error: "metric name is required" }

    const store = getHealthState();
    const state = store.getState();
    const metricObj = state.metrics.find((m: any) => m.id === metric || m.name.toLowerCase() === metric.toLowerCase());

    if (!metricObj) {
      const available = state.metrics.map((m: any) => m.id).join(", ");
      return { success: false, error: `Metric "${metric}" not found. Available: ${available}` };
    }

    store.setState((s: any) => ({
      metrics: s.metrics.map((m: any) =>
        m.id === metricObj.id ? { ...m, value } : m
      ),
    }));

    return { success: true, data: { id: metricObj.id, value }, message: `Updated ${metricObj.name} to ${value} ${metricObj.unit}` };
  },

  async get_summary() {
    const store = getHealthState();
    const state = store.getState();

    const totalCalories = state.meals.reduce((s: number, m: any) => s + m.calories, 0);
    const totalProtein = state.meals.reduce((s: number, m: any) => s + m.protein, 0);
    const totalCarbs = state.meals.reduce((s: number, m: any) => s + m.carbs, 0);
    const totalFat = state.meals.reduce((s: number, m: any) => s + m.fat, 0);

    const metricsSummary: Record<string, any> = {};
    for (const m of state.metrics) {
      metricsSummary[m.id] = {
        name: m.name,
        value: m.value,
        unit: m.unit,
        target: m.target,
        progress: Math.round((m.value / m.target) * 100),
      };
    }

    return {
      success: true,
      data: {
        metrics: metricsSummary,
        meals: {
          count: state.meals.length,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
        },
        entries: state.meals,
      },
    };
  },

  async get_trends(params: Record<string, unknown>) {
    const metricId = String(params.metric || "weight");
    const days = typeof params.days === "number" ? params.days : 7;

    const store = getHealthState();
    const state = store.getState();
    const metric = state.metrics.find((m: any) => m.id === metricId || m.name.toLowerCase() === metricId.toLowerCase());

    if (!metric) return { success: false, error: `Metric "${metricId}" not found` };

    const trendData = [];
    const now = new Date();
    let baseValue = metric.value * 0.9;
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * metric.value * 0.1;
      baseValue = Math.max(0, baseValue + variance);
      trendData.push({
        date: date.toISOString().split("T")[0],
        value: Math.round(baseValue * 10) / 10,
      });
    }
    trendData[trendData.length - 1].value = metric.value;

    return {
      success: true,
      data: {
        metric: { id: metric.id, name: metric.name, unit: metric.unit, target: metric.target },
        trend: trendData,
        avg: Math.round((trendData.reduce((s: number, d: any) => s + d.value, 0) / trendData.length) * 10) / 10,
        min: Math.min(...trendData.map((d: any) => d.value)),
        max: Math.max(...trendData.map((d: any) => d.value)),
      },
    };
  },

  async get_meal_history() {
    const store = getHealthState();
    const state = store.getState();
    const totalCalories = state.meals.reduce((s: number, m: any) => s + m.calories, 0);
    const totalProtein = state.meals.reduce((s: number, m: any) => s + m.protein, 0);
    const totalCarbs = state.meals.reduce((s: number, m: any) => s + m.carbs, 0);
    const totalFat = state.meals.reduce((s: number, m: any) => s + m.fat, 0);

    return {
      success: true,
      data: {
        meals: state.meals,
        totals: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
        macros: {
          proteinPct: totalCalories > 0 ? Math.round((totalProtein * 4 / totalCalories) * 100) : 0,
          carbsPct: totalCalories > 0 ? Math.round((totalCarbs * 4 / totalCalories) * 100) : 0,
          fatPct: totalCalories > 0 ? Math.round((totalFat * 9 / totalCalories) * 100) : 0,
        },
      },
    };
  },
};

export function registerHealthActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterHealthActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

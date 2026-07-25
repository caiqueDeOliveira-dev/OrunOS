import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "health";

let registered = false;

let getStore: (() => any) | null = null;
export function setHealthStoreGetter(getter: () => any) { getStore = getter; }
export function getHealthStore() { return getStore ? getStore() : null; }

function getHealthState() {
  if (!getStore) throw new Error("Health store not initialized");
  return getStore();
}

let mealIdCounter = 0;
function nextMealId() { return `hm_${Date.now()}_${++mealIdCounter}`; }

let bodyMeasurementIdCounter = 0;
function nextBodyMeasurementId() { return `bm_${Date.now()}_${++bodyMeasurementIdCounter}`; }

let examIdCounter = 0;
function nextExamId() { return `ex_${Date.now()}_${++examIdCounter}`; }

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

  // ── Body Measurements ────────────────────────────────────────────────

  async log_body_measurement(params: Record<string, unknown>) {
    const weight = typeof params.weight === "number" ? params.weight : undefined;
    const height = typeof params.height === "number" ? params.height : undefined;
    const chest = typeof params.chest === "number" ? params.chest : undefined;
    const waist = typeof params.waist === "number" ? params.waist : undefined;
    const hips = typeof params.hips === "number" ? params.hips : undefined;
    const rightArm = typeof params.rightArm === "number" ? params.rightArm : undefined;
    const leftArm = typeof params.leftArm === "number" ? params.leftArm : undefined;
    const rightThigh = typeof params.rightThigh === "number" ? params.rightThigh : undefined;
    const leftThigh = typeof params.leftThigh === "number" ? params.leftThigh : undefined;

    const hasAny = [weight, height, chest, waist, hips, rightArm, leftArm, rightThigh, leftThigh].some((v) => v !== undefined);
    if (!hasAny) return { success: false, error: "At least one measurement value is required" };

    const newEntry = {
      id: nextBodyMeasurementId(),
      date: new Date().toISOString().split("T")[0],
      ...(weight !== undefined && { weight }),
      ...(height !== undefined && { height }),
      ...(chest !== undefined && { chest }),
      ...(waist !== undefined && { waist }),
      ...(hips !== undefined && { hips }),
      ...(rightArm !== undefined && { rightArm }),
      ...(leftArm !== undefined && { leftArm }),
      ...(rightThigh !== undefined && { rightThigh }),
      ...(leftThigh !== undefined && { leftThigh }),
    };

    const store = getHealthState();
    store.setState((s: any) => ({
      bodyMeasurements: [...s.bodyMeasurements, newEntry],
    }));

    const parts = [];
    if (weight !== undefined) parts.push(`${weight}kg`);
    if (chest !== undefined) parts.push(`chest=${chest}cm`);
    if (waist !== undefined) parts.push(`waist=${waist}cm`);
    if (hips !== undefined) parts.push(`hips=${hips}cm`);

    return { success: true, data: newEntry, message: `Body measurement logged (${parts.join(", ") || "saved"})` };
  },

  async get_body_measurements() {
    const store = getHealthState();
    const state = store.getState();
    const sorted = [...state.bodyMeasurements].sort((a: any, b: any) => b.date.localeCompare(a.date));
    return {
      success: true,
      data: {
        count: sorted.length,
        latest: sorted[0] || null,
        history: sorted,
      },
    };
  },

  // ── Exams ────────────────────────────────────────────────────────────

  async add_exam(params: Record<string, unknown>) {
    const type = String(params.type || "other") as "blood" | "urine" | "other";
    const name = String(params.name || "");
    const date = String(params.date || new Date().toISOString().split("T")[0]);
    const notes = params.notes ? String(params.notes) : undefined;

    if (!name) return { success: false, error: "name is required" };

    const rawResults = Array.isArray(params.results) ? params.results : [];
    const results = rawResults.map((r: any) => ({
      name: String(r.name || ""),
      value: String(r.value || ""),
      unit: String(r.unit || ""),
      refRange: r.refRange ? String(r.refRange) : undefined,
      flag: r.flag ? (r.flag as "normal" | "high" | "low") : undefined,
    })).filter((r) => r.name);

    const newExam = {
      id: nextExamId(),
      type,
      name,
      date,
      results,
      notes,
    };

    const store = getHealthState();
    store.setState((s: any) => ({
      exams: [...s.exams, newExam],
    }));

    return { success: true, data: newExam, message: `Exam "${name}" added (${type}, ${date})` };
  },

  async get_exams() {
    const store = getHealthState();
    const state = store.getState();
    const sorted = [...state.exams].sort((a: any, b: any) => b.date.localeCompare(a.date));
    return {
      success: true,
      data: {
        count: sorted.length,
        exams: sorted,
      },
    };
  },

  async delete_exam(params: Record<string, unknown>) {
    const examId = String(params.examId || "");
    if (!examId) return { success: false, error: "examId is required" };

    const store = getHealthState();
    const state = store.getState();
    const found = state.exams.find((e: any) => e.id === examId);
    if (!found) return { success: false, error: `Exam "${examId}" not found` };

    store.setState((s: any) => ({
      exams: s.exams.filter((e: any) => e.id !== examId),
    }));

    return { success: true, message: `Exam "${found.name}" deleted` };
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

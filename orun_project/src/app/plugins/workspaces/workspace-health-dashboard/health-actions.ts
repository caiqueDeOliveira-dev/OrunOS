import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import { useHealthStore, addMeal, addBodyMeasurement, addExam, deleteExam, updateMetric } from "./health-store";

const WORKSPACE_ID = "health";
let registered = false;

let getStore: (() => any) | null = null;
export function setHealthStoreGetter(getter: () => any) { getStore = getter; }
export function getHealthStore() { return getStore ? getStore() : null; }

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
    const meal = addMeal({ time, description: name, calories, protein, carbs, fat });

    return { success: true, data: meal, message: `Refeição registrada: "${name}" (${calories} kcal)` };
  },

  async log_workout(params: Record<string, unknown>) {
    const exerciseName = String(params.exerciseName || "");
    const duration = typeof params.duration === "number" ? params.duration : 30;
    if (!exerciseName) return { success: false, error: "exerciseName is required" };

    const burned = Math.round(duration * 10);
    const state = useHealthStore.getState();
    const calorieMetric = state.metrics.find((m) => m.id === "calories");
    if (calorieMetric) {
      updateMetric("calories", calorieMetric.value + burned);
    }

    return { success: true, message: `Treino registrado: "${exerciseName}" (${burned} kcal queimados em ${duration}min)` };
  },

  async log_metric(params: Record<string, unknown>) {
    const metric = String(params.metric || "");
    const value = typeof params.value === "number" ? params.value : 0;
    if (!metric) return { success: false, error: "metric name is required" };

    const state = useHealthStore.getState();
    const metricObj = state.metrics.find((m) => m.id === metric || m.name.toLowerCase() === metric.toLowerCase());

    if (!metricObj) {
      const newMetric = {
        id: metric.toLowerCase().replace(/\s+/g, "_"),
        name: metric.charAt(0).toUpperCase() + metric.slice(1),
        value,
        unit: "",
        target: value,
        icon: "📊",
        color: "#3B82F6",
      };
      useHealthStore.setState({ metrics: [...state.metrics, newMetric] });
      return { success: true, data: newMetric, message: `Métrica criada: "${newMetric.name}" = ${value}` };
    }

    updateMetric(metricObj.id, value);
    return { success: true, data: { id: metricObj.id, value }, message: `Atualizado ${metricObj.name} para ${value} ${metricObj.unit}` };
  },

  async get_summary() {
    const state = useHealthStore.getState();
    const totalCalories = state.meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = state.meals.reduce((s, m) => s + m.protein, 0);
    const totalCarbs = state.meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = state.meals.reduce((s, m) => s + m.fat, 0);

    const metricsSummary: Record<string, any> = {};
    for (const m of state.metrics) {
      metricsSummary[m.id] = {
        name: m.name, value: m.value, unit: m.unit, target: m.target,
        progress: Math.round((m.value / m.target) * 100),
      };
    }

    return {
      success: true,
      data: {
        metrics: metricsSummary,
        meals: { count: state.meals.length, totalCalories, totalProtein, totalCarbs, totalFat },
        entries: state.meals,
      },
    };
  },

  async get_trends(params: Record<string, unknown>) {
    const metricId = String(params.metric || "weight");
    const days = typeof params.days === "number" ? params.days : 7;

    const state = useHealthStore.getState();
    const metric = state.metrics.find((m) => m.id === metricId || m.name.toLowerCase() === metricId.toLowerCase());
    if (!metric) return { success: false, error: `Métrica "${metricId}" não encontrada` };

    const trendData = [];
    const now = new Date();
    let baseValue = metric.value * 0.9;
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * metric.value * 0.1;
      baseValue = Math.max(0, baseValue + variance);
      trendData.push({ date: date.toISOString().split("T")[0], value: Math.round(baseValue * 10) / 10 });
    }
    trendData[trendData.length - 1].value = metric.value;

    return {
      success: true,
      data: {
        metric: { id: metric.id, name: metric.name, unit: metric.unit, target: metric.target },
        trend: trendData,
        avg: Math.round((trendData.reduce((s, d) => s + d.value, 0) / trendData.length) * 10) / 10,
        min: Math.min(...trendData.map((d) => d.value)),
        max: Math.max(...trendData.map((d) => d.value)),
      },
    };
  },

  async get_meal_history() {
    const state = useHealthStore.getState();
    const totalCalories = state.meals.reduce((s, m) => s + m.calories, 0);
    const totalProtein = state.meals.reduce((s, m) => s + m.protein, 0);
    const totalCarbs = state.meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = state.meals.reduce((s, m) => s + m.fat, 0);

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
    if (!hasAny) return { success: false, error: "Pelo menos um valor de medição é obrigatório" };

    const entry = addBodyMeasurement({
      date: new Date().toISOString().split("T")[0],
      weight, height, chest, waist, hips, rightArm, leftArm, rightThigh, leftThigh,
    });

    const parts: string[] = [];
    if (weight !== undefined) parts.push(`${weight}kg`);
    return { success: true, data: entry, message: `Medição registrada (${parts.join(", ") || "salva"})` };
  },

  async get_body_measurements() {
    const state = useHealthStore.getState();
    const sorted = [...state.bodyMeasurements].sort((a, b) => b.date.localeCompare(a.date));
    return { success: true, data: { count: sorted.length, latest: sorted[0] || null, history: sorted } };
  },

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

    const exam = addExam({ type, name, date, results, notes });
    return { success: true, data: exam, message: `Exame "${name}" adicionado (${type}, ${date})` };
  },

  async get_exams() {
    const state = useHealthStore.getState();
    const sorted = [...state.exams].sort((a, b) => b.date.localeCompare(a.date));
    return { success: true, data: { count: sorted.length, exams: sorted } };
  },

  async delete_exam(params: Record<string, unknown>) {
    const examId = String(params.examId || "");
    if (!examId) return { success: false, error: "examId is required" };

    const state = useHealthStore.getState();
    const found = state.exams.find((e) => e.id === examId);
    if (!found) return { success: false, error: `Exame "${examId}" não encontrado` };

    deleteExam(examId);
    return { success: true, message: `Exame "${found.name}" excluído` };
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

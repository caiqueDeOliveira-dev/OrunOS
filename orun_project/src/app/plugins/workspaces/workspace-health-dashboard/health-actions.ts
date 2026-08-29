import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import { useHealthStore, addMeal, addBodyMeasurement, addExam, deleteExam, updateMetric, addSymptom, deleteSymptom, addMedication, deactivateMedication, deleteMedication, addWellness } from "./health-store";
import { BODY_REGION_LABELS, INTENSITY_LABELS, WELLNESS_CONFIG, type BodyRegion, type SymptomIntensity, type WellnessMetric } from "./health-types";

const WORKSPACE_ID = "health";
let registered = false;

let getStore: (() => any) | null = null;
export function setHealthStoreGetter(getter: () => any) { getStore = getter; }
export function getHealthStore() { return getStore ? getStore() : null; }

const VALID_REGIONS: BodyRegion[] = [
  "head", "neck", "left-shoulder", "right-shoulder", "chest", "upper-back",
  "abdomen", "lower-back", "left-bicep", "right-bicep", "left-forearm", "right-forearm",
  "left-hand", "right-hand", "hip", "left-quad", "right-quad",
  "left-knee", "right-knee", "left-calf", "right-calf",
  "left-ankle", "right-ankle", "left-foot", "right-foot",
];

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

    return { success: true, data: meal, message: `Refeicao registrada: "${name}" (${calories} kcal)` };
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
        icon: "bar-chart",
        color: "#3B82F6",
      };
      useHealthStore.setState({ metrics: [...state.metrics, newMetric] });
      return { success: true, data: newMetric, message: `Metrica criada: "${newMetric.name}" = ${value}` };
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
        symptoms: { total: state.symptoms.length, active: state.symptoms.slice(-5) },
        medications: { active: state.medications.filter((m) => m.active).length, total: state.medications.length },
      },
    };
  },

  async get_trends(params: Record<string, unknown>) {
    const metricId = String(params.metric || "weight");
    const days = typeof params.days === "number" ? params.days : 7;

    const state = useHealthStore.getState();
    const metric = state.metrics.find((m) => m.id === metricId || m.name.toLowerCase() === metricId.toLowerCase());
    if (!metric) return { success: false, error: `Metrica "${metricId}" nao encontrada` };

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
    if (!hasAny) return { success: false, error: "Pelo menos um valor de medicao e obrigatorio" };

    const entry = addBodyMeasurement({
      date: new Date().toISOString().split("T")[0],
      weight, height, chest, waist, hips, rightArm, leftArm, rightThigh, leftThigh,
    });

    const parts: string[] = [];
    if (weight !== undefined) parts.push(`${weight}kg`);
    return { success: true, data: entry, message: `Medicao registrada (${parts.join(", ") || "salva"})` };
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
    if (!found) return { success: false, error: `Exame "${examId}" nao encontrado` };

    deleteExam(examId);
    return { success: true, message: `Exame "${found.name}" excluido` };
  },

  async log_symptom(params: Record<string, unknown>) {
    const region = String(params.region || "") as BodyRegion;
    const description = String(params.description || "");
    const intensity = typeof params.intensity === "number" ? params.intensity as SymptomIntensity : 3;
    const duration = params.duration ? String(params.duration) : undefined;
    const notes = params.notes ? String(params.notes) : undefined;

    if (!region) return { success: false, error: "region is required" };
    if (!VALID_REGIONS.includes(region)) return { success: false, error: `Regiao invalida. Opcoes: ${VALID_REGIONS.join(", ")}` };
    if (!description) return { success: false, error: "description is required" };
    if (intensity < 1 || intensity > 5) return { success: false, error: "intensity must be 1-5" };

    const entry = addSymptom({
      date: new Date().toISOString().split("T")[0],
      region,
      description,
      intensity,
      duration,
      notes,
    });

    return {
      success: true,
      data: entry,
      message: `Sintoma registrado: "${description}" em ${BODY_REGION_LABELS[region]} (intensidade ${intensity}/5 - ${INTENSITY_LABELS[intensity]})`,
    };
  },

  async get_symptoms(params: Record<string, unknown>) {
    const state = useHealthStore.getState();
    const region = params.region ? String(params.region) as BodyRegion : undefined;
    let filtered = [...state.symptoms];
    if (region) filtered = filtered.filter((s) => s.region === region);
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    return {
      success: true,
      data: {
        count: filtered.length,
        symptoms: filtered,
        byRegion: filtered.reduce((acc, s) => {
          acc[s.region] = (acc[s.region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  },

  async delete_symptom(params: Record<string, unknown>) {
    const symptomId = String(params.symptomId || "");
    if (!symptomId) return { success: false, error: "symptomId is required" };

    const state = useHealthStore.getState();
    const found = state.symptoms.find((s) => s.id === symptomId);
    if (!found) return { success: false, error: `Sintoma "${symptomId}" nao encontrado` };

    deleteSymptom(symptomId);
    return { success: true, message: `Sintoma "${found.description}" excluido` };
  },

  async log_medication(params: Record<string, unknown>) {
    const name = String(params.name || "");
    const dosage = String(params.dosage || "");
    const frequency = String(params.frequency || "");
    const notes = params.notes ? String(params.notes) : undefined;

    if (!name) return { success: false, error: "name is required" };

    const entry = addMedication({
      name,
      dosage,
      frequency,
      startDate: new Date().toISOString().split("T")[0],
      notes,
      active: true,
    });

    return {
      success: true,
      data: entry,
      message: `Medicacao registrada: "${name}" ${dosage ? `(${dosage})` : ""} ${frequency ? `- ${frequency}` : ""}`,
    };
  },

  async get_medications() {
    const state = useHealthStore.getState();
    const active = state.medications.filter((m) => m.active);
    const inactive = state.medications.filter((m) => !m.active);
    return {
      success: true,
      data: {
        active: active.length,
        inactive: inactive.length,
        medications: state.medications,
      },
    };
  },

  async deactivate_medication(params: Record<string, unknown>) {
    const medId = String(params.medicationId || "");
    if (!medId) return { success: false, error: "medicationId is required" };

    const state = useHealthStore.getState();
    const found = state.medications.find((m) => m.id === medId);
    if (!found) return { success: false, error: `Medicacao "${medId}" nao encontrada` };

    deactivateMedication(medId);
    return { success: true, message: `Medicacao "${found.name}" desativada` };
  },

  async delete_medication(params: Record<string, unknown>) {
    const medId = String(params.medicationId || "");
    if (!medId) return { success: false, error: "medicationId is required" };

    const state = useHealthStore.getState();
    const found = state.medications.find((m) => m.id === medId);
    if (!found) return { success: false, error: `Medicacao "${medId}" nao encontrada` };

    deleteMedication(medId);
    return { success: true, message: `Medicacao "${found.name}" excluida` };
  },

  async log_wellness(params: Record<string, unknown>) {
    const metric = String(params.metric || "") as WellnessMetric;
    const value = typeof params.value === "number" ? params.value : 5;
    const notes = params.notes ? String(params.notes) : undefined;

    const validMetrics: WellnessMetric[] = ["humor", "ansiedade", "estresse", "energia", "foco"];
    if (!metric || !validMetrics.includes(metric)) return { success: false, error: `metric invalida. Opcoes: ${validMetrics.join(", ")}` };
    if (value < 1 || value > 10) return { success: false, error: "value deve ser 1-10" };

    const now = new Date();
    const entry = addWellness({
      date: now.toISOString().split("T")[0],
      time: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      metric,
      value,
      notes,
    });

    return {
      success: true,
      data: entry,
      message: `${WELLNESS_CONFIG[metric].label} registrado: ${value}/10`,
    };
  },

  async get_wellness() {
    const state = useHealthStore.getState();
    const latest: Record<string, number> = {};
    const metrics: WellnessMetric[] = ["humor", "ansiedade", "estresse", "energia", "foco"];
    for (const m of metrics) {
      const entries = state.wellness.filter((w) => w.metric === m).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      latest[m] = entries.length > 0 ? entries[0].value : 5;
    }
    return {
      success: true,
      data: {
        latest,
        totalEntries: state.wellness.length,
        history: state.wellness.sort((a, b) => b.date.localeCompare(a.date)).slice(-20),
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

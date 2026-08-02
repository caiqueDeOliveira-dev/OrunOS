import { createStore } from "../../lib/store";
import type { HealthState, Metric, Meal, BodyMeasurement, Exam, WorkoutSession, WorkoutExercise } from "./health-types";

const STORAGE_KEY = "orun_health_state";

function loadPersisted(): Partial<HealthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persist(state: HealthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      metrics: state.metrics,
      meals: state.meals,
      bodyMeasurements: state.bodyMeasurements,
      exams: state.exams,
      workouts: state.workouts,
    }));
  } catch { /* ignore */ }
}

const defaults: HealthState = {
  metrics: [
    { id: "weight", name: "Peso", value: 0, unit: "kg", target: 0, icon: "⚖️", color: "#C00018" },
    { id: "calories", name: "Calorias", value: 0, unit: "kcal", target: 2200, icon: "🔥", color: "#F59E0B" },
    { id: "steps", name: "Passos", value: 0, unit: "passos", target: 10000, icon: "🚶", color: "#3B82F6" },
    { id: "water", name: "Água", value: 0, unit: "ml", target: 2000, icon: "💧", color: "#22C55E" },
  ],
  meals: [],
  bodyMeasurements: [],
  exams: [],
  workouts: [],
  selectedRange: "today",
};

const persisted = loadPersisted();
const initialState: HealthState = { ...defaults, ...persisted };

export const useHealthStore = createStore<HealthState>(initialState);

const origSetState = useHealthStore.setState.bind(useHealthStore);
useHealthStore.setState = (updater: any) => {
  origSetState(updater);
  const next = useHealthStore.getState();
  persist(next);
};

export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  return Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10;
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, isMale: boolean): number {
  if (isMale) {
    return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age));
  }
  return Math.round(447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age));
}

export function getBMIStatus(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Abaixo do peso", color: "#3B82F6" };
  if (bmi < 25) return { label: "Peso normal", color: "#22C55E" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#F59E0B" };
  if (bmi < 35) return { label: "Obesidade I", color: "#EF4444" };
  if (bmi < 40) return { label: "Obesidade II", color: "#DC2626" };
  return { label: "Obesidade III", color: "#991B1B" };
}

export function addMeal(meal: Omit<Meal, "id">) {
  const state = useHealthStore.getState();
  const newMeal = { ...meal, id: `hm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useHealthStore.setState({ meals: [...state.meals, newMeal] });
  return newMeal;
}

export function addBodyMeasurement(m: Omit<BodyMeasurement, "id">) {
  const state = useHealthStore.getState();
  const entry = { ...m, id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useHealthStore.setState({ bodyMeasurements: [...state.bodyMeasurements, entry] });
  return entry;
}

export function addExam(e: Omit<Exam, "id">) {
  const state = useHealthStore.getState();
  const exam = { ...e, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useHealthStore.setState({ exams: [...state.exams, exam] });
  return exam;
}

export function deleteExam(id: string) {
  const state = useHealthStore.getState();
  useHealthStore.setState({ exams: state.exams.filter((e) => e.id !== id) });
}

export function addWorkout(w: Omit<WorkoutSession, "id">) {
  const state = useHealthStore.getState();
  const session = { ...w, id: `wo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useHealthStore.setState({ workouts: [...state.workouts, session] });
  return session;
}

export function updateMetric(id: string, value: number) {
  const state = useHealthStore.getState();
  useHealthStore.setState({
    metrics: state.metrics.map((m) => m.id === id ? { ...m, value } : m),
  });
}

export function updateMetricTarget(id: string, target: number) {
  const state = useHealthStore.getState();
  useHealthStore.setState({
    metrics: state.metrics.map((m) => m.id === id ? { ...m, target } : m),
  });
}

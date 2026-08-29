export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  icon: string;
  color: string;
}

export interface Meal {
  id: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  height?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  rightArm?: number;
  leftArm?: number;
  rightThigh?: number;
  leftThigh?: number;
}

export interface ExamResult {
  name: string;
  value: string;
  unit: string;
  refRange?: string;
  flag?: "normal" | "high" | "low";
}

export interface Exam {
  id: string;
  type: "blood" | "urine" | "other";
  name: string;
  date: string;
  results: ExamResult[];
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  series: string;
  load: string;
  done: boolean;
  muscleGroup: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
}

export type BodyRegion =
  | "head" | "neck" | "left-shoulder" | "right-shoulder"
  | "chest" | "upper-back" | "abdomen" | "lower-back"
  | "left-bicep" | "right-bicep" | "left-forearm" | "right-forearm"
  | "left-hand" | "right-hand"
  | "hip" | "left-quad" | "right-quad"
  | "left-knee" | "right-knee"
  | "left-calf" | "right-calf"
  | "left-ankle" | "right-ankle"
  | "left-foot" | "right-foot";

export type SymptomIntensity = 1 | 2 | 3 | 4 | 5;

export interface Symptom {
  id: string;
  date: string;
  region: BodyRegion;
  description: string;
  intensity: SymptomIntensity;
  duration?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
}

export type WellnessMetric = "humor" | "ansiedade" | "estresse" | "energia" | "foco";

export interface WellnessEntry {
  id: string;
  date: string;
  time: string;
  metric: WellnessMetric;
  value: number;
  notes?: string;
}

export interface HealthState {
  [key: string]: unknown;
  metrics: Metric[];
  meals: Meal[];
  bodyMeasurements: BodyMeasurement[];
  exams: Exam[];
  workouts: WorkoutSession[];
  symptoms: Symptom[];
  medications: Medication[];
  wellness: WellnessEntry[];
  selectedRange: "today" | "week" | "month";
}

export const HEALTH_CHART_COLORS = {
  calories: "#E50914",
  steps: "#3B82F6",
  water: "#22C55E",
  weight: "#E50914",
  protein: "#E50914",
  carbs: "#3B82F6",
  fat: "#F59E0B",
};

export const HEALTH_PALETTE = {
  bg: "#08080A",
  card: "#121216",
  cardHover: "#18181D",
  border: "#22222A",
  borderHi: "#2A2A35",
  primary: "#E50914",
  primaryGlow: "rgba(229,9,20,0.15)",
  primarySubtle: "rgba(229,9,20,0.08)",
  text: "#FFFFFF",
  textSub: "#9CA3AF",
  textDim: "#6B7280",
  success: "#22C55E",
  warning: "#F59E0B",
  info: "#3B82F6",
  purple: "#8B5CF6",
};

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  head: "Cabeca",
  neck: "Pescoco",
  "left-shoulder": "Ombro Esq.",
  "right-shoulder": "Ombro Dir.",
  chest: "Peito",
  "upper-back": "Costas Altas",
  abdomen: "Abdomen",
  "lower-back": "Lombar",
  "left-bicep": "Biceps Esq.",
  "right-bicep": "Biceps Dir.",
  "left-forearm": "Antebraco Esq.",
  "right-forearm": "Antebraco Dir.",
  "left-hand": "Mao Esq.",
  "right-hand": "Mao Dir.",
  hip: "Quadril",
  "left-quad": "Coxa Esq.",
  "right-quad": "Coxa Dir.",
  "left-knee": "Joelho Esq.",
  "right-knee": "Joelho Dir.",
  "left-calf": "Panturrilha Esq.",
  "right-calf": "Panturrilha Dir.",
  "left-ankle": "Tornozelo Esq.",
  "right-ankle": "Tornozelo Dir.",
  "left-foot": "Pe Esq.",
  "right-foot": "Pe Dir.",
};

export const INTENSITY_COLORS: Record<SymptomIntensity, string> = {
  1: "#22C55E",
  2: "#84CC16",
  3: "#F59E0B",
  4: "#F97316",
  5: "#EF4444",
};

export const INTENSITY_LABELS: Record<SymptomIntensity, string> = {
  1: "Leve",
  2: "Moderado",
  3: "Intermediario",
  4: "Forte",
  5: "Muito Forte",
};

export const WELLNESS_CONFIG: Record<WellnessMetric, { label: string; icon: string; color: string; gradient: string }> = {
  humor: { label: "Humor", icon: "smile", color: "#22C55E", gradient: "from-green-500/20 to-green-500/5" },
  ansiedade: { label: "Ansiedade", icon: "cloud-lightning", color: "#EF4444", gradient: "from-red-500/20 to-red-500/5" },
  estresse: { label: "Estresse", icon: "zap", color: "#F59E0B", gradient: "from-amber-500/20 to-amber-500/5" },
  energia: { label: "Energia", icon: "battery", color: "#EAB308", gradient: "from-yellow-500/20 to-yellow-500/5" },
  foco: { label: "Foco", icon: "target", color: "#3B82F6", gradient: "from-blue-500/20 to-blue-500/5" },
};

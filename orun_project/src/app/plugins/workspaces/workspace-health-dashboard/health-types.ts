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

export interface HealthState {
  [key: string]: unknown;
  metrics: Metric[];
  meals: Meal[];
  bodyMeasurements: BodyMeasurement[];
  exams: Exam[];
  workouts: WorkoutSession[];
  selectedRange: "today" | "week" | "month";
}

export const HEALTH_CHART_COLORS = {
  calories: "#C00018",
  steps: "#3B82F6",
  water: "#22C55E",
  weight: "#C00018",
  protein: "#C00018",
  carbs: "#3B82F6",
  fat: "#F59E0B",
};

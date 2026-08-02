export interface DrawElement {
  id: string;
  type: "pen" | "text" | "rect" | "circle" | "eraser";
  points?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

export interface QuizResponse {
  questionId: string;
  selected: number;
  correct: boolean;
}

export interface QuizSession {
  sessionId: string;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
  questions: QuizQuestion[];
  responses: QuizResponse[];
  currentQuestion: number;
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  objectives: string[];
  duration: string;
}

export interface TeacherState {
  [key: string]: unknown;
  elements: DrawElement[];
  undoStack: DrawElement[][];
  redoStack: DrawElement[][];
  tool: "pen" | "text" | "rect" | "circle" | "eraser" | "select";
  color: string;
  strokeWidth: number;
  questions: QuizQuestion[];
  quizSession: QuizSession | null;
  lessons: LessonPlan[];
}

export const PALETTE = ["#C00018", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#06B6D4", "#FFFFFF", "#1A1A2E"];
export const STROKE_WIDTHS = [1, 3, 6] as const;
export const CANVAS_BG = "#0D1117";
export const GRID_COLOR = "rgba(255,255,255,0.03)";
export const ACCENT = "#C00018";

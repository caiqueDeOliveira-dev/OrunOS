import { createStore } from "../../lib/store";
import type { TeacherState, DrawElement } from "./teacher-types";

const STORAGE_KEY = "orun_teacher_state";

function loadPersisted(): Partial<TeacherState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persist(state: TeacherState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      elements: state.elements,
      questions: state.questions,
      quizSession: state.quizSession,
      lessons: state.lessons,
    }));
  } catch { /* ignore */ }
}

const defaults: TeacherState = {
  elements: [],
  undoStack: [],
  redoStack: [],
  tool: "pen",
  color: "#C00018",
  strokeWidth: 3,
  questions: [],
  quizSession: null,
  lessons: [],
};

const persisted = loadPersisted();
const initialState: TeacherState = { ...defaults, ...persisted };

export const useWhiteboardStore = createStore<TeacherState>(initialState);

const origSetState = useWhiteboardStore.setState.bind(useWhiteboardStore);
useWhiteboardStore.setState = (updater: any) => {
  origSetState(updater);
  const next = useWhiteboardStore.getState();
  persist(next);
};

export function pushUndo() {
  const state = useWhiteboardStore.getState();
  useWhiteboardStore.setState({
    undoStack: [...state.undoStack.slice(-49), state.elements],
    redoStack: [],
  });
}

export function undo() {
  const state = useWhiteboardStore.getState();
  if (state.undoStack.length === 0) return;
  const prev = state.undoStack[state.undoStack.length - 1];
  useWhiteboardStore.setState({
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, state.elements],
    elements: prev,
  });
}

export function redo() {
  const state = useWhiteboardStore.getState();
  if (state.redoStack.length === 0) return;
  const next = state.redoStack[state.redoStack.length - 1];
  useWhiteboardStore.setState({
    redoStack: state.redoStack.slice(0, -1),
    undoStack: [...state.undoStack, state.elements],
    elements: next,
  });
}

export function addDrawElement(el: DrawElement) {
  pushUndo();
  const state = useWhiteboardStore.getState();
  useWhiteboardStore.setState({ elements: [...state.elements, el] });
}

export function clearCanvas() {
  pushUndo();
  useWhiteboardStore.setState({ elements: [] });
}

export function addQuestion(question: Omit<import("./teacher-types").QuizQuestion, "id">) {
  const state = useWhiteboardStore.getState();
  const q = { ...question, id: `tq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useWhiteboardStore.setState({ questions: [...state.questions, q] });
  return q;
}

export function addLesson(lesson: Omit<import("./teacher-types").LessonPlan, "id">) {
  const state = useWhiteboardStore.getState();
  const l = { ...lesson, id: `ls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  useWhiteboardStore.setState({ lessons: [...state.lessons, l] });
  return l;
}

export function deleteLesson(id: string) {
  const state = useWhiteboardStore.getState();
  useWhiteboardStore.setState({ lessons: state.lessons.filter((l) => l.id !== id) });
}

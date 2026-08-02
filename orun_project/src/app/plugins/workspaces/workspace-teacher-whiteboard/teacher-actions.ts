import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import { useWhiteboardStore, addQuestion, clearCanvas } from "./teacher-store";
import type { TeacherState, QuizSession } from "./teacher-types";

const WORKSPACE_ID = "teacher";
let registered = false;

let getStore: (() => any) | null = null;
export function setWhiteboardStoreGetter(getter: () => any) { getStore = getter; }
export function getWhiteboardStore() { return getStore ? getStore() : null; }

const actions = {
  async add_quiz_question(params: Record<string, unknown>) {
    const question = String(params.question || "");
    const options = Array.isArray(params.options) ? params.options.map(String) : [];
    const correctIndex = typeof params.correctIndex === "number" ? params.correctIndex : 0;

    if (!question) return { success: false, error: "question is required" };
    if (options.length < 2) return { success: false, error: "At least 2 options are required" };
    if (correctIndex < 0 || correctIndex >= options.length) {
      return { success: false, error: `correctIndex must be between 0 and ${options.length - 1}` };
    }

    const newQuestion = addQuestion({ question, options, correct: correctIndex });
    return { success: true, data: newQuestion, message: `Questão adicionada: "${question}"` };
  },

  async get_quiz() {
    const state = useWhiteboardStore.getState();
    return { success: true, data: { questions: state.questions, count: state.questions.length } };
  },

  async clear_canvas() {
    clearCanvas();
    return { success: true, message: "Canvas limpo" };
  },

  async export_canvas() {
    const svgEl = document.querySelector("svg[data-whiteboard-canvas]") as SVGElement | null;
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: "image/svg+xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `whiteboard-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
      return { success: true, message: "Canvas exportado como SVG" };
    }

    const state = useWhiteboardStore.getState();
    return {
      success: true,
      data: { elements: state.elements, count: state.elements.length },
      message: state.elements.length > 0
        ? "Canvas não encontrado no DOM, retornando dados dos elementos"
        : "Canvas vazio",
    };
  },

  async start_quiz(params: Record<string, unknown>) {
    const state = useWhiteboardStore.getState();
    if (state.questions.length === 0) {
      return { success: false, error: "Nenhuma questão disponível. Adicione questões primeiro." };
    }

    const sessionId = `quiz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const session: QuizSession = {
      sessionId,
      isActive: true,
      startedAt: new Date().toISOString(),
      questions: state.questions,
      responses: [],
      currentQuestion: 0,
    };

    useWhiteboardStore.setState({ quizSession: session });

    return {
      success: true,
      data: { sessionId, questionCount: state.questions.length, firstQuestion: state.questions[0] },
      message: `Quiz iniciado! ${state.questions.length} questões.`,
    };
  },

  async get_quiz_status() {
    const state = useWhiteboardStore.getState();
    const session = state.quizSession;

    if (!session || !session.isActive) {
      return { success: true, data: { isActive: false, message: "Nenhum quiz ativo" } };
    }

    return {
      success: true,
      data: {
        sessionId: session.sessionId,
        isActive: session.isActive,
        currentQuestion: session.currentQuestion,
        totalQuestions: session.questions.length,
        responseCount: session.responses.length,
        startedAt: session.startedAt,
      },
    };
  },

  async stop_quiz() {
    const state = useWhiteboardStore.getState();
    const session = state.quizSession;

    if (!session || !session.isActive) {
      return { success: false, error: "Nenhum quiz ativo" };
    }

    const totalResponses = session.responses.length;
    const correctAnswers = session.responses.filter((r) => r.correct).length;

    useWhiteboardStore.setState({
      quizSession: { ...session, isActive: false, endedAt: new Date().toISOString() },
    });

    const accuracy = totalResponses > 0 ? Math.round((correctAnswers / totalResponses) * 100) : 0;
    return {
      success: true,
      data: { totalResponses, correctAnswers, accuracy },
      message: `Quiz encerrado. ${correctAnswers}/${totalResponses} corretas (${accuracy}%)`,
    };
  },
};

export function registerTeacherActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterTeacherActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

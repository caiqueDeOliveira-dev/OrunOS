import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "teacher";

let registered = false;

let getStore: (() => any) | null = null;
export function setWhiteboardStoreGetter(getter: () => any) { getStore = getter; }

function getWhiteboardState() {
  if (!getStore) throw new Error("Whiteboard store not initialized");
  return getStore();
}

let questionIdCounter = 0;
function nextQuestionId() { return `tq_${Date.now()}_${++questionIdCounter}`; }

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

    const newQuestion = {
      id: nextQuestionId(),
      question,
      options,
      correct: correctIndex,
    };

    const store = getWhiteboardState();
    store.setState((s: any) => ({ questions: [...s.questions, newQuestion] }));

    return { success: true, data: newQuestion, message: `Added quiz question "${question}"` };
  },

  async get_quiz() {
    const store = getWhiteboardState();
    const state = store.getState();

    return {
      success: true,
      data: {
        questions: state.questions,
        count: state.questions.length,
      },
    };
  },

  async clear_canvas() {
    const store = getWhiteboardState();
    store.setState({ elements: [] });
    return { success: true, message: "Canvas cleared" };
  },

  async export_canvas() {
    const svgEl = document.querySelector("[data-whiteboard-canvas] svg") as SVGElement | null;
    if (!svgEl) {
      const store = getWhiteboardState();
      const state = store.getState();
      const elements = state.elements;

      if (elements.length === 0) {
        return { success: false, error: "Canvas is empty or SVG element not found" };
      }

      return {
        success: true,
        data: { elements, message: "SVG element not directly available; returning element data" },
        message: "Exported canvas elements as data",
      };
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `whiteboard-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true, message: "Canvas exported as SVG" };
  },

  async start_quiz(params: Record<string, unknown>) {
    const store = getWhiteboardState();
    const state = store.getState();

    if (state.questions.length === 0) {
      return { success: false, error: "No quiz questions available. Add questions first." };
    }

    // Generate a unique quiz session ID
    const sessionId = `quiz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Store quiz session state
    store.setState((s: any) => ({
      quizSession: {
        sessionId,
        isActive: true,
        startedAt: new Date().toISOString(),
        questions: s.questions,
        responses: [],
        currentQuestion: 0,
      },
    }));

    // Generate a mock shareable URL (in production this would be a real server URL)
    const shareUrl = `https://orun-os.local/quiz/${sessionId}`;

    return {
      success: true,
      data: {
        sessionId,
        shareUrl,
        questionCount: state.questions.length,
        firstQuestion: state.questions[0],
      },
      message: `Quiz started! Share link: ${shareUrl}`,
    };
  },

  async get_quiz_status() {
    const store = getWhiteboardState();
    const state = store.getState();
    const session = (state as any).quizSession;

    if (!session || !session.isActive) {
      return { success: true, data: { isActive: false, message: "No active quiz session" } };
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
    const store = getWhiteboardState();
    const state = store.getState();
    const session = (state as any).quizSession;

    if (!session || !session.isActive) {
      return { success: false, error: "No active quiz session" };
    }

    const totalResponses = session.responses.length;
    const correctAnswers = session.responses.filter((r: any) => r.correct).length;

    store.setState((s: any) => ({
      quizSession: {
        ...s.quizSession,
        isActive: false,
        endedAt: new Date().toISOString(),
      },
    }));

    return {
      success: true,
      data: {
        totalResponses,
        correctAnswers,
        accuracy: totalResponses > 0 ? Math.round((correctAnswers / totalResponses) * 100) : 0,
      },
      message: `Quiz ended. ${correctAnswers}/${totalResponses} correct (${totalResponses > 0 ? Math.round((correctAnswers / totalResponses) * 100) : 0}%)`,
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

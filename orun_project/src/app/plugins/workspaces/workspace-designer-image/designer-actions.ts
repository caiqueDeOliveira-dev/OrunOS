import { createStore } from "../../lib/store";
import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "designer";

let registered = false;
let getStore: (() => any) | null = null;
export function setDesignerStoreGetter(getter: () => any) { getStore = getter; }

function getDesignerState() {
  if (!getStore) throw new Error("Designer store not initialized");
  return getStore();
}

export interface CanvasElement {
  id: string;
  type: "rect" | "circle" | "triangle" | "star" | "text" | "image" | "line";
  x: number; y: number; width: number; height: number;
  fill: string; stroke?: string; strokeWidth?: number;
  text?: string; fontSize?: number; fontFamily?: string;
  bold?: boolean; italic?: boolean; underline?: boolean;
  rotation: number; opacity: number; name: string; zIndex: number;
  locked?: boolean; src?: string;
}

export interface UIComponent {
  id: string; type: string; x: number; y: number;
  width: number; height: number; props: Record<string, any>;
}

export interface EditorState {
  [key: string]: unknown;
  elements: CanvasElement[];
  selectedId: string | null;
  canvasWidth: number; canvasHeight: number; canvasBg: string;
  zoom: number; activeTool: string;
  undoStack: CanvasElement[][]; redoStack: CanvasElement[][];
  figmaComponents: UIComponent[];
  figmaSelectedId: string | null;
  editImageData: string | null;
  editFilters: Record<string, number>;
}

const useDesignerStore = createStore<EditorState>({
  elements: [], selectedId: null,
  canvasWidth: 540, canvasHeight: 400, canvasBg: "#FFFFFF",
  zoom: 1, activeTool: "select",
  undoStack: [], redoStack: [],
  figmaComponents: [], figmaSelectedId: null,
  editImageData: null,
  editFilters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 },
});

export { useDesignerStore };

let elementIdCounter = 0;
function nextElementId() { return `de_${Date.now()}_${++elementIdCounter}`; }

async function apiCall(endpoint: string, body: Record<string, unknown>): Promise<any> {
  if (typeof window !== "undefined" && (window as any).orun?.designer) {
    return (window as any).orun.designer[endpoint](body);
  }
  const resp = await fetch(`/api/designer/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

const actions = {
  async add_element(params: Record<string, unknown>) {
    const type = String(params.type || "rect");
    const store = getDesignerState();
    const state = store.getState();
    const maxZ = state.elements.reduce((max: number, el: any) => Math.max(max, el.zIndex), 0);
    const newEl: any = {
      id: nextElementId(), type, zIndex: maxZ + 1,
      x: typeof params.x === "number" ? params.x : 100 + Math.random() * 100,
      y: typeof params.y === "number" ? params.y : 100 + Math.random() * 100,
      width: typeof params.width === "number" ? params.width : 120,
      height: typeof params.height === "number" ? params.height : 120,
      fill: String(params.fill || "#C00018"),
      rotation: 0, opacity: 1, name: type,
    };
    if (type === "text") {
      newEl.text = String(params.text || "Text");
      newEl.fontSize = typeof params.fontSize === "number" ? params.fontSize : 24;
    }
    store.setState((s: any) => ({ elements: [...s.elements, newEl], selectedId: newEl.id }));
    return { success: true, data: newEl, message: `Added ${type} element` };
  },

  async delete_element(params: Record<string, unknown>) {
    const id = params.elementId ? String(params.elementId) : null;
    const store = getDesignerState();
    const state = store.getState();
    const target = id || state.selectedId;
    if (!target) return { success: false, error: "No element to delete" };
    store.setState((s: any) => ({
      elements: s.elements.filter((el: any) => el.id !== target),
      selectedId: s.selectedId === target ? null : s.selectedId,
    }));
    return { success: true, message: `Deleted "${target}"` };
  },

  async change_canvas(params: Record<string, unknown>) {
    const store = getDesignerState();
    const updates: any = {};
    if (params.color) updates.canvasBg = String(params.color);
    if (typeof params.width === "number") updates.canvasWidth = params.width;
    if (typeof params.height === "number") updates.canvasHeight = params.height;
    if (Object.keys(updates).length) store.setState(updates);
    return { success: true, data: updates, message: "Canvas updated" };
  },

  async export_design() {
    const svgEl = document.querySelector("[data-designer-canvas] svg") as SVGElement | null;
    if (!svgEl) return { success: false, error: "Canvas SVG not found" };
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `design-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
    return { success: true, message: "Exported as SVG" };
  },

  async get_canvas_info() {
    const store = getDesignerState();
    const state = store.getState();
    return { success: true, data: { elements: state.elements.length, canvasWidth: state.canvasWidth, canvasHeight: state.canvasHeight, canvasBg: state.canvasBg, selectedId: state.selectedId } };
  },

  async add_figma_component(params: Record<string, unknown>) {
    const store = getDesignerState();
    const state = store.getState();
    const comp: UIComponent = {
      id: nextElementId(),
      type: String(params.type || "button"),
      x: typeof params.x === "number" ? params.x : 100,
      y: typeof params.y === "number" ? params.y : 100,
      width: typeof params.width === "number" ? params.width : 120,
      height: typeof params.height === "number" ? params.height : 40,
      props: (params.props as Record<string, any>) || {},
    };
    store.setState((s: any) => ({ figmaComponents: [...s.figmaComponents, comp], figmaSelectedId: comp.id }));
    return { success: true, data: comp, message: `Added ${comp.type} component` };
  },

  async get_figma_info() {
    const store = getDesignerState();
    const state = store.getState();
    return { success: true, data: { components: state.figmaComponents.length, selectedId: state.figmaSelectedId } };
  },

  async apply_filter(params: Record<string, unknown>) {
    const filter = String(params.filter || "");
    const value = typeof params.value === "number" ? params.value : 100;
    const store = getDesignerState();
    const state = store.getState();
    if (filter && filter in state.editFilters) {
      store.setState((s: any) => ({ editFilters: { ...s.editFilters, [filter]: value } }));
      return { success: true, data: { filter, value }, message: `Filter ${filter} set to ${value}` };
    }
    return { success: false, error: `Unknown filter "${filter}"` };
  },

  async load_image(params: Record<string, unknown>) {
    const data = String(params.data || "");
    if (!data) return { success: false, error: "No image data provided" };
    const store = getDesignerState();
    store.setState({ editImageData: data });
    return { success: true, message: "Image loaded" };
  },

  async generate_3d(params: Record<string, unknown>) {
    const prompt = String(params.prompt || "");
    if (!prompt) return { success: false, error: "Prompt is required" };
    return {
      success: true,
      data: { prompt, modelUrl: "", status: "generating" },
      message: `3D model generation started for: "${prompt}". Use Tripo AI or another service to fetch results.`,
    };
  },
};

export function registerDesignerActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterDesignerActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

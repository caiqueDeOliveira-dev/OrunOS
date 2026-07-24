import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "designer";

let registered = false;

let getStore: (() => any) | null = null;
export function setDesignerStoreGetter(getter: () => any) { getStore = getter; }

function getDesignerState() {
  if (!getStore) throw new Error("Designer store not initialized");
  return getStore();
}

let elementIdCounter = 0;
function nextElementId() {
  return `de_${Date.now()}_${++elementIdCounter}`;
}

const actions = {
  async add_element(params: Record<string, unknown>) {
    const type = (params.type as string) || "rect";
    const x = typeof params.x === "number" ? params.x : 100 + Math.random() * 100;
    const y = typeof params.y === "number" ? params.y : 100 + Math.random() * 100;
    const width = typeof params.width === "number" ? params.width : 120;
    const height = typeof params.height === "number" ? params.height : 120;
    const fill = String(params.fill || "#C00018");
    const text = typeof params.text === "string" ? params.text : undefined;

    const store = getDesignerState();
    const state = store.getState();
    const maxZ = state.elements.reduce((max: number, el: any) => Math.max(max, el.zIndex), 0);

    const newEl: Record<string, unknown> = {
      id: nextElementId(),
      type,
      x,
      y,
      width,
      height,
      fill,
      rotation: 0,
      opacity: 1,
      name: type,
      zIndex: maxZ + 1,
    };

    if (type === "text" && text) {
      newEl.text = text;
      newEl.fontSize = typeof params.fontSize === "number" ? params.fontSize : 16;
    }

    store.setState((s: any) => ({
      elements: [...s.elements, newEl],
      selectedId: newEl.id,
    }));

    return { success: true, data: newEl, message: `Added ${type} element` };
  },

  async delete_element(params: Record<string, unknown>) {
    const elementId = params.elementId ? String(params.elementId) : null;

    const store = getDesignerState();
    const state = store.getState();
    const targetId = elementId || state.selectedId;

    if (!targetId) return { success: false, error: "No element to delete (provide elementId or select one)" };

    const exists = state.elements.some((el: any) => el.id === targetId);
    if (!exists) return { success: false, error: `Element "${targetId}" not found` };

    store.setState((s: any) => ({
      elements: s.elements.filter((el: any) => el.id !== targetId),
      selectedId: s.selectedId === targetId ? null : s.selectedId,
    }));

    return { success: true, message: `Deleted element "${targetId}"` };
  },

  async change_bg(params: Record<string, unknown>) {
    const color = String(params.color || "#FFFFFF");
    const store = getDesignerState();
    store.setState({ canvasBg: color });
    return { success: true, message: `Background changed to "${color}"` };
  },

  async change_canvas_size(params: Record<string, unknown>) {
    const width = typeof params.width === "number" ? params.width : 540;
    const height = typeof params.height === "number" ? params.height : 400;

    if (width <= 0 || height <= 0) return { success: false, error: "Width and height must be positive" };

    const store = getDesignerState();
    store.setState({ canvasWidth: width, canvasHeight: height });
    return { success: true, data: { width, height }, message: `Canvas resized to ${width}x${height}` };
  },

  async duplicate_element() {
    const store = getDesignerState();
    const state = store.getState();

    if (!state.selectedId) return { success: false, error: "No element selected" };

    const original = state.elements.find((el: any) => el.id === state.selectedId);
    if (!original) return { success: false, error: `Element "${state.selectedId}" not found` };

    const maxZ = state.elements.reduce((max: number, el: any) => Math.max(max, el.zIndex), 0);
    const duplicate = {
      ...original,
      id: nextElementId(),
      x: original.x + 20,
      y: original.y + 20,
      zIndex: maxZ + 1,
      name: `${original.name} (copy)`,
    };

    store.setState((s: any) => ({
      elements: [...s.elements, duplicate],
      selectedId: duplicate.id,
    }));

    return { success: true, data: duplicate, message: `Duplicated element "${original.name}"` };
  },

  async export_design() {
    const svgEl = document.querySelector("[data-designer-canvas] svg") as SVGElement | null;
    if (!svgEl) return { success: false, error: "Canvas SVG element not found" };

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `design-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);

    return { success: true, message: "Design exported as SVG" };
  },

  async get_elements() {
    const store = getDesignerState();
    const state = store.getState();

    return {
      success: true,
      data: {
        elements: state.elements,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        canvasBg: state.canvasBg,
        selectedId: state.selectedId,
      },
    };
  },

  // ── Create preset template (resume, business card, social post, etc.) ──
  async create_template(params: Record<string, unknown>) {
    const store = getDesignerState();
    const state = store.getState();
    const templateType = (params.template as string) || "resume";
    const accentColor = String(params.accent_color || "#C00018");

    type TemplateElement = { id: string; type: string; x: number; y: number; w: number; h: number; fill: string; text: string; fontSize: number; fontWeight: string; name: string };
    let elements: TemplateElement[] = [];

    const templates: Record<string, { width: number; height: number; bg: string; elements: TemplateElement[] }> = {
      resume: {
        width: 800, height: 1100, bg: "#FFFFFF",
        elements: [
          { id: `tmpl_${Date.now()}_1`, type: "rect", x: 0, y: 0, w: 800, h: 160, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "Header BG" },
          { id: `tmpl_${Date.now()}_2`, type: "text", x: 40, y: 50, w: 500, h: 60, fill: "#FFFFFF", text: "SEU NOME", fontSize: 36, fontWeight: "bold", name: "Name" },
          { id: `tmpl_${Date.now()}_3`, type: "text", x: 40, y: 110, w: 500, h: 30, fill: "#FFFFFF", text: "email@exemplo.com | (11) 99999-9999 | São Paulo, SP", fontSize: 14, fontWeight: "normal", name: "Contact" },
          { id: `tmpl_${Date.now()}_4`, type: "text", x: 40, y: 200, w: 200, h: 30, fill: accentColor, text: "EXPERIÊNCIA PROFISSIONAL", fontSize: 18, fontWeight: "bold", name: "Exp Title" },
          { id: `tmpl_${Date.now()}_5`, type: "rect", x: 40, y: 235, w: 720, h: 2, fill: "#DDDDDD", text: "", fontSize: 1, fontWeight: "normal", name: "Divider" },
          { id: `tmpl_${Date.now()}_6`, type: "text", x: 40, y: 255, w: 720, h: 120, fill: "#333333", text: "Desenvolvedor Full Stack — Empresa X\n2022-2024\n• Desenvolvimento de aplicações web com React e Node.js\n• Implementação de APIs RESTful e microserviços\n• Colaboração com equipe de design e produto", fontSize: 13, fontWeight: "normal", name: "Exp Content" },
          { id: `tmpl_${Date.now()}_7`, type: "text", x: 40, y: 420, w: 200, h: 30, fill: accentColor, text: "FORMAÇÃO ACADÊMICA", fontSize: 18, fontWeight: "bold", name: "Edu Title" },
          { id: `tmpl_${Date.now()}_8`, type: "rect", x: 40, y: 455, w: 720, h: 2, fill: "#DDDDDD", text: "", fontSize: 1, fontWeight: "normal", name: "Divider 2" },
          { id: `tmpl_${Date.now()}_9`, type: "text", x: 40, y: 475, w: 720, h: 60, fill: "#333333", text: "Ciência da Computação — Universidade X\n2018-2022", fontSize: 13, fontWeight: "normal", name: "Edu Content" },
          { id: `tmpl_${Date.now()}_10`, type: "text", x: 40, y: 560, w: 200, h: 30, fill: accentColor, text: "HABILIDADES", fontSize: 18, fontWeight: "bold", name: "Skills Title" },
          { id: `tmpl_${Date.now()}_11`, type: "rect", x: 40, y: 595, w: 720, h: 2, fill: "#DDDDDD", text: "", fontSize: 1, fontWeight: "normal", name: "Divider 3" },
          { id: `tmpl_${Date.now()}_12`, type: "text", x: 40, y: 615, w: 720, h: 60, fill: "#333333", text: "JavaScript, TypeScript, React, Node.js, Python, SQL, Git, Docker, AWS", fontSize: 14, fontWeight: "normal", name: "Skills Content" },
        ],
      },
      "business-card": {
        width: 700, height: 400, bg: "#FFFFFF",
        elements: [
          { id: `tmpl_${Date.now()}_1`, type: "rect", x: 0, y: 0, w: 200, h: 400, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "Side BG" },
          { id: `tmpl_${Date.now()}_2`, type: "text", x: 30, y: 100, w: 140, h: 40, fill: "#FFFFFF", text: "LOGO", fontSize: 24, fontWeight: "bold", name: "Logo" },
          { id: `tmpl_${Date.now()}_3`, type: "text", x: 240, y: 60, w: 400, h: 50, fill: "#222222", text: "NOME DA EMPRESA", fontSize: 28, fontWeight: "bold", name: "Company" },
          { id: `tmpl_${Date.now()}_4`, type: "text", x: 240, y: 130, w: 400, h: 30, fill: "#666666", text: "Responsável: João da Silva", fontSize: 16, fontWeight: "normal", name: "Person" },
          { id: `tmpl_${Date.now()}_5`, type: "text", x: 240, y: 200, w: 400, h: 25, fill: "#444444", text: "joao@empresa.com", fontSize: 14, fontWeight: "normal", name: "Email" },
          { id: `tmpl_${Date.now()}_6`, type: "text", x: 240, y: 230, w: 400, h: 25, fill: "#444444", text: "(11) 99999-9999", fontSize: 14, fontWeight: "normal", name: "Phone" },
          { id: `tmpl_${Date.now()}_7`, type: "text", x: 240, y: 260, w: 400, h: 25, fill: "#444444", text: "www.empresa.com", fontSize: 14, fontWeight: "normal", name: "Website" },
          { id: `tmpl_${Date.now()}_8`, type: "text", x: 240, y: 310, w: 400, h: 25, fill: "#888888", text: "Rua Exemplo, 123 — São Paulo, SP", fontSize: 12, fontWeight: "normal", name: "Address" },
        ],
      },
      "social-post": {
        width: 1080, height: 1080, bg: "#0D0D0D",
        elements: [
          { id: `tmpl_${Date.now()}_1`, type: "rect", x: 60, y: 60, w: 960, h: 960, fill: "#1A1A1A", text: "", fontSize: 1, fontWeight: "normal", name: "BG Card" },
          { id: `tmpl_${Date.now()}_2`, type: "rect", x: 120, y: 120, w: 840, h: 8, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "Accent Bar" },
          { id: `tmpl_${Date.now()}_3`, type: "text", x: 120, y: 180, w: 840, h: 200, fill: "#FFFFFF", text: "SEU TÍTULO AQUI", fontSize: 48, fontWeight: "bold", name: "Title" },
          { id: `tmpl_${Date.now()}_4`, type: "text", x: 120, y: 420, w: 840, h: 120, fill: "#AAAAAA", text: "Adicione sua descrição ou mensagem para o post aqui.", fontSize: 20, fontWeight: "normal", name: "Subtitle" },
          { id: `tmpl_${Date.now()}_5`, type: "rect", x: 120, y: 780, w: 300, h: 60, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "CTA BG" },
          { id: `tmpl_${Date.now()}_6`, type: "text", x: 120, y: 785, w: 300, h: 50, fill: "#FFFFFF", text: "SAIBA MAIS →", fontSize: 18, fontWeight: "bold", name: "CTA Text" },
          { id: `tmpl_${Date.now()}_7`, type: "text", x: 620, y: 880, w: 340, h: 30, fill: "#666666", text: "@suaempresa", fontSize: 16, fontWeight: "normal", name: "Handle" },
        ],
      },
      flyer: {
        width: 800, height: 1100, bg: "#FFFFFF",
        elements: [
          { id: `tmpl_${Date.now()}_1`, type: "rect", x: 0, y: 0, w: 800, h: 400, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "Top BG" },
          { id: `tmpl_${Date.now()}_2`, type: "text", x: 60, y: 80, w: 680, h: 100, fill: "#FFFFFF", text: "EVENTO ESPECIAL", fontSize: 48, fontWeight: "bold", name: "Title" },
          { id: `tmpl_${Date.now()}_3`, type: "text", x: 60, y: 200, w: 680, h: 60, fill: "#FFFFFF", text: "Data: 01/01/2026 — Horário: 20h\nLocal: Centro de Convenções", fontSize: 18, fontWeight: "normal", name: "Details" },
          { id: `tmpl_${Date.now()}_4`, type: "text", x: 60, y: 480, w: 680, h: 200, fill: "#333333", text: "Descrição do evento aqui.\nAdicione todas as informações importantes\npara seus convidados.", fontSize: 18, fontWeight: "normal", name: "Description" },
          { id: `tmpl_${Date.now()}_5`, type: "rect", x: 250, y: 750, w: 300, h: 70, fill: accentColor, text: "", fontSize: 1, fontWeight: "normal", name: "Button BG" },
          { id: `tmpl_${Date.now()}_6`, type: "text", x: 250, y: 755, w: 300, h: 60, fill: "#FFFFFF", text: "CONFIRMAR PRESENÇA", fontSize: 16, fontWeight: "bold", name: "Button Text" },
        ],
      },
    };

    const template = templates[templateType] || templates["resume"];
    const offsetX = (state.canvasWidth - template.width) / 2;
    const offsetY = (state.canvasHeight - template.height) / 2;

    const newElements = template.elements.map((el) => ({
      ...el,
      id: `elm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      x: el.x + Math.max(0, offsetX),
      y: el.y + Math.max(0, offsetY),
    }));

    state.elements = [...state.elements, ...newElements];
    state.canvasBg = template.bg;

    if (typeof state.saveSnapshot === "function") {
      state.saveSnapshot();
    }

    return {
      success: true,
      message: `Template "${templateType}" created with ${newElements.length} elements`,
      data: { template: templateType, elementCount: newElements.length, elements: newElements.map((e) => ({ id: e.id, name: e.name, type: e.type })) },
    };
  },

  async bring_forward(params: Record<string, unknown>) {
    const elementId = params.elementId ? String(params.elementId) : null;
    const store = getDesignerState();
    const state = store.getState();
    const targetId = elementId || state.selectedId;

    if (!targetId) return { success: false, error: "No element specified (provide elementId or select one)" };

    const idx = state.elements.findIndex((el: any) => el.id === targetId);
    if (idx === -1) return { success: false, error: `Element "${targetId}" not found` };
    if (idx === state.elements.length - 1) return { success: true, message: `Element "${targetId}" is already at the front` };

    const newElements = [...state.elements];
    [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
    store.setState({ elements: newElements });

    if (typeof state.saveSnapshot === "function") {
      state.saveSnapshot();
    }

    return { success: true, message: `Brought "${targetId}" forward` };
  },

  async send_backward(params: Record<string, unknown>) {
    const elementId = params.elementId ? String(params.elementId) : null;
    const store = getDesignerState();
    const state = store.getState();
    const targetId = elementId || state.selectedId;

    if (!targetId) return { success: false, error: "No element specified (provide elementId or select one)" };

    const idx = state.elements.findIndex((el: any) => el.id === targetId);
    if (idx === -1) return { success: false, error: `Element "${targetId}" not found` };
    if (idx === 0) return { success: true, message: `Element "${targetId}" is already at the back` };

    const newElements = [...state.elements];
    [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
    store.setState({ elements: newElements });

    if (typeof state.saveSnapshot === "function") {
      state.saveSnapshot();
    }

    return { success: true, message: `Sent "${targetId}" backward` };
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

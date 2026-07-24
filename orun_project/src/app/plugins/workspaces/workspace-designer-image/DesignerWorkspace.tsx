import { useState, useRef, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerDesignerActions, unregisterDesignerActions } from "./designer-actions";
import { useTranslation } from "../../../../i18n/I18nProvider";

// ── Colors ───────────────────────────────────────────────────────────────

const C = {
  workspaceBg: "var(--background, #1A1A2E)",
  panel: "var(--card, #161B22)",
  canvas: "#FFFFFF",
  accent: "#C00018",
  selectionBlue: "#2D7FF9",
  textDark: "var(--foreground, #E5E7EB)",
  border: "var(--border, #30363D)",
  input: "var(--secondary, #0D1117)",
  hover: "var(--secondary, rgba(255,255,255,0.06))",
  active: "rgba(45,127,249,0.15)",
  muted: "var(--muted-foreground, #8B949E)",
};

// ── Types ────────────────────────────────────────────────────────────────

interface CanvasElement {
  id: string;
  type: "rect" | "circle" | "triangle" | "star" | "text" | "image" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  rotation: number;
  opacity: number;
  name: string;
  zIndex: number;
  locked?: boolean;
}

interface DesignerState {
  [key: string]: unknown;
  elements: CanvasElement[];
  selectedId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  canvasBg: string;
  zoom: number;
  activeTool: string;
  pages: number;
  currentPage: number;
  undoStack: CanvasElement[][];
  redoStack: CanvasElement[][];
  aspectLocked: boolean;
}

const defaultElements: CanvasElement[] = [
  {
    id: "img-placeholder",
    type: "rect",
    x: 120,
    y: 160,
    width: 260,
    height: 200,
    fill: "#F3F4F6",
    stroke: "#D1D5DB",
    strokeWidth: 2,
    rotation: 0,
    opacity: 1,
    name: "Imagem",
    zIndex: 0,
  },
  {
    id: "title-text",
    type: "text",
    x: 140,
    y: 220,
    width: 220,
    height: 50,
    fill: "#374151",
    text: "Título do Design",
    fontSize: 32,
    bold: true,
    rotation: 0,
    opacity: 1,
    name: "Título",
    zIndex: 1,
  },
  {
    id: "subtitle-text",
    type: "text",
    x: 160,
    y: 280,
    width: 180,
    height: 30,
    fill: "#9CA3AF",
    text: "Subtítulo aqui",
    fontSize: 16,
    rotation: 0,
    opacity: 1,
    name: "Subtítulo",
    zIndex: 2,
  },
  {
    id: "deco-circle",
    type: "circle",
    x: 350,
    y: 100,
    width: 90,
    height: 90,
    fill: C.accent,
    opacity: 0.85,
    rotation: 0,
    name: "Círculo Decorativo",
    zIndex: 3,
  },
];

const useDesignerStore = createStore<DesignerState>({
  elements: [],
  selectedId: null,
  canvasWidth: 540,
  canvasHeight: 400,
  canvasBg: C.canvas,
  zoom: 1,
  activeTool: "select",
  pages: 1,
  currentPage: 1,
  undoStack: [],
  redoStack: [],
  aspectLocked: false,
});

// ── Undo/Redo Helpers ─────────────────────────────────────────────────

function pushUndo() {
  const s = useDesignerStore.getState();
  useDesignerStore.setState({
    undoStack: [...s.undoStack.slice(-49), s.elements],
    redoStack: [],
  });
}

function undo() {
  const s = useDesignerStore.getState();
  if (s.undoStack.length === 0) return;
  const prev = s.undoStack[s.undoStack.length - 1];
  useDesignerStore.setState({
    undoStack: s.undoStack.slice(0, -1),
    redoStack: [...s.redoStack, s.elements],
    elements: prev,
    selectedId: null,
  });
}

function redo() {
  const s = useDesignerStore.getState();
  if (s.redoStack.length === 0) return;
  const next = s.redoStack[s.redoStack.length - 1];
  useDesignerStore.setState({
    redoStack: s.redoStack.slice(0, -1),
    undoStack: [...s.undoStack, s.elements],
    elements: next,
    selectedId: null,
  });
}

// ── Presets ──────────────────────────────────────────────────────────────

function getTemplateSizes(t: (key: string) => string) {
  return [
    { label: t("designer_template_instagram_post"), w: 1080, h: 1080, icon: "◻" },
    { label: t("designer_template_story"), w: 1080, h: 1920, icon: "▯" },
    { label: t("designer_template_thumbnail"), w: 1280, h: 720, icon: "▬" },
    { label: t("designer_template_logo"), w: 500, h: 500, icon: "◆" },
    { label: t("designer_template_presentation"), w: 1920, h: 1080, icon: "🖥" },
  ];
}

const solidColors = [
  "#FFFFFF", "#000000", "#C00018", "#2D7FF9", "#10B981",
  "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
  "#1F2937", "#6B7280", "#D1D5DB", "#F3F4F6", "#FEFCE8",
];

const gradients = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

function getElementShapes(t: (key: string) => string) {
  return [
    { type: "rect" as const, label: t("designer_shape_rectangle"), preview: "□" },
    { type: "circle" as const, label: t("designer_shape_circle"), preview: "○" },
    { type: "triangle" as const, label: t("designer_shape_triangle"), preview: "△" },
    { type: "star" as const, label: t("designer_shape_star"), preview: "★" },
    { type: "line" as const, label: t("designer_shape_line"), preview: "—" },
  ];
}

function getElementIcons(t: (key: string) => string) {
  return [
    { type: "heart" as const, label: t("designer_icon_heart"), preview: "♥" },
    { type: "bolt" as const, label: t("designer_icon_bolt"), preview: "⚡" },
    { type: "sun" as const, label: t("designer_icon_sun"), preview: "☀" },
  ];
}

// ── SVG Shape Renderer ───────────────────────────────────────────────────

function ShapeSVG({ el }: { el: CanvasElement }) {
  const base: React.CSSProperties = {
    opacity: el.opacity,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    transformOrigin: "center",
  };

  if (el.type === "text") {
    const parts = (el.text || "").split("\n");
    return (
      <text
        x={el.x}
        y={el.y + (el.fontSize || 16)}
        fill={el.fill}
        fontSize={el.fontSize || 16}
        fontFamily={el.fontFamily || "'Sora', sans-serif"}
        fontWeight={el.bold ? "bold" : "normal"}
        fontStyle={el.italic ? "italic" : "normal"}
        textDecoration={el.underline ? "underline" : "none"}
        style={base}
      >
        {parts.map((line, i) => (
          <tspan key={i} x={el.x} dy={i === 0 ? 0 : el.fontSize || 16}>
            {line}
          </tspan>
        ))}
      </text>
    );
  }

  if (el.type === "circle") {
    return (
      <ellipse
        cx={el.x + el.width / 2}
        cy={el.y + el.height / 2}
        rx={el.width / 2}
        ry={el.height / 2}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        style={base}
      />
    );
  }

  if (el.type === "triangle") {
    const cx = el.x + el.width / 2;
    const pts = `${cx},${el.y} ${el.x},${el.y + el.height} ${el.x + el.width},${el.y + el.height}`;
    return <polygon points={pts} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />;
  }

  if (el.type === "star") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const r1 = el.width / 2;
    const r2 = r1 * 0.4;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const angle = (i * 36 - 90) * (Math.PI / 180);
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return <polygon points={pts.join(" ")} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />;
  }

  if (el.type === "line") {
    return (
      <line
        x1={el.x}
        y1={el.y}
        x2={el.x + el.width}
        y2={el.y + el.height}
        stroke={el.fill}
        strokeWidth={el.strokeWidth || 2}
        style={base}
      />
    );
  }

  if (el.type === "image" && (el as any).src) {
    return (
      <image
        href={(el as any).src}
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        preserveAspectRatio="xMidYMid meet"
        style={base}
      />
    );
  }

  if (el.type === "rect") {
    return (
      <rect
        x={el.x}
        y={el.y}
        width={el.width}
        height={el.height}
        rx={6}
        fill={el.fill}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        style={base}
      />
    );
  }

  return null;
}

// ── Selection Overlay ────────────────────────────────────────────────────

type HandlePos = "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";

function SelectionOverlay({ el, onResizeStart }: { el: CanvasElement; onResizeStart?: (e: React.PointerEvent, handle: HandlePos) => void }) {
  const handleSize = 8;
  const half = handleSize / 2;
  const handles: { pos: HandlePos; cx: number; cy: number }[] = [
    { pos: "nw", cx: el.x - half, cy: el.y - half },
    { pos: "ne", cx: el.x + el.width - half, cy: el.y - half },
    { pos: "sw", cx: el.x - half, cy: el.y + el.height - half },
    { pos: "se", cx: el.x + el.width - half, cy: el.y + el.height - half },
    { pos: "n", cx: el.x + el.width / 2 - half, cy: el.y - half },
    { pos: "s", cx: el.x + el.width / 2 - half, cy: el.y + el.height - half },
    { pos: "w", cx: el.x - half, cy: el.y + el.height / 2 - half },
    { pos: "e", cx: el.x + el.width - half, cy: el.y + el.height / 2 - half },
  ];
  const cursors: Record<HandlePos, string> = { nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize", n: "ns-resize", s: "ns-resize", w: "ew-resize", e: "ew-resize" };
  return (
    <>
      <rect
        x={el.x - 2}
        y={el.y - 2}
        width={el.width + 4}
        height={el.height + 4}
        fill="none"
        stroke={C.selectionBlue}
        strokeWidth={1.5}
        rx={el.type === "text" ? 2 : 6}
        style={{ pointerEvents: "none" }}
      />
      {handles.map((h) => (
        <rect
          key={h.pos}
          x={h.cx}
          y={h.cy}
          width={handleSize}
          height={handleSize}
          fill="#FFFFFF"
          stroke={C.selectionBlue}
          strokeWidth={1.5}
          rx={1}
          style={{ cursor: cursors[h.pos], pointerEvents: "all" }}
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart?.(e, h.pos); }}
        />
      ))}
    </>
  );
}

// ── Ruler ────────────────────────────────────────────────────────────────

function Ruler({ direction, length, zoom }: { direction: "h" | "v"; length: number; zoom: number }) {
  const marks: React.ReactNode[] = [];
  const step = 50;
  for (let px = 0; px <= length; px += step) {
    const pos = px * zoom;
    if (direction === "h") {
      marks.push(
        <g key={px}>
          <line x1={pos} y1={14} x2={pos} y2={20} stroke="#555" strokeWidth={0.5} />
          <text x={pos + 2} y={10} fill="#777" fontSize={7} fontFamily="monospace">{px}</text>
        </g>
      );
    } else {
      marks.push(
        <g key={px}>
          <line x1={14} y1={pos} x2={20} y2={pos} stroke="#555" strokeWidth={0.5} />
          <text x={2} y={pos + 3} fill="#777" fontSize={7} fontFamily="monospace">{px}</text>
        </g>
      );
    }
  }
  return (
    <svg
      style={{
        position: "absolute",
        background: "#111122",
        ...(direction === "h" ? { top: 0, left: 20, right: 0, height: 20 } : { top: 20, left: 0, bottom: 0, width: 20 }),
      }}
      width={direction === "h" ? "100%" : 20}
      height={direction === "h" ? 20 : "100%"}
    >
      {marks}
    </svg>
  );
}

// ── Grid Dots ────────────────────────────────────────────────────────────

function GridDots() {
  const dots: React.ReactNode[] = [];
  const spacing = 24;
  for (let x = spacing; x < 2000; x += spacing) {
    for (let y = spacing; y < 1200; y += spacing) {
      dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.8} fill="rgba(255,255,255,0.04)" />);
    }
  }
  return <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{dots}</svg>;
}

// ── Top Toolbar ──────────────────────────────────────────────────────────

function TopToolbar() {
  const { t } = useTranslation();
  const activeTool = useDesignerStore((s) => s.activeTool);
  const zoom = useDesignerStore((s) => s.zoom);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const tools = [
    { id: "select", icon: "⊹", label: t("designer_tool_select") },
    { id: "text", icon: "T", label: t("designer_tool_text") },
    { id: "shape", icon: "▢", label: t("designer_tool_shape") },
    { id: "image", icon: "🖼", label: t("designer_tool_image") },
    { id: "draw", icon: "✎", label: t("designer_tool_draw") },
    { id: "delete", icon: "✕", label: t("designer_tool_delete") },
  ];

  const zoomLevels = [0.5, 0.75, 1, 1.25];

  const setTool = (id: string) => useDesignerStore.setState({ activeTool: id });

  const deleteSelected = () => {
    const { selectedId } = useDesignerStore.getState();
    if (selectedId) {
      pushUndo();
      useDesignerStore.setState((s) => ({
        elements: s.elements.filter((el) => el.id !== selectedId),
        selectedId: null,
      }));
    }
  };

  const exportPNG = async () => {
    const svgEl = document.querySelector("[data-designer-canvas] svg") as SVGElement | null;
    if (!svgEl) return;
    const state = useDesignerStore.getState();
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = state.canvasWidth * 2;
      canvas.height = state.canvasHeight * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(async (pngBlob) => {
        if (!pngBlob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": pngBlob }),
          ]);
          showToast(t("designer_toast_png_copied"));
        } catch {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(pngBlob);
          link.download = `design-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(link.href);
          showToast(t("designer_toast_png_saved"));
        }
      }, "image/png");
    };
    img.src = url;
  };

  return (
    <div
      className="flex items-center px-3 h-9 border-b shrink-0"
      style={{ background: C.panel, borderColor: C.border, fontFamily: "'Sora', sans-serif" }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[11px] font-medium z-50"
          style={{ background: C.accent, color: "#FFF", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
        >
          {toast}
        </div>
      )}

      {/* Left: Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => (t.id === "delete" ? deleteSelected() : setTool(t.id))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] transition-all"
            style={{
              background: activeTool === t.id ? C.active : "transparent",
              color: activeTool === t.id ? C.selectionBlue : C.textDark,
              border: activeTool === t.id ? `1px solid ${C.selectionBlue}` : "1px solid transparent",
            }}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Center: Zoom */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {zoomLevels.map((z) => (
          <button
            key={z}
            onClick={() => useDesignerStore.setState({ zoom: z })}
            className="px-2.5 py-1 rounded text-[9px] transition-all"
            style={{
              background: Math.abs(zoom - z) < 0.01 ? "rgba(255,255,255,0.1)" : "transparent",
              color: Math.abs(zoom - z) < 0.01 ? "#FFF" : C.muted,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
        <button
          onClick={() => useDesignerStore.setState({ zoom: 1 })}
          className="px-2.5 py-1 rounded text-[9px]"
          style={{ color: C.muted, fontFamily: "'Inter', sans-serif" }}
        >
          {t("designer_zoom_fit")}
        </button>
      </div>

      {/* Right: Import/Export/Share */}
      <div className="flex items-center gap-1.5">
        <button
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: C.textDark, border: `1px solid ${C.border}` }}
          onClick={async () => {
            try {
              const handles = await (window as any).showOpenFilePicker({
                types: [{ description: "Imagens", accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"] } }],
                multiple: true,
              });
              for (const fh of handles) {
                const file = await fh.getFile();
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                  pushUndo();
                  useDesignerStore.setState((s) => ({
                    elements: [...s.elements, {
                      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      type: "image" as const,
                      x: 50 + Math.random() * 100,
                      y: 50 + Math.random() * 100,
                      width: Math.min(img.width, 400),
                      height: Math.min(Math.min(img.width, 400) * (img.height / (img.width || 1)), 400),
                      fill: "transparent",
                      rotation: 0,
                      opacity: 1,
                      src: url,
                      name: file.name,
                      zIndex: s.elements.length,
                    }],
                  }));
                };
                img.src = url;
              }
            } catch (e) { console.error("[designer] Failed to import image:", e); }
          }}
        >
          {t("designer_import_button")}
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: C.textDark, border: `1px solid ${C.border}` }}
          onClick={() => {
            const svgEl = document.querySelector("[data-designer-canvas] svg") as SVGElement | null;
            if (svgEl) {
              const svgData = new XMLSerializer().serializeToString(svgEl);
              const blob = new Blob([svgData], { type: "image/svg+xml" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `design-${Date.now()}.svg`;
              link.click();
              URL.revokeObjectURL(link.href);
              showToast(t("designer_toast_svg_exported"));
            }
          }}
        >
          {t("designer_export_button")}
        </button>
        <button
          className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
          style={{ background: C.accent, color: "#FFF" }}
          onClick={exportPNG}
        >
          {t("designer_share_button")}
        </button>
      </div>
    </div>
  );
}

// ── Left Sidebar ─────────────────────────────────────────────────────────

function LeftSidebar() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"modelos" | "elementos" | "texto" | "uploads" | "fundo">("modelos");

  const addElement = useCallback((patch: Partial<CanvasElement>, type: CanvasElement["type"]) => {
    const state = useDesignerStore.getState();
    const newEl: CanvasElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 60 + Math.random() * 80,
      y: 60 + Math.random() * 80,
      width: 120,
      height: type === "line" ? 4 : 120,
      fill: "#C00018",
      rotation: 0,
      opacity: 1,
      name: type,
      zIndex: state.elements.length,
      ...patch,
    };
    useDesignerStore.setState((s) => ({
      elements: [...s.elements, newEl],
      selectedId: newEl.id,
    }));
  }, []);

  const tabs = [
    { id: "modelos" as const, label: t("designer_tab_templates") },
    { id: "elementos" as const, label: t("designer_tab_elements") },
    { id: "texto" as const, label: t("designer_tab_text") },
    { id: "uploads" as const, label: t("designer_tab_uploads") },
    { id: "fundo" as const, label: t("designer_tab_background") },
  ];

  return (
    <div
      className="w-[220px] border-r flex flex-col shrink-0 overflow-hidden"
      style={{ background: C.panel, borderColor: C.border }}
    >
      {/* Tab Headers */}
      <div className="flex border-b" style={{ borderColor: C.border }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-[8px] tracking-wider uppercase transition-all"
            style={{
              fontFamily: "'Sora', sans-serif",
              color: tab === t.id ? "#FFF" : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: "thin" }}>
        {tab === "modelos" && (
          <div className="space-y-2">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_templates_section_title")}
            </div>
            {getTemplateSizes(t).map((tmpl) => (
              <button
                key={tmpl.label}
                onClick={() => useDesignerStore.setState({ canvasWidth: tmpl.w, canvasHeight: tmpl.h })}
                className="w-full p-2.5 rounded-lg text-left transition-all flex items-center gap-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
              >
                <div
                  className="w-9 h-9 rounded flex items-center justify-center text-[13px]"
                  style={{ background: "rgba(255,255,255,0.06)", color: C.textDark }}
                >
                  {tmpl.icon}
                </div>
                <div>
                  <div className="text-[10px] font-medium" style={{ color: C.textDark }}>{tmpl.label}</div>
                  <div className="text-[8px]" style={{ color: C.muted, fontFamily: "'Inter', sans-serif" }}>
                    {tmpl.w} × {tmpl.h}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "elementos" && (
          <div className="space-y-3">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_elements_section_shapes")}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {getElementShapes(t).map((s) => (
                <button
                  key={s.type}
                  onClick={() => addElement({ fill: "#C00018", width: 100, height: 100 }, s.type)}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
                >
                  <span className="text-[16px]" style={{ color: C.textDark }}>{s.preview}</span>
                  <span className="text-[7px]" style={{ color: C.muted }}>{s.label}</span>
                </button>
              ))}
            </div>

            <div className="text-[9px] uppercase tracking-wider pt-1" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_elements_section_icons")}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {getElementIcons(t).map((s) => (
                <button
                  key={s.type}
                  onClick={() => addElement({ fill: "#F59E0B", width: 60, height: 60, type: "text", text: s.preview, fontSize: 36 }, "text")}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
                >
                  <span className="text-[18px]" style={{ color: C.textDark }}>{s.preview}</span>
                  <span className="text-[7px]" style={{ color: C.muted }}>{s.label}</span>
                </button>
              ))}
            </div>

            <div className="text-[9px] uppercase tracking-wider pt-1" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_elements_section_decorative")}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {["✦", "❖", "✧", "⬡", "◈", "◉"].map((sym, i) => (
                <button
                  key={i}
                  onClick={() => addElement({ fill: "#8B5CF6", width: 50, height: 50, type: "text", text: sym, fontSize: 30 }, "text")}
                  className="aspect-square rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
                >
                  <span className="text-[18px]" style={{ color: C.textDark }}>{sym}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "texto" && (
          <div className="space-y-2">
            {[
              { label: t("designer_text_add_title"), size: 36, weight: "bold" as const },
              { label: t("designer_text_add_subtitle"), size: 24, weight: "600" as const },
              { label: t("designer_text_add_body"), size: 16, weight: "normal" as const },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  addElement(
                    { fill: "#374151", text: preset.label.replace("Adicionar ", ""), fontSize: preset.size, bold: preset.weight === "bold", width: 200, height: preset.size + 10 },
                    "text"
                  )
                }
                className="w-full p-3 rounded-lg text-left transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}
              >
                <div
                  className="font-medium truncate"
                  style={{
                    fontSize: `${Math.min(preset.size / 3, 14)}px`,
                    color: C.textDark,
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: preset.weight,
                  }}
                >
                  {preset.label}
                </div>
                <div className="text-[8px] mt-0.5" style={{ color: C.muted }}>
                  {preset.size}px
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "uploads" && (
          <div className="space-y-2">
            <div
              className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
              style={{ borderColor: C.border, minHeight: 140 }}
              onClick={() => document.getElementById("designer-upload-input")?.click()}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]" style={{ background: "rgba(255,255,255,0.06)", color: C.muted }}>
                ↑
              </div>
              <div className="text-[10px] text-center" style={{ color: C.muted, fontFamily: "'Inter', sans-serif" }}>
                {t("designer_uploads_drag_here")}
              </div>
              <div className="text-[8px]" style={{ color: C.muted }}>{t("designer_uploads_or_click")}</div>
            </div>
            <input id="designer-upload-input" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => {
              const files = e.target.files;
              if (!files) return;
              pushUndo();
              const state = useDesignerStore.getState();
              const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
              const newElements = Array.from(files).map((f, i) => ({
                id: `img_${Date.now()}_${i}`,
                type: "image" as const,
                x: 100 + i * 20,
                y: 100 + i * 20,
                width: 200,
                height: 200,
                fill: "#CCCCCC",
                rotation: 0,
                opacity: 1,
                name: f.name.replace(/\.[^.]+$/, ""),
                zIndex: maxZ + i + 1,
              }));
              useDesignerStore.setState({ elements: [...state.elements, ...newElements] });
              e.target.value = "";
            }} />
          </div>
        )}

        {tab === "fundo" && (
          <div className="space-y-3">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_background_solid_colors")}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {solidColors.map((color) => (
                <button
                  key={color}
                  onClick={() => useDesignerStore.setState({ canvasBg: color })}
                  className="aspect-square rounded-lg transition-all"
                  style={{
                    background: color,
                    border: `2px solid ${useDesignerStore.getState().canvasBg === color ? "#FFF" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>

            <div className="text-[9px] uppercase tracking-wider pt-1" style={{ color: C.muted, fontFamily: "'Sora', sans-serif" }}>
              {t("designer_background_gradients")}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {gradients.map((g, i) => (
                <button
                  key={i}
                  onClick={() => useDesignerStore.setState({ canvasBg: g })}
                  className="h-10 rounded-lg transition-all"
                  style={{
                    background: g,
                    border: "2px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Right Panel ──────────────────────────────────────────────────────────

function RightPanel() {
  const { t } = useTranslation();
  const elements = useDesignerStore((s) => s.elements);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const canvasWidth = useDesignerStore((s) => s.canvasWidth);
  const canvasHeight = useDesignerStore((s) => s.canvasHeight);
  const canvasBg = useDesignerStore((s) => s.canvasBg);
  const selected = selectedId ? elements.find((el) => el.id === selectedId) : null;

  const updateElement = useCallback(
    (patch: Partial<CanvasElement>) => {
      if (!selectedId) return;
      useDesignerStore.setState((s) => ({
        elements: s.elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)),
      }));
    },
    [selectedId]
  );

  const inputStyle: React.CSSProperties = {
    background: C.input,
    border: `1px solid ${C.border}`,
    color: C.textDark,
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    borderRadius: "4px",
    padding: "4px 6px",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "8px",
    color: C.muted,
    fontFamily: "'Inter', sans-serif",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "2px",
    display: "block",
  };

  return (
    <div
      className="w-[220px] border-l flex flex-col shrink-0 overflow-y-auto"
      style={{ background: C.panel, borderColor: C.border, scrollbarWidth: "thin" }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: C.border }}>
        <div className="text-[9px] uppercase tracking-wider font-medium" style={{ color: C.textDark, fontFamily: "'Sora', sans-serif" }}>
          {selected ? `${selected.name}` : t("designer_panel_design_name")}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {!selected ? (
          <>
            {/* Canvas Size */}
            <div>
              <div style={labelStyle}>{t("designer_panel_canvas_size")}</div>
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <input
                    type="number"
                    value={canvasWidth}
                    onChange={(e) => useDesignerStore.setState({ canvasWidth: Number(e.target.value) })}
                    style={inputStyle}
                  />
                  <div className="text-[7px] text-center mt-0.5" style={{ color: C.muted }}>{t("designer_panel_width")}</div>
                </div>
                <div className="text-[10px] self-center" style={{ color: C.muted }}>×</div>
                <div className="flex-1">
                  <input
                    type="number"
                    value={canvasHeight}
                    onChange={(e) => useDesignerStore.setState({ canvasHeight: Number(e.target.value) })}
                    style={inputStyle}
                  />
                  <div className="text-[7px] text-center mt-0.5" style={{ color: C.muted }}>{t("designer_panel_height")}</div>
                </div>
              </div>
            </div>

            {/* Background Color */}
            <div>
              <div style={labelStyle}>{t("designer_panel_background_color")}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="color"
                  value={canvasBg.startsWith("#") ? canvasBg : "#FFFFFF"}
                  onChange={(e) => useDesignerStore.setState({ canvasBg: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                  style={{ padding: 0 }}
                />
                <input
                  value={canvasBg}
                  onChange={(e) => useDesignerStore.setState({ canvasBg: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>

            <div className="text-[9px] text-center pt-4" style={{ color: C.muted, fontFamily: "'Inter', sans-serif" }}>
              {t("designer_panel_select_element_hint")}
            </div>
          </>
        ) : (
          <>
            {/* Element Type */}
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: C.border }}>
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[10px]"
                style={{ background: "rgba(255,255,255,0.06)", color: C.textDark }}
              >
                {selected.type === "text" ? "T" : selected.type === "circle" ? "○" : selected.type === "star" ? "★" : selected.type === "triangle" ? "△" : "□"}
              </div>
              <div className="text-[10px] font-medium" style={{ color: C.textDark }}>{selected.name}</div>
            </div>

            {/* Position */}
            <div>
              <div style={labelStyle}>{t("designer_panel_position")}</div>
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <div className="text-[7px] mb-0.5" style={{ color: C.muted }}>X</div>
                  <input type="number" value={Math.round(selected.x)} onChange={(e) => updateElement({ x: Number(e.target.value) })} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <div className="text-[7px] mb-0.5" style={{ color: C.muted }}>Y</div>
                  <input type="number" value={Math.round(selected.y)} onChange={(e) => updateElement({ y: Number(e.target.value) })} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex items-center justify-between">
                <div style={labelStyle}>{t("designer_panel_size")}</div>
                <button
                  className="text-[8px] px-1.5 py-0.5 rounded"
                  onClick={() => useDesignerStore.setState((s) => ({ aspectLocked: !s.aspectLocked }))}
                  style={{ background: useDesignerStore.getState().aspectLocked ? "rgba(45,127,249,0.2)" : "rgba(255,255,255,0.06)", color: useDesignerStore.getState().aspectLocked ? C.selectionBlue : C.muted }}
                >
                  🔗
                </button>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <div className="text-[7px] mb-0.5" style={{ color: C.muted }}>W</div>
                  <input type="number" value={Math.round(selected.width)} onChange={(e) => {
                    const w = Number(e.target.value);
                    if (useDesignerStore.getState().aspectLocked && selected.width > 0) {
                      updateElement({ width: w, height: w * (selected.height / selected.width) });
                    } else {
                      updateElement({ width: w });
                    }
                  }} style={inputStyle} />
                </div>
                <div className="flex-1">
                  <div className="text-[7px] mb-0.5" style={{ color: C.muted }}>H</div>
                  <input type="number" value={Math.round(selected.height)} onChange={(e) => {
                    const h = Number(e.target.value);
                    if (useDesignerStore.getState().aspectLocked && selected.height > 0) {
                      updateElement({ height: h, width: h * (selected.width / selected.height) });
                    } else {
                      updateElement({ height: h });
                    }
                  }} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between">
                <div style={labelStyle}>{t("designer_panel_rotation")}</div>
                <div className="text-[8px]" style={{ color: C.muted }}>{selected.rotation}°</div>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={selected.rotation}
                onChange={(e) => updateElement({ rotation: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: C.selectionBlue }}
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between">
                <div style={labelStyle}>{t("designer_panel_opacity")}</div>
                <div className="text-[8px]" style={{ color: C.muted }}>{Math.round(selected.opacity * 100)}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={selected.opacity}
                onChange={(e) => updateElement({ opacity: Number(e.target.value) })}
                className="w-full"
                style={{ accentColor: C.selectionBlue }}
              />
            </div>

            {/* Text specific */}
            {selected.type === "text" && (
              <>
                <div className="border-t pt-2" style={{ borderColor: C.border }}>
                  <div style={labelStyle}>{t("designer_panel_text")}</div>
                  <textarea
                    value={selected.text || ""}
                    onChange={(e) => updateElement({ text: e.target.value })}
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_font_size")}</div>
                  <input type="number" value={selected.fontSize || 16} onChange={(e) => updateElement({ fontSize: Number(e.target.value) })} style={inputStyle} />
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_font_family") || "Fonte"}</div>
                  <select
                    value={selected.fontFamily || "'Sora', sans-serif"}
                    onChange={(e) => updateElement({ fontFamily: e.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {[
                      "'Sora', sans-serif",
                      "'Inter', sans-serif",
                      "'JetBrains Mono', monospace",
                      "'Playfair Display', serif",
                      "'Poppins', sans-serif",
                      "'Montserrat', sans-serif",
                      "'Roboto', sans-serif",
                      "'Open Sans', sans-serif",
                      "'Lato', sans-serif",
                      "'Oswald', sans-serif",
                      "'Raleway', sans-serif",
                      "'Merriweather', serif",
                      "'Source Code Pro', monospace",
                      "Arial, sans-serif",
                      "Georgia, serif",
                      "Times New Roman, serif",
                      "Courier New, monospace",
                    ].map((f) => (
                      <option key={f} value={f} style={{ background: "#1a1a2e", color: "#e5e7eb" }}>{f.split("'")[1] || f.split(",")[0]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_style")}</div>
                  <div className="flex gap-1">
                    {[
                      { key: "bold" as const, label: "B" },
                      { key: "italic" as const, label: "I" },
                      { key: "underline" as const, label: "U" },
                    ].map((b) => (
                      <button
                        key={b.key}
                        onClick={() => updateElement({ [b.key]: !selected[b.key] })}
                        className="w-7 h-7 rounded flex items-center justify-center text-[10px] transition-all"
                        style={{
                          background: selected[b.key] ? C.active : "rgba(255,255,255,0.04)",
                          color: selected[b.key] ? C.selectionBlue : C.textDark,
                          border: `1px solid ${selected[b.key] ? C.selectionBlue : C.border}`,
                          fontWeight: b.key === "bold" ? "bold" : "normal",
                          fontStyle: b.key === "italic" ? "italic" : "normal",
                          textDecoration: b.key === "underline" ? "underline" : "none",
                        }}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_text_color")}</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={selected.fill}
                      onChange={(e) => updateElement({ fill: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                      style={{ padding: 0 }}
                    />
                    <input value={selected.fill} onChange={(e) => updateElement({ fill: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              </>
            )}

            {/* Shape specific */}
            {selected.type !== "text" && (
              <>
                <div className="border-t pt-2" style={{ borderColor: C.border }}>
                  <div style={labelStyle}>{t("designer_panel_fill_color")}</div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={selected.fill} onChange={(e) => updateElement({ fill: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" style={{ padding: 0 }} />
                    <input value={selected.fill} onChange={(e) => updateElement({ fill: e.target.value })} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_border_color")}</div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={selected.stroke || "#000000"} onChange={(e) => updateElement({ stroke: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" style={{ padding: 0 }} />
                    <input value={selected.stroke || ""} onChange={(e) => updateElement({ stroke: e.target.value })} style={{ ...inputStyle, flex: 1 }} placeholder={t("designer_panel_none")} />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>{t("designer_panel_border_width")}</div>
                  <input type="number" value={selected.strokeWidth || 0} onChange={(e) => updateElement({ strokeWidth: Number(e.target.value) })} style={inputStyle} />
                </div>
              </>
            )}

            {/* Layer Order */}
            <div className="border-t pt-2" style={{ borderColor: C.border }}>
              <div style={labelStyle}>{t("designer_panel_layer_order")}</div>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    useDesignerStore.setState((s) => {
                      const maxZ = Math.max(...s.elements.map((el) => el.zIndex));
                      return {
                        elements: s.elements.map((el) => (el.id === selectedId ? { ...el, zIndex: maxZ + 1 } : el)),
                      };
                    })
                  }
                  className="flex-1 py-1.5 rounded text-[9px] transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: C.textDark, border: `1px solid ${C.border}` }}
                >
                  {t("designer_panel_bring_front")}
                </button>
                <button
                  onClick={() =>
                    useDesignerStore.setState((s) => {
                      const minZ = Math.min(...s.elements.map((el) => el.zIndex));
                      return {
                        elements: s.elements.map((el) => (el.id === selectedId ? { ...el, zIndex: minZ - 1 } : el)),
                      };
                    })
                  }
                  className="flex-1 py-1.5 rounded text-[9px] transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: C.textDark, border: `1px solid ${C.border}` }}
                >
                  {t("designer_panel_send_back")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Canvas Area ──────────────────────────────────────────────────────────

function CanvasArea() {
  const { t } = useTranslation();
  const elements = useDesignerStore((s) => s.elements);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const canvasWidth = useDesignerStore((s) => s.canvasWidth);
  const canvasHeight = useDesignerStore((s) => s.canvasHeight);
  const canvasBg = useDesignerStore((s) => s.canvasBg);
  const zoom = useDesignerStore((s) => s.zoom);
  const activeTool = useDesignerStore((s) => s.activeTool);

  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; handle: HandlePos; startX: number; startY: number; elX: number; elY: number; elW: number; elH: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, el: CanvasElement) => {
      if (el.locked) return;
      e.stopPropagation();
      useDesignerStore.setState({ selectedId: el.id });
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDrag({
        id: el.id,
        startX: e.clientX,
        startY: e.clientY,
        elX: el.x,
        elY: el.y,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, handle: HandlePos) => {
      const { selectedId, elements } = useDesignerStore.getState();
      const el = elements.find((el) => el.id === selectedId);
      if (!el) return;
      setResize({
        id: el.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        elX: el.x,
        elY: el.y,
        elW: el.width,
        elH: el.height,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (drag) {
        const dx = (e.clientX - drag.startX) / zoom;
        const dy = (e.clientY - drag.startY) / zoom;
        useDesignerStore.setState((s) => ({
          elements: s.elements.map((el) =>
            el.id === drag.id ? { ...el, x: drag.elX + dx, y: drag.elY + dy } : el
          ),
        }));
      } else if (resize) {
        const dx = (e.clientX - resize.startX) / zoom;
        const dy = (e.clientY - resize.startY) / zoom;
        const { handle, elX, elY, elW, elH } = resize;
        let newX = elX, newY = elY, newW = elW, newY2 = elY + elH;
        if (handle.includes("e")) newW = Math.max(10, elW + dx);
        if (handle.includes("w")) { newX = elX + dx; newW = Math.max(10, elW - dx); }
        if (handle.includes("s")) newY2 = elY + elH + dy;
        if (handle.includes("n")) { newY = elY + dy; newY2 = elY + elH - dy; newW = handle === "n" || handle === "s" ? elW : newW; }
        const newH = Math.max(10, newY2 - newY);
        useDesignerStore.setState((s) => ({
          elements: s.elements.map((el) =>
            el.id === resize.id ? { ...el, x: newX, y: newY, width: newW, height: newH } : el
          ),
        }));
      }
    },
    [drag, resize, zoom]
  );

  const handlePointerUp = useCallback(() => { setDrag(null); setResize(null); }, []);

  const handleCanvasClick = useCallback(() => {
    useDesignerStore.setState({ selectedId: null });
  }, []);

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const canvasStyle: React.CSSProperties = canvasBg.startsWith("linear")
    ? { background: canvasBg }
    : { backgroundColor: canvasBg };

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: C.workspaceBg }}>
      <GridDots />
      <Ruler direction="h" length={canvasWidth} zoom={zoom} />
      <Ruler direction="v" length={canvasHeight} zoom={zoom} />

      {/* Canvas Container */}
      <div
        className="absolute"
        style={{
          top: 20,
          left: 20,
          right: 0,
          bottom: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          data-designer-canvas
          style={{
            width: canvasWidth * zoom,
            height: canvasHeight * zoom,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <svg
            ref={svgRef}
            width={canvasWidth * zoom}
            height={canvasHeight * zoom}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            style={{ ...canvasStyle, cursor: activeTool === "select" ? "default" : "crosshair" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleCanvasClick}
          >
            {/* Placeholder text for image area */}
            {elements.some((el) => el.id === "img-placeholder") && (
              <g>
                <text
                  x={elements.find((el) => el.id === "img-placeholder")!.x + elements.find((el) => el.id === "img-placeholder")!.width / 2}
                  y={elements.find((el) => el.id === "img-placeholder")!.y + elements.find((el) => el.id === "img-placeholder")!.height / 2}
                  fill="#9CA3AF"
                  fontSize={12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'Inter', sans-serif"
                >
                  {t("designer_canvas_drag_image")}
                </text>
              </g>
            )}

            {sorted.map((el) => (
              <g
                key={el.id}
                style={{ cursor: activeTool === "select" ? "grab" : "crosshair" }}
                onPointerDown={(e) => handlePointerDown(e, el)}
              >
                <ShapeSVG el={el} />
                {el.type === "text" && (
                  <rect
                    x={el.x - 2}
                    y={el.y - 2}
                    width={el.width + 4}
                    height={el.height + 4}
                    fill="transparent"
                    style={{ pointerEvents: "all" }}
                  />
                )}
              </g>
            ))}

            {selectedId && elements.find((el) => el.id === selectedId) && (
              <SelectionOverlay el={elements.find((el) => el.id === selectedId)!} onResizeStart={handleResizeStart} />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Bottom Bar ───────────────────────────────────────────────────────────

function BottomBar() {
  const pages = useDesignerStore((s) => s.pages);
  const currentPage = useDesignerStore((s) => s.currentPage);

  return (
    <div
      className="h-9 flex items-center justify-center gap-3 border-t shrink-0"
      style={{ background: C.panel, borderColor: C.border, fontFamily: "'Inter', sans-serif" }}
    >
      <div className="text-[9px]" style={{ color: C.muted }}>
        {currentPage} / {pages}
      </div>
      <button
        onClick={() => useDesignerStore.setState((s) => ({ pages: s.pages + 1, currentPage: s.pages + 1 }))}
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] transition-all"
        style={{ background: "rgba(255,255,255,0.06)", color: C.textDark, border: `1px solid ${C.border}` }}
      >
        +
      </button>
    </div>
  );
}

// ── Main Workspace ───────────────────────────────────────────────────────

export function DesignerWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  useEffect(() => {
    if (plugin.lifecycle?.onMount) plugin.lifecycle.onMount();
    return () => { if (plugin.lifecycle?.onUnmount) plugin.lifecycle.onUnmount(); };
  }, [plugin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId } = useDesignerStore.getState();
        if (selectedId) { e.preventDefault(); useDesignerStore.setState((s) => ({ elements: s.elements.filter((el) => el.id !== selectedId), selectedId: null })); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    registerDesignerActions();
    return () => unregisterDesignerActions();
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Sora', sans-serif" }}>
      <TopToolbar />
      <div className="flex flex-1 min-h-0">
        <LeftSidebar />
        <CanvasArea />
        <RightPanel />
      </div>
      <BottomBar />
    </div>
  );
}

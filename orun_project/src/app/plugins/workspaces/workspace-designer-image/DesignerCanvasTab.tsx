import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDesignerStore, type CanvasElement } from "./designer-actions";
import { WorkspaceButton } from "../../components/WorkspaceButton";
import { WorkspaceCard } from "../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../components/WorkspaceEmptyState";
import { WorkspaceBadge } from "../../components/WorkspaceBadge";
import { WorkspaceInput } from "../../components/WorkspaceInput";
import { WorkspaceSection } from "../../components/WorkspaceSection";

function pushUndo() {
  const s = useDesignerStore.getState();
  useDesignerStore.setState({ undoStack: [...s.undoStack.slice(-49), s.elements], redoStack: [] });
}

function undo() {
  const s = useDesignerStore.getState();
  if (s.undoStack.length === 0) return;
  const prev = s.undoStack[s.undoStack.length - 1];
  useDesignerStore.setState({ elements: prev, undoStack: s.undoStack.slice(0, -1), redoStack: [...s.redoStack, s.elements] });
}

function redo() {
  const s = useDesignerStore.getState();
  if (s.redoStack.length === 0) return;
  const next = s.redoStack[s.redoStack.length - 1];
  useDesignerStore.setState({ elements: next, redoStack: s.redoStack.slice(0, -1), undoStack: [...s.undoStack, s.elements] });
}

function ShapeSVG({ el }: { el: CanvasElement }) {
  const base: React.CSSProperties = { opacity: el.opacity, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined, transformOrigin: "center" };
  if (el.type === "text") {
    const parts = (el.text || "").split("\n");
    return (<text x={el.x} y={el.y + (el.fontSize || 16)} fill={el.fill} fontSize={el.fontSize || 16} fontFamily={el.fontFamily || "'Sora', sans-serif"} fontWeight={el.bold ? "bold" : "normal"} fontStyle={el.italic ? "italic" : "normal"} textDecoration={el.underline ? "underline" : "none"} style={base}>{parts.map((line, i) => (<tspan key={i} x={el.x} dy={i === 0 ? 0 : el.fontSize || 16}>{line}</tspan>))}</text>);
  }
  if (el.type === "circle") return <ellipse cx={el.x + el.width / 2} cy={el.y + el.height / 2} rx={el.width / 2} ry={el.height / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />;
  if (el.type === "triangle") { const cx = el.x + el.width / 2; return <polygon points={`${cx},${el.y} ${el.x},${el.y + el.height} ${el.x + el.width},${el.y + el.height}`} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />; }
  if (el.type === "star") {
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2, r1 = el.width / 2, r2 = r1 * 0.4;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? r1 : r2; const a = (i * 36 - 90) * (Math.PI / 180); pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`); }
    return <polygon points={pts.join(" ")} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />;
  }
  if (el.type === "line") return <line x1={el.x} y1={el.y} x2={el.x + el.width} y2={el.y + el.height} stroke={el.fill} strokeWidth={el.strokeWidth || 2} style={base} />;
  if (el.type === "image" && el.src) return <image href={el.src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio="xMidYMid meet" style={base} />;
  return <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={6} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} style={base} />;
}

type HandlePos = "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";
function SelectionOverlay({ el, onResizeStart }: { el: CanvasElement; onResizeStart?: (e: React.PointerEvent, h: HandlePos) => void }) {
  const hs = 7; const half = hs / 2;
  const handles: { pos: HandlePos; cx: number; cy: number }[] = [
    { pos: "nw", cx: el.x - half, cy: el.y - half }, { pos: "ne", cx: el.x + el.width - half, cy: el.y - half },
    { pos: "sw", cx: el.x - half, cy: el.y + el.height - half }, { pos: "se", cx: el.x + el.width - half, cy: el.y + el.height - half },
    { pos: "n", cx: el.x + el.width / 2 - half, cy: el.y - half }, { pos: "s", cx: el.x + el.width / 2 - half, cy: el.y + el.height - half },
    { pos: "w", cx: el.x - half, cy: el.y + el.height / 2 - half }, { pos: "e", cx: el.x + el.width - half, cy: el.y + el.height / 2 - half },
  ];
  const cursors: Record<HandlePos, string> = { nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize", n: "ns-resize", s: "ns-resize", w: "ew-resize", e: "ew-resize" };
  return (<>{handles.map((h) => (<rect key={h.pos} x={h.cx} y={h.cy} width={hs} height={hs} fill="#FFF" stroke="#2D7FF9" strokeWidth={1.5} rx={1} style={{ cursor: cursors[h.pos], pointerEvents: "all" }} onPointerDown={(e) => { e.stopPropagation(); onResizeStart?.(e, h.pos); }} />))}</>);
}

const solidColors = ["#FFFFFF","#000000","#C3002F","#2D7FF9","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316","#1F2937","#6B7280","#D1D5DB","#F3F4F6"];

const TOOLS = [
  { id: "select", icon: "⊹", label: "Select", shortcut: "V" },
  { id: "text", icon: "T", label: "Text", shortcut: "T" },
  { id: "shape", icon: "▢", label: "Shape", shortcut: "S" },
  { id: "move", icon: "✥", label: "Move", shortcut: "M" },
];

function TopToolbar() {
  const { t } = useTranslation();
  const zoom = useDesignerStore((s) => s.zoom);
  const activeTool = useDesignerStore((s) => s.activeTool);
  const undoStack = useDesignerStore((s) => s.undoStack);
  const redoStack = useDesignerStore((s) => s.redoStack);
  const setTool = (id: string) => useDesignerStore.setState({ activeTool: id, ...(id === "text" ? { creatingText: true } : {}) });
  const deleteSelected = () => { const s = useDesignerStore.getState(); if (s.selectedId) { pushUndo(); useDesignerStore.setState((st) => ({ elements: st.elements.filter((el) => el.id !== s.selectedId), selectedId: null })); } };

  return (
    <div className="flex items-center px-3 h-9 border-b shrink-0 ws-bg-card">
      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => (
          <button key={tool.id} onClick={() => tool.id === "delete" ? deleteSelected() : setTool(tool.id)}
            className={`ws-btn-icon group relative ${activeTool === tool.id ? "ws-btn-active" : ""}`}
            title={tool.label}>
            {tool.icon}
            <span className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity ws-badge bg-white/[0.05] text-muted-foreground">{tool.shortcut}</span>
          </button>
        ))}
        <div className="w-px h-5 mx-1 ws-bg-border" />
        <button onClick={undo} disabled={undoStack.length === 0} className="ws-btn-icon disabled:opacity-30" title="Undo (Ctrl+Z)">↩</button>
        <button onClick={redo} disabled={redoStack.length === 0} className="ws-btn-icon disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">↪</button>
        <div className="w-px h-5 mx-1 ws-bg-border" />
        <button onClick={deleteSelected} className="ws-btn-icon text-red-400" title="Delete selected (Delete)">✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center gap-1">
        {[0.5,0.75,1,1.25,1.5].map((z) => (
          <button key={z} onClick={() => useDesignerStore.setState({ zoom: z })}
            className={`px-2 py-1 rounded text-[9px] transition-all ${Math.abs(zoom - z) < 0.01 ? "ws-bg-selected text-white" : "text-muted-foreground"}`}>{Math.round(z * 100)}%</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => { pushUndo(); useDesignerStore.setState({ canvasWidth: 540, canvasHeight: 400, canvasBg: "#FFFFFF", elements: [], selectedId: null }); }}
          className="ws-btn-sm">Clear</button>
        <button onClick={() => {
          const svgEl = document.querySelector("[data-designer-canvas] svg") as SVGElement | null;
          if (!svgEl) return;
          const svgData = new XMLSerializer().serializeToString(svgEl);
          const blob = new Blob([svgData], { type: "image/svg+xml" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `design-${Date.now()}.svg`;
          link.click();
          URL.revokeObjectURL(link.href);
        }} className="ws-btn-primary text-[9px]">Export SVG</button>
      </div>
    </div>
  );
}

function LeftSidebar() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"templates"|"shapes"|"text"|"colors">("shapes");
  const addEl = useCallback((patch: Partial<CanvasElement>, type: CanvasElement["type"]) => {
    const state = useDesignerStore.getState();
    pushUndo();
    const newEl: CanvasElement = { id: `el-${Date.now()}`, type, x: 60 + Math.random() * 80, y: 60 + Math.random() * 80, width: type === "line" ? 100 : 100, height: type === "line" ? 4 : 100, fill: type === "line" ? "#C3002F" : "#C3002F", rotation: 0, opacity: 1, name: type, zIndex: state.elements.length, ...patch };
    useDesignerStore.setState((s) => ({ elements: [...s.elements, newEl], selectedId: newEl.id }));
  }, []);

  const tabs = [{id:"templates",label:"Templates"},{id:"shapes",label:"Shapes"},{id:"text",label:"Text"},{id:"colors",label:"Colors"}];

  return (
    <div className="w-[200px] border-r flex flex-col shrink-0 ws-bg-card ws-bd-border">
      <div className="flex border-b ws-bd-border">
        {tabs.map((t) => (<button key={t.id} onClick={() => setTab(t.id as any)} className="flex-1 py-2 text-[8px] tracking-wider uppercase transition-all ws-font-sora" style={{ color: tab === t.id ? "#FFFFFF" : "#A0A0A0", borderBottom: tab === t.id ? "2px solid #C3002F" : "2px solid transparent" }}>{t.label}</button>))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 ws-scrollbar">
        {tab === "templates" && (
          <div className="space-y-2">
            {[{label:"Instagram Post",w:1080,h:1080},{label:"Story",w:1080,h:1920},{label:"Thumbnail",w:1280,h:720},{label:"Logo",w:500,h:500},{label:"Presentation",w:1920,h:1080}].map((tmpl) => (
              <button key={tmpl.label} onClick={() => useDesignerStore.setState({ canvasWidth: tmpl.w, canvasHeight: tmpl.h })} className="w-full p-2.5 rounded-lg text-left flex items-center gap-2.5 ws-card-hover">
                <div className="w-8 h-8 rounded flex items-center justify-center text-[11px] ws-bg-muted">◻</div>
                <div><div className="text-[10px] font-medium ws-text-foreground">{tmpl.label}</div><div className="text-[8px] text-muted-foreground">{tmpl.w}x{tmpl.h}</div></div>
              </button>
            ))}
          </div>
        )}
        {tab === "shapes" && (
          <div className="grid grid-cols-3 gap-1.5">
            {[{type:"rect",preview:"□",label:"Rect"},{type:"circle",preview:"○",label:"Circle"},{type:"triangle",preview:"△",label:"Triangle"},{type:"star",preview:"★",label:"Star"},{type:"line",preview:"—",label:"Line"}].map((s) => (
              <button key={s.type} onClick={() => addEl({fill:"#C3002F",width:80,height:s.type==="line"?4:80,strokeWidth:s.type==="line"?3:undefined}, s.type as any)} className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1 ws-card-hover">
                <span className="text-[14px] ws-text-foreground">{s.preview}</span><span className="text-[7px] text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        )}
        {tab === "text" && (
          <div className="space-y-1.5">
            {[{label:"Heading",size:36,weight:"bold"},{label:"Subheading",size:24,weight:"600"},{label:"Body",size:14,weight:"normal"}].map((p) => (
              <button key={p.label} onClick={() => addEl({fill:"#374151",text:p.label,fontSize:p.size,bold:p.weight==="bold",width:200,height:p.size+10},"text")} className="w-full p-3 rounded-lg text-left ws-card-hover">
                <div className="font-medium truncate" style={{ fontSize: `${Math.min(p.size/3,14)}px`, color: "#FFFFFF", fontWeight: p.weight }}>{p.label}</div>
                <div className="text-[8px] mt-0.5 text-muted-foreground">{p.size}px</div>
              </button>
            ))}
            <div className="pt-2">
              <div className="text-[9px] uppercase mb-1 text-muted-foreground ws-font-sora">Icons</div>
              <div className="grid grid-cols-4 gap-1">
                {["♥","⚡","☀","✦","❖","✧","⬡","◈","◉","◆","●","★"].map((sym) => (
                  <button key={sym} onClick={() => addEl({fill:"#8B5CF6",width:40,height:40,text:sym,fontSize:24},"text")} className="aspect-square rounded-lg flex items-center justify-center text-[16px] ws-card-hover">{sym}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "colors" && (
          <div>
            <div className="text-[9px] uppercase mb-2 text-muted-foreground ws-font-sora">Solid Colors</div>
            <div className="grid grid-cols-4 gap-1.5">
              {solidColors.map((color) => (<button key={color} onClick={() => useDesignerStore.setState({ canvasBg: color })} className="aspect-square rounded-lg transition-all" style={{ background: color, border: `2px solid ${useDesignerStore.getState().canvasBg === color ? "#FFFFFF" : "transparent"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RightPanel() {
  const el = useDesignerStore((s) => s.selectedId ? s.elements.find((e) => e.id === s.selectedId) : null);
  if (!el) return (
    <div className="w-[180px] border-l shrink-0 flex items-center justify-center ws-bg-card ws-bd-border">
      <span className="text-[10px] text-muted-foreground">Select an element</span>
    </div>
  );

  const update = (patch: Partial<CanvasElement>) => { pushUndo(); useDesignerStore.setState((s) => ({ elements: s.elements.map((e) => e.id === el.id ? { ...e, ...patch } : e) })); };

  return (
    <div className="w-[180px] border-l shrink-0 overflow-y-auto p-3 space-y-3 ws-bg-card ws-bd-border ws-scrollbar">
      <div className="text-[10px] font-medium truncate ws-text-foreground">{el.name}</div>
      {el.type === "text" && (<>
        <WorkspaceSection title="Text">
          <WorkspaceInput value={el.text || ""} onChange={(val) => update({ text: val })} />
        </WorkspaceSection>
        <div>
          <label className="text-[8px] uppercase text-muted-foreground">Font Size</label>
          <div className="flex items-center gap-2">
            <input type="range" min={8} max={100} value={el.fontSize || 16} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="flex-1" />
            <span className="text-[9px] text-muted-foreground ws-font-mono">{el.fontSize}px</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => update({ bold: !el.bold })} className="ws-btn-sm" style={{ background: el.bold ? "#C3002F" : "#141414" }}>B</button>
          <button onClick={() => update({ italic: !el.italic })} className="ws-btn-sm italic" style={{ background: el.italic ? "#C3002F" : "#141414" }}>I</button>
          <button onClick={() => update({ underline: !el.underline })} className="ws-btn-sm underline" style={{ background: el.underline ? "#C3002F" : "#141414" }}>U</button>
        </div>
      </>)}
      <WorkspaceSection title="Fill">
        <input type="color" value={el.fill} onChange={(e) => update({ fill: e.target.value })} className="w-full h-6 rounded cursor-pointer" />
      </WorkspaceSection>
      <div className="grid grid-cols-2 gap-2">
        <WorkspaceSection title="X">
          <WorkspaceInput type="number" value={String(Math.round(el.x))} onChange={(val) => update({ x: Number(val) })} />
        </WorkspaceSection>
        <WorkspaceSection title="Y">
          <WorkspaceInput type="number" value={String(Math.round(el.y))} onChange={(val) => update({ y: Number(val) })} />
        </WorkspaceSection>
        <WorkspaceSection title="W">
          <WorkspaceInput type="number" value={String(Math.round(el.width))} onChange={(val) => update({ width: Number(val) })} />
        </WorkspaceSection>
        <WorkspaceSection title="H">
          <WorkspaceInput type="number" value={String(Math.round(el.height))} onChange={(val) => update({ height: Number(val) })} />
        </WorkspaceSection>
      </div>
      <div>
        <label className="text-[8px] uppercase text-muted-foreground">Rotation</label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={360} value={el.rotation} onChange={(e) => update({ rotation: Number(e.target.value) })} className="flex-1" />
          <span className="text-[9px] text-muted-foreground ws-font-mono">{el.rotation}°</span>
        </div>
      </div>
      <div>
        <label className="text-[8px] uppercase text-muted-foreground">Opacity</label>
        <div className="flex items-center gap-2">
          <input type="range" min={0.1} max={1} step={0.1} value={el.opacity} onChange={(e) => update({ opacity: Number(e.target.value) })} className="flex-1" />
          <span className="text-[9px] text-muted-foreground ws-font-mono">{Math.round(el.opacity * 100)}%</span>
        </div>
      </div>
      <div className="pt-2 border-t ws-bd-border">
        <div className="flex gap-1">
          <button onClick={() => { pushUndo(); const els = useDesignerStore.getState().elements; const idx = els.findIndex((e) => e.id === el.id); if (idx < els.length - 1) { const newEls = [...els]; [newEls[idx], newEls[idx+1]] = [newEls[idx+1], newEls[idx]]; useDesignerStore.setState({ elements: newEls }); }}} className="flex-1 ws-btn-sm">↑ Front</button>
          <button onClick={() => { pushUndo(); const els = useDesignerStore.getState().elements; const idx = els.findIndex((e) => e.id === el.id); if (idx > 0) { const newEls = [...els]; [newEls[idx], newEls[idx-1]] = [newEls[idx-1], newEls[idx]]; useDesignerStore.setState({ elements: newEls }); }}} className="flex-1 ws-btn-sm">↓ Back</button>
        </div>
      </div>
    </div>
  );
}

function CanvasArea() {
  const elements = useDesignerStore((s) => s.elements);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const canvasWidth = useDesignerStore((s) => s.canvasWidth);
  const canvasHeight = useDesignerStore((s) => s.canvasHeight);
  const canvasBg = useDesignerStore((s) => s.canvasBg);
  const zoom = useDesignerStore((s) => s.zoom);
  const activeTool = useDesignerStore((s) => s.activeTool);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elX: 0, elY: 0 });
  const [resizeInfo, setResizeInfo] = useState<{ id: string; handle: string; startX: number; startY: number; elX: number; elY: number; elW: number; elH: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const svgRect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mx = (e.clientX - svgRect.left) / zoom, my = (e.clientY - svgRect.top) / zoom;
    const state = useDesignerStore.getState();
    if (activeTool === "text") {
      pushUndo();
      const newEl: CanvasElement = { id: `el-${Date.now()}`, type: "text", x: mx, y: my, width: 200, height: 30, fill: "#374151", text: "Double-click to edit", fontSize: 16, rotation: 0, opacity: 1, name: "Text", zIndex: state.elements.length };
      useDesignerStore.setState({ elements: [...state.elements, newEl], selectedId: newEl.id, activeTool: "select" });
      return;
    }
    const clickedEl = [...state.elements].reverse().find((el) => mx >= el.x && mx <= el.x + el.width && my >= el.y && my <= el.y + el.height);
    if (clickedEl) { useDesignerStore.setState({ selectedId: clickedEl.id }); setDragId(clickedEl.id); setDragStart({ x: mx, y: my, elX: clickedEl.x, elY: clickedEl.y }); }
    else useDesignerStore.setState({ selectedId: null });
  }, [activeTool, zoom]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const svgRect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mx = (e.clientX - svgRect.left) / zoom, my = (e.clientY - svgRect.top) / zoom;
    if (resizeInfo) {
      const dh = resizeInfo.handle;
      const dx = mx - resizeInfo.startX, dy = my - resizeInfo.startY;
      let nx = resizeInfo.elX, ny = resizeInfo.elY, nw = resizeInfo.elW, nh = resizeInfo.elH;
      if (dh.includes("e")) nw = Math.max(20, resizeInfo.elW + dx);
      if (dh.includes("w")) { nw = Math.max(20, resizeInfo.elW - dx); nx = resizeInfo.elX + dx; }
      if (dh.includes("s")) nh = Math.max(20, resizeInfo.elH + dy);
      if (dh.includes("n")) { nh = Math.max(20, resizeInfo.elH - dy); ny = resizeInfo.elY + dy; }
      useDesignerStore.setState((s) => ({ elements: s.elements.map((el) => el.id === resizeInfo.id ? { ...el, x: nx, y: ny, width: nw, height: nh } : el) }));
      return;
    }
    if (dragId) {
      const dx = mx - dragStart.x, dy = my - dragStart.y;
      useDesignerStore.setState((s) => ({ elements: s.elements.map((el) => el.id === dragId ? { ...el, x: dragStart.elX + dx, y: dragStart.elY + dy } : el) }));
    }
  }, [dragId, dragStart, resizeInfo, zoom]);

  const handlePointerUp = useCallback(() => { if (dragId || resizeInfo) { pushUndo(); setDragId(null); setResizeInfo(null); } }, [dragId, resizeInfo]);

  const handleResizeStart = useCallback((e: React.PointerEvent, handle: HandlePos, el: CanvasElement) => {
    e.stopPropagation(); e.preventDefault();
    const svgRect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mx = (e.clientX - svgRect.left) / zoom, my = (e.clientY - svgRect.top) / zoom;
    setResizeInfo({ id: el.id, handle, startX: mx, startY: my, elX: el.x, elY: el.y, elW: el.width, elH: el.height });
  }, [zoom]);

  const selEl = selectedId ? elements.find((e) => e.id === selectedId) : null;

  if (elements.length === 0 && !selEl) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-auto ws-bg-canvas">
        <WorkspaceCard className="text-center max-w-xs">
          <WorkspaceEmptyState icon="🎨" message="Blank Canvas — click a shape or text preset in the left panel to start designing" />
        </WorkspaceCard>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto ws-bg-canvas">
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
        <svg width={canvasWidth} height={canvasHeight} data-designer-canvas
          style={{ background: canvasBg, borderRadius: 4, boxShadow: "0 2px 20px rgba(0,0,0,0.3)", cursor: activeTool === "text" ? "crosshair" : "default" }}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
            <g key={el.id}>
              <ShapeSVG el={el} />
              {selEl?.id === el.id && <SelectionOverlay el={el} onResizeStart={(e, h) => handleResizeStart(e, h, el)} />}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function BottomBar() {
  const elements = useDesignerStore((s) => s.elements);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const canvasWidth = useDesignerStore((s) => s.canvasWidth);
  const canvasHeight = useDesignerStore((s) => s.canvasHeight);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t shrink-0 text-[9px] ws-bg-card ws-bd-border text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{elements.length} elements</span>
        {selectedId && <span>Selected: 1</span>}
      </div>
      <div className="flex items-center gap-3">
        <span>{canvasWidth} × {canvasHeight}</span>
        <span style={{ color: "#C3002F" }}>Canvas</span>
      </div>
    </div>
  );
}

export function DesignerCanvasTab({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const s = useDesignerStore.getState();
        if (s.selectedId) {
          pushUndo();
          useDesignerStore.setState((st) => ({ elements: st.elements.filter((el) => el.id !== s.selectedId), selectedId: null }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      const toolMap: Record<string, string> = { v: "select", t: "text", s: "shape", m: "move" };
      const tool = toolMap[e.key.toLowerCase()];
      if (tool) { e.preventDefault(); useDesignerStore.setState({ activeTool: tool }); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
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

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDesignerStore, type UIComponent } from "./designer-actions";
import { WorkspaceButton } from "../../components/WorkspaceButton";
import { WorkspaceCard } from "../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../components/WorkspaceEmptyState";
import { WorkspaceBadge } from "../../components/WorkspaceBadge";
import { WorkspaceInput } from "../../components/WorkspaceInput";
import { WorkspaceSection } from "../../components/WorkspaceSection";

interface FramePreset { label: string; w: number; h: number; icon: string; }
const FRAMES: FramePreset[] = [
  { label: "iPhone 15", w: 390, h: 844, icon: "📱" },
  { label: "iPhone SE", w: 375, h: 667, icon: "📱" },
  { label: "iPad Air", w: 820, h: 1180, icon: "📟" },
  { label: "Desktop HD", w: 1440, h: 900, icon: "🖥" },
  { label: "Desktop", w: 1280, h: 800, icon: "🖥" },
  { label: "A4", w: 595, h: 842, icon: "📄" },
];

const UI_LIBRARY: Array<{ type: string; label: string; w: number; h: number; defaultProps: Record<string, any>; preview: string }> = [
  { type: "button", label: "Button", w: 120, h: 40, defaultProps: { text: "Button", variant: "primary", borderRadius: 8 }, preview: "▣" },
  { type: "input", label: "Input", w: 240, h: 40, defaultProps: { text: "Placeholder", variant: "outlined", borderRadius: 6 }, preview: "▭" },
  { type: "card", label: "Card", w: 280, h: 200, defaultProps: { text: "Card Title", subtitle: "Card description here", borderRadius: 12 }, preview: "▢" },
  { type: "navbar", label: "Navbar", w: 600, h: 60, defaultProps: { text: "Logo | Link 1 | Link 2 | Link 3" }, preview: "≡" },
  { type: "heading", label: "Heading", w: 300, h: 48, defaultProps: { text: "Heading Text", fontSize: 32, fontWeight: "bold" }, preview: "H" },
  { type: "paragraph", label: "Paragraph", w: 400, h: 80, defaultProps: { text: "Lorem ipsum dolor sit amet consectetur adipiscing elit. Sed do eiusmod tempor.", fontSize: 16 }, preview: "¶" },
  { type: "image-frame", label: "Image", w: 200, h: 200, defaultProps: { text: "Image placeholder", borderRadius: 8, bgColor: "#F3F4F6" }, preview: "🖼" },
  { type: "divider", label: "Divider", w: 400, h: 2, defaultProps: { color: "#E5E7EB" }, preview: "—" },
  { type: "icon", label: "Icon", w: 32, h: 32, defaultProps: { icon: "star", color: "#F59E0B" }, preview: "★" },
  { type: "badge", label: "Badge", w: 80, h: 24, defaultProps: { text: "New", variant: "primary", borderRadius: 12 }, preview: "⬟" },
  { type: "avatar", label: "Avatar", w: 48, h: 48, defaultProps: { text: "U", borderRadius: 24, bgColor: "#8B5CF6" }, preview: "◎" },
  { type: "progress", label: "Progress", w: 300, h: 8, defaultProps: { progress: 60, color: "#2D7FF9", borderRadius: 4 }, preview: "▬" },
  { type: "toggle", label: "Toggle", w: 44, h: 24, defaultProps: { active: true }, preview: "◉" },
  { type: "chip", label: "Chip", w: 96, h: 32, defaultProps: { text: "Tag", borderRadius: 16 }, preview: "⏺" },
  { type: "table", label: "Table Row", w: 600, h: 40, defaultProps: { text: "Row 1 | Value | Status" }, preview: "⊞" },
];

function renderUISVG(comp: UIComponent) {
  const p = comp.props;
  const x = comp.x, y = comp.y, w = comp.width, h = comp.height;
  switch (comp.type) {
    case "button":
      return <rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 6} fill={p.variant === "primary" ? "#2D7FF9" : p.variant === "secondary" ? "#6B7280" : "transparent"} stroke={p.variant === "outlined" ? "#2D7FF9" : "none"} strokeWidth={1} />;
    case "input":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 6} fill="transparent" stroke="#D1D5DB" strokeWidth={1} /><text x={x + 12} y={y + h / 2 + 4} fill="#9CA3AF" fontSize={12} fontFamily="sans-serif">{p.text}</text></>;
    case "card":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 12} fill="#FFFFFF" stroke="#E5E7EB" strokeWidth={1} /><text x={x + 16} y={y + 28} fill="#1F2937" fontSize={14} fontWeight="bold" fontFamily="sans-serif">{p.text}</text><text x={x + 16} y={y + 48} fill="#6B7280" fontSize={11} fontFamily="sans-serif">{p.subtitle}</text></>;
    case "navbar":
      return <><rect x={x} y={y} width={w} height={h} rx={0} fill="#FFFFFF" stroke="#E5E7EB" strokeWidth={1} /><text x={x + 16} y={y + h / 2 + 4} fill="#1F2937" fontSize={12} fontFamily="sans-serif">{p.text}</text><rect x={x + w - 40} y={y + 18} width={24} height={24} rx={12} fill="#F3F4F6" /></>;
    case "heading":
      return <text x={x} y={y + (p.fontSize || 32)} fill="#111827" fontSize={p.fontSize || 32} fontWeight="bold" fontFamily="sans-serif">{p.text}</text>;
    case "paragraph":
      return <text x={x} y={y + 14} fill="#4B5563" fontSize={p.fontSize || 14} fontFamily="sans-serif"><tspan x={x} dy={0}>{(p.text || "").split(" ").slice(0, 6).join(" ")}</tspan><tspan x={x} dy={16}>{(p.text || "").split(" ").slice(6, 12).join(" ")}</tspan></text>;
    case "image-frame":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 8} fill={p.bgColor || "#F3F4F6"} /><text x={x + w / 2 - 30} y={y + h / 2 + 4} fill="#9CA3AF" fontSize={11} fontFamily="sans-serif">🖼 Image</text></>;
    case "divider":
      return <line x1={x} y1={y} x2={x + w} y2={y} stroke={p.color || "#E5E7EB"} strokeWidth={1} />;
    case "icon":
      return <text x={x} y={y + h - 4} fill={p.color || "#F59E0B"} fontSize={20}>{p.icon === "star" ? "★" : p.icon === "heart" ? "♥" : "✦"}</text>;
    case "badge":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 12} fill={p.variant === "primary" ? "#2D7FF9" : "#10B981"} /><text x={x + w / 2} y={y + h / 2 + 3} fill="#FFF" fontSize={9} textAnchor="middle" fontFamily="sans-serif">{p.text}</text></>;
    case "avatar":
      return <><circle cx={x + w / 2} cy={y + h / 2} r={w / 2} fill={p.bgColor || "#8B5CF6"} /><text x={x + w / 2} y={y + h / 2 + 4} fill="#FFF" fontSize={14} textAnchor="middle" fontWeight="bold">{p.text}</text></>;
    case "progress":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 4} fill="#E5E7EB" /><rect x={x} y={y} width={w * ((p.progress || 60) / 100)} height={h} rx={p.borderRadius || 4} fill={p.color || "#2D7FF9"} /></>;
    case "toggle":
      return <><rect x={x} y={y} width={w} height={h} rx={h / 2} fill={p.active ? "#2D7FF9" : "#D1D5DB"} /><circle cx={p.active ? x + w - h / 2 : x + h / 2} cy={y + h / 2} r={h / 2 - 2} fill="#FFF" /></>;
    case "chip":
      return <><rect x={x} y={y} width={w} height={h} rx={p.borderRadius || 16} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={1} /><text x={x + w / 2} y={y + h / 2 + 3} fill="#374151" fontSize={9} textAnchor="middle" fontFamily="sans-serif">{p.text}</text></>;
    case "table":
      return <><rect x={x} y={y} width={w} height={h} fill="#FFF" stroke="#E5E7EB" strokeWidth={1} /><text x={x + 12} y={y + h / 2 + 3} fill="#374151" fontSize={10} fontFamily="sans-serif">{p.text}</text></>;
    default:
      return <rect x={x} y={y} width={w} height={h} rx={6} fill="#2D7FF9" opacity={0.3} />;
  }
}

function FigmaCanvas({ frame }: { frame: FramePreset }) {
  const components = useDesignerStore((s) => s.figmaComponents);
  const selectedId = useDesignerStore((s) => s.figmaSelectedId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cx: 0, cy: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const state = useDesignerStore.getState();
    const clicked = [...state.figmaComponents].reverse().find((c) => mx >= c.x && mx <= c.x + c.width && my >= c.y && my <= c.y + c.height);
    if (clicked) { useDesignerStore.setState({ figmaSelectedId: clicked.id }); setDragId(clicked.id); setDragStart({ x: mx, y: my, cx: clicked.x, cy: clicked.y }); }
    else useDesignerStore.setState({ figmaSelectedId: null });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const dx = mx - dragStart.x, dy = my - dragStart.y;
    useDesignerStore.setState((s) => ({ figmaComponents: s.figmaComponents.map((c) => c.id === dragId ? { ...c, x: dragStart.cx + dx, y: dragStart.cy + dy } : c) }));
  }, [dragId, dragStart]);

  const handlePointerUp = useCallback(() => setDragId(null), []);

  if (components.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-auto p-4 ws-bg-canvas">
        <div className="relative" style={{ width: frame.w, height: frame.h, background: "#FFFFFF", borderRadius: frame.label.includes("iPhone") ? 32 : 0, boxShadow: "0 4px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>
          <div className="flex items-center justify-center h-full">
            <WorkspaceEmptyState icon="📐" message="Empty Frame — add components from the sidebar to build your UI" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-4 ws-bg-canvas">
      <div className="relative" style={{ width: frame.w, height: frame.h, background: "#FFFFFF", borderRadius: frame.label.includes("iPhone") ? 32 : 0, boxShadow: "0 4px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        {frame.label.includes("iPhone") && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-50" />
        )}
        {components.map((comp) => (
          <g key={comp.id} style={{ cursor: "pointer" }}>
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {renderUISVG(comp)}
            </svg>
            {selectedId === comp.id && (
              <div style={{ position: "absolute", top: comp.y - 2, left: comp.x - 2, width: comp.width + 4, height: comp.height + 4, border: "2px solid #2D7FF9", borderRadius: 4, pointerEvents: "none" }} />
            )}
            <div style={{ position: "absolute", top: comp.y - 16, left: comp.x, fontSize: 8, color: "#2D7FF9", fontFamily: "'JetBrains Mono', monospace", background: "#FFF", padding: "0 4px", borderRadius: 2, pointerEvents: "none", opacity: selectedId === comp.id ? 1 : 0 }}>
              {comp.type} {comp.props.text ? `"${String(comp.props.text).slice(0, 15)}"` : ""}
            </div>
          </g>
        ))}
      </div>
    </div>
  );
}

function FigmaSidebar({ frame, onFrameChange: setFrame }: { frame: FramePreset; onFrameChange: (f: FramePreset) => void }) {
  const components = useDesignerStore((s) => s.figmaComponents);
  const selectedId = useDesignerStore((s) => s.figmaSelectedId);
  const [activeTab, setActiveTab] = useState<"components" | "layers" | "properties">("components");

  const addComponent = useCallback((libItem: typeof UI_LIBRARY[0]) => {
    const state = useDesignerStore.getState();
    const comp: UIComponent = { id: `fig-${Date.now()}`, type: libItem.type, x: 50 + Math.random() * 30, y: 80 + Math.random() * 50, width: libItem.w, height: libItem.h, props: { ...libItem.defaultProps } };
    useDesignerStore.setState((s) => ({ figmaComponents: [...s.figmaComponents, comp], figmaSelectedId: comp.id }));
  }, []);

  const selComp = selectedId ? components.find((c) => c.id === selectedId) : null;

  return (
    <div className="w-[220px] border-l flex flex-col shrink-0 ws-bg-card ws-bd-border">
      <div className="flex border-b ws-bd-border">
        {[{id:"components",label:"Components"},{id:"layers",label:"Layers"},{id:"properties",label:"Props"}].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className="flex-1 py-2 text-[8px] tracking-wider uppercase transition-all ws-font-sora" style={{ color: activeTab === t.id ? "var(--foreground)" : "var(--muted-foreground)", borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent" }}>{t.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 ws-scrollbar">
        {activeTab === "components" && (
          <div className="grid grid-cols-2 gap-1.5">
            {UI_LIBRARY.map((item) => (
              <button key={item.type} onClick={() => addComponent(item)} className="p-2 rounded-lg text-left transition-all ws-card-hover">
                <div className="text-[14px] mb-1">{item.preview}</div>
                <div className="text-[9px] font-medium truncate ws-text-foreground">{item.label}</div>
              </button>
            ))}
          </div>
        )}
        {activeTab === "layers" && (
          <div className="space-y-0.5">
            {components.length === 0 && <p className="text-[10px] text-center py-4 text-muted-foreground">No components yet</p>}
            {components.map((c) => (
              <button key={c.id} onClick={() => useDesignerStore.setState({ figmaSelectedId: c.id })} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] text-left" style={{ background: selectedId === c.id ? "rgba(45,127,249,0.1)" : "transparent", color: selectedId === c.id ? "var(--foreground)" : "var(--muted-foreground)" }}>
                <span>▣</span>
                <span className="truncate flex-1">{c.type} {c.props.text ? `"${String(c.props.text).slice(0, 10)}"` : ""}</span>
                <span className="text-[8px] opacity-50 ws-font-mono">{(c.width)}×{(c.height)}</span>
              </button>
            ))}
          </div>
        )}
        {activeTab === "properties" && selComp && (
          <div className="space-y-2">
            <div className="text-[10px] font-medium ws-text-foreground">{selComp.type}</div>
            {Object.entries(selComp.props).map(([key, val]) => {
              if (typeof val === "boolean") return (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{key}</span>
                  <button onClick={() => { useDesignerStore.setState((s) => ({ figmaComponents: s.figmaComponents.map((c) => c.id === selComp.id ? { ...c, props: { ...c.props, [key]: !val } } : c) })); }} className="px-2 py-0.5 rounded text-[9px]" style={{ background: val ? "var(--accent)" : "var(--card)", color: "#FFF" }}>{String(val)}</button>
                </div>
              );
              if (typeof val === "number") return (
                <WorkspaceSection key={key} title={key}>
                  <WorkspaceInput type="number" value={String(val)} onChange={(nv) => { useDesignerStore.setState((s) => ({ figmaComponents: s.figmaComponents.map((c) => c.id === selComp.id ? { ...c, props: { ...c.props, [key]: Number(nv) } } : c) })); }} />
                </WorkspaceSection>
              );
              return (
                <WorkspaceSection key={key} title={key}>
                  <WorkspaceInput value={String(val)} onChange={(nv) => { useDesignerStore.setState((s) => ({ figmaComponents: s.figmaComponents.map((c) => c.id === selComp.id ? { ...c, props: { ...c.props, [key]: nv } } : c) })); }} />
                </WorkspaceSection>
              );
            })}
            <div className="pt-2 border-t ws-bd-border">
              <button onClick={() => { const s = useDesignerStore.getState(); useDesignerStore.setState({ figmaComponents: s.figmaComponents.filter((c) => c.id !== selectedId), figmaSelectedId: null }); }} className="w-full px-3 py-1.5 rounded text-[9px]" style={{ background: "#EF4444", color: "#FFF" }}>Delete</button>
            </div>
          </div>
        )}
        {activeTab === "properties" && !selComp && <p className="text-[10px] text-center py-4 text-muted-foreground">Select a component</p>}
      </div>
      <div className="p-2 border-t space-y-1 ws-bd-border">
        <div className="text-[8px] uppercase text-muted-foreground">Frame</div>
        <div className="grid grid-cols-2 gap-1">
          {FRAMES.map((f) => (
            <button key={f.label} onClick={() => setFrame(f)} className="px-1.5 py-1 rounded text-[8px] text-left truncate" style={{ background: frame.label === f.label ? "var(--accent)" : "var(--card)", color: "#FFF" }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesignerFigmaTab({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const [frame, setFrame] = useState<FramePreset>(FRAMES[0]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const s = useDesignerStore.getState();
        if (s.figmaSelectedId) {
          useDesignerStore.setState({ figmaComponents: s.figmaComponents.filter((c) => c.id !== s.figmaSelectedId), figmaSelectedId: null });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 h-8 border-b shrink-0 justify-between ws-bg-card ws-bd-border">
        <span className="text-[9px] tracking-wider uppercase ws-font-sora text-muted-foreground">UI/UX Design — Figma Studio</span>
        <div className="flex gap-1.5">
          <button onClick={() => {
            const comps = useDesignerStore.getState().figmaComponents;
            let html = "<!DOCTYPE html><html><head><style>body{font-family:sans-serif;padding:20px}</style></head><body>";
            comps.forEach((c) => { html += `<!-- ${c.type} -->\n`; });
            html += "</body></html>";
            const blob = new Blob([html], { type: "text/html" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "ui-design.html";
            link.click();
          }} className="ws-btn-sm">Export HTML</button>
          <button onClick={() => useDesignerStore.setState({ figmaComponents: [], figmaSelectedId: null })} className="px-2.5 py-1 rounded text-[9px]" style={{ background: "rgba(239,68,68,0.2)", color: "#EF4444" }}>Clear</button>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <FigmaCanvas frame={frame} />
        <FigmaSidebar frame={frame} onFrameChange={setFrame} />
      </div>
    </div>
  );
}

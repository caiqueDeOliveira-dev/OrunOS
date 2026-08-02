import { useState, useCallback, useRef, useEffect } from "react";
import { WorkspaceCard } from "../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../components/WorkspaceEmptyState";
import { WorkspaceBadge } from "../../components/WorkspaceBadge";
import { WorkspaceInput } from "../../components/WorkspaceInput";
import { WorkspaceSection } from "../../components/WorkspaceSection";

interface SceneObject {
  id: string; type: "box" | "sphere" | "torus" | "cylinder" | "cone" | "plane" | "ring" | "knot";
  label: string; color: string; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number];
}

const PRIMITIVES = [
  { type: "box" as const, label: "Box", icon: "▣" },
  { type: "sphere" as const, label: "Sphere", icon: "◉" },
  { type: "cylinder" as const, label: "Cylinder", icon: "⬡" },
  { type: "cone" as const, label: "Cone", icon: "△" },
  { type: "torus" as const, label: "Torus", icon: "◌" },
  { type: "plane" as const, label: "Plane", icon: "▭" },
  { type: "ring" as const, label: "Ring", icon: "○" },
  { type: "knot" as const, label: "Knot", icon: "❋" },
];

const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#FFFFFF"];

function PrimitiveSVG({ obj }: { obj: SceneObject }) {
  const size = 60;
  const cx = 25, cy = 25;
  const color = obj.color;
  switch (obj.type) {
    case "box":
      return <><rect x={cx - size/2} y={cy - size/2} width={size} height={size} rx={4} fill={color} /><rect x={cx - size/2 + 8} y={cy - size/2 - 4} width={size} height={size} rx={4} fill={color} opacity={0.4} /><line x1={cx - size/2} y1={cy + size/2} x2={cx - size/2 + 8} y2={cy + size/2 - 4} stroke={color} strokeWidth={1} /><line x1={cx + size/2} y1={cy + size/2} x2={cx + size/2 + 8} y2={cy + size/2 - 4} stroke={color} strokeWidth={1} /><line x1={cx + size/2} y1={cy - size/2} x2={cx + size/2 + 8} y2={cy - size/2 - 4} stroke={color} strokeWidth={1} /></>;
    case "sphere":
      return <circle cx={cx} cy={cy} r={size/2} fill={color} />;
    case "cylinder":
      return <><ellipse cx={cx} cy={cy - 16} rx={size/2} ry={10} fill={color} /><rect x={cx - size/2} y={cy - 16} width={size} height={32} fill={color} /><ellipse cx={cx} cy={cy + 16} rx={size/2} ry={10} fill={color} /></>;
    case "cone":
      return <polygon points={`${cx},${cy - size/2} ${cx - size/2},${cy + size/2} ${cx + size/2},${cy + size/2}`} fill={color} />;
    case "torus":
      return <circle cx={cx} cy={cy} r={size/2} fill="none" stroke={color} strokeWidth={6} />;
    case "plane":
      return <rect x={cx - size/2} y={cy - size/2} width={size} height={size} fill={color} opacity={0.5} />;
    case "ring":
      return <><circle cx={cx} cy={cy} r={size/2} fill="none" stroke={color} strokeWidth={8} /><circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth={8} /></>;
    case "knot":
      return <text x={cx} y={cy + 8} textAnchor="middle" fill={color} fontSize={28}>❋</text>;
    default:
      return <rect x={cx - size/2} y={cy - size/2} width={size} height={size} fill={color} />;
  }
}

export function DesignerThreeDTab({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [tripoPrompt, setTripoPrompt] = useState("");
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [orbitElevation, setOrbitElevation] = useState(30);
  const [isAnimating, setIsAnimating] = useState(true);
  const animRef = useRef<number>(0);

  const animate = useCallback(() => {
    setOrbitAngle((prev) => (prev + 0.5) % 360);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isAnimating) {
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [animate, isAnimating]);

  const addObject = useCallback((type: SceneObject["type"]) => {
    const id = `obj-${Date.now()}`;
    const newObj: SceneObject = {
      id, type, label: type,
      color: selectedColor,
      position: [Math.random() * 4 - 2, Math.random() * 2, Math.random() * 4 - 2],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedId(id);
  }, [selectedColor]);

  const selObj = selectedId ? objects.find((o) => o.id === selectedId) : null;

  const updateObj = useCallback((id: string, patch: Partial<SceneObject>) => {
    setObjects((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
  }, []);

  const deleteObj = useCallback((id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId((prev) => prev === id ? null : prev);
  }, []);

  const project3D = (x: number, y: number, z: number): [number, number, number] => {
    const angle = (orbitAngle * Math.PI) / 180;
    const elev = (orbitElevation * Math.PI) / 180;
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const cosE = Math.cos(elev), sinE = Math.sin(elev);
    const rx = x * cosA - z * sinA;
    const ry = y * cosE + (x * sinA + z * cosA) * sinE;
    const rz = (x * sinA + z * cosA) * cosE - y * sinE;
    const scale = 200 / (4 + rz);
    return [150 + rx * scale, 150 - ry * scale, scale];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 h-8 border-b shrink-0 justify-between ws-bg-card ws-bd-border">
        <span className="text-[9px] tracking-wider uppercase ws-font-sora text-muted-foreground">3D Studio — Modeler</span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-muted-foreground">{objects.length} objects</span>
          <button onClick={() => setIsAnimating((v) => !v)} className="ws-btn-sm text-[9px]" style={{ background: isAnimating ? "var(--accent)" : "var(--card)" }}>
            {isAnimating ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setObjects([]); setSelectedId(null); }} className="px-2 py-1 rounded text-[9px]" style={{ background: "rgba(239,68,68,0.2)", color: "#EF4444" }}>Clear Scene</button>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-[160px] border-r p-2 space-y-1.5 overflow-y-auto shrink-0 ws-bg-card ws-bd-border ws-scrollbar">
          <div className="text-[8px] uppercase tracking-wider mb-1.5 text-muted-foreground ws-font-sora">Primitives</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRIMITIVES.map((p) => (
              <button key={p.type} onClick={() => addObject(p.type)} className="p-2 rounded-lg text-center transition-all ws-card-hover">
                <div className="text-[16px] mb-0.5" style={{ color: selectedColor }}>{p.icon}</div>
                <div className="text-[7px] truncate ws-text-foreground">{p.label}</div>
              </button>
            ))}
          </div>
          <div className="pt-2 border-t ws-bd-border">
            <div className="text-[8px] uppercase tracking-wider mb-1 text-muted-foreground ws-font-sora">Color</div>
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => { setSelectedColor(c); if (selectedId) updateObj(selectedId, { color: c }); }} className="aspect-square rounded-lg" style={{ background: c, border: selectedColor === c ? "2px solid var(--foreground)" : "2px solid transparent", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              ))}
            </div>
          </div>
          <div className="pt-2 border-t ws-bd-border">
            <div className="text-[8px] uppercase tracking-wider mb-1 text-muted-foreground ws-font-sora">Camera</div>
            <div><label className="text-[7px] text-muted-foreground">Rotation</label><input type="range" min={0} max={360} value={orbitAngle} onChange={(e) => setOrbitAngle(Number(e.target.value))} className="w-full" /></div>
            <div><label className="text-[7px] text-muted-foreground">Elevation</label><input type="range" min={0} max={90} value={orbitElevation} onChange={(e) => setOrbitElevation(Number(e.target.value))} className="w-full" /></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #0F0F1A 100%)" }}>
          {objects.length === 0 ? (
            <WorkspaceCard className="text-center max-w-xs" style={{ background: "rgba(15,15,26,0.8)" }}>
              <WorkspaceEmptyState icon="🧊" message="Empty Scene — click a primitive from the left panel to add 3D objects" />
            </WorkspaceCard>
          ) : (
            <svg width="300" height="300" viewBox="0 0 300 300">
              <defs>
                <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(59,130,246,0.1)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                </radialGradient>
              </defs>
              <rect width="300" height="300" fill="url(#gridGlow)" />
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`gx-${i}`} x1={i * 30} y1={0} x2={i * 30} y2={300} stroke="rgba(59,130,246,0.06)" strokeWidth={0.5} />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line key={`gy-${i}`} x1={0} y1={i * 30} x2={300} y2={i * 30} stroke="rgba(59,130,246,0.06)" strokeWidth={0.5} />
              ))}
              {objects.map((obj) => {
                const [px, py, s] = project3D(obj.position[0] * 30, obj.position[1] * 30, obj.position[2] * 30);
                const isSelected = obj.id === selectedId;
                return (
                  <g key={obj.id} onClick={() => setSelectedId(obj.id)} style={{ cursor: "pointer" }}>
                    <g transform={`translate(${px}, ${py}) scale(${s * 0.3})`}>
                      <PrimitiveSVG obj={obj} />
                    </g>
                    {isSelected && <circle cx={px} cy={py} r={s * 18 + 4} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3,2" />}
                  </g>
                );
              })}
              <line x1={150} y1={150} x2={180} y2={145} stroke="#EF4444" strokeWidth={1.5} />
              <line x1={150} y1={150} x2={150} y2={120} stroke="#10B981" strokeWidth={1.5} />
              <line x1={150} y1={150} x2={175} y2={170} stroke="#3B82F6" strokeWidth={1.5} />
              <text x={182} y={147} fill="#EF4444" fontSize={7}>X</text>
              <text x={148} y={116} fill="#10B981" fontSize={7}>Y</text>
              <text x={177} y={174} fill="#3B82F6" fontSize={7}>Z</text>
            </svg>
          )}
        </div>
        <div className="w-[200px] border-l p-3 space-y-2 overflow-y-auto shrink-0 ws-bg-card ws-bd-border ws-scrollbar">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium ws-text-foreground">Scene Objects</span>
          </div>
          {objects.length === 0 && (
            <p className="text-[9px] text-center py-4 text-muted-foreground">Click a primitive to add</p>
          )}
          {objects.map((obj) => (
            <div key={obj.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px] cursor-pointer"
              style={{ background: obj.id === selectedId ? "rgba(59,130,246,0.1)" : "transparent", color: obj.id === selectedId ? "var(--foreground)" : "var(--muted-foreground)" }}
              onClick={() => setSelectedId(obj.id)}>
              <span className="w-3 h-3 rounded shrink-0" style={{ background: obj.color }} />
              <span className="flex-1 truncate">{obj.label}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteObj(obj.id); }} className="text-[8px] opacity-50 hover:opacity-100">✕</button>
            </div>
          ))}
          {selObj && (
            <div className="pt-2 border-t space-y-2 ws-bd-border">
              <div className="text-[8px] uppercase tracking-wider text-muted-foreground ws-font-sora">Properties</div>
              {(["x","y","z"] as const).map((axis, i) => (
                <div key={axis}>
                  <label className="text-[8px] text-muted-foreground">{axis.toUpperCase()}</label>
                  <input type="range" min={-5} max={5} step={0.1} value={selObj.position[i]}
                    onChange={(e) => {
                      const newPos: [number, number, number] = [...selObj.position];
                      newPos[i] = Number(e.target.value);
                      updateObj(selObj.id, { position: newPos });
                    }}
                    className="w-full" />
                </div>
              ))}
              <div>
                <label className="text-[8px] text-muted-foreground">Color</label>
                <input type="color" value={selObj.color} onChange={(e) => updateObj(selObj.id, { color: e.target.value })} className="w-full h-6 rounded cursor-pointer" />
              </div>
            </div>
          )}
          <div className="pt-3 border-t ws-bd-border">
            <div className="text-[8px] uppercase tracking-wider mb-1 text-muted-foreground ws-font-sora">Tripo AI</div>
            <div className="flex gap-1">
              <input value={tripoPrompt} onChange={(e) => setTripoPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tripoPrompt.trim()) { onSendMessage(`Generate a 3D model: ${tripoPrompt.trim()}`); setTripoPrompt(""); } }} placeholder="Describe a 3D model..." className="flex-1 px-2 py-1.5 rounded text-[9px]" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
              <button onClick={() => { if (tripoPrompt.trim()) { onSendMessage(`Generate a 3D model: ${tripoPrompt.trim()}`); setTripoPrompt(""); } }} className="px-2 py-1 rounded text-[9px]" style={{ background: "#8B5CF6", color: "#FFF" }}>Go</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

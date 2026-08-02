import { useState, useCallback, useRef } from "react";
import { useDesignerStore } from "./designer-actions";
import { WorkspaceButton } from "../../components/WorkspaceButton";
import { WorkspaceCard } from "../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../components/WorkspaceEmptyState";
import { WorkspaceBadge } from "../../components/WorkspaceBadge";
import { WorkspaceInput } from "../../components/WorkspaceInput";
import { WorkspaceSection } from "../../components/WorkspaceSection";

interface FilterDef {
  id: string; label: string; min: number; max: number; unit: string;
}

const FILTERS: FilterDef[] = [
  { id: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
  { id: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
  { id: "saturate", label: "Saturation", min: 0, max: 200, unit: "%" },
  { id: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
  { id: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
  { id: "hue-rotate", label: "Hue Rotate", min: 0, max: 360, unit: "deg" },
  { id: "blur", label: "Blur", min: 0, max: 20, unit: "px" },
  { id: "invert", label: "Invert", min: 0, max: 100, unit: "%" },
];

const PRESETS: Array<{ name: string; filters: Record<string, number> }> = [
  { name: "Original", filters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 } },
  { name: "Noir", filters: { brightness: 110, contrast: 130, saturate: 0, sepia: 0, grayscale: 100, "hue-rotate": 0, blur: 0, invert: 0 } },
  { name: "Vintage", filters: { brightness: 90, contrast: 110, saturate: 80, sepia: 60, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 } },
  { name: "Cool", filters: { brightness: 100, contrast: 120, saturate: 130, sepia: 0, grayscale: 0, "hue-rotate": 180, blur: 0, invert: 0 } },
  { name: "Warm", filters: { brightness: 110, contrast: 105, saturate: 120, sepia: 20, grayscale: 0, "hue-rotate": 30, blur: 0, invert: 0 } },
  { name: "Dramatic", filters: { brightness: 80, contrast: 150, saturate: 150, sepia: 0, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 } },
  { name: "Faded", filters: { brightness: 120, contrast: 80, saturate: 50, sepia: 30, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 } },
  { name: "Invert", filters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 100 } },
  { name: "Dreamy", filters: { brightness: 120, contrast: 90, saturate: 110, sepia: 10, grayscale: 0, "hue-rotate": 0, blur: 3, invert: 0 } },
  { name: "Cyberpunk", filters: { brightness: 110, contrast: 140, saturate: 200, sepia: 0, grayscale: 0, "hue-rotate": 270, blur: 0, invert: 0 } },
];

export function DesignerImageEditorTab({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const editFilters = useDesignerStore((s) => s.editFilters);
  const editImageData = useDesignerStore((s) => s.editImageData);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const setFilter = useCallback((id: string, value: number) => {
    useDesignerStore.setState((s) => ({ editFilters: { ...s.editFilters, [id]: value } }));
  }, []);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    useDesignerStore.setState({ editFilters: { ...editFilters, ...preset.filters } });
  }, [editFilters]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setImageLoaded(data);
      useDesignerStore.setState({ editImageData: data });
    };
    reader.readAsDataURL(file);
  }, []);

  const resetAll = useCallback(() => {
    setRotation(0); setFlipH(false); setFlipV(false);
    useDesignerStore.setState({
      editFilters: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0, "hue-rotate": 0, blur: 0, invert: 0 },
    });
  }, []);

  const filterStyle = imageLoaded ? {
    filter: `brightness(${editFilters.brightness}%) contrast(${editFilters.contrast}%) saturate(${editFilters.saturate}%) sepia(${editFilters.sepia}%) grayscale(${editFilters.grayscale}%) hue-rotate(${editFilters["hue-rotate"]}deg) blur(${editFilters.blur}px) invert(${editFilters.invert}%)`,
    transform: `rotate(${rotation}deg) ${flipH ? "scaleX(-1)" : ""} ${flipV ? "scaleY(-1)" : ""}`,
    maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
  } : {};

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-3 h-8 border-b shrink-0 justify-between ws-bg-card ws-bd-border">
        <span className="text-[9px] tracking-wider uppercase ws-font-sora text-muted-foreground">Image Editor</span>
        <div className="flex gap-1.5">
          <button onClick={() => fileRef.current?.click()} className="ws-btn-primary text-[9px]">Open Image</button>
          {imageLoaded && (
            <>
              <button onClick={() => setShowOriginal((v) => !v)} className="ws-btn-sm text-[9px]" style={{ background: showOriginal ? "var(--accent)" : "var(--card)" }}>Compare</button>
              <button onClick={() => {
                const canvas = document.createElement("canvas");
                const img = new Image();
                img.onload = () => {
                  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                  const ctx = canvas.getContext("2d")!;
                  ctx.filter = `brightness(${editFilters.brightness}%) contrast(${editFilters.contrast}%) saturate(${editFilters.saturate}%) sepia(${editFilters.sepia}%) grayscale(${editFilters.grayscale}%) hue-rotate(${editFilters["hue-rotate"]}deg) blur(${editFilters.blur}px) invert(${editFilters.invert}%)`;
                  ctx.translate(canvas.width / 2, canvas.height / 2);
                  ctx.rotate((rotation * Math.PI) / 180);
                  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                  ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2);
                  canvas.toBlob((blob) => {
                    if (!blob) return;
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = `edited-${Date.now()}.png`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  }, "image/png");
                };
                img.src = imageLoaded;
              }} className="px-2.5 py-1 rounded text-[9px]" style={{ background: "#10B981", color: "#FFF" }}>Export PNG</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex items-center justify-center overflow-auto p-4 ws-bg-canvas">
          {imageLoaded ? (
            <div className="flex items-center justify-center gap-2" style={{ minWidth: 200, minHeight: 200 }}>
              {showOriginal && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[8px] uppercase text-muted-foreground ws-font-sora">Original</span>
                  <img src={imageLoaded} alt="Original" style={{ maxWidth: "50%", maxHeight: 300, objectFit: "contain", borderRadius: 4 }} />
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                {showOriginal && <span className="text-[8px] uppercase ws-font-sora" style={{ color: "var(--accent)" }}>Edited</span>}
                <img src={imageLoaded} alt="Editor preview" style={filterStyle as any} />
              </div>
            </div>
          ) : (
            <WorkspaceCard className="text-center max-w-xs">
              <WorkspaceEmptyState icon="🖼️" message="No Image — drop an image or click Open Image to start editing" />
              <button onClick={() => fileRef.current?.click()} className="ws-btn-primary text-[10px] mt-3">Browse Files</button>
              <p className="text-[8px] text-muted-foreground mt-2">Supports JPG, PNG, WEBP</p>
            </WorkspaceCard>
          )}
        </div>
        <div className="w-[240px] border-l overflow-y-auto p-3 space-y-3 shrink-0 ws-bg-card ws-bd-border ws-scrollbar">
          {!imageLoaded && (
            <div className="flex flex-col items-center gap-2 py-4">
              <button onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-lg text-[10px] font-medium ws-btn-primary">Browse Files</button>
              <p className="text-[8px] text-muted-foreground">Supports JPG, PNG, WEBP</p>
            </div>
          )}
          {imageLoaded && (<>
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-2 text-muted-foreground ws-font-sora">Presets</div>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.map((p) => (
                  <button key={p.name} onClick={() => applyPreset(p)} className="px-2 py-1.5 rounded text-[8px] text-left ws-card-hover">{p.name}</button>
                ))}
              </div>
            </div>
            <div className="border-t ws-bd-border" />
            {FILTERS.map((f) => {
              const val = editFilters[f.id] ?? 100;
              return (
                <div key={f.id}>
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] text-muted-foreground">{f.label}</label>
                    <span className="text-[8px] text-muted-foreground ws-font-mono">{val}{f.unit}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} value={val} onChange={(e) => setFilter(f.id, Number(e.target.value))} className="w-full mt-0.5" />
                </div>
              );
            })}
            <div className="border-t ws-bd-border" />
            <div>
              <div className="text-[9px] uppercase tracking-wider mb-1 text-muted-foreground ws-font-sora">Transform</div>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => setRotation((r) => (r - 90) % 360)} className="ws-btn-sm">↺ Rotate</button>
                <button onClick={() => setRotation((r) => (r + 90) % 360)} className="ws-btn-sm">↻ Rotate</button>
                <button onClick={() => setFlipH((v) => !v)} className="ws-btn-sm" style={{ background: flipH ? "var(--accent)" : "var(--card)" }}>↔ Flip</button>
                <button onClick={() => setFlipV((v) => !v)} className="ws-btn-sm" style={{ background: flipV ? "var(--accent)" : "var(--card)" }}>↕ Flip</button>
                <button onClick={resetAll} className="col-span-2 ws-btn-sm" style={{ background: "#EF444420", color: "#EF4444" }}>Reset All</button>
              </div>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}

import { MONO, ACCENT, STRIP, TEXT_DIM } from "../video-types";

export function AIOverlay({ status, progress, result }: { status: string; progress: number; result?: string }) {
  if (status === "generating") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.7)", zIndex: 50 }}>
        <div style={{ fontSize: 9, fontFamily: MONO, color: ACCENT, letterSpacing: 1 }}>AI GENERATING...</div>
        <div style={{ width: 120, height: 3, background: STRIP, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: ACCENT, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 7, fontFamily: MONO, color: TEXT_DIM }}>{progress}%</div>
      </div>
    );
  }
  if (status === "done" && result) {
    return (
      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${ACCENT}40`, zIndex: 50 }}>
        <span style={{ fontSize: 8, fontFamily: MONO, color: "#00D26A" }}>✓ {result}</span>
      </div>
    );
  }
  return null;
}

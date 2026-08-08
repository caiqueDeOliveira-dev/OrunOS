import { MONO } from "../video-types";

export function PreviewActions({ safeMargins, onToggleSafeMargins }: { safeMargins: boolean; onToggleSafeMargins: () => void }) {
  return (
    <div className="absolute bottom-2 right-2 flex items-center gap-1">
      <button onClick={onToggleSafeMargins}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, fontSize: 8, fontFamily: MONO,
          color: safeMargins ? "#4DA3FF" : "#5C5C5C", cursor: "pointer", borderRadius: 6, transition: "all 0.12s",
          background: safeMargins ? "#4DA3FF18" : "rgba(255,255,255,0.05)",
          border: safeMargins ? "1px solid #4DA3FF40" : "1px solid transparent",
        }}
        title="Safe Margins">&#9638;</button>
      <button onClick={() => {
        const el = document.querySelector("[data-preview]") as HTMLElement;
        if (el) {
          if (document.fullscreenElement) document.exitFullscreen();
          else el.requestFullscreen();
        }
      }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.05)", border: "none", width: 22, height: 22,
          color: "#A0A0A0", cursor: "pointer", borderRadius: 6, transition: "all 0.12s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
        title="Fullscreen">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
      </button>
    </div>
  );
}

import { useVideoStore } from "../video-store";
import { SANS, TRANSITIONS } from "../video-types";

export function TransitionsTab() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {TRANSITIONS.map((tr) => (
        <div
          key={tr.label}
          className="flex flex-col items-center justify-center cursor-pointer"
          onClick={() => useVideoStore.setState({ selectedTransition: tr.label })}
          style={{
            height: 52, background: "#21262D", borderRadius: 4,
            border: useVideoStore.getState().selectedTransition === tr.label
              ? "1px solid #C9D1D9" : "1px solid #30363D",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 16, color: "#8B949E" }}>{tr.arrow}</span>
          <span style={{ fontSize: 8, color: "#8B949E", fontFamily: SANS }}>{tr.label}</span>
        </div>
      ))}
    </div>
  );
}

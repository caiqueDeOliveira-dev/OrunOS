import { useVideoStore } from "../video-store";
import { SANS, EFFECTS } from "../video-types";

export function EffectsTab() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {EFFECTS.map((fx) => (
        <div
          key={fx.label}
          className="flex flex-col cursor-pointer"
          onClick={() => useVideoStore.setState({ selectedEffect: fx.label })}
          style={{
            borderRadius: 4, overflow: "hidden",
            border: useVideoStore.getState().selectedEffect === fx.label
              ? "1px solid #C9D1D9" : "1px solid #21262D",
          }}
        >
          <div style={{ height: 40, background: `linear-gradient(135deg, ${fx.color}, ${fx.color}aa)` }} />
          <div style={{ padding: "2px 4px", background: "#0D1117" }}>
            <span style={{ fontSize: 8, color: "#8B949E", fontFamily: SANS }}>{fx.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

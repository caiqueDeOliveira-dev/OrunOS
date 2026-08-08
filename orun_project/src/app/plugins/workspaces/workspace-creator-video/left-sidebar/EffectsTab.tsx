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
            borderRadius: 6, overflow: "hidden",
            border: useVideoStore.getState().selectedEffect === fx.label
              ? "1px solid #FFFFFF" : "1px solid #141414",
          }}
        >
          <div style={{ height: 40, background: `linear-gradient(135deg, ${fx.color}, ${fx.color}aa)` }} />
          <div style={{ padding: "2px 4px", background: "#0A0A0C" }}>
            <span style={{ fontSize: 8, color: "#A0A0A0", fontFamily: SANS }}>{fx.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

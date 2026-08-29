import { useVideoStore } from "../video-store";
import { P } from "../../premium";
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
              ? `1px solid ${P.text}` : `1px solid ${P.border}`,
          }}
        >
          <div style={{ height: 40, background: `linear-gradient(135deg, ${fx.color}, ${fx.color}aa)` }} />
          <div style={{ padding: "2px 4px", background: P.card }}>
            <span style={{ fontSize: 8, color: P.sub, fontFamily: SANS }}>{fx.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

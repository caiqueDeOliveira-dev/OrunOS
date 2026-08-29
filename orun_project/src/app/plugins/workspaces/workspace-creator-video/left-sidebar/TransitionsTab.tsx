import { useVideoStore } from "../video-store";
import { P } from "../../premium";
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
            height: 52, background: P.card2, borderRadius: 6,
            border: useVideoStore.getState().selectedTransition === tr.label
              ? `1px solid ${P.text}` : `1px solid ${P.border}`,
            gap: 4,
          }}
        >
          <span style={{ fontSize: 16, color: P.sub }}>{tr.arrow}</span>
          <span style={{ fontSize: 8, color: P.sub, fontFamily: SANS }}>{tr.label}</span>
        </div>
      ))}
    </div>
  );
}

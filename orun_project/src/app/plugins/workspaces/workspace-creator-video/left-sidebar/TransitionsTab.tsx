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
            height: 52, background: "#141414", borderRadius: 6,
            border: useVideoStore.getState().selectedTransition === tr.label
              ? "1px solid #FFFFFF" : "1px solid #1C1C1C",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 16, color: "#A0A0A0" }}>{tr.arrow}</span>
          <span style={{ fontSize: 8, color: "#A0A0A0", fontFamily: SANS }}>{tr.label}</span>
        </div>
      ))}
    </div>
  );
}

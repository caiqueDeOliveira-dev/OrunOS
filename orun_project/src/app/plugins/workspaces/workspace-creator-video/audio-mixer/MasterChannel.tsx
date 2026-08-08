import { useVideoStore } from "../video-store";
import { MONO, SANS } from "../video-types";
import { LevelMeter } from "./LevelMeter";

export function MasterChannel() {
  const volume = useVideoStore((s) => s.volume);

  return (
    <div
      className="flex flex-col items-center shrink-0"
      style={{ width: 56, padding: "4px 2px", background: "#0A0A0C", borderRadius: 6, border: "1px solid #C3002F30" }}
    >
      <span style={{ fontSize: 7, fontFamily: SANS, fontWeight: 700, color: "#C3002F", marginBottom: 2 }}>MASTER</span>

      <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
        <div style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)" }}>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })}
            style={{ width: 28, accentColor: "#C3002F", height: 3 }}
          />
        </div>
        <LevelMeter color="#C3002F" />
      </div>

      <div className="flex gap-1" style={{ marginBottom: 2 }}>
        <div style={{ fontSize: 7, fontFamily: MONO, color: "#5C5C5C", textAlign: "center" }}>L</div>
        <div style={{ width: 4, height: 4, borderRadius: 2, background: volume > 0 ? "#00D26A" : "#1C1C1C", alignSelf: "center" }} />
        <div style={{ fontSize: 7, fontFamily: MONO, color: "#5C5C5C", textAlign: "center" }}>R</div>
      </div>

      <span style={{ fontSize: 7, fontFamily: MONO, color: "#A0A0A0" }}>{volume}%</span>
    </div>
  );
}

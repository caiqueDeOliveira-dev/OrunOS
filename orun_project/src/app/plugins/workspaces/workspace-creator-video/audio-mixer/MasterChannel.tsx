import { useVideoStore } from "../video-store";
import { MONO, SANS } from "../video-types";
import { LevelMeter } from "./LevelMeter";

export function MasterChannel() {
  const volume = useVideoStore((s) => s.volume);

  return (
    <div
      className="flex flex-col items-center shrink-0"
      style={{ width: 56, padding: "4px 2px", background: "#0D1117", borderRadius: 4, border: "1px solid #C0001830" }}
    >
      <span style={{ fontSize: 7, fontFamily: SANS, fontWeight: 700, color: "#C00018", marginBottom: 2 }}>MASTER</span>

      <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
        <div style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)" }}>
          <input
            type="range" min={0} max={100} value={volume}
            onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })}
            style={{ width: 28, accentColor: "#C00018", height: 3 }}
          />
        </div>
        <LevelMeter color="#C00018" />
      </div>

      <div className="flex gap-1" style={{ marginBottom: 2 }}>
        <div style={{ fontSize: 7, fontFamily: MONO, color: "#484F58", textAlign: "center" }}>L</div>
        <div style={{ width: 4, height: 4, borderRadius: 2, background: volume > 0 ? "#2D9B5A" : "#30363D", alignSelf: "center" }} />
        <div style={{ fontSize: 7, fontFamily: MONO, color: "#484F58", textAlign: "center" }}>R</div>
      </div>

      <span style={{ fontSize: 7, fontFamily: MONO, color: "#8B949E" }}>{volume}%</span>
    </div>
  );
}

import { useVideoStore } from "../video-store";
import { MONO, IVolIcon } from "../video-types";

export function VolumeControl() {
  const volume = useVideoStore((s) => s.volume);

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1.5"
      style={{ background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 6px" }}>
      <IVolIcon />
      <input type="range" min={0} max={100} value={volume}
        onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })}
        style={{ width: 60, height: 3, accentColor: "#FFFFFF" }} />
      <span style={{ fontSize: 8, fontFamily: MONO, color: "#5C5C5C", minWidth: 20 }}>{volume}%</span>
    </div>
  );
}

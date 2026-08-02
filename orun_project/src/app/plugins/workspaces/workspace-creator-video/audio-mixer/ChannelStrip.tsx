import { useState } from "react";
import { useVideoStore } from "../video-store";
import { MONO, SANS, btnBase } from "../video-types";
import { LevelMeter } from "./LevelMeter";
import { PanKnob } from "./PanKnob";

interface ChannelStripProps {
  index: number;
  name: string;
  color: string;
  controls: "solo-mute" | "eye-lock" | "eye";
}

export function ChannelStrip({ index, name, color, controls }: ChannelStripProps) {
  const [vol, setVol] = useState(80);
  const [pan, setPan] = useState(0);
  const trackMuted = useVideoStore((s) => s.trackMuted);
  const trackSolo = useVideoStore((s) => s.trackSolo);

  return (
    <div
      className="flex flex-col items-center shrink-0"
      style={{
        width: 72, padding: "4px 2px",
        background: "#0D1117", borderRadius: 4, border: "1px solid #21262D",
      }}
    >
      <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
        <div style={{ width: 5, height: 5, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 7, fontFamily: SANS, fontWeight: 600, color: "#8B949E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name.split(" ").pop()}
        </span>
      </div>

      <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
        <div style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)" }}>
          <input
            type="range" min={0} max={100} value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            style={{ width: 28, accentColor: color, height: 3 }}
          />
        </div>
        <LevelMeter color={color} />
      </div>

      <div className="flex items-center gap-0.5" style={{ marginBottom: 2 }}>
        {controls === "solo-mute" && (
          <>
            <button
              title="Solo" onClick={() => useVideoStore.setState((s) => ({ trackSolo: { ...s.trackSolo, [index]: !s.trackSolo[index] } }))}
              style={{ ...btnBase, width: 14, height: 14, background: trackSolo[index] ? "#D4A01730" : "transparent", border: trackSolo[index] ? "1px solid #D4A017" : "1px solid #30363D", borderRadius: 2 }}
            >
              <span style={{ fontSize: 7, fontFamily: MONO, fontWeight: 700, color: trackSolo[index] ? "#D4A017" : "#484F58" }}>S</span>
            </button>
            <button
              title="Mute" onClick={() => useVideoStore.setState((s) => ({ trackMuted: { ...s.trackMuted, [index]: !s.trackMuted[index] } }))}
              style={{ ...btnBase, width: 14, height: 14, background: trackMuted[index] ? "#C0001830" : "transparent", border: trackMuted[index] ? "1px solid #C00018" : "1px solid #30363D", borderRadius: 2 }}
            >
              <span style={{ fontSize: 7, fontFamily: MONO, fontWeight: 700, color: trackMuted[index] ? "#C00018" : "#484F58" }}>M</span>
            </button>
          </>
        )}
        {(controls === "eye-lock" || controls === "eye") && (
          <button
            title="Visibility" onClick={() => useVideoStore.setState((s) => ({ trackMuted: { ...s.trackMuted, [index]: !s.trackMuted[index] } }))}
            style={{ ...btnBase, width: 14, height: 14, color: trackMuted[index] ? "#C00018" : "#8B949E", border: "1px solid #30363D", borderRadius: 2, background: "transparent" }}
          >
            <span style={{ fontSize: 8 }}>{trackMuted[index] ? "\u25CF" : "\u25CB"}</span>
          </button>
        )}
      </div>

      <PanKnob value={pan} onChange={(v) => setPan(v)} />
      <span style={{ fontSize: 6, fontFamily: MONO, color: "#484F58", marginTop: 1 }}>
        {pan === 0 ? "C" : pan < 0 ? `L${Math.abs(pan)}` : `R${pan}`}
      </span>
    </div>
  );
}

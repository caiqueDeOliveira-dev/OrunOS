import { TRACK_CONFIG } from "./video-types";
import { ChannelStrip } from "./audio-mixer/ChannelStrip";
import { MasterChannel } from "./audio-mixer/MasterChannel";

export function AudioMixer() {
  return (
    <div
      className="flex items-stretch shrink-0"
      style={{
        height: 100, background: "#12161F",
        borderTop: "1px solid #21262D", borderBottom: "1px solid #21262D",
        padding: "6px 8px", gap: 6,
        overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#30363D transparent",
      }}
    >
      {TRACK_CONFIG.map((track, i) => (
        <ChannelStrip key={i} index={i} name={track.name} color={track.color} controls={track.controls} />
      ))}

      <div style={{ width: 1, background: "#30363D", alignSelf: "stretch", margin: "2px 2px", flexShrink: 0 }} />

      <MasterChannel />
    </div>
  );
}

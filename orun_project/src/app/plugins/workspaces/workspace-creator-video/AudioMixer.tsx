import { TRACK_CONFIG } from "./video-types";
import { ChannelStrip } from "./audio-mixer/ChannelStrip";
import { MasterChannel } from "./audio-mixer/MasterChannel";

export function AudioMixer() {
  return (
    <div
      className="hs-scroll flex items-stretch shrink-0"
      style={{
        height: 100, background: "#0A0A0C",
        borderTop: "1px solid #141414", borderBottom: "1px solid #141414",
        padding: "6px 8px", gap: 6,
        overflowX: "auto", scrollbarWidth: "thin", scrollbarColor: "#1C1C1C transparent",
      }}
    >
      {TRACK_CONFIG.map((track, i) => (
        <ChannelStrip key={i} index={i} name={track.name} color={track.color} controls={track.controls} />
      ))}

      <div style={{ width: 1, background: "#1C1C1C", alignSelf: "stretch", margin: "2px 2px", flexShrink: 0 }} />

      <MasterChannel />
    </div>
  );
}

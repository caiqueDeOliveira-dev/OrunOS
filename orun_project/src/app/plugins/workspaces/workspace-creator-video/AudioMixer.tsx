// AudioMixer — 4 channel strips + master fader, sits between preview and timeline
import { useState } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore } from "./video-store";
import { TRACK_CONFIG, MONO, SANS, btnBase } from "./video-types";

function LevelMeter({ color }: { color: string }) {
  return (
    <div className="flex gap-px items-end" style={{ height: 28 }}>
      {[0.4, 0.6, 0.8, 1].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h * 100}%`,
            background: i >= 2 ? "#C00018" : i === 1 ? "#D4A017" : color,
            borderRadius: 1,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

function PanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const angle = ((value + 100) / 200) * 270 - 135;
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#0D1117",
        border: "1px solid #30363D",
        position: "relative",
        cursor: "pointer",
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
        const deg = (rad * 180) / Math.PI + 90;
        const clamped = Math.max(-135, Math.min(135, deg));
        const pan = Math.round(((clamped + 135) / 270) * 200 - 100);
        onChange(pan);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 2,
          height: 8,
          background: "#C9D1D9",
          borderRadius: 1,
          transformOrigin: "center top",
          transform: `translate(-50%, 0) rotate(${angle}deg)`,
        }}
      />
    </div>
  );
}

export function AudioMixer() {
  const { t } = useTranslation();

  const trackMuted = useVideoStore((s) => s.trackMuted);
  const trackSolo = useVideoStore((s) => s.trackSolo);
  const volume = useVideoStore((s) => s.volume);

  const [channelVolumes, setChannelVolumes] = useState<number[]>([80, 75, 70, 85]);
  const [channelPan, setChannelPan] = useState<number[]>([0, -20, 10, 0]);

  const setChVol = (i: number, v: number) => setChannelVolumes((prev) => { const n = [...prev]; n[i] = v; return n; });
  const setChPan = (i: number, v: number) => setChannelPan((prev) => { const n = [...prev]; n[i] = v; return n; });

  const toggleMute = (i: number) => {
    useVideoStore.setState((s) => ({
      trackMuted: { ...s.trackMuted, [i]: !s.trackMuted[i] },
    }));
  };

  const toggleSolo = (i: number) => {
    useVideoStore.setState((s) => ({
      trackSolo: { ...s.trackSolo, [i]: !s.trackSolo[i] },
    }));
  };

  return (
    <div
      className="flex items-stretch shrink-0"
      style={{
        height: 100,
        background: "#12161F",
        borderTop: "1px solid #21262D",
        borderBottom: "1px solid #21262D",
        padding: "6px 8px",
        gap: 6,
        overflowX: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "#30363D transparent",
      }}
    >
      {TRACK_CONFIG.map((track, i) => (
        <div
          key={i}
          className="flex flex-col items-center shrink-0"
          style={{
            width: 72,
            padding: "4px 2px",
            background: "#0D1117",
            borderRadius: 4,
            border: "1px solid #21262D",
          }}
        >
          <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                background: track.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 7,
                fontFamily: SANS,
                fontWeight: 600,
                color: "#8B949E",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {track.name.split(" ").pop()}
            </span>
          </div>

          <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
            <div style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)" }}>
              <input
                type="range"
                min={0}
                max={100}
                value={channelVolumes[i]}
                onChange={(e) => setChVol(i, Number(e.target.value))}
                style={{
                  width: 28,
                  accentColor: track.color,
                  height: 3,
                }}
              />
            </div>
            <LevelMeter color={track.color} />
          </div>

          <div className="flex items-center gap-0.5" style={{ marginBottom: 2 }}>
            {track.controls === "solo-mute" && (
              <>
                <button
                  title="Solo"
                  onClick={() => toggleSolo(i)}
                  style={{
                    ...btnBase,
                    width: 14,
                    height: 14,
                    background: trackSolo[i] ? "#D4A01730" : "transparent",
                    border: trackSolo[i] ? "1px solid #D4A017" : "1px solid #30363D",
                    borderRadius: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 7,
                      fontFamily: MONO,
                      fontWeight: 700,
                      color: trackSolo[i] ? "#D4A017" : "#484F58",
                    }}
                  >
                    S
                  </span>
                </button>
                <button
                  title="Mute"
                  onClick={() => toggleMute(i)}
                  style={{
                    ...btnBase,
                    width: 14,
                    height: 14,
                    background: trackMuted[i] ? "#C0001830" : "transparent",
                    border: trackMuted[i] ? "1px solid #C00018" : "1px solid #30363D",
                    borderRadius: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 7,
                      fontFamily: MONO,
                      fontWeight: 700,
                      color: trackMuted[i] ? "#C00018" : "#484F58",
                    }}
                  >
                    M
                  </span>
                </button>
              </>
            )}
            {track.controls === "eye-lock" && (
              <button
                title="Visibility"
                onClick={() => toggleMute(i)}
                style={{
                  ...btnBase,
                  width: 14,
                  height: 14,
                  color: trackMuted[i] ? "#C00018" : "#8B949E",
                  border: "1px solid #30363D",
                  borderRadius: 2,
                  background: "transparent",
                }}
              >
                <span style={{ fontSize: 8 }}>
                  {trackMuted[i] ? "\u25CF" : "\u25CB"}
                </span>
              </button>
            )}
            {track.controls === "eye" && (
              <button
                title="Visibility"
                onClick={() => toggleMute(i)}
                style={{
                  ...btnBase,
                  width: 14,
                  height: 14,
                  color: trackMuted[i] ? "#C00018" : "#8B949E",
                  border: "1px solid #30363D",
                  borderRadius: 2,
                  background: "transparent",
                }}
              >
                <span style={{ fontSize: 8 }}>
                  {trackMuted[i] ? "\u25CF" : "\u25CB"}
                </span>
              </button>
            )}
          </div>

          <PanKnob
            value={channelPan[i]}
            onChange={(v) => setChPan(i, v)}
          />
          <span
            style={{
              fontSize: 6,
              fontFamily: MONO,
              color: "#484F58",
              marginTop: 1,
            }}
          >
            {channelPan[i] === 0 ? "C" : channelPan[i] < 0 ? `L${Math.abs(channelPan[i])}` : `R${channelPan[i]}`}
          </span>
        </div>
      ))}

      <div
        style={{
          width: 1,
          background: "#30363D",
          alignSelf: "stretch",
          margin: "2px 2px",
          flexShrink: 0,
        }}
      />

      <div
        className="flex flex-col items-center shrink-0"
        style={{
          width: 56,
          padding: "4px 2px",
          background: "#0D1117",
          borderRadius: 4,
          border: "1px solid #C0001830",
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontFamily: SANS,
            fontWeight: 700,
            color: "#C00018",
            marginBottom: 2,
          }}
        >
          MASTER
        </span>

        <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
          <div style={{ writingMode: "vertical-lr" as const, transform: "rotate(180deg)" }}>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })}
              style={{
                width: 28,
                accentColor: "#C00018",
                height: 3,
              }}
            />
          </div>
          <LevelMeter color="#C00018" />
        </div>

        <div className="flex gap-1" style={{ marginBottom: 2 }}>
          <div
            style={{
              fontSize: 7,
              fontFamily: MONO,
              color: "#484F58",
              textAlign: "center",
            }}
          >
            L
          </div>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              background: volume > 0 ? "#2D9B5A" : "#30363D",
              alignSelf: "center",
            }}
          />
          <div
            style={{
              fontSize: 7,
              fontFamily: MONO,
              color: "#484F58",
              textAlign: "center",
            }}
          >
            R
          </div>
        </div>

        <span
          style={{
            fontSize: 7,
            fontFamily: MONO,
            color: "#8B949E",
          }}
        >
          {volume}%
        </span>
      </div>
    </div>
  );
}

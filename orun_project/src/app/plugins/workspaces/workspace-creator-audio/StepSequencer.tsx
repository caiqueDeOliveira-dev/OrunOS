import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { PANEL, STRIP, ACCENT, BORDER, TEXT_BRI, TEXT_DIM, FONT_LABEL, FONT_MONO, GREEN } from "./creator-audio-types";

type TrackId = "kick" | "snare" | "hihat" | "clap" | "tom" | "cymbal" | "rim" | "perc";

interface TrackDef {
  id: TrackId;
  label: string;
  color: string;
  shortcut: string;
}

const TRACKS: TrackDef[] = [
  { id: "kick", label: "KICK", color: "#FF4444", shortcut: "1" },
  { id: "snare", label: "SNARE", color: "#FF8800", shortcut: "2" },
  { id: "hihat", label: "HIHAT", color: "#FFCC00", shortcut: "3" },
  { id: "clap", label: "CLAP", color: "#44BB44", shortcut: "4" },
  { id: "tom", label: "TOM", color: "#44BBFF", shortcut: "5" },
  { id: "cymbal", label: "CYMBAL", color: "#8888FF", shortcut: "6" },
  { id: "rim", label: "RIM", color: "#FF66AA", shortcut: "7" },
  { id: "perc", label: "PERC", color: "#AA66FF", shortcut: "8" },
];

const STEPS = 16;
const DEFAULT_PATTERN: Record<TrackId, boolean[]> = {
  kick:   [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare:  [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hihat:  [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  clap:   [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
  tom:    [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  cymbal: [false, false, false, false, false, false, false, false, false, false, false, true, false, false, false, false],
  rim:    [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
  perc:   [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
};

export function StepSequencer() {
  const { t } = useTranslation();
  const bpm = useDJStore((s) => s.bpm);
  const [pattern, setPattern] = useState<Record<TrackId, boolean[]>>(() => {
    const saved = localStorage.getItem("sequencer_pattern");
    if (saved) try { return JSON.parse(saved); } catch { /* ignore */ }
    return DEFAULT_PATTERN;
  });
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [swing, setSwing] = useState(0);
  const [velocity, setVelocity] = useState<Record<string, number>>({});
  const [mutedTracks, setMutedTracks] = useState<Set<TrackId>>(new Set());
  const [soloTracks, setSoloTracks] = useState<Set<TrackId>>(new Set());
  const [showVelocity, setShowVelocity] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("sequencer_pattern", JSON.stringify(pattern));
  }, [pattern]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setCurrentStep(-1);
      return;
    }
    const stepMs = (60000 / bpm / 4) * (1 + swing / 200);
    let step = 0;
    const tick = () => {
      setCurrentStep(step % STEPS);
      step++;
    };
    tick();
    intervalRef.current = window.setInterval(tick, stepMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, bpm, swing]);

  const toggleStep = useCallback((track: TrackId, step: number) => {
    setPattern((prev) => {
      const next = { ...prev, [track]: [...prev[track]] };
      next[track][step] = !next[track][step];
      return next;
    });
  }, []);

  const setStepVelocity = useCallback((track: TrackId, step: number, vel: number) => {
    setVelocity((prev) => ({ ...prev, [`${track}-${step}`]: vel }));
  }, []);

  const clearPattern = useCallback(() => {
    const empty: Record<TrackId, boolean[]> = {} as Record<TrackId, boolean[]>;
    TRACKS.forEach((t) => { empty[t.id] = Array(STEPS).fill(false); });
    setPattern(empty);
  }, []);

  const loadDefault = useCallback(() => {
    setPattern(DEFAULT_PATTERN);
  }, []);

  const toggleMute = useCallback((track: TrackId) => {
    setMutedTracks((prev) => { const next = new Set(prev); if (next.has(track)) next.delete(track); else next.add(track); return next; });
  }, []);

  const toggleSolo = useCallback((track: TrackId) => {
    setSoloTracks((prev) => { const next = new Set(prev); if (next.has(track)) next.delete(track); else next.add(track); return next; });
  }, []);

  const isSoloActive = soloTracks.size > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 8, gap: 6, overflow: "auto" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setPlaying(!playing)}
            style={{ padding: "4px 14px", borderRadius: 4, fontSize: 9, fontWeight: 600, border: "none", cursor: "pointer", background: playing ? "#FF4444" : ACCENT, color: "#FFF" }}>
            {playing ? "⏹ STOP" : "▶ PLAY"}
          </button>
          <button onClick={clearPattern} style={{ padding: "2px 8px", borderRadius: 3, fontSize: 8, border: `1px solid ${BORDER}`, cursor: "pointer", background: STRIP, color: TEXT_DIM }}>CLEAR</button>
          <button onClick={loadDefault} style={{ padding: "2px 8px", borderRadius: 3, fontSize: 8, border: `1px solid ${BORDER}`, cursor: "pointer", background: STRIP, color: TEXT_DIM }}>DEFAULT</button>
          <button onClick={() => setShowVelocity(!showVelocity)}
            style={{ padding: "2px 8px", borderRadius: 3, fontSize: 8, border: `1px solid ${BORDER}`, cursor: "pointer", background: showVelocity ? ACCENT : STRIP, color: showVelocity ? "#FFF" : TEXT_DIM }}>VEL</button>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL }}>SWING</span>
          <input type="range" min={0} max={100} value={swing} onChange={(e) => setSwing(Number(e.target.value))} style={{ width: 60 }} />
          <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_MONO, width: 24 }}>{swing}%</span>
          <span style={{ fontSize: 9, color: ACCENT, fontFamily: FONT_MONO, marginLeft: 4 }}>{bpm} BPM</span>
        </div>
      </div>

      {/* Step Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, overflow: "auto" }}>
        {/* Step Numbers */}
        <div style={{ display: "flex", marginLeft: 52 }}>
          {Array.from({ length: STEPS }, (_, i) => (
            <div key={i} style={{
              width: 28, minWidth: 28, height: 14, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, fontFamily: FONT_MONO,
              color: currentStep === i ? "#FFF" : TEXT_DIM,
              background: i % 4 === 0 ? "rgba(255,255,255,0.04)" : "transparent",
              borderBottom: currentStep === i ? `2px solid ${ACCENT}` : `1px solid transparent`,
            }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Track Rows */}
        {TRACKS.map((track) => {
          const isMuted = mutedTracks.has(track.id);
          const isSolo = soloTracks.has(track.id);
          const isActive = !isMuted && (!isSoloActive || isSolo);

          return <div key={track.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Track Label */}
            <div style={{
              width: 48, minWidth: 48, height: 24, display: "flex", alignItems: "center", gap: 2,
              fontSize: 8, fontFamily: FONT_LABEL, color: isMuted ? TEXT_DIM : "#FFF", letterSpacing: 0.5,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                background: isMuted ? STRIP : track.color, flexShrink: 0,
              }} />
              <span style={{ color: isMuted ? TEXT_DIM : "#FFF" }}>{track.label}</span>
              <button onClick={() => toggleMute(track.id)}
                style={{ marginLeft: "auto", background: "none", border: "none", color: isMuted ? "#FF4444" : TEXT_DIM, cursor: "pointer", fontSize: 7 }}>M</button>
              <button onClick={() => toggleSolo(track.id)}
                style={{ background: "none", border: "none", color: isSolo ? "#FFCC00" : TEXT_DIM, cursor: "pointer", fontSize: 7 }}>S</button>
            </div>

            {/* Steps */}
            {Array.from({ length: STEPS }, (_, i) => {
              const active = pattern[track.id][i];
              const vel = velocity[`${track.id}-${i}`] ?? 100;
              const isCurrent = currentStep === i;
              return <button key={i} onClick={() => toggleStep(track.id, i)}
                onContextMenu={(e) => { e.preventDefault(); toggleStep(track.id, i); }}
                style={{
                  width: 28, minWidth: 28, height: 24,
                  border: "none", cursor: "pointer",
                  borderRadius: 2,
                  background: active
                    ? (isMuted ? STRIP : isCurrent ? "#FFF" : track.color)
                    : (isCurrent ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)"),
                  opacity: active ? (isMuted ? 0.3 : (isCurrent ? 1 : 0.8)) : 0.5,
                  position: "relative",
                  transition: "all 0.05s ease",
                  boxShadow: isCurrent && active ? "inset 0 0 6px rgba(255,255,255,0.5)" : "none",
                }}>
                {showVelocity && active && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: 1 }}>
                    <div style={{ width: "100%", height: `${vel}%`, background: "rgba(255,255,255,0.2)", borderRadius: 1 }} />
                  </div>
                )}
              </button>;
            })}
          </div>;
        })}
      </div>
    </div>
  );
}

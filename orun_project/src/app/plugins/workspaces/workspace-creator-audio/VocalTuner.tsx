import { useState, useCallback } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { PANEL, STRIP, ACCENT, BORDER, TEXT_BRI, TEXT_DIM, FONT_LABEL, FONT_MONO, GREEN } from "./creator-audio-types";

const SCALES = [
  { id: "chromatic", label: "Chromatic", notes: ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] },
  { id: "major", label: "Major", notes: ["C","D","E","F","G","A","B"] },
  { id: "minor", label: "Minor", notes: ["C","D","Eb","F","G","Ab","Bb"] },
  { id: "pentatonic", label: "Pentatonic", notes: ["C","D","E","G","A"] },
  { id: "blues", label: "Blues", notes: ["C","Eb","F","F#","G","Bb"] },
  { id: "harmonic_minor", label: "Harm. Minor", notes: ["C","D","Eb","F","G","Ab","B"] },
  { id: "dorian", label: "Dorian", notes: ["C","D","Eb","F","G","A","Bb"] },
  { id: "phrygian", label: "Phrygian", notes: ["C","Db","Eb","F","G","Ab","Bb"] },
];

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const VOICE_PRESETS = [
  { name: "Natural", retune: 20, formant: 0, mix: 80 },
  { name: "Hard Tune", retune: 5, formant: 0, mix: 100 },
  { name: "Robot", retune: 1, formant: 30, mix: 100 },
  { name: "Chipmunk", retune: 20, formant: 40, mix: 60 },
  { name: "Deep", retune: 20, formant: -30, mix: 70 },
  { name: "Harmony", retune: 12, formant: 0, mix: 50 },
  { name: "Alien", retune: 3, formant: 50, mix: 90 },
  { name: "Warm", retune: 25, formant: -10, mix: 60 },
];

const NOTE_FREQS: Record<string, number> = {
  "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13, "E": 329.63,
  "F": 349.23, "F#": 369.99, "G": 392.00, "G#": 415.30, "A": 440.00,
  "A#": 466.16, "B": 493.88,
};

export function VocalTuner() {
  const { t } = useTranslation();
  const [scale, setScale] = useState("chromatic");
  const [key, setKey] = useState("C");
  const [retuneSpeed, setRetuneSpeed] = useState(20);
  const [formantShift, setFormantShift] = useState(0);
  const [mix, setMix] = useState(80);
  const [enabled, setEnabled] = useState(false);
  const [inputGain, setInputGain] = useState(0);
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const bpm = useDJStore((s) => s.bpm);

  const currentScale = SCALES.find((s) => s.id === scale);
  const scaleNotes = currentScale?.notes || [];
  const rootFreq = NOTE_FREQS[key] || 440;

  const toggleNote = useCallback((note: string) => {
    setActiveNotes((prev) => prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]);
  }, []);

  const applyPreset = useCallback((preset: typeof VOICE_PRESETS[0]) => {
    setRetuneSpeed(preset.retune);
    setFormantShift(preset.formant);
    setMix(preset.mix);
    setEnabled(true);
  }, []);

  const svgWidth = 320, svgHeight = 200;
  const notePositions: Record<string, number> = {};
  KEYS.forEach((note, i) => { notePositions[note] = (i / KEYS.length) * svgWidth; });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 10, gap: 8, overflow: "auto" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setEnabled(!enabled)}
          style={{ padding: "4px 14px", borderRadius: 4, fontSize: 9, fontWeight: 600, letterSpacing: 0.5, border: "none", cursor: "pointer", background: enabled ? ACCENT : STRIP, color: "#FFF" }}>
          {enabled ? "🟢 AUTO-TUNE ON" : "⚪ AUTO-TUNE OFF"}
        </button>
        <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: FONT_MONO }}>BPM: {bpm}</span>
      </div>

      {/* Pitch Graph */}
      <div style={{ background: STRIP, borderRadius: 6, border: `1px solid ${BORDER}`, padding: 8, position: "relative" }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
          <defs>
            <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {KEYS.map((note, i) => {
            const x = (i / KEYS.length) * svgWidth;
            const isBlack = note.includes("#");
            return <g key={note}>
              <line x1={x} y1={0} x2={x} y2={svgHeight} stroke={isBlack ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)"} strokeWidth={0.5} />
              <text x={x + 4} y={svgHeight - 4} fill={isBlack ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)"} fontSize={7} fontFamily={FONT_MONO}>{note}</text>
            </g>;
          })}
          {/* Center line */}
          <line x1={0} y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke={ACCENT} strokeWidth={0.5} strokeDasharray="3,2" opacity={0.5} />
          {/* Active note markers */}
          {activeNotes.map((note) => {
            const x = notePositions[note] || 0;
            return <g key={note}>
              <rect x={x - 6} y={svgHeight / 2 - 10} width={12} height={20} rx={3} fill={ACCENT} opacity={0.6} />
              <text x={x} y={svgHeight / 2 + 3} textAnchor="middle" fill="#FFF" fontSize={7} fontFamily={FONT_MONO}>{note}</text>
            </g>;
          })}
          {/* Input waveform placeholder */}
          <path d="M0,100 Q40,60 80,100 T160,100 T240,100 T320,100" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        </svg>
      </div>

      {/* Controls Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* Scale Select */}
        <div><label style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>
          SCALE <span style={{ color: ACCENT }}>▼</span>
        </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 3 }}>
            {SCALES.slice(0, 6).map((s) => (
              <button key={s.id} onClick={() => setScale(s.id)}
                style={{ padding: "2px 8px", borderRadius: 3, fontSize: 8, border: "none", cursor: "pointer", background: scale === s.id ? ACCENT : STRIP, color: scale === s.id ? "#FFF" : TEXT_DIM }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Select */}
        <div><label style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>
          KEY <span style={{ color: ACCENT }}>▼</span>
        </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 3 }}>
            {KEYS.map((k) => {
              const inScale = scaleNotes.includes(k);
              return <button key={k} onClick={() => setKey(k)}
                style={{ width: 22, height: 18, borderRadius: 2, fontSize: 7, border: "none", cursor: "pointer", background: key === k ? ACCENT : inScale ? "rgba(192,0,24,0.15)" : STRIP, color: key === k ? "#FFF" : inScale ? ACCENT : TEXT_DIM, fontWeight: inScale ? 600 : 400 }}>
                {k.replace("#", "♯")}
              </button>;
            })}
          </div>
        </div>
      </div>

      {/* Scale Notes Display + Toggle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>ALLOWED NOTES</span>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {KEYS.map((note) => {
            const inScale = scaleNotes.includes(note);
            const isActive = activeNotes.includes(note);
            return <button key={note} onClick={() => toggleNote(note)}
              style={{ width: 24, height: 20, borderRadius: 2, fontSize: 7, border: "none", cursor: "pointer", background: isActive ? ACCENT : inScale ? "rgba(192,0,24,0.12)" : STRIP, color: isActive ? "#FFF" : inScale ? ACCENT : TEXT_DIM, fontWeight: inScale ? 600 : 400, opacity: inScale ? 1 : 0.4 }}>
              {note.replace("#", "♯")}
            </button>;
          })}
        </div>
      </div>

      {/* Knobs Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 4 }}>
        {[
          { label: "RETUNE SPEED", value: retuneSpeed, set: setRetuneSpeed, min: 1, max: 100, unit: "ms" },
          { label: "FORMANT", value: formantShift, set: setFormantShift, min: -50, max: 50, unit: "%" },
          { label: "MIX", value: mix, set: setMix, min: 0, max: 100, unit: "%" },
        ].map((knob) => (
          <div key={knob.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>{knob.label}</span>
            <div style={{ position: "relative", width: 48, height: 48 }}>
              <svg width={48} height={48}>
                <circle cx={24} cy={24} r={20} fill="none" stroke={STRIP} strokeWidth={4} />
                <circle cx={24} cy={24} r={20} fill="none" stroke={ACCENT} strokeWidth={4}
                  strokeDasharray={`${(knob.value - knob.min) / (knob.max - knob.min) * 125} 125`}
                  transform="rotate(-90, 24, 24)" strokeLinecap="round" />
                <circle cx={24} cy={24} r={14} fill={STRIP} />
                <text x={24} y={27} textAnchor="middle" fill="#FFF" fontSize={10} fontFamily={FONT_MONO}>{knob.value}</text>
              </svg>
            </div>
            <input type="range" min={knob.min} max={knob.max} value={knob.value}
              onChange={(e) => knob.set(Number(e.target.value))}
              style={{ width: "100%", height: 2, marginTop: 2 }} />
          </div>
        ))}
      </div>

      {/* Input Gain */}
      <div><label style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>INPUT GAIN</label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={inputGain} onChange={(e) => setInputGain(Number(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: FONT_MONO, width: 30, textAlign: "right" }}>{inputGain}%</span>
        </div>
      </div>

      {/* Presets */}
      <div><span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>VOICE PRESETS</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, marginTop: 4 }}>
          {VOICE_PRESETS.map((p) => (
            <button key={p.name} onClick={() => applyPreset(p)}
              style={{ padding: "4px 2px", borderRadius: 4, fontSize: 7, border: `1px solid ${BORDER}`, cursor: "pointer", background: STRIP, color: TEXT_DIM, textAlign: "center" }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

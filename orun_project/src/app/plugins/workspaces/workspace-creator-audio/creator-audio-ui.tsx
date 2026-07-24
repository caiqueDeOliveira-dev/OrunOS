// Shared UI primitives for Creator Audio
import { useState, useRef, useEffect } from "react";
import { TEXT_DIM, FONT_LABEL, FONT_MONO } from "./creator-audio-types";

// ── Animated Level Meter ────────────────────────────────────────────────

export function LevelMeter({ level, width = 6, height = 96 }: { level: number; width?: number; height?: number }) {
  const bars = 12;
  const filled = Math.round(level * bars);
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column-reverse", gap: 1 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const active = i < filled;
        let bg = "rgba(255,255,255,0.04)";
        if (active) {
          if (i >= bars - 2) bg = "#C00018";
          else if (i >= bars - 4) bg = "#D4A017";
          else bg = "#22C55E";
        }
        return (
          <div key={i} style={{ width: "100%", height: `${100 / bars - 1}%`, borderRadius: 1, background: bg, transition: "background 0.06s", boxShadow: active ? `0 0 4px ${bg}30` : "none" }} />
        );
      })}
    </div>
  );
}

export function AnimatedMeter({ baseLevel, width, height }: { baseLevel: number; width?: number; height?: number }) {
  const [level, setLevel] = useState(baseLevel);
  const animRef = useRef<number>(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame++;
      const v = baseLevel * (0.55 + 0.45 * Math.sin(frame * 0.07 + Math.random() * 0.3));
      setLevel(Math.max(0, Math.min(1, v)));
      animRef.current = requestAnimationFrame(tick);
    };
    if (baseLevel > 0.01) tick();
    else setLevel(0);
    return () => cancelAnimationFrame(animRef.current);
  }, [baseLevel]);
  return <LevelMeter level={level} width={width} height={height} />;
}

// ── Knob ───────────────────────────────────────────────────────────────

export function Knob({ value, size = 22, color, label, onChange }: { value: number; size?: number; color: string; label: string; onChange: (v: number) => void }) {
  const rotation = (value - 0.5) * 270;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <button
        onClick={() => onChange(value >= 0.95 ? 0 : Math.min(1, value + 0.05))}
        style={{
          width: size, height: size, borderRadius: "50%",
          background: `conic-gradient(from 225deg, ${color} ${value * 75}%, rgba(255,255,255,0.06) 0)`,
          border: "2px solid rgba(255,255,255,0.1)",
          cursor: "pointer", position: "relative",
          transform: `rotate(${rotation}deg)`,
        }}
      >
        <div style={{ position: "absolute", top: 2, left: "50%", width: 2, height: size * 0.25, background: "#fff", borderRadius: 1, transform: "translateX(-50%)" }} />
      </button>
      {label && <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>}
    </div>
  );
}

// ── Utility ────────────────────────────────────────────────────────────

export function fmt(t: number) {
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

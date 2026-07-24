// SamplePads — 16-pad grid with real audio synthesis
import { useCallback, useRef } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { CATEGORY_COLORS, BORDER, TEXT_MED, TEXT_DIM, FONT_LABEL } from "./creator-audio-types";

// Synthesize a short drum/synth sound via Web Audio
function playSampleSound(category: string, name: string) {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (category === "drums") {
      if (name === "Kick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (name === "Snare") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const filt = ctx.createBiquadFilter();
        filt.type = "highpass";
        filt.frequency.value = 1000;
        src.connect(filt).connect(g).connect(ctx.destination);
        src.start(now);
      } else if (name === "HiHat") {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        const filt = ctx.createBiquadFilter();
        filt.type = "highpass";
        filt.frequency.value = 8000;
        src.connect(filt).connect(g).connect(ctx.destination);
        src.start(now);
      } else {
        // Tom, Clap, Ride, Perc — short noise burst
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        src.connect(g).connect(ctx.destination);
        src.start(now);
      }
    } else if (category === "bass") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const freqMap: Record<string, number> = { "Sub Bass": 55, "Reese": 55, "Acid": 55, "Wobble": 55 };
      osc.frequency.value = freqMap[name] || 55;
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(name === "Wobble" ? 800 : 2000, now);
      if (name === "Wobble") filt.frequency.linearRampToValueAtTime(200, now + 0.4);
      osc.connect(filt).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (category === "synth") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = name === "Pad" ? "sine" : name === "Lead" ? "sawtooth" : "triangle";
      const notes: Record<string, number> = { "Pad": 220, "Lead": 440, "Chord": 330, "Pluck": 660 };
      osc.frequency.value = notes[name] || 440;
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (name === "Pad" ? 0.8 : 0.3));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (name === "Pad" ? 0.8 : 0.3));
    }
    // Auto-close context after sound finishes
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

export function SamplePads() {
  const { t } = useTranslation();
  const samples = useDJStore((s) => s.samples);
  const activeTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const handlePadClick = useCallback((i: number) => {
    const pad = samples[i];
    // Play sound
    playSampleSound(pad.category, pad.name);
    // Visual feedback: briefly mark as active
    useDJStore.setState((s) => ({
      samples: s.samples.map((p, idx) => idx === i ? { ...p, active: true } : p),
    }));
    // Clear previous timer if exists
    const prev = activeTimers.current.get(i);
    if (prev) clearTimeout(prev);
    // Reset after 150ms
    const timer = setTimeout(() => {
      useDJStore.setState((s) => ({
        samples: s.samples.map((p, idx) => idx === i ? { ...p, active: false } : p),
      }));
    }, 150);
    activeTimers.current.set(i, timer);
  }, [samples]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(2, 1fr)", gap: 4, padding: "8px 12px", height: "100%" }}>
      {samples.map((pad, i) => {
        const catColor = CATEGORY_COLORS[pad.category];
        return (
          <button
            key={i}
            onClick={() => handlePadClick(i)}
            style={{
              borderRadius: 4, border: `1px solid ${pad.active ? catColor : BORDER}`,
              background: pad.active ? `${catColor}30` : `${catColor}08`,
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              transition: "all 0.1s",
              boxShadow: pad.active ? `0 0 8px ${catColor}40, inset 0 0 12px ${catColor}20` : "none",
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 600, color: pad.active ? catColor : TEXT_MED, fontFamily: FONT_LABEL }}>{pad.name}</span>
            <span style={{ fontSize: 6, color: TEXT_DIM, fontFamily: FONT_LABEL, textTransform: "uppercase", letterSpacing: 0.5 }}>{pad.category}</span>
          </button>
        );
      })}
    </div>
  );
}

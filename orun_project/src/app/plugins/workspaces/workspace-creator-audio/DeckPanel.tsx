// DeckPanel.tsx — Virtual DJ 2026 Animated Vinyl Turntable, Waveform, Transport, Hot Cues
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { getAudioEngine } from "./audio-engine";
import { PANEL, ACCENT, GREEN, TEXT_DIM, TEXT_MED, TEXT_BRI, BORDER, FONT_MONO, FONT_LABEL } from "./creator-audio-types";

const HOT_CUE_COLORS = ["#C00018", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899", "#F97316"];
const SECONDS_PER_TURN = 3; // Full spin of the record scrubs 3 seconds of audio

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseTime(t: string): number {
  const [mm, ss] = t.split(":").map(Number);
  return (mm || 0) * 60 + (ss || 0);
}

export function DeckPanel({ deck }: { deck: "A" | "B" }) {
  const { t } = useTranslation();
  const data = useDJStore((s) => (deck === "A" ? s.deckA : s.deckB));
  const playingDeck = useDJStore((s) => s.playingDeck);
  const syncOn = useDJStore((s) => s.syncOn);
  const hotCues = useDJStore((s) => (deck === "A" ? s.hotCuesA : s.hotCuesB));
  const isPlaying = playingDeck === deck;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubAngle, setScrubAngle] = useState(0);
  const lastAngleRef = useRef(0);
  const scrubTotalAngleRef = useRef(0);
  const scrubStartPosRef = useRef(0);
  const scrubWasPlayingRef = useRef(false);

  const deckColor = deck === "A" ? ACCENT : "#3B82F6";

  // Update position from engine
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      try {
        const engine = getAudioEngine();
        const state = engine.getDeckState(deck);
        setPosition(state.currentTime);
        const key = deck === "A" ? "deckA" : "deckB";
        useDJStore.setState({ [key]: { ...useDJStore.getState()[key], current: formatTime(state.currentTime) } });
      } catch {}
    }, 100);
    return () => clearInterval(iv);
  }, [isPlaying, deck]);

  // Handle audio import
  const handleImport = useCallback(async () => {
    try {
      let file: File;
      if ((window as any).showOpenFilePicker) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ description: "Audio", accept: { "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".wma"] } }],
        });
        file = await fileHandle.getFile();
      } else {
        file = await new Promise<File>((resolve, reject) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "audio/*";
          input.onchange = () => {
            const f = input.files?.[0];
            if (f) resolve(f);
            else reject(new Error("No file selected"));
          };
          input.click();
        });
      }
      const arrayBuffer = await file.arrayBuffer();
      const engine = getAudioEngine();
      const ctx = engine.getCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const result = engine.loadBufferForDeck(deck, audioBuffer);
      const key = deck === "A" ? "deckA" : "deckB";
      const dur = audioBuffer.duration;
      const mm = String(Math.floor(dur / 60)).padStart(2, "0");
      const ss = String(Math.floor(dur % 60)).padStart(2, "0");
      useDJStore.setState({
        [key]: {
          ...useDJStore.getState()[key],
          track: file.name.replace(/\.[^.]+$/, ""),
          artist: "Imported",
          total: `${mm}:${ss}`,
          current: "00:00",
          loaded: true,
          waveformData: result.waveformData,
          bpm: 128,
        },
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") console.warn("[DeckPanel] Import failed:", err);
    }
  }, [deck]);

  // Play/Pause
  const togglePlay = useCallback(() => {
    try {
      const engine = getAudioEngine();
      if (isPlaying) {
        engine.pauseDeck(deck);
        useDJStore.setState({ playingDeck: null });
      } else {
        const bpm = useDJStore.getState()[deck === "A" ? "deckA" : "deckB"].bpm;
        const baseBpm = 128;
        const playbackRate = bpm / baseBpm;
        engine.playDeck(deck, playbackRate);
        useDJStore.setState({ playingDeck: deck });
      }
    } catch {}
  }, [isPlaying, deck]);

  const toggleSync = useCallback(() => useDJStore.setState({ syncOn: !syncOn }), [syncOn]);
  const setPitch = useCallback((v: number) => {
    const state = useDJStore.getState();
    const key = deck === "A" ? "deckA" : "deckB";
    useDJStore.setState({ [key]: { ...(state[key] as typeof data), pitch: v } });
  }, [deck, data]);
  const setBpm = useCallback((v: number) => {
    const state = useDJStore.getState();
    const key = deck === "A" ? "deckA" : "deckB";
    useDJStore.setState({ [key]: { ...(state[key] as typeof data), bpm: Math.max(60, Math.min(200, v)) } });
  }, [deck, data]);
  const setCue = useCallback(() => {
    useDJStore.setState({ [deck === "A" ? "cuePointA" : "cuePointB"]: position });
  }, [deck, position]);
  const toggleHotCue = useCallback((i: number) => {
    const key = deck === "A" ? "hotCuesA" : "hotCuesB";
    const current = [...(useDJStore.getState()[key] as (number | null)[])];
    current[i] = current[i] !== null ? null : position;
    useDJStore.setState({ [key]: current });
  }, [deck, position]);

  // ── Vinyl disc drag-to-scrub ─────────────────────────────────────────
  const getDiscAngle = useCallback((e: React.PointerEvent | React.MouseEvent): number => {
    const el = discRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
  }, []);

  const onDiscPointerDown = useCallback((e: React.PointerEvent) => {
    if (!data.loaded) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const engine = getAudioEngine();
    const state = engine.getDeckState(deck);
    const startAngle = getDiscAngle(e);
    lastAngleRef.current = startAngle;
    scrubTotalAngleRef.current = 0;
    scrubStartPosRef.current = state.currentTime;
    scrubWasPlayingRef.current = state.playing;
    setScrubbing(true);
    setScrubAngle(0);
    if (state.playing) {
      engine.pauseDeck(deck);
      useDJStore.setState({ playingDeck: null });
    }
  }, [data.loaded, deck, getDiscAngle]);

  const onDiscPointerMove = useCallback((e: React.PointerEvent) => {
    if (!scrubbing) return;
    e.preventDefault();
    const newAngle = getDiscAngle(e);
    let step = newAngle - lastAngleRef.current;
    if (step > 180) step -= 360;
    if (step < -180) step += 360;
    lastAngleRef.current = newAngle;
    scrubTotalAngleRef.current += step;
    setScrubAngle(scrubTotalAngleRef.current);
    try {
      const engine = getAudioEngine();
      const target = scrubStartPosRef.current + (scrubTotalAngleRef.current / 360) * SECONDS_PER_TURN;
      const res = engine.seekDeck(deck, target);
      if (res.success) {
        setPosition(res.currentTime);
        const key = deck === "A" ? "deckA" : "deckB";
        useDJStore.setState({ [key]: { ...useDJStore.getState()[key], current: formatTime(res.currentTime) } });
      }
    } catch {}
  }, [scrubbing, deck, getDiscAngle]);

  const endDiscScrub = useCallback(() => {
    if (!scrubbing) return;
    setScrubbing(false);
    setScrubAngle(0);
    if (scrubWasPlayingRef.current) {
      try {
        const engine = getAudioEngine();
        const bpm = useDJStore.getState()[deck === "A" ? "deckA" : "deckB"].bpm;
        engine.playDeck(deck, bpm / 128);
        useDJStore.setState({ playingDeck: deck });
      } catch {}
    }
  }, [scrubbing, deck]);

  const onDiscPointerUp = useCallback(() => endDiscScrub(), [endDiscScrub]);
  const onDiscPointerCancel = useCallback(() => endDiscScrub(), [endDiscScrub]);

  const bars = 100;
  const waveformData = data.waveformData;
  const hasRealWaveform = waveformData.length > 0;

  const totalSec = parseTime(data.total) || 1;
  const curSec = parseTime(data.current);
  const progress = Math.max(0, Math.min(1, curSec / totalSec));
  const discSize = 132;
  const ringR = discSize / 2 - 4;
  const ringC = 2 * Math.PI * ringR;
  const discAnimation = isPlaying
    ? "vinylSpin 2.4s linear infinite"
    : data.loaded
      ? "vinylCoast 9s linear infinite"
      : "none";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRadius: 10, background: "linear-gradient(180deg, #131722 0%, #0B0E14 100%)", border: `1px solid ${deckColor}35`, boxShadow: `0 0 20px ${deckColor}10`, padding: "10px 12px", overflow: "hidden", minHeight: 0, position: "relative" }}>
      <style>{`
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes vinylCoast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.8; }
        }
      `}</style>
      <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleImport as any} />

      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: deckColor, fontFamily: FONT_LABEL, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, textShadow: `0 0 10px ${deckColor}60` }}>
            DECK {deck}
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isPlaying ? GREEN : "rgba(255,255,255,0.15)", boxShadow: isPlaying ? `0 0 8px ${GREEN}` : "none", animation: isPlaying ? "glowPulse 1.2s ease-in-out infinite" : "none" }} />
          </span>
          <span style={{ fontSize: 11, color: "#fff", background: `${deckColor}25`, border: `1px solid ${deckColor}50`, padding: "1px 6px", borderRadius: 4, fontFamily: FONT_MONO, fontWeight: 700 }}>
            {data.key || "1A"}
          </span>
          <span style={{ fontSize: 11, color: GREEN, fontFamily: FONT_MONO, fontWeight: 600 }}>{data.bpm} BPM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: TEXT_DIM, fontFamily: FONT_MONO }}>Pitch: {data.pitch >= 0 ? `+${data.pitch.toFixed(1)}` : data.pitch.toFixed(1)}%</span>
          <button onClick={handleImport} title={t("creator_audio_import") || "Import"} style={{ height: 20, padding: "0 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.08)", color: TEXT_BRI, cursor: "pointer", fontSize: 9, fontFamily: FONT_LABEL, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
            <span>📂</span> {t("creator_audio_import") || "Import"}
          </button>
        </div>
      </div>

      {/* Main Deck Center: Animated Vinyl Turntable + Track Info */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px" }}>
        {/* Interactive Animated Vinyl Disc */}
        <div
          ref={discRef}
          onPointerDown={onDiscPointerDown}
          onPointerMove={onDiscPointerMove}
          onPointerUp={onDiscPointerUp}
          onPointerCancel={onDiscPointerCancel}
          title={data.loaded ? "Gire o disco: para frente avança, para trás volta a música" : "Carregue um áudio para girar o disco"}
          style={{ position: "relative", width: discSize, height: discSize, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: data.loaded ? (scrubbing ? "grabbing" : "grab") : "default", touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
        >
          {/* Metallic Platter Outer Rim */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(#3a3f4a 0deg, #1a1a1a 90deg, #4a4f5a 180deg, #1a1a1a 270deg, #3a3f4a 360deg)", border: `2px solid ${deckColor}50`, boxShadow: isPlaying ? `0 0 22px ${deckColor}55` : scrubbing ? `0 0 18px ${deckColor}40` : "0 6px 16px rgba(0,0,0,0.85)" }} />
          {/* Progress Ring */}
          <svg width={discSize} height={discSize} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", pointerEvents: "none", zIndex: 3 }}>
            <circle cx={discSize / 2} cy={discSize / 2} r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
            <circle
              cx={discSize / 2} cy={discSize / 2} r={ringR} fill="none"
              stroke={deckColor} strokeWidth={3} strokeLinecap="round"
              strokeDasharray={ringC} strokeDashoffset={ringC * (1 - progress)}
              style={{ filter: `drop-shadow(0 0 4px ${deckColor})`, transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
          {/* Spinning Record */}
          <div style={{
            position: "absolute", inset: 5, borderRadius: "50%",
            background: "radial-gradient(circle, #23262e 0%, #14161c 25%, #0a0b0f 45%, #1c1e26 50%, #0d0e13 70%, #000 100%)",
            animation: scrubbing ? "none" : discAnimation,
            transform: scrubbing ? `rotate(${scrubAngle}deg)` : "none",
            boxShadow: "inset 0 0 10px rgba(255,255,255,0.12)",
            willChange: "transform",
          }}>
            {/* Vinyl Micro Grooves Ring */}
            <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", inset: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)" }} />
            <div style={{ position: "absolute", inset: 34, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.05)" }} />
            {/* Vinyl sheen reflection */}
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 40%)", pointerEvents: "none" }} />
            {/* Center Sticker Label */}
            <div style={{
              position: "absolute", inset: 34, borderRadius: "50%",
              background: `radial-gradient(circle, ${deckColor} 0%, ${deckColor}dd 55%, #111 100%)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: "2px solid #000", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)", overflow: "hidden",
            }}>
              <span style={{ fontSize: 10, fontWeight: 900, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{deck}</span>
              <span style={{ fontSize: 6, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px", opacity: 0.9, fontFamily: FONT_MONO }}>
                {data.loaded ? (data.track || "LOADED") : "EMPTY"}
              </span>
            </div>
            {/* Spindle Hole */}
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, borderRadius: "50%", background: "#e5e7eb", transform: "translate(-50%, -50%)", border: "1px solid #000", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)", zIndex: 2 }} />
          </div>
          {/* Tonearm Arm & Needle */}
          <div style={{ position: "absolute", top: -2, right: -6, width: 42, height: 50, pointerEvents: "none", zIndex: 5, transform: isPlaying ? "rotate(20deg)" : "rotate(0deg)", transformOrigin: "top right", transition: "transform 0.4s ease-in-out" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: "#4a4f5a", border: "1px solid #8890a0", boxShadow: "0 0 6px rgba(0,0,0,0.8)" }} />
            <div style={{ position: "absolute", top: 7, right: 5, width: 2, height: 36, background: "linear-gradient(to bottom, #8890a0, #d7dbe4)", transform: "rotate(-20deg)", transformOrigin: "top right" }} />
            <div style={{ position: "absolute", bottom: 2, left: 4, width: 6, height: 9, background: deckColor, borderRadius: 1, boxShadow: `0 0 6px ${deckColor}` }} />
          </div>
        </div>

        {/* Track Title & Time Details */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 13, color: TEXT_BRI, fontFamily: FONT_MONO, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.track || t("creator_audio_none") || "Nenhum arquivo carregado"}
          </div>
          <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: FONT_LABEL }}>
            {data.artist || "Virtual DJ Engine"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 16, color: isPlaying ? GREEN : TEXT_MED, fontFamily: FONT_MONO, fontWeight: 700, textShadow: isPlaying ? `0 0 8px ${GREEN}60` : "none" }}>
              {data.current}
            </span>
            <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: FONT_MONO }}>/ {data.total}</span>
          </div>
          {data.loaded && (
            <div style={{ fontSize: 8, color: scrubbing ? deckColor : TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>
              {scrubbing ? (scrubAngle < 0 ? "↩ VOLTANDO A MÚSICA" : "↪ AVANÇANDO") : "Gire o disco: → avança · ← volta"}
            </div>
          )}
        </div>
      </div>

      {/* Waveform Visualizer */}
      <div style={{ flex: 1, borderRadius: 6, background: "rgba(5, 7, 12, 0.85)", border: `1px solid ${deckColor}30`, overflow: "hidden", display: "flex", alignItems: "center", gap: 0.5, padding: "0 4px", position: "relative", minHeight: 55, marginBottom: 6 }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "#FFF", zIndex: 2, boxShadow: `0 0 8px #FFF` }} />
        {hasRealWaveform ? (
          waveformData.map((h, i) => (
            <div key={i} style={{ width: `${100 / bars}%`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 0.5 }}>
              <div style={{ width: "70%", height: `${(h * 100) / 2}%`, background: `linear-gradient(to top, ${deckColor}, ${deckColor}dd)`, borderRadius: 1 }} />
              <div style={{ width: "70%", height: `${(h * 100) / 2}%`, background: `linear-gradient(to bottom, ${deckColor}bb, ${deckColor}40)`, borderRadius: 1 }} />
            </div>
          ))
        ) : (
          Array.from({ length: bars }).map((_, i) => {
            const seed = i * 0.22;
            const h = 15 + Math.abs(Math.sin(seed) * Math.cos(seed * 0.5 + i * 0.08)) * 85;
            return (
              <div key={i} style={{ width: `${100 / bars}%`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 0.5 }}>
                <div style={{ width: "70%", height: `${h / 2}%`, background: isPlaying ? `${deckColor}a0` : `${deckColor}40`, borderRadius: 1 }} />
                <div style={{ width: "70%", height: `${h / 2}%`, background: isPlaying ? `${deckColor}60` : `${deckColor}20`, borderRadius: 1 }} />
              </div>
            );
          })
        )}
      </div>

      {/* Track Position Progress Bar */}
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: deckColor,
            borderRadius: 2,
            boxShadow: `0 0 6px ${deckColor}`,
          }}
        />
      </div>

      {/* BPM + Pitch Sliders */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "rgba(0,0,0,0.25)", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button onClick={() => setBpm(data.bpm - 1)} style={{ width: 18, height: 18, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.1)", color: TEXT_BRI, cursor: "pointer", fontSize: 10, fontFamily: FONT_MONO, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <input type="number" value={data.bpm} onChange={(e) => setBpm(Number(e.target.value))} min={60} max={200} style={{ width: 42, height: 18, background: "rgba(0,0,0,0.6)", border: `1px solid ${deckColor}50`, borderRadius: 3, color: GREEN, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, textAlign: "center", padding: 0, outline: "none" }} />
            <button onClick={() => setBpm(data.bpm + 1)} style={{ width: 18, height: 18, borderRadius: 3, border: "none", background: "rgba(255,255,255,0.1)", color: TEXT_BRI, cursor: "pointer", fontSize: 10, fontFamily: FONT_MONO, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
          <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>BPM</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
          <input type="range" min={-800} max={800} value={data.pitch * 100} onChange={(e) => setPitch(Number(e.target.value) / 100)} style={{ width: "100%", height: 5, accentColor: deckColor, cursor: "pointer" }} />
          <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>PITCH FADER</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <button onClick={toggleSync} style={{ flex: 1, height: 26, borderRadius: 4, border: "none", fontSize: 9, fontFamily: FONT_LABEL, fontWeight: 800, cursor: "pointer", background: syncOn ? "#8B5CF6" : "rgba(255,255,255,0.08)", color: syncOn ? "#fff" : TEXT_DIM, boxShadow: syncOn ? "0 0 10px #8B5CF680" : "none", transition: "all 0.15s" }}>
          SYNC
        </button>
        <button onClick={setCue} style={{ flex: 1, height: 26, borderRadius: 4, border: "none", fontSize: 9, fontFamily: FONT_LABEL, fontWeight: 800, cursor: "pointer", background: "rgba(255,255,255,0.08)", color: TEXT_BRI, transition: "all 0.15s" }}>
          CUE
        </button>
        <button onClick={togglePlay} style={{ flex: 1.5, height: 26, borderRadius: 4, border: "none", fontSize: 12, fontFamily: FONT_LABEL, fontWeight: 800, cursor: "pointer", background: isPlaying ? GREEN : deckColor, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, boxShadow: isPlaying ? `0 0 14px ${GREEN}` : `0 0 10px ${deckColor}80`, transition: "all 0.15s" }}>
          {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
        </button>
      </div>

      {/* Hot Cue Pads */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
        {HOT_CUE_COLORS.map((c, i) => {
          const isSet = hotCues[i] !== null;
          return (
            <button key={i} onClick={() => toggleHotCue(i)} style={{ height: 20, borderRadius: 3, border: isSet ? `1px solid ${c}` : "1px solid rgba(255,255,255,0.06)", background: isSet ? c : `${c}20`, cursor: "pointer", fontSize: 8, fontFamily: FONT_MONO, fontWeight: 700, color: isSet ? "#FFF" : c, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isSet ? `0 0 8px ${c}` : "none", transition: "all 0.15s" }}>
              CUE {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

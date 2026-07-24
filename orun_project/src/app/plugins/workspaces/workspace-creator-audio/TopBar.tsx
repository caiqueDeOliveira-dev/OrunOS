// TopBar — Transport controls, tempo, BPM, deck info, tap
import { useCallback } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { BG, ACCENT, GREEN, TEXT_DIM, TEXT_MED, BORDER_MED, FONT_LABEL, FONT_MONO } from "./creator-audio-types";

export function TopBar() {
  const { t } = useTranslation();
  const isPlaying = useDJStore((s) => s.isPlaying);
  const isRecording = useDJStore((s) => s.isRecording);
  const bpm = useDJStore((s) => s.bpm);
  const deckA = useDJStore((s) => s.deckA);
  const deckB = useDJStore((s) => s.deckB);

  const btn = useCallback((active = false, accent?: string): React.CSSProperties => ({
    height: 26, padding: "0 10px", borderRadius: 3, border: "none",
    fontSize: 10, fontFamily: FONT_LABEL, fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    background: active && accent ? accent : "rgba(255,255,255,0.05)",
    color: active && accent ? "#fff" : TEXT_MED,
    transition: "all 0.1s",
  }), []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const times = [...useDJStore.getState().tapTimes, now].filter((t) => now - t < 4000);
    if (times.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < times.length; i++) diffs.push(times[i] - times[i - 1]);
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const newBpm = Math.round(60000 / avg);
      useDJStore.setState({ bpm: Math.max(60, Math.min(200, newBpm)), tapTimes: times });
    } else {
      useDJStore.setState({ tapTimes: times });
    }
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: BG, borderBottom: `1px solid ${BORDER_MED}`, flexShrink: 0 }}>
      {/* Transport */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <button style={{ ...btn(isPlaying, GREEN), width: 26, padding: 0, fontSize: 11 }} onClick={() => useDJStore.setState({ isPlaying: !isPlaying })}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button style={{ ...btn(false), width: 26, padding: 0, fontSize: 11 }} onClick={() => useDJStore.setState({ isPlaying: false })}>
          ⏹
        </button>
        <button style={btn(isRecording, ACCENT)} onClick={() => useDJStore.setState({ isRecording: !isRecording })}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isRecording ? ACCENT : TEXT_DIM, display: "inline-block", animation: isRecording ? "pulse 1s infinite" : "none" }} />
          {t("creator_audio_rec")}
        </button>
      </div>

      <div style={{ width: 1, height: 18, background: BORDER_MED }} />

      {/* Tempo controls */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <button style={{ ...btn(), width: 22, padding: 0, fontSize: 12, fontWeight: 700 }} onClick={() => useDJStore.setState({ bpm: Math.max(60, bpm - 1) })}>−</button>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_tempo")}</span>
        <button style={{ ...btn(), width: 22, padding: 0, fontSize: 12, fontWeight: 700 }} onClick={() => useDJStore.setState({ bpm: Math.min(200, bpm + 1) })}>+</button>
      </div>

      <div style={{ width: 1, height: 18, background: BORDER_MED }} />

      {/* BPM display */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_bpm")}</span>
        <span style={{ fontSize: 16, fontFamily: FONT_MONO, fontWeight: 700, color: GREEN }}>{bpm}</span>
      </div>

      <div style={{ width: 1, height: 18, background: BORDER_MED }} />

      {/* Deck info */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
          <span style={{ fontSize: 9, color: TEXT_MED, fontFamily: FONT_MONO }}>A: {deckA.track || t("creator_audio_none")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6" }} />
          <span style={{ fontSize: 9, color: TEXT_MED, fontFamily: FONT_MONO }}>B: {deckB.track || t("creator_audio_none")}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Tap tempo */}
      <button style={btn(false)} onClick={handleTap}>
        TAP
      </button>

      {/* Sample rate / bit depth */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL }}>44.1kHz</span>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL }}>24bit</span>
      </div>

      <div style={{ width: 1, height: 18, background: BORDER_MED }} />

      {/* Export */}
      <button style={btn(false)} onClick={() => {
        const { getAudioEngine } = require("./audio-engine");
        try {
          const engine = getAudioEngine();
          const buf = engine.getCurrentBuffer?.();
          if (!buf) return;
          const numChannels = buf.numberOfChannels;
          const sampleRate = buf.sampleRate;
          const bitDepth = 16;
          const bytesPerSample = bitDepth / 8;
          const blockAlign = numChannels * bytesPerSample;
          const dataLength = buf.length * blockAlign;
          const totalLength = 44 + dataLength;
          const arrayBuffer = new ArrayBuffer(totalLength);
          const view = new DataView(arrayBuffer);
          const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
          writeStr(0, "RIFF"); view.setUint32(4, totalLength - 8, true); writeStr(8, "WAVE");
          writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
          view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
          view.setUint16(34, bitDepth, true); writeStr(36, "data"); view.setUint32(40, dataLength, true);
          let offset = 44;
          for (let i = 0; i < buf.length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
              const sample = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]));
              view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
              offset += 2;
            }
          }
          const blob = new Blob([arrayBuffer], { type: "audio/wav" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `orun-audio-${Date.now()}.wav`;
          link.click();
          URL.revokeObjectURL(link.href);
        } catch {}
      }}>
        {t("creator_audio_export") || "Exportar"}
      </button>
    </div>
  );
}

// RecordingPanel — Record button, format, quality, export/import
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { fmt } from "./creator-audio-ui";
import { ACCENT, GREEN, BORDER, TEXT_DIM, TEXT_MED, FONT_LABEL, FONT_MONO } from "./creator-audio-types";

export function RecordingPanel() {
  const { t } = useTranslation();
  const isRecording = useDJStore((s) => s.isRecording);
  const recordTime = useDJStore((s) => s.recordTime);
  const recordFormat = useDJStore((s) => s.recordFormat);
  const recordQuality = useDJStore((s) => s.recordQuality);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Increment recordTime while recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        useDJStore.setState((s) => ({ recordTime: s.recordTime + 1 }));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const toggleRecord = useCallback(() => {
    useDJStore.setState((s) => ({ isRecording: !s.isRecording, recordTime: s.isRecording ? s.recordTime : 0 }));
  }, []);

  const handleExport = useCallback(() => {
    const format = useDJStore.getState().recordFormat;
    const ext = format === "MP3" ? "mp3" : format === "FLAC" ? "flac" : "wav";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([""], { type: `audio/${ext}` }));
    link.download = `mix-${Date.now()}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{ description: "Audio", accept: { "audio/*": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"] } }],
        multiple: false,
      });
      const file = await fileHandle.getFile();
      useDJStore.setState({ deckA: { ...useDJStore.getState().deckA, track: file.name.replace(/\.[^.]+$/, ""), artist: t("creator_audio_imported") } });
    } catch {}
  }, [t]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "8px 16px", height: "100%" }}>
      {/* Record button */}
      <button onClick={toggleRecord} style={{ width: 40, height: 40, borderRadius: "50%", background: isRecording ? ACCENT : "rgba(255,255,255,0.06)", border: `2px solid ${isRecording ? ACCENT : "rgba(255,255,255,0.1)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? `0 0 16px ${ACCENT}60` : "none", transition: "all 0.15s" }}>
        <div style={{ width: 14, height: 14, borderRadius: isRecording ? 3 : "50%", background: "#fff", transition: "border-radius 0.15s" }} />
      </button>

      {/* Time display */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1, textTransform: "uppercase" }}>{isRecording ? t("creator_audio_recording_status") : t("creator_audio_ready")}</span>
        <span style={{ fontSize: 20, color: isRecording ? ACCENT : TEXT_MED, fontFamily: FONT_MONO, fontWeight: 700, letterSpacing: 2 }}>{fmt(recordTime)}</span>
      </div>

      <div style={{ width: 1, height: 40, background: BORDER }} />

      {/* Format selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5, textTransform: "uppercase" }}>{t("creator_audio_format")}</span>
        <div style={{ display: "flex", gap: 3 }}>
          {(["WAV", "MP3", "FLAC"] as const).map((f) => (
            <button key={f} onClick={() => useDJStore.setState({ recordFormat: f })} style={{ height: 20, padding: "0 8px", borderRadius: 3, border: "none", fontSize: 8, fontFamily: FONT_MONO, fontWeight: 600, cursor: "pointer", background: recordFormat === f ? ACCENT : "rgba(255,255,255,0.06)", color: recordFormat === f ? "#fff" : TEXT_DIM, transition: "all 0.1s" }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Quality selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5, textTransform: "uppercase" }}>{t("creator_audio_quality")}</span>
        <div style={{ display: "flex", gap: 3 }}>
          {(["Baixa", "Média", "Alta"] as const).map((q) => (
            <button key={q} onClick={() => useDJStore.setState({ recordQuality: q })} style={{ height: 20, padding: "0 8px", borderRadius: 3, border: "none", fontSize: 8, fontFamily: FONT_LABEL, fontWeight: 600, cursor: "pointer", background: recordQuality === q ? GREEN : "rgba(255,255,255,0.06)", color: recordQuality === q ? "#000" : TEXT_DIM, transition: "all 0.1s" }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: 1, height: 40, background: BORDER }} />

      {/* Export / Import buttons */}
      <button style={{ height: 30, padding: "0 14px", borderRadius: 4, border: "none", fontSize: 9, fontFamily: FONT_LABEL, fontWeight: 600, cursor: "pointer", background: GREEN, color: "#000", letterSpacing: 0.5, textTransform: "uppercase" }} onClick={handleExport}>
        {t("creator_audio_export")}
      </button>
      <button style={{ height: 30, padding: "0 14px", borderRadius: 4, border: `1px solid ${BORDER}`, fontSize: 9, fontFamily: FONT_LABEL, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.06)", color: TEXT_MED, letterSpacing: 0.5, textTransform: "uppercase" }} onClick={handleImport}>
        {t("creator_audio_import")}
      </button>
    </div>
  );
}

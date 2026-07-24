// BottomBar — Recording status, meters, master volume, crossfader, headphone cue
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { AnimatedMeter, Knob, fmt } from "./creator-audio-ui";
import { ACCENT, GREEN, BORDER, TEXT_DIM, FONT_LABEL, FONT_MONO, CHANNEL_COLORS } from "./creator-audio-types";

export function BottomBar() {
  const { t } = useTranslation();
  const masterVolume = useDJStore((s) => s.masterVolume);
  const crossfader = useDJStore((s) => s.crossfader);
  const cueMix = useDJStore((s) => s.cueMix);
  const headphoneVolume = useDJStore((s) => s.headphoneVolume);
  const isRecording = useDJStore((s) => s.isRecording);
  const recordTime = useDJStore((s) => s.recordTime);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "6px 12px", background: "var(--background, #0A0E17)", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
      {/* Recording status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 90 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isRecording ? ACCENT : "rgba(255,255,255,0.1)", boxShadow: isRecording ? `0 0 6px ${ACCENT}80` : "none" }} />
        <span style={{ fontSize: 10, color: isRecording ? ACCENT : TEXT_DIM, fontFamily: FONT_MONO, fontWeight: isRecording ? 700 : 400 }}>{fmt(recordTime)}</span>
      </div>

      <div style={{ width: 1, height: 24, background: BORDER }} />

      {/* Master L/R meters */}
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
        <AnimatedMeter baseLevel={masterVolume * 0.88} width={5} height={28} />
        <AnimatedMeter baseLevel={masterVolume * 0.82} width={5} height={28} />
      </div>
      <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL }}>L/R</span>

      {/* Master volume */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_master")}</span>
        <span style={{ fontSize: 13, color: GREEN, fontFamily: FONT_MONO, fontWeight: 700 }}>{Math.round(masterVolume * 100)}%</span>
      </div>

      {/* Master volume slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type="range" min={0} max={100} value={Math.round(masterVolume * 100)} onChange={(e) => useDJStore.setState({ masterVolume: Number(e.target.value) / 100 })} style={{ width: 80, height: 4, accentColor: GREEN, cursor: "pointer" }} />
      </div>

      <div style={{ width: 1, height: 24, background: BORDER }} />

      {/* Crossfader */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1, maxWidth: 200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontSize: 8, color: ACCENT, fontFamily: FONT_LABEL, fontWeight: 600 }}>A</span>
          <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_crossfader")}</span>
          <span style={{ fontSize: 8, color: "#3B82F6", fontFamily: FONT_LABEL, fontWeight: 600 }}>B</span>
        </div>
        <input type="range" min={0} max={100} value={Math.round((crossfader + 1) * 50)} onChange={(e) => useDJStore.setState({ crossfader: (Number(e.target.value) / 50) - 1 })} style={{ width: "100%", height: 4, accentColor: ACCENT, cursor: "pointer" }} />
      </div>

      <div style={{ width: 1, height: 24, background: BORDER }} />

      {/* Headphone cue */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_cue_mix")}</span>
        <Knob value={cueMix} size={18} color="#D4A017" label="" onChange={(v) => useDJStore.setState({ cueMix: v })} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1 }}>{t("creator_audio_headphones")}</span>
        <Knob value={headphoneVolume} size={18} color="#8B5CF6" label="" onChange={(v) => useDJStore.setState({ headphoneVolume: v })} />
      </div>

      <div style={{ width: 1, height: 24, background: BORDER }} />

      {/* Active channels indicator */}
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        <span style={{ fontSize: 7, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5 }}>CH</span>
        {CHANNEL_COLORS.map((c, i) => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />
        ))}
      </div>
    </div>
  );
}

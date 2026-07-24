// MixerCenter.tsx — Virtual DJ 2026 Center Mixer with Neon VU Meters, Faders, EQ, Crossfader
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { Knob } from "./creator-audio-ui";
import { ChannelStrip } from "./ChannelStrip";
import { STRIP, GREEN, TEXT_DIM, TEXT_BRI, BORDER, BORDER_MED, FONT_LABEL, FONT_MONO, ACCENT } from "./creator-audio-types";

export function MixerCenter() {
  const { t } = useTranslation();
  const channels = useDJStore((s) => s.channels);
  const masterVolume = useDJStore((s) => s.masterVolume);
  const crossfader = useDJStore((s) => s.crossfader);

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRadius: 10, background: "linear-gradient(180deg, #181C28 0%, #0E111A 100%)", border: `1px solid rgba(255,255,255,0.08)`, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden", minWidth: 0, flex: 1 }}>
      {/* Mixer header */}
      <div style={{ padding: "6px 8px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)" }}>
        <span style={{ fontSize: 9, color: GREEN, fontFamily: FONT_MONO, fontWeight: 700 }}>NEON VU METERS</span>
        <span style={{ fontSize: 9, color: TEXT_BRI, fontFamily: FONT_LABEL, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800 }}>
          {t("creator_audio_mixer") || "MIXER CONSOLE 2026"}
        </span>
        <span style={{ fontSize: 9, color: ACCENT, fontFamily: FONT_MONO, fontWeight: 700 }}>4 CHANNELS</span>
      </div>

      {/* Channel strips */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
        {channels.map((ch) => (
          <ChannelStrip key={ch.id} ch={ch} />
        ))}
      </div>

      {/* Master volume + crossfader */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.4)" }}>
        {/* Master volume & Master Peak Meters */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1.5, fontWeight: 700 }}>MASTER VOL</span>
          <Knob value={masterVolume} size={28} color={GREEN} label="" onChange={(v) => useDJStore.setState({ masterVolume: v })} />
          <span style={{ fontSize: 11, color: GREEN, fontFamily: FONT_MONO, fontWeight: 700, minWidth: 36, textShadow: `0 0 6px ${GREEN}` }}>
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {/* High-Tech Crossfader */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.4)", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: ACCENT, fontFamily: FONT_LABEL, fontWeight: 900, textShadow: `0 0 8px ${ACCENT}` }}>DECK A</span>
            <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 1.5, fontWeight: 700 }}>CROSSFADER</span>
            <span style={{ fontSize: 10, color: "#3B82F6", fontFamily: FONT_LABEL, fontWeight: 900, textShadow: "0 0 8px #3B82F6" }}>DECK B</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((crossfader + 1) * 50)}
            onChange={(e) => useDJStore.setState({ crossfader: (Number(e.target.value) / 50) - 1 })}
            style={{ width: "100%", height: 6, accentColor: crossfader <= 0 ? ACCENT : "#3B82F6", cursor: "pointer" }}
          />
        </div>
      </div>
    </div>
  );
}

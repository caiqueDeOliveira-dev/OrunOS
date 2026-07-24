// ChannelStrip — Single mixer channel: EQ, fader, pan, meters
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { AnimatedMeter, Knob } from "./creator-audio-ui";
import { BORDER, TEXT_DIM, TEXT_BRI, FONT_LABEL, FONT_MONO, type Channel } from "./creator-audio-types";

export function ChannelStrip({ ch }: { ch: Channel }) {
  const { t } = useTranslation();
  const update = (patch: Partial<Channel>) => {
    useDJStore.setState((s) => ({
      channels: s.channels.map((c) => c.id === ch.id ? { ...c, ...patch } : c),
    }));
  };

  return (
    <div style={{ width: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 2px", borderRight: `1px solid ${BORDER}` }}>
      {/* Active dot */}
      <button onClick={() => update({ active: !ch.active })} style={{ width: 8, height: 8, borderRadius: "50%", background: ch.active ? ch.color : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", boxShadow: ch.active ? `0 0 6px ${ch.color}80` : "none", transition: "all 0.15s" }} />
      <span style={{ fontSize: 8, color: ch.active ? TEXT_BRI : TEXT_DIM, fontFamily: FONT_LABEL, letterSpacing: 0.5, fontWeight: 600 }}>{ch.name}</span>

      {/* Solo / Mute */}
      <div style={{ display: "flex", gap: 2 }}>
        <button onClick={() => update({ solo: !ch.solo })} style={{ width: 18, height: 14, borderRadius: 2, fontSize: 7, fontWeight: 700, fontFamily: FONT_LABEL, border: "none", cursor: "pointer", background: ch.solo ? "#3B82F6" : "rgba(255,255,255,0.05)", color: ch.solo ? "#fff" : TEXT_DIM }}>
          {t("creator_audio_solo")}
        </button>
        <button onClick={() => update({ muted: !ch.muted })} style={{ width: 18, height: 14, borderRadius: 2, fontSize: 7, fontWeight: 700, fontFamily: FONT_LABEL, border: "none", cursor: "pointer", background: ch.muted ? "#F59E0B" : "rgba(255,255,255,0.05)", color: ch.muted ? "#000" : TEXT_DIM }}>
          {t("creator_audio_mute")}
        </button>
      </div>

      {/* EQ knobs */}
      <div style={{ display: "flex", gap: 2 }}>
        <Knob value={ch.eqHi} size={20} color="#22C55E" label={t("creator_audio_hi")} onChange={(v) => update({ eqHi: v })} />
        <Knob value={ch.eqMid} size={20} color="#F59E0B" label={t("creator_audio_mid")} onChange={(v) => update({ eqMid: v })} />
        <Knob value={ch.eqLo} size={20} color="#C00018" label={t("creator_audio_lo")} onChange={(v) => update({ eqLo: v })} />
      </div>

      {/* Level meter */}
      <AnimatedMeter baseLevel={ch.active && !ch.muted ? ch.volume * 0.85 : 0} width={6} height={80} />

      {/* Volume fader */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1, minHeight: 60 }}>
        <input type="range" min={0} max={100} value={Math.round(ch.volume * 100)} onChange={(e) => update({ volume: Number(e.target.value) / 100 })} style={{ writingMode: "vertical-lr" as const, direction: "rtl" as const, width: 14, flex: 1, accentColor: ch.color, cursor: "pointer" }} />
        <span style={{ fontSize: 8, color: TEXT_DIM, fontFamily: FONT_MONO }}>{Math.round(ch.volume * 100)}</span>
      </div>

      {/* Pan knob */}
      <Knob value={(ch.pan + 1) / 2} size={18} color="#3B82F6" label={t("creator_audio_pan")} onChange={(v) => update({ pan: v * 2 - 1 })} />

      {/* Cue */}
      <button onClick={() => update({ cue: !ch.cue })} style={{ width: 22, height: 14, borderRadius: 2, fontSize: 7, fontFamily: FONT_LABEL, border: "none", cursor: "pointer", background: ch.cue ? "#D4A017" : "rgba(255,255,255,0.05)", color: ch.cue ? "#000" : TEXT_DIM, letterSpacing: 0.5 }}>
        {t("creator_audio_cue")}
      </button>
    </div>
  );
}

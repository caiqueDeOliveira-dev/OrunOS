// FXRack — 6 effect slots with real audio connections
import { useCallback } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useDJStore } from "./creator-audio-store";
import { Knob } from "./creator-audio-ui";
import { BORDER, FONT_LABEL, type EffectSlot } from "./creator-audio-types";
import { getAudioEngine } from "./audio-engine";

export function FXRack() {
  const { t } = useTranslation();
  const effects = useDJStore((s) => s.effects);

  const toggleEffect = useCallback((i: number) => {
    useDJStore.setState((s) => ({
      effects: s.effects.map((e, idx) => {
        if (idx !== i) return e;
        const next = { ...e, active: !e.active };
        // Connect to audio engine
        try {
          const engine = getAudioEngine();
          const ctx = engine.getCtx();
          if (next.active) {
            if (e.name === "Delay" || e.name === "Flanger") {
              ctx && window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "delay", wetDry: e.wetDry, paramX: e.paramX } }));
            } else if (e.name === "Reverb") {
              ctx && window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "reverb", wetDry: e.wetDry, paramY: e.paramY } }));
            } else if (e.name === "Filter LP") {
              ctx && window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "filter", wetDry: e.wetDry, paramX: e.paramX } }));
            }
          }
        } catch {}
        return next;
      }),
    }));
  }, []);

  const updateEffect = useCallback((i: number, patch: Partial<EffectSlot>) => {
    useDJStore.setState((s) => ({
      effects: s.effects.map((e, idx) => idx === i ? { ...e, ...patch } : e),
    }));
    // Push to audio engine if active
    const fx = useDJStore.getState().effects[i];
    if (fx.active) {
      try {
        if (fx.name === "Delay" || fx.name === "Flanger") {
          window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "delay", wetDry: fx.wetDry, paramX: fx.paramX } }));
        } else if (fx.name === "Reverb") {
          window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "reverb", wetDry: fx.wetDry, paramY: fx.paramY } }));
        } else if (fx.name === "Filter LP") {
          window.dispatchEvent(new CustomEvent("creator-audio:effect", { detail: { type: "filter", wetDry: fx.wetDry, paramX: fx.paramX } }));
        }
      } catch {}
    }
  }, []);

  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 12px", height: "100%", alignItems: "flex-start" }}>
      {effects.map((fx, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 4px", borderRadius: 6, background: fx.active ? `${fx.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${fx.active ? `${fx.color}40` : BORDER}`, transition: "all 0.15s", minWidth: 0 }}>
          <span style={{ fontSize: 9, color: fx.active ? fx.color : "var(--muted-foreground, rgba(255,255,255,0.3))", fontFamily: FONT_LABEL, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>{fx.name}</span>
          {/* On/Off toggle */}
          <button onClick={() => toggleEffect(i)} style={{ width: 28, height: 14, borderRadius: 7, border: "none", cursor: "pointer", background: fx.active ? fx.color : "rgba(255,255,255,0.08)", position: "relative", transition: "all 0.15s" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: fx.active ? 16 : 2, transition: "left 0.15s" }} />
          </button>
          <Knob value={fx.wetDry} size={26} color={fx.active ? fx.color : "rgba(255,255,255,0.15)"} label={t("creator_audio_wet")} onChange={(v) => updateEffect(i, { wetDry: v })} />
          <Knob value={fx.paramX} size={20} color={fx.active ? fx.color : "rgba(255,255,255,0.1)"} label={t("creator_audio_par_x")} onChange={(v) => updateEffect(i, { paramX: v })} />
          <Knob value={fx.paramY} size={20} color={fx.active ? fx.color : "rgba(255,255,255,0.1)"} label={t("creator_audio_par_y")} onChange={(v) => updateEffect(i, { paramY: v })} />
        </div>
      ))}
    </div>
  );
}

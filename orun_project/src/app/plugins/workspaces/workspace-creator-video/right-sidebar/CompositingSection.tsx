import { useVideoStore } from "../video-store";
import { MONO, inputStyle } from "../video-types";
import { SectionHeader } from "./SectionHeader";
import { PropRow } from "./PropRow";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export function CompositingSection() {
  const { t } = useTranslation();
  const blendMode = useVideoStore((s) => s.blendMode);
  const opacity = useVideoStore((s) => s.opacity);

  return (
    <>
      <SectionHeader>{t("creator_video_compositing")}</SectionHeader>

      <PropRow label={t("creator_video_blend_mode")}>
        <select value={blendMode} onChange={(e) => useVideoStore.setState({ blendMode: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
          {["Normal", "Multiply", "Screen", "Overlay", "Soft Light", "Hard Light", "Color Dodge", "Color Burn"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </PropRow>

      <PropRow label={t("creator_video_opacity")}>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={opacity} onChange={(e) => useVideoStore.setState({ opacity: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C00018", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 28, textAlign: "right" }}>{opacity}%</span>
        </div>
      </PropRow>
    </>
  );
}

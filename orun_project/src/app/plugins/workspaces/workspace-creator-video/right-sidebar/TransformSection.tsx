import { useVideoStore } from "../video-store";
import { MONO, inputStyle } from "../video-types";
import { SectionHeader } from "./SectionHeader";
import { PropRow } from "./PropRow";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export function TransformSection() {
  const { t } = useTranslation();
  const posX = useVideoStore((s) => s.posX);
  const posY = useVideoStore((s) => s.posY);
  const scale = useVideoStore((s) => s.scale);
  const rotation = useVideoStore((s) => s.rotation);

  return (
    <>
      <SectionHeader>{t("creator_video_transform")}</SectionHeader>

      <PropRow label={t("creator_video_position")}>
        <div className="flex gap-1">
          <div className="flex-1">
            <span style={{ fontSize: 7, color: "#5C5C5C", fontFamily: MONO }}>X</span>
            <input type="number" value={posX} onChange={(e) => useVideoStore.setState({ posX: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div className="flex-1">
            <span style={{ fontSize: 7, color: "#5C5C5C", fontFamily: MONO }}>Y</span>
            <input type="number" value={posY} onChange={(e) => useVideoStore.setState({ posY: Number(e.target.value) })} style={inputStyle} />
          </div>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_scale")}>
        <div className="flex items-center gap-2">
          <input type="range" min={10} max={300} value={scale} onChange={(e) => useVideoStore.setState({ scale: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C3002F", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: "#A0A0A0", minWidth: 28, textAlign: "right" }}>{scale}%</span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_rotation")}>
        <div className="flex items-center gap-2">
          <input type="range" min={-180} max={180} value={rotation} onChange={(e) => useVideoStore.setState({ rotation: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C3002F", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: "#A0A0A0", minWidth: 28, textAlign: "right" }}>{rotation}&#176;</span>
        </div>
      </PropRow>
    </>
  );
}

import { useVideoStore } from "../video-store";
import { P } from "../../premium";
import { MONO } from "../video-types";
import { SectionHeader } from "./SectionHeader";
import { PropRow } from "./PropRow";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export function AudioSection() {
  const { t } = useTranslation();
  const volume = useVideoStore((s) => s.volume);
  const fadeIn = useVideoStore((s) => s.fadeIn);
  const fadeOut = useVideoStore((s) => s.fadeOut);

  return (
    <>
      <SectionHeader>{t("creator_video_audio")}</SectionHeader>

      <PropRow label={t("creator_video_volume")}>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={100} value={volume} onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C3002F", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: P.sub, minWidth: 36, textAlign: "right" }}>{(volume * 0.3 - 30).toFixed(0)} dB</span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_fade_in")}>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={5000} value={fadeIn} onChange={(e) => useVideoStore.setState({ fadeIn: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C3002F", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: P.sub, minWidth: 32, textAlign: "right" }}>{fadeIn}ms</span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_fade_out")}>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={5000} value={fadeOut} onChange={(e) => useVideoStore.setState({ fadeOut: Number(e.target.value) })} className="flex-1" style={{ accentColor: "#C3002F", height: 3 }} />
          <span style={{ fontSize: 9, fontFamily: MONO, color: "#A0A0A0", minWidth: 32, textAlign: "right" }}>{fadeOut}ms</span>
        </div>
      </PropRow>
    </>
  );
}

import { useVideoStore } from "./video-store";
import { P } from "../premium";
import { SANS } from "./video-types";
import { TransformSection } from "./right-sidebar/TransformSection";
import { CompositingSection } from "./right-sidebar/CompositingSection";
import { AudioSection } from "./right-sidebar/AudioSection";
import { TextSection } from "./right-sidebar/TextSection";
import { ClipInfo } from "./right-sidebar/ClipInfo";
import { useTranslation } from "../../../../i18n/I18nProvider";

export function RightSidebar() {
  const { t } = useTranslation();
  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const clips = useVideoStore((s) => s.clips);
  const fps = useVideoStore((s) => s.fps);
  const clip = selectedClipId ? clips.find((c) => c.id === selectedClipId) : null;
  const isText = clip?.type === "text";

  return (
    <div className="hs-scroll flex flex-col shrink-0 overflow-y-auto"
      style={{ width: 200, background: P.panel, borderLeft: `1px solid ${P.border}`, padding: 10, scrollbarWidth: "thin", scrollbarColor: `${P.border} transparent` }}>
      <div style={{ fontSize: 10, color: P.text, fontFamily: SANS, fontWeight: 700, marginBottom: 4 }}>
        {clip ? clip.name : t("creator_video_title")}
      </div>

      <TransformSection />
      <CompositingSection />
      <AudioSection />
      {isText && <TextSection />}
      {clip && <ClipInfo clip={clip} fps={fps} />}
    </div>
  );
}

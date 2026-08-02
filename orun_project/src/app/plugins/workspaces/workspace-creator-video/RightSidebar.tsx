import { useVideoStore } from "./video-store";
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
    <div className="flex flex-col shrink-0 overflow-y-auto"
      style={{ width: 200, background: "var(--card, #161B22)", borderLeft: "1px solid var(--border, #21262D)", padding: 10, scrollbarWidth: "thin", scrollbarColor: "#30363D transparent" }}>
      <div style={{ fontSize: 10, color: "#C9D1D9", fontFamily: SANS, fontWeight: 700, marginBottom: 4 }}>
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

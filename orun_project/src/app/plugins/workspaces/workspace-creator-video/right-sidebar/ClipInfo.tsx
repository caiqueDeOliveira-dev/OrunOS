import { MONO } from "../video-types";
import { SectionHeader } from "./SectionHeader";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import type { VideoClip } from "../video-types";

export function ClipInfo({ clip, fps }: { clip: VideoClip; fps: number }) {
  const { t } = useTranslation();

  return (
    <>
      <SectionHeader>{t("creator_video_clip_info")}</SectionHeader>
      <div className="flex flex-col gap-0.5">
        {[
          [t("creator_video_type"), clip.type],
          [t("creator_video_track"), String(clip.trackIndex + 1)],
          [t("creator_video_start"), `${(clip.startFrame / fps).toFixed(1)}s`],
          [t("creator_video_duration"), `${(clip.durationFrames / fps).toFixed(1)}s`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span style={{ fontSize: 9, color: "#5C5C5C" }}>{k}</span>
            <span style={{ fontSize: 9, color: "#A0A0A0", fontFamily: MONO }}>{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

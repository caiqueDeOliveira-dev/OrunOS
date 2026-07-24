import { useState } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore } from "./video-store";
import {
  MONO,
  SANS,
  formatTC,
  formatTCShort,
  IPlay,
  IPause,
  ISkipBack,
  ISkipFwd,
  IFramePrev,
  IFrameNext,
  IMaximize,
  IVolIcon,
} from "./video-types";

export function CenterPreview() {
  const { t } = useTranslation();
  const currentTimeFrame = useVideoStore((s) => s.currentTimeFrame);
  const totalFrames = useVideoStore((s) => s.totalFrames);
  const fps = useVideoStore((s) => s.fps);
  const isPlaying = useVideoStore((s) => s.isPlaying);
  const volume = useVideoStore((s) => s.volume);
  const clips = useVideoStore((s) => s.clips);
  const previewQuality = useVideoStore((s) => s.previewQuality);

  const activeClips = clips.filter(
    (c) =>
      currentTimeFrame >= c.startFrame &&
      currentTimeFrame < c.startFrame + c.durationFrames
  );

  const [safeMargins, setSafeMargins] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ background: "#080A0F", minHeight: 0 }}
      >
        <div
          data-preview
          className="relative flex items-center justify-center"
          style={{
            width: "85%",
            maxWidth: 720,
            aspectRatio: "16/9",
            background: "#000",
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                activeClips.filter((c) => c.type === "video").length > 0
                  ? "linear-gradient(160deg, #0a0a14 0%, #0f1020 40%, #141025 100%)"
                  : "linear-gradient(160deg, #060810 0%, #0a0c14 50%, #080a10 100%)",
            }}
          />
          {activeClips
            .filter((c) => c.type === "video")
            .map((clip) => (
              <div
                key={clip.id}
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at center, ${clip.color}12 0%, transparent 70%)`,
                }}
              />
            ))}
          {activeClips
            .filter((c) => c.type === "text")
            .map((clip) => (
              <div
                key={clip.id}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid #ffffff15",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#ffffff",
                    fontFamily: SANS,
                    fontWeight: 600,
                  }}
                >
                  {clip.name}
                </span>
              </div>
            ))}
          {safeMargins && (
            <div
              className="absolute inset-0"
              style={{
                border: "1px dashed #ffffff20",
                margin: "8%",
                pointerEvents: "none" as const,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  border: "1px dashed #ffffff10",
                  margin: "10%",
                }}
              />
            </div>
          )}

          {/* Timecode top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div
              className="px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: MONO,
                  color: "#C9D1D9",
                  letterSpacing: 1,
                }}
              >
                {formatTC(currentTimeFrame, fps)}
              </span>
            </div>
          </div>

          {/* Total frames + quality top-right */}
          <div className="absolute top-2 right-2 flex items-center gap-2">
            <span
              style={{
                fontSize: 9,
                fontFamily: MONO,
                color: "#484F58",
              }}
            >
              / {formatTCShort(totalFrames, fps)}
            </span>
            <div
              className="px-1.5 py-0.5 rounded"
              style={{ background: "rgba(192,0,24,0.85)" }}
            >
              <span
                style={{
                  fontSize: 8,
                  fontFamily: MONO,
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {previewQuality}
              </span>
            </div>
          </div>

          {/* Transport controls bottom-center */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5"
            style={{
              background: "rgba(0,0,0,0.6)",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            <button
              onClick={() =>
                useVideoStore.setState({
                  currentTimeFrame: Math.max(0, currentTimeFrame - fps),
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                width: 24,
                height: 24,
                color: "#8B949E",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8B949E";
              }}
            >
              <ISkipBack />
            </button>
            <button
              onClick={() =>
                useVideoStore.setState({
                  currentTimeFrame: Math.max(0, currentTimeFrame - 1),
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                width: 22,
                height: 22,
                color: "#8B949E",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8B949E";
              }}
            >
              <IFramePrev />
            </button>
            <button
              onClick={() =>
                useVideoStore.setState((s) => ({ isPlaying: !s.isPlaying }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#C00018",
                border: "none",
                width: 32,
                height: 32,
                color: "#fff",
                cursor: "pointer",
                borderRadius: "50%",
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E00020";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C00018";
              }}
            >
              {isPlaying ? <IPause /> : <IPlay />}
            </button>
            <button
              onClick={() =>
                useVideoStore.setState((s) => ({
                  currentTimeFrame: Math.min(s.totalFrames, currentTimeFrame + 1),
                }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                width: 22,
                height: 22,
                color: "#8B949E",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8B949E";
              }}
            >
              <IFrameNext />
            </button>
            <button
              onClick={() =>
                useVideoStore.setState((s) => ({
                  currentTimeFrame: Math.min(
                    s.totalFrames,
                    currentTimeFrame + fps
                  ),
                }))
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                width: 24,
                height: 24,
                color: "#8B949E",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8B949E";
              }}
            >
              <ISkipFwd />
            </button>
          </div>

          {/* Volume bottom-left */}
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1.5"
            style={{
              background: "rgba(0,0,0,0.6)",
              borderRadius: 4,
              padding: "3px 6px",
            }}
          >
            <IVolIcon />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) =>
                useVideoStore.setState({ volume: Number(e.target.value) })
              }
              style={{ width: 60, height: 3, accentColor: "#C9D1D9" }}
            />
            <span
              style={{
                fontSize: 8,
                fontFamily: MONO,
                color: "#484F58",
                minWidth: 20,
              }}
            >
              {volume}%
            </span>
          </div>

          {/* Safe margins + fullscreen bottom-right */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              onClick={() => setSafeMargins(!safeMargins)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                fontSize: 8,
                fontFamily: MONO,
                color: safeMargins ? "#2D7FF9" : "#484F58",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
                background: safeMargins ? "#2D7FF918" : "rgba(255,255,255,0.05)",
                border: safeMargins ? "1px solid #2D7FF940" : "1px solid transparent",
              }}
              title="Safe Margins"
            >
              &#9638;
            </button>
            <button
              onClick={() => {
                const el = document.querySelector(
                  "[data-preview]"
                ) as HTMLElement;
                if (el) {
                  if (document.fullscreenElement) document.exitFullscreen();
                  else el.requestFullscreen();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.05)",
                border: "none",
                width: 22,
                height: 22,
                color: "#8B949E",
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8B949E";
              }}
              title="Fullscreen"
            >
              <IMaximize />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

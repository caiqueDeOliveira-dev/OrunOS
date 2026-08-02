import { useState } from "react";
import { useVideoStore } from "./video-store";
import { MONO, SANS, formatTC, formatTCShort } from "./video-types";
import { AIOverlay } from "./center-preview/AIOverlay";
import { TransportControls } from "./center-preview/TransportControls";
import { VolumeControl } from "./center-preview/VolumeControl";
import { PreviewActions } from "./center-preview/PreviewActions";

export function CenterPreview() {
  const currentTimeFrame = useVideoStore((s) => s.currentTimeFrame);
  const totalFrames = useVideoStore((s) => s.totalFrames);
  const fps = useVideoStore((s) => s.fps);
  const clips = useVideoStore((s) => s.clips);
  const previewQuality = useVideoStore((s) => s.previewQuality);
  const aiState = useVideoStore((s) => s.aiState);
  const speed = useVideoStore((s) => s.speed);
  const keyframes = useVideoStore((s) => s.keyframes);

  const activeClips = clips.filter((c) => currentTimeFrame >= c.startFrame && currentTimeFrame < c.startFrame + c.durationFrames);
  const [safeMargins, setSafeMargins] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="flex-1 flex items-center justify-center relative" style={{ background: "#080A0F", minHeight: 0 }}>
        <div data-preview className="relative flex items-center justify-center"
          style={{ width: "85%", maxWidth: 720, aspectRatio: "16/9", background: "#000", borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.6)" }}>
          <div className="absolute inset-0"
            style={{ background: activeClips.filter((c) => c.type === "video").length > 0 ? "linear-gradient(160deg, #0a0a14 0%, #0f1020 40%, #141025 100%)" : "linear-gradient(160deg, #060810 0%, #0a0c14 50%, #080a10 100%)" }} />

          <AIOverlay status={aiState.status} progress={aiState.progress} result={aiState.result} />

          {keyframes.filter((kf) => Math.abs(kf.frame - currentTimeFrame) < fps).map((kf) => (
            <div key={`${kf.property}-${kf.frame}`} className="absolute" style={{ top: 4, left: `${(kf.frame / totalFrames) * 100}%`, zIndex: 40 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4A017", border: "1px solid #FFF", boxShadow: "0 0 4px rgba(212,160,23,0.6)" }} />
            </div>
          ))}

          {activeClips.filter((c) => c.type === "video").map((clip) => (
            <div key={clip.id} className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${clip.color}12 0%, transparent 70%)` }} />
          ))}
          {activeClips.filter((c) => c.type === "text").map((clip) => (
            <div key={clip.id} className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #ffffff15" }}>
              <span style={{ fontSize: 11, color: "#ffffff", fontFamily: SANS, fontWeight: 600 }}>{clip.name}</span>
            </div>
          ))}

          {safeMargins && (
            <div className="absolute inset-0" style={{ border: "1px dashed #ffffff20", margin: "8%", pointerEvents: "none" }}>
              <div className="absolute inset-0" style={{ border: "1px dashed #ffffff10", margin: "10%" }} />
            </div>
          )}

          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)" }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: "#C9D1D9", letterSpacing: 1 }}>{formatTC(currentTimeFrame, fps)}</span>
            </div>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-2">
            {speed !== 1 && (
              <div className="px-1 py-0.5 rounded" style={{ background: "rgba(212,160,23,0.75)" }}>
                <span style={{ fontSize: 8, fontFamily: MONO, color: "#FFF", fontWeight: 700 }}>{speed}x</span>
              </div>
            )}
            <span style={{ fontSize: 9, fontFamily: MONO, color: "#484F58" }}>/ {formatTCShort(totalFrames, fps)}</span>
            <div className="px-1.5 py-0.5 rounded" style={{ background: "rgba(192,0,24,0.85)" }}>
              <span style={{ fontSize: 8, fontFamily: MONO, color: "#fff", fontWeight: 700 }}>{previewQuality}</span>
            </div>
          </div>

          <TransportControls />
          <VolumeControl />
          <PreviewActions safeMargins={safeMargins} onToggleSafeMargins={() => setSafeMargins(!safeMargins)} />
        </div>
      </div>
    </div>
  );
}

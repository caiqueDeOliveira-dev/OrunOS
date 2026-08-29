// TimelineEditor — Bottom timeline (200px, full width)
// NOTE: the timeline is a fixed-dark studio surface (like the preview viewport):
// clip alpha-colors, white waveforms and the playhead glow are tuned for dark.
import { useState, useCallback } from "react";
import { Zap } from "lucide-react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore, pushUndo } from "./video-store";
import { TRACK_CONFIG, MONO, SANS, ACCENT, btnBase, IEye, IEyeOff, ILock, IZoomIn, IZoomOut } from "./video-types";

const TRACK_HEADER_W = 140;
const TRACK_H = 32;
const RULER_H = 22;

export function TimelineEditor() {
  const { t } = useTranslation();
  const clips = useVideoStore((s) => s.clips);
  const currentTimeFrame = useVideoStore((s) => s.currentTimeFrame);
  const totalFrames = useVideoStore((s) => s.totalFrames);
  const fps = useVideoStore((s) => s.fps);
  const zoomLevel = useVideoStore((s) => s.zoomLevel);
  const selectedClipId = useVideoStore((s) => s.selectedClipId);

  const keyframes = useVideoStore((s) => s.keyframes);
  const speed = useVideoStore((s) => s.speed);
  const snapEnabled = useVideoStore((s) => s.snapEnabled);
  const snapPoints = useVideoStore((s) => s.snapPoints);

  const FRAME_W = 3 * zoomLevel;
  const contentWidth = totalFrames * FRAME_W;

  const [trackVisibility, setTrackVisibility] = useState<boolean[]>([true, true, true, true]);
  const [trackLock, setTrackLock] = useState<boolean[]>([false, false, false, false]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft - TRACK_HEADER_W;
      let frame = Math.max(0, Math.min(Math.round(x / FRAME_W), totalFrames));
      // Snap to nearest snap point
      if (snapEnabled && snapPoints.length > 0) {
        const snapped = snapPoints.reduce((best, sp) => Math.abs(sp - frame) < Math.abs(best - frame) ? sp : best, snapPoints[0]);
        if (Math.abs(snapped - frame) <= 5) frame = snapped;
      }
      useVideoStore.setState({ currentTimeFrame: frame });
    },
    [FRAME_W, totalFrames, snapEnabled, snapPoints]
  );

  const toggleVis = (i: number) => setTrackVisibility((v) => { const n = [...v]; n[i] = !n[i]; return n; });
  const toggleLock = (i: number) => setTrackLock((v) => { const n = [...v]; n[i] = !n[i]; return n; });

  const markers: { frame: number; major: boolean; label: string }[] = [];
  for (let f = 0; f <= totalFrames; f += fps) {
    const sec = Math.floor(f / fps);
    const major = sec % 5 === 0;
    const label = major ? `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}` : "";
    markers.push({ frame: f, major, label });
  }

  return (
    <div className="flex flex-col shrink-0" style={{ height: 200, background: "#0A0A0C" }}>
      {/* Ruler */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: RULER_H, borderBottom: "1px solid #141414", background: "#050505" }}>
        <div className="absolute top-0 left-0 h-full flex items-center" style={{ width: TRACK_HEADER_W, background: "#0A0A0C", borderRight: "1px solid #252525" }}>
          <span style={{ fontSize: 8, color: "#5C5C5C", paddingLeft: 10, fontFamily: SANS }}>{t("creator_video_timeline")}</span>
        </div>
        <div className="absolute top-0" style={{ left: TRACK_HEADER_W, right: 0, height: "100%" }}>
          {markers.map((m) => (
            <div key={m.frame} className="absolute top-0 flex flex-col items-center" style={{ left: m.frame * FRAME_W }}>
              <span style={{ fontSize: m.major ? 8 : 7, fontFamily: MONO, color: m.major ? "#A0A0A0" : "#5C5C5C", marginTop: 1 }}>{m.label}</span>
              <div style={{ width: 1, height: m.major ? 8 : 4, background: m.major ? "#383838" : "#141414", marginTop: 1 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Tracks area */}
      <div className="hs-scroll flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1C1C1C transparent" }}>
        <div className="flex" style={{ minWidth: TRACK_HEADER_W + contentWidth }}>
          {/* Track Headers */}
          <div className="shrink-0" style={{ width: TRACK_HEADER_W, background: "#0A0A0C", borderRight: "1px solid #252525" }}>
            {TRACK_CONFIG.map((track, idx) => (
              <div key={idx} className="flex items-center gap-1 px-2" style={{ height: TRACK_H, borderBottom: "1px solid #141414" }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: track.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: "#A0A0A0", fontFamily: SANS, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.name}
                </span>
                {track.controls === "eye-lock" && (
                  <>
                    <button title={t("creator_video_visibility")} onClick={() => toggleVis(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackVisibility[idx] ? "#A0A0A0" : "#5C5C5C" }}>
                      {trackVisibility[idx] ? <IEye /> : <IEyeOff />}
                    </button>
                    <button title={t("creator_video_lock")} onClick={() => toggleLock(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackLock[idx] ? "#C3002F" : "#5C5C5C" }}>
                      <ILock />
                    </button>
                  </>
                )}
                {track.controls === "solo-mute" && (
                  <>
                    <button title={t("creator_video_solo")} onClick={() => useVideoStore.setState((s) => ({ trackSolo: { ...s.trackSolo, [idx]: !s.trackSolo[idx] } }))} style={{ ...btnBase, width: 16, height: 16, background: useVideoStore.getState().trackSolo[idx] ? "rgba(245,158,11,0.19)" : "transparent", border: useVideoStore.getState().trackSolo[idx] ? "1px solid #F59E0B" : "1px solid transparent" }}>
                      <span style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, color: useVideoStore.getState().trackSolo[idx] ? "#F59E0B" : "#5C5C5C" }}>S</span>
                    </button>
                    <button title={t("creator_video_mute")} onClick={() => useVideoStore.setState((s) => ({ trackMuted: { ...s.trackMuted, [idx]: !s.trackMuted[idx] } }))} style={{ ...btnBase, width: 16, height: 16, background: useVideoStore.getState().trackMuted[idx] ? "#C3002F30" : "transparent", border: useVideoStore.getState().trackMuted[idx] ? "1px solid #C3002F" : "1px solid transparent" }}>
                      <span style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, color: useVideoStore.getState().trackMuted[idx] ? "#C3002F" : "#5C5C5C" }}>M</span>
                    </button>
                  </>
                )}
                {track.controls === "eye" && (
                  <button title={t("creator_video_visibility")} onClick={() => toggleVis(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackVisibility[idx] ? "#A0A0A0" : "#5C5C5C" }}>
                    {trackVisibility[idx] ? <IEye /> : <IEyeOff />}
                  </button>
                )}
              </div>
            ))}
          </div>

            {/* Snap lines */}
            {snapEnabled && snapPoints.map((sp) => (
              <div key={`snap-${sp}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: sp * FRAME_W, width: 1, background: "rgba(245,158,11,0.3)", zIndex: 15 }} />
            ))}
            {/* Keyframe markers */}
            {keyframes.map((kf, i) => (
              <div key={`kf-${i}`} className="absolute pointer-events-none" style={{ left: kf.frame * FRAME_W - 3, top: -RULER_H, zIndex: 25 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", border: "1px solid #FFF" }} />
              </div>
            ))}
            {/* Clips area */}
          <div className="relative flex-1" onClick={handleTimelineClick} style={{ minWidth: contentWidth }}>
            {TRACK_CONFIG.map((track, trackIdx) => {
              const trackClips = clips.filter((c) => c.trackIndex === trackIdx);
              return (
                <div key={trackIdx} className="relative" style={{ height: TRACK_H, borderBottom: "1px solid #141414" }}>
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipLeft = clip.startFrame * FRAME_W;
                    const clipWidth = Math.max(clip.durationFrames * FRAME_W, 20);
                    const isAudio = clip.type === "audio";
                    const darkerColor = clip.color + "80";

                    return (
                      <div
                        key={clip.id}
                        className="absolute flex items-center overflow-hidden cursor-pointer"
                        style={{
                          left: clipLeft,
                          width: clipWidth,
                          top: 3,
                          height: TRACK_H - 6,
                          background: isSelected
                            ? `linear-gradient(180deg, ${clip.color}40 0%, ${clip.color}20 100%)`
                            : `linear-gradient(180deg, ${clip.color}28 0%, ${clip.color}15 100%)`,
                          border: isSelected ? `1.5px solid ${clip.color}` : `1px solid ${clip.color}30`,
                          borderLeft: `2px solid ${darkerColor}`,
                          borderRadius: 4,
                          boxShadow: isSelected ? `0 0 8px ${clip.color}30, inset 0 1px 0 ${clip.color}20` : "inset 0 1px 0 rgba(255,255,255,0.04)",
                          transition: "box-shadow 0.15s, border-color 0.15s",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const tool = useVideoStore.getState().tool;
                          if (tool === "delete") {
                            pushUndo();
                            useVideoStore.setState((s) => ({ clips: s.clips.filter((c) => c.id !== clip.id), selectedClipId: null }));
                          } else if (tool === "copy") {
                            useVideoStore.setState({ copiedClip: { ...clip }, selectedClipId: clip.id });
                          } else if (tool === "paste") {
                            const copied = useVideoStore.getState().copiedClip;
                            if (copied) {
                              pushUndo();
                              const newClip = { ...copied, id: `c${Date.now()}`, startFrame: clip.startFrame + clip.durationFrames };
                              useVideoStore.setState((s) => ({ clips: [...s.clips, newClip] }));
                            }
                          } else if (tool === "split") {
                            pushUndo();
                            const state = useVideoStore.getState();
                            const splitPoint = state.currentTimeFrame;
                            if (splitPoint > clip.startFrame && splitPoint < clip.startFrame + clip.durationFrames) {
                              const left = { ...clip, durationFrames: splitPoint - clip.startFrame };
                              const right = { ...clip, id: `c${Date.now()}`, startFrame: splitPoint, durationFrames: clip.startFrame + clip.durationFrames - splitPoint };
                              useVideoStore.setState((s) => ({ clips: s.clips.map((c) => c.id === clip.id ? left : c).concat(right) }));
                            }
                          } else if (tool === "trim") {
                            pushUndo();
                            const state = useVideoStore.getState();
                            const trimPoint = state.currentTimeFrame;
                            if (trimPoint > clip.startFrame && trimPoint < clip.startFrame + clip.durationFrames) {
                              useVideoStore.setState((s) => ({ clips: s.clips.map((c) => c.id === clip.id ? { ...c, durationFrames: trimPoint - c.startFrame } : c) }));
                            }
                          } else {
                            useVideoStore.setState({ selectedClipId: clip.id });
                          }
                        }}
                      >
                        {/* Speed badge */}
                        {speed !== 1 && isSelected && (
                          <div style={{ position: "absolute", top: 1, right: 2, fontSize: 7, fontFamily: MONO, color: "#F59E0B", fontWeight: 700, zIndex: 2 }}>{speed}x</div>
                        )}
                        {isAudio && (
                          <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.3 }}>
                            {Array.from({ length: Math.max(10, Math.floor(clip.durationFrames / 10)) }, (_, i) => {
                              const h = 4 + Math.abs(Math.sin(i * 0.7 + clip.startFrame * 0.01)) * 16;
                              return (
                                <rect
                                  key={i}
                                  x={`${(i / Math.max(10, Math.floor(clip.durationFrames / 10))) * 100}%`}
                                  y={`${20 - h / 2}`}
                                  width="2"
                                  height={h}
                                  fill="#fff"
                                  rx="1"
                                />
                              );
                            })}
                          </svg>
                        )}
                        <span style={{ fontSize: 8, color: clip.color, fontFamily: SANS, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px", position: "relative", zIndex: 1, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                          {clip.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead */}
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: currentTimeFrame * FRAME_W, width: 1, background: "#C3002F", zIndex: 20, boxShadow: "0 0 4px rgba(195,0,47,0.4)" }}>
              <div style={{ position: "absolute", top: -RULER_H, left: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #C3002F", zIndex: 20 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom zoom bar */}
      <div className="flex items-center justify-between px-2 shrink-0" style={{ height: 22, background: "#0A0A0C", borderTop: "1px solid #252525", gap: 4 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 7, fontFamily: MONO, color: "#5C5C5C" }}>FPS: {fps}</span>
          <span style={{ fontSize: 7, fontFamily: MONO, color: speed !== 1 ? "#FFB547" : "#5C5C5C" }}>SPEED: {speed}x</span>
          <button onClick={() => useVideoStore.setState((s) => ({ snapEnabled: !s.snapEnabled }))}
            title={t("creator_video_snap")}
            style={{ ...btnBase, width: 16, height: 14, color: snapEnabled ? ACCENT : "#5C5C5C", background: snapEnabled ? `${ACCENT}30` : "transparent", border: snapEnabled ? `1px solid ${ACCENT}` : "1px solid transparent", fontSize: 7, fontFamily: MONO }}>
            <Zap size={9} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => useVideoStore.setState((s) => ({ zoomLevel: Math.max(0.25, s.zoomLevel - 0.25) }))} style={{ ...btnBase, width: 18, height: 16, color: "#A0A0A0", background: "#141414", border: "1px solid #1C1C1C" }}><IZoomOut /></button>
          <button onClick={() => useVideoStore.setState((s) => ({ zoomLevel: Math.min(4, s.zoomLevel + 0.25) }))} style={{ ...btnBase, width: 18, height: 16, color: "#A0A0A0", background: "#141414", border: "1px solid #1C1C1C" }}><IZoomIn /></button>
          <span style={{ fontSize: 8, fontFamily: MONO, color: "#5C5C5C", minWidth: 28, textAlign: "center" }}>{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

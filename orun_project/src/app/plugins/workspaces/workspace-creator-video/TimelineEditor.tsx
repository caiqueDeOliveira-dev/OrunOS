// TimelineEditor — Bottom timeline (200px, full width)
import { useState, useCallback } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore, pushUndo } from "./video-store";
import { TRACK_CONFIG, MONO, SANS, btnBase, formatTC, IEye, IEyeOff, ILock, IZoomIn, IZoomOut } from "./video-types";

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

  const FRAME_W = 3 * zoomLevel;
  const contentWidth = totalFrames * FRAME_W;

  const [trackVisibility, setTrackVisibility] = useState<boolean[]>([true, true, true, true]);
  const [trackLock, setTrackLock] = useState<boolean[]>([false, false, false, false]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + e.currentTarget.scrollLeft - TRACK_HEADER_W;
      const frame = Math.max(0, Math.min(Math.round(x / FRAME_W), totalFrames));
      useVideoStore.setState({ currentTimeFrame: frame });
    },
    [FRAME_W, totalFrames]
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
    <div className="flex flex-col shrink-0" style={{ height: 200, background: "#1A1F2E" }}>
      {/* Ruler */}
      <div className="relative shrink-0 overflow-hidden" style={{ height: RULER_H, borderBottom: "1px solid #21262D", background: "#12161F" }}>
        <div className="absolute top-0 left-0 h-full flex items-center" style={{ width: TRACK_HEADER_W, background: "var(--card, #161B22)", borderRight: "1px solid var(--border, #21262D)" }}>
          <span style={{ fontSize: 8, color: "#484F58", paddingLeft: 10, fontFamily: SANS }}>{t("creator_video_timeline")}</span>
        </div>
        <div className="absolute top-0" style={{ left: TRACK_HEADER_W, right: 0, height: "100%" }}>
          {markers.map((m) => (
            <div key={m.frame} className="absolute top-0 flex flex-col items-center" style={{ left: m.frame * FRAME_W }}>
              <span style={{ fontSize: m.major ? 8 : 7, fontFamily: MONO, color: m.major ? "#8B949E" : "#30363D", marginTop: 1 }}>{m.label}</span>
              <div style={{ width: 1, height: m.major ? 8 : 4, background: m.major ? "#30363D" : "#21262D", marginTop: 1 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Tracks area */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#30363D transparent" }}>
        <div className="flex" style={{ minWidth: TRACK_HEADER_W + contentWidth }}>
          {/* Track Headers */}
          <div className="shrink-0" style={{ width: TRACK_HEADER_W, background: "var(--card, #161B22)", borderRight: "1px solid var(--border, #21262D)" }}>
            {TRACK_CONFIG.map((track, idx) => (
              <div key={idx} className="flex items-center gap-1 px-2" style={{ height: TRACK_H, borderBottom: "1px solid #21262D" }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: track.color, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: "#8B949E", fontFamily: SANS, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.name}
                </span>
                {track.controls === "eye-lock" && (
                  <>
                    <button title={t("creator_video_visibility")} onClick={() => toggleVis(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackVisibility[idx] ? "#8B949E" : "#484F58" }}>
                      {trackVisibility[idx] ? <IEye /> : <IEyeOff />}
                    </button>
                    <button title={t("creator_video_lock")} onClick={() => toggleLock(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackLock[idx] ? "#C00018" : "#484F58" }}>
                      <ILock />
                    </button>
                  </>
                )}
                {track.controls === "solo-mute" && (
                  <>
                    <button title={t("creator_video_solo")} onClick={() => useVideoStore.setState((s) => ({ trackSolo: { ...s.trackSolo, [idx]: !s.trackSolo[idx] } }))} style={{ ...btnBase, width: 16, height: 16, background: useVideoStore.getState().trackSolo[idx] ? "#D4A01730" : "transparent", border: useVideoStore.getState().trackSolo[idx] ? "1px solid #D4A017" : "1px solid transparent" }}>
                      <span style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, color: useVideoStore.getState().trackSolo[idx] ? "#D4A017" : "#484F58" }}>S</span>
                    </button>
                    <button title={t("creator_video_mute")} onClick={() => useVideoStore.setState((s) => ({ trackMuted: { ...s.trackMuted, [idx]: !s.trackMuted[idx] } }))} style={{ ...btnBase, width: 16, height: 16, background: useVideoStore.getState().trackMuted[idx] ? "#C0001830" : "transparent", border: useVideoStore.getState().trackMuted[idx] ? "1px solid #C00018" : "1px solid transparent" }}>
                      <span style={{ fontSize: 8, fontFamily: MONO, fontWeight: 700, color: useVideoStore.getState().trackMuted[idx] ? "#C00018" : "#484F58" }}>M</span>
                    </button>
                  </>
                )}
                {track.controls === "eye" && (
                  <button title={t("creator_video_visibility")} onClick={() => toggleVis(idx)} style={{ ...btnBase, width: 16, height: 16, color: trackVisibility[idx] ? "#8B949E" : "#484F58" }}>
                    {trackVisibility[idx] ? <IEye /> : <IEyeOff />}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Clips area */}
          <div className="relative flex-1" onClick={handleTimelineClick} style={{ minWidth: contentWidth }}>
            {TRACK_CONFIG.map((track, trackIdx) => {
              const trackClips = clips.filter((c) => c.trackIndex === trackIdx);
              return (
                <div key={trackIdx} className="relative" style={{ height: TRACK_H, borderBottom: "1px solid #21262D" }}>
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
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: currentTimeFrame * FRAME_W, width: 1, background: "#C00018", zIndex: 20, boxShadow: "0 0 4px rgba(192,0,24,0.4)" }}>
              <div style={{ position: "absolute", top: -RULER_H, left: -5, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #C00018", zIndex: 20 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom zoom bar */}
      <div className="flex items-center justify-end px-2 shrink-0" style={{ height: 22, background: "var(--card, #161B22)", borderTop: "1px solid var(--border, #21262D)", gap: 4 }}>
        <button onClick={() => useVideoStore.setState((s) => ({ zoomLevel: Math.max(0.25, s.zoomLevel - 0.25) }))} style={{ ...btnBase, width: 18, height: 16, background: "#21262D", border: "1px solid #30363D" }}><IZoomOut /></button>
        <button onClick={() => useVideoStore.setState((s) => ({ zoomLevel: Math.min(4, s.zoomLevel + 0.25) }))} style={{ ...btnBase, width: 18, height: 16, background: "#21262D", border: "1px solid #30363D" }}><IZoomIn /></button>
        <span style={{ fontSize: 8, fontFamily: MONO, color: "#484F58", minWidth: 28, textAlign: "center" }}>{Math.round(zoomLevel * 100)}%</span>
      </div>
    </div>
  );
}

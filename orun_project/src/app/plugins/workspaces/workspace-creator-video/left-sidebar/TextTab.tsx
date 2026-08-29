import { useVideoStore, pushUndo } from "../video-store";
import { P } from "../../premium";
import { FPS, SANS, TEXT_PRESETS, type VideoClip } from "../video-types";

export function TextTab() {
  const addClip = (name: string, bg: string) => {
    pushUndo();
    const state = useVideoStore.getState();
    const maxEnd = state.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
    const newClip: VideoClip = {
      id: `c${Date.now()}`, trackIndex: 3, name, color: bg,
      startFrame: maxEnd, durationFrames: 5 * FPS, type: "text",
    };
    useVideoStore.setState({ clips: [...state.clips, newClip] });
  };

  return (
    <div className="flex flex-col gap-2">
      {TEXT_PRESETS.map((p) => (
        <div
          key={p.label}
          className="flex items-center justify-center cursor-pointer"
          onClick={() => addClip(p.label, p.bg)}
          style={{ height: 48, background: p.bg, borderRadius: 6, border: `1px solid ${P.border}` }}
        >
          <span style={{ fontSize: p.size, fontWeight: p.weight, color: "#fff", fontFamily: SANS, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{p.preview}</span>
        </div>
      ))}
    </div>
  );
}

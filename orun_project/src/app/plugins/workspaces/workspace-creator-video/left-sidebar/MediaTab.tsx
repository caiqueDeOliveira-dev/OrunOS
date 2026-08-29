import { useRef } from "react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { P } from "../../premium";
import { useVideoStore, pushUndo } from "../video-store";
import { FPS, SANS, MONO, MEDIA_ITEMS_GRID, type VideoClip } from "../video-types";

export function MediaTab() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addClip = (name: string, type: "video" | "audio" | "text" | "effect", color: string) => {
    pushUndo();
    const state = useVideoStore.getState();
    const maxEnd = state.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
    const newClip: VideoClip = {
      id: `c${Date.now()}`,
      trackIndex: type === "video" ? 0 : type === "audio" ? 1 : type === "text" ? 3 : 0,
      name,
      color,
      startFrame: maxEnd,
      durationFrames: 5 * FPS,
      type,
    };
    useVideoStore.setState({ clips: [...state.clips, newClip] });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        style={{
          width: "100%", height: 28, background: "var(--primary)", color: "#fff",
          border: "none", borderRadius: 6, fontSize: 10, fontFamily: SANS,
          fontWeight: 600, cursor: "pointer",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(195,0,47,0.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
        onClick={() => fileInputRef.current?.click()}
      >
        + {t("importar") ?? "Importar"}
      </button>
      <input
        ref={fileInputRef} type="file" accept="video/*,audio/*" multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (!files) return;
          pushUndo();
          const state = useVideoStore.getState();
          const offset = state.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
          const newClips = Array.from(files).map((f, i) => {
            const isVideo = f.type.startsWith("video/");
            const clip: VideoClip = {
              id: `c${Date.now()}_${i}`, trackIndex: isVideo ? 0 : 1,
              name: f.name.replace(/\.[^.]+$/, ""),
              color: isVideo ? "#C3002F" : "#8B5CF6",
              startFrame: offset + i * FPS, durationFrames: 10 * FPS,
              type: isVideo ? "video" : "audio",
            };
            return clip;
          });
          useVideoStore.setState({ clips: [...state.clips, ...newClips] });
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {MEDIA_ITEMS_GRID.map((item) => (
          <div
            key={item.label}
            className="flex flex-col cursor-pointer"
            onClick={() => addClip(item.label.replace(/\.[^.]+$/, ""), "video", item.color)}
            style={{
              borderRadius: 6, overflow: "hidden",
              border: `1px solid ${P.border}`,
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                width: "100%", aspectRatio: "16/9",
                background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.3, color: "#FFFFFF" }}>&#9654;</span>
            </div>
            <div style={{ padding: "3px 4px", background: P.card }}>
              <div style={{ fontSize: 8, color: P.text, fontFamily: SANS, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
              <div style={{ fontSize: 7, color: P.dim, fontFamily: MONO }}>{item.dur}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

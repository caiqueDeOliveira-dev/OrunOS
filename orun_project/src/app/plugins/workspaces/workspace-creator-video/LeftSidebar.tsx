import { useState, useRef } from "react";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore, pushUndo } from "./video-store";
import {
  FPS,
  MONO,
  SANS,
  MEDIA_TABS,
  MEDIA_ITEMS_GRID,
  TEXT_PRESETS,
  EFFECTS,
  TRANSITIONS,
  type VideoClip,
} from "./video-types";

export function LeftSidebar() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("M\u00eddia");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addClipToTimeline = (
    name: string,
    type: "video" | "audio" | "text" | "effect",
    color: string
  ) => {
    pushUndo();
    const state = useVideoStore.getState();
    const maxEnd = state.clips.reduce(
      (max, c) => Math.max(max, c.startFrame + c.durationFrames),
      0
    );
    const newClip: VideoClip = {
      id: `c${Date.now()}`,
      trackIndex:
        type === "video" ? 0 : type === "audio" ? 1 : type === "text" ? 3 : 0,
      name,
      color,
      startFrame: maxEnd,
      durationFrames: 5 * FPS,
      type,
    };
    useVideoStore.setState({ clips: [...state.clips, newClip] });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "M\u00eddia":
        return (
          <div className="flex flex-col gap-2">
            <button
              style={{
                width: "100%",
                height: 28,
                background: "#C00018",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 10,
                fontFamily: SANS,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E00020";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C00018";
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              + {t("importar") ?? "Importar"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                pushUndo();
                const state = useVideoStore.getState();
                let offset = state.clips.reduce(
                  (max, c) => Math.max(max, c.startFrame + c.durationFrames),
                  0
                );
                const newClips = Array.from(files).map((f, i) => {
                  const isVideo = f.type.startsWith("video/");
                  const clip: VideoClip = {
                    id: `c${Date.now()}_${i}`,
                    trackIndex: isVideo ? 0 : 1,
                    name: f.name.replace(/\.[^.]+$/, ""),
                    color: isVideo ? "#E04040" : "#7B2FBE",
                    startFrame: offset + i * FPS,
                    durationFrames: 10 * FPS,
                    type: isVideo ? "video" : "audio",
                  };
                  return clip;
                });
                useVideoStore.setState({
                  clips: [...state.clips, ...newClips],
                });
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-1.5">
              {MEDIA_ITEMS_GRID.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col cursor-pointer"
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() =>
                    addClipToTimeline(
                      item.label.replace(/\.[^.]+$/, ""),
                      "video",
                      item.color
                    )
                  }
                  style={{
                    borderRadius: 4,
                    overflow: "hidden",
                    border:
                      hoveredItem === item.label
                        ? "1px solid #C9D1D930"
                        : "1px solid #21262D",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{ fontSize: 16, opacity: 0.3, color: "#C9D1D9" }}
                    >
                      &#9654;
                    </span>
                  </div>
                  <div style={{ padding: "3px 4px", background: "#0D1117" }}>
                    <div
                      style={{
                        fontSize: 8,
                        color: "#C9D1D9",
                        fontFamily: SANS,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 7,
                        color: "#484F58",
                        fontFamily: MONO,
                      }}
                    >
                      {item.dur}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "Texto":
        return (
          <div className="flex flex-col gap-2">
            {TEXT_PRESETS.map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-center cursor-pointer"
                onClick={() => addClipToTimeline(p.label, "text", p.bg)}
                style={{
                  height: 48,
                  background: p.bg,
                  borderRadius: 4,
                  border: "1px solid #30363D",
                }}
              >
                <span
                  style={{
                    fontSize: p.size,
                    fontWeight: p.weight,
                    color: "#fff",
                    fontFamily: SANS,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  }}
                >
                  {p.preview}
                </span>
              </div>
            ))}
          </div>
        );

      case "Efeitos":
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {EFFECTS.map((fx) => (
              <div
                key={fx.label}
                className="flex flex-col cursor-pointer"
                onClick={() =>
                  useVideoStore.setState({ selectedEffect: fx.label })
                }
                style={{
                  borderRadius: 4,
                  overflow: "hidden",
                  border:
                    useVideoStore.getState().selectedEffect === fx.label
                      ? "1px solid #C9D1D9"
                      : "1px solid #21262D",
                }}
              >
                <div
                  style={{
                    height: 40,
                    background: `linear-gradient(135deg, ${fx.color}, ${fx.color}aa)`,
                  }}
                />
                <div style={{ padding: "2px 4px", background: "#0D1117" }}>
                  <span
                    style={{
                      fontSize: 8,
                      color: "#8B949E",
                      fontFamily: SANS,
                    }}
                  >
                    {fx.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );

      case "Transi\u00e7\u00f5es":
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {TRANSITIONS.map((tr) => (
              <div
                key={tr.label}
                className="flex flex-col items-center justify-center cursor-pointer"
                onClick={() =>
                  useVideoStore.setState({
                    selectedTransition: tr.label,
                  })
                }
                style={{
                  height: 52,
                  background: "#21262D",
                  borderRadius: 4,
                  border:
                    useVideoStore.getState().selectedTransition === tr.label
                      ? "1px solid #C9D1D9"
                      : "1px solid #30363D",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 16, color: "#8B949E" }}>
                  {tr.arrow}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: "#8B949E",
                    fontFamily: SANS,
                  }}
                >
                  {tr.label}
                </span>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width: 180,
        background: "var(--card, #161B22)",
        borderRight: "1px solid var(--border, #21262D)",
      }}
    >
      <div
        className="flex overflow-x-auto shrink-0"
        style={{ borderBottom: "1px solid #21262D" }}
      >
        {MEDIA_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: "0 0 auto",
              padding: "6px 7px",
              fontSize: 9,
              fontFamily: SANS,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "#C9D1D9" : "#484F58",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid #C00018"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        className="flex-1 overflow-y-auto p-2"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#30363D transparent",
        }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}

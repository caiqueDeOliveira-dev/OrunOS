// RightSidebar — Inspector panel for selected clip properties
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useVideoStore } from "./video-store";
import {
  inputStyle,
  labelStyle,
  MONO,
  SANS,
  IBold,
  IItalic,
  IUnderline,
  IAlignL,
  IAlignC,
  IAlignR,
  btnBase,
} from "./video-types";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        color: "#C9D1D9",
        fontFamily: SANS,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        padding: "6px 0",
        borderBottom: "1px solid #21262D",
        marginBottom: 6,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" style={{ marginBottom: 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export function RightSidebar() {
  const { t } = useTranslation();

  const selectedClipId = useVideoStore((s) => s.selectedClipId);
  const clips = useVideoStore((s) => s.clips);
  const posX = useVideoStore((s) => s.posX);
  const posY = useVideoStore((s) => s.posY);
  const scale = useVideoStore((s) => s.scale);
  const rotation = useVideoStore((s) => s.rotation);
  const opacity = useVideoStore((s) => s.opacity);
  const volume = useVideoStore((s) => s.volume);
  const fadeIn = useVideoStore((s) => s.fadeIn);
  const fadeOut = useVideoStore((s) => s.fadeOut);
  const blendMode = useVideoStore((s) => s.blendMode);
  const fps = useVideoStore((s) => s.fps);
  const font = useVideoStore((s) => s.font);
  const fontSize = useVideoStore((s) => s.fontSize);
  const bold = useVideoStore((s) => s.bold);
  const italic = useVideoStore((s) => s.italic);
  const underline = useVideoStore((s) => s.underline);
  const textAlign = useVideoStore((s) => s.textAlign);
  const textColor = useVideoStore((s) => s.textColor);

  const clip = selectedClipId ? clips.find((c) => c.id === selectedClipId) : null;
  const isText = clip?.type === "text";

  return (
    <div
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{
        width: 200,
        background: "var(--card, #161B22)",
        borderLeft: "1px solid var(--border, #21262D)",
        padding: 10,
        scrollbarWidth: "thin",
        scrollbarColor: "#30363D transparent",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#C9D1D9",
          fontFamily: SANS,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {clip ? clip.name : t("creator_video_title")}
      </div>

      <SectionHeader>{t("creator_video_transform")}</SectionHeader>

      <PropRow label={t("creator_video_position")}>
        <div className="flex gap-1">
          <div className="flex-1">
            <span style={{ fontSize: 7, color: "#484F58", fontFamily: MONO }}>X</span>
            <input
              type="number"
              value={posX}
              onChange={(e) => useVideoStore.setState({ posX: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <span style={{ fontSize: 7, color: "#484F58", fontFamily: MONO }}>Y</span>
            <input
              type="number"
              value={posY}
              onChange={(e) => useVideoStore.setState({ posY: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_scale")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={10}
            max={300}
            value={scale}
            onChange={(e) => useVideoStore.setState({ scale: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 28, textAlign: "right" }}
          >
            {scale}%
          </span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_rotation")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-180}
            max={180}
            value={rotation}
            onChange={(e) => useVideoStore.setState({ rotation: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 28, textAlign: "right" }}
          >
            {rotation}&#176;
          </span>
        </div>
      </PropRow>

      <SectionHeader>{t("creator_video_compositing")}</SectionHeader>

      <PropRow label={t("creator_video_blend_mode")}>
        <select
          value={blendMode}
          onChange={(e) => useVideoStore.setState({ blendMode: e.target.value })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {["Normal", "Multiply", "Screen", "Overlay", "Soft Light", "Hard Light", "Color Dodge", "Color Burn"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </PropRow>

      <PropRow label={t("creator_video_opacity")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => useVideoStore.setState({ opacity: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 28, textAlign: "right" }}
          >
            {opacity}%
          </span>
        </div>
      </PropRow>

      <SectionHeader>{t("creator_video_audio")}</SectionHeader>

      <PropRow label={t("creator_video_volume")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => useVideoStore.setState({ volume: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 36, textAlign: "right" }}
          >
            {(volume * 0.3 - 30).toFixed(0)} dB
          </span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_fade_in")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={5000}
            value={fadeIn}
            onChange={(e) => useVideoStore.setState({ fadeIn: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 32, textAlign: "right" }}
          >
            {fadeIn}ms
          </span>
        </div>
      </PropRow>

      <PropRow label={t("creator_video_fade_out")}>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={5000}
            value={fadeOut}
            onChange={(e) => useVideoStore.setState({ fadeOut: Number(e.target.value) })}
            className="flex-1"
            style={{ accentColor: "#C00018", height: 3 }}
          />
          <span
            style={{ fontSize: 9, fontFamily: MONO, color: "#8B949E", minWidth: 32, textAlign: "right" }}
          >
            {fadeOut}ms
          </span>
        </div>
      </PropRow>

      {isText && (
        <>
          <SectionHeader>{t("creator_video_text")}</SectionHeader>

          <PropRow label={t("creator_video_font")}>
            <select
              value={font}
              onChange={(e) => useVideoStore.setState({ font: e.target.value })}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Montserrat">Montserrat</option>
            </select>
          </PropRow>

          <PropRow label={t("creator_video_size")}>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => useVideoStore.setState({ fontSize: Number(e.target.value) })}
              style={inputStyle}
            />
          </PropRow>

          <div className="flex gap-0.5" style={{ marginBottom: 6 }}>
            {([
              { icon: IBold, key: "bold" as const, val: bold },
              { icon: IItalic, key: "italic" as const, val: italic },
              { icon: IUnderline, key: "underline" as const, val: underline },
            ]).map(({ icon: Icon, key, val }) => (
              <button
                key={key}
                onClick={() => useVideoStore.setState({ [key]: !val })}
                style={{
                  ...btnBase,
                  width: 22,
                  height: 22,
                  background: val ? "#C0001830" : "#0D1117",
                  border: val ? "1px solid #C00018" : "1px solid #30363D",
                  borderRadius: 3,
                }}
              >
                <Icon />
              </button>
            ))}
            <div style={{ width: 4 }} />
            {([
              { icon: IAlignL, align: "left" as const },
              { icon: IAlignC, align: "center" as const },
              { icon: IAlignR, align: "right" as const },
            ]).map(({ icon: Icon, align }) => (
              <button
                key={align}
                onClick={() => useVideoStore.setState({ textAlign: align })}
                style={{
                  ...btnBase,
                  width: 22,
                  height: 22,
                  background: textAlign === align ? "#C0001830" : "#0D1117",
                  border: textAlign === align ? "1px solid #C00018" : "1px solid #30363D",
                  borderRadius: 3,
                }}
              >
                <Icon />
              </button>
            ))}
          </div>

          <PropRow label={t("creator_video_color")}>
            <div className="flex gap-1">
              {["#FFFFFF", "#000000", "#C00018", "#2D7FF9", "#2D9B5A", "#D4A017"].map((c) => (
                <div
                  key={c}
                  onClick={() => useVideoStore.setState({ textColor: c })}
                  style={{
                    width: 18,
                    height: 18,
                    background: c,
                    borderRadius: 3,
                    border: textColor === c ? "2px solid #C9D1D9" : "1px solid #30363D",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </PropRow>
        </>
      )}

      {clip && (
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
                <span style={{ fontSize: 9, color: "#484F58" }}>{k}</span>
                <span style={{ fontSize: 9, color: "#8B949E", fontFamily: MONO }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

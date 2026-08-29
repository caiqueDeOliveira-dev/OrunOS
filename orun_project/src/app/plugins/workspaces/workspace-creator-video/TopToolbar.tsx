// TopToolbar — Tools, undo/redo, project title, export
import { useTranslation } from "../../../../i18n/I18nProvider";
import { P } from "../premium";
import { useVideoStore, undo, redo } from "./video-store";
import { btnBase, SANS, IPointer, ITrim, IScissors, ITrash, ICopy, IPaste, IUndo, IRedo } from "./video-types";

export function TopToolbar() {
  const { t } = useTranslation();
  const tool = useVideoStore((s) => s.tool);

  const ToolBtn = ({ id, icon, label }: { id: string; icon: React.ReactNode; label: string }) => (
    <button
      title={label}
      style={{
        ...btnBase,
        width: 28,
        height: 26,
        color: tool === id ? "#fff" : P.sub,
        background: tool === id ? "var(--primary)" : "transparent",
      }}
      onMouseEnter={(e) => { if (tool !== id) { e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.color = "var(--text)"; } }}
      onMouseLeave={(e) => { if (tool !== id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; } }}
      onClick={() => useVideoStore.setState({ tool: id })}
    >
      {icon}
    </button>
  );

  const Sep = () => <div style={{ width: 1, height: 18, background: P.border, margin: "0 4px", flexShrink: 0 }} />;

  return (
    <div className="flex items-center shrink-0" style={{ height: 36, background: P.panel, borderBottom: `1px solid ${P.border}`, padding: "0 12px", gap: 2 }}>
      <ToolBtn id="select" icon={<IPointer />} label={t("creator_video_select")} />
      <ToolBtn id="trim" icon={<ITrim />} label={t("creator_video_trim")} />
      <ToolBtn id="split" icon={<IScissors />} label={t("creator_video_split")} />
      <ToolBtn id="delete" icon={<ITrash />} label={t("creator_video_delete")} />
      <Sep />
      <ToolBtn id="copy" icon={<ICopy />} label={t("creator_video_copy")} />
      <ToolBtn id="paste" icon={<IPaste />} label={t("creator_video_paste")} />
      <Sep />
      <button title={t("creator_video_undo")} style={{ ...btnBase, width: 28, height: 26 }} onClick={undo} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; }}><IUndo /></button>
      <button title={t("creator_video_redo")} style={{ ...btnBase, width: 28, height: 26 }} onClick={redo} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; }}><IRedo /></button>

      <div className="flex-1 flex items-center justify-center">
        <span style={{ fontSize: 12, fontFamily: SANS, fontWeight: 600, color: P.text, letterSpacing: 0.3 }}>Meu Video</span>
      </div>

      <button
        style={{ height: 24, padding: "0 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontFamily: SANS, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(195,0,47,0.8)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; }}
        onClick={() => {
          const state = useVideoStore.getState();
          const json = JSON.stringify({ clips: state.clips, fps: state.fps, totalFrames: state.totalFrames }, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `video-project-${Date.now()}.json`;
          link.click();
          URL.revokeObjectURL(link.href);
        }}
      >
        {t("creator_video_export")}
      </button>
      <button
        style={{ height: 24, padding: "0 10px", background: "transparent", color: P.sub, border: `1px solid ${P.border}`, borderRadius: 6, fontSize: 11, fontFamily: SANS, fontWeight: 500, cursor: "pointer", letterSpacing: 0.3 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card2)"; e.currentTarget.style.color = "var(--text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--sub)"; }}
        onClick={async () => {
          try {
            const [fileHandle] = await (window as any).showOpenFilePicker({
              types: [{ description: "Video Project", accept: { "application/json": [".json"] } }],
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            if (data.clips) {
              useVideoStore.setState({
                clips: data.clips,
                fps: data.fps || 30,
                totalFrames: data.totalFrames || 9000,
                currentTimeFrame: 0,
                selectedClipId: null,
              });
            }
          } catch {}
        }}
      >
        {t("creator_video_import") || "Importar"}
      </button>
    </div>
  );
}

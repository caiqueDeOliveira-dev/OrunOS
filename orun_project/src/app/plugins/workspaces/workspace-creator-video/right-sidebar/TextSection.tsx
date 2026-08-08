import { useVideoStore } from "../video-store";
import { inputStyle, btnBase, IAlignL, IAlignC, IAlignR, IBold, IItalic, IUnderline } from "../video-types";
import { SectionHeader } from "./SectionHeader";
import { PropRow } from "./PropRow";
import { useTranslation } from "../../../../../i18n/I18nProvider";

export function TextSection() {
  const { t } = useTranslation();
  const font = useVideoStore((s) => s.font);
  const fontSize = useVideoStore((s) => s.fontSize);
  const bold = useVideoStore((s) => s.bold);
  const italic = useVideoStore((s) => s.italic);
  const underline = useVideoStore((s) => s.underline);
  const textAlign = useVideoStore((s) => s.textAlign);
  const textColor = useVideoStore((s) => s.textColor);

  return (
    <>
      <SectionHeader>{t("creator_video_text")}</SectionHeader>

      <PropRow label={t("creator_video_font")}>
        <select value={font} onChange={(e) => useVideoStore.setState({ font: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Montserrat">Montserrat</option>
        </select>
      </PropRow>

      <PropRow label={t("creator_video_size")}>
        <input type="number" value={fontSize} onChange={(e) => useVideoStore.setState({ fontSize: Number(e.target.value) })} style={inputStyle} />
      </PropRow>

      <div className="flex gap-0.5" style={{ marginBottom: 6 }}>
        {([{ icon: IBold, key: "bold" as const, val: bold }, { icon: IItalic, key: "italic" as const, val: italic }, { icon: IUnderline, key: "underline" as const, val: underline }]).map(({ icon: Icon, key, val }) => (
          <button key={key} onClick={() => useVideoStore.setState({ [key]: !val })} style={{ ...btnBase, width: 22, height: 22, background: val ? "#C3002F30" : "#0A0A0C", border: val ? "1px solid #C3002F" : "1px solid #1C1C1C", borderRadius: 6 }}><Icon /></button>
        ))}
        <div style={{ width: 4 }} />
        {([{ icon: IAlignL, align: "left" as const }, { icon: IAlignC, align: "center" as const }, { icon: IAlignR, align: "right" as const }]).map(({ icon: Icon, align }) => (
          <button key={align} onClick={() => useVideoStore.setState({ textAlign: align })} style={{ ...btnBase, width: 22, height: 22, background: textAlign === align ? "#C3002F30" : "#0A0A0C", border: textAlign === align ? "1px solid #C3002F" : "1px solid #1C1C1C", borderRadius: 6 }}><Icon /></button>
        ))}
      </div>

      <PropRow label={t("creator_video_color")}>
        <div className="flex gap-1">
          {["#FFFFFF", "#000000", "#C3002F", "#4DA3FF", "#00D26A", "#FFB547"].map((c) => (
            <div key={c} onClick={() => useVideoStore.setState({ textColor: c })} style={{ width: 18, height: 18, background: c, borderRadius: 6, border: textColor === c ? "2px solid #FFFFFF" : "1px solid #1C1C1C", cursor: "pointer" }} />
          ))}
        </div>
      </PropRow>
    </>
  );
}

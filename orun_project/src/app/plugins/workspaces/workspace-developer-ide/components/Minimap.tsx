import { useIDEStore } from "../developer-store";

export function Minimap() {
  const activeFileId = useIDEStore((s) => s.activeFileId);
  const files = useIDEStore((s) => s.files);
  const activeFile = activeFileId ? files[activeFileId] : null;

  if (!activeFile?.content || activeFile.content.length < 50) return null;

  const lines = activeFile.content.split("\n");
  const maxLines = 300;
  const visibleLines = lines.slice(0, maxLines);

  return (
    <div className="w-10 border-l overflow-hidden shrink-0" style={{ borderColor: "#252525", background: "#141414" }}>
      <div className="text-[2px] leading-[2px] py-1 px-1 select-none" style={{ lineHeight: "2.5px", opacity: 0.35 }}>
        {visibleLines.map((line, i) => (
          <div key={i} style={{ color: "#A0A0A0", whiteSpace: "pre", overflow: "hidden", textOverflow: "clip", maxWidth: 30 }}>
            {line.replace(/\S/g, "·").slice(0, 15) || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

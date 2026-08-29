// plugins/workspaces/workspace-orun-code/components/Minimap.tsx
import { useOrunCodeStore } from "../store";
import { OC } from "../orun-code";

export function Minimap() {
  const files = useOrunCodeStore((s) => s.files);
  const activeFileId = useOrunCodeStore((s) => s.activeFileId);
  const content = activeFileId ? files[activeFileId]?.content || "" : "";
  const lines = content.length ? content.split("\n") : [];

  const blockColors = [OC.primary, OC.info, OC.success, OC.alert, OC.violet];

  return (
    <div className="w-14 border-l shrink-0 overflow-hidden hidden lg:block" style={{ borderColor: OC.border, background: OC.panel }}>
      <div className="px-2 py-2 flex flex-col gap-[2px]">
        {lines.slice(0, 400).map((line, i) => {
          const isCode = line.trim().length > 0;
          const color = blockColors[(line.trim().length + i) % blockColors.length];
          return (
            <div
              key={i}
              className="rounded-[1px]"
              style={{
                height: 2,
                width: isCode ? `${Math.min(100, 30 + Math.min(line.trim().length, 20) * 2)}%` : "25%",
                background: isCode ? `${color}66` : "rgba(255,255,255,0.05)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

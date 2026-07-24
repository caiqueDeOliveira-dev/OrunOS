import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { isElectron } from "../../constants";
import type { CreatorRange } from "../agentPageData";

const statusColors: Record<string, string> = { draft: "#A0AEC0", rendering: "#3182CE", processing: "#3182CE", completed: "#D69E2E", failed: "#E53E3E" };

export function CreatorCharts({ accent }: { accent: string }) {
  const [data, setData] = useState<CreatorRange | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    window.orun.videoEditor.getRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data) return null;

  const allProjects = [...data.videos.map((v) => ({ ...v, type: "video" })), ...data.music.map((m) => ({ ...m, type: "music" }))];
  const statusMap: Record<string, number> = {};
  allProjects.forEach((p) => { statusMap[p.status] = (statusMap[p.status] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #BEE3F8", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Clapperboard size={14} style={{ color: accent }} />
          <div className="text-xs font-medium" style={{ color: accent }}>Projetos ({data.videos.length} videos, {data.music.length} musicas)</div>
        </div>
        {statusData.length > 0 && (
          <div className="flex gap-2">
            {statusData.map((s) => (
              <div key={s.name} className="flex-1 text-center p-2 rounded-lg" style={{ background: "#EBF8FF" }}>
                <div className="text-lg font-bold" style={{ color: statusColors[s.name] || accent, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: "#718096" }}>{s.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { isElectron } from "../../constants";
import type { DesignerRange } from "../agentPageData";

const ENGINE_COLORS: Record<string, string> = { fal: "#805AD5", tripo: "#3182CE", comfyui: "#DD6B20" };

export function DesignerCharts({ accent }: { accent: string }) {
  const [data, setData] = useState<DesignerRange | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    window.orun.image3d.getRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data || data.entries.length === 0) return null;

  const engineData = Object.entries(data.byEngine).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #E9D8FD", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={14} style={{ color: accent }} />
          <div className="text-xs font-medium" style={{ color: accent }}>Gerações por Engine</div>
        </div>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={140}>
            <PieChart>
              <Pie data={engineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                {engineData.map((e) => <Cell key={e.name} fill={ENGINE_COLORS[e.name] || accent} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1">
            {engineData.map((e) => (
              <div key={e.name} className="flex items-center gap-2 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: ENGINE_COLORS[e.name] || accent }} />
                <span style={{ color: "#4A5568" }}>{e.name}</span>
                <span className="ml-auto" style={{ color: "#718096", fontFamily: "'JetBrains Mono', monospace" }}>{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

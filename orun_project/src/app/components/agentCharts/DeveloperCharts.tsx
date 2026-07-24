import { useEffect, useState } from "react";
import { Terminal, Bug } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { isElectron } from "../../constants";
import type { DeveloperRange } from "../agentPageData";

export function DeveloperCharts({ accent }: { accent: string }) {
  const [data, setData] = useState<DeveloperRange | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    window.orun.developer.getRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data || data.daily.length === 0) return null;

  const sevColors: Record<string, string> = { low: "#D69E2E", medium: "#DD6B20", high: "#E53E3E", critical: "#C53030" };
  const sevCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  data.entries.forEach((e) => { if (e.severity) sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1; });
  const sevData = Object.entries(sevCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={14} style={{ color: "#68D391" }} />
          <div className="text-xs font-medium" style={{ color: "#68D391" }}>Reviews por Dia</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.daily}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#A0AEC0" }} />
            <YAxis tick={{ fontSize: 10, fill: "#A0AEC0" }} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="total" fill="#68D391" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {sevData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Bug size={14} style={{ color: "#FC8181" }} />
            <div className="text-xs font-medium" style={{ color: "#FC8181" }}>Severidade</div>
          </div>
          <div className="flex gap-2">
            {sevData.map((s) => (
              <div key={s.name} className="flex-1 text-center p-2 rounded-lg" style={{ background: "var(--secondary)" }}>
                <div className="text-lg font-bold" style={{ color: sevColors[s.name] || accent, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: "#A0AEC0" }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { isElectron } from "../../constants";
import type { TeacherRange } from "../agentPageData";

const statusColors: Record<string, string> = { learning: "#DD6B20", reviewed: "#3182CE", mastered: "#D69E2E" };

export function TeacherCharts({ accent }: { accent: string }) {
  const [data, setData] = useState<TeacherRange | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    window.orun.teacher.getRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data || data.daily.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FEEBC8", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} style={{ color: accent }} />
          <div className="text-xs font-medium" style={{ color: accent }}>Progresso por Dia</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.daily}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="learning" stackId="a" fill={statusColors.learning} name="Aprendendo" />
            <Bar dataKey="reviewed" stackId="a" fill={statusColors.reviewed} name="Revisado" />
            <Bar dataKey="mastered" stackId="a" fill={statusColors.mastered} name="Dominado" radius={[4, 4, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

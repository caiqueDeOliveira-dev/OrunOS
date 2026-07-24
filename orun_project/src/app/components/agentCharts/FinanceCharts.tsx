import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { isElectron } from "../../constants";
import type { FinanceRange } from "../agentPageData";

const CAT_COLORS = ["#D69E2E", "#E53E3E", "#805AD5", "#3182CE", "#DD6B20", "#D53F8C", "#4A5568", "#319795"];

export function FinanceCharts({ accent }: { accent: string }) {
  const [data, setData] = useState<FinanceRange | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    window.orun.finance.getRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)).then(setData).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  if (!data || data.daily.length === 0) return null;

  const categoryMap: Record<string, number> = {};
  data.entries.forEach((e) => { if (e.type === "expense") categoryMap[e.category || "outros"] = (categoryMap[e.category || "outros"] || 0) + e.amount; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FEFCBF", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} style={{ color: accent }} />
          <div className="text-xs font-medium" style={{ color: accent }}>Receita vs Despesa - 7 dias</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.daily}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
            <Bar dataKey="income" fill="#D69E2E" name="Receita" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#E53E3E" name="Despesa" radius={[4, 4, 0, 0]} />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {categoryData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #FEFCBF", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} style={{ color: accent }} />
            <div className="text-xs font-medium" style={{ color: accent }}>Despesas por Categoria</div>
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={140}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                  <span style={{ color: "#4A5568" }}>{c.name}</span>
                  <span className="ml-auto" style={{ color: "#718096", fontFamily: "'JetBrains Mono', monospace" }}>R$ {c.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

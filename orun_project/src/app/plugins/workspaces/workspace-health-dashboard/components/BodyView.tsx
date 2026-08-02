import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { BodyMeasurement } from "../health-types";
import { useHealthStore, addBodyMeasurement, calculateBMI, getBMIStatus } from "../health-store";

const measurementFields = [
  { key: "chest", label: "Peito" },
  { key: "waist", label: "Cintura" },
  { key: "hips", label: "Quadril" },
  { key: "rightArm", label: "Braço Direito" },
  { key: "leftArm", label: "Braço Esquerdo" },
  { key: "rightThigh", label: "Coxa Direita" },
  { key: "leftThigh", label: "Coxa Esquerda" },
] as const;

export function BodyView({ measurements }: { measurements: BodyMeasurement[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    weight: "", height: "", chest: "", waist: "", hips: "",
    rightArm: "", leftArm: "", rightThigh: "", leftThigh: "",
  });

  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  const weightHistory = sorted
    .filter((m) => m.weight != null)
    .map((m) => ({ date: m.date.slice(5), peso: m.weight }))
    .reverse();

  const bmi = latest?.weight != null && latest?.height != null
    ? calculateBMI(latest.weight, latest.height)
    : null;
  const bmiStatus = bmi ? getBMIStatus(bmi) : null;

  const handleSubmit = () => {
    const parsed: Record<string, number | undefined> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== "") parsed[k] = Number(v);
    }
    if (Object.values(parsed).every((v) => v === undefined)) return;

    addBodyMeasurement({
      date: new Date().toISOString().split("T")[0],
      weight: parsed.weight,
      height: parsed.height,
      chest: parsed.chest,
      waist: parsed.waist,
      hips: parsed.hips,
      rightArm: parsed.rightArm,
      leftArm: parsed.leftArm,
      rightThigh: parsed.rightThigh,
      leftThigh: parsed.leftThigh,
    });

    setForm({ weight: "", height: "", chest: "", waist: "", hips: "", rightArm: "", leftArm: "", rightThigh: "", leftThigh: "" });
    setShowForm(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Peso</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.weight != null ? latest.weight : "—"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>kg</span>
        </div>
        {/* BMI */}
        {bmi && bmiStatus && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${bmiStatus.color}20`, color: bmiStatus.color, fontFamily: "'JetBrains Mono', monospace" }}>
              IMC: {bmi}
            </span>
            <span className="text-[9px]" style={{ color: bmiStatus.color }}>{bmiStatus.label}</span>
          </div>
        )}
        {weightHistory.length >= 2 && (
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={weightHistory}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C00018" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C00018" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }} formatter={(v: number) => [`${v} kg`, "Peso"]} />
              <Area type="monotone" dataKey="peso" stroke="#C00018" fill="url(#weightGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {weightHistory.length < 2 && (
          <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Registre pelo menos 2 medições para ver o gráfico.</p>
        )}
      </div>

      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Altura</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.height != null ? latest.height : "—"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>cm</span>
        </div>
      </div>

      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Medidas</h3>
        <div className="space-y-2">
          {measurementFields.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <span className="text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                {latest?.[key] != null ? `${latest[key]} cm` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)}
        className="w-full px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
        style={{ fontFamily: "'Sora', sans-serif", background: showForm ? "rgba(192,0,24,0.12)" : "rgba(192,0,24,0.08)", color: "#C00018" }}>
        {showForm ? "Cancelar" : "+ Nova Medição"}
      </button>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Registrar Medição</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Peso (kg)</label>
              <input type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Altura (cm)</label>
              <input type="number" step="0.1" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
            {measurementFields.map(({ key, label }) => (
              <div key={key}>
                <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>{label} (cm)</label>
                <input type="number" step="0.1" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            ))}
          </div>
          <button onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "#C00018", color: "white" }}>
            Salvar
          </button>
        </div>
      )}

      {sorted.length > 1 && (
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Histórico</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
            {sorted.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C00018" }}>{m.date}</span>
                <div className="flex gap-3">
                  {m.weight != null && <span className="text-[9px]" style={{ color: "var(--foreground)" }}>{m.weight} kg</span>}
                  {m.chest != null && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>P:{m.chest}</span>}
                  {m.waist != null && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>C:{m.waist}</span>}
                  {m.hips != null && <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Q:{m.hips}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

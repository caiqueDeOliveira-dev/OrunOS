import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { BodyMeasurement, BodyRegion } from "../health-types";
import { useHealthStore, addBodyMeasurement, calculateBMI, getBMIStatus } from "../health-store";
import { HealthBodyMap } from "./HealthBodyMap";
import { SymptomPanel } from "./SymptomPanel";
import { MedicationTracker } from "./MedicationTracker";
import { Ruler, Scale } from "lucide-react";

const measurementFields = [
  { key: "chest", label: "Peito" },
  { key: "waist", label: "Cintura" },
  { key: "hips", label: "Quadril" },
  { key: "rightArm", label: "Braco Dir." },
  { key: "leftArm", label: "Braco Esq." },
  { key: "rightThigh", label: "Coxa Dir." },
  { key: "leftThigh", label: "Coxa Esq." },
] as const;

type SubView = "map" | "measurements" | "medications";

export function BodyView({ measurements }: { measurements: BodyMeasurement[] }) {
  const symptoms = useHealthStore((s) => s.symptoms);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [subView, setSubView] = useState<SubView>("map");
  const [showMeasureForm, setShowMeasureForm] = useState(false);
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

  const activeSymptomCount = symptoms.length;

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
    setShowMeasureForm(false);
  };

  const subTabs: { key: SubView; label: string; badge?: number }[] = [
    { key: "map", label: "Mapa Corporal", badge: activeSymptomCount > 0 ? activeSymptomCount : undefined },
    { key: "measurements", label: "Medidas" },
    { key: "medications", label: "Medicacoes" },
  ];

  return (
    <div className="p-4 space-y-3">
      {/* quick stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg border text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <Scale size={12} className="mx-auto mb-1" style={{ color: "var(--primary)" }} />
          <span className="text-[11px] font-medium block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.weight != null ? `${latest.weight}` : "—"}
          </span>
          <span className="text-[7px]" style={{ color: "var(--muted-foreground)" }}>kg</span>
        </div>
        <div className="p-2 rounded-lg border text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <Ruler size={12} className="mx-auto mb-1" style={{ color: "var(--info)" }} />
          <span className="text-[11px] font-medium block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.height != null ? `${latest.height}` : "—"}
          </span>
          <span className="text-[7px]" style={{ color: "var(--muted-foreground)" }}>cm</span>
        </div>
        <div className="p-2 rounded-lg border text-center" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <span className="text-[10px] block mb-0.5" style={{ color: bmiStatus?.color || "var(--muted-foreground)" }}>
            {bmi ? `IMC ${bmi}` : "—"}
          </span>
          {bmiStatus && (
            <span className="text-[7px]" style={{ color: bmiStatus.color }}>{bmiStatus.label}</span>
          )}
        </div>
      </div>

      {/* sub-view tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
        {subTabs.map((tab) => (
          <button key={tab.key} onClick={() => setSubView(tab.key)}
            className="flex-1 py-1.5 rounded-md text-[9px] tracking-wider uppercase transition-all relative"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: subView === tab.key ? 500 : 300,
              color: subView === tab.key ? "var(--foreground)" : "var(--muted-foreground)",
              background: subView === tab.key ? "rgba(192,0,24,0.12)" : "transparent",
            }}>
            {tab.label}
            {tab.badge && (
              <span className="absolute -top-1 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                style={{ background: "var(--primary)", color: "white", fontFamily: "'JetBrains Mono', monospace" }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* sub-view content */}
      {subView === "map" && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="flex gap-3">
              <div className="flex-1 flex justify-center">
                <HealthBodyMap
                  symptoms={symptoms}
                  onRegionClick={(region) => setSelectedRegion(region === selectedRegion ? null : region)}
                  selectedRegion={selectedRegion}
                />
              </div>
              <div className="w-[180px] shrink-0">
                <SymptomPanel
                  selectedRegion={selectedRegion}
                  onRegionClear={() => setSelectedRegion(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {subView === "measurements" && (
        <div className="space-y-3">
          {/* weight chart */}
          {weightHistory.length >= 2 && (
            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h3 className="text-[9px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Evolucao do Peso</h3>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={weightHistory}>
                  <defs>
                    <linearGradient id="weightGradBody" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }} formatter={(v: number) => [`${v} kg`, "Peso"]} />
                  <Area type="monotone" dataKey="peso" stroke="var(--primary)" fill="url(#weightGradBody)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* measurement fields */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[9px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Medidas Corporais</h3>
            <div className="space-y-1.5">
              {measurementFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                  <span className="text-[10px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                    {latest?.[key] != null ? `${latest[key]} cm` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* add measurement */}
          <button onClick={() => setShowMeasureForm(!showMeasureForm)}
            className="w-full px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}>
            {showMeasureForm ? "Cancelar" : "+ Nova Medicao"}
          </button>

          {showMeasureForm && (
            <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
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
                style={{ fontFamily: "'Sora', sans-serif", background: "var(--primary)", color: "white" }}>
                Salvar
              </button>
            </div>
          )}

          {/* history */}
          {sorted.length > 1 && (
            <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h3 className="text-[9px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>Historico</h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-hide">
                {sorted.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[8px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>{m.date}</span>
                    <div className="flex gap-3">
                      {m.weight != null && <span className="text-[9px]" style={{ color: "var(--foreground)" }}>{m.weight} kg</span>}
                      {m.chest != null && <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>P:{m.chest}</span>}
                      {m.waist != null && <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>C:{m.waist}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {subView === "medications" && (
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <MedicationTracker />
        </div>
      )}
    </div>
  );
}

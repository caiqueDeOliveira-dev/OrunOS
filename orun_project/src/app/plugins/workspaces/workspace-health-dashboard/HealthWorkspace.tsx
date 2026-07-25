// plugins/workspaces/workspace-health-dashboard/HealthWorkspace.tsx
//
// Health Dashboard workspace — interactive charts, metric cards,
// meal timeline, workout tracker, body measurements, and exam tracking.

import { useState, useCallback, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerHealthActions, unregisterHealthActions, setHealthStoreGetter } from "./health-actions";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ── Store ───────────────────────────────────────────────────────────────

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  icon: string;
  color: string;
}

interface Meal {
  id: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface BodyMeasurement {
  id: string;
  date: string;
  weight?: number;
  height?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  rightArm?: number;
  leftArm?: number;
  rightThigh?: number;
  leftThigh?: number;
}

interface ExamResult {
  name: string;
  value: string;
  unit: string;
  refRange?: string;
  flag?: "normal" | "high" | "low";
}

interface Exam {
  id: string;
  type: "blood" | "urine" | "other";
  name: string;
  date: string;
  results: ExamResult[];
  notes?: string;
}

interface HealthState {
  [key: string]: unknown;
  metrics: Metric[];
  meals: Meal[];
  bodyMeasurements: BodyMeasurement[];
  exams: Exam[];
  selectedRange: "today" | "week" | "month";
}

const useHealthStore = createStore<HealthState>({
  metrics: [],
  meals: [],
  bodyMeasurements: [],
  exams: [],
  selectedRange: "today",
});

// ── Macro Donut ─────────────────────────────────────────────────────────

function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const data = [
    { name: "Proteína", value: protein, color: "#C00018" },
    { name: "Carboidratos", value: carbs, color: "#3B82F6" },
    { name: "Gordura", value: fat, color: "#F59E0B" },
  ];
  const total = protein + carbs + fat;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontFamily: "'Inter', sans-serif" }}
            formatter={(v: number, name: string) => [`${v}g`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-lg font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{total}g</span>
          <span className="block text-[9px]" style={{ color: "var(--muted-foreground)" }}>total</span>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ─────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: Metric }) {
  const progress = Math.min((metric.value / metric.target) * 100, 100);
  const isOnTrack = metric.value >= metric.target * 0.8;

  return (
    <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {metric.icon} {metric.name}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
          background: isOnTrack ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: isOnTrack ? "#22C55E" : "#EF4444",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isOnTrack ? "✓" : "↓"}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
          {metric.value}
        </span>
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{metric.unit}</span>
      </div>
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: metric.color }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>0</span>
        <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{metric.target} {metric.unit}</span>
      </div>
    </div>
  );
}

// ── Meal Entry ──────────────────────────────────────────────────────────

function MealEntry({ meal }: { meal: Meal }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-medium mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C00018" }}>
        {meal.time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{meal.description}</p>
        <div className="flex gap-3 mt-1">
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{meal.calories} kcal</span>
          <span className="text-[9px]" style={{ color: "#C00018" }}>{meal.protein}g P</span>
          <span className="text-[9px]" style={{ color: "#3B82F6" }}>{meal.carbs}g C</span>
          <span className="text-[9px]" style={{ color: "#F59E0B" }}>{meal.fat}g G</span>
        </div>
      </div>
    </div>
  );
}

// ── Body View ───────────────────────────────────────────────────────────

function BodyView({ measurements }: { measurements: BodyMeasurement[] }) {
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

  const handleSubmit = () => {
    const parsed: Record<string, number | undefined> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== "") parsed[k] = Number(v);
    }
    if (Object.values(parsed).every((v) => v === undefined)) return;

    import("./health-actions").then(({ getHealthStore }) => {
      const store = getHealthStore();
      if (store) {
        const newEntry: BodyMeasurement = {
          id: `bm_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          ...parsed,
        };
        store.setState((s: HealthState) => ({
          bodyMeasurements: [...s.bodyMeasurements, newEntry],
        }));
      }
    });

    setForm({ weight: "", height: "", chest: "", waist: "", hips: "", rightArm: "", leftArm: "", rightThigh: "", leftThigh: "" });
    setShowForm(false);
  };

  const measurementFields = [
    { key: "chest", label: "Peito" },
    { key: "waist", label: "Cintura" },
    { key: "hips", label: "Quadril" },
    { key: "rightArm", label: "Braço Direito" },
    { key: "leftArm", label: "Braço Esquerdo" },
    { key: "rightThigh", label: "Coxa Direita" },
    { key: "leftThigh", label: "Coxa Esquerda" },
  ] as const;

  return (
    <div className="p-4 space-y-4">
      {/* Weight Card */}
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Peso
        </h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.weight != null ? latest.weight : "—"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>kg</span>
        </div>
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

      {/* Height Card */}
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Altura
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {latest?.height != null ? latest.height : "—"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>cm</span>
        </div>
      </div>

      {/* Measurements Card */}
      <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Medidas
        </h3>
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

      {/* Add Measurement Button + Form */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
        style={{
          fontFamily: "'Sora', sans-serif",
          background: showForm ? "rgba(192,0,24,0.12)" : "rgba(192,0,24,0.08)",
          color: "#C00018",
        }}
      >
        {showForm ? "Cancelar" : "+ Nova Medição"}
      </button>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Registrar Medição
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Altura (cm)</label>
              <input
                type="number"
                step="0.1"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
            {measurementFields.map(({ key, label }) => (
              <div key={key}>
                <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>{label} (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "#C00018", color: "white" }}
          >
            Salvar
          </button>
        </div>
      )}

      {/* History */}
      {sorted.length > 1 && (
        <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Histórico
          </h3>
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

// ── Exams View ──────────────────────────────────────────────────────────

function ExamsView({ exams, onAdd, onDelete }: { exams: Exam[]; onAdd: (exam: Omit<Exam, "id">) => void; onDelete: (id: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "blood" as "blood" | "urine" | "other", name: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [resultFields, setResultFields] = useState<{ name: string; value: string; unit: string; refRange: string; flag: "" | "normal" | "high" | "low" }[]>([
    { name: "", value: "", unit: "", refRange: "", flag: "" },
  ]);

  const sorted = [...exams].sort((a, b) => b.date.localeCompare(a.date));

  const typeIcon = (t: string) => t === "blood" ? "🩸" : t === "urine" ? "🧪" : "📋";
  const typeLabel = (t: string) => t === "blood" ? "Sangue" : t === "urine" ? "Urina" : "Outro";

  const addResultField = () => setResultFields([...resultFields, { name: "", value: "", unit: "", refRange: "", flag: "" }]);
  const updateResultField = (i: number, k: string, v: string) => {
    const copy = [...resultFields];
    (copy[i] as any)[k] = v;
    setResultFields(copy);
  };
  const removeResultField = (i: number) => setResultFields(resultFields.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!form.name) return;
    const results: ExamResult[] = resultFields
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        value: r.value,
        unit: r.unit,
        refRange: r.refRange || undefined,
        flag: (r.flag || undefined) as ExamResult["flag"],
      }));

    onAdd({
      type: form.type,
      name: form.name,
      date: form.date,
      results,
      notes: form.notes || undefined,
    });

    setForm({ type: "blood", name: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setResultFields([{ name: "", value: "", unit: "", refRange: "", flag: "" }]);
    setShowForm(false);
  };

  return (
    <div className="p-4 space-y-3">
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
        style={{
          fontFamily: "'Sora', sans-serif",
          background: showForm ? "rgba(192,0,24,0.12)" : "rgba(192,0,24,0.08)",
          color: "#C00018",
        }}
      >
        {showForm ? "Cancelar" : "+ Novo Exame"}
      </button>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Adicionar Exame
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              >
                <option value="blood">Sangue</option>
                <option value="urine">Urina</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome do Exame</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Hemograma Completo"
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>Resultados</label>
            {resultFields.map((r, i) => (
              <div key={i} className="grid grid-cols-5 gap-1 items-end">
                <input
                  type="text"
                  placeholder="Exame"
                  value={r.name}
                  onChange={(e) => updateResultField(i, "name", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                />
                <input
                  type="text"
                  placeholder="Valor"
                  value={r.value}
                  onChange={(e) => updateResultField(i, "value", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <input
                  type="text"
                  placeholder="Unidade"
                  value={r.unit}
                  onChange={(e) => updateResultField(i, "unit", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                />
                <input
                  type="text"
                  placeholder="Ref."
                  value={r.refRange}
                  onChange={(e) => updateResultField(i, "refRange", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                />
                <div className="flex gap-1">
                  <select
                    value={r.flag}
                    onChange={(e) => updateResultField(i, "flag", e.target.value)}
                    className="flex-1 px-1 py-1.5 rounded-md text-[9px] border outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
                  >
                    <option value="">—</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alto</option>
                    <option value="low">Baixo</option>
                  </select>
                  {resultFields.length > 1 && (
                    <button onClick={() => removeResultField(i)} className="px-1 rounded text-[9px]" style={{ color: "#EF4444" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addResultField} className="text-[9px] px-2 py-1 rounded" style={{ color: "#C00018" }}>+ resultado</button>
          </div>

          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none resize-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "#C00018", color: "white" }}
          >
            Salvar Exame
          </button>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-[10px] text-center py-6" style={{ color: "var(--muted-foreground)" }}>Nenhum exame registrado.</p>
      )}

      {sorted.map((exam) => (
        <div key={exam.id} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{typeIcon(exam.type)}</span>
              <div>
                <p className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{exam.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{typeLabel(exam.type)} · {exam.date}</p>
              </div>
            </div>
            <button onClick={() => onDelete(exam.id)} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: "#EF4444" }}>✕</button>
          </div>

          {exam.results.length > 0 && (
            <div className="space-y-1 mt-2">
              {exam.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>
                      {r.value} <span className="text-[8px] font-normal">{r.unit}</span>
                    </span>
                    {r.refRange && <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>({r.refRange})</span>}
                    {r.flag && (
                      <span className="text-[8px] px-1 py-0.5 rounded-full" style={{
                        background: r.flag === "normal" ? "rgba(34,197,94,0.1)" : r.flag === "high" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                        color: r.flag === "normal" ? "#22C55E" : r.flag === "high" ? "#EF4444" : "#3B82F6",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {r.flag === "normal" ? "Normal" : r.flag === "high" ? "Alto" : "Baixo"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {exam.notes && (
            <p className="text-[9px] mt-2 italic" style={{ color: "var(--muted-foreground)" }}>{exam.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function HealthWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const metrics = useHealthStore((s) => s.metrics);
  const meals = useHealthStore((s) => s.meals);
  const bodyMeasurements = useHealthStore((s) => s.bodyMeasurements);
  const exams = useHealthStore((s) => s.exams);
  const selectedRange = useHealthStore((s) => s.selectedRange);
  const [activeView, setActiveView] = useState<"overview" | "meals" | "workout" | "body" | "exams">("overview");

  useEffect(() => {
    registerHealthActions();
    setHealthStoreGetter(() => useHealthStore);
    return () => unregisterHealthActions();
  }, []);

  const handleAddExam = useCallback((exam: Omit<Exam, "id">) => {
    useHealthStore.setState((s: HealthState) => ({
      exams: [...s.exams, { ...exam, id: `ex_${Date.now()}` }],
    }));
  }, []);

  const handleDeleteExam = useCallback((id: string) => {
    useHealthStore.setState((s: HealthState) => ({
      exams: s.exams.filter((e) => e.id !== id),
    }));
  }, []);

  // Simulated weekly data for charts
  const weeklyData = [
    { day: "Seg", calorias: 1800, passos: 7200, peso: 78.8 },
    { day: "Ter", calorias: 2100, passos: 9100, peso: 78.6 },
    { day: "Qua", calorias: 1650, passos: 5800, peso: 78.5 },
    { day: "Qui", calorias: 2000, passos: 8400, peso: 78.3 },
    { day: "Sex", calorias: 1900, passos: 7600, peso: 78.5 },
    { day: "Sáb", calorias: 2200, passos: 10200, peso: 78.4 },
    { day: "Dom", calorias: 1450, passos: 6420, peso: 78.5 },
  ];

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  const tabs: { key: typeof activeView; label: string }[] = [
    { key: "overview", label: "Visão Geral" },
    { key: "meals", label: "Refeições" },
    { key: "workout", label: "Treino" },
    { key: "body", label: "Corpo" },
    { key: "exams", label: "Exames" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* View Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === tab.key ? 500 : 300,
              color: activeView === tab.key ? "var(--foreground)" : "var(--muted-foreground)",
              background: activeView === tab.key ? "rgba(192,0,24,0.08)" : "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === "overview" && (
        <div className="p-4 space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>

          {/* Weekly Calories Chart */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Calorias da Semana
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C00018" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C00018" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} />
                <Area type="monotone" dataKey="calorias" stroke="#C00018" fill="url(#calGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Macros Today */}
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Macros Hoje
            </h3>
            <MacroDonut protein={totalProtein} carbs={totalCarbs} fat={totalFat} />
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[9px]" style={{ color: "#C00018" }}>● Proteína {totalProtein}g</span>
              <span className="text-[9px]" style={{ color: "#3B82F6" }}>● Carbs {totalCarbs}g</span>
              <span className="text-[9px]" style={{ color: "#F59E0B" }}>● Gordura {totalFat}g</span>
            </div>
          </div>
        </div>
      )}

      {activeView === "meals" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              Refeições de Hoje
            </h3>
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", fontFamily: "'JetBrains Mono', monospace" }}>
              {totalCalories} kcal
            </span>
          </div>
          {meals.map((meal) => (
            <MealEntry key={meal.id} meal={meal} />
          ))}
        </div>
      )}

      {activeView === "workout" && (
        <div className="p-4 space-y-4">
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Treino de Hoje — Peito & Tríceps
          </h3>
          {[
            { name: "Supino Reto", series: "4x10", load: "60kg", done: true },
            { name: "Supino Inclinado", series: "3x12", load: "40kg", done: true },
            { name: "Crucifixo", series: "3x12", load: "14kg", done: false },
            { name: "Tríceps Pulley", series: "4x10", load: "25kg", done: false },
            { name: "Tríceps Testa", series: "3x12", load: "20kg", done: false },
            { name: "Mergulho", series: "3x até falha", load: "Corpo", done: false },
          ].map((ex, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: "var(--border)", background: ex.done ? "rgba(34,197,94,0.03)" : "var(--card)" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                background: ex.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                color: ex.done ? "#22C55E" : "var(--muted-foreground)",
              }}>
                <span className="text-[10px]">{ex.done ? "✓" : i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: "var(--foreground)", opacity: ex.done ? 0.5 : 1 }}>{ex.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{ex.series} — {ex.load}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === "body" && (
        <BodyView measurements={bodyMeasurements} />
      )}

      {activeView === "exams" && (
        <ExamsView exams={exams} onAdd={handleAddExam} onDelete={handleDeleteExam} />
      )}
    </div>
  );
}

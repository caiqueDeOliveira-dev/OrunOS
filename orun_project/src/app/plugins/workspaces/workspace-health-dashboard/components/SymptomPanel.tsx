import { useState } from "react";
import { AlertTriangle, X, ChevronDown } from "lucide-react";
import type { BodyRegion, Symptom, SymptomIntensity } from "../health-types";
import { BODY_REGION_LABELS, INTENSITY_COLORS, INTENSITY_LABELS } from "../health-types";
import { useHealthStore, addSymptom, deleteSymptom } from "../health-store";

interface SymptomPanelProps {
  selectedRegion: BodyRegion | null;
  onRegionClear: () => void;
}

const DURATION_OPTIONS = [
  "Menos de 1 hora",
  "1-6 horas",
  "6-24 horas",
  "1-3 dias",
  "Mais de 3 dias",
  "Cronico",
];

export function SymptomPanel({ selectedRegion, onRegionClear }: SymptomPanelProps) {
  const symptoms = useHealthStore((s) => s.symptoms);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: "",
    intensity: 3 as SymptomIntensity,
    duration: "",
    notes: "",
  });

  const regionSymptoms = selectedRegion
    ? symptoms.filter((s) => s.region === selectedRegion).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const allSymptoms = [...symptoms].sort((a, b) => b.date.localeCompare(a.date));
  const activeSymptoms = selectedRegion ? regionSymptoms : allSymptoms;

  const handleSubmit = () => {
    if (!selectedRegion || !form.description.trim()) return;
    addSymptom({
      date: new Date().toISOString().split("T")[0],
      region: selectedRegion,
      description: form.description.trim(),
      intensity: form.intensity,
      duration: form.duration || undefined,
      notes: form.notes.trim() || undefined,
    });
    setForm({ description: "", intensity: 3, duration: "", notes: "" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteSymptom(id);
  };

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} style={{ color: "var(--primary)" }} />
          <span className="text-[10px] font-medium tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {selectedRegion ? BODY_REGION_LABELS[selectedRegion] : "Todos os Sintomas"}
          </span>
          {selectedRegion && (
            <button onClick={onRegionClear}
              className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }}>
              ver todos
            </button>
          )}
        </div>
        {selectedRegion && (
          <button onClick={() => setShowForm(!showForm)}
            className="text-[9px] px-2 py-1 rounded-md transition-all"
            style={{
              background: showForm ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              fontFamily: "'Sora', sans-serif",
            }}>
            {showForm ? "Cancelar" : "+ Sintoma"}
          </button>
        )}
      </div>

      {/* form */}
      {showForm && selectedRegion && (
        <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Descricao</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Dor ao flexionar"
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
          </div>

          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Intensidade</label>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as SymptomIntensity[]).map((level) => (
                <button key={level} onClick={() => setForm({ ...form, intensity: level })}
                  className="flex-1 py-1.5 rounded-md text-[9px] font-medium transition-all"
                  style={{
                    background: form.intensity === level ? `${INTENSITY_COLORS[level]}22` : "transparent",
                    border: `1px solid ${form.intensity === level ? INTENSITY_COLORS[level] : "var(--border)"}`,
                    color: form.intensity === level ? INTENSITY_COLORS[level] : "var(--muted-foreground)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                  {level}
                </button>
              ))}
            </div>
            <span className="text-[8px] mt-0.5 block" style={{ color: INTENSITY_COLORS[form.intensity] }}>
              {INTENSITY_LABELS[form.intensity]}
            </span>
          </div>

          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Duracao</label>
            <div className="relative">
              <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none appearance-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}>
                <option value="">Selecione...</option>
                {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
            </div>
          </div>

          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Notas (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none resize-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              placeholder="Detalhes adicionais..." />
          </div>

          <button onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "var(--primary)", color: "white" }}>
            Registrar Sintoma
          </button>
        </div>
      )}

      {!selectedRegion && !showForm && (
        <p className="text-[9px] text-center py-2" style={{ color: "var(--muted-foreground)" }}>
          Clique em uma regiao do corpo para ver ou adicionar sintomas
        </p>
      )}

      {/* symptoms list */}
      <div className="space-y-1.5">
        {activeSymptoms.length === 0 && selectedRegion && (
          <p className="text-[9px] text-center py-3" style={{ color: "var(--muted-foreground)" }}>
            Nenhum sintoma registrado nesta regiao.
          </p>
        )}
        {activeSymptoms.map((s) => (
          <div key={s.id} className="p-2.5 rounded-lg border flex items-start gap-2.5 group"
            style={{ borderColor: `${INTENSITY_COLORS[s.intensity]}22`, background: `${INTENSITY_COLORS[s.intensity]}06` }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: `${INTENSITY_COLORS[s.intensity]}20` }}>
              <span className="text-[8px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: INTENSITY_COLORS[s.intensity] }}>
                {s.intensity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{s.description}</span>
                {!selectedRegion && (
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }}>
                    {BODY_REGION_LABELS[s.region]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{s.date}</span>
                {s.duration && <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>· {s.duration}</span>}
              </div>
              {s.notes && <p className="text-[8px] mt-1 italic" style={{ color: "var(--muted-foreground)" }}>{s.notes}</p>}
            </div>
            <button onClick={() => handleDelete(s.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
              style={{ color: "var(--err)" }}>
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

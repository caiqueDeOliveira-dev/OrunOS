import { useState } from "react";
import { Pill, X, ChevronDown } from "lucide-react";
import type { Medication } from "../health-types";
import { useHealthStore, addMedication, deactivateMedication, deleteMedication } from "../health-store";

const FREQUENCY_OPTIONS = [
  "A cada 8 horas",
  "A cada 12 horas",
  "1x ao dia",
  "2x ao dia",
  "3x ao dia",
  "Sob demanda",
  "Semanal",
];

export function MedicationTracker() {
  const medications = useHealthStore((s) => s.medications);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dosage: "", frequency: "", notes: "" });

  const activeMeds = medications.filter((m) => m.active);
  const inactiveMeds = medications.filter((m) => !m.active).sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    addMedication({
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency,
      startDate: new Date().toISOString().split("T")[0],
      notes: form.notes.trim() || undefined,
      active: true,
    });
    setForm({ name: "", dosage: "", frequency: "", notes: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill size={12} style={{ color: "var(--primary)" }} />
          <span className="text-[10px] font-medium tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            Medicacoes
          </span>
          {activeMeds.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(192,0,24,0.12)", color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>
              {activeMeds.length}
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-[9px] px-2 py-1 rounded-md transition-all"
          style={{
            background: showForm ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
            fontFamily: "'Sora', sans-serif",
          }}>
          {showForm ? "Cancelar" : "+ Medicacao"}
        </button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-2.5" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Paracetamol"
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Dosagem</label>
              <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                placeholder="Ex: 750mg"
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Frequencia</label>
              <div className="relative">
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none appearance-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}>
                  <option value="">Selecione...</option>
                  {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Notas (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none resize-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}
              placeholder="Ex: Tomar com alimento" />
          </div>
          <button onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "var(--primary)", color: "white" }}>
            Adicionar
          </button>
        </div>
      )}

      {/* active meds */}
      {activeMeds.length === 0 && !showForm && (
        <p className="text-[9px] text-center py-3" style={{ color: "var(--muted-foreground)" }}>
          Nenhuma medicacao ativa registrada.
        </p>
      )}

      <div className="space-y-1.5">
        {activeMeds.map((med) => (
          <div key={med.id} className="p-2.5 rounded-lg border flex items-start gap-2.5 group"
            style={{ borderColor: "rgba(192,0,24,0.15)", background: "rgba(192,0,24,0.03)" }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(192,0,24,0.15)" }}>
              <Pill size={10} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-medium block" style={{ color: "var(--foreground)" }}>{med.name}</span>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {med.dosage && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {med.dosage}
                  </span>
                )}
                {med.frequency && (
                  <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{med.frequency}</span>
                )}
              </div>
              {med.notes && <p className="text-[8px] mt-1 italic" style={{ color: "var(--muted-foreground)" }}>{med.notes}</p>}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => deactivateMedication(med.id)}
                className="text-[8px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }}>
                desativar
              </button>
              <button onClick={() => deleteMedication(med.id)}
                className="p-1 rounded" style={{ color: "var(--err)" }}>
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* inactive meds */}
      {inactiveMeds.length > 0 && (
        <details className="group/inactive">
          <summary className="text-[9px] cursor-pointer select-none" style={{ color: "var(--muted-foreground)" }}>
            Historico ({inactiveMeds.length})
          </summary>
          <div className="space-y-1 mt-1.5">
            {inactiveMeds.map((med) => (
              <div key={med.id} className="p-2 rounded-lg border flex items-center justify-between opacity-60"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div>
                  <span className="text-[9px]" style={{ color: "var(--foreground)" }}>{med.name}</span>
                  {med.dosage && <span className="text-[8px] ml-1" style={{ color: "var(--muted-foreground)" }}>{med.dosage}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[7px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
                    {med.startDate} → {med.endDate || "?"}
                  </span>
                  <button onClick={() => deleteMedication(med.id)} className="p-0.5 rounded" style={{ color: "var(--err)" }}>
                    <X size={8} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

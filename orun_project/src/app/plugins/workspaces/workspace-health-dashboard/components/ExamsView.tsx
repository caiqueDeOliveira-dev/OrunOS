import { useState } from "react";
import { Droplet, TestTube2, ClipboardList } from "lucide-react";
import type { Exam, ExamResult } from "../health-types";
import { useHealthStore, addExam, deleteExam } from "../health-store";

export function ExamsView() {
  const exams = useHealthStore((s) => s.exams);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "blood" as "blood" | "urine" | "other", name: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [resultFields, setResultFields] = useState<{ name: string; value: string; unit: string; refRange: string; flag: "" | "normal" | "high" | "low" }[]>([
    { name: "", value: "", unit: "", refRange: "", flag: "" },
  ]);

  const sorted = [...exams].sort((a, b) => b.date.localeCompare(a.date));

  const addResultField = () => setResultFields([...resultFields, { name: "", value: "", unit: "", refRange: "", flag: "" }]);
  const updateResultField = (i: number, k: string, v: string) => {
    const copy = [...resultFields];
    (copy as any)[i][k] = v;
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

    addExam({ type: form.type, name: form.name, date: form.date, results, notes: form.notes || undefined });

    setForm({ type: "blood", name: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setResultFields([{ name: "", value: "", unit: "", refRange: "", flag: "" }]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este exame?")) deleteExam(id);
  };

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => setShowForm(!showForm)}
        className="w-full px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
        style={{ fontFamily: "'Sora', sans-serif", background: showForm ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)", color: "var(--primary)" }}>
        {showForm ? "Cancelar" : "+ Novo Exame"}
      </button>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <h3 className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Adicionar Exame</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Tipo</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}>
                <option value="blood">Sangue</option>
                <option value="urine">Urina</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
            </div>
          </div>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Nome do Exame</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Hemograma Completo"
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>Resultados</label>
            {resultFields.map((r, i) => (
              <div key={i} className="grid grid-cols-5 gap-1 items-end">
                <input type="text" placeholder="Exame" value={r.name} onChange={(e) => updateResultField(i, "name", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
                <input type="text" placeholder="Valor" value={r.value} onChange={(e) => updateResultField(i, "value", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
                <input type="text" placeholder="Unidade" value={r.unit} onChange={(e) => updateResultField(i, "unit", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
                <input type="text" placeholder="Ref." value={r.refRange} onChange={(e) => updateResultField(i, "refRange", e.target.value)}
                  className="px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
                <div className="flex gap-1">
                  <select value={r.flag} onChange={(e) => updateResultField(i, "flag", e.target.value)}
                    className="flex-1 px-1 py-1.5 rounded-md text-[9px] border outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }}>
                    <option value="">—</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alto</option>
                    <option value="low">Baixo</option>
                  </select>
                  {resultFields.length > 1 && (
                    <button onClick={() => removeResultField(i)} className="px-1 rounded text-[9px]" style={{ color: "var(--err)" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={addResultField} className="text-[9px] px-2 py-1 rounded" style={{ color: "var(--primary)" }}>+ resultado</button>
          </div>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Notas (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none resize-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
          </div>
          <button onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{ fontFamily: "'Sora', sans-serif", background: "var(--primary)", color: "white" }}>
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
              <span className="text-sm">{exam.type === "blood" ? <Droplet size={14} /> : exam.type === "urine" ? <TestTube2 size={14} /> : <ClipboardList size={14} />}</span>
              <div>
                <p className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{exam.name}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                  {exam.type === "blood" ? "Sangue" : exam.type === "urine" ? "Urina" : "Outro"} · {exam.date}
                </p>
              </div>
            </div>
            <button onClick={() => handleDelete(exam.id)} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: "var(--err)" }}>✕</button>
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
                        color: r.flag === "normal" ? "var(--ok)" : r.flag === "high" ? "var(--err)" : "var(--info)",
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
          {exam.notes && <p className="text-[9px] mt-2 italic" style={{ color: "var(--muted-foreground)" }}>{exam.notes}</p>}
        </div>
      ))}
    </div>
  );
}

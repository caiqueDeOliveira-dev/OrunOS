import { useState } from "react";
import { useWhiteboardStore, addLesson, deleteLesson } from "../teacher-store";

export function LessonPlanner() {
  const lessons = useWhiteboardStore((s) => s.lessons);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", duration: "50min", objectives: [""] });

  const updateObjective = (i: number, v: string) => {
    const copy = [...form.objectives];
    copy[i] = v;
    setForm({ ...form, objectives: copy });
  };

  const addObjective = () => setForm({ ...form, objectives: [...form.objectives, ""] });
  const removeObjective = (i: number) => setForm({ ...form, objectives: form.objectives.filter((_, idx) => idx !== i) });

  const handleSubmit = () => {
    if (!form.title) return;
    addLesson({
      title: form.title,
      subject: form.subject,
      duration: form.duration,
      objectives: form.objectives.filter((o) => o.trim()),
    });
    setForm({ title: "", subject: "", duration: "50min", objectives: [""] });
    setShowForm(false);
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto scrollbar-hide" style={{ maxHeight: "100%" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Planos de Aula ({lessons.length})
        </h3>
        <button onClick={() => setShowForm(!showForm)}
          className="px-2 py-1 rounded-md text-[9px] tracking-wider uppercase transition-all"
          style={{ fontFamily: "'Sora', sans-serif", background: showForm ? "rgba(192,0,24,0.12)" : "rgba(192,0,24,0.08)", color: "#C00018" }}>
          {showForm ? "Cancelar" : "+ Novo Plano"}
        </button>
      </div>

      {showForm && (
        <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div>
            <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Título</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Introdução à Álgebra"
              className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
              style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Matéria</label>
              <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Ex: Matemática"
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label className="text-[9px] block mb-1" style={{ color: "var(--muted-foreground)" }}>Duração</label>
              <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="Ex: 50min"
                className="w-full px-2 py-1.5 rounded-md text-[10px] border outline-none"
                style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>Objetivos</label>
            {form.objectives.map((obj, i) => (
              <div key={i} className="flex gap-1">
                <input type="text" value={obj} onChange={(e) => updateObjective(i, e.target.value)}
                  placeholder={`Objetivo ${i + 1}`}
                  className="flex-1 px-2 py-1.5 rounded-md text-[10px] border outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--foreground)" }} />
                {form.objectives.length > 1 && (
                  <button onClick={() => removeObjective(i)} className="px-1 rounded text-[9px]" style={{ color: "#EF4444" }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addObjective} className="text-[9px] px-2 py-1 rounded" style={{ color: "#C00018" }}>+ objetivo</button>
          </div>
          <button onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase"
            style={{ fontFamily: "'Sora', sans-serif", background: "#C00018", color: "white" }}>
            Salvar Plano
          </button>
        </div>
      )}

      {lessons.length === 0 && !showForm && (
        <p className="text-[10px] text-center py-6" style={{ color: "var(--muted-foreground)" }}>
          Nenhum plano de aula cadastrado.
        </p>
      )}

      {lessons.map((lesson) => (
        <div key={lesson.id} className="p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{lesson.title}</p>
              <p className="text-[9px]" style={{ color: "#C00018" }}>{lesson.subject}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{
                background: "rgba(59,130,246,0.1)", color: "#3B82F6", fontFamily: "'JetBrains Mono', monospace",
              }}>
                {lesson.duration}
              </span>
              <button onClick={() => deleteLesson(lesson.id)} className="text-[9px] px-1 rounded" style={{ color: "#EF4444" }}>✕</button>
            </div>
          </div>
          <div className="space-y-1">
            {lesson.objectives.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full" style={{ background: "#C00018" }} />
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{obj}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

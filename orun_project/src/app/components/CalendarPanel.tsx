import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { isElectron } from "../constants";

interface CalendarEvent {
  id: string; summary: string; description?: string;
  start: { dateTime: string; date?: string; timeZone?: string };
  end: { dateTime: string; date?: string; timeZone?: string };
  created?: string; status?: string;
}

export function CalendarPanel({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [connected, setConnected] = useState(false);
  const [form, setForm] = useState({ summary: "", description: "", startTime: "", endTime: "" });

  useEffect(() => {
    if (!isElectron) return;
    window.orun.google.isConnected().then(setConnected);
    loadEvents();
  }, []);

  const loadEvents = async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString();
      const items = await window.orun.calendar.listEvents({ maxResults: 50, timeMax: weekEnd });
      setEvents(items);
    } catch { setEvents([]); }
    setLoading(false);
  };

  const handleCreate = useCallback(async () => {
    if (!form.summary || !form.startTime || !form.endTime) return;
    try {
      await window.orun.calendar.createEvent({
        summary: form.summary,
        description: form.description,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setForm({ summary: "", description: "", startTime: "", endTime: "" });
      setShowCreate(false);
      loadEvents();
    } catch {}
  }, [form]);

  const handleDelete = useCallback(async (eventId: string) => {
    try {
      await window.orun.calendar.deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {}
  }, []);

  if (!isElectron) return null;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--foreground)" }}>Calendário</span>
        {connected && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Google</span>}
        <button onClick={() => setShowCreate(true)} className="ml-auto px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>+ Novo</button>
        <button onClick={loadEvents} className="px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>Atualizar</button>
        <button onClick={onClose} className="px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {showCreate && (
          <div className="p-3 rounded-xl space-y-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <input
              placeholder="Título"
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg text-[10px]"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <input
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg text-[10px]"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <div className="flex gap-2">
              <input type="datetime-local" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <input type="datetime-local" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 py-1.5 rounded-lg text-[9px]" style={{ background: "#C00018", color: "#fff" }}>Criar</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 rounded-lg text-[9px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <span className="text-lg">📅</span>
            <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              {connected ? "Nenhum evento nos próximos 7 dias" : "Conecte o Google Calendar nas Configurações"}
            </span>
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="p-3 rounded-xl space-y-1" style={{ background: "var(--secondary)" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{ev.summary}</div>
                <button onClick={() => handleDelete(ev.id)} className="text-[9px] shrink-0" style={{ color: "#ef4444" }}>✕</button>
              </div>
              {ev.description && (
                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{ev.description}</div>
              )}
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {new Date(ev.start.dateTime ?? ev.start.date ?? "").toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {" → "}
                {new Date(ev.end.dateTime ?? ev.end.date ?? "").toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

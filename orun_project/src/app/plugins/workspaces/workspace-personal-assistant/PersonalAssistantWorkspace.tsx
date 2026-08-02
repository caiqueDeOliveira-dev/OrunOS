import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { registerPersonalAssistantActions, unregisterPersonalAssistantActions } from "./personal-assistant-actions";
import { isElectron } from "../../../constants";

interface CalendarEvent {
  id: string; summary: string; description?: string;
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
}

interface GmailMessage {
  id: string; threadId: string; from: string;
  subject: string; snippet: string; body: string;
  labelIds: string[]; internalDate: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const eventDate = (ev: CalendarEvent) => new Date(ev.start.dateTime ?? ev.start.date ?? "");
const fmtTimeRange = (ev: CalendarEvent) => {
  if (ev.start.date) return "Dia inteiro";
  const s = new Date(ev.start.dateTime);
  const e = new Date(ev.end.dateTime ?? "");
  return `${s.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function PersonalAssistantWorkspace() {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ summary: "", startTime: "", endTime: "" });
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmails, setShowEmails] = useState(true);

  const loadCalendar = useCallback(() => {
    if (!isElectron) return;
    setLoadingEvents(true);
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    window.orun.calendar
      .listEvents({ maxResults: 200, timeMin: start.toISOString(), timeMax: end.toISOString() })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [viewMonth]);

  const loadEmails = useCallback(async () => {
    if (!isElectron) return;
    setLoadingEmails(true);
    try {
      const list = await window.orun.gmail.listMessages({ maxResults: 15 });
      const full = await Promise.all(list.slice(0, 10).map((m) => window.orun.gmail.getMessage(m.id)));
      setEmails(full.filter(Boolean) as GmailMessage[]);
    } catch { setEmails([]); }
    setLoadingEmails(false);
  }, []);

  useEffect(() => {
    registerPersonalAssistantActions();
    if (!isElectron) return;
    window.orun.google.isConnected().then(setConnected);
    loadEmails();
    return () => unregisterPersonalAssistantActions();
  }, [loadEmails]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const refreshAll = useCallback(() => {
    loadCalendar();
    loadEmails();
  }, [loadCalendar, loadEmails]);

  const eventsForDay = useCallback((day: Date) =>
    events.filter((ev) => {
      const d = eventDate(ev);
      return !isNaN(d.getTime()) && d.toDateString() === day.toDateString();
    }), [events]);

  const monthCells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = first.getDay();
    const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < start; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return cells;
  }, [viewMonth]);

  const selectedEvents = useMemo(() =>
    eventsForDay(selectedDate).slice().sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime()),
    [eventsForDay, selectedDate]);

  const nextWeek = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    return events
      .filter((ev) => {
        const d = eventDate(ev);
        return d >= now && d <= end;
      })
      .sort((a, b) => eventDate(a).getTime() - eventDate(b).getTime());
  }, [events]);

  const openCreateEvent = useCallback(() => {
    const day = new Date(selectedDate);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10, 0);
    setEventForm({ summary: "", startTime: toLocalInput(start), endTime: toLocalInput(end) });
    setShowCreateEvent(true);
  }, [selectedDate]);

  const handleCreateEvent = useCallback(async () => {
    if (!eventForm.summary || !eventForm.startTime || !eventForm.endTime) return;
    try {
      await window.orun.calendar.createEvent({
        summary: eventForm.summary,
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
      });
      setEventForm({ summary: "", startTime: "", endTime: "" });
      setShowCreateEvent(false);
      loadCalendar();
    } catch { /* ignore */ }
  }, [eventForm, loadCalendar]);

  const handleReply = useCallback(async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);
    try {
      await window.orun.gmail.reply(selectedEmail.id, replyText);
      setReplyText("");
      setSelectedEmail(null);
      loadEmails();
    } catch { /* ignore */ }
    setSending(false);
  }, [selectedEmail, replyText, loadEmails]);

  const unreadEmails = emails.filter((m) => m.labelIds?.includes("UNREAD"));
  const today = new Date();
  const todayStr = today.toDateString();
  const selectedStr = selectedDate.toDateString();

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <CalendarDays size={12} style={{ color: "#0EA5E9" }} />
        <span className="text-[11px] font-semibold" style={{ color: "var(--foreground)" }}>Assistente Pessoal</span>
        {connected && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Google</span>}
        <div className="ml-auto flex gap-1.5">
          <button onClick={openCreateEvent} className="px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>+ Evento</button>
          <button onClick={refreshAll} className="px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>Atualizar</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ws-scrollbar p-3 space-y-4">
        {!connected && (
          <div className="px-3 py-2 rounded-xl text-[9px]" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
            Conecte o Google Calendar e o Gmail nas Configurações para sincronizar sua agenda.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Month calendar */}
          <div className="lg:col-span-2 p-3 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                  className="p-1 rounded hover:bg-white/[0.05]"><ChevronLeft size={12} /></button>
                <span className="text-[11px] font-semibold capitalize" style={{ color: "var(--foreground)" }}>
                  {viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </span>
                <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                  className="p-1 rounded hover:bg-white/[0.05]"><ChevronRight size={12} /></button>
              </div>
              <button onClick={() => { setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(new Date()); }}
                className="px-2 py-1 rounded text-[9px]" style={{ background: "rgba(192,0,24,0.12)", color: "#C00018" }}>
                Hoje
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[8px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((day, i) => day === null ? (
                <div key={`empty-${i}`} className="h-10 rounded-lg" />
              ) : (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className="h-10 flex flex-col items-center justify-center rounded-lg"
                  style={{
                    background: day.toDateString() === selectedStr ? "#0EA5E9" : "transparent",
                    color: day.toDateString() === selectedStr ? "#fff" : "var(--foreground)",
                    border: day.toDateString() === todayStr ? "1px solid #C00018" : "1px solid transparent",
                  }}
                >
                  <span className="text-[9px] font-medium leading-none">{day.getDate()}</span>
                  <div className="flex gap-0.5 mt-1 h-1">
                    {eventsForDay(day).slice(0, 3).map((ev) => (
                      <span key={ev.id} className="w-1 h-1 rounded-full"
                        style={{ background: day.toDateString() === selectedStr ? "#fff" : "#0EA5E9" }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div className="p-3 rounded-2xl flex flex-col gap-2" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold" style={{ color: "var(--foreground)" }}>Agenda</span>
              <button onClick={openCreateEvent} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px]"
                style={{ background: "rgba(14,165,233,0.15)", color: "#0EA5E9" }}>
                <Plus size={9} /> Novo evento
              </button>
            </div>
            <div className="text-[9px] capitalize" style={{ color: "var(--muted-foreground)" }}>
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>

            {showCreateEvent && (
              <div className="p-2.5 rounded-xl space-y-1.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <input
                  placeholder="Título do evento"
                  value={eventForm.summary}
                  onChange={(e) => setEventForm((p) => ({ ...p, summary: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-[10px]"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
                <div className="flex gap-1.5">
                  <input type="datetime-local" value={eventForm.startTime}
                    onChange={(e) => setEventForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[9px]"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  <input type="datetime-local" value={eventForm.endTime}
                    onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[9px]"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleCreateEvent} className="flex-1 py-1.5 rounded-lg text-[9px]" style={{ background: "#0EA5E9", color: "#fff" }}>Criar</button>
                  <button onClick={() => setShowCreateEvent(false)} className="flex-1 py-1.5 rounded-lg text-[9px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Cancelar</button>
                </div>
              </div>
            )}

            {loadingEvents ? (
              <div className="text-[10px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
            ) : selectedEvents.length === 0 ? (
              <div className="text-[10px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
                {connected ? "Nenhum evento neste dia" : "Conecte o Google Calendar nas Configurações"}
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl" style={{ background: "var(--secondary)", borderLeft: "2px solid #0EA5E9" }}>
                    <div className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{ev.summary}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{fmtTimeRange(ev)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Next 7 days */}
        {nextWeek.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "#0EA5E9" }}>Próximos 7 dias</span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{nextWeek.length} evento{nextWeek.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1.5">
              {nextWeek.map((ev) => (
                <button key={ev.id} onClick={() => { const d = eventDate(ev); setSelectedDate(d); setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}
                  className="w-full text-left p-2.5 rounded-xl" style={{ background: "var(--secondary)" }}>
                  <div className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{ev.summary}</div>
                  <div className="text-[9px] mt-0.5 capitalize" style={{ color: "var(--muted-foreground)" }}>
                    {ev.start.date ? eventDate(ev).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) : `${eventDate(ev).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${fmtTimeRange(ev)}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Emails */}
        <div>
          <button onClick={() => setShowEmails(!showEmails)} className="w-full flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#0EA5E9" }}>Emails</span>
            {unreadEmails.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(192,0,24,0.15)", color: "#C00018" }}>
                {unreadEmails.length} não lido{unreadEmails.length !== 1 ? "s" : ""}
              </span>
            )}
          </button>

          {showEmails && (
            selectedEmail ? (
              <div className="space-y-2">
                <button onClick={() => { setSelectedEmail(null); setReplyText(""); }} className="text-[9px]" style={{ color: "#0EA5E9" }}>← Voltar</button>
                <div className="p-3 rounded-xl space-y-1" style={{ background: "var(--secondary)" }}>
                  <div className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{selectedEmail.subject}</div>
                  <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{selectedEmail.from}</div>
                </div>
                <div className="p-3 rounded-xl text-[10px] whitespace-pre-wrap max-h-40 overflow-auto" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                  {selectedEmail.body || selectedEmail.snippet}
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="w-full p-2.5 rounded-xl text-[10px] resize-none"
                  rows={3}
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !replyText.trim()}
                  className="w-full py-1.5 rounded-lg text-[9px] disabled:opacity-30"
                  style={{ background: "#0EA5E9", color: "#fff" }}
                >
                  {sending ? "Enviando..." : "Responder"}
                </button>
              </div>
            ) : (
              <>
                {loadingEmails ? (
                  <div className="text-[10px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
                ) : emails.length === 0 ? (
                  <div className="text-[10px] py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
                    {connected ? "Nenhum email" : "Conecte o Gmail nas Configurações"}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {emails.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => setSelectedEmail(msg)}
                        className="w-full text-left p-2.5 rounded-xl"
                        style={{ background: "var(--secondary)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium truncate" style={{ color: "var(--foreground)" }}>{msg.subject}</span>
                          {msg.labelIds?.includes("UNREAD") && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#C00018" }} />
                          )}
                        </div>
                        <div className="text-[9px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{msg.from}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

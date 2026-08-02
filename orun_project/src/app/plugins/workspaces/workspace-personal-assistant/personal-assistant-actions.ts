import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "personal-assistant";
let registered = false;

const actions = {
  async create_reminder(params: Record<string, unknown>) {
    const text = String(params.text || "");
    const date = String(params.date || "");
    const time = String(params.time || "");
    if (!text) return { success: false, error: "text is required" };
    return {
      success: true,
      data: { text, date, time, created_at: new Date().toISOString() },
      message: `Lembrete criado: "${text}"${date ? ` para ${date}` : ""}${time ? ` às ${time}` : ""}`,
    };
  },

  async get_agenda() {
    try {
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString();
      const events = await (window as any).orun.calendar.listEvents({ maxResults: 50, timeMax: weekEnd });
      return { success: true, data: { events, count: events.length } };
    } catch (err: any) {
      return { success: true, data: { events: [], count: 0 }, message: "Google Calendar não conectado" };
    }
  },

  async create_event(params: Record<string, unknown>) {
    const summary = String(params.summary || "");
    const startTime = String(params.startTime || "");
    const endTime = String(params.endTime || "");
    const description = params.description ? String(params.description) : undefined;
    if (!summary || !startTime || !endTime) {
      return { success: false, error: "summary, startTime, and endTime are required" };
    }
    try {
      const event = await (window as any).orun.calendar.createEvent({ summary, description, startTime, endTime });
      return { success: true, data: event, message: `Evento criado: "${summary}"` };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to create event" };
    }
  },

  async delete_event(params: Record<string, unknown>) {
    const eventId = String(params.eventId || "");
    if (!eventId) return { success: false, error: "eventId is required" };
    try {
      await (window as any).orun.calendar.deleteEvent(eventId);
      return { success: true, message: "Evento excluído" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete event" };
    }
  },

  async list_emails() {
    try {
      const list = await (window as any).orun.gmail.listMessages({ maxResults: 10 });
      const messages = await Promise.all(
        list.map((m: any) => (window as any).orun.gmail.getMessage(m.id))
      );
      return { success: true, data: { messages: messages.filter(Boolean), count: list.length } };
    } catch (err: any) {
      return { success: true, data: { messages: [], count: 0 }, message: "Gmail não conectado" };
    }
  },

  async send_email(params: Record<string, unknown>) {
    const to = String(params.to || "");
    const subject = String(params.subject || "");
    const body = String(params.body || "");
    if (!to || !subject || !body) {
      return { success: false, error: "to, subject, and body are required" };
    }
    try {
      await (window as any).orun.gmail.send(to, subject, body);
      return { success: true, message: `Email enviado para ${to}: "${subject}"` };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send email" };
    }
  },
};

export function registerPersonalAssistantActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterPersonalAssistantActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

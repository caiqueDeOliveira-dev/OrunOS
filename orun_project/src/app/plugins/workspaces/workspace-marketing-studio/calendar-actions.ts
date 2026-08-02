import type { MarketingState, CalendarEvent } from "./marketing-types";

interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setCalendarStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

export const calendarActions = {
  async add_calendar_event(params: Record<string, unknown>) {
    const date = String(params.date || "");
    const title = String(params.title || "");
    const type = String(params.type || "post");
    const platform = String(params.platform || "");

    if (!title) return { success: false, error: "title is required" };
    if (!date) return { success: false, error: "date is required" };

    const validTypes = ["post", "email", "ad", "blog"];
    const eventType = validTypes.includes(type) ? type : "post";

    const event: CalendarEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      title,
      type: eventType as CalendarEvent["type"],
      platform,
    };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      events: [...(s.events || []), event],
    }));

    return { success: true, data: event, message: `Event "${title}" added for ${date}` };
  },

  async get_calendar_events() {
    const store = getMarketingState();
    const state = store.getState();
    return {
      success: true,
      data: {
        events: state.events || [],
        count: (state.events || []).length,
      },
    };
  },
};

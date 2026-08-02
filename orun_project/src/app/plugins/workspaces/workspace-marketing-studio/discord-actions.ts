import type { MarketingState, DiscordState } from "./marketing-types";

interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setDiscordStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

async function getDiscordAPI() {
  if (!window.orun?.discord) return null;
  return window.orun.discord;
}

export const discordActions = {
  async discord_get_status() {
    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available", data: { status: "disconnected" } };
    try {
      const status = await api.getStatus();
      return { success: true, data: { status } };
    } catch (e: any) {
      return { success: false, error: e.message, data: { status: "error" } };
    }
  },

  async discord_connect(params: Record<string, unknown>) {
    const token = String(params.token || "");
    if (!token) return { success: false, error: "Token is required" };

    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available" };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      discord: { ...s.discord, status: "connecting" },
    }));

    try {
      const saved = await api.setToken(token);
      if (!saved.ok) return { success: false, error: "Failed to save token" };
      const result = await api.connect(token);
      if (!result.ok) {
        store.setState((s: MarketingState) => ({
          discord: { ...s.discord, status: "error" },
        }));
        return { success: false, error: result.error || "Failed to connect" };
      }
      const status = await api.getStatus();
      store.setState((s: MarketingState) => ({
        discord: { ...s.discord, status: status as DiscordState["status"] },
      }));
      return { success: true, message: "Connected to Discord" };
    } catch (e: any) {
      store.setState((s: MarketingState) => ({
        discord: { ...s.discord, status: "error" },
      }));
      return { success: false, error: e.message };
    }
  },

  async discord_disconnect() {
    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available" };

    try {
      await api.disconnect();
      const store = getMarketingState();
      store.setState((s: MarketingState) => ({
        discord: { status: "disconnected", guilds: [], selectedGuildId: null, channels: [], selectedChannelId: null, autoResponse: false },
      }));
      return { success: true, message: "Disconnected from Discord" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async discord_get_guilds() {
    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available", data: { guilds: [] } };

    try {
      const guilds = await api.getGuilds();
      const store = getMarketingState();
      store.setState((s: MarketingState) => ({ discord: { ...s.discord, guilds } }));
      return { success: true, data: { guilds } };
    } catch (e: any) {
      return { success: false, error: e.message, data: { guilds: [] } };
    }
  },

  async discord_get_channels(params: Record<string, unknown>) {
    const guildId = String(params.guildId || "");
    if (!guildId) return { success: false, error: "guildId is required" };

    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available", data: { channels: [] } };

    try {
      const channels = await api.getChannels(guildId);
      const store = getMarketingState();
      store.setState((s: MarketingState) => ({
        discord: { ...s.discord, channels, selectedGuildId: guildId },
      }));
      return { success: true, data: { channels } };
    } catch (e: any) {
      return { success: false, error: e.message, data: { channels: [] } };
    }
  },

  async discord_send_message(params: Record<string, unknown>) {
    const channelId = String(params.channelId || "");
    const content = String(params.content || "");
    if (!channelId) return { success: false, error: "channelId is required" };
    if (!content) return { success: false, error: "content is required" };

    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available" };

    try {
      const result = await api.sendMessage(channelId, content);
      return result.ok
        ? { success: true, data: { messageId: result.messageId }, message: "Message sent" }
        : { success: false, error: result.error || "Failed to send message" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async discord_select_channel(params: Record<string, unknown>) {
    const channelId = String(params.channelId || "");
    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      discord: { ...s.discord, selectedChannelId: channelId || null },
    }));
    return { success: true, data: { channelId } };
  },

  async discord_set_auto_response(params: Record<string, unknown>) {
    const enabled = Boolean(params.enabled);

    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available" };

    try {
      await api.setAgentResponse(enabled);
      const store = getMarketingState();
      store.setState((s: MarketingState) => ({
        discord: { ...s.discord, autoResponse: enabled },
      }));
      return { success: true, message: enabled ? "Auto-response enabled" : "Auto-response disabled" };
    } catch (e: any) {
      return { success: false, error: e.message, message: `Failed to ${enabled ? "enable" : "disable"} auto-response` };
    }
  },

  async discord_get_auto_response() {
    const api = await getDiscordAPI();
    if (!api) return { success: false, error: "Discord bridge not available", data: { enabled: false } };

    try {
      const enabled = await api.getAgentResponse();
      const store = getMarketingState();
      store.setState((s: MarketingState) => ({
        discord: { ...s.discord, autoResponse: enabled },
      }));
      return { success: true, data: { enabled } };
    } catch (e: any) {
      return { success: false, error: e.message, data: { enabled: false } };
    }
  },
};

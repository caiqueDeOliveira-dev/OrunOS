// Marketing store — shared by all components
import { createStore } from "../../lib/store";
import type { MarketingState } from "./marketing-types";

type StoreState = MarketingState & Record<string, unknown>;

export const useMarketingStore = createStore<StoreState>({
  campaigns: [],
  events: [],
  tests: [],
  posts: [],
  scheduledPosts: [],
  discord: {
    status: "disconnected",
    guilds: [],
    selectedGuildId: null,
    channels: [],
    selectedChannelId: null,
    autoResponse: false,
  },
});

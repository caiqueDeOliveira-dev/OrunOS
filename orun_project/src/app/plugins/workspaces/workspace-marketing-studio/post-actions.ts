import type { MarketingState, MarketingPost } from "./marketing-types";

interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setPostStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

export const postActions = {
  async create_post(params: Record<string, unknown>) {
    const title = String(params.title || "");
    const body = String(params.body || "");
    const channel = String(params.channel || "Instagram");
    const imageUrl = typeof params.image_url === "string" ? params.image_url : undefined;

    if (!title) return { success: false, error: "title is required" };

    const post: MarketingPost = {
      id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      channel,
      imageUrl,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      posts: [...(s.posts || []), post],
    }));

    return { success: true, data: post, message: `Post "${title}" created for ${channel}` };
  },

  async get_posts() {
    const store = getMarketingState();
    const state = store.getState();
    return {
      success: true,
      data: {
        posts: state.posts || [],
        count: (state.posts || []).length,
      },
    };
  },
};

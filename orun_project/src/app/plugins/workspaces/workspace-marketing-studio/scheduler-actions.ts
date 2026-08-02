import type { MarketingState, ScheduledPost } from "./marketing-types";

interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setSchedulerStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

async function publishViaSocialMedia(post: ScheduledPost): Promise<{ ok: boolean; results: Array<{ platform: string; ok: boolean; error?: string }> }> {
  if (!window.orun?.socialMedia?.publishMulti) {
    return { ok: false, results: [{ platform: "all", ok: false, error: "Social media API not available" }] };
  }

  const results: Array<{ platform: string; ok: boolean; error?: string }> = [];
  for (const platform of post.platforms) {
    try {
      const platforms = [platform] as ["instagram" | "tiktok" | "twitter"];
      const result = await window.orun.socialMedia.publishMulti({
        platforms,
        text: post.content,
        hashtags: post.hashtags,
        imageUrl: post.imageUrl,
      });
      const r = result[0];
      results.push({ platform, ok: r.ok, error: r.error });
    } catch (e: any) {
      results.push({ platform, ok: false, error: e.message });
    }
  }

  return { ok: results.some((r) => r.ok), results };
}

export const schedulerActions = {
  async schedule_post(params: Record<string, unknown>) {
    const title = String(params.title || "");
    const content = String(params.content || "");
    const platformsRaw = params.platforms;
    const platforms = Array.isArray(platformsRaw) ? platformsRaw.map(String) : ["instagram"];
    const scheduledAt = String(params.scheduledAt || "");
    const hashtagsRaw = params.hashtags;
    const hashtags = Array.isArray(hashtagsRaw) ? hashtagsRaw.map(String) : [];
    const imageUrl = typeof params.imageUrl === "string" ? params.imageUrl : undefined;

    if (!title) return { success: false, error: "title is required" };
    if (!content) return { success: false, error: "content is required" };
    if (!scheduledAt) return { success: false, error: "scheduledAt is required" };

    const post: ScheduledPost = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      content,
      platforms,
      scheduledAt,
      status: "pending",
      hashtags,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      scheduledPosts: [...(s.scheduledPosts || []), post],
    }));

    return { success: true, data: post, message: `Post "${title}" scheduled for ${new Date(scheduledAt).toLocaleString("pt-BR")}` };
  },

  async get_scheduled_posts() {
    const store = getMarketingState();
    const state = store.getState();
    return {
      success: true,
      data: {
        scheduledPosts: state.scheduledPosts || [],
        count: (state.scheduledPosts || []).length,
      },
    };
  },

  async delete_scheduled_post(params: Record<string, unknown>) {
    const postId = String(params.postId || "");
    if (!postId) return { success: false, error: "postId is required" };

    const store = getMarketingState();
    const state = store.getState();
    const post = (state.scheduledPosts || []).find((p) => p.id === postId);
    if (!post) return { success: false, error: "Post not found" };

    store.setState((s: MarketingState) => ({
      scheduledPosts: (s.scheduledPosts || []).filter((p) => p.id !== postId),
    }));

    return { success: true, message: `Post "${post.title}" deleted` };
  },

  async publish_scheduled_post(params: Record<string, unknown>) {
    const postId = String(params.postId || "");
    if (!postId) return { success: false, error: "postId is required" };

    const store = getMarketingState();
    const state = store.getState();
    const post = (state.scheduledPosts || []).find((p) => p.id === postId);
    if (!post) return { success: false, error: "Post not found" };

    const result = await publishViaSocialMedia(post);

    if (result.ok) {
      store.setState((s: MarketingState) => ({
        scheduledPosts: (s.scheduledPosts || []).map((p) =>
          p.id === postId ? { ...p, status: "published" as const, publishedAt: new Date().toISOString() } : p
        ),
      }));
      return { success: true, message: `Post "${post.title}" published successfully` };
    }

    const errorMsg = result.results.map((r) => `${r.platform}: ${r.error || "unknown"}`).join("; ");
    store.setState((s: MarketingState) => ({
      scheduledPosts: (s.scheduledPosts || []).map((p) =>
        p.id === postId ? { ...p, status: "failed" as const, error: errorMsg } : p
      ),
    }));
    return { success: false, error: `Failed to publish: ${errorMsg}` };
  },
};

import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";

const WORKSPACE_ID = "marketing";

let registered = false;

interface MarketingCampaign {
  id: string; name: string; status: "active" | "paused" | "draft";
  budget: number; spent: number; impressions: number; clicks: number;
  conversions: number; startDate: string; endDate: string; channels: string[];
}
interface MarketingPost {
  id: string; title: string; body: string; channel: string;
  imageUrl?: string; status: "draft" | "published" | "scheduled"; createdAt: string;
}
interface MarketingState {
  campaigns: MarketingCampaign[];
  posts: MarketingPost[];
}
interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setMarketingStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

let campaignIdCounter = 0;
function nextCampaignId() { return `mc_${Date.now()}_${++campaignIdCounter}`; }

const actions = {
  async add_campaign(params: Record<string, unknown>) {
    const name = String(params.name || "");
    const budget = typeof params.budget === "number" ? params.budget : 0;
    const channel = typeof params.channel === "string" ? params.channel : "Email";
    const status = (params.status as string) || "draft";

    if (!name) return { success: false, error: "name is required" };

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}`;

    const validStatuses = ["active", "paused", "draft"];
    const campaignStatus = validStatuses.includes(status) ? status : "draft";

    const newCampaign = {
      id: nextCampaignId(),
      name,
      status: campaignStatus as "active" | "paused" | "draft",
      budget,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      startDate: dateStr,
      endDate: dateStr,
      channels: [channel],
    };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({ campaigns: [...s.campaigns, newCampaign] }));

    return { success: true, data: newCampaign, message: `Campaign "${name}" created` };
  },

  async pause_campaign(params: Record<string, unknown>) {
    const campaignId = String(params.campaignId || "");
    if (!campaignId) return { success: false, error: "campaignId is required" };

    const store = getMarketingState();
    const state = store.getState();
    const campaign = state.campaigns.find((c: MarketingCampaign) => c.id === campaignId);

    if (!campaign) return { success: false, error: `Campaign "${campaignId}" not found` };
    if (campaign.status === "paused") return { success: false, error: "Campaign is already paused" };

    store.setState((s: MarketingState) => ({
      campaigns: s.campaigns.map((c: MarketingCampaign) =>
        c.id === campaignId ? { ...c, status: "paused" as const } : c
      ),
    }));

    return { success: true, message: `Campaign "${campaign.name}" paused` };
  },

  async resume_campaign(params: Record<string, unknown>) {
    const campaignId = String(params.campaignId || "");
    if (!campaignId) return { success: false, error: "campaignId is required" };

    const store = getMarketingState();
    const state = store.getState();
    const campaign = state.campaigns.find((c: MarketingCampaign) => c.id === campaignId);

    if (!campaign) return { success: false, error: `Campaign "${campaignId}" not found` };
    if (campaign.status === "active") return { success: false, error: "Campaign is already active" };

    store.setState((s: MarketingState) => ({
      campaigns: s.campaigns.map((c: MarketingCampaign) =>
        c.id === campaignId ? { ...c, status: "active" as const } : c
      ),
    }));

    return { success: true, message: `Campaign "${campaign.name}" resumed` };
  },

  async get_campaigns() {
    const store = getMarketingState();
    const state = store.getState();

    return {
      success: true,
      data: {
        campaigns: state.campaigns,
        count: state.campaigns.length,
        activeCount: state.campaigns.filter((c: MarketingCampaign) => c.status === "active").length,
        totalBudget: state.campaigns.reduce((s: number, c: MarketingCampaign) => s + c.budget, 0),
        totalSpent: state.campaigns.reduce((s: number, c: MarketingCampaign) => s + c.spent, 0),
      },
    };
  },

  async create_post(params: Record<string, unknown>) {
    const title = String(params.title || "");
    const body = String(params.body || "");
    const channel = String(params.channel || "Instagram");
    const imageUrl = typeof params.image_url === "string" ? params.image_url : undefined;

    if (!title) return { success: false, error: "title is required" };

    const post = {
      id: `mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      body,
      channel,
      imageUrl,
      status: "draft" as const,
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

export function registerMarketingActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterMarketingActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

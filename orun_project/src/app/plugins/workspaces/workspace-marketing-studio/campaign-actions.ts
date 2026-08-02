import { registerWorkspaceActions } from "../../lib/workspace-actions";
import type { MarketingState, Campaign } from "./marketing-types";

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

export const campaignActions = {
  async add_campaign(params: Record<string, unknown>) {
    const name = String(params.name || "");
    const budget = typeof params.budget === "number" ? params.budget : 0;
    const channel = typeof params.channel === "string" ? params.channel : "Email";
    const status = (params.status as string) || "draft";

    if (!name) return { success: false, error: "name is required" };

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}`;
    const endDateParam = typeof params.endDate === "string" ? params.endDate : "";

    const validStatuses = ["active", "paused", "draft"];
    const campaignStatus = validStatuses.includes(status) ? status : "draft";

    const newCampaign: Campaign = {
      id: nextCampaignId(),
      name,
      status: campaignStatus as Campaign["status"],
      budget,
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      startDate: dateStr,
      endDate: endDateParam || dateStr,
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
    const campaign = state.campaigns.find((c: Campaign) => c.id === campaignId);

    if (!campaign) return { success: false, error: `Campaign "${campaignId}" not found` };
    if (campaign.status === "paused") return { success: false, error: "Campaign is already paused" };

    store.setState((s: MarketingState) => ({
      campaigns: s.campaigns.map((c: Campaign) =>
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
    const campaign = state.campaigns.find((c: Campaign) => c.id === campaignId);

    if (!campaign) return { success: false, error: `Campaign "${campaignId}" not found` };
    if (campaign.status === "active") return { success: false, error: "Campaign is already active" };

    store.setState((s: MarketingState) => ({
      campaigns: s.campaigns.map((c: Campaign) =>
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
        activeCount: state.campaigns.filter((c: Campaign) => c.status === "active").length,
        totalBudget: state.campaigns.reduce((s: number, c: Campaign) => s + c.budget, 0),
        totalSpent: state.campaigns.reduce((s: number, c: Campaign) => s + c.spent, 0),
      },
    };
  },
};

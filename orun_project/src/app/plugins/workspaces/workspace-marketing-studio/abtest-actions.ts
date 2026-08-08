import type { MarketingState, ABTest } from "./marketing-types";

interface MarketingStore {
  getState: () => MarketingState;
  setState: (state: Partial<MarketingState> | ((s: MarketingState) => Partial<MarketingState>)) => void;
}

let getStore: (() => MarketingStore) | null = null;
export function setABTestStoreGetter(getter: () => MarketingStore) { getStore = getter; }

function getMarketingState() {
  if (!getStore) throw new Error("Marketing store not initialized");
  return getStore();
}

export const abTestActions = {
  async add_ab_test(params: Record<string, unknown>) {
    const name = String(params.name || "");
    const headlineA = String(params.headlineA || "Headline A");
    const ctaA = String(params.ctaA || "CTA A");
    const colorA = String(params.colorA || "#C3002F");
    const headlineB = String(params.headlineB || "Headline B");
    const ctaB = String(params.ctaB || "CTA B");
    const colorB = String(params.colorB || "#3B82F6");

    if (!name) return { success: false, error: "name is required" };
    if (!headlineA || !headlineB) return { success: false, error: "headlineA and headlineB are required" };

    const test: ABTest = {
      id: `ab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      variantA: { headline: headlineA, cta: ctaA, color: colorA, ctr: 0 },
      variantB: { headline: headlineB, cta: ctaB, color: colorB, ctr: 0 },
    };

    const store = getMarketingState();
    store.setState((s: MarketingState) => ({
      tests: [...(s.tests || []), test],
    }));

    return { success: true, data: test, message: `A/B test "${name}" created` };
  },

  async get_ab_tests() {
    const store = getMarketingState();
    const state = store.getState();
    return {
      success: true,
      data: {
        tests: state.tests || [],
        count: (state.tests || []).length,
      },
    };
  },
};

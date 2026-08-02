export interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "draft";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate: string;
  channels: string[];
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: "post" | "email" | "ad" | "blog";
  platform: string;
}

export interface ABTest {
  id: string;
  name: string;
  variantA: { headline: string; cta: string; color: string; ctr: number };
  variantB: { headline: string; cta: string; color: string; ctr: number };
}

export interface MarketingPost {
  id: string; title: string; body: string; channel: string;
  imageUrl?: string; status: "draft" | "published" | "scheduled"; createdAt: string;
}

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  status: "pending" | "published" | "failed";
  hashtags: string[];
  imageUrl?: string;
  createdAt: string;
  publishedAt?: string;
  error?: string;
}

export interface DiscordState {
  status: "disconnected" | "connecting" | "connected" | "error";
  guilds: Array<{ id: string; name: string; memberCount: number; iconURL: string | null }>;
  selectedGuildId: string | null;
  channels: Array<{ id: string; name: string; type: number }>;
  selectedChannelId: string | null;
  autoResponse: boolean;
}

export interface MarketingState {
  campaigns: Campaign[];
  events: CalendarEvent[];
  tests: ABTest[];
  posts: MarketingPost[];
  scheduledPosts: ScheduledPost[];
  discord: DiscordState;
}

export const TYPE_COLORS: Record<string, string> = { post: "var(--accent, #C00018)", email: "#3B82F6", ad: "#F59E0B", blog: "#22C55E" };

// plugins/workspaces/workspace-marketing-studio/MarketingWorkspace.tsx
//
// Marketing workspace — campaign cards, content calendar, A/B previews,
// and analytics charts. Uses Recharts.

import { useState, useEffect } from "react";
import { createStore } from "../../lib/store";
import type { WorkspaceProps } from "../../types";
import { registerMarketingActions, unregisterMarketingActions } from "./marketing-actions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

// ── Store ───────────────────────────────────────────────────────────────

interface Campaign {
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

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: "post" | "email" | "ad" | "blog";
  platform: string;
}

interface ABTest {
  id: string;
  name: string;
  variantA: { headline: string; cta: string; color: string; ctr: number };
  variantB: { headline: string; cta: string; color: string; ctr: number };
}

interface MarketingState {
  [key: string]: unknown;
  campaigns: Campaign[];
  events: CalendarEvent[];
  tests: ABTest[];
}

const useMarketingStore = createStore<MarketingState>({
  campaigns: [],
  events: [],
  tests: [],
});

// ── Status Badge ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(34,197,94,0.1)", text: "#22C55E" },
    paused: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
    draft: { bg: "rgba(255,255,255,0.05)", text: "var(--muted-foreground)" },
  };
  const c = colors[status] || colors.draft;
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider" style={{ background: c.bg, color: c.text, fontFamily: "'JetBrains Mono', monospace" }}>
      {status}
    </span>
  );
}

// ── Main Workspace ──────────────────────────────────────────────────────

export function MarketingWorkspace({ plugin, activeTab, onTabChange, onSendMessage, lastToolResult }: WorkspaceProps) {
  const campaigns = useMarketingStore((s) => s.campaigns);
  const events = useMarketingStore((s) => s.events);
  const tests = useMarketingStore((s) => s.tests);
  const [activeView, setActiveView] = useState<"campaigns" | "calendar" | "abtests" | "analytics">("campaigns");

  useEffect(() => {
    registerMarketingActions();
    return () => unregisterMarketingActions();
  }, []);

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  const analyticsData = [
    { month: "Jan", leads: 120, conv: 34 },
    { month: "Fev", leads: 180, conv: 52 },
    { month: "Mar", leads: 220, conv: 68 },
    { month: "Abr", leads: 290, conv: 85 },
    { month: "Mai", leads: 350, conv: 110 },
    { month: "Jun", leads: 420, conv: 145 },
    { month: "Jul", leads: 480, conv: 172 },
  ];

  const typeColors: Record<string, string> = { post: "#C00018", email: "#3B82F6", ad: "#F59E0B", blog: "#22C55E" };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
      {/* View Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        {(["campaigns", "calendar", "abtests", "analytics"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className="px-3 py-1.5 rounded-md text-[10px] tracking-wider uppercase transition-all"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: activeView === v ? 500 : 300,
              color: activeView === v ? "var(--foreground)" : "var(--muted-foreground)",
              background: activeView === v ? "rgba(192,0,24,0.08)" : "transparent",
            }}
          >
            {v === "campaigns" ? "Campanhas" : v === "calendar" ? "Calendário" : v === "abtests" ? "A/B Tests" : "Analytics"}
          </button>
        ))}
      </div>

      {activeView === "campaigns" && (
        <div className="p-4 space-y-3">
          {/* Summary bar */}
          <div className="flex gap-3">
            {[
              { label: "Budget Total", value: `R$ ${(totalBudget / 1000).toFixed(0)}k` },
              { label: "Gasto", value: `R$ ${(totalSpent / 1000).toFixed(1)}k` },
              { label: "Conversões", value: totalConversions.toLocaleString() },
            ].map((s, i) => (
              <div key={i} className="flex-1 p-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{s.label}</span>
                <p className="text-[13px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--foreground)" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign cards */}
          {campaigns.map((c) => {
            const progress = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0";
            return (
              <div key={c.id} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: "var(--foreground)" }}>{c.name}</p>
                    <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{c.startDate} — {c.endDate}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex gap-3 mb-2">
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{c.impressions.toLocaleString()} imp.</span>
                  <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{ctr}% CTR</span>
                  <span className="text-[9px]" style={{ color: "#22C55E" }}>{c.conversions} conv.</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress > 80 ? "#F59E0B" : "#C00018" }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>R$ {(c.spent / 1000).toFixed(1)}k</span>
                  <span className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>R$ {(c.budget / 1000).toFixed(0)}k</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {c.channels.map((ch) => (
                    <span key={ch} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(192,0,24,0.06)", color: "#C00018" }}>
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeView === "calendar" && (
        <div className="p-4 space-y-2">
          <h3 className="text-[10px] tracking-wider uppercase mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Calendário de Conteúdo
          </h3>
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <span className="text-[9px] font-medium w-10" style={{ fontFamily: "'JetBrains Mono', monospace", color: typeColors[e.type] }}>
                {e.date}
              </span>
              <div className="w-1.5 h-8 rounded-full" style={{ background: typeColors[e.type] }} />
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: "var(--foreground)" }}>{e.title}</p>
                <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{e.platform}</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase" style={{ background: `${typeColors[e.type]}15`, color: typeColors[e.type] }}>
                {e.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeView === "abtests" && (
        <div className="p-4 space-y-4">
          <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            Testes A/B em Andamento
          </h3>
          {tests.map((test) => {
            const winner = test.variantA.ctr >= test.variantB.ctr ? "A" : "B";
            return (
              <div key={test.id} className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                <p className="text-[11px] font-medium mb-3" style={{ color: "var(--foreground)" }}>{test.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B"] as const).map((v) => {
                    const data = v === "A" ? test.variantA : test.variantB;
                    const isWinner = winner === v;
                    return (
                      <div key={v} className="p-2.5 rounded-lg" style={{
                        border: `1px solid ${isWinner ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                        background: isWinner ? "rgba(34,197,94,0.03)" : "transparent",
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-medium" style={{ color: "var(--foreground)" }}>Variante {v}</span>
                          {isWinner && <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E" }}>Winner</span>}
                        </div>
                        <p className="text-[10px] mb-1" style={{ color: "var(--foreground)" }}>{data.headline}</p>
                        <div className="px-2 py-1 rounded text-[9px] text-center" style={{ background: data.color, color: "#fff" }}>
                          {data.cta}
                        </div>
                        <p className="text-center mt-2 text-[11px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: isWinner ? "#22C55E" : "var(--foreground)" }}>
                          {data.ctr}% CTR
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeView === "analytics" && (
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Leads vs Conversões
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={analyticsData}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} />
                <Line type="monotone" dataKey="leads" stroke="#C00018" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conv" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#C00018" }} /> Leads</span>
              <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} /> Conversões</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

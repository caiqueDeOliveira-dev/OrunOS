import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { P } from "../../premium";

function generateAnalytics(campaigns: Array<{ budget: number; spent: number; impressions: number; clicks: number; conversions: number }>) {
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";
  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthlyData = months.map((month, i) => {
    const monthCampaigns = campaigns.filter((_, ci) => ci % 12 === i);
    return {
      month,
      leads: monthCampaigns.reduce((s, c) => s + c.impressions * 0.1, 0),
      conv: monthCampaigns.reduce((s, c) => s + c.conversions, 0),
    };
  });

  return { totalBudget, totalSpent, totalImpressions, totalClicks, totalConversions, ctr, convRate, monthlyData };
}

export function AnalyticsView() {
  const { t } = useTranslation();
  const campaigns = useMarketingStore((s) => s.campaigns);

  const analytics = useMemo(() => generateAnalytics(campaigns), [campaigns]);

  if (campaigns.length === 0) {
    return (
      <div className="p-4">
        <WorkspaceEmptyState
          icon={<BarChart3 size={22} color="var(--primary)" strokeWidth={1.6} />}
          message={t("Nenhuma campanha para exibir nos gráficos")}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <WorkspaceCard>
          <p className="text-[9px]" style={{ color: P.sub }}>{t("Orçamento Total")}</p>
          <p className="text-[14px] font-bold" style={{ color: P.text }}>R$ {analytics.totalBudget.toLocaleString("pt-BR")}</p>
        </WorkspaceCard>
        <WorkspaceCard>
          <p className="text-[9px]" style={{ color: P.sub }}>{t("Gasto Total")}</p>
          <p className="text-[14px] font-bold" style={{ color: "var(--primary)" }}>R$ {analytics.totalSpent.toLocaleString("pt-BR")}</p>
        </WorkspaceCard>
        <WorkspaceCard>
          <p className="text-[9px]" style={{ color: P.sub }}>{t("Conversões")}</p>
          <p className="text-[14px] font-bold" style={{ color: "var(--ok)" }}>{analytics.totalConversions}</p>
        </WorkspaceCard>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <WorkspaceCard>
          <p className="text-[9px]" style={{ color: P.sub }}>{t("Impressões")}</p>
          <p className="text-[16px] font-bold" style={{ color: P.text }}>{analytics.totalImpressions.toLocaleString("pt-BR")}</p>
        </WorkspaceCard>
        <WorkspaceCard>
          <p className="text-[9px]" style={{ color: P.sub }}>{t("CTR")}</p>
          <p className="text-[16px] font-bold" style={{ color: P.text }}>{analytics.ctr}%</p>
        </WorkspaceCard>
      </div>

      {analytics.monthlyData.some((d) => d.leads > 0 || d.conv > 0) && (
        <>
          <WorkspaceCard>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: P.sub }} role="heading" aria-level={2}>
              {t("Leads vs Conversões")}
            </h3>
            <div role="img" aria-label="Line chart showing leads and conversions">
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={analytics.monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: P.sub }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10, fontFamily: "'Inter', sans-serif" }} />
                  <Line type="monotone" dataKey="leads" stroke="#C3002F" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conv" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <span className="text-[9px] flex items-center gap-1" aria-label="Leads series">
                <span className="w-2 h-2 rounded-full" style={{ background: "#C3002F" }} /> {t("Leads")}
              </span>
              <span className="text-[9px] flex items-center gap-1" aria-label="Conversions series">
                <span className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }} /> {t("Conversões")}
              </span>
            </div>
          </WorkspaceCard>

          <WorkspaceCard>
            <h3 className="text-[10px] tracking-wider uppercase mb-3" style={{ fontFamily: "'Sora', sans-serif", color: P.sub }} role="heading" aria-level={2}>
              {t("Desempenho por Campanha")}
            </h3>
            <div className="space-y-2">
              {campaigns.map((c) => {
                const spentPct = c.budget > 0 ? Math.min((c.spent / c.budget) * 100, 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span style={{ color: P.text }}>{c.name}</span>
                      <span style={{ color: P.sub }}>{c.conversions} {t("conv.")}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${spentPct}%`, background: "#C3002F" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </WorkspaceCard>
        </>
      )}
    </div>
  );
}

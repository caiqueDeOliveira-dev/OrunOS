import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceBadge } from "../../../components/WorkspaceBadge";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";

const MONO = "'JetBrains Mono', monospace";

function fmtCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(val);
}

export function CampaignsView() {
  const { t } = useTranslation();
  const campaigns = useMarketingStore((s) => s.campaigns);

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  if (campaigns.length === 0) {
    return (
      <div className="p-4">
        <WorkspaceEmptyState
          icon={<span style={{ fontSize: 18 }}>📢</span>}
          message={t("Nenhuma campanha ainda")}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-3" role="list" aria-label="Summary">
        {[
          { label: t("Budget Total"), value: fmtCurrency(totalBudget) },
          { label: t("Gasto"), value: fmtCurrency(totalSpent) },
          { label: t("Conversões"), value: totalConversions.toLocaleString() },
        ].map((s, i) => (
          <WorkspaceCard key={i} padding={false}>
            <div className="p-2">
              <span className="text-[9px]" style={{ color: "#A0A0A0" }}>{s.label}</span>
              <p className="text-[13px] font-medium" style={{ fontFamily: MONO, color: "#FFFFFF" }}>{s.value}</p>
            </div>
          </WorkspaceCard>
        ))}
      </div>

      {campaigns.map((c) => {
        const progress = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
        const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0";
        return (
          <WorkspaceCard key={c.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[11px] font-medium" style={{ color: "#FFFFFF" }} role="heading" aria-level={3}>{c.name}</p>
                <p className="text-[9px]" style={{ color: "#A0A0A0" }}>{c.startDate} — {c.endDate}</p>
              </div>
              <WorkspaceBadge variant={c.status === "active" ? "green" : c.status === "paused" ? "yellow" : "default"}>
                {c.status}
              </WorkspaceBadge>
            </div>
            <div className="flex gap-3 mb-2">
              <span className="text-[9px]" style={{ color: "#A0A0A0" }}>{c.impressions.toLocaleString()} imp.</span>
              <span className="text-[9px]" style={{ color: "#A0A0A0" }}>{ctr}% CTR</span>
              <span className="text-[9px]" style={{ color: "#22C55E" }}>{c.conversions} conv.</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress > 80 ? "#F59E0B" : "#C3002F" }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px]" style={{ color: "#A0A0A0" }}>{fmtCurrency(c.spent)}</span>
              <span className="text-[8px]" style={{ color: "#A0A0A0" }}>{fmtCurrency(c.budget)}</span>
            </div>
            <div className="flex gap-1 mt-2">
              {c.channels.map((ch) => (
                <WorkspaceBadge key={ch} variant="red">{ch}</WorkspaceBadge>
              ))}
            </div>
          </WorkspaceCard>
        );
      })}
    </div>
  );
}

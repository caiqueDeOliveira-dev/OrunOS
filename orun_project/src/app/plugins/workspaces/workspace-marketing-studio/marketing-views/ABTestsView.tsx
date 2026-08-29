import { FlaskConical } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";
import { WorkspaceBadge } from "../../../components/WorkspaceBadge";
import { P } from "../../premium";

const MONO = "'JetBrains Mono', monospace";

export function ABTestsView() {
  const { t } = useTranslation();
  const tests = useMarketingStore((s) => s.tests);

  if (tests.length === 0) {
    return (
      <div className="p-4">
        <WorkspaceEmptyState
          icon={<FlaskConical size={22} color="var(--primary)" strokeWidth={1.6} />}
          message={t("Nenhum teste A/B em andamento")}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: P.sub }} role="heading" aria-level={2}>
        {t("Testes A/B em Andamento")}
      </h3>
      {tests.map((test) => {
        const winner = test.variantA.ctr >= test.variantB.ctr ? "A" : "B";
        return (
          <WorkspaceCard key={test.id}>
            <p className="text-[11px] font-medium mb-3" style={{ color: P.text }} role="heading" aria-level={3}>{test.name}</p>
            <div className="grid grid-cols-2 gap-2" role="list" aria-label="Variants">
              {(["A", "B"] as const).map((v) => {
                const data = v === "A" ? test.variantA : test.variantB;
                const isWinner = winner === v;
                return (
                  <div key={v} className="p-2.5 rounded-lg" role="listitem" style={{
                    border: `1px solid ${isWinner ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                    background: isWinner ? "rgba(34,197,94,0.03)" : "transparent",
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-medium" style={{ color: P.text }}>Variante {v}</span>
                      {isWinner && <WorkspaceBadge variant="green">Winner</WorkspaceBadge>}
                    </div>
                    <p className="text-[10px] mb-1" style={{ color: P.text }}>{data.headline}</p>
                    <div className="px-2 py-1 rounded text-[9px] text-center" style={{ background: data.color, color: "#fff" }}>
                      {data.cta}
                    </div>
                    <p className="text-center mt-2 text-[11px] font-medium" style={{ fontFamily: MONO, color: isWinner ? "var(--ok)" : P.text }}>
                      {data.ctr}% CTR
                    </p>
                  </div>
                );
              })}
            </div>
          </WorkspaceCard>
        );
      })}
    </div>
  );
}

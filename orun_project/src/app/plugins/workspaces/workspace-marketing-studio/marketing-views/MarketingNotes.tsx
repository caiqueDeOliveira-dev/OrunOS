import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useWorkspaceNotes } from "../../../../hooks/usePersonalization";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { P } from "../../premium";

export function MarketingNotes() {
  const { t } = useTranslation();
  const { notes, updateNotes } = useWorkspaceNotes("Marketing");

  return (
    <div className="px-4 pb-4">
      <WorkspaceCard>
        <span className="text-xs font-medium mb-2 block" style={{ color: P.text }}>{t("Notas Pessoais")}</span>
        <textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
          style={{ background: "var(--surface-3)", color: P.text, border: "1px solid var(--border)", minHeight: "60px" }}
          placeholder={t("Suas anotações de marketing...")}
          aria-label={t("Notas Pessoais")}
        />
      </WorkspaceCard>
    </div>
  );
}

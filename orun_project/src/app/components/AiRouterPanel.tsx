import { ExternalLink } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";

const ROUTER_URL = "http://localhost:4321/dashboard";

export function AiRouterPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { t } = useTranslation();

  const openDashboard = () => {
    if (isElectron && window.orun?.shell?.openExternal) {
      window.orun.shell.openExternal(ROUTER_URL);
    } else {
      window.open(ROUTER_URL, "_blank");
    }
  };

  if (!isElectron || !window.orun.aiRouter) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="w-[420px] rounded-2xl border p-6 text-center" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterNotElectron")}</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 rounded-lg text-[10px]" style={{ background: "#C00018", color: "#fff" }}>
            {t("aiRouterBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-[420px] rounded-2xl border p-6 text-center"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onBack} style={{ color: "var(--muted-foreground)" }} className="hover:opacity-80">←</button>
          <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
            {t("aiRouterTitle")}
          </span>
        </div>
        <p className="text-[10px] mb-5" style={{ color: "var(--muted-foreground)" }}>
          {t("aiRouterDescription")}
        </p>
        <button
          onClick={openDashboard}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: "#C00018", color: "#fff" }}
        >
          <ExternalLink size={13} />
          Abrir Dashboard
        </button>
        <p className="mt-3 text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
          {ROUTER_URL}
        </p>
        <button onClick={onClose} className="mt-5 text-[10px] hover:opacity-80" style={{ color: "var(--muted-foreground)" }}>
          {t("aiRouterBack")}
        </button>
      </div>
    </div>
  );
}

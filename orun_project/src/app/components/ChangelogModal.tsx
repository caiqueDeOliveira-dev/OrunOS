import { useEffect } from "react";
import { motion } from "motion/react";
import { X, Megaphone } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

interface Props {
  onClose: () => void;
}

interface ChangeEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelog: ChangeEntry[] = [
  {
    version: "v0.7.0",
    date: "Jul 2026",
    changes: [
      "Modo Foco para chat sem distrações",
      "Mapa de atalhos de teclado (tecla ?)",
      "Exportar conversa como Markdown",
      "Sistema de Easter Eggs (café, HAL 9000, matrix, konami)",
      "Tema automático por horário (modo agendado)",
      "Indicador de digitação animado",
      "Suporte integrado ao Settings",
      "Segurança: proteção ReDoS nos comandos bloqueados",
      "Testes automatizados para Suporte (ErrorGuard)",
      "Novos agentes: Jurídico, Assistente Técnico, Suporte",
    ],
  },
  {
    version: "v0.6.3",
    date: "Jun 2026",
    changes: ["Correções de bugs e melhorias de performance"],
  },
];

export function ChangelogModal({ onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[520px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
              <Megaphone size={14} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <span className="text-sm tracking-widest uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("changelog_title")}
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                {t("changelog_desc")}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-6">
          {changelog.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs font-semibold" style={{ color: "#6366F1" }}>
                  {entry.version}
                </span>
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {entry.date}
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              <ul className="space-y-1.5 ml-1">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--foreground)" }}>
                    <span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ background: "#6366F1" }} />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

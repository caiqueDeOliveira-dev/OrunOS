import { useEffect } from "react";
import { motion } from "motion/react";
import { X, Keyboard } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

interface Props {
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  shortcuts: { keys: string; label: string }[];
}

export function KeyboardShortcutsModal({ onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const groups: ShortcutGroup[] = [
    {
      category: t("shortcuts_category_navigation"),
      shortcuts: [
        { keys: "Ctrl+K", label: t("shortcuts_cmd_palette") },
        { keys: "Ctrl+N", label: t("shortcuts_new_chat") },
        { keys: "Escape", label: t("shortcuts_close_panel") },
      ],
    },
    {
      category: t("shortcuts_category_panels"),
      shortcuts: [
        { keys: "Ctrl+Shift+O", label: t("shortcuts_agents") },
        { keys: "Ctrl+Shift+A", label: t("shortcuts_automation") },
        { keys: "Ctrl+Shift+S", label: t("shortcuts_settings") },
        { keys: "Ctrl+Shift+P", label: t("shortcuts_profile") },
        { keys: "Ctrl+Shift+E", label: t("shortcuts_email") ?? "Email" },
        { keys: "Ctrl+Shift+C", label: t("shortcuts_calendar") ?? "Calendário" },
        { keys: "Ctrl+Shift+L", label: t("shortcuts_activity") ?? "Atividade" },
      ],
    },
    {
      category: t("shortcuts_category_chat"),
      shortcuts: [
        { keys: "Enter", label: t("shortcuts_send") },
        { keys: "Shift+Enter", label: t("shortcuts_new_line") },
      ],
    },
  ];

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
              <Keyboard size={14} style={{ color: "#6366F1" }} />
            </div>
            <div>
              <span className="text-sm tracking-widest uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("shortcutsTitle")}
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                {t("shortcuts_description")}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-5">
          {groups.map((group) => (
            <div key={group.category}>
              <span className="text-[10px] tracking-widest uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                {group.category}
              </span>
              <div className="space-y-1">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.keys}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: "var(--secondary)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--foreground)" }}>
                      {s.label}
                    </span>
                    <kbd
                      className="text-[10px] px-2 py-0.5 rounded border font-mono"
                      style={{
                        color: "var(--muted-foreground)",
                        borderColor: "var(--border)",
                        background: "var(--card)",
                      }}
                    >
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

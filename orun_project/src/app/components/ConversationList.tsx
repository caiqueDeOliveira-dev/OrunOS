import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, MessageSquare, Trash2, Plus } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

interface ConversationSummary {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export function ConversationList({
  activeId,
  onClose,
  onSelect,
  onNew,
}: {
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!isElectron) { setLoading(false); return; }
    setLoading(true);
    const list = await window.orun.conversations.list();
    setConversations(list);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isElectron) return;
    await window.orun.conversations.remove(id);
    refresh();
  };

  return (
    <motion.div
      className="fixed left-16 top-0 h-full z-30 flex flex-col border-r overflow-hidden"
      style={{ width: 280, background: "#0e0e0e", borderColor: "#1e1e1e" }}
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -280, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
        <span className="text-[10px] tracking-[0.24em] uppercase text-[#B5B5B5]" style={{ fontFamily: "'Sora', sans-serif" }}>
          History
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: "#444" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#B5B5B5")}
          onMouseLeave={e => (e.currentTarget.style.color = "#444")}
        >
          <X size={14} />
        </button>
      </div>

      <button
        onClick={onNew}
        className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 rounded-lg text-xs transition-colors"
        style={{ background: "rgba(192,0,24,0.08)", border: "1px solid rgba(192,0,24,0.2)", color: "#FF1A2D", fontFamily: "'Sora', sans-serif" }}
      >
        <Plus size={13} /> {t("conversationNew")}
      </button>

      <div className="flex-1 overflow-y-auto py-2 mt-2 scrollbar-hide">
        {!isElectron && (
          <p className="px-5 text-[10px]" style={{ color: "#444" }}>
            {t("conversationBrowserWarning")}
          </p>
        )}
        {isElectron && loading && (
          <p className="px-5 text-[10px]" style={{ color: "#444" }}>{t("conversationLoading")}</p>
        )}
        {isElectron && !loading && conversations.length === 0 && (
          <p className="px-5 text-[10px]" style={{ color: "#444" }}>{t("conversationEmpty")}</p>
        )}
        {conversations.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-colors group"
            style={{
              color: c.id === activeId ? "#F5F5F5" : "#888",
              background: c.id === activeId ? "rgba(192,0,24,0.08)" : "transparent",
            }}
          >
            <MessageSquare size={13} style={{ flexShrink: 0, color: c.id === activeId ? "#C00018" : "inherit" }} />
            <span className="text-xs truncate flex-1" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300 }}>
              {c.title || t("conversationNew")}
            </span>
            <span
              onClick={e => remove(e, c.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
              style={{ color: "#555" }}
            >
              <Trash2 size={12} />
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

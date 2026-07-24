import React, { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { X, MessageSquare, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

interface ConversationSummary {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  snippet?: string;
}

export const ConversationList = React.memo(function ConversationList({
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
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ConversationSummary[] | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const refresh = async () => {
    if (!isElectron) { setLoading(false); return; }
    setLoading(true);
    const list = await window.orun.conversations.list();
    setConversations(list);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search || search.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      if (!isElectron) return;
      const results = await window.orun.conversations.search(search.trim());
      setSearchResults(results);
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search]);

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isElectron) return;
    await window.orun.conversations.remove(id);
    refresh();
  };

  return (
    <motion.div
      className="fixed left-16 top-8 h-[calc(100%-2rem)] z-30 flex flex-col border-r overflow-hidden"
      style={{ width: 280, background: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -280, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] tracking-[0.24em] uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {t("conversationHistory")}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <X size={14} />
        </button>
      </div>

      <button
        onClick={onNew}
        className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 rounded-lg text-xs transition-colors"
        style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)", fontFamily: "'Sora', sans-serif" }}
      >
        <Plus size={13} /> {t("conversationNew")}
      </button>

      <div className="mx-4 mt-2 relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("conversationSearch")}
          className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto py-2 mt-2 scrollbar-hide" role="listbox" aria-label={t("conversations") || "Conversations"}>
        {!isElectron && (
          <p className="px-5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
            {t("conversationBrowserWarning")}
          </p>
        )}
        {isElectron && loading && (
          <div className="flex items-center gap-2 px-5 py-2">
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("conversationLoading")}</span>
          </div>
        )}
        {isElectron && !loading && (searchResults ?? conversations).length === 0 && (
          <p className="px-5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>{search ? t("conversationSearchEmpty") : t("conversationEmpty")}</p>
        )}
        {(searchResults ?? conversations)
          .filter(c => !search || searchResults || c.title.toLowerCase().includes(search.toLowerCase()))
          .map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            role="option"
            aria-selected={c.id === activeId}
            className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-colors group"
            style={{
              color: c.id === activeId ? "var(--foreground)" : "var(--muted-foreground)",
              background: c.id === activeId ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
            }}
          >
            <MessageSquare size={13} style={{ flexShrink: 0, color: c.id === activeId ? "var(--primary)" : "inherit" }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs truncate block" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300 }}>
                {c.title || t("conversationNew")}
              </span>
              {c.snippet && (
                <span className="text-[9px] block truncate mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                  {(() => {
                    const parts = c.snippet.split(/(>>>|<<<)/);
                    const result: React.ReactNode[] = [];
                    let inBold = false;
                    for (let i = 0; i < parts.length; i++) {
                      if (parts[i] === ">>>") { inBold = true; continue; }
                      if (parts[i] === "<<<") { inBold = false; continue; }
                      if (parts[i]) {
                        result.push(inBold
                          ? <b key={i} style={{ color: "var(--primary)" }}>{parts[i]}</b>
                          : <span key={i}>{parts[i]}</span>);
                      }
                    }
                    return result;
                  })()}
                </span>
              )}
            </div>
            <span
              onClick={e => remove(e, c.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Trash2 size={12} />
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
});

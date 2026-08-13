import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  X, Radio, Eye, ShoppingCart, Search, Trash2, Plus, Loader2,
  CheckCircle2, AlertTriangle, Bell, ToggleLeft, ToggleRight, Globe, RefreshCw,
} from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import { useToast } from "./Toast";
import type {
  OrunGroupFeedMessage, OrunGroupFeedState, OrunGroupInfo, OrunWatchlistItem,
} from "../../types/orun";

type Tab = "feed" | "vigia" | "robo";

function providerColor(provider: "whatsapp" | "telegram") {
  return provider === "whatsapp" ? "#25D366" : "#2AABEE";
}

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function GroupFeedPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [state, setState] = useState<OrunGroupFeedState | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [filterGroup, setFilterGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [watchedToggles, setWatchedToggles] = useState<Record<string, boolean>>({});
  const [alertProvider, setAlertProvider] = useState<"whatsapp" | "telegram">("whatsapp");
  const [alertTarget, setAlertTarget] = useState("");
  const [aiFilter, setAiFilter] = useState(true);
  const [dealsEnabled, setDealsEnabled] = useState(false);
  const [dealsInterval, setDealsInterval] = useState(6);
  const [running, setRunning] = useState(false);
  const historyRef = useRef<OrunGroupFeedMessage[]>([]);

  const refresh = async () => {
    const s = await window.orun.groupFeed.getState();
    setState(s);
    historyRef.current = s.history;
    if (s.settings) {
      setAlertProvider(s.settings.alertProvider);
      setAlertTarget(s.settings.alertTarget);
      setAiFilter(s.settings.aiFilter);
      setDealsEnabled(s.settings.deals.enabled);
      setDealsInterval(s.settings.deals.intervalHours || 6);
      const map: Record<string, boolean> = {};
      for (const g of s.groups) map[g.id] = s.settings.watchedGroups.includes(g.id);
      setWatchedToggles(map);
    }
  };

  useEffect(() => {
    if (!isElectron) return;
    refresh();
    const offMsg = window.orun.groupFeed.onMessage((msg) => {
      historyRef.current = [msg, ...historyRef.current].slice(0, 300);
      setState((prev) => (prev ? { ...prev, history: historyRef.current } : prev));
    });
    const offAlert = window.orun.groupFeed.onAlert((alert) => {
      toast.show(t("groupFeedAlertSent"), "success");
    });
    const offDeals = window.orun.groupFeed.onDeals(() => {
      toast.show(t("groupFeedDealsDone"), "success");
    });
    return () => { offMsg(); offAlert(); offDeals(); };
  }, []);

  if (!isElectron) {
    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 border" style={{ background: "var(--card)", borderColor: "var(--border)" }} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio size={15} style={{ color: "#C00018" }} />
              <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("navGroupFeed")}</span>
            </div>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedBrowserWarning")}</p>
        </motion.div>
      </motion.div>
    );
  }

  const groups: OrunGroupInfo[] = state?.groups || [];
  const history = state?.history || historyRef.current;
  const settings = state?.settings;

  const filtered = history.filter((m) => {
    if (filterGroup !== "all" && `${m.provider}:${m.channelId}` !== filterGroup) return false;
    if (search && !m.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupName = (m: OrunGroupFeedMessage) => {
    const g = groups.find((x) => x.id === `${m.provider}:${m.channelId}`);
    return g?.name || m.channelName || `${m.provider}:${m.channelId}`;
  };

  const saveSettings = async (patch: Record<string, unknown>) => {
    const res = await window.orun.groupFeed.setSettings(patch);
    setState((prev) => (prev ? { ...prev, settings: res.settings } : prev));
    return res.settings;
  };

  const toggleWatched = async (groupId: string, enabled: boolean) => {
    const next = { ...watchedToggles, [groupId]: enabled };
    setWatchedToggles(next);
    const watched = Object.entries(next).filter(([, v]) => v).map(([k]) => k);
    await saveSettings({ watchedGroups: watched });
  };

  const addTerm = async () => {
    if (!newTerm.trim()) return;
    const res = await window.orun.groupFeed.addWatchlistTerm(newTerm.trim());
    if (res.settings) setState((prev) => (prev ? { ...prev, settings: res.settings! } : prev));
    if (res.error) toast.show(res.error, "error");
    else { setNewTerm(""); toast.show(t("groupFeedTermAdded"), "success"); }
  };

  const removeTerm = async (id: string) => {
    const res = await window.orun.groupFeed.removeWatchlistTerm(id);
    setState((prev) => (prev ? { ...prev, settings: res.settings } : prev));
  };

  const toggleTerm = async (item: OrunWatchlistItem, enabled: boolean) => {
    const res = await window.orun.groupFeed.toggleWatchlistTerm(item.id, enabled);
    setState((prev) => (prev ? { ...prev, settings: res.settings } : prev));
  };

  const saveAlert = async () => {
    const s = await saveSettings({ alertProvider, alertTarget: alertTarget.trim() });
    toast.show(t("groupFeedAlertSaved"), "success");
    return s;
  };

  const saveAiFilter = async (v: boolean) => {
    setAiFilter(v);
    await saveSettings({ aiFilter: v });
  };

  const saveDeals = async () => {
    await saveSettings({ deals: { enabled: dealsEnabled, intervalHours: Math.max(1, dealsInterval) } });
    toast.show(t("groupFeedDealsSaved"), "success");
  };

  const runDeals = async () => {
    setRunning(true);
    try {
      const res = await window.orun.groupFeed.runDealsScan();
      if (res.ok) toast.show(t("groupFeedDealsDone"), "success");
      else if (res.error === "firecrawl-key") toast.show(t("groupFeedDealsNoKey"), "error");
      else if (res.error === "no-watchlist") toast.show(t("groupFeedDealsNoWatchlist"), "error");
      else toast.show(res.error || "erro", "error");
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const clearHistory = async () => {
    await window.orun.groupFeed.clearHistory();
    historyRef.current = [];
    setState((prev) => (prev ? { ...prev, history: [] } : prev));
    toast.show(t("groupFeedHistoryCleared"), "success");
  };

  const watchedCount = Object.values(watchedToggles).filter(Boolean).length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio size={15} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("navGroupFeed")}</span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--secondary)" }}>
          {([
            { id: "feed" as Tab, icon: Radio, label: t("groupFeedTabFeed") },
            { id: "vigia" as Tab, icon: Eye, label: t("groupFeedTabWatch") },
            { id: "robo" as Tab, icon: ShoppingCart, label: t("groupFeedTabDeals") },
          ]).map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] transition-colors"
              style={{
                background: tab === tb.id ? "var(--background)" : "transparent",
                color: tab === tb.id ? "var(--foreground)" : "var(--muted-foreground)",
                border: tab === tb.id ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              <tb.icon size={12} /> {tb.label}
            </button>
          ))}
        </div>

        {tab === "feed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 px-2.5 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <Search size={12} style={{ color: "var(--muted-foreground)" }} />
                <input
                  className="bg-transparent outline-none text-[11px] w-full"
                  placeholder={t("groupFeedSearchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <select
                className="text-[11px] rounded-lg px-2.5 py-2 outline-none"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
              >
                <option value="all">{t("groupFeedAllGroups")}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button onClick={clearHistory} className="p-2 rounded-lg" style={{ color: "var(--muted-foreground)" }} title={t("groupFeedClearHistory")}>
                <Trash2 size={13} />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              <span>{filtered.length} {t("groupFeedMessages")} · {groups.length} {t("groupFeedGroups")}</span>
              <span>{t("groupFeedLive")}</span>
            </div>

            {filtered.length === 0 && (
              <div className="py-10 text-center">
                <Radio size={22} className="mx-auto mb-2 opacity-40" />
                <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedEmpty")}</p>
              </div>
            )}

            <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1 scrollbar-hide">
              {filtered.slice(0, 200).map((m) => (
                <div key={m.id} className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${providerColor(m.provider)}22`, color: providerColor(m.provider) }}>
                      {m.provider === "whatsapp" ? "WA" : "TG"}
                    </span>
                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{groupName(m)}</span>
                    <span className="text-[9px] truncate" style={{ color: "var(--muted-foreground)" }}>{m.senderName}</span>
                    {m.mediaType !== "text" && (
                      <span className="text-[9px] uppercase" style={{ color: "#D69E2E" }}>{m.mediaType}</span>
                    )}
                    <span className="ml-auto text-[9px] font-mono flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>{dateLabel(m.ts)}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--foreground)" }}>
                    {m.text || (m.mediaType !== "text" ? `[${m.mediaType}]` : "")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "vigia" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl space-y-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Bell size={13} style={{ color: "#C00018" }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("groupFeedWatchConfig")}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--foreground)" }}>{t("groupFeedAiFilter")}</span>
                <button onClick={() => saveAiFilter(!aiFilter)} style={{ color: aiFilter ? "#C00018" : "var(--muted-foreground)" }}>
                  {aiFilter ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
              </div>
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedAiFilterDesc")}</p>

              <div className="flex items-center gap-2">
                <select
                  className="text-[11px] rounded-lg px-2.5 py-2 outline-none"
                  value={alertProvider}
                  onChange={(e) => setAlertProvider(e.target.value as "whatsapp" | "telegram")}
                  style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telegram">Telegram</option>
                </select>
                <input
                  className="flex-1 bg-transparent outline-none text-[11px] px-2.5 py-2 rounded-lg"
                  placeholder={alertProvider === "whatsapp" ? t("groupFeedAlertTargetWa") : t("groupFeedAlertTargetTg")}
                  value={alertTarget}
                  onChange={(e) => setAlertTarget(e.target.value)}
                  style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                />
                <button onClick={saveAlert} className="px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                  {t("groupFeedSave")}
                </button>
              </div>
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedAlertTargetDesc")}</p>
            </div>

            <div className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("groupFeedWatchedGroups")} ({watchedCount}/{groups.length})</span>
              </div>
              {groups.length === 0 && (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedNoGroupsYet")}</p>
              )}
              <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto scrollbar-hide">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer" style={{ background: watchedToggles[g.id] ? `${providerColor(g.provider)}14` : "transparent" }}>
                    <input type="checkbox" checked={!!watchedToggles[g.id]} onChange={(e) => toggleWatched(g.id, e.target.checked)} className="accent-[#C00018]" />
                    <span className="text-[10px] font-bold uppercase rounded px-1" style={{ color: providerColor(g.provider) }}>{g.provider === "whatsapp" ? "WA" : "TG"}</span>
                    <span className="text-[11px] truncate" style={{ color: "var(--foreground)" }}>{g.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <span className="text-[10px] uppercase tracking-wider block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("groupFeedWatchlist")}</span>
              <div className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 bg-transparent outline-none text-[11px] px-2.5 py-2 rounded-lg"
                  placeholder={t("groupFeedWatchlistPlaceholder")}
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addTerm(); }}
                  style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                />
                <button onClick={addTerm} className="px-3 py-2 rounded-lg text-[11px] flex items-center gap-1" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                  <Plus size={12} /> {t("groupFeedAdd")}
                </button>
              </div>
              {(settings?.watchlist || []).length === 0 && (
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedNoTerms")}</p>
              )}
              <div className="space-y-1">
                {(settings?.watchlist || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    <button onClick={() => toggleTerm(item, !item.enabled)} style={{ color: item.enabled ? "#C00018" : "var(--muted-foreground)" }}>
                      {item.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <span className="text-[11px] flex-1 truncate" style={{ color: item.enabled ? "var(--foreground)" : "var(--muted-foreground)", textDecoration: item.enabled ? "none" : "line-through" }}>{item.term}</span>
                    <button onClick={() => removeTerm(item.id)} style={{ color: "var(--muted-foreground)" }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "robo" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl space-y-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={13} style={{ color: "#D69E2E" }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("groupFeedDealsTitle")}</span>
              </div>
              <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("groupFeedDealsDesc")}</p>

              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--foreground)" }}>{t("groupFeedDealsEnable")}</span>
                <button onClick={() => { setDealsEnabled(!dealsEnabled); }} style={{ color: dealsEnabled ? "#C00018" : "var(--muted-foreground)" }}>
                  {dealsEnabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{ color: "var(--foreground)" }}>{t("groupFeedDealsInterval")}</span>
                <input
                  type="number" min={1}
                  className="w-16 text-[11px] px-2 py-1.5 rounded-lg outline-none"
                  value={dealsInterval}
                  onChange={(e) => setDealsInterval(Math.max(1, Number(e.target.value) || 1))}
                  style={{ background: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                />
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>h</span>
                <button onClick={saveDeals} className="ml-auto px-3 py-2 rounded-lg text-[11px]" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                  {t("groupFeedSave")}
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button onClick={runDeals} disabled={running} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px]" style={{ background: "#D69E2E", color: "#fff" }}>
                  {running ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {t("groupFeedDealsRunNow")}
                </button>
                <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {settings?.deals.lastRun
                    ? t("groupFeedDealsLastRun") + " " + new Date(settings.deals.lastRun).toLocaleString()
                    : t("groupFeedDealsNeverRun")}
                  {settings?.deals.status === "no-key" && <span className="block text-[#C00018]">{t("groupFeedDealsNoKey")}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)" }}>
              <AlertTriangle size={13} style={{ color: "#ffaa00", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[10px]" style={{ color: "#cc9900" }}>{t("groupFeedDealsDisclaimer")}</p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(0,200,80,0.06)", border: "1px solid rgba(0,200,80,0.2)" }}>
              <Globe size={13} style={{ color: "#25D366", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[10px]" style={{ color: "#25D366" }}>{t("groupFeedDealsFirecrawl")}</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

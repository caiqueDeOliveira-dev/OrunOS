import { useEffect, useRef, useState } from "react";
import {
  MessageSquareText, MessageSquare, Search, RefreshCw, Bot, Zap, Users, Eye,
  Radio, ShoppingCart, Globe, AlertTriangle, Loader2, CheckCircle2, Bell,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { P, PremiumRoot, ScrollArea, Toggle, PrimaryButton, Input } from "../premium";
import { isElectron } from "../../../constants";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useToast } from "../../../components/Toast";
import type { OrunGroupMessage, OrunGroupFeedState, OrunGroupWatchlistTermExport } from "../../../../types/orun";

type TabId = "feed" | "vigia" | "robo";

function providerColor(provider: "whatsapp" | "telegram") {
  return provider === "whatsapp" ? "#25D366" : "#2AABEE";
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function senderColor(s?: string) {
  let h = 200;
  if (s) { let acc = 0; for (const c of s) acc = (acc * 31 + c.charCodeAt(0)) % 360; h = acc; }
  return `hsl(${h}, 65%, 60%)`;
}

function renderRichText(text: string) {
  const urlRe = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRe);
  return parts.map((part, i) => {
    const isUrl = part?.startsWith("http") || part?.startsWith("www");
    if (isUrl) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: P.info, textDecoration: "underline", wordBreak: "break-all" }}>
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Bubble({ m }: { m: OrunGroupMessage }) {
  const isMine = Boolean(m.fromMe);
  const isBot = Boolean(m.bot);
  const label = isBot ? "Robô" : (m.senderName || "Participante");
  const accent = isBot ? "var(--primary)" : "#25D366";
  const bubbleBg = isMine ? (isBot ? "rgba(195,0,47,0.16)" : "rgba(37,211,102,0.12)") : P.card2;
  const bubbleBorder = isMine ? (isBot ? "rgba(195,0,47,0.4)" : "rgba(37,211,102,0.35)") : P.border;

  return (
    <div className="flex" style={{ justifyContent: isMine ? "flex-end" : "flex-start" }}>
      <div className="max-w-[85%] px-3 py-2 rounded-2xl" style={{ background: bubbleBg, border: `1px solid ${bubbleBorder}`, borderTopLeftRadius: isMine ? 14 : 4, borderTopRightRadius: isMine ? 4 : 14 }}>
        {!isMine && (
          <div className="text-[10px] font-semibold mb-1" style={{ color: senderColor(m.senderJid || m.senderName || "?") }}>{label}</div>
        )}
        {isMine && isBot && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold mb-1" style={{ color: accent }}>
            <Bot size={10} /> Robô
          </div>
        )}
        {m.imageBase64 && (
          <img
            src={`data:${m.imageMime || "image/jpeg"};base64,${m.imageBase64}`}
            alt="produto"
            className="rounded-xl mb-1.5"
            style={{ maxWidth: 260, maxHeight: 220, objectFit: "cover", display: "block" }}
          />
        )}
        {m.text ? (
          <div className="text-[12px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: P.text }}>{renderRichText(m.text)}</div>
        ) : m.audioMime ? (
          <div className="text-[11px] flex items-center gap-1.5" style={{ color: P.sub }}>
            <Zap size={11} /> Áudio{m.audioDuration ? ` (${m.audioDuration}s)` : ""}
          </div>
        ) : null}
        <div className="text-[9px] mt-1 text-right" style={{ color: P.dim }}>{formatTime(m.timestamp)}</div>
      </div>
    </div>
  );
}

export function GroupFeedWorkspace({ plugin }: WorkspaceProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>("feed");
  const [groups, setGroups] = useState<{ jid: string; name: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const selectedGroupRef = useRef("");
  const [groupMessages, setGroupMessages] = useState<OrunGroupMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("disconnected");
  const [feed, setFeed] = useState<OrunGroupFeedState | null>(null);
  const [dealsScanning, setDealsScanning] = useState(false);
  const [dealsResult, setDealsResult] = useState<OrunGroupWatchlistTermExport[] | null>(null);
  const [intervalHours, setIntervalHours] = useState("2");
  const threadRef = useRef<HTMLDivElement>(null);

  const loadGroups = async () => {
    setLoadingGroups(true);
    const g = await window.orun.whatsapp.listGroups();
    setGroups(g);
    setLoadingGroups(false);
    if (g.length > 0 && !selectedGroupRef.current) {
      selectGroup(g[0].jid);
    }
  };

  const selectGroup = async (jid: string) => {
    selectedGroupRef.current = jid;
    setSelectedGroup(jid);
    setLoadingMessages(true);
    const msgs = await window.orun.whatsapp.groupMessages(jid);
    setGroupMessages(msgs);
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (!isElectron) return;
    window.orun.whatsapp.status().then((s) => {
      setStatus(s);
      if (s === "connected") loadGroups();
    });
    window.orun.groupFeed.getState().then((s) => setFeed(s));
    const offStatus = window.orun.whatsapp.onStatusUpdate((s) => {
      setStatus(s.status);
      if (s.status === "connected") loadGroups();
      if (s.groupsRefreshed) loadGroups();
    });
    const offGroupMsg = window.orun.whatsapp.onGroupMessage(({ jid, message }) => {
      if (jid === selectedGroupRef.current) {
        setGroupMessages((prev) => [...prev, message]);
      }
    });
    const offFeed = window.orun.groupFeed.onMessage((msg) => {
      setFeed((prev) => (prev ? { ...prev, history: [msg, ...prev.history] } : prev));
    });
    return () => { offStatus(); offGroupMsg(); offFeed(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [groupMessages, selectedGroup]);

  useEffect(() => {
    if (!isElectron || !feed?.settings) return;
    setIntervalHours(String(feed.settings.deals?.intervalHours || 2));
  }, [feed?.settings?.deals?.intervalHours]);

  useEffect(() => {
    if (!isElectron) return;
    const offDeals = window.orun.groupFeed.onDeals((result) => {
      setDealsScanning(false);
      if (result.ok && result.deals) {
        setDealsResult(result.deals);
        toast.show(t("groupFeedDealsDone"), "success");
      } else if (result.error === "no-key") {
        toast.show(t("groupFeedDealsNoKey"), "error");
      } else if (result.error === "no-watchlist") {
        toast.show(t("groupFeedDealsNoWatchlist"), "warning");
      } else {
        toast.show(result.error || "Erro na busca", "error");
      }
      window.orun.groupFeed.getState().then((s) => setFeed(s));
    });
    return () => { offDeals(); };
  }, []);

  const refreshAll = async () => {
    await loadGroups();
    if (selectedGroupRef.current) await selectGroup(selectedGroupRef.current);
    const s = await window.orun.groupFeed.getState();
    setFeed(s);
    toast.show("Grupos atualizados", "success");
  };

  const filtered = groupMessages.filter((m) => {
    if (!search) return true;
    const text = (m.text || "").toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const watchedIds = new Set(feed?.settings?.watchedGroups || []);
  const feedCount = feed?.history?.length || 0;

  if (!isElectron) {
    return (
      <PremiumRoot>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[11px]" style={{ color: P.sub }}>{t("groupFeedBrowserWarning")}</p>
        </div>
      </PremiumRoot>
    );
  }

  return (
    <PremiumRoot>
      <ScrollArea ref={threadRef} className="p-5">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,211,102,0.12)", color: "#25D366" }}>
                <MessageSquareText size={18} />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>{plugin.name}</h2>
                <p className="text-[10px]" style={{ color: P.sub }}>
                  {groups.length} grupos · {feedCount} mensagens do vigia · {t("groupFeedLive")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] uppercase" style={{ background: status === "connected" ? "rgba(37,211,102,0.1)" : "color-mix(in srgb, var(--warn) 10%, transparent)", color: status === "connected" ? "#25D366" : P.alert, border: `1px solid ${status === "connected" ? "rgba(37,211,102,0.3)" : "color-mix(in srgb, var(--warn) 30%, transparent)"}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: status === "connected" ? "#25D366" : P.alert, boxShadow: status === "connected" ? "0 0 6px #25D366" : `0 0 6px ${P.alert}` }} />
                {status === "connected" ? "Conectado" : status}
              </span>
              <button onClick={refreshAll} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.sub }} title="Atualizar">
                <RefreshCw size={13} className={loadingGroups ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            {([
              { id: "feed" as TabId, icon: Radio, label: t("groupFeedTabFeed") },
              { id: "vigia" as TabId, icon: Eye, label: t("groupFeedTabWatch") },
              { id: "robo" as TabId, icon: ShoppingCart, label: t("groupFeedTabDeals") },
            ]).map((tb) => {
              const Icon = tb.icon;
              const active = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => setTab(tb.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all flex-1 justify-center"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    background: active ? "rgba(37,211,102,0.12)" : "transparent",
                    color: active ? "#25D366" : P.sub,
                    border: active ? "1px solid rgba(37,211,102,0.3)" : "1px solid transparent",
                    fontWeight: active ? 500 : 300,
                  }}
                >
                  <Icon size={13} />
                  {tb.label}
                </button>
              );
            })}
          </div>

          {/* ═══ FEED TAB ═══ */}
          {tab === "feed" && (
            <div className="grid grid-cols-[220px_1fr] gap-4">
              {/* Group list */}
              <div className="rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: P.card, border: `1px solid ${P.border}`, maxHeight: "60vh" }}>
                <div className="flex items-center gap-2 px-1 mb-1">
                  <Users size={12} style={{ color: "#25D366" }} />
                  <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: P.text }}>{t("groupFeedGroups")}</span>
                  <button onClick={loadGroups} className="ml-auto p-1 rounded" style={{ color: P.sub }} title="Atualizar">
                    <RefreshCw size={10} className={loadingGroups ? "animate-spin" : ""} />
                  </button>
                </div>
                {groups.length === 0 && !loadingGroups && (
                  <p className="text-[10px] p-2" style={{ color: P.sub }}>{t("whatsappNoGroupsFound")}</p>
                )}
                <div className="flex-1 overflow-y-auto hs-scroll pr-1 space-y-1">
                  {groups.map((g) => {
                    const isWatched = watchedIds.has(`wa:${g.jid}`) || watchedIds.has(g.jid);
                    const active = selectedGroup === g.jid;
                    return (
                      <button
                        key={g.jid}
                        onClick={() => selectGroup(g.jid)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                        style={{
                          background: active ? "rgba(37,211,102,0.12)" : "transparent",
                          border: `1px solid ${active ? "rgba(37,211,102,0.35)" : "transparent"}`,
                        }}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: active ? "rgba(37,211,102,0.18)" : P.card2, color: active ? "#25D366" : P.sub }}>
                          {(g.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium truncate" style={{ color: active ? P.text : P.sub }}>{g.name}</span>
                          {isWatched && (
                            <span className="text-[8px] uppercase flex items-center gap-1" style={{ color: "#25D366" }}>
                              <Eye size={8} /> vigiado
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thread */}
              <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: P.card, border: `1px solid ${P.border}`, maxHeight: "60vh" }}>
                <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: P.border, background: P.card2 }}>
                  <MessageSquare size={12} style={{ color: "#25D366" }} />
                  <span className="text-[11px] font-semibold truncate" style={{ color: P.text }}>
                    {groups.find((g) => g.jid === selectedGroup)?.name || (selectedGroup ? selectedGroup.split("@")[0] : "—")}
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg ml-auto" style={{ background: P.bg, border: `1px solid ${P.border}`, maxWidth: 260 }}>
                    <Search size={10} style={{ color: P.dim }} />
                    <input
                      className="bg-transparent outline-none text-[11px] w-full"
                      placeholder={t("groupFeedSearchPlaceholder")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ color: P.text }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto hs-scroll p-4 space-y-1.5" style={{ background: "rgba(0,0,0,0.25)" }}>
                  {!selectedGroup ? (
                    <p className="text-[11px] py-8 text-center" style={{ color: P.sub }}>Escolha um grupo à esquerda para ver as mensagens (fotos, links e descrições do jeito que aparecem lá).</p>
                  ) : loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={16} className="animate-spin" style={{ color: "#25D366" }} />
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-[11px] py-8 text-center" style={{ color: P.sub }}>
                      {search ? "Nenhuma mensagem encontrada." : "Sem mensagens ainda. As novas mensagens deste grupo (inclusive as do robô) vão aparecer aqui em tempo real."}
                    </p>
                  ) : (
                    filtered.map((m, i) => <Bubble key={m.id || i} m={m} />)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ VIGIA TAB ═══ */}
          {tab === "vigia" && (
            <div className="grid gap-4">
              <div className="p-4 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 mb-3" style={{ color: P.text }}>
                  <Eye size={12} style={{ color: "#25D366" }} /> {t("groupFeedWatchedGroups")}
                </span>
                {feed && feed.groups.length === 0 ? (
                  <p className="text-[10px]" style={{ color: P.sub }}>{t("groupFeedNoGroupsYet")}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(feed?.groups || []).map((g) => {
                      const key = g.id;
                      const enabled = watchedIds.has(key);
                      return (
                        <button
                          key={g.id}
                          onClick={async () => {
                            const next = new Set(watchedIds);
                            if (enabled) next.delete(key); else next.add(key);
                            await window.orun.groupFeed.setSettings({ watchedGroups: Array.from(next) });
                            const s = await window.orun.groupFeed.getState();
                            setFeed(s);
                            toast.show(enabled ? "Removido do vigia" : "Adicionado ao vigia", "success");
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] transition-all"
                          style={{
                            background: enabled ? "rgba(37,211,102,0.12)" : P.card2,
                            color: enabled ? "#25D366" : P.sub,
                            border: `1px solid ${enabled ? "rgba(37,211,102,0.4)" : P.border}`,
                          }}
                        >
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: `${providerColor(g.provider)}22`, color: providerColor(g.provider) }}>
                            {g.provider === "whatsapp" ? "WA" : "TG"}
                          </span>
                          {g.name}
                          {enabled && <CheckCircle2 size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 mb-3" style={{ color: P.text }}>
                  <Globe size={12} style={{ color: "#25D366" }} /> {t("groupFeedWatchlist")}
                </span>
                {(feed?.settings?.watchlist || []).length === 0 ? (
                  <p className="text-[10px] mb-3" style={{ color: P.sub }}>{t("groupFeedNoTerms")}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(feed?.settings?.watchlist || []).map((item) => (
                      <span key={item.id} className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px]" style={{ background: item.enabled ? "rgba(37,211,102,0.1)" : P.card2, color: item.enabled ? "#25D366" : P.dim, border: `1px solid ${item.enabled ? "rgba(37,211,102,0.3)" : P.border}` }}>
                        {item.term}
                        <button
                          onClick={async () => {
                            await window.orun.groupFeed.removeWatchlistTerm(item.id);
                            const s = await window.orun.groupFeed.getState();
                            setFeed(s);
                            toast.show("Termo removido", "success");
                          }}
                          className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-white/10 w-3.5 h-3.5 flex items-center justify-center"
                          style={{ color: P.dim }}
                          title="Remover"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-transparent outline-none text-[11px] px-3 py-2 rounded-xl"
                    placeholder={t("groupFeedWatchlistPlaceholder")}
                    style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.text }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (!val) return;
                        await window.orun.groupFeed.addWatchlistTerm(val);
                        (e.target as HTMLInputElement).value = "";
                        const s = await window.orun.groupFeed.getState();
                        setFeed(s);
                        toast.show("Termo adicionado", "success");
                      }
                    }}
                  />
                  <button
                    onClick={async (e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      const val = input?.value?.trim();
                      if (!val) return;
                      await window.orun.groupFeed.addWatchlistTerm(val);
                      input.value = "";
                      const s = await window.orun.groupFeed.getState();
                      setFeed(s);
                      toast.show("Termo adicionado", "success");
                    }}
                    className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all"
                    style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}
                  >
                    {t("groupFeedAdd")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                  <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 mb-3" style={{ color: P.text }}>
                    <Bell size={12} style={{ color: "#25D366" }} /> {t("groupFeedWatchConfig")}
                  </span>
                  <p className="text-[10px]" style={{ color: P.sub }}>{t("groupFeedAlertTargetDesc")}</p>
                </div>

                <div className="p-4 rounded-2xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                  <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2 mb-3" style={{ color: P.text }}>
                    <AlertTriangle size={12} style={{ color: P.alert }} /> Filtro IA
                  </span>
                  <p className="text-[10px]" style={{ color: P.sub }}>{t("groupFeedAiFilterDesc")}</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ROBÔ DE PROMOÇÕES ═══ */}
          {tab === "robo" && (() => {
            const deals = feed?.settings?.deals;
            const hasKey = deals?.status !== "no-key";
            const hasWatchlist = (feed?.settings?.watchlist || []).length > 0;
            return (
              <div className="grid gap-4">
                <div className="p-4 rounded-2xl space-y-4" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                  <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2" style={{ color: P.text }}>
                    <ShoppingCart size={12} style={{ color: P.alert }} /> {t("groupFeedDealsTitle")}
                  </span>
                  <p className="text-[10px]" style={{ color: P.sub }}>{t("groupFeedDealsDesc")}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] flex items-center gap-2" style={{ color: P.text }}>
                      {t("groupFeedDealsEnable")}
                    </span>
                    <Toggle
                      on={!!deals?.enabled}
                      onChange={async () => {
                        await window.orun.groupFeed.setSettings({ deals: { enabled: !deals?.enabled } });
                        const s = await window.orun.groupFeed.getState();
                        setFeed(s);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] shrink-0" style={{ color: P.sub }}>{t("groupFeedDealsInterval")}</span>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(e.target.value)}
                      onBlur={async () => {
                        const h = Math.max(1, Math.min(72, parseInt(intervalHours) || 2));
                        setIntervalHours(String(h));
                        await window.orun.groupFeed.setSettings({ deals: { intervalHours: h } });
                        const s = await window.orun.groupFeed.getState();
                        setFeed(s);
                      }}
                      className="w-16 text-center text-[11px] px-2 py-1.5 rounded-xl outline-none"
                      style={{ background: P.bg, border: `1px solid ${P.border}`, color: P.text }}
                    />
                    <span className="text-[10px]" style={{ color: P.dim }}>h</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <PrimaryButton
                      onClick={async () => {
                        if (dealsScanning) return;
                        setDealsScanning(true);
                        setDealsResult(null);
                        await window.orun.groupFeed.runDealsScan();
                      }}
                      disabled={dealsScanning}
                    >
                      {dealsScanning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      {dealsScanning ? "Buscando..." : t("groupFeedDealsRunNow")}
                    </PrimaryButton>

                    {deals?.lastRun ? (
                      <span className="text-[10px]" style={{ color: P.dim }}>
                        {t("groupFeedDealsLastRun")} {formatTime(deals.lastRun)}
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: P.dim }}>{t("groupFeedDealsNeverRun")}</span>
                    )}
                  </div>
                </div>

                {!hasKey && (
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "color-mix(in srgb, var(--warn) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 25%, transparent)" }}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color: P.alert }} />
                    <div>
                      <p className="text-[10px] font-semibold" style={{ color: P.alert }}>{t("groupFeedDealsNoKey")}</p>
                      <p className="text-[10px] mt-1" style={{ color: P.dim }}>{t("groupFeedDealsFirecrawl")}</p>
                    </div>
                  </div>
                )}

                {!hasWatchlist && hasKey && (
                  <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.25)" }}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color: P.alert }} />
                    <p className="text-[10px]" style={{ color: P.alert }}>{t("groupFeedDealsNoWatchlist")}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl" style={{ background: P.bg, border: `1px solid ${P.border}` }}>
                  <p className="text-[10px] flex items-start gap-2" style={{ color: P.dim }}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color: P.alert }} />
                    {t("groupFeedDealsDisclaimer")}
                  </p>
                </div>

                {dealsResult && dealsResult.length > 0 && (
                  <div className="p-4 rounded-2xl space-y-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-2" style={{ color: P.text }}>
                      <CheckCircle2 size={12} style={{ color: "#25D366" }} /> Resultados da busca
                    </span>
                    {dealsResult.map((group, i) => (
                      <div key={i}>
                        <span className="text-[10px] font-semibold block mb-1.5" style={{ color: P.alert }}>"{group.term}"</span>
                        {(group.deals || []).map((r, j) => (
                          <a
                            key={j}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2.5 p-2 rounded-xl mb-1.5 transition-all hover:brightness-110"
                            style={{ background: P.bg, border: `1px solid ${P.border}` }}
                          >
                            {r.image && (
                              <img
                                src={r.image}
                                alt=""
                                className="w-12 h-12 rounded-lg shrink-0 object-cover"
                                style={{ border: `1px solid ${P.border}` }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium truncate" style={{ color: P.text }}>{r.title}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {r.store && <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(37,211,102,0.12)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}>{r.store}</span>}
                                {r.price && <span className="text-[10px] font-bold" style={{ color: P.alert }}>{r.price}</span>}
                                {r.condition && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,200,80,0.12)", color: "#FFC850", border: "1px solid rgba(255,200,80,0.3)" }}>{r.condition}</span>}
                                {r.coupon && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(120,140,255,0.12)", color: "#788CFF", border: "1px solid rgba(120,140,255,0.3)" }}>🎟️ {r.coupon}</span>}
                              </div>
                              {r.description && <p className="text-[9px] mt-1 line-clamp-2" style={{ color: P.dim }}>{r.description}</p>}
                              <p className="text-[9px] mt-1 truncate" style={{ color: P.info }}>{r.url}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Watched count footer */}
          {(tab === "vigia" || tab === "robo") && (
            <div className="text-[10px]" style={{ color: P.sub }}>
              {watchedIds.size} {t("groupFeedWatchedGroups")} · {(feed?.settings?.watchlist || []).length} {t("groupFeedWatchlist")}
            </div>
          )}
        </div>
      </ScrollArea>
    </PremiumRoot>
  );
}

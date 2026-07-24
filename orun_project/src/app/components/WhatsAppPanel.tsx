import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  X, MessageCircle, QrCode, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Users, Send,
  Zap, Bell, Radio, Globe, Trash2, Plus, ToggleLeft, ToggleRight, BarChart3, Bot,
} from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import { useToast } from "./Toast";
import type { OrunWhatsAppStatus } from "../../types/orun";

function getAgentGroups(t: (key: string) => string) {
  return [
    { id: "Health", label: t("schedulesHealth"), color: "#E53E3E", desc: t("whatsappHealthDesc") },
    { id: "Finance", label: t("schedulesFinance"), color: "#D69E2E", desc: t("whatsappFinanceDesc") },
    { id: "Personal Assistant", label: t("schedulesPersonalAssistant"), color: "#4A5568", desc: t("whatsappAssistantDesc") },
    { id: "Marketing", label: t("schedulesMarketing"), color: "#D53F8C", desc: t("whatsappSocialDesc") },
  ];
}

type Tab = "config" | "automation";

export function WhatsAppPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const agentGroups = getAgentGroups(t);
  const [status, setStatus] = useState<OrunWhatsAppStatus["status"]>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [selfJid, setSelfJid] = useState<string | null>(null);
  const [listenJid, setListenJid] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentJids, setAgentJids] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<{ jid: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("config");
  const autoConnectAttempted = useRef(false);

  // Automation state
  const [msgStats, setMsgStats] = useState({ dailyMsgCount: 0, dailyMsgLimit: 45, queueLength: 0, date: "" });
  const [keywordRules, setKeywordRules] = useState<Array<{ id: string; keywords: string[]; agent: string; action: string; enabled: boolean }>>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordAgent, setNewKeywordAgent] = useState("Health");
  const [newKeywordAction, setNewKeywordAction] = useState<"notify" | "task" | "summary">("notify");
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<string[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [n8nUrl, setN8nUrl] = useState("");
  const [summaryAgent, setSummaryAgent] = useState("Health");
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.whatsapp.status().then((s) => {
      setStatus(s);
      if (s === "disconnected" && !autoConnectAttempted.current) {
        autoConnectAttempted.current = true;
        connect();
      }
    });
    window.orun.settings.get<{ listenJid?: string }>("whatsapp").then((cfg) => { if (cfg?.listenJid) setListenJid(cfg.listenJid); });
    window.orun.whatsapp.getAgentJids().then(setAgentJids);
    window.orun.waAutomation.getStats().then(setMsgStats);
    window.orun.waAutomation.getKeywordRules().then(setKeywordRules);
    window.orun.waAutomation.getN8nWebhook().then(setN8nUrl);

    const loadGroups = async () => {
      setLoadingGroups(true);
      const g = await window.orun.whatsapp.listGroups();
      setGroups(g);
      setLoadingGroups(false);
    };
    if (status === "connected") loadGroups();

    const offStatus = window.orun.whatsapp.onStatusUpdate((s) => {
      setStatus(s.status);
      setConnecting(false);
      setError(null);
      if (s.selfJid) { setSelfJid(s.selfJid); setListenJid((prev) => prev || s.selfJid || ""); }
      if (s.status === "connected") setQr(null);
      if (s.status === "disconnected" && s.loggedOut) {
        setError("Sessão expirada. Clique Conectar para escanear um novo QR Code.");
      }
      if (s.groupsRefreshed) {
        window.orun.whatsapp.listGroups().then((g) => { setGroups(g); setLoadingGroups(false); });
      }
    });
    const offQR = window.orun.whatsapp.onQR((dataUrl) => {
      if (dataUrl) { setQr(dataUrl); setError(null); }
      else setError("Falha ao gerar QR Code. Clique Conectar para tentar novamente.");
    });
    return () => { offStatus(); offQR(); };
  }, []);

  const connect = async () => {
    setConnecting(true);
    setQr(null);
    setError(null);
    try {
      const result = await Promise.race([
        window.orun.whatsapp.connect() as Promise<{ ok: boolean; error?: string }>,
        new Promise<{ ok: false; error: string }>((_, reject) => setTimeout(() => reject(new Error("Timeout: não recebeu QR Code em 30s")), 30000)),
      ]);
      if (result && !result.ok && result.error) {
        setError(`Falha ao conectar: ${result.error}`);
        setConnecting(false);
      }
    } catch (err: any) {
      setError(`Falha ao conectar: ${err?.message || "erro desconhecido"}`);
      setConnecting(false);
    }
  };

  const saveListenJid = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("whatsapp", { listenJid });
  };

  const saveAgentJid = async (agentId: string, jid: string) => {
    const next = { ...agentJids, [agentId]: jid };
    setAgentJids(next);
    if (isElectron) await window.orun.whatsapp.setAgentJids(next);
  };

  // Automation helpers
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    const keywords = newKeyword.split(",").map((k) => k.trim()).filter(Boolean);
    const r = await window.orun.waAutomation.addKeywordRule({ keywords, agent: newKeywordAgent, action: newKeywordAction });
    if (r.ok) {
      setNewKeyword("");
      const rules = await window.orun.waAutomation.getKeywordRules();
      setKeywordRules(rules);
      toast.show("Regra adicionada", "success");
    }
  };

  const removeKeyword = async (id: string) => {
    await window.orun.waAutomation.removeKeywordRule(id);
    setKeywordRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleKeyword = async (id: string) => {
    await window.orun.waAutomation.toggleKeywordRule(id);
    setKeywordRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const doBroadcast = async () => {
    if (!broadcastText.trim() || broadcastTarget.length === 0) return;
    setBroadcasting(true);
    const result = await window.orun.waAutomation.broadcast(broadcastText, broadcastTarget);
    setBroadcasting(false);
    if (result.ok) {
      const sent = result.results?.filter((r) => r.ok).length || 0;
      toast.show(`Broadcast enviado para ${sent} grupo(s)`, "success");
      setBroadcastText("");
    } else {
      toast.show(`Erro: ${result.error}`, "error");
    }
  };

  const saveN8n = async () => {
    const r = await window.orun.waAutomation.setN8nWebhook(n8nUrl);
    if (r.ok) toast.show("Webhook N8N salvo", "success");
  };

  const loadSummary = async () => {
    if (groups.length === 0) return;
    setLoadingSummary(true);
    const g = groups[0];
    const r = await window.orun.waAutomation.getSummary(g.jid, summaryAgent, 24);
    setLoadingSummary(false);
    setSummaryResult(r.ok && r.summary ? r.summary : "Nenhuma mensagem nas últimas 24h.");
  };

  const ratePct = Math.round((msgStats.dailyMsgCount / msgStats.dailyMsgLimit) * 100);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle size={15} style={{ color: "#25D366" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>WhatsApp</span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg" style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)" }}>
          <AlertTriangle size={13} style={{ color: "#ffaa00", flexShrink: 0, marginTop: 1 }} />
          <p className="text-[10px]" style={{ color: "#cc9900" }}>
            {t("whatsappDisclaimer1")}
            {t("whatsappDisclaimer2")}
          </p>
        </div>

        {!isElectron && <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{t("whatsappBrowserWarning")}</p>}

        {isElectron && (
          <>
            {/* Rate Limit Bar */}
            <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{t("whatsappDailyLimit")}</span>
                <span className="text-[10px] font-mono" style={{ color: ratePct > 80 ? "#C00018" : "#25D366" }}>
                  {msgStats.dailyMsgCount}/{msgStats.dailyMsgLimit}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${ratePct}%`,
                    background: ratePct > 80 ? "#C00018" : ratePct > 50 ? "#D69E2E" : "#25D366",
                  }}
                />
              </div>
              {msgStats.queueLength > 0 && (
                <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {t("whatsappQueue")}: {msgStats.queueLength}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--secondary)" }}>
              <button
                onClick={() => setTab("config")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] transition-colors"
                style={{
                  background: tab === "config" ? "var(--background)" : "transparent",
                  color: tab === "config" ? "var(--foreground)" : "var(--muted-foreground)",
                  border: tab === "config" ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <Users size={12} /> {t("whatsappConfigTab")}
              </button>
              <button
                onClick={() => setTab("automation")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] transition-colors"
                style={{
                  background: tab === "automation" ? "var(--background)" : "transparent",
                  color: tab === "automation" ? "var(--foreground)" : "var(--muted-foreground)",
                  border: tab === "automation" ? "1px solid var(--border)" : "1px solid transparent",
                }}
              >
                <Zap size={12} /> {t("whatsappAutomationTab")}
              </button>
            </div>

            {/* Connection Status */}
            {status === "disconnected" && !connecting && (
              <div className="mb-3">
                <button onClick={connect} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs" style={{ background: "#25D366", color: "#fff" }}>
                  <QrCode size={13} />
                  {t("whatsappConnect")}
                </button>
                <p className="text-[9px] text-center mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("whatsappSessionKept")}
                </p>
              </div>
            )}

            {connecting && (
              <div className="flex items-center justify-center gap-2 mb-3 py-3 rounded-lg" style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.15)" }}>
                <Loader2 size={14} className="animate-spin" style={{ color: "#25D366" }} />
                <span className="text-[11px]" style={{ color: "#25D366" }}>{t("whatsappConnecting")}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(192,0,24,0.08)", border: "1px solid rgba(192,0,24,0.2)" }}>
                <AlertTriangle size={13} style={{ color: "#C00018", flexShrink: 0 }} />
                <p className="text-[11px] flex-1" style={{ color: "#C00018" }}>{error}</p>
                <button onClick={connect} className="p-1 rounded" style={{ color: "var(--muted-foreground)" }} title={t("whatsappRetry")}>
                  <RefreshCw size={12} />
                </button>
              </div>
            )}

            {qr && status !== "connected" && (
              <div className="text-center mb-4">
                <img src={qr} alt={t("whatsappScanWhatsApp")} className="mx-auto rounded-lg" style={{ width: 220, height: 220 }} />
                <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>{t("whatsappScanInstruction")}</p>
              </div>
            )}

            {status === "connecting" && !qr && !error && <p className="text-[11px] mb-3" style={{ color: "var(--muted-foreground)" }}><Loader2 size={13} className="animate-spin inline mr-1.5" />{t("whatsappConnecting")}</p>}

            {status === "connected" && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: "#22C55E", boxShadow: "0 0 8px #22C55E" }} />
                <span className="text-[11px] flex-1" style={{ color: "#22C55E" }}>
                  {t("whatsappConnected")}{selfJid ? ` ${selfJid.split("@")[0]}` : ""}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", fontFamily: "'JetBrains Mono', monospace" }}>
                  {t("whatsappAutoReconnect")}
                </span>
              </div>
            )}

            {/* ═══ CONFIG TAB ═══ */}
            {tab === "config" && status === "connected" && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={13} style={{ color: "#25D366" }} />
                  <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("whatsappYourGroups")}</span>
                  <button onClick={async () => { setLoadingGroups(true); setGroups(await window.orun.whatsapp.listGroups()); setLoadingGroups(false); }}
                    className="ml-auto p-1 rounded" style={{ color: "var(--muted-foreground)" }} title={t("whatsappYourGroups")}>
                    <RefreshCw size={11} className={loadingGroups ? "animate-spin" : ""} />
                  </button>
                </div>
                {groups.length === 0 && !loadingGroups && (
                  <p className="text-[10px] mb-3" style={{ color: "var(--muted-foreground)" }}>{t("whatsappNoGroupsFound")}</p>
                )}
                {groups.length > 0 && (
                  <div className="mb-3 max-h-[120px] overflow-y-auto scrollbar-hide rounded-lg" style={{ background: "var(--input)", border: "1px solid var(--border)" }}>
                    {groups.map((g) => (
                      <div key={g.jid} className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#151515" }}>
                        <span className="text-[11px] flex-1 truncate" style={{ color: "var(--foreground)" }}>{g.name}</span>
                        <span className="text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace", maxWidth: 180 }}>{g.jid}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="h-px my-3" style={{ background: "var(--border)" }} />

                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} style={{ color: "#25D366" }} />
                  <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("whatsappGroupsByAgent")}</span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: "var(--muted-foreground)" }}>
                  {t("whatsappJidCopyHelp")}
                </p>
                <div className="space-y-2">
                  {agentGroups.map((agent) => (
                    <div key={agent.id} className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
                        <span className="text-[11px]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{agent.label}</span>
                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>— {agent.desc}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          value={agentJids[agent.id] || ""}
                          onChange={(e) => saveAgentJid(agent.id, e.target.value)}
                          placeholder={`${agent.id}@g.us`}
                          className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] outline-none"
                          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                        {agentJids[agent.id] && (
                          <button
                            onClick={async () => {
                              setTestingAgent(agent.id);
                              const r = await window.orun.whatsapp.testGroup(agentJids[agent.id], agent.label);
                              setTestingAgent(null);
                              if (r.ok) toast.show(t("whatsappTestSent", { name: agent.label }), "success");
                              else toast.show(t("whatsappTestError", { error: r.error ?? "" }), "error");
                            }}
                            disabled={testingAgent !== null}
                            className="px-2 py-1 rounded-md text-[10px] flex items-center gap-1"
                            style={{ background: "var(--border)", border: "1px solid #232323", color: "#25D366" }}
                            title={t("whatsappTestSendTo", { name: agent.label })}
                          >
                            {testingAgent === agent.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                            {t("settingsTestConnection")}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] mt-2" style={{ color: "var(--muted-foreground)" }}>
                  {t("whatsappJidHelp")}
                </p>
              </div>
            )}

            {/* Legacy listen Jid */}
            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              {t("wa_chat_personal_optional")}
            </label>
            <input
              value={listenJid} onChange={(e) => setListenJid(e.target.value)} onBlur={saveListenJid}
              placeholder={t("whatsappAutoFill")}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              {t("wa_chat_personal_desc")}
            </p>

            {/* ═══ AUTOMATION TAB ═══ */}
            {tab === "automation" && (
              <div className="space-y-4">
                {/* Keyword Rules */}
                <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bell size={13} style={{ color: "#D69E2E" }} />
                    <span className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("whatsappKeywords")}</span>
                  </div>
                  <p className="text-[9px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                    {t("whatsappKeywordsDesc")}
                  </p>

                  {/* Existing rules */}
                  {keywordRules.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {keywordRules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: "var(--input)", border: "1px solid var(--border)" }}>
                          <button onClick={() => toggleKeyword(rule.id)} style={{ color: rule.enabled ? "#25D366" : "var(--muted-foreground)" }}>
                            {rule.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] block truncate" style={{ color: "var(--foreground)" }}>
                              {rule.keywords.join(", ")}
                            </span>
                            <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                              {rule.agent} → {rule.action}
                            </span>
                          </div>
                          <button onClick={() => removeKeyword(rule.id)} style={{ color: "var(--muted-foreground)" }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new rule */}
                  <div className="flex gap-1.5">
                    <input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                      placeholder={t("wa_urgente_meeting")}
                      className="flex-1 px-2 py-1.5 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <select
                      value={newKeywordAgent}
                      onChange={(e) => setNewKeywordAgent(e.target.value)}
                      className="px-1.5 py-1.5 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    >
                      {agentGroups.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                    <select
                      value={newKeywordAction}
                      onChange={(e) => setNewKeywordAction(e.target.value as any)}
                      className="px-1.5 py-1.5 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    >
                      <option value="notify">{t("wa_option_notify")}</option>
                      <option value="task">{t("wa_option_task")}</option>
                      <option value="summary">{t("wa_option_summary")}</option>
                    </select>
                    <button onClick={addKeyword} className="px-2 py-1 rounded-md" style={{ background: "#25D366", color: "#fff" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* N8N Webhook */}
                <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={13} style={{ color: "#6366F1" }} />
                    <span className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>N8N Webhook</span>
                  </div>
                  <p className="text-[9px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                    {t("wa_n8n_webhook_desc")}
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      value={n8nUrl}
                      onChange={(e) => setN8nUrl(e.target.value)}
                      placeholder={t("wa_n8n_placeholder")}
                      className="flex-1 px-2.5 py-1.5 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <button onClick={saveN8n} className="px-2.5 py-1.5 rounded-md text-[10px]" style={{ background: "#6366F1", color: "#fff" }}>
                      {t("wa_save")}
                    </button>
                  </div>
                </div>

                {/* Broadcast */}
                <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Radio size={13} style={{ color: "#D53F8C" }} />
                    <span className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Broadcast</span>
                  </div>
                  <p className="text-[9px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                    {t("wa_broadcast_desc")}
                  </p>
                  {groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {groups.map((g) => (
                        <button
                          key={g.jid}
                          onClick={() => setBroadcastTarget((prev) => prev.includes(g.jid) ? prev.filter((j) => j !== g.jid) : [...prev, g.jid])}
                          className="px-2 py-1 rounded-md text-[9px] transition-colors"
                          style={{
                            background: broadcastTarget.includes(g.jid) ? "#D53F8C" : "var(--input)",
                            color: broadcastTarget.includes(g.jid) ? "#fff" : "var(--muted-foreground)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder={t("wa_message_placeholder")}
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-md text-[10px] outline-none resize-none mb-2"
                    style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    onClick={doBroadcast}
                    disabled={broadcasting || !broadcastText.trim() || broadcastTarget.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] disabled:opacity-40"
                    style={{ background: "#D53F8C", color: "#fff" }}
                  >
                    {broadcasting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {t("wa_send_to_n_groups", { count: String(broadcastTarget.length) })}
                  </button>
                </div>

                {/* Summary */}
                <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={13} style={{ color: "#25D366" }} />
                    <span className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("wa_summary")}</span>
                  </div>
                  <p className="text-[9px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                    Gerar resumo das últimas 24h de mensagens de um grupo.
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    <select
                      value={summaryAgent}
                      onChange={(e) => setSummaryAgent(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-md text-[10px] outline-none"
                      style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    >
                      {agentGroups.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                    <button
                      onClick={loadSummary}
                      disabled={loadingSummary || groups.length === 0}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] disabled:opacity-40"
                      style={{ background: "#25D366", color: "#fff" }}
                    >
                      {loadingSummary ? <Loader2 size={10} className="animate-spin" /> : <BarChart3 size={10} />}
                      Gerar
                    </button>
                  </div>
                  {summaryResult && (
                    <div className="p-2 rounded-md text-[10px] whitespace-pre-wrap max-h-[150px] overflow-y-auto scrollbar-hide" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {summaryResult}
                    </div>
                  )}
                </div>

                {/* Auto-reply status */}
                <div className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={13} style={{ color: "#25D366" }} />
                    <span className="text-[11px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("whatsappAutoReply")}</span>
                  </div>
                  <p className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                    {t("whatsappAutoReplyDesc")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agentGroups.filter((a) => agentJids[a.id]).map((a) => (
                      <span key={a.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]" style={{ background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40` }}>
                        <CheckCircle2 size={9} /> {a.label}
                      </span>
                    ))}
                    {agentGroups.filter((a) => agentJids[a.id]).length === 0 && (
                      <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("whatsappNoGroupsConfigured")}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

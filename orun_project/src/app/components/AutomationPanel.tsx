import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, CheckCircle2, XCircle, Loader2, Zap, Send, Plus, Trash2, Clock, Share2 } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunAutomationAction } from "../../types/orun";

export function AutomationPanel({ onClose, onOpenSchedules, onOpenSocialMedia }: { onClose: () => void; onOpenSchedules?: () => void; onOpenSocialMedia?: () => void }) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState("http://localhost:5678");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [workflowCount, setWorkflowCount] = useState<number | null>(null);
  const [workflows, setWorkflows] = useState<{ id: string; name: string; active: boolean }[]>([]);

  // Saved named automations Hampton can trigger on its own
  const [autoTrigger, setAutoTrigger] = useState(false);
  const [actions, setActions] = useState<OrunAutomationAction[]>([]);
  const [newAction, setNewAction] = useState<OrunAutomationAction>({ name: "", description: "", webhookUrl: "", headerName: "", headerValue: "" });

  // Manual webhook tester
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookPayload, setWebhookPayload] = useState('{\n  "message": "hello from Orun OS"\n}');
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [webhookState, setWebhookState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [webhookResult, setWebhookResult] = useState("");

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ baseUrl?: string; autoTrigger?: boolean }>("n8n").then((saved) => {
      if (saved?.baseUrl) setBaseUrl(saved.baseUrl);
      if (saved?.autoTrigger) setAutoTrigger(true);
    });
    window.orun.settings.hasApiKey("n8n").then(setHasKey);
    window.orun.settings.get<OrunAutomationAction[]>("automationActions").then((a) => setActions(a || []));
  }, []);

  const save = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("n8n", { baseUrl, autoTrigger });
    if (apiKey.trim()) { await window.orun.settings.setApiKey("n8n", apiKey.trim()); setApiKey(""); setHasKey(true); }
  };

  const saveActions = async (next: OrunAutomationAction[]) => {
    setActions(next);
    if (isElectron) await window.orun.settings.set("automationActions", next);
  };

  const addAction = () => {
    if (!newAction.name.trim() || !newAction.webhookUrl.trim()) return;
    saveActions([...actions, newAction]);
    setNewAction({ name: "", description: "", webhookUrl: "", headerName: "", headerValue: "" });
  };

  const removeAction = (name: string) => saveActions(actions.filter((a) => a.name !== name));

  const testConnection = async () => {
    if (!isElectron) return;
    setTestState("testing");
    await save();
    const result = await window.orun.n8n.testConnection({ baseUrl });
    if (result.ok) {
      setTestState("ok");
      setWorkflowCount(result.workflowCount ?? null);
      setWorkflows(await window.orun.n8n.listWorkflows());
    } else {
      setTestState("error");
      setTestError(result.error || t("automationError"));
    }
  };

  const sendWebhook = async () => {
    if (!isElectron || !webhookUrl.trim()) return;
    setWebhookState("sending");
    let payload: unknown;
    try { payload = JSON.parse(webhookPayload); } catch { payload = { raw: webhookPayload }; }
    const result = await window.orun.n8n.triggerWebhook({ webhookUrl: webhookUrl.trim(), payload, headerName: headerName.trim() || undefined, headerValue: headerValue.trim() || undefined });
    if (result.ok) { setWebhookState("ok"); setWebhookResult(JSON.stringify(result.result, null, 2)); }
    else { setWebhookState("error"); setWebhookResult(result.error || t("automationError")); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
              {t("automationTitle")}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>
        <p className="text-[10px] mb-4" style={{ color: "#555" }}>
          {t("automationN8nNote1")}
          <br />
          {t("automationN8nNote2")}
        </p>

        {/* Quick access to Schedules */}
        {onOpenSchedules && (
          <button onClick={() => { onClose(); onOpenSchedules(); }} className="w-full flex items-center gap-2 mb-2 px-3 py-2.5 rounded-lg text-xs" style={{ background: "rgba(192,0,24,0.08)", border: "1px solid rgba(192,0,24,0.2)", color: "#C00018" }}>
            <Clock size={14} />
            <span style={{ fontFamily: "'Sora', sans-serif" }}>Automações & Horários — Cardápio, Treino, Agenda diária</span>
          </button>
        )}

        {/* Quick access to Social Media */}
        {onOpenSocialMedia && (
          <button onClick={() => { onClose(); onOpenSocialMedia(); }} className="w-full flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg text-xs" style={{ background: "rgba(155,89,182,0.08)", border: "1px solid rgba(155,89,182,0.2)", color: "#9b59b6" }}>
            <Share2 size={14} />
            <span style={{ fontFamily: "'Sora', sans-serif" }}>Social Media — Stories, Reels, Carrosséis, TikTok, X</span>
          </button>
        )}

        {!isElectron && (
          <div className="mb-4 px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", border: "1px solid rgba(192,0,24,0.2)" }}>
            {t("automationBrowserWarning")}
          </div>
        )}

        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>n8n instance URL</label>
        <input
          value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:5678"
          className="w-full mb-3 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
        />

        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>
          API Key {hasKey && <span style={{ color: "#2ecc71" }}>{t("automationApiKeySaved")}</span>}
        </label>
        <input
          type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? "•••••••••••••••• ".concat(t("automationApiKeyKeep")) : t("automationApiKeyPlaceholder")}
          className="w-full mb-4 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
        />

        <button
          onClick={testConnection} disabled={testState === "testing"}
          className="w-full flex items-center justify-center gap-1.5 py-2 mb-2 rounded-lg text-xs"
          style={{ background: "#151515", border: "1px solid #232323", color: "#aaa" }}
        >
          {testState === "testing" && <Loader2 size={13} className="animate-spin" />}
          {testState === "ok" && <CheckCircle2 size={13} style={{ color: "#2ecc71" }} />}
          {testState === "error" && <XCircle size={13} style={{ color: "#C00018" }} />}
          {t("automationTestConnection")}
        </button>
        {testState === "error" && <p className="text-[10px] mb-3" style={{ color: "#C00018" }}>{testError}</p>}
        {testState === "ok" && (
          <div className="mb-4 space-y-1">
            <p className="text-[10px]" style={{ color: "#2ecc71" }}>{t("automationConnected")}</p>
            {workflows.slice(0, 6).map((w) => (
              <div key={w.id} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#888" }}>
                <div className="w-1 h-1 rounded-full" style={{ background: w.active ? "#2ecc71" : "#444" }} />
                {w.name}
              </div>
            ))}
          </div>
        )}

        <div className="h-px my-4" style={{ background: "#1a1a1a" }} />

        {/* Let Hampton trigger automations autonomously */}
        <label className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>
            {t("automationAutoTrigger")} <span style={{ color: "#C00018" }}>(beta)</span>
          </span>
          <input type="checkbox" checked={autoTrigger} onChange={(e) => { setAutoTrigger(e.target.checked); }} onBlur={save} className="accent-[#C00018]" />
        </label>
        {autoTrigger && (
          <p className="text-[10px] mb-3" style={{ color: "#555" }}>
            {t("automationAutoTriggerNote1")}
            {" "}{t("automationAutoTriggerNote2")}
          </p>
        )}

        <p className="text-[10px] tracking-wider uppercase mb-2" style={{ color: "#555" }}>{t("automationSavedTitle")}</p>
        {actions.length === 0 && <p className="text-[10px] mb-2" style={{ color: "#444" }}>{t("automationNoneYet")}</p>}
        <div className="space-y-1.5 mb-3">
          {actions.map((a) => (
            <div key={a.name} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate" style={{ fontFamily: "'Sora', sans-serif", color: "#ddd" }}>{a.name}</p>
                {a.description && <p className="text-[10px] truncate" style={{ color: "#555" }}>{a.description}</p>}
              </div>
              <button onClick={() => removeAction(a.name)} style={{ color: "#555" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div className="p-3 rounded-lg mb-4 space-y-2" style={{ background: "#0f0f0f", border: "1px dashed #222" }}>
          <input value={newAction.name} onChange={(e) => setNewAction((p) => ({ ...p, name: e.target.value }))} placeholder={t("automationNamePlaceholder")} className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#ddd" }} />
          <input value={newAction.description} onChange={(e) => setNewAction((p) => ({ ...p, description: e.target.value }))} placeholder={t("automationDescPlaceholder")} className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#ddd" }} />
          <input value={newAction.webhookUrl} onChange={(e) => setNewAction((p) => ({ ...p, webhookUrl: e.target.value }))} placeholder="Webhook URL" className="w-full px-2.5 py-1.5 rounded-md text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#ddd" }} />
          <button onClick={addAction} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs" style={{ background: "#151515", border: "1px solid #232323", color: "#888" }}>
            <Plus size={12} /> {t("automationAdd")}
          </button>
        </div>

        <div className="h-px my-4" style={{ background: "#1a1a1a" }} />

        {/* Manual webhook tester */}
        <p className="text-[10px] tracking-wider uppercase mb-2" style={{ color: "#555" }}>{t("automationTriggerNote")}</p>
        <input
          value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n.com/webhook/your-path"
          className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
        />
        <div className="flex gap-2 mb-2">
          <input value={headerName} onChange={(e) => setHeaderName(e.target.value)} placeholder={t("automationHeaderName")} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa" }} />
          <input value={headerValue} onChange={(e) => setHeaderValue(e.target.value)} placeholder={t("automationHeaderValue")} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa" }} />
        </div>
        <textarea
          value={webhookPayload} onChange={(e) => setWebhookPayload(e.target.value)} rows={3}
          className="w-full mb-2 px-3 py-2 rounded-lg text-xs outline-none resize-none"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0", fontFamily: "'JetBrains Mono', monospace" }}
        />
        <button
          onClick={sendWebhook} disabled={webhookState === "sending" || !webhookUrl.trim()}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
          style={{ background: "#C00018", color: "#fff", opacity: !webhookUrl.trim() ? 0.4 : 1 }}
        >
          {webhookState === "sending" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {t("automationSend")}
        </button>
        {webhookResult && (
          <pre className="mt-2 p-2 rounded-lg text-[9px] overflow-x-auto" style={{ background: "#111111", border: "1px solid #1e1e1e", color: webhookState === "error" ? "#C00018" : "#888", fontFamily: "'JetBrains Mono', monospace" }}>
            {webhookResult}
          </pre>
        )}
      </motion.div>
    </motion.div>
  );
}

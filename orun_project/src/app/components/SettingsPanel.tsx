import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Cpu, Cloud, CheckCircle2, XCircle, Loader2, RefreshCw, Users, Activity, MessageCircle } from "lucide-react";
import { isElectron } from "../constants";
import type { OrunProvider } from "../../types/orun";

const PROVIDER_INFO: Record<OrunProvider, { label: string; kind: "local" | "cloud"; defaultModel: string; note?: string }> = {
  ollama: { label: "Ollama", kind: "local", defaultModel: "llama3.1" },
  anthropic: { label: "Claude", kind: "cloud", defaultModel: "claude-sonnet-4-6" },
  openai: { label: "OpenAI", kind: "cloud", defaultModel: "gpt-4o-mini" },
  openrouter: { label: "OpenRouter", kind: "cloud", defaultModel: "meta-llama/llama-3.3-70b-instruct:free", note: "Free tier: models ending in :free" },
  groq: { label: "Groq", kind: "cloud", defaultModel: "llama-3.3-70b-versatile", note: "Free tier, very fast inference" },
  github: { label: "GitHub Models", kind: "cloud", defaultModel: "openai/gpt-4o", note: "Free with a GitHub personal access token (models: read scope)" },
};

export function SettingsPanel({ onClose, onOpenAgentModels, onOpenUsage, onOpenWhatsApp }: { onClose: () => void; onOpenAgentModels: () => void; onOpenUsage: () => void; onOpenWhatsApp: () => void }) {
  const [provider, setProvider] = useState<OrunProvider>("ollama");
  const [model, setModel] = useState(PROVIDER_INFO.ollama.defaultModel);
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Hampton, the central AI of Orun OS, a personal AI operating system. Be direct, helpful, and concise."
  );
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [freeModels, setFreeModels] = useState<Record<string, string[]>>({});
  const [fallbackProvider, setFallbackProvider] = useState<OrunProvider | "none">("none");
  const [fallbackModel, setFallbackModel] = useState("");
  const [runInBackground, setRunInBackground] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; message?: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ provider: OrunProvider; model: string; baseUrl?: string; systemPrompt?: string }>("ai").then((saved) => {
      if (saved) {
        setProvider(saved.provider);
        setModel(saved.model);
        if (saved.baseUrl) setBaseUrl(saved.baseUrl);
        if (saved.systemPrompt) setSystemPrompt(saved.systemPrompt);
      }
    });
    window.orun.ai.knownFreeModels().then(setFreeModels);
    window.orun.settings.get<{ provider: OrunProvider; model: string } | null>("aiFallback").then((fb) => {
      if (fb) { setFallbackProvider(fb.provider); setFallbackModel(fb.model); }
    });
    window.orun.settings.get<boolean>("runInBackground").then((v) => setRunInBackground(Boolean(v)));
    window.orun.settings.get<boolean>("wakeWordEnabled").then((v) => setWakeWordEnabled(Boolean(v)));
    const unsubscribe = window.orun.app.onUpdateStatus((status) => { setUpdateStatus(status); setCheckingUpdate(false); });
    return unsubscribe;
  }, []);

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    const result = await window.orun.app.checkForUpdates();
    if (!result.ok) { setUpdateStatus({ status: "error", message: result.error }); setCheckingUpdate(false); }
  };

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.hasApiKey(provider).then(setHasKey);
  }, [provider]);

  const refreshOllamaModels = async () => {
    if (!isElectron) return;
    setLoadingModels(true);
    setOllamaModels(await window.orun.ai.listOllamaModels(baseUrl));
    setLoadingModels(false);
  };

  useEffect(() => {
    if (provider === "ollama") refreshOllamaModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const save = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("ai", { provider, model, baseUrl, systemPrompt });
    await window.orun.settings.set("aiFallback", fallbackProvider === "none" ? null : { provider: fallbackProvider, model: fallbackModel });
    await window.orun.settings.set("runInBackground", runInBackground);
    await window.orun.app.setRunInBackground(runInBackground);
    await window.orun.settings.set("wakeWordEnabled", wakeWordEnabled);
    if (apiKey.trim()) {
      await window.orun.settings.setApiKey(provider, apiKey.trim());
      setApiKey("");
      setHasKey(true);
    }
  };

  const testConnection = async () => {
    if (!isElectron) return;
    setTestState("testing");
    await save();
    const result = await window.orun.ai.testConnection({ provider, model, baseUrl });
    if (result.ok) setTestState("ok");
    else { setTestState("error"); setTestError(result.error || "Unknown error"); }
  };

  const info = PROVIDER_INFO[provider];
  const suggestions = freeModels[provider] || [];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[460px] max-h-[88vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>
            AI Engine Settings
          </span>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        {!isElectron && (
          <div className="mb-4 px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", border: "1px solid rgba(192,0,24,0.2)" }}>
            Running in browser preview — settings only take effect inside the packaged Electron app.
          </div>
        )}

        {/* Provider selector — 6 providers, 3 per row */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {(Object.keys(PROVIDER_INFO) as OrunProvider[]).map((p) => {
            const pInfo = PROVIDER_INFO[p];
            const active = provider === p;
            return (
              <button
                key={p}
                onClick={() => { setProvider(p); setModel(pInfo.defaultModel); setTestState("idle"); }}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-colors"
                style={{ borderColor: active ? "#C00018" : "#1e1e1e", background: active ? "rgba(192,0,24,0.08)" : "#111111", color: active ? "#FF1A2D" : "#666" }}
              >
                {pInfo.kind === "local" ? <Cpu size={15} /> : <Cloud size={15} />}
                <span className="text-[9px] tracking-wider text-center" style={{ fontFamily: "'Sora', sans-serif" }}>{pInfo.label}</span>
              </button>
            );
          })}
        </div>
        {info.note && <p className="text-[10px] mb-4" style={{ color: "#555" }}>{info.note}</p>}
        {!info.note && <div className="mb-4" />}

        {/* Model */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>Model</label>
        {provider === "ollama" ? (
          <div className="flex items-center gap-2 mb-3">
            <select
              value={model} onChange={(e) => setModel(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
            >
              {!ollamaModels.includes(model) && <option value={model}>{model}</option>}
              {ollamaModels.map((m) => <option key={m} value={m}>{m}</option>)}
              {ollamaModels.length === 0 && <option value={model}>{model} (unable to list — is Ollama running?)</option>}
            </select>
            <button onClick={refreshOllamaModels} className="p-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#888" }} title="Refresh installed models">
              <RefreshCw size={14} className={loadingModels ? "animate-spin" : ""} />
            </button>
          </div>
        ) : (
          <>
            <input
              value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setModel(s)}
                    className="px-2 py-1 rounded-md text-[9px]"
                    style={{ background: model === s ? "rgba(192,0,24,0.15)" : "#111111", border: `1px solid ${model === s ? "#C00018" : "#1e1e1e"}`, color: model === s ? "#FF1A2D" : "#666", fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Local: base URL. Cloud: API key. */}
        {info.kind === "local" ? (
          <>
            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>Ollama URL</label>
            <input
              value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} onBlur={refreshOllamaModels}
              className="w-full mb-4 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
            />
            <p className="text-[10px] mb-4" style={{ color: "#444" }}>Requires Ollama running locally (ollama.com). No data leaves this machine.</p>
          </>
        ) : (
          <>
            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>
              API Key {hasKey && <span style={{ color: "#2ecc71" }}>(saved • encrypted)</span>}
            </label>
            <input
              type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "•••••••••••••••• (leave blank to keep)" : provider === "github" ? "github_pat_..." : "sk-..."}
              className="w-full mb-4 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0" }}
            />
            <p className="text-[10px] mb-4" style={{ color: "#444" }}>
              Stored encrypted on this machine via the OS keychain. Never sent anywhere except {info.label}'s official API.
            </p>
          </>
        )}

        {/* System prompt / persona */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>System prompt (Hampton's persona)</label>
        <textarea
          value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
          className="w-full mb-4 px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0", fontFamily: "'Inter', sans-serif" }}
        />

        {/* Fallback provider */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>
          Fallback provider (used automatically if the main one fails)
        </label>
        <div className="flex items-center gap-2 mb-4">
          <select
            value={fallbackProvider}
            onChange={(e) => setFallbackProvider(e.target.value as OrunProvider | "none")}
            className="px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa" }}
          >
            <option value="none">None</option>
            {(Object.keys(PROVIDER_INFO) as OrunProvider[]).filter((p) => p !== provider).map((p) => (
              <option key={p} value={p}>{PROVIDER_INFO[p].label}</option>
            ))}
          </select>
          {fallbackProvider !== "none" && (
            <input
              value={fallbackModel} onChange={(e) => setFallbackModel(e.target.value)} placeholder="model name"
              className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#aaa" }}
            />
          )}
        </div>

        {/* Run in background */}
        <label className="flex items-center justify-between mb-2 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>Keep running in the background</span>
          <input type="checkbox" checked={runInBackground} onChange={(e) => setRunInBackground(e.target.checked)} className="accent-[#C00018]" />
        </label>

        {/* Wake word */}
        <label className="flex items-center justify-between mb-1 px-3 py-2.5 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
          <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>Say "Hampton" or "Orun" to talk <span style={{ color: "#C00018" }}>(beta)</span></span>
          <input type="checkbox" checked={wakeWordEnabled} onChange={(e) => setWakeWordEnabled(e.target.checked)} className="accent-[#C00018]" />
        </label>
        {wakeWordEnabled ? (
          <p className="text-[9px] mb-3" style={{ color: "#666" }}>
            Uses the browser's built-in speech recognition — audio is sent to Google's servers to transcribe, not processed locally.
          </p>
        ) : <div className="mb-4" />}

        {/* WhatsApp */}
        <button
          onClick={onOpenWhatsApp}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-4 rounded-lg text-xs"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#888" }}
        >
          <MessageCircle size={13} style={{ color: "#25D366" }} /> WhatsApp connector
        </button>

        {/* Updates */}
        <button
          onClick={checkForUpdates}
          disabled={checkingUpdate}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-2 rounded-lg text-xs"
          style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#888" }}
        >
          {checkingUpdate && <Loader2 size={13} className="animate-spin" />}
          Check for updates
        </button>
        {updateStatus?.status === "not-available" && <p className="text-[10px] mb-3" style={{ color: "#2ecc71" }}>You're on the latest version.</p>}
        {updateStatus?.status === "available" && <p className="text-[10px] mb-3" style={{ color: "#FF1A2D" }}>Update {updateStatus.version} available — downloading…</p>}
        {updateStatus?.status === "downloading" && <p className="text-[10px] mb-3" style={{ color: "#FF1A2D" }}>Downloading update… {updateStatus.percent ?? 0}%</p>}
        {updateStatus?.status === "downloaded" && (
          <button onClick={() => window.orun.app.installUpdate()} className="w-full py-2 mb-3 rounded-lg text-xs" style={{ background: "#C00018", color: "#fff" }}>
            Restart & install update {updateStatus.version}
          </button>
        )}
        {updateStatus?.status === "error" && <p className="text-[10px] mb-3" style={{ color: "#C00018" }}>{updateStatus.message || "Update check failed."}</p>}

        {/* Per-agent models + usage links */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={onOpenAgentModels}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs"
            style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#888" }}
          >
            <Users size={13} /> Per-agent models
          </button>
          <button
            onClick={onOpenUsage}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs"
            style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#888" }}
          >
            <Activity size={13} /> Usage today
          </button>
        </div>

        {/* Test + Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={testConnection} disabled={testState === "testing"}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs"
            style={{ background: "#151515", border: "1px solid #232323", color: "#aaa" }}
          >
            {testState === "testing" && <Loader2 size={13} className="animate-spin" />}
            {testState === "ok" && <CheckCircle2 size={13} style={{ color: "#2ecc71" }} />}
            {testState === "error" && <XCircle size={13} style={{ color: "#C00018" }} />}
            Test connection
          </button>
          <button onClick={async () => { await save(); onClose(); }} className="flex-1 py-2 rounded-lg text-xs" style={{ background: "#C00018", color: "#fff" }}>
            Save
          </button>
        </div>
        {testState === "error" && <p className="text-[10px] mt-2" style={{ color: "#C00018" }}>{testError}</p>}
      </motion.div>
    </motion.div>
  );
}

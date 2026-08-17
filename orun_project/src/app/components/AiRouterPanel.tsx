import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Server, Play, Square } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunRouterCombo, OrunRouterUsageEvent, OrunRouterHealth, OrunRouterHttpStatus } from "../../types/orun";

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama",
  kiro: "Kiro",
  "opencode-free": "OpenCode Free",
  "vertex-ai": "Vertex AI",
  gemini: "Gemini",
  anthropic: "Claude",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  groq: "Groq",
  cerebras: "Cerebras",
  mistral: "Mistral",
  "github-models": "GitHub Models",
  deepseek: "DeepSeek",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  "huggingface-inference": "HuggingFace",
  "nvidia-nim": "NVIDIA NIM",
};

const providerLabel = (id: string) => PROVIDER_LABELS[id] ?? id;

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

type ComboTestResult = {
  ok: boolean;
  providerId?: string;
  model?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  text?: string;
  error?: string;
};

export function AiRouterPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [health, setHealth] = useState<OrunRouterHealth | null>(null);
  const [combos, setCombos] = useState<OrunRouterCombo[]>([]);
  const [usage, setUsage] = useState<OrunRouterUsageEvent[]>([]);
  const [http, setHttp] = useState<OrunRouterHttpStatus>({ running: false });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ComboTestResult>>({});
  const [busyHttp, setBusyHttp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!isElectron || !window.orun.aiRouter) return;
    try {
      const [h, c, u, hs] = await Promise.all([
        window.orun.aiRouter.health(),
        window.orun.aiRouter.listCombos(),
        window.orun.aiRouter.usageRecent({ limit: 15 }),
        window.orun.aiRouter.httpStatus(),
      ]);
      setHealth(h);
      setCombos(c);
      setUsage(u);
      setHttp(hs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const testCombo = async (combo: OrunRouterCombo) => {
    if (!isElectron || !window.orun.aiRouter) return;
    setTestingId(combo.id);
    setTestResults((prev) => ({ ...prev, [combo.id]: { ok: false } }));
    try {
      const res = await window.orun.aiRouter.complete({
        comboId: combo.id,
        messages: [{ role: "user", content: "Responda apenas com: OK" }],
      });
      setTestResults((prev) => ({
        ...prev,
        [combo.id]: { ok: true, providerId: res.providerId, model: res.model, latencyMs: res.latencyMs, promptTokens: res.promptTokens, completionTokens: res.completionTokens, text: res.text },
      }));
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [combo.id]: { ok: false, error: e instanceof Error ? e.message : String(e) } }));
    } finally {
      setTestingId(null);
    }
  };

  const toggleHttp = async () => {
    if (!isElectron || !window.orun.aiRouter) return;
    setBusyHttp(true);
    try {
      if (http.running) {
        await window.orun.aiRouter.httpStop();
        setHttp({ running: false });
      } else {
        const s = await window.orun.aiRouter.httpStart();
        setHttp(s);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyHttp(false);
    }
  };

  if (!isElectron || !window.orun.aiRouter) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-[420px] rounded-2xl border p-6 text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
          initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterNotElectron")}</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 rounded-lg text-[10px]" style={{ background: "#C00018", color: "#fff" }}>
            {t("aiRouterBack")}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[560px] max-h-[85vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} style={{ color: "var(--muted-foreground)" }}><ArrowLeft size={15} /></button>
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {t("aiRouterTitle")}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
        </div>

        <p className="px-6 pt-4 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {t("aiRouterDescription")}
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-3 scrollbar-hide">
          {error && (
            <div className="px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(192,0,24,0.12)", border: "1px solid rgba(192,0,24,0.4)", color: "#FF1A2D" }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterStatusDb")}</div>
              <div className="mt-1 text-[10px] truncate" title={health?.db} style={{ color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                {health?.db ? health.db.split("\\").pop() : "—"}
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterStatusDefaultCombo")}</div>
              <div className="mt-1 text-[10px] truncate" style={{ color: "#FF1A2D", fontFamily: "'JetBrains Mono', monospace" }}>
                {health?.defaultComboId || "—"}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                {t("aiRouterCombos")}
              </span>
              <button onClick={loadAll} style={{ color: "var(--muted-foreground)" }} title="Refresh"><RefreshCw size={12} /></button>
            </div>
            <div className="mt-2 space-y-2">
              {combos.length === 0 && (
                <div className="text-[10px] py-3 text-center" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterEmptyCombos")}</div>
              )}
              {combos.map((combo) => {
                const result = testResults[combo.id];
                return (
                  <div key={combo.id} className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{combo.name}</span>
                          {combo.isSystemDefault && (
                            <span className="px-1 py-0.5 rounded text-[7px] tracking-wider" style={{ background: "rgba(192,0,24,0.15)", color: "#FF1A2D", border: "1px solid rgba(192,0,24,0.4)" }}>
                              {t("aiRouterSystemDefault")}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {combo.steps.map((step, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                              {i + 1}. {providerLabel(step.providerId)} · {step.model}
                            </span>
                          ))}
                        </div>
                        <div className="mt-0.5 text-[8px]" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{combo.id}</div>
                      </div>
                      <button
                        onClick={() => testCombo(combo)}
                        disabled={testingId === combo.id}
                        className="px-2.5 py-1.5 rounded-md text-[9px] flex-shrink-0 transition-colors disabled:opacity-40"
                        style={{ background: testingId === combo.id ? "var(--secondary)" : "rgba(192,0,24,0.15)", border: `1px solid ${testingId === combo.id ? "var(--border)" : "rgba(192,0,24,0.4)"}`, color: testingId === combo.id ? "var(--muted-foreground)" : "#FF1A2D" }}
                      >
                        {testingId === combo.id ? t("aiRouterTesting") : t("aiRouterTest")}
                      </button>
                    </div>
                    {result && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                        {result.ok ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "#2ecc71" }}>
                              <CheckCircle2 size={10} />
                              {t("aiRouterTestResponded")}: <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{providerLabel(result.providerId || "")} · {result.model}</span>
                              <span className="ml-auto" style={{ color: "var(--muted-foreground)" }}>
                                {result.latencyMs}ms · {(result.promptTokens || 0) + (result.completionTokens || 0)} {t("aiRouterTestTokens")}
                              </span>
                            </div>
                            {result.text && (
                              <div className="mt-1 text-[9px] truncate" title={result.text} style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                                “{result.text}”
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "#FF1A2D" }}>
                            <XCircle size={10} />
                            {t("aiRouterTestFailed")}: <span className="truncate" title={result.error}>{result.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              {t("aiRouterUsage")}
            </span>
            <div className="mt-2 space-y-1">
              {usage.length === 0 && (
                <div className="text-[10px] py-2 text-center" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterEmptyUsage")}</div>
              )}
              {usage.map((ev, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <span style={{ color: ev.success ? "#2ecc71" : "#FF1A2D", flexShrink: 0 }}>
                    {ev.success ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  </span>
                  <span className="text-[9px] flex-shrink-0" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{fmtTime(ev.timestamp)}</span>
                  <span className="text-[9px] truncate" style={{ color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} title={ev.comboId}>
                    {providerLabel(ev.providerId)} · {ev.model}
                  </span>
                  <span className="ml-auto text-[9px] flex-shrink-0" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {ev.promptTokens + ev.completionTokens} {t("aiRouterTestTokens")} · {ev.latencyMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Server size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span className="text-[10px]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{t("aiRouterHttp")}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[8px] tracking-wider"
                style={{ background: http.running ? "rgba(46,204,113,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${http.running ? "rgba(46,204,113,0.4)" : "var(--border)"}`, color: http.running ? "#2ecc71" : "var(--muted-foreground)" }}
              >
                {http.running ? t("aiRouterHttpRunning") : t("aiRouterHttpStopped")}
              </span>
              <button
                onClick={toggleHttp}
                disabled={busyHttp}
                className="ml-auto px-2.5 py-1 rounded-md text-[9px] flex items-center gap-1 disabled:opacity-40"
                style={{ background: http.running ? "rgba(192,0,24,0.15)" : "rgba(46,204,113,0.12)", border: `1px solid ${http.running ? "rgba(192,0,24,0.4)" : "rgba(46,204,113,0.4)"}`, color: http.running ? "#FF1A2D" : "#2ecc71" }}
              >
                {http.running ? <Square size={9} /> : <Play size={9} />}
                {http.running ? t("aiRouterHttpStop") : t("aiRouterHttpStart")}
              </button>
            </div>
            {http.running && http.url && (
              <div className="mt-1.5 text-[9px] truncate" style={{ color: "#2ecc71", fontFamily: "'JetBrains Mono', monospace" }}>{http.url}</div>
            )}
            <div className="mt-1.5 text-[8px]" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterHttpHint")}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

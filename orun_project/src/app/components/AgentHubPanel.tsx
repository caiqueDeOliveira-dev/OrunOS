import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  X, Bot, CornerDownRight, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowRight, User,
} from "lucide-react";

interface AgentSchema {
  id: string;
  name: string;
  personaName?: string;
  persona: string;
  tools: string[] | null;
  memoryScope: string;
  permissions: string[] | null;
}

interface DelegationStep {
  step: "route" | "execute" | "escalate";
  agent?: string | null;
  reason?: string;
  ok?: boolean;
  error?: string | null;
}

interface DelegationResult {
  ok: boolean;
  agent?: string | null;
  reason?: string;
  result?: string;
  error?: string;
  escalated?: boolean;
  steps: DelegationStep[];
}

const hubApi = (window as unknown as { orun?: { agentHub?: {
  list: () => Promise<AgentSchema[]>;
  delegate: (request: string, context?: string, agent?: string | null) => Promise<DelegationResult>;
} } }).orun?.agentHub;

const STEP_LABEL: Record<string, string> = { route: "Central decide", execute: "Especialista executa", escalate: "Central assume" };

export function AgentHubPanel({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState<AgentSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState("");
  const [context, setContext] = useState("");
  const [agentHint, setAgentHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DelegationResult | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!hubApi?.list) return;
    setLoading(true);
    try {
      setAgents(await hubApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doDelegate = async () => {
    if (!hubApi?.delegate || !request.trim()) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const res = await hubApi.delegate(request.trim(), context.trim(), agentHint || null);
      if (!res.ok) setError(res.error || "falha na delegação");
      else setResult(res);
    } finally {
      setBusy(false);
    }
  };

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
        className="w-[620px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <Bot size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Agent Hub</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
              {agents.length} agentes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Recarregar" style={{ color: "var(--muted-foreground)" }}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* ── Delegação serial ───────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              <CornerDownRight size={11} /> Delegação serial (Central → Especialista)
            </div>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="O que você precisa? (ex.: me organize as finanças do mês, escreva um script para..."
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
              rows={2}
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
            />
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Contexto adicional (opcional)..."
              className="w-full px-3 py-2 rounded-lg text-[11px] outline-none"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
            />
            <div className="flex gap-2">
              <select
                value={agentHint}
                onChange={(e) => setAgentHint(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
                title="Forçar especialista (opcional)"
              >
                <option value="">Central decide automaticamente</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.id}</option>)}
              </select>
              <button
                onClick={doDelegate}
                disabled={busy || !request.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-medium transition-opacity disabled:opacity-40"
                style={{ background: "rgba(192,0,24,0.9)", color: "#fff" }}
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                Delegar
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</div>
          )}

          {result && (
            <div className="px-3 py-3 rounded-lg space-y-2" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>
                {result.ok ? <CheckCircle2 size={12} style={{ color: "#22c55e" }} /> : <XCircle size={12} style={{ color: "#ef4444" }} />}
                Fluxo de delegação
                {result.escalated && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>escalado</span>
                )}
              </div>
              {result.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-[9px] px-1 py-0.5 rounded mt-px" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{i + 1}</span>
                  <div>
                    <span style={{ color: "var(--foreground)", fontWeight: 500 }}>
                      {STEP_LABEL[s.step] || s.step}
                    </span>
                    {s.agent && <span> → <span style={{ color: "#C00018" }}>{s.agent}</span></span>}
                    {s.reason && <div style={{ color: "var(--muted-foreground)" }}>{s.reason}</div>}
                    {s.ok === false && <div style={{ color: "#ef4444" }}>{s.error}</div>}
                  </div>
                </div>
              ))}
              {result.result && (
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--foreground)", fontFamily: "'Inter', sans-serif", whiteSpace: "pre-wrap" }}>
                  {result.result}
                </div>
              )}
            </div>
          )}

          {/* ── Schema dos agentes ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <User size={11} /> Schema único de agente (persona, ferramentas, memória, permissões)
              </div>
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{agents.length} instâncias</span>
            </div>
            {loading && agents.length === 0 ? (
              <div className="py-6 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {agents.map((a) => (
                  <div key={a.id} className="px-3 py-2.5 rounded-lg cursor-pointer transition-colors" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium truncate" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>
                        {a.personaName || a.id}
                      </span>
                      <span className="text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{a.id}</span>
                      <span className="ml-auto text-[9px] px-1 py-0.5 rounded flex-shrink-0" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>
                        {a.tools ? `${a.tools.length} tools` : "all tools"}
                      </span>
                    </div>
                    <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                      memória: {a.memoryScope || "global"} · perm: {a.permissions ? a.permissions.length : "todas"}
                    </div>
                    {expanded === a.id && (
                      <div className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}>
                        {a.persona.slice(0, 220)}{a.persona.length > 220 ? "..." : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

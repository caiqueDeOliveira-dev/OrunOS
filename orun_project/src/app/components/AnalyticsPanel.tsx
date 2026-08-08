import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  X, BarChart3, RefreshCw, Cpu, MemoryStick, HardDrive, Activity, Loader2, Zap,
} from "lucide-react";

interface AnalyticsSystem {
  cpu: number;
  memory: number;
  disk: { freeGB: number; totalGB: number; usedPercent: number };
  uptime: number;
  platform: string;
  arch: string;
  hostname: string;
}

interface AnalyticsSummary {
  system: AnalyticsSystem;
  counts: {
    conversations: number; messages: number; financeLog: number; healthLog: number;
    marketingLog: number; agenda: number; usageEvents: number;
  };
  usage: { today: Record<string, number>; total: Record<string, number> };
  ai: { requests: number; tokensIn: number; tokensOut: number };
  telemetry: { counters: Record<string, number>; metrics: Record<string, unknown>; recentTraces: number };
  engines: {
    planner: { total: number; byStatus: Record<string, number>; goals: number } | null;
    memory: { total: number; byScope: Record<string, number> } | null;
    knowledge: { total: number; byKind: Record<string, number> } | null;
    skills: { total: number; enabled: number } | null;
  };
}

const analyticsApi = (window as unknown as { orun?: { analytics?: {
  summary: () => Promise<AnalyticsSummary>;
} } }).orun?.analytics;

function Gauge({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
        {icon} {label}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: value > 85 ? "#ef4444" : value > 60 ? "#f59e0b" : "#22c55e" }} />
        </div>
        <span className="text-[12px] font-medium tabular-nums" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{Math.round(value)}%</span>
      </div>
    </div>
  );
}

function fmtDuration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const TYPE_LABEL: Record<string, string> = {
  "ai:chat": "Chat IA",
  "ai:chat-stream": "Chat IA (stream)",
  "planner:plan": "Planner: plano",
  "planner:plan_failed": "Planner: plano falhou",
  "planner:task_done": "Planner: tarefa",
  "planner:task_failed": "Planner: falha",
  "planner:run": "Planner: run",
  "agent_hub:delegate": "Delegação",
  "agent_hub:escalate": "Escalação",
  "skills:install": "Skill instalada",
  "knowledge:save": "Doc salvo",
};

export function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!analyticsApi?.summary) return;
    setLoading(true);
    try {
      setSummary(await analyticsApi.summary());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = summary;
  const usageTypes = s ? Object.keys({ ...s.usage.today, ...s.usage.total }) : [];

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
        className="w-[640px] max-h-[88vh] overflow-y-auto rounded-2xl border scrollbar-hide"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <BarChart3 size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Analytics</span>
            {s && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                {s.system.hostname} · {s.system.platform}/{s.system.arch}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} title="Recarregar" style={{ color: "var(--muted-foreground)" }}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
        </div>

        {loading && !s ? (
          <div className="py-10 flex items-center justify-center gap-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            <Loader2 size={14} className="animate-spin" /> Coletando métricas...
          </div>
        ) : s ? (
          <div className="px-6 py-4 space-y-5">
            {/* ── Sistema ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <Activity size={11} /> Sistema · uptime {fmtDuration(s.system.uptime)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Gauge label="CPU" value={s.system.cpu} icon={<Cpu size={10} />} />
                <Gauge label="RAM" value={s.system.memory} icon={<MemoryStick size={10} />} />
                <Gauge label="Disco" value={s.system.disk.usedPercent} icon={<HardDrive size={10} />} />
              </div>
              {s.system.disk.totalGB > 0 && (
                <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {s.system.disk.freeGB}GB livres de {s.system.disk.totalGB}GB
                </div>
              )}
            </div>

            {/* ── Uso de IA ───────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <Zap size={11} /> Uso de IA (agregado)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="px-3 py-2 rounded-lg text-center" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{fmtCount(s.ai.requests)}</div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>requests</div>
                </div>
                <div className="px-3 py-2 rounded-lg text-center" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{fmtCount(s.ai.tokensIn)}</div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>tokens in</div>
                </div>
                <div className="px-3 py-2 rounded-lg text-center" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{fmtCount(s.ai.tokensOut)}</div>
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>tokens out</div>
                </div>
              </div>
            </div>

            {/* ── Eventos de uso ──────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  <BarChart3 size={11} /> Eventos hoje / total
                </div>
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{s.counts.usageEvents} registrados</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {usageTypes.length === 0 && (
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Sem eventos ainda.</span>
                )}
                {usageTypes.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                    {TYPE_LABEL[t] || t}
                    <span className="ml-1.5 tabular-nums" style={{ color: "#C00018", fontWeight: 600 }}>{s.usage.today[t] || 0}</span>
                    <span className="ml-1 text-[9px] tabular-nums" style={{ color: "var(--muted-foreground)" }}>/ {s.usage.total[t] || 0}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* ── Registros de domínio ────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <HardDrive size={11} /> Registros
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Conversas", value: s.counts.conversations },
                  { label: "Mensagens", value: s.counts.messages },
                  { label: "Finanças", value: s.counts.financeLog },
                  { label: "Saúde", value: s.counts.healthLog },
                  { label: "Marketing", value: s.counts.marketingLog },
                  { label: "Agenda", value: s.counts.agenda },
                  { label: "Eventos", value: s.counts.usageEvents },
                ].map((c) => (
                  <div key={c.label} className="px-3 py-2 rounded-lg text-center" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{c.value}</div>
                    <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Engines ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <Activity size={11} /> Engines
              </div>
              <div className="grid grid-cols-2 gap-2">
                {s.engines.planner && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-medium mb-1" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>Planner</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      {s.engines.planner.total} tarefas · {s.engines.planner.goals} objetivos
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(s.engines.planner.byStatus).map(([k, v]) => (
                          <span key={k} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--border)", color: "var(--muted-foreground)" }}>{k}: {v}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {s.engines.memory && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-medium mb-1" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>Memória</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{s.engines.memory.total} memórias</div>
                  </div>
                )}
                {s.engines.knowledge && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-medium mb-1" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>Knowledge</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{s.engines.knowledge.total} docs</div>
                  </div>
                )}
                {s.engines.skills && (
                  <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-medium mb-1" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>Skills</div>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{s.engines.skills.enabled}/{s.engines.skills.total} ativas</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Telemetria ──────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                <Activity size={11} /> Telemetria (sessão) · {s.telemetry.recentTraces} traces
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(s.telemetry.counters).slice(0, 12).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                    {k}
                    <span className="ml-1.5 tabular-nums" style={{ color: "#C00018", fontWeight: 600 }}>{v as number}</span>
                  </span>
                ))}
                {Object.keys(s.telemetry.counters).length === 0 && (
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Sem contadores nesta sessão.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Não foi possível carregar as métricas.</div>
        )}
      </motion.div>
    </motion.div>
  );
}

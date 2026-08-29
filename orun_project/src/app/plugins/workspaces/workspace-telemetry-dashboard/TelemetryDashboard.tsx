// workspace-telemetry-dashboard / TelemetryDashboard.tsx
// Observability dashboard — agent health, provider status, MCP success rates, latency metrics.

import { useState, useEffect, useCallback } from "react";
import {
  Activity, RefreshCw, Cpu, CheckCircle2, XCircle, Server, Zap,
  Clock, BarChart3, type LucideIcon,
} from "lucide-react";
import { P, PremiumRoot, ScrollArea, Card, StatCard, SectionHeader, Badge } from "../premium";
import type { WorkspaceProps } from "../../types";

// ── Types ──────────────────────────────────────────────────────────────

interface TelemetrySummary {
  counters: Record<string, number>;
  metrics: Record<string, { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } | null>;
  recentTraces: number;
}

interface ProviderHealth {
  status: string;
  latencyMs: number;
  lastCheck: string | null;
  error: string | null;
  uptime5m: number;
}

interface AgentHealthEntry {
  agentId: string;
  persona?: string;
  invoked: number;
  errors: number;
  lastInvoked?: string;
  avgLatencyMs?: number;
  toolsUsed?: string[];
}

interface McpEntry {
  name: string;
  successRate: number;
  totalCalls: number;
  failedCalls: number;
}

// ── Derived data helpers ───────────────────────────────────────────────

const KNOWN_COUNTERS = [
  { key: "ai:chat:success", label: "Chat OK" },
  { key: "ai:chat:error", label: "Chat Erro" },
  { key: "ai:chat-stream:success", label: "Stream OK" },
  { key: "ai:chat-stream:error", label: "Stream Erro" },
] as const;

const KNOWN_METRICS = [
  { key: "ai:chat", label: "Chat Latencia" },
  { key: "ai:chat-stream", label: "Stream Latencia" },
] as const;

const AGENT_PREFIX = "agent:";
const KNOWN_AGENTS = [
  "hampton", "developer", "designer", "creator", "health", "finance",
  "teacher", "marketing", "automation", "automotive", "system", "juridico",
  "assistenteTecnico", "suporte", "personalAssistant", "homeIa", "cyberSecurity",
  "carreiras",
];

function extractAgentHealth(counters: Record<string, number>): AgentHealthEntry[] {
  return KNOWN_AGENTS.map((id) => {
    const invoked = counters[`${AGENT_PREFIX}${id}:invoked`] ?? 0;
    const errors = counters[`${AGENT_PREFIX}${id}:error`] ?? 0;
    return { agentId: id, invoked, errors };
  }).filter((a) => a.invoked > 0 || a.errors > 0);
}

function extractMcpData(counters: Record<string, number>): McpEntry[] {
  const mcpPrefix = "mcp:";
  const mcpKeys = Object.keys(counters).filter((k) => k.startsWith(mcpPrefix));
  const byServer = new Map<string, McpEntry>();
  for (const key of mcpKeys) {
    const rest = key.slice(mcpPrefix.length);
    const sepIdx = rest.indexOf(":");
    if (sepIdx === -1) continue;
    const server = rest.slice(0, sepIdx);
    const metric = rest.slice(sepIdx + 1);
    if (!byServer.has(server)) byServer.set(server, { name: server, successRate: 0, totalCalls: 0, failedCalls: 0 });
    const entry = byServer.get(server)!;
    if (metric === "success") entry.totalCalls += counters[key];
    else if (metric === "error" || metric === "failed") entry.failedCalls += counters[key];
  }
  for (const entry of byServer.values()) {
    entry.successRate = entry.totalCalls > 0
      ? Math.round(((entry.totalCalls - entry.failedCalls) / entry.totalCalls) * 100)
      : 0;
  }
  return [...byServer.values()];
}

function successRateColor(rate: number): string {
  if (rate >= 95) return P.success;
  if (rate >= 80) return P.alert;
  return P.error;
}

function providerStatusBadge(status: string): "ok" | "err" | "warn" | "neutral" {
  if (status === "up") return "ok";
  if (status === "degraded") return "warn";
  return "err";
}

function formatMs(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Sub-components ─────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentHealthEntry }) {
  const hasErrors = agent.errors > 0;
  return (
    <StatCard
      icon={hasErrors ? XCircle : CheckCircle2}
      label={agent.agentId}
      value={`${agent.invoked} chamada${agent.invoked !== 1 ? "s" : ""}`}
      status={hasErrors ? `${agent.errors} erro${agent.errors !== 1 ? "s" : ""}` : "OK"}
      tone={hasErrors ? "err" : "ok"}
    />
  );
}

function McpCard({ mcp }: { mcp: McpEntry }) {
  const color = successRateColor(mcp.successRate);
  return (
    <Card className="flex items-center gap-4 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: P.card2, color: P.primary }}>
        <Server size={16} strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold truncate" style={{ color: P.text }}>{mcp.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: P.card2 }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${mcp.successRate}%`, background: color }} />
          </div>
          <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{mcp.successRate}%</span>
        </div>
        <p className="text-[9px] mt-0.5" style={{ color: P.dim }}>
          {mcp.totalCalls} chamadas · {mcp.failedCalls} falha{mcp.failedCalls !== 1 ? "s" : ""}
        </p>
      </div>
    </Card>
  );
}

function MetricBar({ label, stats }: { label: string; stats: NonNullable<TelemetrySummary["metrics"][string]> }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: P.dim }}>{label}</p>
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Media", v: formatMs(stats.avg) },
          { l: "P50", v: formatMs(stats.p50) },
          { l: "P95", v: formatMs(stats.p95) },
          { l: "P99", v: formatMs(stats.p99) },
        ].map((item) => (
          <div key={item.l} className="text-center">
            <p className="text-[13px] font-semibold tabular-nums" style={{ color: P.text }}>{item.v}</p>
            <p className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: P.dim }}>{item.l}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function TelemetryDashboard(props: WorkspaceProps) {
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [health, setHealth] = useState<Record<string, ProviderHealth> | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [telemetryResult, healthResult] = await Promise.allSettled([
        window.orun?.ai?.telemetry?.(),
        window.orun?.ai?.healthCheck?.(),
      ]);
      if (telemetryResult.status === "fulfilled" && telemetryResult.value) {
        setSummary(telemetryResult.value);
      }
      if (healthResult.status === "fulfilled" && healthResult.value) {
        setHealth(healthResult.value);
      }
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const agentHealth = summary ? extractAgentHealth(summary.counters) : [];
  const mcpData = summary ? extractMcpData(summary.counters) : [];
  const providers = health ? Object.entries(health) : [];
  const activeMetrics = summary
    ? KNOWN_METRICS.filter((m) => summary.metrics[m.key])
    : [];
  const totalCounters = summary
    ? Object.values(summary.counters).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <PremiumRoot>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(195,0,47,0.14)", color: P.primary }}
          >
            <Activity size={18} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold truncate" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>
              Telemetry Dashboard
            </h2>
            <p className="text-[10px]" style={{ color: P.sub }}>
              Observabilidade dos agentes e MCPs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastRefresh && (
            <span className="text-[9px] tabular-nums" style={{ color: P.dim }}>
              {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-medium tracking-wider uppercase transition-all hover:scale-[1.03] hover:brightness-110"
            style={{ background: P.primary, color: "#fff", opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <ScrollArea>
        <div className="px-6 pb-6 space-y-6">

          {/* ── Summary row ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <StatCard
              icon={Activity}
              label="Total contadores"
              value={String(totalCounters)}
              status={loading ? "..." : "ok"}
              tone="ok"
            />
            <StatCard
              icon={BarChart3}
              label="Traces recentes"
              value={String(summary?.recentTraces ?? 0)}
              tone="neutral"
            />
            <StatCard
              icon={Server}
              label="Providers"
              value={`${providers.filter(([, h]) => h.status === "up").length}/${providers.length}`}
              status={providers.every(([, h]) => h.status === "up") ? "Todos OK" : "Atencao"}
              tone={providers.every(([, h]) => h.status === "up") ? "ok" : "warn"}
            />
            <StatCard
              icon={Cpu}
              label="Agentes ativos"
              value={String(agentHealth.length)}
              tone={agentHealth.some((a) => a.errors > 0) ? "warn" : "ok"}
            />
          </div>

          {/* ── Provider health ─────────────────────────────────────── */}
          {providers.length > 0 && (
            <div>
              <SectionHeader icon={Server} title="Providers de IA" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {providers.map(([name, info]) => (
                  <Card key={name} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${P.primary}1a`, color: P.primary }}
                    >
                      {info.status === "up"
                        ? <CheckCircle2 size={14} color={P.success} />
                        : <XCircle size={14} color={P.error} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold capitalize" style={{ color: P.text }}>{name}</span>
                        <Badge tone={providerStatusBadge(info.status)}>{info.status}</Badge>
                      </div>
                      <p className="text-[9px] mt-0.5" style={{ color: P.dim }}>
                        {formatMs(info.latencyMs)} latencia · {Math.round(info.uptime5m * 100)}% uptime 5min
                      </p>
                      {info.error && (
                        <p className="text-[9px] mt-0.5 truncate" style={{ color: P.error }}>{info.error}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Agent health grid ───────────────────────────────────── */}
          <div>
            <SectionHeader icon={Cpu} title="Saude dos Agentes" right={
              <Badge tone={agentHealth.length > 0 ? "ok" : "neutral"}>
                {agentHealth.length} agente{agentHealth.length !== 1 ? "s" : ""}
              </Badge>
            } />
            {agentHealth.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {agentHealth.map((agent) => <AgentCard key={agent.agentId} agent={agent} />)}
              </div>
            ) : (
              <Card className="p-8 flex flex-col items-center gap-2" style={{ borderStyle: "dashed" }}>
                <Cpu size={28} style={{ color: P.dim, opacity: 0.5 }} />
                <p className="text-[10px]" style={{ color: P.sub }}>
                  Nenhuma atividade de agente registrada ainda
                </p>
                <p className="text-[9px]" style={{ color: P.dim }}>
                  Use o chat para gerar telemetria
                </p>
              </Card>
            )}
          </div>

          {/* ── MCP success rates ───────────────────────────────────── */}
          <div>
            <SectionHeader icon={Server} title="Sucesso dos MCPs" right={
              <Badge tone={mcpData.length > 0 ? "info" : "neutral"}>
                {mcpData.length} servidor{mcpData.length !== 1 ? "es" : ""}
              </Badge>
            } />
            {mcpData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mcpData.map((mcp) => <McpCard key={mcp.name} mcp={mcp} />)}
              </div>
            ) : (
              <Card className="p-8 flex flex-col items-center gap-2" style={{ borderStyle: "dashed" }}>
                <Server size={28} style={{ color: P.dim, opacity: 0.5 }} />
                <p className="text-[10px]" style={{ color: P.sub }}>
                  Nenhum dado de MCP registrado ainda
                </p>
                <p className="text-[9px]" style={{ color: P.dim }}>
                  Ative MCPs em Configuracoes para coletar metricas
                </p>
              </Card>
            )}
          </div>

          {/* ── Latency metrics ─────────────────────────────────────── */}
          {activeMetrics.length > 0 && (
            <div>
              <SectionHeader icon={Clock} title="Metricas de Latencia" />
              <div className="grid gap-2">
                {activeMetrics.map((m) => {
                  const stats = summary!.metrics[m.key];
                  if (!stats) return null;
                  return <MetricBar key={m.key} label={m.label} stats={stats} />;
                })}
              </div>
            </div>
          )}

          {/* ── Raw counters table ──────────────────────────────────── */}
          {summary && Object.keys(summary.counters).length > 0 && (
            <div>
              <SectionHeader icon={Zap} title="Contadores Brutos" />
              <Card className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                  {Object.entries(summary.counters)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 24)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-2 py-1" style={{ borderBottom: `1px solid ${P.border}` }}>
                        <span className="text-[9px] truncate" style={{ color: P.sub }}>{key}</span>
                        <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: P.text }}>{value}</span>
                      </div>
                    ))}
                </div>
                {Object.keys(summary.counters).length > 24 && (
                  <p className="text-[9px] mt-2 text-center" style={{ color: P.dim }}>
                    +{Object.keys(summary.counters).length - 24} contadores nao exibidos
                  </p>
                )}
              </Card>
            </div>
          )}

        </div>
      </ScrollArea>
    </PremiumRoot>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

interface AuditEntry {
  timestamp: number;
  agentId: string;
  action: string;
  details: string;
  result: string;
}

interface TelemetrySummary {
  counters: Record<string, number>;
  metrics: Record<string, { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number }>;
  recentTraces: Array<{ name: string; durationMs: number; ts: number }>;
}

type Tab = "live" | "audit" | "telemetry" | "usage" | "webhooks";

const ACTION_ICONS: Record<string, string> = {
  write_file: "📝",
  execute_command: "💻",
  network_request: "🌐",
  api_key_access: "🔑",
  read_file: "📄",
  web_search: "🔍",
};

export function ActivityLog({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("live");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<Array<{ method: string; url: string; source: string; body: unknown; timestamp: number }>>([]);
  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; timestamp: number; source: string; action: string; details: string; type: "agent" | "system" | "event" }>>([]);
  const [loading, setLoading] = useState(true);

  // Real-time: subscribe to activity entries + Event Bus
  useEffect(() => {
    if (!isElectron) return;
    const unsubs: (() => void)[] = [];

    // Activity audit entries (push from main process)
    if (window.orun.activity?.onNewEntry) {
      const unsub = window.orun.activity.onNewEntry((entry) => {
        setLiveEvents((prev) => [{
          id: `audit-${entry.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: entry.timestamp,
          source: entry.agentId,
          action: entry.action,
          details: entry.details,
          type: "agent" as const,
        }, ...prev].slice(0, 300));
      });
      unsubs.push(unsub);
    }

    // Event Bus events (hub, shield, memory, planner)
    if (window.orun.eventBus?.subscribe) {
      const { unsubscribe } = window.orun.eventBus.subscribe(
        ["hub:**", "shield:**", "memory:**", "planner:**"],
        (event: { topic: string; data: Record<string, unknown> }) => {
          const source = event.topic.split(":")[0];
          const action = event.topic.split(":").slice(1).join(":");
          const details = typeof event.data?.title === "string" ? event.data.title
            : typeof event.data?.error === "string" ? event.data.error
            : typeof event.data?.targetAgent === "string" ? `→ ${event.data.targetAgent}`
            : typeof event.data?.agent === "string" ? event.data.agent
            : "";
          setLiveEvents((prev) => [{
            id: `bus-${event.topic}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            source,
            action,
            details,
            type: "event" as const,
          }, ...prev].slice(0, 300));
        }
      );
      unsubs.push(unsubscribe);
    }

    return () => unsubs.forEach((fn) => fn());
  }, []);

  const loadAudit = useCallback(async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const data = await window.orun.activity.list({ count: 100 });
      setEntries(data.reverse());
    } catch { setEntries([]); }
    setLoading(false);
  }, []);

  const loadTelemetry = useCallback(async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const data = await window.orun.activity.telemetry();
      setTelemetry(data);
    } catch { setTelemetry(null); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "audit") loadAudit();
    else if (tab === "telemetry") loadTelemetry();
  }, [tab, loadAudit, loadTelemetry]);

  useEffect(() => {
    if (!isElectron || !window.orun.webhook?.onEvent) return;
    const unsub = window.orun.webhook.onEvent((event) => {
      setWebhookEvents((prev) => [{ method: event.method, url: event.url, source: event.source, body: event.body, timestamp: event.timestamp }, ...prev].slice(0, 200));
    });
    return unsub;
  }, []);

  const handleClear = async () => {
    if (!isElectron) return;
    await window.orun.activity.clear();
    setEntries([]);
  };

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["live", "audit", "telemetry", "usage", "webhooks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase transition-all"
            style={{
              background: tab === t ? "rgba(192,0,24,0.1)" : "transparent",
              color: tab === t ? "#C00018" : "var(--muted-foreground)",
              border: tab === t ? "1px solid rgba(192,0,24,0.2)" : "1px solid transparent",
            }}
          >
            {t === "live" && "🔴 Ao Vivo"}
            {t === "audit" && "Atividades"}
            {t === "telemetry" && "Métricas"}
            {t === "usage" && "Uso"}
            {t === "webhooks" && "Webhooks"}
          </button>
        ))}
        {tab === "audit" && entries.length > 0 && (
          <button
            onClick={handleClear}
            className="ml-auto px-2 py-1 rounded text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Limpar
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-1 rounded text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Fechar"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "live" && (
          <LiveTab events={liveEvents} />
        )}
        {tab === "audit" && (
          <AuditTab entries={entries} loading={loading} />
        )}
        {tab === "telemetry" && (
          <TelemetryTab data={telemetry} loading={loading} />
        )}
        {tab === "usage" && (
          <UsageTab />
        )}
        {tab === "webhooks" && (
          <WebhooksTab events={webhookEvents} />
        )}
      </div>
    </motion.div>
  );
}

function AuditTab({ entries, loading }: { entries: AuditEntry[]; loading: boolean }) {
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries]);
  const agents = useMemo(() => [...new Set(entries.map((e) => e.agentId))].sort(), [entries]);

  const filtered = useMemo(() => {
    let list = entries;
    if (filterAction) list = list.filter((e) => e.action === filterAction);
    if (filterAgent) list = list.filter((e) => e.agentId === filterAgent);
    if (filterResult) list = list.filter((e) => e.result === filterResult);
    return list;
  }, [entries, filterAction, filterAgent, filterResult]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [filterAction, filterAgent, filterResult]);

  const exportCSV = () => {
    const header = "timestamp,agentId,action,details,result";
    const rows = filtered.map((e) =>
      `"${e.timestamp}","${e.agentId}","${e.action}","${e.details.replace(/"/g, '""')}","${e.result}"`
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atividades-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-[10px] tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-lg">📭</span>
        <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          Nenhuma atividade registrada
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg text-[9px]"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">Todas ações</option>
          {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg text-[9px]"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">Todos agentes</option>
          {agents.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="flex-1 min-w-[70px] px-2 py-1.5 rounded-lg text-[9px]"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">Todos resultados</option>
          <option value="allowed">Permitido</option>
          <option value="blocked">Bloqueado</option>
        </select>
        <button
          onClick={exportCSV}
          className="px-2 py-1.5 rounded-lg text-[9px]"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
          title="Exportar CSV"
        >
          CSV
        </button>
      </div>

      {/* Counter */}
      <div className="text-[9px] px-1" style={{ color: "var(--muted-foreground)" }}>
        {filtered.length} de {entries.length} entrada{(entries.length !== 1) ? "s" : ""}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {paged.map((entry, i) => (
          <div
            key={page * PAGE_SIZE + i}
            className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
            style={{ background: "var(--secondary)" }}
          >
            <span className="text-sm mt-0.5 shrink-0">
              {ACTION_ICONS[entry.action] || "⚡"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#C00018" }}>
                  {entry.action.replace(/_/g, " ")}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(192,0,24,0.08)", color: "var(--muted-foreground)" }}>
                  {entry.agentId}
                </span>
                <span
                  className="ml-auto text-[9px] shrink-0"
                  style={{ color: entry.result === "allowed" ? "#22c55e" : entry.result === "blocked" ? "#ef4444" : "var(--muted-foreground)" }}
                >
                  {entry.result}
                </span>
              </div>
              <div className="text-[10px] mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>
                {entry.details}
              </div>
              <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                {new Date(entry.timestamp).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 rounded text-[9px] disabled:opacity-30"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            Anterior
          </button>
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 rounded text-[9px] disabled:opacity-30"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}

function TelemetryTab({ data, loading }: { data: TelemetrySummary | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-[10px] tracking-widest" style={{ color: "var(--muted-foreground)" }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-lg">📊</span>
        <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          Nenhuma métrica disponível
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {/* Counters */}
      <div className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
        <div className="text-[10px] tracking-wider uppercase font-medium mb-2" style={{ color: "var(--foreground)" }}>
          Contadores
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(data.counters).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "var(--card)" }}>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{key}</span>
              <span className="text-[11px] font-bold" style={{ color: "#C00018" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent traces */}
      <div className="p-3 rounded-xl" style={{ background: "var(--secondary)" }}>
        <div className="text-[10px] tracking-wider uppercase font-medium mb-2" style={{ color: "var(--foreground)" }}>
          Traces Recentes
        </div>
        {data.recentTraces.length === 0 ? (
          <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Nenhum trace</div>
        ) : (
          <div className="space-y-1">
            {data.recentTraces.slice(-20).reverse().map((trace, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 rounded-lg" style={{ background: "var(--card)" }}>
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{trace.name}</span>
                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {trace.durationMs.toFixed(0)}ms
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WebhooksTab({ events }: { events: Array<{ method: string; url: string; source: string; body: unknown; timestamp: number }> }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const renderBody = (body: unknown) => {
    if (body == null) return null;
    if (typeof body === "string") return body;
    return JSON.stringify(body, null, 2) ?? "";
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-lg">🔌</span>
        <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          Nenhum webhook recebido
        </span>
        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          O servidor escuta em http://127.0.0.1:8082
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--muted-foreground)" }}>
          {events.length} evento{(events.length !== 1) ? "s" : ""}
        </span>
      </div>
      {events.map((ev, i) => (
        <div key={i} className="p-2.5 rounded-xl transition-colors" style={{ background: "var(--secondary)" }}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{
              background: ev.method === "POST" ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
              color: ev.method === "POST" ? "#22c55e" : "#3b82f6",
            }}>
              {ev.method}
            </span>
            <span className="text-[10px] truncate font-mono" style={{ color: "var(--muted-foreground)" }}>
              {ev.url}
            </span>
            <span className="ml-auto text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {new Date(ev.timestamp).toLocaleTimeString("pt-BR")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{ev.source}</span>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded"
              style={{ color: "#C00018" }}
            >
              {expanded === i ? "Recolher" : "Detalhes"}
            </button>
          </div>
          {expanded === i && ev.body != null && (
            <pre className="mt-2 p-2 rounded-lg text-[8px] font-mono overflow-x-auto" style={{ background: "var(--card)", color: "var(--muted-foreground)", maxHeight: 200 }}>
              {renderBody(ev.body)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function UsageTab() {
  const [range, setRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [data, setData] = useState<Array<{ provider: string; date: string; requests: number; tokens_in: number; tokens_out: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    setLoading(true);
    window.orun.activity.usageRange(range.start, range.end)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [range]);

  const providers = useMemo(() => {
    const map = new Map<string, { requests: number; tokens_in: number; tokens_out: number }>();
    for (const row of data) {
      const curr = map.get(row.provider) || { requests: 0, tokens_in: 0, tokens_out: 0 };
      curr.requests += row.requests;
      curr.tokens_in += row.tokens_in;
      curr.tokens_out += row.tokens_out;
      map.set(row.provider, curr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].requests - a[1].requests);
  }, [data]);

  const totals = useMemo(() => data.reduce(
    (acc, r) => ({ requests: acc.requests + r.requests, tokens_in: acc.tokens_in + r.tokens_in, tokens_out: acc.tokens_out + r.tokens_out }),
    { requests: 0, tokens_in: 0, tokens_out: 0 }
  ), [data]);

  return (
    <div className="p-3 space-y-3">
      {/* Date range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={range.start}
          onChange={(e) => setRange((prev) => ({ ...prev, start: e.target.value }))}
          className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>até</span>
        <input
          type="date"
          value={range.end}
          onChange={(e) => setRange((prev) => ({ ...prev, end: e.target.value }))}
          className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-[10px] tracking-widest" style={{ color: "var(--muted-foreground)" }}>Carregando...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <span className="text-lg">📈</span>
          <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Nenhum dado de uso no período
          </span>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl text-center" style={{ background: "var(--secondary)" }}>
              <div className="text-[18px] font-bold" style={{ color: "#C00018" }}>{totals.requests}</div>
              <div className="text-[9px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>Requisições</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "var(--secondary)" }}>
              <div className="text-[18px] font-bold" style={{ color: "#C00018" }}>{(totals.tokens_in / 1000).toFixed(0)}k</div>
              <div className="text-[9px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tokens In</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: "var(--secondary)" }}>
              <div className="text-[18px] font-bold" style={{ color: "#C00018" }}>{(totals.tokens_out / 1000).toFixed(0)}k</div>
              <div className="text-[9px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>Tokens Out</div>
            </div>
          </div>

          {/* Per-provider summary */}
          <div className="space-y-1.5">
            <div className="text-[10px] tracking-wider uppercase font-medium px-1" style={{ color: "var(--foreground)" }}>
              Por provedor
            </div>
            {providers.map(([provider, agg]) => (
              <div key={provider} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "var(--secondary)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{provider}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(192,0,24,0.08)", color: "var(--muted-foreground)" }}>
                    {agg.requests} req
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                  <span>{(agg.tokens_in / 1000).toFixed(0)}k in</span>
                  <span>{(agg.tokens_out / 1000).toFixed(0)}k out</span>
                </div>
              </div>
            ))}
          </div>

          {/* Daily breakdown */}
          <div className="space-y-1">
            <div className="text-[10px] tracking-wider uppercase font-medium px-1" style={{ color: "var(--foreground)" }}>
              Detalhamento diário
            </div>
            {data.map((row, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "var(--secondary)" }}>
                <div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{row.provider}</span>
                  <span className="text-[9px] ml-2" style={{ color: "var(--muted-foreground)" }}>{row.date}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                  <span>{row.requests} req</span>
                  <span>{(row.tokens_in / 1000).toFixed(0)}k in</span>
                  <span>{(row.tokens_out / 1000).toFixed(0)}k out</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LiveTab({ events }: { events: Array<{ id: string; timestamp: number; source: string; action: string; details: string; type: "agent" | "system" | "event" }> }) {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "agent": return "#C00018";
      case "event": return "#3B82F6";
      case "system": return "#F59E0B";
      default: return "var(--muted-foreground)";
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "agent": return "🤖";
      case "event": return "⚡";
      case "system": return "🔧";
      default: return "📌";
    }
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-lg">🔴</span>
        <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          Aguardando eventos ao vivo...
        </span>
        <span className="text-[9px]" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
          Agentes, Event Bus e sistema aparecerão aqui em tempo real
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-wider uppercase font-medium" style={{ color: "var(--foreground)" }}>
          Eventos ao vivo ({events.length})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>LIVE</span>
        </span>
      </div>
      {events.map((evt) => (
        <div
          key={evt.id}
          className="flex items-start gap-2 px-3 py-2 rounded-xl transition-all"
          style={{ background: "var(--secondary)" }}
        >
          <span className="text-xs mt-0.5 shrink-0">{typeIcon(evt.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium" style={{ color: typeColor(evt.type) }}>
                {evt.source}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${typeColor(evt.type)}15`, color: typeColor(evt.type) }}>
                {evt.action}
              </span>
            </div>
            {evt.details && (
              <div className="text-[9px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                {evt.details}
              </div>
            )}
          </div>
          <span className="text-[8px] shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
            {formatTime(evt.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

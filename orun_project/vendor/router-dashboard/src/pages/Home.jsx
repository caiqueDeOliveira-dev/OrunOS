import React, { useEffect, useState } from "react";
import { api, providerMeta } from "../lib/api";
import { Card, SectionTitle, Spinner, LoadingState, EmptyState, Dot } from "../components/ui";
import { IconArrowRight } from "../components/icons";

const STAGES = [
  { label: "Request", angle: 0 },
  { label: "Combo", angle: 60 },
  { label: "Route", angle: 120 },
  { label: "Translate", angle: 180 },
  { label: "Execute", angle: 240 },
  { label: "Response", angle: 300 },
];

export default function Home({ onNavigate }) {
  const [health, setHealth] = useState(null);
  const [usage, setUsage] = useState([]);
  const [providers, setProviders] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [h, combos, provs, usg] = await Promise.all([
          api.health(),
          api.listCombos(),
          api.listProviders().catch(() => []),
          api.listUsage({ limit: 10 }),
        ]);
        setHealth(h);
        setUsage(usg);
        setProviders(provs);
        const total = usg.reduce((s, e) => s + e.promptTokens + e.completionTokens, 0);
        setCounts({
          combos: combos.length,
          providers: provs.filter((p) => p.enabled).length,
          requests: usg.reduce((s) => s + 1, 0),
          tokens: total,
        });
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s === null ? 0 : (s + 1) % STAGES.length)), 1800);
    return () => clearInterval(id);
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative bg-orun-card border border-orun-border rounded-2xl overflow-hidden">
        <div className="noise-overlay absolute inset-0" />
        <div className="relative flex items-center gap-8 px-8 py-8">
          <Orbit stage={stage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-orun-accent animate-node-pulse" />
              <span className="text-2xs font-display font-semibold uppercase tracking-widest text-orun-muted">
                Automation Pipeline
              </span>
            </div>
            <h1 className="text-xl font-display font-semibold text-orun-text mb-2 tracking-tight">Orun Router</h1>
            <p className="text-sm text-orun-textSecondary leading-relaxed mb-5 max-w-md">
              Proxy de IA multi-provider com fallback automatico, circuit breaker, traducao de formato e compressao
              de tokens.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Combos", value: counts?.combos ?? 0, color: "text-orun-text" },
                { label: "Providers", value: counts?.providers ?? 0, color: "text-orun-success" },
                { label: "Requests", value: counts?.requests ?? 0, color: "text-orun-info" },
                { label: "Tokens", value: (counts?.tokens ?? 0).toLocaleString(), color: "text-orun-warning" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xs text-orun-muted font-display uppercase tracking-wider">{s.label}</div>
                  <div className={`text-lg font-bold mt-0.5 font-mono ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {usage.length === 0 && (
        <Card glow>
          <SectionTitle>Getting Started</SectionTitle>
          <ol className="space-y-1.5">
            {[
              { step: "1", text: "Configure your API key in Settings", page: "settings" },
              { step: "2", text: "Create a provider with your API key", page: "providers" },
              { step: "3", text: "Test a combo in the Chat page", page: "chat" },
              { step: "4", text: "Connect your tools using the CLI Tools page", page: "cli-tools" },
            ].map((s) => (
              <li key={s.step}>
                <button
                  onClick={() => onNavigate(s.page)}
                  className="flex items-center gap-3 w-full text-left group/step py-1.5"
                >
                  <span className="w-5 h-5 rounded-md bg-orun-accentMuted text-orun-accent flex items-center justify-center text-2xs font-bold font-mono shrink-0">
                    {s.step}
                  </span>
                  <span className="text-xs text-orun-textSecondary group-hover/step:text-orun-text transition-colors">
                    {s.text}
                  </span>
                  <span className="text-2xs text-orun-muted ml-auto opacity-0 group-hover/step:opacity-100 transition-opacity font-mono">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-display font-semibold text-orun-text uppercase tracking-wider">Status</h2>
            <span
              className={`inline-flex items-center gap-1.5 text-2xs font-mono ${
                health != null && health.ok ? "text-orun-success" : "text-orun-error"
              }`}
            >
              <Dot ok={health != null && health.ok} />
              {health != null && health.ok ? "Online" : "Offline"}
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Server", value: "localhost:4321" },
              { label: "Endpoint", value: "/v1/chat/completions" },
              { label: "Dashboard", value: "/dashboard" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs py-1">
                <span className="text-orun-textSecondary">{r.label}</span>
                <span className="text-orun-text font-mono text-2xs">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-display font-semibold text-orun-text uppercase tracking-wider">
              Recent Requests
            </h2>
            <button
              onClick={() => onNavigate("usage")}
              className="text-2xs text-orun-accent hover:text-orun-accentHover transition-colors font-mono"
            >
              View all →
            </button>
          </div>
          <div className="space-y-1.5">
            {usage.length === 0 ? (
              <EmptyState>No requests logged yet</EmptyState>
            ) : (
              usage.slice(0, 5).map((e, i) => {
                const meta = providerMeta(e.providerId);
                return (
                  <div key={i} className="flex items-center gap-2.5 text-xs py-1.5">
                    <Dot ok={e.success} />
                    <span className="text-orun-text w-20 truncate">{meta.label}</span>
                    <span className="text-orun-muted truncate flex-1 font-mono text-2xs">{e.model}</span>
                    <span className="text-orun-muted font-mono text-2xs">{e.latencyMs}ms</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {providers.length === 0 && (
        <Card>
          <SectionTitle>Providers</SectionTitle>
          <div className="flex items-center justify-between">
            <p className="text-xs text-orun-textSecondary">Nenhum provider configurado ainda.</p>
            <button
              onClick={() => onNavigate("providers")}
              className="text-xs text-orun-accent hover:text-orun-accentHover font-mono"
            >
              Configure →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Orbit({ stage }) {
  return (
    <div className="relative w-56 h-56 shrink-0">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
        <circle cx="112" cy="112" r="96" fill="none" stroke="#252525" strokeWidth="1" />
        <circle cx="112" cy="112" r="72" fill="none" stroke="#252525" strokeWidth="0.5" strokeDasharray="4 4" />
      </svg>
      <div className="absolute inset-0 animate-orbit-spin">
        <svg className="w-full h-full" viewBox="0 0 224 224">
          <circle cx="112" cy="112" r="96" fill="none" stroke="rgba(195,0,47,0.15)" strokeWidth="1.5" strokeDasharray="12 8" />
        </svg>
      </div>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224">
        {STAGES.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180;
          const x = 112 + 80 * Math.cos(rad);
          const y = 112 + 80 * Math.sin(rad);
          const activeNow = stage === i;
          return (
            <line
              key={s.label}
              x1="112"
              y1="112"
              x2={x}
              y2={y}
              stroke={activeNow ? "rgba(195,0,47,0.6)" : "rgba(37,37,37,0.8)"}
              strokeWidth={activeNow ? 1.5 : 0.5}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      {STAGES.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const left = 50 + 42 * Math.cos(rad);
        const top = 50 + 42 * Math.sin(rad);
        const activeNow = stage === i;
        return (
          <div
            key={s.label}
            className="absolute flex flex-col items-center gap-1 transition-all duration-500"
            style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`w-3 h-3 rounded-full transition-all duration-500 ${
                activeNow ? "bg-orun-accent shadow-[0_0_6px_rgba(195,0,47,0.6)] scale-125" : "bg-orun-border scale-100"
              }`}
            />
            <span
              className={`text-2xs font-mono transition-colors duration-300 whitespace-nowrap ${
                activeNow ? "text-orun-text" : "text-orun-muted"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-orun-bg border border-orun-border flex items-center justify-center">
            <span className="font-display text-2xl font-semibold text-orun-text">O</span>
          </div>
          <div className="absolute -inset-2 rounded-xl border border-orun-accent/10 animate-glow-pulse" />
        </div>
      </div>
    </div>
  );
}

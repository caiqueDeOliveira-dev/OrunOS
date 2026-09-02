import React, { useEffect, useState } from "react";
import { api, providerMeta } from "../lib/api";
import { Card, SectionTitle, LoadingState, EmptyState, Dot } from "../components/ui";

export default function Usage({ onNavigate }) {
  const [events, setEvents] = useState(null);
  const [savings, setSavings] = useState(null);

  useEffect(() => {
    Promise.all([api.listUsage({ limit: 100 }), api.getSavings()])
      .then(([u, s]) => {
        setEvents(u || []);
        setSavings(s);
      })
      .catch(() => setEvents([]));
  }, []);

  if (events === null) return <LoadingState />;

  const totalTokens = events.reduce((s, e) => s + (e.promptTokens ?? 0) + (e.completionTokens ?? 0), 0);
  const totalCost = events.reduce((s, e) => s + (e.estimatedCostUsd ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Usage</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">Historico de requests, custo e economia.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Requests" value={events.length} />
        <Stat label="Tokens" value={totalTokens.toLocaleString()} />
        <Stat label="Custo estimado" value={`$${totalCost.toFixed(4)}`} accent />
      </div>

      {savings && (
        <Card>
          <SectionTitle>Economia</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Custo real" value={`$${savings.totalCost?.toFixed(4) ?? 0}`} />
            <Stat label="Custo retail" value={`$${savings.estimatedRetailCost?.toFixed(4) ?? 0}`} />
            <Stat label="Economia" value={`$${savings.savings?.toFixed(4) ?? 0}`} />
            <Stat label="%" value={`${savings.savingsPercent ?? 0}%`} accent />
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="px-4 py-3 border-b border-orun-border">
          <SectionTitle>Requests</SectionTitle>
        </div>
        {events.length === 0 ? (
          <EmptyState>Nenhum request ainda.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-2xs font-mono uppercase tracking-wider text-orun-muted border-b border-orun-border">
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Provider</th>
                  <th className="text-left px-4 py-2">Model</th>
                  <th className="text-right px-4 py-2">Prompt</th>
                  <th className="text-right px-4 py-2">Completion</th>
                  <th className="text-right px-4 py-2">Latency</th>
                  <th className="text-right px-4 py-2">Custo</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const meta = providerMeta(e.providerId);
                  return (
                    <tr key={i} className="border-b border-orun-border/50 last:border-0">
                      <td className="px-4 py-2">
                        <Dot ok={e.success} />
                      </td>
                      <td className="px-4 py-2 text-orun-textSecondary">{meta.label}</td>
                      <td className="px-4 py-2 font-mono text-orun-textSecondary">{e.model}</td>
                      <td className="px-4 py-2 font-mono text-right">{e.promptTokens}</td>
                      <td className="px-4 py-2 font-mono text-right">{e.completionTokens}</td>
                      <td className="px-4 py-2 font-mono text-right">{e.latencyMs}ms</td>
                      <td className="px-4 py-2 font-mono text-right">${(e.estimatedCostUsd ?? 0).toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <Card>
      <div className="text-2xs text-orun-muted font-display uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold mt-1 font-mono ${accent ? "text-orun-accent" : "text-orun-text"}`}>{value}</div>
    </Card>
  );
}

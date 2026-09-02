import React, { useEffect, useState } from "react";
import { api, providerMeta } from "../lib/api";
import { Card, SectionTitle, LoadingState, Dot } from "../components/ui";

export default function Health({ onNavigate }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .healthDetailed()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (data === null) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Health</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">
          Estado do router, circuit breakers e providers.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Uptime" value={`${Math.floor((data.uptime ?? 0) / 60)}m`} />
        <Stat label="Combos" value={data.combosCount} />
        <Stat label="Providers" value={data.providersCount} />
        <Stat label="Enabled" value={data.enabledProviders} />
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-orun-border">
          <SectionTitle>Providers</SectionTitle>
        </div>
        <div className="p-2">
          {!data.providers || data.providers.length === 0 ? (
            <div className="text-xs text-orun-muted py-6 text-center">Nenhum provider configurado.</div>
          ) : (
            data.providers.map((p) => {
              const meta = providerMeta(p.providerId);
              return (
                <div key={p.providerId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02]">
                  <Dot ok={p.circuitState === "closed"} />
                  <span className="w-32 text-sm text-orun-text">{meta.label}</span>
                  <span className="text-2xs font-mono text-orun-muted flex-1">
                    circuit: <span className={p.circuitState === "closed" ? "text-orun-success" : "text-orun-error"}>{p.circuitState}</span>
                  </span>
                  <span className="text-2xs font-mono text-orun-muted">errors: {p.recentErrors ?? 0}</span>
                  <span className={`text-2xs font-mono ${p.enabled ? "text-orun-success" : "text-orun-muted"}`}>
                    {p.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <div className="text-2xs text-orun-muted font-display uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold mt-1 font-mono text-orun-text">{value}</div>
    </Card>
  );
}

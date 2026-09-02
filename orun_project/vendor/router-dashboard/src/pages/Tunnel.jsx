import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, LoadingState, Spinner } from "../components/ui";

export default function Tunnel({ onNavigate }) {
  const [config, setConfig] = useState(null);
  const [action, setAction] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getTunnel()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (config === null) return <LoadingState />;

  async function run(a) {
    setBusy(true);
    setAction(a);
    try {
      const r = await api.tunnelAction(a, { subdomain: config.subdomain });
      if (r.ok && r.url) setConfig((c) => ({ ...c, url: r.url, enabled: a === "start" }));
    } catch (e) {
      alert(e.message);
    } finally {
      setAction("");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Tunnel</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">Exponha o router publicamente via tunnel.</p>
      </div>

      <Card>
        <SectionTitle>Configuracao</SectionTitle>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Provider</span>
            <select
              value={config.provider || "none"}
              onChange={(e) => setConfig((c) => ({ ...c, provider: e.target.value }))}
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text focus:border-orun-accent outline-none"
            >
              <option value="none">none</option>
              <option value="cloudflared">cloudflared</option>
              <option value="localtunnel">localtunnel</option>
            </select>
          </div>
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Subdomain</span>
            <input
              value={config.subdomain || ""}
              onChange={(e) => setConfig((c) => ({ ...c, subdomain: e.target.value }))}
              placeholder="meu-router"
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none font-mono"
            />
          </div>

          <div className="rounded-lg border border-orun-border bg-orun-bg/40 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-orun-textSecondary">Status</span>
              <span className={config.enabled ? "text-orun-success font-mono" : "text-orun-muted font-mono"}>
                {config.enabled ? "online" : "offline"}
              </span>
            </div>
            {config.url && (
              <div className="mt-1 font-mono text-orun-info text-2xs break-all">{config.url}</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => run("start")}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {busy && action === "start" ? <Spinner size="sm" /> : null}
              Start
            </button>
            <button
              onClick={() => run("stop")}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-xs font-mono text-orun-error border border-orun-border hover:bg-orun-error/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {busy && action === "stop" ? <Spinner size="sm" /> : null}
              Stop
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, LoadingState } from "../components/ui";

export default function ProxyPool({ onNavigate }) {
  const [enabled, setEnabled] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getProxyPool()
      .then((c) => {
        setEnabled(!!c.enabled);
        setProxies(c.proxies || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  function update(i, val) {
    setProxies((prev) => prev.map((p, idx) => (idx === i ? val : p)));
  }
  function add() {
    setProxies((prev) => [...prev, ""]);
  }
  function remove(i) {
    setProxies((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveProxyPool({ enabled, proxies: proxies.filter((p) => p.trim()) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Proxy Pool</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">Lista de proxies p/ requests de IA.</p>
      </div>

      <Card>
        <SectionTitle>Configuracao</SectionTitle>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-orun-textSecondary cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-orun-accent" />
            Habilitar proxy pool
          </label>

          <div className="space-y-2">
            <div className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Proxies</div>
            {proxies.length === 0 && <p className="text-2xs text-orun-muted">Nenhum proxy.</p>}
            {proxies.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={p}
                  onChange={(e) => update(i, e.target.value)}
                  placeholder="http://user:pass@host:port"
                  className="flex-1 bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none font-mono"
                />
                <button
                  onClick={() => remove(i)}
                  className="px-2 text-orun-error hover:bg-orun-error/20 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={add}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-orun-accent border border-orun-accent/30 hover:bg-orun-accentMuted transition-colors"
            >
              + Proxy
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, LoadingState } from "../components/ui";

const FIELDS = [
  { key: "rtkEnabled", label: "RTK (compression target)", type: "bool" },
  { key: "compressionTarget", label: "Compression target", type: "num" },
  { key: "maxContextTokens", label: "Max context tokens", type: "num" },
  { key: "trimSystem", label: "Trim system", type: "bool" },
  { key: "autoCompress", label: "Auto compress", type: "bool" },
];

export default function TokenSaver({ onNavigate }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getTokenSaver()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  if (config === null) return <LoadingState />;

  function update(key, val) {
    setConfig((c) => ({ ...c, [key]: val }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveTokenSaver(config);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Token Saver</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">
          Compressao e trimm de contexto para reduzir tokens.
        </p>
      </div>
      <Card>
        <SectionTitle>Configuracao</SectionTitle>
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-orun-textSecondary">{f.label}</span>
              {f.type === "bool" ? (
                <input
                  type="checkbox"
                  checked={!!config[f.key]}
                  onChange={(e) => update(f.key, e.target.checked)}
                  className="accent-orun-accent"
                />
              ) : (
                <input
                  type="number"
                  value={config[f.key] ?? 0}
                  onChange={(e) => update(f.key, Number(e.target.value))}
                  className="w-32 bg-orun-bg border border-orun-border rounded-lg px-3 py-1.5 text-sm text-orun-text font-mono focus:border-orun-accent outline-none text-right"
                />
              )}
            </div>
          ))}
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </Card>
    </div>
  );
}

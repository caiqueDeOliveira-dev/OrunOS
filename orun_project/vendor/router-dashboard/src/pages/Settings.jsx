import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, LoadingState } from "../components/ui";

export default function Settings({ onNavigate }) {
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    api
      .getBudget()
      .then(setBudget)
      .catch(() => setBudget(null));
  }, []);

  if (budget === null) return <LoadingState />;

  const set = (k, v) => setBudget((b) => ({ ...b, [k]: Number(v) }));

  async function save() {
    try {
      await api.saveBudget(budget);
      alert("Salvo.");
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">Configuracoes globais do router.</p>
      </div>

      <Card>
        <SectionTitle>Budget</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Daily (USD)</span>
            <input
              type="number"
              step="0.01"
              value={budget.daily ?? 0}
              onChange={(e) => set("daily", e.target.value)}
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text font-mono focus:border-orun-accent outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Monthly (USD)</span>
            <input
              type="number"
              step="0.01"
              value={budget.monthly ?? 0}
              onChange={(e) => set("monthly", e.target.value)}
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text font-mono focus:border-orun-accent outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Alert %</span>
            <input
              type="number"
              value={budget.alertThreshold ?? 0}
              onChange={(e) => set("alertThreshold", e.target.value)}
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text font-mono focus:border-orun-accent outline-none"
            />
          </label>
        </div>
        <button
          onClick={save}
          className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors"
        >
          Save
        </button>
      </Card>
    </div>
  );
}

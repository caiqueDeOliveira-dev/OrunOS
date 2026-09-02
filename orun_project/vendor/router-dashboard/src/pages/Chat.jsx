import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, Spinner } from "../components/ui";

export default function Chat({ onNavigate }) {
  const [combos, setCombos] = useState([]);
  const [comboId, setComboId] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listCombos()
      .then((l) => {
        setCombos(l || []);
        if (l && l.length) {
          const def = l.find((c) => c.isSystemDefault) ?? l[0];
          setComboId(def.id);
        }
      })
      .catch(() => setCombos([]));
  }, []);

  async function run() {
    if (!comboId || !message.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await api.testCombo(comboId, message);
      setResult(r);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  const meta = result ? (result.providerId ? result.providerId : "") : "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">
          Teste um combo com uma mensagem e veja qual provider/model respondeu.
        </p>
      </div>

      <Card>
        <SectionTitle>Test Combo</SectionTitle>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Combo</span>
            <select
              value={comboId}
              onChange={(e) => setComboId(e.target.value)}
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text focus:border-orun-accent outline-none"
            >
              <option value="">Selecione</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                  {c.isSystemDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Mensagem</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && run()}
              rows={4}
              placeholder="Digite uma mensagem..."
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none resize-none"
            />
          </div>
          <button
            onClick={run}
            disabled={busy || !comboId || !message.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {busy ? <Spinner size="sm" /> : null}
            Send
          </button>
        </div>
      </Card>

      {result && (
        <Card>
          <SectionTitle>Response</SectionTitle>
          {result.error ? (
            <p className="text-sm text-orun-error">{result.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-2xs font-mono">
                <span className="px-2 py-1 rounded bg-orun-bg border border-orun-border">
                  provider: <span className="text-orun-accent">{result.providerId}</span>
                </span>
                <span className="px-2 py-1 rounded bg-orun-bg border border-orun-border">
                  model: <span className="text-orun-accent">{result.model}</span>
                </span>
                <span className="px-2 py-1 rounded bg-orun-bg border border-orun-border">{result.latencyMs}ms</span>
                <span className="px-2 py-1 rounded bg-orun-bg border border-orun-border">
                  {result.promptTokens} + {result.completionTokens} tok
                </span>
              </div>
              <div className="rounded-lg bg-orun-bg border border-orun-border p-3 text-sm text-orun-text whitespace-pre-wrap">
                {result.text ?? meta}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

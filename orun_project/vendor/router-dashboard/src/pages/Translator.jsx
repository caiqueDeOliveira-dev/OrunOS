import React, { useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle, Spinner } from "../components/ui";

export default function Translator({ onNavigate }) {
  const [messages, setMessages] = useState([{ role: "user", content: "" }]);
  const [system, setSystem] = useState("");
  const [target, setTarget] = useState("openai");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  function setMsg(i, content) {
    setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, content } : m)));
  }

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.translate(messages, system, target);
      setResult(r);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Translator</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">
          Traduza requests entre formatos OpenAI / Anthropic.
        </p>
      </div>

      <Card>
        <SectionTitle>Request</SectionTitle>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">System</span>
            <input
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="system prompt (opcional)"
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none"
            />
          </div>
          {messages.map((m, i) => (
            <div key={i} className="flex gap-2">
              <select
                value={m.role}
                onChange={(e) => setMessages((prev) => prev.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)))}
                className="bg-orun-card border border-orun-border rounded-lg px-2 py-2 text-xs text-orun-text focus:border-orun-accent outline-none"
              >
                <option value="user">user</option>
                <option value="assistant">assistant</option>
                <option value="system">system</option>
              </select>
              <input
                value={m.content}
                onChange={(e) => setMsg(i, e.target.value)}
                placeholder="mensagem"
                className="flex-1 bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none"
              />
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="px-2 text-orun-error hover:bg-orun-error/20 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMessages((prev) => [...prev, { role: "user", content: "" }])}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-orun-accent border border-orun-accent/30 hover:bg-orun-accentMuted transition-colors"
            >
              + Message
            </button>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="bg-orun-card border border-orun-border rounded-lg px-2 py-1.5 text-xs text-orun-text focus:border-orun-accent outline-none"
            >
              <option value="openai">→ OpenAI</option>
              <option value="anthropic">→ Anthropic</option>
            </select>
            <button
              onClick={run}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <Spinner size="sm" /> : null}
              Translate
            </button>
          </div>
        </div>
      </Card>

      {result && (
        <Card>
          <SectionTitle>Result</SectionTitle>
          {result.error ? (
            <p className="text-sm text-orun-error">{result.error}</p>
          ) : (
            <pre className="text-xs text-orun-textSecondary whitespace-pre-wrap font-mono rounded-lg bg-orun-bg border border-orun-border p-3">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}

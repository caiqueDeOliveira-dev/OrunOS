import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Card, SectionTitle } from "../components/ui";

export default function Console({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    let es = null;
    try {
      es = api.connectLogs();
    } catch {}
    if (es) {
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          setLogs((prev) => [...prev.slice(-199), data]);
        } catch {}
      };
      es.onerror = () => {};
    }
    return () => es?.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  function levelColor(l) {
    switch (l) {
      case "error":
        return "text-orun-error";
      case "warn":
        return "text-orun-warning";
      case "success":
        return "text-orun-success";
      default:
        return "text-orun-textSecondary";
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">Console</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">Stream de logs do router em tempo real (SSE).</p>
      </div>
      <Card padding="none">
        <div className="px-4 py-3 border-b border-orun-border flex items-center justify-between">
          <SectionTitle>Live Logs</SectionTitle>
          <button
            onClick={() => setLogs([])}
            className="text-2xs font-mono text-orun-muted hover:text-orun-text transition-colors"
          >
            clear
          </button>
        </div>
        <div className="h-[60vh] overflow-y-auto font-mono text-2xs p-3 space-y-0.5">
          {logs.length === 0 ? (
            <div className="text-orun-muted text-center py-10">Aguardando eventos...</div>
          ) : (
            logs.map((l, i) => {
              const t = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "";
              return (
                <div key={i} className="flex gap-2">
                  <span className="text-orun-muted shrink-0">{t}</span>
                  <span className={`${levelColor(l.level)} shrink-0`}>{l.level ?? ""}</span>
                  <span className="text-orun-textSecondary truncate">{l.message ?? l.type ?? ""}</span>
                  {l.status && <span className="text-orun-info shrink-0">{l.status}</span>}
                  {l.latencyMs != null && <span className="text-orun-muted shrink-0">{l.latencyMs}ms</span>}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </Card>
    </div>
  );
}

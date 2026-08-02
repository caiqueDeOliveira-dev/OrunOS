import { useState, useEffect } from "react";
import {
  LifeBuoy, Lightbulb, CheckCircle, Download, Trash2, RefreshCw, Bug, AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { ErrorGuard, type ErrorLogEntry, type SuggestionEntry } from "../../../services/errorGuard";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";

type TabId = "errors" | "suggestions";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "errors", label: "Erros", icon: Bug },
  { id: "suggestions", label: "Sugestões", icon: Lightbulb },
];

const STAT_CARD_STYLE: React.CSSProperties = {
  padding: "16px",
  borderRadius: "12px",
  background: "var(--card)",
  border: "1px solid var(--border)",
};

export function SuporteWorkspace({ onSendMessage }: WorkspaceProps) {
  const { userName, avatarInitials, greeting } = usePersonalization();
  const { notes, updateNotes } = useWorkspaceNotes("Suporte");

  const [activeTab, setActiveTab] = useState<TabId>("errors");
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [stats, setStats] = useState({ totalErrors: 0, resolvedErrors: 0, totalSuggestions: 0, implementedSuggestions: 0 });
  const refresh = () => {
    setErrors(ErrorGuard.getErrors());
    setSuggestions(ErrorGuard.getSuggestions());
    setStats(ErrorGuard.getStats());
  };

  useEffect(() => { refresh(); }, []);

  const locale = typeof navigator !== "undefined" ? navigator.language : "pt-BR";

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{greeting}, {userName}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#0EA5E9", color: "#fff" }}>{avatarInitials}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0EA5E9, #6366F1)" }}>
            <LifeBuoy size={18} color="#fff" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Suporte Técnico</h2>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              {stats.resolvedErrors}/{stats.totalErrors} resolvidos · {stats.implementedSuggestions}/{stats.totalSuggestions} implementados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { ErrorGuard.clear(); refresh(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: "rgba(192,0,24,0.1)", color: "#C00018" }}
          >
            <Trash2 size={11} /> Limpar
          </button>
          <button
            onClick={() => { const json = ErrorGuard.exportJSON(); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `suporte-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: "rgba(14,165,233,0.1)", color: "#0EA5E9" }}
          >
            <Download size={11} /> Exportar
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            <RefreshCw size={11} /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all flex-1 justify-center"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: active ? "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.08))" : "transparent",
                color: active ? "#0EA5E9" : "var(--muted-foreground)",
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={14} />
              {tab.label}
              <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: active ? "#0EA5E9" : "var(--secondary)", color: active ? "#fff" : "var(--muted-foreground)" }}>
                {tab.id === "errors" ? stats.totalErrors : stats.totalSuggestions}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "errors" && (
        <div className="space-y-2">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
              <CheckCircle size={40} style={{ color: "#22C55E", opacity: 0.5 }} />
              <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>Nenhum erro registrado</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {errors.map((error) => (
                <div key={error.id} className="p-4 rounded-xl" style={{ ...STAT_CARD_STYLE, border: `1px solid ${error.resolved ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: error.resolved ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)" }}>
                        {error.type === "error" || error.type === "bug" ? (
                          <Bug size={14} style={{ color: error.resolved ? "#22C55E" : "#DC2626" }} />
                        ) : (
                          <Lightbulb size={14} style={{ color: "#EAB308" }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] block truncate font-medium" style={{ color: "var(--foreground)" }}>
                          {error.title}
                        </span>
                        <span className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>
                          {new Date(error.timestamp).toLocaleString(locale)}
                        </span>
                        {error.description && (
                          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                            {error.description}
                          </p>
                        )}
                        {error.stack && (
                          <details className="mt-1">
                            <summary className="text-[8px] cursor-pointer" style={{ color: "#DC2626" }}>Stack trace</summary>
                            <pre className="text-[8px] mt-1 p-2 rounded overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: "#aaa", maxHeight: 120, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>{error.stack}</pre>
                          </details>
                        )}
                        {error.resolution && (
                          <p className="text-[9px] mt-1" style={{ color: "#22C55E" }}>
                            Resolução: {error.resolution}
                          </p>
                        )}
                      </div>
                    </div>
                    {!error.resolved && (
                      <button
                        onClick={() => { ErrorGuard.markResolved(error.id, "Resolvido manualmente"); refresh(); }}
                        className="p-1.5 rounded shrink-0"
                        style={{ color: "#22C55E" }}
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "suggestions" && (
        <div className="space-y-2">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl" style={{ background: "var(--card)", border: "1px dashed var(--border)" }}>
              <Lightbulb size={40} style={{ color: "#EAB308", opacity: 0.5 }} />
              <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>Nenhuma sugestão registrada</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <div key={s.id} className="p-4 rounded-xl" style={{ ...STAT_CARD_STYLE, border: `1px solid ${s.implemented ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.implemented ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)" }}>
                        <Lightbulb size={14} style={{ color: s.implemented ? "#22C55E" : "#EAB308" }} />
                      </div>
                      <div>
                        <span className="text-[11px] block font-medium" style={{ color: "var(--foreground)" }}>
                          {s.title}
                        </span>
                        <span className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>
                          {new Date(s.timestamp).toLocaleString(locale)}
                        </span>
                        <p className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                          {s.description}
                        </p>
                      </div>
                    </div>
                    {!s.implemented && (
                      <button
                        onClick={() => { ErrorGuard.markImplemented(s.id); refresh(); }}
                        className="p-1.5 rounded shrink-0"
                        style={{ color: "#22C55E" }}
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: "12px", borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)" }}>
        <span className="text-xs font-medium mb-2 block" style={{ color: "var(--foreground)" }}>Notas Pessoais</span>
        <textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)", minHeight: "60px" }}
          placeholder="Suas anotações de suporte..."
        />
      </div>
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  LifeBuoy, Lightbulb, CheckCircle, Download, Trash2, RefreshCw, Bug, AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { ErrorGuard, type ErrorLogEntry, type SuggestionEntry } from "../../../services/errorGuard";
import { usePersonalization, useWorkspaceNotes } from "../../../hooks/usePersonalization";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import { P, PremiumRoot, ScrollArea } from "../premium";

type TabId = "errors" | "suggestions";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "errors", label: "Erros", icon: Bug },
  { id: "suggestions", label: "Sugestões", icon: Lightbulb },
];

const STAT_CARD_STYLE: React.CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: P.card,
  border: `1px solid ${P.border}`,
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
    <PremiumRoot>
      <ScrollArea className="p-6">
      <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>{greeting}, {userName}</span>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: P.info, color: "#fff" }}>{avatarInitials}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${P.info}, ${P.violet})` }}>
            <LifeBuoy size={18} color="#fff" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>Suporte Técnico</h2>
            <p className="text-[10px]" style={{ color: P.sub }}>
              {stats.resolvedErrors}/{stats.totalErrors} resolvidos · {stats.implementedSuggestions}/{stats.totalSuggestions} implementados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { ErrorGuard.clear(); refresh(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: "rgba(195,0,47,0.1)", color: P.primary }}
          >
            <Trash2 size={11} /> Limpar
          </button>
          <button
            onClick={() => { const json = ErrorGuard.exportJSON(); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `suporte-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: "rgba(77,163,255,0.1)", color: P.info }}
          >
            <Download size={11} /> Exportar
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
            style={{ background: P.card2, color: P.sub }}
          >
            <RefreshCw size={11} /> Atualizar
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: P.card, border: `1px solid ${P.border}` }}>
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
                background: active ? `linear-gradient(135deg, ${P.info}1F, ${P.violet}14)` : "transparent",
                color: active ? P.info : P.sub,
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={14} />
              {tab.label}
              <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: active ? P.info : P.card2, color: active ? "#fff" : P.sub }}>
                {tab.id === "errors" ? stats.totalErrors : stats.totalSuggestions}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "errors" && (
        <div className="space-y-2">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-[18px]" style={{ background: P.card, border: `1px dashed ${P.border}` }}>
              <CheckCircle size={40} style={{ color: P.success, opacity: 0.5 }} />
              <p className="text-xs mt-3" style={{ color: P.sub }}>Nenhum erro registrado</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {errors.map((error) => (
                <div key={error.id} className="p-4 rounded-xl" style={{ ...STAT_CARD_STYLE, border: `1px solid ${error.resolved ? "rgba(0,210,106,0.2)" : "rgba(255,75,75,0.2)"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: error.resolved ? "rgba(0,210,106,0.1)" : "rgba(255,75,75,0.1)" }}>
                        {error.type === "error" || error.type === "bug" ? (
                          <Bug size={14} style={{ color: error.resolved ? P.success : P.error }} />
                        ) : (
                          <Lightbulb size={14} style={{ color: P.alert }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] block truncate font-medium" style={{ color: P.text }}>
                          {error.title}
                        </span>
                        <span className="text-[9px] block" style={{ color: P.sub }}>
                          {new Date(error.timestamp).toLocaleString(locale)}
                        </span>
                        {error.description && (
                          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: P.sub }}>
                            {error.description}
                          </p>
                        )}
                        {error.stack && (
                          <details className="mt-1">
                            <summary className="text-[8px] cursor-pointer" style={{ color: P.error }}>Stack trace</summary>
                            <pre className="text-[8px] mt-1 p-2 rounded overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: "#aaa", maxHeight: 120, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>{error.stack}</pre>
                          </details>
                        )}
                        {error.resolution && (
                          <p className="text-[9px] mt-1" style={{ color: P.success }}>
                            Resolução: {error.resolution}
                          </p>
                        )}
                      </div>
                    </div>
                    {!error.resolved && (
                      <button
                        onClick={() => { ErrorGuard.markResolved(error.id, "Resolvido manualmente"); refresh(); }}
                        className="p-1.5 rounded shrink-0"
                        style={{ color: P.success }}
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
            <div className="flex flex-col items-center justify-center p-12 rounded-[18px]" style={{ background: P.card, border: `1px dashed ${P.border}` }}>
              <Lightbulb size={40} style={{ color: P.alert, opacity: 0.5 }} />
              <p className="text-xs mt-3" style={{ color: P.sub }}>Nenhuma sugestão registrada</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <div key={s.id} className="p-4 rounded-xl" style={{ ...STAT_CARD_STYLE, border: `1px solid ${s.implemented ? "rgba(0,210,106,0.2)" : "rgba(255,181,71,0.2)"}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.implemented ? "rgba(0,210,106,0.1)" : "rgba(255,181,71,0.1)" }}>
                        <Lightbulb size={14} style={{ color: s.implemented ? P.success : P.alert }} />
                      </div>
                      <div>
                        <span className="text-[11px] block font-medium" style={{ color: P.text }}>
                          {s.title}
                        </span>
                        <span className="text-[9px] block" style={{ color: P.sub }}>
                          {new Date(s.timestamp).toLocaleString(locale)}
                        </span>
                        <p className="text-[10px] mt-1" style={{ color: P.sub }}>
                          {s.description}
                        </p>
                      </div>
                    </div>
                    {!s.implemented && (
                      <button
                        onClick={() => { ErrorGuard.markImplemented(s.id); refresh(); }}
                        className="p-1.5 rounded shrink-0"
                        style={{ color: P.success }}
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
      <div style={{ padding: "12px", borderRadius: "18px", background: P.card, border: `1px solid ${P.border}` }}>
        <span className="text-xs font-medium mb-2 block" style={{ color: P.text }}>Notas Pessoais</span>
        <textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-[10px] resize-none"
          style={{ background: P.card2, color: P.text, border: `1px solid ${P.border}`, minHeight: "60px" }}
          placeholder="Suas anotações de suporte..."
        />
      </div>
      <AIFloatingPrompt onSendMessage={onSendMessage} label="Perguntar à IA" />
      </div>
      </ScrollArea>
    </PremiumRoot>
  );
}

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Bug, Lightbulb, CheckCircle, Download, Trash2, RefreshCw } from "lucide-react";
import { ErrorGuard, type ErrorLogEntry, type SuggestionEntry } from "../services/errorGuard";
import { useTranslation } from "../../i18n/I18nProvider";

interface Props {
  onClose: () => void;
}

type Tab = "errors" | "suggestions";

export function ErrorGuardPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("errors");
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([]);
  const [stats, setStats] = useState({ totalErrors: 0, resolvedErrors: 0, totalSuggestions: 0, implementedSuggestions: 0 });

  const refresh = () => {
    setErrors(ErrorGuard.getErrors());
    setSuggestions(ErrorGuard.getSuggestions());
    setStats(ErrorGuard.getStats());
  };

  useEffect(() => { refresh(); }, []);

  const tabs = [
    { id: "errors" as Tab, label: `${t("errorguard_tab_errors")} (${stats.totalErrors})`, icon: Bug },
    { id: "suggestions" as Tab, label: `${t("errorguard_tab_suggestions")} (${stats.totalSuggestions})`, icon: Lightbulb },
  ];

  const locale = typeof navigator !== "undefined" ? navigator.language : "pt-BR";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[600px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,38,38,0.1)" }}>
              <Bug size={14} style={{ color: "#DC2626" }} />
            </div>
            <div>
              <span className="text-sm tracking-widest uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("errorguard_title")}
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                {stats.resolvedErrors}/{stats.totalErrors} {t("errorguard_resolved")} · {stats.implementedSuggestions}/{stats.totalSuggestions} {t("errorguard_implemented")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { ErrorGuard.clear(); refresh(); }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)" }} title={t("errorguard_btn_clear")}>
              <Trash2 size={12} />
            </button>
            <button onClick={() => { const json = ErrorGuard.exportJSON(); const blob = new Blob([json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `errorguard-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)" }} title={t("errorguard_btn_export")}>
              <Download size={12} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-wider transition-all"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  background: isActive ? "rgba(220,38,38,0.08)" : "transparent",
                }}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <button onClick={refresh} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)" }}>
            <RefreshCw size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          {activeTab === "errors" && (
            <div className="space-y-2">
              {errors.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle size={40} style={{ color: "#22C55E", opacity: 0.5, margin: "0 auto" }} />
                  <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>{t("errorguard_empty_errors")}</p>
                </div>
              ) : (
                errors.map((error) => (
                  <div key={error.id} className="p-3 rounded-lg" style={{ background: "var(--secondary)", border: `1px solid ${error.resolved ? "rgba(34,197,94,0.2)" : "rgba(220,38,38,0.2)"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: error.resolved ? "rgba(34,197,94,0.1)" : "rgba(220,38,38,0.1)" }}>
                          {error.type === "error" || error.type === "bug" ? (
                            <Bug size={11} style={{ color: error.resolved ? "#22C55E" : "#DC2626" }} />
                          ) : (
                            <Lightbulb size={11} style={{ color: "#EAB308" }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] block truncate" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
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
                              <summary className="text-[8px] cursor-pointer" style={{ color: "#DC2626" }}>{t("errorguard_stack_trace")}</summary>
                              <pre className="text-[8px] mt-1 p-2 rounded overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)", color: "#aaa", maxHeight: 120, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>{error.stack}</pre>
                            </details>
                          )}
                          {error.resolution && (
                            <p className="text-[9px] mt-1" style={{ color: "#22C55E" }}>
                              {t("errorguard_label_resolution")} {error.resolution}
                            </p>
                          )}
                        </div>
                      </div>
                      {!error.resolved && (
                        <button
                          onClick={() => { ErrorGuard.markResolved(error.id, "Resolved manually"); refresh(); }}
                          className="p-1 rounded shrink-0"
                          style={{ color: "#22C55E" }}
                          title={t("errorguard_action_mark_resolved")}
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "suggestions" && (
            <div className="space-y-2">
              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb size={40} style={{ color: "#EAB308", opacity: 0.5, margin: "0 auto" }} />
                  <p className="text-xs mt-3" style={{ color: "var(--muted-foreground)" }}>{t("errorguard_empty_suggestions")}</p>
                </div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg" style={{ background: "var(--secondary)", border: `1px solid ${s.implemented ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: s.implemented ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)" }}>
                          <Lightbulb size={11} style={{ color: s.implemented ? "#22C55E" : "#EAB308" }} />
                        </div>
                        <div>
                          <span className="text-[11px] block" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
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
                          className="p-1 rounded shrink-0"
                          style={{ color: "#22C55E" }}
                          title={t("errorguard_action_mark_implemented")}
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

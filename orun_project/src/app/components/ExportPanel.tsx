import React, { useState, useEffect, useRef } from "react";
import { Download, Upload, FileText, CheckCircle, AlertCircle, Database } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";

export const ExportPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [mode, setMode] = useState<"conversations" | "full">("conversations");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convs = await window.orun.conversations.list();
        setConversations(convs);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };
    loadConversations();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === conversations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(conversations.map(c => c.id)));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let data: any;

      if (mode === "full" && isElectron) {
        // Full export: conversations + settings + schedules + memory
        data = await window.orun.db.fullExport();
        if (!data) throw new Error("Full export failed");
      } else {
        // Conversation-only export
        data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          conversations: [] as any[],
        };
        for (const id of selected) {
          const messages = await window.orun.conversations.messages(id);
          data.conversations.push({ id, messages });
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orun-${mode === "full" ? "full-backup" : "conversations"}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("success");
      setTimeout(() => { if (mountedRef.current) setStatus("idle"); }, 3000);
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("error");
      setTimeout(() => { if (mountedRef.current) setStatus("idle"); }, 3000);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version !== 1) {
          throw new Error(t("exportFileNotSupported"));
        }

        for (const conv of data.conversations) {
          await window.orun.conversations.importConversation(conv.id, conv.messages);
        }

        setStatus("success");
        setTimeout(() => { if (mountedRef.current) setStatus("idle"); }, 3000);

        const convs = await window.orun.conversations.list();
        setConversations(convs);
      } catch (err) {
        console.error("Import failed:", err);
        setStatus("error");
        setTimeout(() => { if (mountedRef.current) setStatus("idle"); }, 3000);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("exportImportTitle")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("conversations")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium transition-all"
              style={{
                background: mode === "conversations" ? "var(--accent)" : "rgba(255,255,255,0.05)",
                color: mode === "conversations" ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${mode === "conversations" ? "var(--accent)" : "transparent"}`,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <FileText size={12} />
              {t("exportConversations")}
            </button>
            {isElectron && (
              <button
                onClick={() => setMode("full")}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium transition-all"
                style={{
                  background: mode === "full" ? "var(--accent)" : "rgba(255,255,255,0.05)",
                  color: mode === "full" ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${mode === "full" ? "var(--accent)" : "transparent"}`,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                <Database size={12} />
                {t("exportFullBackup")}
              </button>
            )}
          </div>

          {mode === "conversations" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
                >
                  {selected.size === conversations.length ? t("exportDeselectAll") : t("exportSelectAll")}
                </button>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {selected.size} de {conversations.length} {t("exportSelected")}
                </span>
              </div>

              <div
                className="max-h-64 overflow-y-auto space-y-2 mb-4"
                style={{ scrollbarWidth: "thin", scrollbarColor: "var(--text-muted) transparent" }}
              >
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => toggleSelect(conv.id)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: selected.has(conv.id) ? "var(--accent-soft)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${selected.has(conv.id) ? "var(--accent)" : "transparent"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center border"
                      style={{
                        background: selected.has(conv.id) ? "var(--accent)" : "transparent",
                        borderColor: selected.has(conv.id) ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {selected.has(conv.id) && <CheckCircle size={12} color="#fff" />}
                    </div>
                    <FileText size={16} style={{ color: "var(--text-secondary)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {conv.agent || t("exportNoAgent")}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString("pt-BR") : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {mode === "full" && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'Sora', sans-serif" }}>
                {t("exportFullDescription")}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={(mode === "conversations" && selected.size === 0) || exporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: (mode === "conversations" && selected.size === 0) ? "rgba(255,255,255,0.05)" : "var(--accent)",
                color: (mode === "conversations" && selected.size === 0) ? "var(--text-muted)" : "#fff",
              }}
            >
              <Download size={14} />
              {exporting ? t("exportExporting") : mode === "full" ? t("exportFullBackup") : t("exportExportJSON")}
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
            >
              <Upload size={14} />
              {importing ? t("exportImporting") : t("exportImportJSON")}
            </button>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg" style={{ background: "var(--success-soft)" }}>
              <CheckCircle size={14} style={{ color: "var(--success)" }} />
              <span className="text-sm" style={{ color: "var(--success)" }}>{t("exportSuccess")}</span>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg" style={{ background: "var(--danger-soft)" }}>
              <AlertCircle size={14} style={{ color: "var(--danger)" }} />
              <span className="text-sm" style={{ color: "var(--danger)" }}>{t("exportError")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

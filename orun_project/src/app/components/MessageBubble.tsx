import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, RefreshCw, Check, X as XIcon, ChevronRight, Wrench } from "lucide-react";
import Markdown from "react-markdown";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Message } from "../types";

interface ToolResultError { error?: string; message?: string }

function useToolLabels() {
  const { t } = useTranslation();
  return {
    read_file: t("toolReadingFile"),
    write_file: t("toolWritingFile"),
    edit_file: t("toolEditingFile"),
    list_files: t("toolListingFiles"),
    search_files: t("toolSearchingFiles"),
    search_content: t("toolSearchingContent"),
    run_command: t("toolRunningCommand"),
    web_fetch: t("toolFetchingUrl"),
    memory_save: t("toolSavingMemory"),
    memory_search: t("toolSearchingMemory"),
    notify: t("toolSendingNotification"),
    schedule_task: t("toolSchedulingTask"),
  };
}

export const MessageBubble = React.memo(function MessageBubble({
  msg, streaming, onEdit, onRegenerate,
}: {
  msg: Message;
  streaming?: boolean;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
}) {
  const { t } = useTranslation();
  const toolLabels = useToolLabels();
  const isHampton = msg.role === "hampton";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const [hovering, setHovering] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const confirmEdit = () => {
    if (draft.trim() && draft.trim() !== msg.content) onEdit?.(draft.trim());
    setEditing(false);
  };

  const toolCalls = msg.toolCalls;

  return (
    <motion.div
      className={`flex gap-3 ${isHampton ? "justify-start" : "justify-end"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {isHampton && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(192,0,24,0.12)", border: "1px solid rgba(192,0,24,0.25)" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C00018", boxShadow: "0 0 4px #C00018" }} />
        </div>
      )}

      <div className={`flex items-end gap-1.5 ${isHampton ? "" : "flex-row-reverse"}`}>
        <div
          className="max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isHampton ? "var(--card)" : "rgba(192,0,24,0.08)",
            border: `1px solid ${isHampton ? "var(--border)" : "rgba(192,0,24,0.18)"}`,
            fontFamily: "'Inter', sans-serif",
            color: "var(--foreground)",
            fontWeight: 300,
          }}
        >
          {/* Tool calls indicator */}
          {isHampton && toolCalls && toolCalls.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setToolsExpanded(p => !p)}
                className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase w-full text-left"
                style={{ color: "#C00018", fontFamily: "'Sora', sans-serif" }}
              >
                <ChevronRight size={10} style={{ transform: toolsExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                <Wrench size={10} />
                <span>{toolCalls.length} tool{toolCalls.length > 1 ? "s" : ""}</span>
                {!toolCalls.some(tc => !tc.result) && toolCalls.every(tc => tc.result) && (
                  <span style={{ color: "#22C55E" }}>{t("toolDone")}</span>
                )}
                {toolCalls.some(tc => !tc.result) && (
                  <span style={{ color: "var(--muted-foreground)", animation: "orunStatePulse 1s ease-in-out infinite" }}>{t("toolWorking")}</span>
                )}
              </button>
              <AnimatePresence>
                {toolsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-1.5 space-y-1"
                  >
                    {toolCalls.map((tc) => (
                      <div key={tc.id} className="flex items-start gap-2 text-[11px] py-1 px-2 rounded" style={{ background: "rgba(192,0,24,0.05)", border: "1px solid rgba(192,0,24,0.1)" }}>
                        <div className="flex-shrink-0 mt-0.5">
                          {tc.result ? (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C00018", animation: "orunStatePulse 1s ease-in-out infinite" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span style={{ color: "#C00018", fontFamily: "'Sora', sans-serif" }}>{(toolLabels as Record<string, string>)[tc.name] || tc.name}</span>
                          {String(tc.arguments?.path ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.path).split(/[/\\]/).pop()}</span>}
                          {String(tc.arguments?.command ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.command).slice(0, 40)}</span>}
                          {String(tc.arguments?.url ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.url).slice(0, 40)}</span>}
                          {String(tc.arguments?.key ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.key)}</span>}
                          {String(tc.arguments?.query ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.query).slice(0, 40)}</span>}
                          {String(tc.arguments?.pattern ?? "") && <span style={{ color: "var(--muted-foreground)" }}> — {String(tc.arguments!.pattern).slice(0, 40)}</span>}
                          {tc.result != null && typeof tc.result === "object" && (tc.result as ToolResultError).error && (
                            <span style={{ color: "#EF4444" }}> — {String((tc.result as ToolResultError).error)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false);
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); confirmEdit(); }
                }}
                rows={Math.min(6, Math.max(2, draft.split("\n").length))}
                className="bg-transparent outline-none text-sm resize-none w-64"
                style={{ color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} aria-label={t("ariaCancelEdit")} style={{ color: "var(--muted-foreground)" }}><XIcon size={13} /></button>
                <button onClick={confirmEdit} aria-label={t("ariaConfirmEdit")} style={{ color: "#22C55E" }}><Check size={13} /></button>
              </div>
            </div>
          ) : (
            <>
              {isHampton && !streaming ? (
                <div className="prose prose-sm dark:prose-invert max-w-none" style={{ color: "var(--foreground)", fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
                  <Markdown>{msg.content}</Markdown>
                </div>
              ) : (
                msg.content
              )}
              {streaming && (
                <span
                  className="inline-block ml-0.5"
                  style={{ width: 6, height: 12, background: "#C00018", verticalAlign: "-2px", animation: "orunStatePulse 0.8s ease-in-out infinite" }}
                />
              )}
            </>
          )}
        </div>

        {/* Hover actions */}
        {!editing && hovering && !streaming && (
          <div className="flex flex-col gap-1 pb-1">
            {!isHampton && onEdit && (
              <button onClick={() => { setDraft(msg.content); setEditing(true); }} title={t("messageEditResend")} aria-label={t("ariaEditMessage")} style={{ color: "var(--muted-foreground)" }}><Pencil size={12} /></button>
            )}
            {isHampton && onRegenerate && (
              <button onClick={onRegenerate} title={t("messageRegenerate")} aria-label={t("ariaRegenerate")} style={{ color: "var(--muted-foreground)" }}><RefreshCw size={12} /></button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

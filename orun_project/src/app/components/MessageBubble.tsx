import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, RefreshCw, Check, X as XIcon, ChevronRight, Wrench } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Message } from "../types";

const TOOL_LABELS: Record<string, string> = {
  read_file: "Reading file",
  write_file: "Writing file",
  edit_file: "Editing file",
  list_files: "Listing files",
  search_files: "Searching files",
  search_content: "Searching content",
  run_command: "Running command",
  web_fetch: "Fetching URL",
  memory_save: "Saving memory",
  memory_search: "Searching memory",
  notify: "Sending notification",
  schedule_task: "Scheduling task",
};

export function MessageBubble({
  msg, streaming, onEdit, onRegenerate,
}: {
  msg: Message;
  streaming?: boolean;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
}) {
  const { t } = useTranslation();
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
            background: isHampton ? "#131313" : "rgba(192,0,24,0.08)",
            border: `1px solid ${isHampton ? "#1e1e1e" : "rgba(192,0,24,0.18)"}`,
            fontFamily: "'Inter', sans-serif",
            color: "#E0E0E0",
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
                  <span style={{ color: "#2ecc71" }}>done</span>
                )}
                {toolCalls.some(tc => !tc.result) && (
                  <span style={{ color: "#666", animation: "orunStatePulse 1s ease-in-out infinite" }}>working...</span>
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
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2ecc71" }} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C00018", animation: "orunStatePulse 1s ease-in-out infinite" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span style={{ color: "#C00018", fontFamily: "'Sora', sans-serif" }}>{TOOL_LABELS[tc.name] || tc.name}</span>
                          {tc.arguments?.path && <span style={{ color: "#666" }}> — {String(tc.arguments.path).split(/[/\\]/).pop()}</span>}
                          {tc.arguments?.command && <span style={{ color: "#666" }}> — {String(tc.arguments.command).slice(0, 40)}</span>}
                          {tc.arguments?.url && <span style={{ color: "#666" }}> — {String(tc.arguments.url).slice(0, 40)}</span>}
                          {tc.arguments?.key && <span style={{ color: "#666" }}> — {String(tc.arguments.key)}</span>}
                          {tc.arguments?.query && <span style={{ color: "#666" }}> — {String(tc.arguments.query).slice(0, 40)}</span>}
                          {tc.arguments?.pattern && <span style={{ color: "#666" }}> — {String(tc.arguments.pattern).slice(0, 40)}</span>}
                          {tc.result && typeof tc.result === "object" && (tc.result as any).error && (
                            <span style={{ color: "#e74c3c" }}> — {(tc.result as any).error}</span>
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
                rows={Math.min(6, Math.max(2, draft.split("\n").length))}
                className="bg-transparent outline-none text-sm resize-none w-64"
                style={{ color: "#E0E0E0", fontFamily: "'Inter', sans-serif" }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} style={{ color: "#666" }}><XIcon size={13} /></button>
                <button onClick={confirmEdit} style={{ color: "#2ecc71" }}><Check size={13} /></button>
              </div>
            </div>
          ) : (
            <>
              {msg.content}
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
              <button onClick={() => { setDraft(msg.content); setEditing(true); }} title={t("messageEditResend")} style={{ color: "#555" }}><Pencil size={12} /></button>
            )}
            {isHampton && onRegenerate && (
              <button onClick={onRegenerate} title={t("messageRegenerate")} style={{ color: "#555" }}><RefreshCw size={12} /></button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

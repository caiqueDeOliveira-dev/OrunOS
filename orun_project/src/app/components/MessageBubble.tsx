import { useState } from "react";
import { motion } from "motion/react";
import { Pencil, RefreshCw, Check, X as XIcon } from "lucide-react";
import type { Message } from "../types";

export function MessageBubble({
  msg, streaming, onEdit, onRegenerate,
}: {
  msg: Message;
  streaming?: boolean;
  onEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
}) {
  const isHampton = msg.role === "hampton";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const [hovering, setHovering] = useState(false);

  const confirmEdit = () => {
    if (draft.trim() && draft.trim() !== msg.content) onEdit?.(draft.trim());
    setEditing(false);
  };

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
              <button onClick={() => { setDraft(msg.content); setEditing(true); }} title="Edit & resend" style={{ color: "#555" }}><Pencil size={12} /></button>
            )}
            {isHampton && onRegenerate && (
              <button onClick={onRegenerate} title="Regenerate" style={{ color: "#555" }}><RefreshCw size={12} /></button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

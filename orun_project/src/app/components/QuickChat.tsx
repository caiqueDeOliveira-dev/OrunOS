import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { AvatarOrb } from "./AvatarOrb";
import { isElectron } from "../constants";

const QUICK_CHAT_HASH = "#/quick-chat";

export function QuickChat() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isQuickChatWindow = typeof window !== "undefined" && window.location.hash === QUICK_CHAT_HASH;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isQuickChatWindow || !isElectron) return;
    const unsubResponse = window.orun.quickChat.onResponse((text) => {
      setMessages((prev) => [...prev, { role: "assistant", text }]);
      setLoading(false);
    });
    const unsubError = window.orun.quickChat.onError((msg) => {
      setMessages((prev) => [...prev, { role: "assistant", text: `Erro: ${msg}` }]);
      setLoading(false);
    });
    return () => {
      unsubResponse();
      unsubError();
    };
  }, [isQuickChatWindow]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    if (isQuickChatWindow && isElectron) {
      await window.orun.quickChat.sendMessage(text);
    }
  }, [input, loading, isQuickChatWindow]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      if (isQuickChatWindow && isElectron) {
        window.orun.quickChat.hide();
      }
    }
  };

  const hide = useCallback(() => {
    if (isQuickChatWindow && isElectron) {
      window.orun.quickChat.hide();
    }
  }, [isQuickChatWindow]);

  return (
    <motion.div
      className="flex flex-col overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        background: "transparent",
      }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 380,
          height: 520,
          margin: "auto",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ width: 28, height: 28 }}>
            <AvatarOrb size={28} />
          </div>
          <span
            className="text-xs tracking-widest uppercase"
            style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}
          >
            Orun OS
          </span>
          <button
            onClick={hide}
            className="ml-auto w-6 h-6 flex items-center justify-center rounded"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ minHeight: 0 }}>
          {messages.length === 0 && (
            <div
              className="flex items-center justify-center h-full text-[10px] tracking-wider"
              style={{ color: "var(--muted-foreground)" }}
            >
              Pergunte qualquer coisa...
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed"
                style={{
                  background: msg.role === "user" ? "rgba(192,0,24,0.12)" : "var(--secondary)",
                  color: "var(--foreground)",
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 rounded-xl text-[11px]"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                <span className="inline-flex gap-1">
                  <span style={{ animation: "orunStatePulse 1s ease-in-out infinite" }}>.</span>
                  <span style={{ animation: "orunStatePulse 1s ease-in-out infinite 0.2s" }}>.</span>
                  <span style={{ animation: "orunStatePulse 1s ease-in-out infinite 0.4s" }}>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: "var(--foreground)" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
              style={{
                background: input.trim() ? "#C00018" : "var(--border)",
                opacity: input.trim() ? 1 : 0.5,
                transition: "background 0.15s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

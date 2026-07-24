import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";
import { MessageBubble } from "./MessageBubble";
import type { HamptonState, Message } from "../types";

interface ChatViewProps {
  messages: Message[];
  hamptonState: HamptonState;
  isStreaming: boolean;
  isLoadingMessages: boolean;
  activeAgentName: string | null;
  onStopStreaming: () => void;
  onEditMessage: (messageId: string, content: string) => void;
  onRegenerate: () => void;
  onStartNewChat: () => void;
  speechEnabled: boolean;
  hasVoiceConfigured: boolean;
  onToggleSpeech: () => void;
}

export function ChatView({
  messages,
  hamptonState,
  isStreaming,
  isLoadingMessages,
  activeAgentName,
  onStopStreaming,
  onEditMessage,
  onRegenerate,
  onStartNewChat,
  speechEnabled,
  hasVoiceConfigured,
  onToggleSpeech,
}: ChatViewProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.div key="chat-mode" className="flex-1 flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-10 py-3 border-b" style={{ borderColor: "var(--secondary)" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "#C00018", boxShadow: "0 0 6px #C00018", animation: hamptonState !== "idle" ? "orunStatePulse 1s ease-in-out infinite" : "none" }} />
          <span className="text-xs tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)", fontWeight: 300 }}>
            {activeAgentName || "Hampton"}
          </span>
        </div>

        {hamptonState !== "idle" && (
          <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#C00018" }}>
            {hamptonState === "thinking" && `${t("homeThinking")}...`}
            {hamptonState === "speaking" && `${t("homeSpeaking")}...`}
            {hamptonState === "listening" && `${t("homeListening")}...`}
          </span>
        )}

        {isStreaming && (
          <button onClick={onStopStreaming} className="text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors" style={{ fontFamily: "'Sora', sans-serif", color: "#FF1A2D", borderColor: "rgba(192,0,24,0.35)" }}>
            {t("homeStop")}
          </button>
        )}

        {hasVoiceConfigured && (
          <button onClick={onToggleSpeech} title={speechEnabled ? t("homeMuteVoice") : t("homeEnableVoice")} className="text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
            {speechEnabled ? "🔊" : "🔇"}
          </button>
        )}

        <button onClick={onStartNewChat} className="ml-auto text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)", borderColor: "var(--border)" }}>
          {t("homeNewConversation")}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-10 py-6 space-y-4 scrollbar-hide" role="log" aria-live="polite" aria-label="Chat messages">
        {isLoadingMessages && (
          <div className="flex justify-center py-8">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("loadingConversation")}</span>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            streaming={isStreaming && msg.id === lastMessage?.id && msg.role === "hampton"}
            onEdit={msg.role === "user" ? (content) => onEditMessage(msg.id, content) : undefined}
            onRegenerate={msg.role === "hampton" && msg.id === lastMessage?.id ? onRegenerate : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}

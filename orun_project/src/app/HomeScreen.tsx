import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "../i18n/I18nProvider";
import { HamptonAvatar } from "./components/HamptonAvatar";
import { AgentsPanel } from "./components/AgentsPanel";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { ChatInput, type AttachedImage } from "./components/ChatInput";
import { MessageBubble } from "./components/MessageBubble";
import { SettingsPanel } from "./components/SettingsPanel";
import { AgentModelsPanel } from "./components/AgentModelsPanel";
import { AutomationPanel } from "./components/AutomationPanel";
import { UsagePanel } from "./components/UsagePanel";
import { ConversationList } from "./components/ConversationList";
import { VoicesPicker } from "./components/VoicesPicker";
import { ModelPicker } from "./components/ModelPicker";
import { WhatsAppPanel } from "./components/WhatsAppPanel";
import { getHamptonReplies, isElectron, getAgents } from "./constants";
import type { HamptonState, Message } from "./types";

// ── Speech recognition (Chromium's built-in engine — NOT local/private;
// audio goes to Google's servers for transcription). Used for both the
// push-to-talk mic button and the soft "Hampton"/"Orun" wake word. ────────
const SpeechRecognitionCtor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function HomeScreen() {
  const { t, speechLang } = useTranslation();
  const [activeNav, setActiveNav] = useState("home");
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentModelsOpen, setAgentModelsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [hasVoiceConfigured, setHasVoiceConfigured] = useState(false);
  const [hamptonState, setHamptonState] = useState<HamptonState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatMode, setChatMode] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const streamedTextRef = useRef("");
  const spokenUpToRef = useRef(0);
  const replyIdRef = useRef<string | null>(null);
  const activeConvoIdRef = useRef<string | null>(null);
  const ttsSettingsRef = useRef<{ engine: string; voiceId: string; enabled?: boolean } | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);

  // ── TTS settings + queued sentence playback ─────────────────────────────

  const refreshTTSSettings = async () => {
    if (!isElectron) return;
    const v = await window.orun.settings.get<{ engine: string; voiceId: string; enabled?: boolean }>("tts");
    ttsSettingsRef.current = v || null;
    setHasVoiceConfigured(Boolean(v?.engine && v?.voiceId));
  };
  useEffect(() => { refreshTTSSettings(); }, []);
  useEffect(() => { if (!voicesOpen) refreshTTSSettings(); }, [voicesOpen]);

  /** Queues a sentence for playback so multiple chunks never overlap. */
  const speak = (text: string) => {
    if (!isElectron || !speechEnabled || !text.trim()) return;
    const v = ttsSettingsRef.current;
    if (!v?.engine || !v?.voiceId) return;
    audioQueueRef.current = audioQueueRef.current.then(async () => {
      try {
        const { audioBase64, mime } = await window.orun.tts.synthesize(v.engine as any, v.voiceId, text.slice(0, 500));
        await new Promise<void>((resolve) => {
          const audio = new Audio(`data:${mime};base64,${audioBase64}`);
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch {
        // Speech is a nice-to-have — never let a TTS failure block the text reply.
      }
    });
  };

  /** Call as text streams in — speaks each finished sentence immediately instead of waiting for the whole reply. */
  const speakIncremental = (fullTextSoFar: string) => {
    const rest = fullTextSoFar.slice(spokenUpToRef.current);
    const match = rest.match(/^[\s\S]*?[.!?]+(\s|$)/);
    if (match) {
      speak(match[0]);
      spokenUpToRef.current += match[0].length;
    }
  };
  const speakRemainder = (fullText: string) => {
    const rest = fullText.slice(spokenUpToRef.current);
    if (rest.trim()) speak(rest);
    spokenUpToRef.current = fullText.length;
  };

  // ── Conversation / navigation ────────────────────────────────────────────

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    setAgentsOpen(id === "agents");
    if (id === "agents") setHistoryOpen(false);
    if (id === "automation") setAutomationOpen(true);
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setChatMode(false);
    setActiveAgent(null);
    setHamptonState("idle");
    setHistoryOpen(false);
  };

  const openConversation = async (id: string) => {
    if (!isElectron) return;
    const rows = await window.orun.conversations.messages(id);
    setMessages(rows.map(r => ({ id: r.id, role: r.role === "assistant" ? "hampton" : "user", content: r.content })));
    setConversationId(id);
    setActiveAgent(null);
    setChatMode(true);
    setHistoryOpen(false);
  };

  const openAgentChat = async (agentName: string) => {
    setAgentsOpen(false);
    setActiveAgent(agentName);
    setMessages([]);
    setChatMode(true);
    if (!isElectron) { setConversationId(null); return; }
    const existing = await window.orun.conversations.list(agentName);
    if (existing.length > 0) {
      const rows = await window.orun.conversations.messages(existing[0].id);
      setMessages(rows.map(r => ({ id: r.id, role: r.role === "assistant" ? "hampton" : "user", content: r.content })));
      setConversationId(existing[0].id);
    } else {
      setConversationId(null);
    }
  };

  // ── Sending messages (Hampton or a specific agent, with optional image) ──

  const handleSend = async (content: string, image?: AttachedImage) => {
    if (!content && !image) return;
    const userMsg: Message = { id: `${Date.now()}`, role: "user", content: content || "(photo)" };
    setMessages(p => [...p, userMsg]);
    setChatMode(true);
    setHamptonState("thinking");
    spokenUpToRef.current = 0;

    if (isElectron) {
      try {
        let convoId = conversationId;
        if (!convoId) {
          const convo = await window.orun.conversations.create((content || "Photo").slice(0, 40), activeAgent || undefined);
          convoId = convo.id;
          setConversationId(convoId);
        }
        await window.orun.conversations.addMessage(convoId, { id: userMsg.id, role: "user", content: userMsg.content });

        const history = [...messages, userMsg].map((m, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return {
            role: (m.role === "hampton" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
            ...(isLast && image ? { image: { base64: image.base64, mime: image.mime } } : {}),
          };
        });

        const replyId = `${Date.now() + 1}`;
        let streamedText = "";
        let firstChunk = true;
        replyIdRef.current = replyId;
        streamedTextRef.current = "";
        activeConvoIdRef.current = convoId;

        cancelStreamRef.current = window.orun.ai.chatStream(history as any, {
          agentId: activeAgent || undefined,
          onChunk: (delta) => {
            if (firstChunk) {
              setHamptonState("speaking");
              setMessages(p => [...p, { id: replyId, role: "hampton", content: "" }]);
              firstChunk = false;
            }
            streamedText += delta;
            streamedTextRef.current = streamedText;
            setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: streamedText } : m)));
            speakIncremental(streamedText);
          },
          onDone: async (fullText) => {
            const finalText = fullText || streamedText;
            setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: finalText } : m)));
            if (convoId) await window.orun.conversations.addMessage(convoId, { id: replyId, role: "assistant", content: finalText });
            cancelStreamRef.current = null;
            speakRemainder(finalText);
            setTimeout(() => setHamptonState("idle"), 900);
          },
          onError: (message) => {
            setHamptonState("speaking");
            const errText = `${t("homeErrorAccess")} ${message || ""}`;
            setMessages(p => {
              const exists = p.some(m => m.id === replyId);
              return exists ? p.map(m => (m.id === replyId ? { ...m, content: errText } : m)) : [...p, { id: replyId, role: "hampton", content: errText }];
            });
            cancelStreamRef.current = null;
            setTimeout(() => setHamptonState("idle"), 1200);
          },
        });
      } catch (err: any) {
        setHamptonState("speaking");
        const reply: Message = { id: `${Date.now() + 1}`, role: "hampton", content: `${t("homeErrorAccessShort")} ${err?.message || ""}` };
        setMessages(p => [...p, reply]);
        setTimeout(() => setHamptonState("idle"), 1200);
      }
      return;
    }

    // Browser preview fallback (no Electron backend available)
    const hamptonReplies = getHamptonReplies(t);
    setTimeout(() => {
      setHamptonState("speaking");
      const reply: Message = { id: `${Date.now() + 1}`, role: "hampton", content: hamptonReplies[Math.floor(Math.random() * hamptonReplies.length)] };
      setMessages(p => [...p, reply]);
      speak(reply.content);
      setTimeout(() => setHamptonState("idle"), 2200);
    }, 1800);
  };

  // ── Edit & regenerate ─────────────────────────────────────────────────────

  const editMessage = async (messageId: string, newContent: string) => {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const kept = messages.slice(0, idx);
    setMessages(kept);
    if (isElectron && conversationId) await window.orun.conversations.truncateFrom(conversationId, messageId);
    handleSend(newContent);
  };

  const regenerate = async () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const lastUser = messages[i];
        const kept = messages.slice(0, i);
        setMessages(kept);
        if (isElectron && conversationId) await window.orun.conversations.truncateFrom(conversationId, lastUser.id);
        handleSend(lastUser.content);
        return;
      }
    }
  };

  // ── Stop streaming ───────────────────────────────────────────────────────

  const stopStreaming = async () => {
    if (!cancelStreamRef.current) return;
    cancelStreamRef.current();
    cancelStreamRef.current = null;
    const replyId = replyIdRef.current;
    const finalText = streamedTextRef.current || "(stopped)";
    if (replyId) {
      setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: finalText } : m)));
      if (activeConvoIdRef.current) await window.orun.conversations.addMessage(activeConvoIdRef.current, { id: replyId, role: "assistant", content: finalText });
    }
    setHamptonState("idle");
  };

  // ── Real mic dictation (push-to-talk) ────────────────────────────────────

  const handleMicClick = () => {
    if (!SpeechRecognitionCtor) { setHamptonState(p => p === "listening" ? "idle" : "listening"); return; }
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setHamptonState("idle"); return; }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setHamptonState("listening");
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      handleSend(transcript);
    };
    recognition.onerror = () => setHamptonState("idle");
    recognition.onend = () => { recognitionRef.current = null; setHamptonState(p => (p === "listening" ? "idle" : p)); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── Soft wake word: continuous recognition watching for "Hampton"/"Orun" ─
  // Not local — Chromium sends audio to Google for this. Opt-in, off by default.

  useEffect(() => {
    if (!wakeWordEnabled || !SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = speechLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join(" ").toLowerCase();
      const match = transcript.match(/(hampton|orun)\b(.*)/i);
      if (match && match[2] && match[2].trim().length > 2) {
        handleSend(match[2].trim());
        recognition.stop();
      }
    };
    recognition.onend = () => { if (wakeWordEnabled) { try { recognition.start(); } catch { /* already running */ } } };
    wakeRecognitionRef.current = recognition;
    try { recognition.start(); } catch { /* ignore */ }
    return () => { recognition.onend = null; recognition.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeWordEnabled]);

  useEffect(() => { window.orun?.settings?.get<boolean>("wakeWordEnabled").then((v) => setWakeWordEnabled(Boolean(v))).catch(() => {}); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => () => cancelStreamRef.current?.(), []);

  const isStreaming = hamptonState === "speaking" || hamptonState === "thinking";
  const lastMessage = messages[messages.length - 1];
  const anyPanelOpen = agentsOpen || historyOpen;
  const agents = getAgents(t);
  const currentAgent = activeAgent ? agents.find(a => a.name === activeAgent) : null;

  return (
    <div className="fixed inset-0 flex" style={{ background: "#080808" }}>
      <Sidebar
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onSettingsClick={() => setSettingsOpen(true)}
        onHistoryClick={() => { setHistoryOpen(p => !p); setAgentsOpen(false); }}
      />

      <AnimatePresence>
        {agentsOpen && <AgentsPanel onClose={() => { setAgentsOpen(false); setActiveNav("home"); }} onSelectAgent={openAgentChat} />}
        {historyOpen && <ConversationList activeId={conversationId} onClose={() => setHistoryOpen(false)} onSelect={openConversation} onNew={startNewChat} />}
        {settingsOpen && !agentModelsOpen && !usageOpen && (
          <SettingsPanel
            onClose={() => setSettingsOpen(false)}
            onOpenAgentModels={() => { setSettingsOpen(false); setAgentModelsOpen(true); }}
            onOpenUsage={() => { setSettingsOpen(false); setUsageOpen(true); }}
            onOpenWhatsApp={() => { setSettingsOpen(false); setWhatsappOpen(true); }}
          />
        )}
        {agentModelsOpen && <AgentModelsPanel onClose={() => setAgentModelsOpen(false)} onBack={() => { setAgentModelsOpen(false); setSettingsOpen(true); }} />}
        {usageOpen && <UsagePanel onClose={() => setUsageOpen(false)} onBack={() => { setUsageOpen(false); setSettingsOpen(true); }} />}
        {automationOpen && <AutomationPanel onClose={() => { setAutomationOpen(false); setActiveNav("home"); }} />}
        {voicesOpen && <VoicesPicker onClose={() => setVoicesOpen(false)} />}
        {modelPickerOpen && <ModelPicker onClose={() => setModelPickerOpen(false)} />}
        {whatsappOpen && <WhatsAppPanel onClose={() => setWhatsappOpen(false)} />}
      </AnimatePresence>

      {anyPanelOpen && <div className="fixed inset-0 z-20" onClick={() => { setAgentsOpen(false); setHistoryOpen(false); setActiveNav("home"); }} />}

      <div className="flex-1 flex flex-col ml-16 overflow-hidden">
        <StatusBar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {!chatMode ? (
              <motion.div
                key="avatar-home"
                className="flex-1 flex flex-col items-center justify-center pb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4 }}
              >
                <HamptonAvatar state={hamptonState} />
                <motion.div className="text-center mt-5 space-y-1.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <p className="text-3xl tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#F5F5F5", fontWeight: 300 }}>{t("homeWelcomeBack")}</p>
                  <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#444", fontWeight: 300 }}>{t("homeHowCanIHelp")}</p>
                </motion.div>
                <div className="flex items-center gap-3 mt-6">
                  {[t("statusNativeAI"), t("homeCloudModels"), t("homeActiveMemory")].map((label, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ borderColor: "#1e1e1e", background: "#0e0e0e" }}>
                      <div className="w-1 h-1 rounded-full" style={{ background: i === 0 ? "#C00018" : "#3a3a3a", boxShadow: i === 0 ? "0 0 4px #C00018" : "none" }} />
                      <span className="text-[9px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "#555" }}>{label}</span>
                    </div>
                  ))}
                </div>
                <AnimatePresence>
                  {hamptonState !== "idle" && (
                    <motion.span
                      className="mt-4 text-[10px] tracking-[0.22em] uppercase"
                      style={{ fontFamily: "'Sora', sans-serif", color: "#C00018", animation: "orunStatePulse 1s ease-in-out infinite", display: "inline-block" }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      {hamptonState === "listening" && t("homeListening")}
                      {hamptonState === "thinking" && t("homeThinking")}
                      {hamptonState === "speaking" && t("homeSpeaking")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="chat-mode" className="flex-1 flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 px-10 py-3 border-b" style={{ borderColor: "#111111" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: "#C00018", boxShadow: "0 0 6px #C00018", animation: hamptonState !== "idle" ? "orunStatePulse 1s ease-in-out infinite" : "none" }} />
                    <span className="text-xs tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "#888", fontWeight: 300 }}>{currentAgent?.name || "Hampton"}</span>
                  </div>
                  {hamptonState !== "idle" && (
                    <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#C00018" }}>
                    {hamptonState === "thinking" && `${t("homeThinking")}...`}
                    {hamptonState === "speaking" && `${t("homeSpeaking")}...`}
                    {hamptonState === "listening" && `${t("homeListening")}...`}
                    </span>
                  )}
                  {isStreaming && cancelStreamRef.current && (
                    <button onClick={stopStreaming} className="text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors" style={{ fontFamily: "'Sora', sans-serif", color: "#FF1A2D", borderColor: "rgba(192,0,24,0.35)" }}>{t("homeStop")}</button>
                  )}
                  {hasVoiceConfigured && (
                    <button onClick={() => setSpeechEnabled(p => !p)} title={speechEnabled ? t("homeMuteVoice") : t("homeEnableVoice")} className="text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors" style={{ fontFamily: "'Sora', sans-serif", color: speechEnabled ? "#888" : "#444", borderColor: "#1e1e1e" }}>
                      {speechEnabled ? "🔊" : "🔇"}
                    </button>
                  )}
                  <button
                    onClick={startNewChat}
                    className="ml-auto text-[9px] tracking-widest uppercase px-3 py-1 rounded-full border transition-colors"
                    style={{ fontFamily: "'Sora', sans-serif", color: "#333", borderColor: "#1e1e1e" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#888")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                  >
                    {t("homeNewConversation")}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-6 space-y-4 scrollbar-hide">
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      streaming={isStreaming && msg.id === lastMessage?.id && msg.role === "hampton"}
                      onEdit={msg.role === "user" ? (content) => editMessage(msg.id, content) : undefined}
                      onRegenerate={msg.role === "hampton" && msg.id === lastMessage?.id ? regenerate : undefined}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ChatInput
            onSend={handleSend}
            onMicClick={handleMicClick}
            listening={hamptonState === "listening"}
            onSlashCommand={(cmd) => { if (cmd === "vozes") setVoicesOpen(true); if (cmd === "model") setModelPickerOpen(true); }}
          />
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none z-[9990]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 55% 45%, rgba(192,0,24,0.038) 0%, transparent 55%)" }} />
    </div>
  );
}

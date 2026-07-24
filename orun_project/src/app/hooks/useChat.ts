import { useState, useRef, useCallback, useEffect } from "react";
import { isElectron } from "../constants";
import type { HamptonState, Message } from "../types";
import type { AttachedImage } from "../components/ChatInput";

interface UseChatOptions {
  t: (key: string) => string;
  onHamptonStateChange: (state: HamptonState) => void;
  speak: (text: string) => void;
  speakIncremental: (fullTextSoFar: string) => void;
  speakRemainder: (fullText: string) => void;
  getHamptonReplies: () => string[];
  spokenUpToRef: React.MutableRefObject<number>;
}

export function useChat({ t, onHamptonStateChange, speak, speakIncremental, speakRemainder, getHamptonReplies, spokenUpToRef }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const cancelStreamRef = useRef<(() => void) | null>(null);
  const streamedTextRef = useRef("");
  const replyIdRef = useRef<string | null>(null);
  const activeConvoIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Keep latest speak functions in a ref so callbacks always get the real versions
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const speakIncrementalRef = useRef(speakIncremental);
  speakIncrementalRef.current = speakIncremental;
  const speakRemainderRef = useRef(speakRemainder);
  speakRemainderRef.current = speakRemainder;
  const tRef = useRef(t);
  tRef.current = t;

  // Timeout tracking for cleanup on unmount
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      fn();
    }, ms);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setChatMode(false);
    setActiveAgent(null);
    onHamptonStateChange("idle");
  }, [onHamptonStateChange]);

  const openConversation = useCallback(async (id: string) => {
    if (!isElectron) return;
    setIsLoadingMessages(true);
    try {
      const rows = await window.orun.conversations.messages(id);
      setMessages(rows.map(r => ({ id: r.id, role: r.role === "assistant" ? "hampton" : "user", content: r.content })));
      setConversationId(id);
      setActiveAgent(null);
      setChatMode(true);
      window.orun.app?.setLastConversation?.(id);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const autoResumeLastConversation = useCallback(async () => {
    if (!isElectron) return false;
    try {
      const lastId = await window.orun.app?.getLastConversation?.();
      if (!lastId) return false;
      const rows = await window.orun.conversations.messages(lastId);
      if (rows.length === 0) return false;
      setMessages(rows.map(r => ({ id: r.id, role: r.role === "assistant" ? "hampton" : "user", content: r.content })));
      setConversationId(lastId);
      setActiveAgent(null);
      setChatMode(true);
      return true;
    } catch { return false; }
  }, []);

  const openAgentChat = useCallback(async (agentName: string) => {
    setActiveAgent(agentName);
    setMessages([]);
    setChatMode(true);
    if (!isElectron) { setConversationId(null); return; }
    try {
      const existing = await window.orun.conversations.list(agentName);
      if (existing.length > 0) {
        const rows = await window.orun.conversations.messages(existing[0].id);
        setMessages(rows.map(r => ({ id: r.id, role: r.role === "assistant" ? "hampton" : "user", content: r.content })));
        setConversationId(existing[0].id);
      } else {
        setConversationId(null);
      }
    } catch {
      setConversationId(null);
    }
  }, []);

  const handleSend = useCallback(async (content: string, image?: AttachedImage) => {
    if (!content && !image) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: content || "(photo)" };
    setMessages(p => [...p, userMsg]);
    setChatMode(true);
    onHamptonStateChange("thinking");
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

        const currentMessages = messagesRef.current;
        const history = [...currentMessages, userMsg].map((m, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return {
            role: (m.role === "hampton" ? "assistant" : "user") as "assistant" | "user",
            content: m.content,
            ...(isLast && image ? { image: { base64: image.base64, mime: image.mime } } : {}),
          };
        });

        const replyId = crypto.randomUUID();
        let streamedText = "";
        let firstChunk = true;
        replyIdRef.current = replyId;
        streamedTextRef.current = "";
        activeConvoIdRef.current = convoId;

        const useAutonomous = true; // All agents use autonomous loop with tool-calling support

        if (useAutonomous) {
          const toolCallsMap = new Map<string, { id: string; name: string; arguments: Record<string, unknown>; result?: unknown }>();

          cancelStreamRef.current = window.orun.ai.autonomous(history, {
            agentId: activeAgent || undefined,
            onToolCall: (tc) => {
              onHamptonStateChange("thinking");
              toolCallsMap.set(tc.id, { ...tc });
              const toolArray = Array.from(toolCallsMap.values());
              setMessages(p => {
                const exists = p.some(m => m.id === replyId);
                const msg: Message = { id: replyId, role: "hampton", content: "", toolCalls: toolArray };
                return exists ? p.map(m => (m.id === replyId ? msg : m)) : [...p, msg];
              });
            },
            onToolResult: (tr) => {
              const existing = toolCallsMap.get(tr.id);
              if (existing) existing.result = tr.result;
              const toolArray = Array.from(toolCallsMap.values());
              setMessages(p => p.map(m => (m.id === replyId ? { ...m, toolCalls: toolArray } : m)));
            },
            onChunk: (delta) => {
              if (firstChunk) {
                onHamptonStateChange("speaking");
                setMessages(p => [...p, { id: replyId, role: "hampton", content: "" }]);
                firstChunk = false;
              }
              streamedText += delta;
              streamedTextRef.current = streamedText;
              setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: streamedText } : m)));
              speakIncrementalRef.current(streamedText);
            },
            onDone: async (fullText) => {
              setMessages(p => {
                const exists = p.some(m => m.id === replyId);
                return exists ? p.map(m => (m.id === replyId ? { ...m, content: fullText } : m)) : [...p, { id: replyId, role: "hampton", content: fullText }];
              });
              onHamptonStateChange("speaking");
              speakRemainderRef.current(fullText);
              if (activeConvoIdRef.current) await window.orun.conversations.addMessage(activeConvoIdRef.current, { id: replyId, role: "assistant", content: fullText });
              cancelStreamRef.current = null;
              safeTimeout(() => onHamptonStateChange("idle"), 1200);
            },
            onError: (message) => {
              const errText = `${tRef.current("homeErrorAccess")} ${message || ""}`;
              setMessages(p => {
                const exists = p.some(m => m.id === replyId);
                return exists ? p.map(m => (m.id === replyId ? { ...m, content: errText } : m)) : [...p, { id: replyId, role: "hampton", content: errText }];
              });
              cancelStreamRef.current = null;
              onHamptonStateChange("idle");
            },
          });
        } else {
          cancelStreamRef.current = window.orun.ai.chatStream(history, {
            agentId: activeAgent || undefined,
            onChunk: (delta) => {
              if (firstChunk) {
                onHamptonStateChange("speaking");
                setMessages(p => [...p, { id: replyId, role: "hampton", content: "" }]);
                firstChunk = false;
              }
              streamedText += delta;
              streamedTextRef.current = streamedText;
              setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: streamedText } : m)));
              speakIncrementalRef.current(streamedText);
            },
            onDone: async (fullText) => {
              speakRemainderRef.current(fullText);
              if (activeConvoIdRef.current) await window.orun.conversations.addMessage(activeConvoIdRef.current, { id: replyId, role: "assistant", content: fullText });
              cancelStreamRef.current = null;
              safeTimeout(() => onHamptonStateChange("idle"), 1200);
            },
            onError: (message) => {
              const errText = `${tRef.current("homeErrorAccess")} ${message || ""}`;
              setMessages(p => {
                const exists = p.some(m => m.id === replyId);
                return exists ? p.map(m => (m.id === replyId ? { ...m, content: errText } : m)) : [...p, { id: replyId, role: "hampton", content: errText }];
              });
              cancelStreamRef.current = null;
              safeTimeout(() => onHamptonStateChange("idle"), 1200);
            },
          });
        }
      } catch (err: unknown) {
        onHamptonStateChange("idle");
        const errorMsg = err instanceof Error ? err.message : String(err);
        const reply: Message = { id: crypto.randomUUID(), role: "hampton", content: `${tRef.current("homeErrorAccessShort")} ${errorMsg}` };
        setMessages(p => [...p, reply]);
      }
      return;
    }

    // Browser preview fallback
    const hamptonReplies = getHamptonReplies();
    safeTimeout(() => {
      onHamptonStateChange("speaking");
      const reply: Message = { id: crypto.randomUUID(), role: "hampton", content: hamptonReplies[Math.floor(Math.random() * hamptonReplies.length)] };
      setMessages(p => [...p, reply]);
      speakRef.current(reply.content);
      safeTimeout(() => onHamptonStateChange("idle"), 2200);
    }, 1800);
  }, [conversationId, activeAgent, onHamptonStateChange, speak, speakIncremental, speakRemainder, getHamptonReplies]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    const currentMessages = messagesRef.current;
    const idx = currentMessages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const kept = currentMessages.slice(0, idx);
    setMessages(kept);
    if (isElectron && conversationId) await window.orun.conversations.truncateFrom(conversationId, messageId);
    handleSend(newContent);
  }, [conversationId, handleSend]);

  const regenerate = useCallback(async () => {
    const currentMessages = messagesRef.current;
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === "user") {
        const lastUser = currentMessages[i];
        const kept = currentMessages.slice(0, i);
        setMessages(kept);
        if (isElectron && conversationId) await window.orun.conversations.truncateFrom(conversationId, lastUser.id);
        handleSend(lastUser.content);
        return;
      }
    }
  }, [conversationId, handleSend]);

  const stopStreaming = useCallback(async () => {
    if (!cancelStreamRef.current) return;
    cancelStreamRef.current();
    cancelStreamRef.current = null;
    const replyId = replyIdRef.current;
    const finalText = streamedTextRef.current || "(stopped)";
    if (replyId) {
      setMessages(p => p.map(m => (m.id === replyId ? { ...m, content: finalText } : m)));
      if (activeConvoIdRef.current) await window.orun.conversations.addMessage(activeConvoIdRef.current, { id: replyId, role: "assistant", content: finalText });
    }
    onHamptonStateChange("idle");
  }, [onHamptonStateChange]);

  return {
    messages, conversationId, chatMode, activeAgent, isLoadingMessages,
    startNewChat, openConversation, openAgentChat, autoResumeLastConversation,
    handleSend, editMessage, regenerate, stopStreaming,
    setActiveAgent, setChatMode, setConversationId,
    cleanup,
  };
}

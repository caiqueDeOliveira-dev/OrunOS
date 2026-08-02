import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { isElectron } from "../constants";

interface GmailMessage {
  id: string; threadId: string; from: string; to: string;
  subject: string; date: string; snippet: string; body: string;
  labelIds: string[]; internalDate: number;
}

export function EmailPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selected, setSelected] = useState<GmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [analysis, setAnalysis] = useState<{ action: string; summary: string; agent: string; draftReply?: string } | null>(null);
  const [analysing, setAnalysing] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.google.isConnected().then(setConnected);
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!isElectron) return;
    setLoading(true);
    try {
      const list = await window.orun.gmail.listMessages({ maxResults: 20 });
      const full = await Promise.all(list.slice(0, 10).map((m) => window.orun.gmail.getMessage(m.id)));
      setMessages(full.filter(Boolean) as GmailMessage[]);
    } catch { setMessages([]); }
    setLoading(false);
  };

  const handleReply = useCallback(async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await window.orun.gmail.reply(selected.id, replyText);
      setReplyText("");
      setSelected(null);
      loadMessages();
    } catch {}
    setSending(false);
  }, [selected, replyText]);

  const handleAnalyze = useCallback(async (msg: GmailMessage) => {
    setAnalysing(true);
    setAnalysis(null);
    try {
      const result = await window.orun.emailService.analyze(msg.id);
      if ("error" in result) return;
      setAnalysis(result);
      if (result.action === "reply" && result.draftReply) {
        setReplyText(result.draftReply);
      }
    } catch {}
    setAnalysing(false);
  }, []);

  if (!isElectron) return null;

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--foreground)" }}>Email</span>
        {connected && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Conectado</span>}
        <button onClick={loadMessages} className="ml-auto px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>Atualizar</button>
        <button onClick={onClose} className="px-2 py-1 rounded text-[9px]" style={{ color: "var(--muted-foreground)" }}>✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="p-3 space-y-3">
            <button onClick={() => { setSelected(null); setAnalysis(null); setReplyText(""); }} className="text-[9px]" style={{ color: "#C00018" }}>← Voltar</button>

            <div className="p-3 rounded-xl space-y-1" style={{ background: "var(--secondary)" }}>
              <div className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{selected.subject}</div>
              <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{selected.from}</div>
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{new Date(selected.internalDate).toLocaleString("pt-BR")}</div>
            </div>

            <div className="p-3 rounded-xl text-[10px] whitespace-pre-wrap" style={{ background: "var(--secondary)", color: "var(--muted-foreground)", maxHeight: 300, overflow: "auto" }}>
              {selected.body || selected.snippet}
            </div>

            <button
              onClick={() => handleAnalyze(selected)}
              disabled={analysing}
              className="w-full py-1.5 rounded-lg text-[9px]"
              style={{ background: "rgba(192,0,24,0.1)", color: "#C00018" }}
            >
              {analysing ? "Analisando..." : "Analisar com IA"}
            </button>

            {analysis && (
              <div className="p-2.5 rounded-xl space-y-1" style={{ background: "var(--card)" }}>
                <div className="flex gap-2 text-[9px]">
                  <span style={{ color: "var(--muted-foreground)" }}>Ação:</span>
                  <span style={{ color: "#C00018" }}>{analysis.action}</span>
                </div>
                <div className="flex gap-2 text-[9px]">
                  <span style={{ color: "var(--muted-foreground)" }}>Agente:</span>
                  <span style={{ color: "#C00018" }}>{analysis.agent}</span>
                </div>
                <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{analysis.summary}</div>
              </div>
            )}

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta..."
              className="w-full p-2.5 rounded-xl text-[10px] resize-none"
              rows={4}
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <button
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className="w-full py-1.5 rounded-lg text-[9px] disabled:opacity-30"
              style={{ background: "#C00018", color: "#fff" }}
            >
              {sending ? "Enviando..." : "Responder"}
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Carregando...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2">
                <span className="text-lg">📧</span>
                <span className="text-[10px] tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  {connected ? "Nenhum email" : "Conecte o Gmail nas Configurações"}
                </span>
              </div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className="w-full text-left p-2.5 rounded-xl transition-colors"
                  style={{ background: "var(--secondary)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium truncate" style={{ color: "var(--foreground)" }}>{msg.subject}</span>
                    {msg.labelIds.includes("UNREAD") && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#C00018" }} />
                    )}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{msg.from}</div>
                  <div className="text-[9px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>{msg.snippet}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

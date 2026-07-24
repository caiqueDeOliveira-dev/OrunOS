import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { X, Send, CheckCircle2, Loader2, AlertTriangle, Bot, MessageCircle } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import { useToast } from "./Toast";

const AGENTS = [
  { id: "Hampton", label: "Hampton", color: "#C00018" },
  { id: "Health", label: "Health", color: "#E53E3E" },
  { id: "Finance", label: "Finance", color: "#D69E2E" },
  { id: "Developer", label: "Developer", color: "#3B82F6" },
  { id: "Marketing", label: "Marketing", color: "#D53F8C" },
  { id: "Teacher", label: "Teacher", color: "#22C55E" },
  { id: "Designer", label: "Designer", color: "#8B5CF6" },
  { id: "Creator", label: "Creator", color: "#F59E0B" },
];

export function TelegramPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState<string>("disconnected");
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentChats, setAgentChats] = useState<Record<string, string>>({});
  const [testChatId, setTestChatId] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ dailyCount: 0, dailyLimit: 100, queueLength: 0 });

  // Load saved state
  useEffect(() => {
    if (!isElectron) return;
    window.orun.telegram.getToken().then((t) => { if (t) setSavedToken(t); });
    window.orun.telegram.status().then((s) => setStatus(s.status));
    window.orun.telegram.getAgentChats().then((c) => setAgentChats(c));
    window.orun.telegram.getStats().then((s) => setStats(s));
  }, []);

  // Listen for status updates
  useEffect(() => {
    if (!isElectron) return;
    const unsub = window.orun.telegram.onStatusUpdate((data) => {
      setStatus(data.status);
      if (data.status === "connected") {
        setConnecting(false);
        toast.show("Telegram bot conectado!", "success");
      }
      if (data.error) setError(data.error);
    });
    return unsub;
  }, []);

  const connect = useCallback(async () => {
    const tokenToUse = token || savedToken;
    if (!tokenToUse) {
      toast.show("Insira o token do bot", "error");
      return;
    }
    setConnecting(true);
    setError(null);
    await window.orun.telegram.setToken(tokenToUse);
    const result = await window.orun.telegram.connect(tokenToUse);
    if (!result.ok) {
      setError(result.error || "Erro desconhecido");
      setConnecting(false);
      toast.show(`Erro: ${result.error}`, "error");
    } else {
      setSavedToken(tokenToUse);
    }
  }, [token, savedToken]);

  const disconnect = useCallback(async () => {
    await window.orun.telegram.disconnect();
    setStatus("disconnected");
    toast.show("Telegram desconectado", "info");
  }, []);

  const sendTest = useCallback(async () => {
    if (!testChatId || !testMessage) return;
    const result = await window.orun.telegram.sendTest(testChatId, testMessage);
    if (result.ok) toast.show("Mensagem enviada!", "success");
    else toast.show(`Erro: ${result.error}`, "error");
  }, [testChatId, testMessage]);

  const updateAgentChat = useCallback(async (agentId: string, chatId: string) => {
    const updated = { ...agentChats, [agentId]: chatId };
    if (!chatId) delete updated[agentId];
    setAgentChats(updated);
    await window.orun.telegram.setAgentChats(updated);
  }, [agentChats]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-2xl border overflow-hidden flex flex-col"
        style={{ background: "var(--background)", borderColor: "var(--border)", maxHeight: "85vh" }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#3B82F615" }}>
              <Send size={14} style={{ color: "#3B82F6" }} />
            </div>
            <span className="text-sm font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              Telegram Bot
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)" }} aria-label="Fechar Telegram">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            {status === "connected" ? (
              <><CheckCircle2 size={14} style={{ color: "#22C55E" }} /><span className="text-[11px]" style={{ color: "#22C55E" }}>Conectado</span></>
            ) : connecting ? (
              <><Loader2 size={14} className="animate-spin" style={{ color: "#F59E0B" }} /><span className="text-[11px]" style={{ color: "#F59E0B" }}>Conectando...</span></>
            ) : (
              <><AlertTriangle size={14} style={{ color: "var(--muted-foreground)" }} /><span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Desconectado</span></>
            )}
          </div>

          {/* Token Input */}
          <div>
            <label className="text-[10px] tracking-wider uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
              Bot Token (obtido via @BotFather)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={savedToken ? "••••••••••••••••" : "123456:ABC-DEF..."}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>
              Crie um bot com @BotFather no Telegram e cole o token aqui
            </p>
          </div>

          {/* Connect/Disconnect */}
          {status === "connected" ? (
            <button onClick={disconnect} className="w-full py-2.5 rounded-lg text-[10px]" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "#C00018", fontFamily: "'Sora', sans-serif" }}>
              Desconectar
            </button>
          ) : (
            <button onClick={connect} disabled={connecting} className="w-full py-2.5 rounded-lg text-[10px]" style={{ background: "#3B82F6", color: "#fff", fontFamily: "'Sora', sans-serif" }}>
              {connecting ? "Conectando..." : "Conectar Bot"}
            </button>
          )}

          {error && <p className="text-[10px]" style={{ color: "#C00018" }}>{error}</p>}

          {/* Agent Chat Assignment */}
          {status === "connected" && (
            <div>
              <label className="text-[10px] tracking-wider uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                Atribuir Agentes a Chats
              </label>
              <div className="space-y-2">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
                    <span className="text-[10px] w-20" style={{ color: "var(--foreground)", fontFamily: "'Sora', sans-serif" }}>{agent.label}</span>
                    <input
                      type="text"
                      value={agentChats[agent.id] || ""}
                      onChange={(e) => updateAgentChat(agent.id, e.target.value)}
                      placeholder="chat_id"
                      className="flex-1 px-2 py-1 rounded text-[10px] outline-none"
                      style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                Para obter o chat_id, envie uma mensagem ao bot e acesse: https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
              </p>
            </div>
          )}

          {/* Test Message */}
          {status === "connected" && (
            <div>
              <label className="text-[10px] tracking-wider uppercase block mb-2" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                Enviar Mensagem de Teste
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="Chat ID"
                  className="w-full px-3 py-2 rounded-lg text-[10px] outline-none"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendTest()}
                    placeholder="Mensagem de teste"
                    className="flex-1 px-3 py-2 rounded-lg text-[10px] outline-none"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    aria-label="Mensagem de teste para enviar ao bot"
                  />
                  <button onClick={sendTest} className="px-3 py-2 rounded-lg" style={{ background: "#3B82F6", color: "#fff" }} aria-label="Enviar mensagem de teste">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {status === "connected" && (
            <div className="flex gap-4 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              <span>Hoje: {stats.dailyCount}/{stats.dailyLimit} msgs</span>
              <span>Fila: {stats.queueLength}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

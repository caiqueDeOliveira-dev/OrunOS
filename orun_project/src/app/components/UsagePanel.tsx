import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, ArrowLeft, Activity } from "lucide-react";
import { isElectron } from "../constants";
import type { OrunUsageRow, OrunTTSUsageRow } from "../../types/orun";

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama (Local)",
  anthropic: "Claude",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  groq: "Groq",
  github: "GitHub Models",
  opencodezen: "OpenCode Zen",
  elevenlabs: "ElevenLabs",
  google: "Google Cloud TTS",
  azure: "Azure Speech",
  xtts: "XTTS v2",
  piper: "Piper",
  bark: "Bark",
  f5tts: "F5-TTS",
};

export function UsagePanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const [rows, setRows] = useState<OrunUsageRow[]>([]);
  const [ttsRows, setTtsRows] = useState<OrunTTSUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isElectron) { setLoading(false); return; }
    Promise.all([window.orun.ai.usageToday(), window.orun.tts.usageToday()]).then(([r, t]) => {
      setRows(r); setTtsRows(t); setLoading(false);
    });
  }, []);

  const totalRequests = rows.reduce((sum, r) => sum + r.requests, 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[440px] max-h-[80vh] flex flex-col rounded-2xl border overflow-hidden"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#1a1a1a" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} style={{ color: "#666" }}><ArrowLeft size={15} /></button>
            <Activity size={14} style={{ color: "#C00018" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>Uso Hoje</span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {!isElectron && <p className="text-[11px]" style={{ color: "#555" }}>O rastreamento de uso só funciona no aplicativo Electron empacotado.</p>}
          {isElectron && loading && <p className="text-[11px]" style={{ color: "#555" }}>Carregando…</p>}
          {isElectron && !loading && rows.length === 0 && (
            <p className="text-[11px]" style={{ color: "#555" }}>Nenhuma requisição hoje. Envie uma mensagem para Hampton e volte aqui.</p>
          )}
          {rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.provider} className="p-3 rounded-xl border" style={{ borderColor: "#1a1a1a", background: "#111111" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ddd" }}>
                      {PROVIDER_LABELS[r.provider] || r.provider}
                    </span>
                    <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#555" }}>{r.requests} req</span>
                  </div>
                  <div className="flex gap-4 text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#666" }}>
                    <span>in: {r.tokens_in.toLocaleString()}</span>
                    <span>out: {r.tokens_out.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] pt-1" style={{ color: "#444" }}>
                {totalRequests} requisição(ões) no total em todos os providers hoje.
                As contagens de tokens vêm do relatório de cada provider — alguns (como Ollama) só reportam depois que uma resposta termina.
              </p>
            </div>
          )}

          {ttsRows.length > 0 && (
            <div className="mt-5 pt-4 border-t space-y-3" style={{ borderColor: "#1a1a1a" }}>
              <p className="text-[10px] tracking-wider uppercase" style={{ color: "#555" }}>Voz (TTS)</p>
              {ttsRows.map((r) => (
                <div key={r.engine} className="p-3 rounded-xl border" style={{ borderColor: "#1a1a1a", background: "#111111" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ fontFamily: "'Sora', sans-serif", color: "#ddd" }}>{PROVIDER_LABELS[r.engine] || r.engine}</span>
                    <span className="text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#555" }}>{r.requests} calls · {r.characters.toLocaleString()} chars</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

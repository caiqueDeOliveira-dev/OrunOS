import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, MessageCircle, QrCode, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { isElectron } from "../constants";
import type { OrunWhatsAppStatus } from "../../types/orun";

export function WhatsAppPanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<OrunWhatsAppStatus["status"]>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [selfJid, setSelfJid] = useState<string | null>(null);
  const [listenJid, setListenJid] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.whatsapp.status().then(setStatus);
    window.orun.settings.get<{ listenJid?: string }>("whatsapp").then((cfg) => { if (cfg?.listenJid) setListenJid(cfg.listenJid); });
    const offStatus = window.orun.whatsapp.onStatusUpdate((s) => {
      setStatus(s.status);
      setConnecting(false);
      if (s.selfJid) { setSelfJid(s.selfJid); setListenJid((prev) => prev || s.selfJid || ""); }
      if (s.status === "connected") setQr(null);
    });
    const offQR = window.orun.whatsapp.onQR(setQr);
    return () => { offStatus(); offQR(); };
  }, []);

  const connect = async () => {
    setConnecting(true);
    await window.orun.whatsapp.connect();
  };

  const saveListenJid = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("whatsapp", { listenJid });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
        style={{ background: "#0c0c0c", borderColor: "#1e1e1e" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageCircle size={15} style={{ color: "#25D366" }} />
            <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#F5F5F5" }}>WhatsApp</span>
          </div>
          <button onClick={onClose} style={{ color: "#666" }}><X size={16} /></button>
        </div>

        <div className="flex items-start gap-2 mb-5 p-3 rounded-lg" style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)" }}>
          <AlertTriangle size={13} style={{ color: "#ffaa00", flexShrink: 0, marginTop: 1 }} />
          <p className="text-[10px]" style={{ color: "#cc9900" }}>
              Usa uma biblioteca não oficial de protocolo WhatsApp Web (Baileys), não a API oficial da Meta.
              Isso viola os Termos de Serviço do WhatsApp — risco baixo para uso pessoal, mas não zero.
          </p>
        </div>

        {!isElectron && <p className="text-[11px]" style={{ color: "#555" }}>Só funciona no aplicativo Electron empacotado.</p>}

        {isElectron && (
          <>
            {status === "disconnected" && (
              <button onClick={connect} disabled={connecting} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs mb-3" style={{ background: "#151515", border: "1px solid #232323", color: "#aaa" }}>
                {connecting ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                Connect WhatsApp
              </button>
            )}

            {status === "qr" && qr && (
              <div className="text-center mb-4">
                <img src={qr} alt="Scan with WhatsApp" className="mx-auto rounded-lg" style={{ width: 220, height: 220 }} />
                <p className="text-[10px] mt-2" style={{ color: "#555" }}>WhatsApp → Dispositivos conectados → Conectar dispositivo → escaneie isso.</p>
              </div>
            )}

            {status === "connecting" && <p className="text-[11px] mb-3" style={{ color: "#555" }}><Loader2 size={13} className="animate-spin inline mr-1.5" />Conectando…</p>}

            {status === "connected" && (
              <div className="flex items-center gap-1.5 mb-4 text-[11px]" style={{ color: "#2ecc71" }}>
                <CheckCircle2 size={13} /> Conectado{selfJid ? ` como ${selfJid.split("@")[0]}` : ""}
              </div>
            )}

            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>
              Chat que o Orun OS escuta
            </label>
            <input
              value={listenJid} onChange={(e) => setListenJid(e.target.value)} onBlur={saveListenJid}
              placeholder="Preenchido automaticamente com seu próprio chat ao conectar"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p className="text-[10px]" style={{ color: "#444" }}>
              Envie para si mesmo uma foto de comida neste chat e o agente Nutritionist responde com calorias.
              Mensagens de texto vão para Hampton. Apenas este chat é processado.
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

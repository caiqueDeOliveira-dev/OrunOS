import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, MessageCircle, QrCode, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Users, Send } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunWhatsAppStatus } from "../../types/orun";

const AGENT_GROUPS = [
  { id: "Nutritionist", label: "Nutricionista", color: "#2ecc71", desc: "Fotos de comida → análise nutricional" },
  { id: "Personal Trainer", label: "Personal Trainer", color: "#e67e22", desc: "Treinos e atividades físicas" },
  { id: "Personal Assistant", label: "Assistente Pessoal", color: "#3498db", desc: "Agenda e compromissos diários" },
  { id: "Social Media", label: "Redes Sociais", color: "#9b59b6", desc: "Conteúdo para Instagram, TikTok e X" },
];

export function WhatsAppPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<OrunWhatsAppStatus["status"]>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [selfJid, setSelfJid] = useState<string | null>(null);
  const [listenJid, setListenJid] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentJids, setAgentJids] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<{ jid: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [testingAgent, setTestingAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.whatsapp.status().then(setStatus);
    window.orun.settings.get<{ listenJid?: string }>("whatsapp").then((cfg) => { if (cfg?.listenJid) setListenJid(cfg.listenJid); });
    window.orun.whatsapp.getAgentJids().then(setAgentJids);

    const loadGroups = async () => {
      setLoadingGroups(true);
      const g = await window.orun.whatsapp.listGroups();
      setGroups(g);
      setLoadingGroups(false);
    };
    // Load groups when connected
    if (status === "connected") loadGroups();

    const offStatus = window.orun.whatsapp.onStatusUpdate((s) => {
      setStatus(s.status);
      setConnecting(false);
      setError(null);
      if (s.selfJid) { setSelfJid(s.selfJid); setListenJid((prev) => prev || s.selfJid || ""); }
      if (s.status === "connected") setQr(null);
      if (s.status === "disconnected" && s.loggedOut) {
        setError("Sessão expirada. Clique Conectar para escanear um novo QR Code.");
      }
      if (s.groupsRefreshed) {
        window.orun.whatsapp.listGroups().then((g) => { setGroups(g); setLoadingGroups(false); });
      }
    });
    const offQR = window.orun.whatsapp.onQR((dataUrl) => {
      if (dataUrl) {
        setQr(dataUrl);
        setError(null);
      } else {
        setError("Falha ao gerar QR Code. Clique Conectar para tentar novamente.");
      }
    });
    return () => { offStatus(); offQR(); };
  }, []);

  const connect = async () => {
    setConnecting(true);
    setQr(null);
    setError(null);
    await window.orun.whatsapp.connect();
  };

  const saveListenJid = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("whatsapp", { listenJid });
  };

  const saveAgentJid = async (agentId: string, jid: string) => {
    const next = { ...agentJids, [agentId]: jid };
    setAgentJids(next);
    if (isElectron) await window.orun.whatsapp.setAgentJids(next);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[480px] max-h-[88vh] overflow-y-auto rounded-2xl p-6 border scrollbar-hide"
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
            {t("whatsappDisclaimer1")}
            {t("whatsappDisclaimer2")}
          </p>
        </div>

        {!isElectron && <p className="text-[11px]" style={{ color: "#555" }}>{t("whatsappBrowserWarning")}</p>}

        {isElectron && (
          <>
            {status === "disconnected" && (
              <button onClick={connect} disabled={connecting} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs mb-3" style={{ background: "#151515", border: "1px solid #232323", color: "#aaa" }}>
                {connecting ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                Conectar WhatsApp
              </button>
            )}

            {error && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(192,0,24,0.08)", border: "1px solid rgba(192,0,24,0.2)" }}>
                <AlertTriangle size={13} style={{ color: "#C00018", flexShrink: 0 }} />
                <p className="text-[11px] flex-1" style={{ color: "#C00018" }}>{error}</p>
                <button onClick={connect} className="p-1 rounded" style={{ color: "#888" }} title="Retry">
                  <RefreshCw size={12} />
                </button>
              </div>
            )}

            {qr && status !== "connected" && (
              <div className="text-center mb-4">
                <img src={qr} alt="Escaneie com o WhatsApp" className="mx-auto rounded-lg" style={{ width: 220, height: 220 }} />
                <p className="text-[10px] mt-2" style={{ color: "#555" }}>{t("whatsappScanInstruction")}</p>
              </div>
            )}

            {status === "connecting" && !qr && !error && <p className="text-[11px] mb-3" style={{ color: "#555" }}><Loader2 size={13} className="animate-spin inline mr-1.5" />{t("whatsappConnecting")}</p>}

            {status === "connected" && (
              <div className="flex items-center gap-1.5 mb-4 text-[11px]" style={{ color: "#2ecc71" }}>
                <CheckCircle2 size={13} /> Conectado{selfJid ? ` como ${selfJid.split("@")[0]}` : ""}
              </div>
            )}

            {/* Agent Group Configuration */}
            {status === "connected" && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={13} style={{ color: "#25D366" }} />
                  <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>Seus Grupos</span>
                  <button onClick={async () => { setLoadingGroups(true); setGroups(await window.orun.whatsapp.listGroups()); setLoadingGroups(false); }}
                    className="ml-auto p-1 rounded" style={{ color: "#666" }} title="Atualizar lista">
                    <RefreshCw size={11} className={loadingGroups ? "animate-spin" : ""} />
                  </button>
                </div>
                {groups.length === 0 && !loadingGroups && (
                  <p className="text-[10px] mb-3" style={{ color: "#555" }}>Nenhum grupo encontrado. Crie grupos no WhatsApp e clique atualizar.</p>
                )}
                {groups.length > 0 && (
                  <div className="mb-3 max-h-[120px] overflow-y-auto scrollbar-hide rounded-lg" style={{ background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                    {groups.map((g) => (
                      <div key={g.jid} className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#151515" }}>
                        <span className="text-[11px] flex-1 truncate" style={{ color: "#ddd" }}>{g.name}</span>
                        <span className="text-[9px] truncate" style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace", maxWidth: 180 }}>{g.jid}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="h-px my-3" style={{ background: "#1a1a1a" }} />

                <div className="flex items-center gap-2 mb-2">
                  <Users size={13} style={{ color: "#25D366" }} />
                  <span className="text-xs tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "#ccc" }}>Grupos por Agente</span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: "#555" }}>
                  Copie o JID da lista acima e cole no campo do agente correspondente.
                </p>
                <div className="space-y-2">
                  {AGENT_GROUPS.map((agent) => (
                    <div key={agent.id} className="px-3 py-2 rounded-lg" style={{ background: "#111111", border: "1px solid #1e1e1e" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
                        <span className="text-[11px]" style={{ fontFamily: "'Sora', sans-serif", color: "#ddd" }}>{agent.label}</span>
                        <span className="text-[9px]" style={{ color: "#555" }}>— {agent.desc}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          value={agentJids[agent.id] || ""}
                          onChange={(e) => saveAgentJid(agent.id, e.target.value)}
                          placeholder={`${agent.id}@g.us`}
                          className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] outline-none"
                          style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", color: "#ddd", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                        {agentJids[agent.id] && (
                          <button
                            onClick={async () => {
                              setTestingAgent(agent.id);
                              const r = await window.orun.whatsapp.testGroup(agentJids[agent.id], agent.label);
                              setTestingAgent(null);
                              if (r.ok) alert(`Mensagem de teste enviada para ${agent.label}!`);
                              else alert(`Erro: ${r.error}`);
                            }}
                            disabled={testingAgent !== null}
                            className="px-2 py-1 rounded-md text-[10px] flex items-center gap-1"
                            style={{ background: "#1a1a1a", border: "1px solid #232323", color: "#25D366" }}
                            title={`Enviar mensagem de teste para ${agent.label}`}
                          >
                            {testingAgent === agent.id ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                            Testar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] mt-2" style={{ color: "#444" }}>
                  Para obter o JID de um grupo: abra o grupo no WhatsApp → toque no nome do grupo → role até o final → o código é o JID.
                </p>
              </div>
            )}

            {/* Legacy listen Jid */}
            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#555" }}>
              Chat Pessoal (opcional)
            </label>
            <input
              value={listenJid} onChange={(e) => setListenJid(e.target.value)} onBlur={saveListenJid}
              placeholder={t("whatsappAutoFill")}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
              style={{ background: "#111111", border: "1px solid #1e1e1e", color: "#E0E0E0", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <p className="text-[10px]" style={{ color: "#444" }}>
              Chat pessoal para mensagens diretas (opcional se já configurou os grupos acima).
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

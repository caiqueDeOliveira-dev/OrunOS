import { useState, useEffect } from "react";
import { Settings, RefreshCw, Link2, Check, X, Castle, MessageSquare, VolumeX } from "lucide-react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceBadge } from "../../../components/WorkspaceBadge";
import { WorkspaceButton } from "../../../components/WorkspaceButton";
import { WorkspaceInput } from "../../../components/WorkspaceInput";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";
import { P } from "../../premium";
import type { DiscordState } from "../marketing-types";

export function DiscordView() {
  const { t } = useTranslation();
  const discord = useMarketingStore((s) => s.discord);
  const [token, setToken] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployLog, setDeployLog] = useState<{ at: number; commands: number; results: Array<{ guild: { id: string; name: string }; ok: boolean; error?: string; commands?: number }> } | null>(null);

  const addLog = (msg: string) => setLogs((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`]);

  const refreshStatus = async () => {
    try {
      const status = await window.orun?.discord?.getStatus();
      if (status) {
        const store = useMarketingStore;
        store.setState?.((s: any) => ({
          discord: { ...s.discord, status: status as DiscordState["status"] },
        }));
      }
      const enabled = await window.orun?.discord?.getAgentResponse();
      if (enabled !== undefined) {
        const store = useMarketingStore;
        store.setState?.((s: any) => ({
          discord: { ...s.discord, autoResponse: enabled },
        }));
      }
      const log = await window.orun?.discord?.getDeployLog();
      if (log) setDeployLog(log);
    } catch {}
  };

  useEffect(() => {
    refreshStatus();
    let unsub: (() => void) | null = null;
    if (window.orun?.discord?.onStatusUpdate) {
      unsub = window.orun.discord.onStatusUpdate((status: string) => {
        const store = useMarketingStore;
        store.setState?.((s: any) => ({
          discord: { ...s.discord, status: status as DiscordState["status"] },
        }));
      });
    }
    return () => { if (unsub) unsub(); };
  }, []);

  const handleConnect = async () => {
    if (!token) return;
    const store = useMarketingStore;
    store.setState?.((s: any) => ({
      discord: { ...s.discord, status: "connecting" },
    }));
    addLog(t("Conectando ao Discord..."));
    try {
      await window.orun?.discord?.setToken(token);
      const result = await window.orun?.discord?.connect(token);
      if (result?.ok) {
        addLog(t("Conectado com sucesso"));
        const guilds = await window.orun?.discord?.getGuilds();
        if (guilds) {
          store.setState?.((s: any) => ({
            discord: { ...s.discord, guilds, status: "connected" },
          }));
          addLog(`${guilds.length} ${t("servidor(es) encontrado(s)")}`);
        }
      } else {
        store.setState?.((s: any) => ({
          discord: { ...s.discord, status: "error" },
        }));
        addLog(t("Falha ao conectar") + (result?.error ? `: ${result.error}` : ""));
      }
    } catch (e: any) {
      store.setState?.((s: any) => ({
        discord: { ...s.discord, status: "error" },
      }));
      addLog(t("Erro") + `: ${e.message}`);
    }
  };

  const handleDisconnect = async () => {
    addLog(t("Desconectando..."));
    try {
      await window.orun?.discord?.disconnect();
      const store = useMarketingStore;
      store.setState?.((s: any) => ({
        discord: { status: "disconnected" as const, guilds: [], selectedGuildId: null, channels: [], selectedChannelId: null, autoResponse: false },
      }));
      addLog(t("Desconectado"));
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
  };

  const handleSelectGuild = async (guildId: string) => {
    const store = useMarketingStore;
    store.setState?.((s: any) => ({
      discord: { ...s.discord, selectedGuildId: guildId, channels: [], selectedChannelId: null },
    }));
    addLog(t("Carregando canais..."));
    try {
      const channels = await window.orun?.discord?.getChannels(guildId);
      if (channels) {
        const textChannels = channels.filter((c: any) => c.type === 0);
        store.setState?.((s: any) => ({
          discord: { ...s.discord, channels: textChannels },
        }));
        addLog(`${textChannels.length} ${t("canais de texto")}`);
      }
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText || !discord.selectedChannelId) return;
    setSending(true);
    try {
      const result = await window.orun?.discord?.sendMessage(discord.selectedChannelId, messageText);
      if (result?.ok) {
        addLog(t("Mensagem enviada"));
        setMessageText("");
      } else {
        addLog(t("Falha ao enviar") + (result?.error ? `: ${result.error}` : ""));
      }
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
    setSending(false);
  };

  const handleToggleAutoResponse = async () => {
    const newVal = !discord.autoResponse;
    try {
      await window.orun?.discord?.setAgentResponse(newVal);
      const store = useMarketingStore;
      store.setState?.((s: any) => ({
        discord: { ...s.discord, autoResponse: newVal },
      }));
      addLog(newVal ? t("Auto-resposta ativada") : t("Auto-resposta desativada"));
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
  };

  const handleGetInviteUrl = async () => {
    try {
      const res = await window.orun?.discord?.getInviteUrl();
      if (res?.ok && res.url) {
        setInviteUrl(res.url);
        addLog(`${t("Link de convite gerado")} (scopes: ${(res.scopes || []).join(" + ")})`);
      } else {
        addLog(t("Não foi possível gerar o link (bot desconectado?)"));
      }
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      addLog(t("Falha ao copiar link"));
    }
  };

  const handleRedeploy = async () => {
    setDeploying(true);
    addLog(t("Reenviando comandos slash..."));
    try {
      const res = await window.orun?.discord?.redeployCommands();
      if (res?.ok) {
        addLog(`${t("Comandos enviados para")} ${res.deployed ?? 0} ${t("servidor(es)")}`);
      } else {
        addLog(t("Falha ao reenviar") + (res?.error ? `: ${res.error}` : ""));
      }
      const log = await window.orun?.discord?.getDeployLog();
      if (log) setDeployLog(log);
    } catch (e: any) {
      addLog(t("Erro") + `: ${e.message}`);
    }
    setDeploying(false);
  };

  const statusColors: Record<string, string> = {
    disconnected: P.sub,
    connecting: "var(--warn)",
    connected: "var(--ok)",
    error: "var(--err)",
  };

  const statusLabels: Record<string, string> = {
    disconnected: t("Desconectado"),
    connecting: t("Conectando..."),
    connected: t("Conectado"),
    error: t("Erro"),
  };

  if (discord.status !== "connected") {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: statusColors[discord.status] }} />
          <span className="text-[10px]" style={{ color: statusColors[discord.status] }}>{statusLabels[discord.status]}</span>
          {discord.status === "disconnected" && (
            <WorkspaceButton onClick={refreshStatus} variant="ghost" size="sm">{t("Atualizar")}</WorkspaceButton>
          )}
        </div>

        {discord.status === "error" && (
          <WorkspaceCard>
            <p className="text-[10px] text-red-400">{t("Falha na conexão. Verifique o token e tente novamente.")}</p>
          </WorkspaceCard>
        )}

        <WorkspaceCard>
          <div className="space-y-2">
            <WorkspaceInput
              type="password"
              placeholder={t("Token do bot Discord")}
              value={token}
              onChange={setToken}
            />
            <WorkspaceButton onClick={handleConnect} variant="primary" size="sm" disabled={!token || discord.status === "connecting"}>
              {t("Conectar")}
            </WorkspaceButton>
          </div>
        </WorkspaceCard>

        <p className="text-[9px]" style={{ color: P.sub }}>
          {t("Insira o token do seu bot Discord para gerenciar servidores e canais de marketing")}
        </p>

        {logs.length > 0 && (
          <div className="mt-2 p-2 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[9px] font-medium mb-1" style={{ color: P.sub }}>{t("Log")}</p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto ws-scrollbar">
              {logs.map((log, i) => (
                <p key={i} className="text-[8px]" style={{ color: P.sub, fontFamily: "'JetBrains Mono', monospace" }}>{log}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const selectedGuild = discord.guilds.find((g) => g.id === discord.selectedGuildId);
  const selectedChannel = discord.channels.find((c) => c.id === discord.selectedChannelId);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: statusColors[discord.status] }} />
          <span className="text-[10px]" style={{ color: statusColors[discord.status] }}>{statusLabels[discord.status]}</span>
          <WorkspaceBadge variant="green">{`${String(discord.guilds.length)} ${t("servidores")}`}</WorkspaceBadge>
        </div>
        <div className="flex gap-1">
          <label className="flex items-center gap-1.5 text-[9px]" style={{ color: P.sub }}>
            <input
              type="checkbox"
              checked={discord.autoResponse}
              onChange={handleToggleAutoResponse}
              className="w-3 h-3 accent-red-600"
            />
            {t("Auto-resposta")}
          </label>
          <WorkspaceButton onClick={handleDisconnect} variant="ghost" size="sm">{t("Desconectar")}</WorkspaceButton>
        </div>
      </div>

      <WorkspaceCard>
        <p className="text-[9px] font-medium mb-1 flex items-center gap-1" style={{ color: P.sub }}>
          <Settings size={11} strokeWidth={1.8} /> {t("Comandos slash")}
        </p>
        <div className="flex gap-1 flex-wrap">
          <WorkspaceButton onClick={handleRedeploy} variant="primary" size="sm" disabled={deploying}>
            {deploying ? t("Enviando...") : (
              <span className="flex items-center gap-1"><RefreshCw size={10} />{t("Reenviar comandos")}</span>
            )}
          </WorkspaceButton>
          <WorkspaceButton onClick={handleGetInviteUrl} variant="ghost" size="sm">
            <span className="flex items-center gap-1"><Link2 size={10} />{t("Link de convite")}</span>
          </WorkspaceButton>
        </div>

        {inviteUrl && (
          <div className="mt-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <p className="text-[8px] break-all" style={{ color: P.dim, fontFamily: "'JetBrains Mono', monospace" }}>
              {inviteUrl}
            </p>
            <div className="mt-1">
              <WorkspaceButton onClick={handleCopyInvite} variant="ghost" size="sm">
                {inviteCopied ? t("Copiado!") : t("Copiar link")}
              </WorkspaceButton>
            </div>
          </div>
        )}

        {deployLog && (
          <div className="mt-2 p-2 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[8px]" style={{ color: P.sub }}>
              {t("Último deploy")}: {new Date(deployLog.at).toLocaleString("pt-BR")} — {deployLog.commands} {t("comandos")}
            </p>
            <div className="space-y-0.5 max-h-20 overflow-y-auto ws-scrollbar mt-1">
              {deployLog.results.map((r) => (
                <p key={r.guild.id} className="text-[8px] flex items-center gap-1" style={{ color: r.ok ? "var(--ok)" : "var(--err)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {r.ok ? <Check size={9} strokeWidth={2.5} /> : <X size={9} strokeWidth={2.5} />} {r.guild.name}: {r.ok ? `${r.commands} ${t("comandos")}` : (r.error || "erro")}
                </p>
              ))}
            </div>
          </div>
        )}
      </WorkspaceCard>

      <div className="grid grid-cols-2 gap-2">
        <WorkspaceCard>
          <p className="text-[9px] font-medium mb-1" style={{ color: P.sub }}>{t("Servidores")}</p>
          {discord.guilds.length === 0 ? (
            <WorkspaceEmptyState icon={<Castle size={14} color="var(--primary)" strokeWidth={1.6} />} message={t("Nenhum servidor")} />
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto ws-scrollbar">
              {discord.guilds.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGuild(g.id)}
                  className="w-full text-left px-2 py-1.5 rounded text-[9px] transition-colors"
                  style={{
                    background: discord.selectedGuildId === g.id ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                    color: discord.selectedGuildId === g.id ? P.text : P.sub,
                  }}
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-1 opacity-60">{String(g.memberCount)} membros</span>
                </button>
              ))}
            </div>
          )}
        </WorkspaceCard>

        <WorkspaceCard>
          <p className="text-[9px] font-medium mb-1" style={{ color: P.sub }}>
            {selectedGuild ? `${t("Canais")} — ${selectedGuild.name}` : t("Canais")}
          </p>
          {!discord.selectedGuildId ? (
            <WorkspaceEmptyState icon={<MessageSquare size={14} color="var(--primary)" strokeWidth={1.6} />} message={t("Selecione um servidor")} />
          ) : discord.channels.length === 0 ? (
            <WorkspaceEmptyState icon={<VolumeX size={14} color="var(--primary)" strokeWidth={1.6} />} message={t("Nenhum canal de texto")} />
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto ws-scrollbar">
              {discord.channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    const store = useMarketingStore;
                    store.setState?.((s: any) => ({
                      discord: { ...s.discord, selectedChannelId: ch.id },
                    }));
                  }}
                  className="w-full text-left px-2 py-1 rounded text-[9px] transition-colors"
                  style={{
                    background: discord.selectedChannelId === ch.id ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                    color: discord.selectedChannelId === ch.id ? P.text : P.sub,
                  }}
                >
                  # {ch.name}
                </button>
              ))}
            </div>
          )}
        </WorkspaceCard>
      </div>

      <WorkspaceCard>
        <p className="text-[9px] font-medium mb-1" style={{ color: P.sub }}>
          {selectedChannel ? `#${selectedChannel.name}` : t("Selecione um canal para enviar mensagem")}
        </p>
        <div className="space-y-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={t("Digite sua mensagem...")}
            className="w-full text-[10px] rounded-md px-2 py-1.5 resize-none"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: P.text, minHeight: 50 }}
            disabled={!discord.selectedChannelId}
          />
          <WorkspaceButton
            onClick={handleSendMessage}
            variant="primary"
            size="sm"
            disabled={!messageText || !discord.selectedChannelId || sending}
          >
            {sending ? t("Enviando...") : t("Enviar")}
          </WorkspaceButton>
        </div>
      </WorkspaceCard>

      {logs.length > 0 && (
        <div className="p-2 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
          <p className="text-[9px] font-medium mb-1" style={{ color: P.sub }}>{t("Log")}</p>
          <div className="space-y-0.5 max-h-24 overflow-y-auto ws-scrollbar">
            {logs.map((log, i) => (
              <p key={i} className="text-[8px]" style={{ color: P.sub, fontFamily: "'JetBrains Mono', monospace" }}>{log}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

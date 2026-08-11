import { useEffect, useState } from "react";
import { Users, RefreshCw, Loader2, Link2, Plus, Check, Volume2, MessageCircle } from "lucide-react";

const AGENTS = [
  "Health",
  "Finance",
  "Marketing",
  "Developer",
  "Teacher",
  "Creator",
  "Designer",
  "Personal Assistant",
  "Nutritionist",
  "Social Media",
  "Personal Trainer",
  "Home IA",
  "Hampton",
];

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-3">
      <span className="text-[10px] tracking-wider uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
        {title}
      </span>
      {desc && <span className="text-[10px] block mt-0.5" style={{ color: "var(--muted-foreground)" }}>{desc}</span>}
    </div>
  );
}

export function ProfilesPanel({ t }: { t: (key: string) => string }) {
  const [users, setUsers] = useState<OrunUser[]>([]);
  const [pending, setPending] = useState<OrunUserIdentity[]>([]);
  const [channels, setChannels] = useState<OrunAgentChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState<Record<string, string>>({});
  const [linkTarget, setLinkTarget] = useState<Record<string, string>>({});
  const [newChannel, setNewChannel] = useState({ provider: "whatsapp", externalChannelId: "", agent: "Health" });
  const [voice, setVoice] = useState<Record<string, OrunAgentVoiceSettings | null>>({});

  async function reload() {
    setLoading(true);
    const [u, p, c] = await Promise.all([
      window.orun.identity?.listUsers?.().catch(() => []),
      window.orun.identity?.listIdentities?.({ pendingOnly: true }).catch(() => []),
      window.orun.identity?.listChannels?.().catch(() => []),
    ]);
    setUsers(u ?? []);
    setPending(p ?? []);
    setChannels(c ?? []);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    Promise.all(
      AGENTS.map(async (agent) => {
        const v = await window.orun.identity?.getVoiceSettings?.(agent).catch(() => null);
        setVoice((prev) => ({ ...prev, [agent]: v ?? null }));
      })
    );
  }, []);

  async function completeOnboarding(id: string) {
    const name = (nameInput[id] || "").trim();
    if (!name) return;
    setBusy(id);
    try {
      await window.orun.identity?.completeOnboarding?.({ identityId: id, name });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function linkIdentity(id: string) {
    const userId = linkTarget[id];
    if (!userId) return;
    setBusy(id);
    try {
      await window.orun.identity?.linkIdentity?.({ identityId: id, userId });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function addChannel() {
    const ext = newChannel.externalChannelId.trim();
    if (!ext || !newChannel.agent) return;
    setBusy("channel");
    try {
      await window.orun.identity?.setChannel?.({
        provider: newChannel.provider,
        externalChannelId: ext,
        agent: newChannel.agent,
      });
      setNewChannel((prev) => ({ ...prev, externalChannelId: "" }));
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function toggleChannel(c: OrunAgentChannel) {
    await window.orun.identity?.setChannelEnabled?.({ provider: c.provider, externalChannelId: c.external_channel_id, enabled: !Boolean(c.enabled) });
    reload();
  }

  async function setAgentVoice(agent: string, patch: Partial<OrunAgentVoiceSettings>) {
    const next = await window.orun.identity?.setVoiceSettings?.(agent, patch);
    setVoice((prev) => ({ ...prev, [agent]: next ?? null }));
  }

  const buttonStyle: React.CSSProperties = {
    background: "var(--secondary)",
    border: "1px solid var(--border)",
    color: "var(--muted-foreground)",
    fontFamily: "'Sora', sans-serif",
  };

  return (
    <div className="space-y-5">
      {/* Usuários */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#C0001815" }}>
            <Users size={12} style={{ color: "#C00018" }} />
          </div>
          <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            {t("profilesUsersTitle")}
          </span>
          <button onClick={reload} className="ml-auto p-1 rounded-md" style={buttonStyle} aria-label="refresh">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </button>
        </div>
        <SectionTitle title={t("profilesUsersTitle")} desc={t("profilesUsersDesc")} />
        {users.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("profilesNoData")}</p>
        ) : (
          <div className="space-y-1.5">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: "rgba(192,0,24,0.15)", color: "#FF1A2D" }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] block truncate" style={{ color: "var(--foreground)" }}>{u.name}</span>
                  <span className="text-[9px] block truncate" style={{ color: "var(--muted-foreground)" }}>{u.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboarding */}
      <div className="mb-5">
        <SectionTitle title={t("profilesPendingTitle")} desc={t("profilesPendingDesc")} />
        {pending.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("profilesNoPending")}</p>
        ) : (
          <div className="space-y-1.5">
            {pending.map((id) => (
              <div key={id.id} className="px-3 py-2 rounded-lg space-y-2" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <MessageCircle size={12} style={{ color: "#22C55E" }} />
                  <span className="text-[10px] truncate flex-1" style={{ color: "var(--foreground)" }}>
                    {id.provider} · {id.provider_user_id}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    value={nameInput[id.id] || ""}
                    onChange={(e) => setNameInput((prev) => ({ ...prev, [id.id]: e.target.value }))}
                    placeholder={t("profilesName")}
                    className="flex-1 px-2 py-1 rounded-md text-[10px] outline-none"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    onClick={() => completeOnboarding(id.id)}
                    disabled={busy === id.id || !(nameInput[id.id] || "").trim()}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                    style={{ background: "#C00018", color: "#fff" }}
                  >
                    {busy === id.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                    {t("profilesCompleteOnboarding")}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={linkTarget[id.id] || ""}
                    onChange={(e) => setLinkTarget((prev) => ({ ...prev, [id.id]: e.target.value }))}
                    className="flex-1 px-2 py-1 rounded-md text-[10px] outline-none"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  >
                    <option value="">{t("profilesSelectUser")}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => linkIdentity(id.id)}
                    disabled={busy === id.id || !linkTarget[id.id]}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                    style={buttonStyle}
                  >
                    <Link2 size={10} />
                    {t("profilesLinkIdentity")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Canais dos agentes */}
      <div className="mb-5">
        <SectionTitle title={t("profilesChannelsTitle")} desc={t("profilesChannelsDesc")} />
        {channels.length === 0 ? (
          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("profilesNoData")}</p>
        ) : (
          <div className="space-y-1.5">
            {channels.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <input
                  type="checkbox"
                  checked={Boolean(c.enabled)}
                  onChange={() => toggleChannel(c)}
                  className="accent-[#C00018] w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] block truncate" style={{ color: "var(--foreground)" }}>{c.external_channel_id}</span>
                  <span className="text-[9px] block" style={{ color: "var(--muted-foreground)" }}>{c.provider} · {c.name || "—"}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(192,0,24,0.12)", color: "#FF1A2D" }}>
                  {t("profilesChannelAgent")}: {c.agent}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <select
            value={newChannel.provider}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, provider: e.target.value }))}
            className="px-2 py-1 rounded-md text-[10px] outline-none"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
          <input
            value={newChannel.externalChannelId}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, externalChannelId: e.target.value }))}
            placeholder={`${t("profilesChannelGroup")} (jid)`}
            className="flex-1 px-2 py-1 rounded-md text-[10px] outline-none"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
          <select
            value={newChannel.agent}
            onChange={(e) => setNewChannel((prev) => ({ ...prev, agent: e.target.value }))}
            className="px-2 py-1 rounded-md text-[10px] outline-none"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={addChannel}
            disabled={busy === "channel" || !newChannel.externalChannelId.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
            style={{ background: "#C00018", color: "#fff" }}
          >
            {busy === "channel" ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          </button>
        </div>
      </div>

      {/* Voz por agente */}
      <div className="mb-5">
        <SectionTitle title={t("profilesVoiceTitle")} desc={t("profilesVoiceDesc")} />
        <div className="grid grid-cols-1 gap-1.5">
          {AGENTS.map((agent) => {
            const v = voice[agent];
            return (
              <div key={agent} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <Volume2 size={12} style={{ color: "var(--muted-foreground)" }} />
                <span className="text-[11px] flex-1" style={{ color: "var(--foreground)" }}>{agent}</span>
                <input
                  type="checkbox"
                  checked={Boolean(v?.enabled)}
                  onChange={(e) => setAgentVoice(agent, { enabled: e.target.checked })}
                  className="accent-[#C00018] w-4 h-4"
                  title={t("profilesVoiceEnabled")}
                />
                <select
                  value={v?.responseMode || "AUTO"}
                  onChange={(e) => setAgentVoice(agent, { responseMode: e.target.value as OrunAgentVoiceSettings["responseMode"] })}
                  className="px-2 py-1 rounded-md text-[9px] outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  disabled={!v?.enabled}
                >
                  <option value="AUTO">{t("profilesVoiceModeAuto")}</option>
                  <option value="ALWAYS_TEXT">{t("profilesVoiceModeText")}</option>
                  <option value="ALWAYS_AUDIO">{t("profilesVoiceModeAudio")}</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

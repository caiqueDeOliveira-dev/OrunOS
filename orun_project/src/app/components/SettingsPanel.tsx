import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Cpu, Cloud, CheckCircle2, XCircle, Loader2, RefreshCw, Users, Activity, MessageCircle, Globe, Sparkles, Volume2, Shield, Palette, Bot, Plug, ChevronRight, Zap, Mic, Music, Send, Database, Download, Upload, LifeBuoy, TreePine, Waves, CupSoda, Flame, Ear, Award, Mail, Calendar, Keyboard, Server, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { LANGUAGE_OPTIONS, type Language } from "../../i18n/translations";
import { isElectron } from "../constants";
import type { OrunProvider } from "../../types/orun";
import { useTheme } from "../contexts/ThemeContext";
import { startSound, stopSound, setVolume, stopAll, getActiveSounds, AMBIENT_SOUNDS } from "../services/ambientSounds";
import { ThemeToggle } from "./ThemeToggle";
import { EncryptionToggle } from "./EncryptionToggle";
import { AutoBackup } from "../services/autoBackup";
import { ProfilesPanel } from "./ProfilesPanel";
import { ShieldPanel } from "./ShieldPanel";
import { OptimizerPanel } from "./OptimizerPanel";

const PROVIDER_INFO: Record<OrunProvider, { label: string; kind: "local" | "cloud"; defaultModel: string; note?: string }> = {
  ollama: { label: "Ollama (local)", kind: "local", defaultModel: "llama3.1", note: "Roda no seu PC. Privado e gratuito." },
  ollama_cloud: { label: "Ollama Cloud", kind: "cloud", defaultModel: "gpt-oss:120b", note: "API hospedada em ollama.com (mesmos modelos do local, pagos)" },
  anthropic: { label: "Claude", kind: "cloud", defaultModel: "claude-sonnet-4-6" },
  openai: { label: "OpenAI", kind: "cloud", defaultModel: "gpt-4o-mini" },
  openrouter: { label: "OpenRouter", kind: "cloud", defaultModel: "openai/gpt-4o-mini", note: "Pago por token (sem free tier global)" },
  groq: { label: "Groq", kind: "cloud", defaultModel: "llama-3.3-70b-versatile", note: "Free tier, very fast inference" },
  github: { label: "GitHub Models", kind: "cloud", defaultModel: "openai/gpt-4o", note: "Free with a GitHub personal access token (models: read scope)" },
  opencodezen: { label: "OpenCode Zen", kind: "cloud", defaultModel: "deepseek-v4-flash-free", note: "Free com conta OpenCode Zen" },
  nvidia: { label: "NVIDIA NIM", kind: "cloud", defaultModel: "meta/llama-3.1-70b-instruct", note: "5k créditos free/mês em build.nvidia.com (Llama, Mistral, Gemma, DeepSeek, Nemotron)" },
};

// ── Section Component ───────────────────────────────────────────────────

function Section({ title, icon: Icon, children, accent }: { title: string; icon: React.ElementType; children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${accent || "#C00018"}15` }}>
          <Icon size={12} style={{ color: accent || "#C00018" }} />
        </div>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          {title}
        </span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

// ── Setting Row ─────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      <div className="flex-1 min-w-0 mr-3">
        <span className="text-[11px] block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{label}</span>
        {description && <span className="text-[9px] block mt-0.5" style={{ color: "var(--muted-foreground)" }}>{description}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Voice Settings Toggle ───────────────────────────────────────────────

function VoiceToggle({ settingKey, defaultValue }: { settingKey: string; defaultValue: boolean }) {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    window.orun?.settings?.get<{ [key: string]: boolean }>("voice").then((v) => {
      if (v && settingKey in v) setEnabled(Boolean(v[settingKey]));
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, [settingKey]);

  const handleToggle = () => {
    const newVal = !enabled;
    setEnabled(newVal);
    window.orun?.settings?.get("voice").then((existing: any) => {
      window.orun?.settings?.set("voice", { ...(existing || {}), [settingKey]: newVal });
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  };

  return (
    <button
      onClick={handleToggle}
      className="relative w-10 h-5 rounded-full transition-all"
      style={{ background: enabled ? "#C00018" : "var(--switch-background)" }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: enabled ? "22px" : "2px" }}
      />
    </button>
  );
}

// ── Response Delay Slider ──────────────────────────────────────────────

function ResponseDelaySlider() {
  const [delay, setDelay] = useState(1200);

  useEffect(() => {
    window.orun?.settings?.get<{ responseDelay?: number }>("voice").then((v) => {
      if (v && typeof v.responseDelay === "number") setDelay(v.responseDelay);
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const handleChange = (value: number) => {
    setDelay(value);
    window.orun?.settings?.get("voice").then((existing: any) => {
      window.orun?.settings?.set("voice", { ...(existing || {}), responseDelay: value });
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min="500" max="5000" step="250" value={delay}
        className="flex-1 h-1"
        onChange={(e) => handleChange(Number(e.target.value))}
      />
      <span className="text-[9px] w-10 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
        {(delay / 1000).toFixed(1)}s
      </span>
    </div>
  );
}

// ── TTS Fallback Priority Select ───────────────────────────────────────

function TtsPrioritySelect({ t }: { t: (key: string) => string }) {
  const [mode, setMode] = useState<"local-first" | "cloud-first">("local-first");

  useEffect(() => {
    window.orun?.settings?.get<"local-first" | "cloud-first">("ttsFallbackPriority").then((v) => {
      if (v === "cloud-first" || v === "local-first") setMode(v);
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const handleChange = (value: "local-first" | "cloud-first") => {
    setMode(value);
    window.orun?.settings?.set("ttsFallbackPriority", value).catch((err: unknown) => console.warn("[IPC error]", err));
  };

  return (
    <div className="flex gap-1">
      {(["local-first", "cloud-first"] as const).map((m) => (
        <button
          key={m}
          onClick={() => handleChange(m)}
          className="px-2 py-1 rounded-md text-[9px] transition-all"
          style={{
            background: mode === m ? "#8B5CF6" : "var(--secondary)",
            color: mode === m ? "#fff" : "var(--muted-foreground)",
            fontFamily: "'Sora', sans-serif",
            border: "1px solid var(--border)",
          }}
        >
          {m === "local-first" ? t("settingsTtsPriorityLocalFirst") : t("settingsTtsPriorityCloudFirst")}
        </button>
      ))}
    </div>
  );
}

// ── Google Settings ────────────────────────────────────────────────────
function GoogleSettings({ t }: { t: (key: string) => string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.google.getCredentials().then((c: any) => {
      if (c?.clientId) setClientId(c.clientId);
      if (c?.clientSecret) setClientSecret(c.clientSecret);
    }).catch(() => {});
    window.orun.google.isConnected().then(setConnected).catch(() => {});
  }, []);

  const saveCredentials = async () => {
    if (!isElectron) return;
    await window.orun.google.setCredentials(clientId.trim(), clientSecret.trim());
  };

  const handleOAuth = async () => {
    if (!isElectron || !clientId.trim() || !clientSecret.trim()) return;
    setLoading(true);
    try {
      await saveCredentials();
      await window.orun.google.startCallbackServer();
      const authResult = await window.orun.google.getAuthUrl();
      if ("error" in authResult || !authResult.url) {
        setLoading(false); return;
      }
      const openExternal = (window as any).orun?.shell?.openExternal;
      if (openExternal) openExternal(authResult.url);
      else window.open(authResult.url, "_blank");
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const isConnected = await window.orun.google.isConnected();
        if (isConnected || attempts > 60) {
          clearInterval(interval);
          setConnected(isConnected);
          setLoading(false);
        }
      }, 2000);
    } catch { setLoading(false); }
  };

  const disconnect = async () => {
    if (!isElectron) return;
    await window.orun.google.disconnect();
    setConnected(false);
  };

  return (
    <Section title="Google" icon={Mail} accent="#4285F4">
      <SettingRow label="Cliente ID">
        <input value={clientId} onChange={(e) => setClientId(e.target.value)}
          className="w-56 px-2 py-1.5 rounded-lg text-[10px] font-mono"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          placeholder="123456.apps.googleusercontent.com"
        />
      </SettingRow>
      <SettingRow label="Cliente Secret">
        <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
          className="w-56 px-2 py-1.5 rounded-lg text-[10px] font-mono"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          placeholder="GOCSPX-..."
        />
      </SettingRow>
      <SettingRow label="">
        <button onClick={saveCredentials}
          className="px-4 py-1.5 rounded-lg text-[10px]"
          style={{ background: "#4285F4", color: "#fff" }}
        >{t("settingsSave")}</button>
      </SettingRow>
      <SettingRow label={connected ? "Conectado" : "Desconectado"}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: connected ? "#4285F4" : "#666" }} />
          <button onClick={connected ? disconnect : handleOAuth}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-[10px]"
            style={{ background: connected ? "#ef4444" : "#4285F4", color: "#fff", opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "Conectando..." : connected ? "Desconectar" : "Conectar com Google"}
          </button>
        </div>
      </SettingRow>
      <div className="px-3 pb-3">
          <div className="text-[9px] space-y-1" style={{ color: "var(--muted-foreground)" }}>
            <p>1. Crie um projeto em{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                style={{ color: "#4285F4" }}>Google Cloud Console</a>
            </p>
            <p>2. Ative Gmail API e Google Calendar API</p>
            <p>3. Em "Credenciais" → "OAuth 2.0 Client IDs" → "Aplicativo Web"</p>
            <p>4. Adicione{" "}
              <code className="text-[9px]" style={{ background: "var(--secondary)", padding: "1px 4px", borderRadius: 3 }}>http://127.0.0.1:9223/callback</code>
              {" "}em "Redirect URIs autorizados"
            </p>
            <p>5. Em "Tela de consentimento OAuth", adicione <strong style={{ color: "var(--foreground)" }}>seu email</strong> como "Usuário de teste"</p>
            <p style={{ color: "#FBBF24" }}>⚠️ Sem isso, o Google bloqueia com erro 403 access_denied</p>
          </div>
      </div>
    </Section>
  );
}

// ── Spotify Settings ────────────────────────────────────────────────────

function SpotifySettings({ t }: { t: (key: string) => string }) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Array<{ id: string; name: string; is_active: boolean }>>([]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [n8nWebhook, setN8nWebhook] = useState("");
  const [n8nSaved, setN8nSaved] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.spotify.getCredentials().then((c) => {
      if (c?.clientId) setClientId(c.clientId);
      if (c?.clientSecret) setClientSecret(c.clientSecret);
    }).catch(() => {});
    window.orun.spotify.isConnected().then((c) => setConnected(c)).catch(() => {});
    window.orun.spotify.getDevices().then((d) => setDevices(d || [])).catch(() => {});
    window.orun.spotify.getCurrentlyPlaying().then((t) => {
      if (t?.name) setNowPlaying(`${t.name} — ${t.artists?.[0]?.name || ""}`);
    }).catch(() => {});
    window.orun.spotify.getN8nWebhook().then((url) => { if (url) setN8nWebhook(url); }).catch(() => {});
  }, []);

  const saveCredentials = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setSaving(true);
    await window.orun.spotify.setCredentials(clientId.trim(), clientSecret.trim());
    setSaving(false);
  };

  const saveN8nWebhook = async () => {
    await window.orun.spotify.setN8nWebhook(n8nWebhook.trim());
    setN8nSaved(true);
    setTimeout(() => setN8nSaved(false), 2000);
  };

  const handleOAuth = async () => {
    if (!isElectron || !clientId.trim() || !clientSecret.trim()) return;
    setLoading(true);
    try {
      await saveCredentials();
      await window.orun.spotify.startCallbackServer();
      const authResult = await window.orun.spotify.getAuthUrl();
      if ("error" in authResult || !authResult.url) {
        setLoading(false);
        return;
      }
      // Use shell.openExternal for system browser (Electron window.open creates a new BrowserWindow)
      const openExternal = (window as any).orun?.shell?.openExternal;
      if (openExternal) openExternal(authResult.url);
      else window.open(authResult.url, "_blank");
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const isConnected = await window.orun.spotify.isConnected();
        if (isConnected || attempts > 60) {
          clearInterval(interval);
          setConnected(isConnected);
          setLoading(false);
          if (isConnected) {
            const d = await window.orun.spotify.getDevices().catch(() => []);
            setDevices(d || []);
            const track = await window.orun.spotify.getCurrentlyPlaying().catch(() => null);
            if (track?.name) setNowPlaying(`${track.name} — ${track.artists?.[0]?.name || ""}`);
          }
        }
      }, 2000);
    } catch {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    await window.orun.spotify.disconnect();
    setConnected(false);
    setDevices([]);
    setNowPlaying(null);
  };

  return (
    <Section title={t("settingsSpotifySection")} icon={Music} accent="#1DB954">
      {/* Status */}
      <SettingRow label={connected ? t("settingsSpotifyConnected") : t("settingsSpotifyNotConnected")}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: connected ? "#1DB954" : "#666" }} />
          {connected && (
            <button onClick={disconnect} className="px-2 py-1 rounded-md text-[9px]" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
              {t("settingsSpotifyDisconnect")}
            </button>
          )}
        </div>
      </SettingRow>

      {/* Now Playing */}
      {nowPlaying && (
        <SettingRow label={t("settingsSpotifyNowPlaying")}>
          <span className="text-[9px] truncate max-w-48" style={{ color: "#1DB954", fontFamily: "'JetBrains Mono', monospace" }}>{nowPlaying}</span>
        </SettingRow>
      )}

      {/* n8n Webhook URL */}
      <SettingRow label="n8n Webhook URL" description={t("settingsSpotifyAuthHelpDesc")}>
        <div className="flex items-center gap-1.5">
          <input
            value={n8nWebhook} onChange={(e) => setN8nWebhook(e.target.value)}
            placeholder="http://localhost:5678/webhook/spotify"
            className="w-44 px-2.5 py-1.5 rounded-md text-[10px] outline-none"
            style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
          />
          <button
            onClick={saveN8nWebhook}
            className="px-2 py-1.5 rounded-md text-[9px]"
            style={{ background: n8nSaved ? "#22C55E" : "#1DB954", color: "#fff" }}
          >
            {n8nSaved ? "✓" : "Save"}
          </button>
        </div>
      </SettingRow>

      {/* Credentials (for OAuth token exchange) */}
      <SettingRow label={t("settingsSpotifyClientId")}>
        <input
          value={clientId} onChange={(e) => setClientId(e.target.value)}
          placeholder="e.g. abc123..."
          className="w-48 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </SettingRow>
      <SettingRow label={t("settingsSpotifyClientSecret")}>
        <input
          type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)}
          placeholder="••••••••"
          className="w-48 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </SettingRow>

      {/* Connect */}
      <button
        onClick={handleOAuth}
        disabled={loading || !clientId.trim() || !clientSecret.trim()}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] transition-colors"
        style={{ background: connected ? "rgba(29,185,84,0.1)" : "#1DB954", color: connected ? "#1DB954" : "#fff", fontFamily: "'Sora', sans-serif", opacity: !clientId.trim() || !clientSecret.trim() ? 0.5 : 1 }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Music size={12} />}
        {connected ? t("settingsSpotifyConnected") : t("settingsSpotifyConnect")}
      </button>

      {/* Devices */}
      {connected && devices.length > 0 && (
        <SettingRow label={t("settingsSpotifyDeviceLabel")} description={t("settingsSpotifyDeviceDesc")}>
          <select className="px-2 py-1 rounded-md text-[10px] outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}{d.is_active ? " (ativo)" : ""}</option>
            ))}
          </select>
        </SettingRow>
      )}

      {/* Help */}
      <div className="px-3 py-2 rounded-lg text-[9px]" style={{ background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.15)", color: "var(--muted-foreground)" }}>
        {t("settingsSpotifyAuthHelp")} · n8n workflow: import <code>spotify-all-in-one.json</code> no n8n
      </div>
    </Section>
  );
}

// ── Discord Settings ────────────────────────────────────────────────────

function DiscordSettings({ t }: { t: (key: string) => string }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected");
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: number }>>([]);
  const [selectedGuild, setSelectedGuild] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [autoResponse, setAutoResponse] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [sendResult, setSendResult] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.discord.getToken().then((t) => { if (t) setToken(t); }).catch(() => {});
    window.orun.discord.getStatus().then((s) => setStatus(s)).catch(() => {});
    window.orun.discord.getGuilds().then((g) => setGuilds(g || [])).catch(() => {});
    window.orun.discord.getAgentResponse().then((r) => setAutoResponse(r)).catch(() => {});

    const unsub = window.orun.discord.onStatusUpdate((s) => setStatus(s as any));
    return unsub;
  }, []);

  const loadChannels = async (guildId: string) => {
    setSelectedGuild(guildId);
    const ch = await window.orun.discord.getChannels(guildId).catch(() => []);
    setChannels(ch || []);
    setSelectedChannel("");
  };

  const connect = async () => {
    if (!token.trim()) return;
    setStatus("connecting");
    const result = await window.orun.discord.connect(token.trim());
    if (result.ok) {
      setStatus("connected");
      const g = await window.orun.discord.getGuilds().catch(() => []);
      setGuilds(g || []);
    } else {
      setStatus("error");
    }
  };

  const disconnect = async () => {
    await window.orun.discord.disconnect();
    setStatus("disconnected");
    setGuilds([]);
    setChannels([]);
    setSelectedGuild("");
    setSelectedChannel("");
  };

  const sendMessage = async () => {
    if (!selectedChannel || !testMsg.trim()) return;
    const result = await window.orun.discord.sendMessage(selectedChannel, testMsg.trim());
    setSendResult(result.ok ? "ok" : "error");
    if (result.ok) setTestMsg("");
    setTimeout(() => setSendResult(null), 3000);
  };

  const toggleAutoResponse = async (val: boolean) => {
    setAutoResponse(val);
    await window.orun.discord.setAgentResponse(val);
  };

  const statusColor = status === "connected" ? "#5865F2" : status === "connecting" ? "#F59E0B" : status === "error" ? "#C00018" : "#666";
  const statusLabel = status === "connected" ? t("settingsDiscordConnected") : status === "connecting" ? t("settingsDiscordConnecting") : status === "error" ? t("settingsDiscordError") : t("settingsDiscordDisconnect");

  return (
    <Section title={t("settingsDiscordSection")} icon={MessageCircle} accent="#5865F2">
      {/* Status */}
      <SettingRow label={statusLabel}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
          {status === "connected" && (
            <button onClick={disconnect} className="px-2 py-1 rounded-md text-[9px]" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
              {t("settingsDiscordDisconnect")}
            </button>
          )}
        </div>
      </SettingRow>

      {/* Token */}
      <SettingRow label={t("settingsDiscordToken")} description={t("settingsDiscordBotTokenHelpDesc")}>
        <input
          type="password" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder="MTIz..."
          className="w-48 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
        />
      </SettingRow>

      {/* Connect */}
      <button
        onClick={status === "connected" ? disconnect : connect}
        disabled={!token.trim() || status === "connecting"}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] transition-colors"
        style={{ background: status === "connected" ? "rgba(88,101,242,0.1)" : "#5865F2", color: status === "connected" ? "#5865F2" : "#fff", fontFamily: "'Sora', sans-serif", opacity: !token.trim() ? 0.5 : 1 }}
      >
        {status === "connecting" ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
        {status === "connected" ? t("settingsDiscordDisconnect") : t("settingsDiscordConnect")}
      </button>

      {/* Guild/Channel selection */}
      {status === "connected" && guilds.length > 0 && (
        <>
          <SettingRow label={t("settingsDiscordGuild")}>
            <select
              value={selectedGuild} onChange={(e) => loadChannels(e.target.value)}
              className="px-2 py-1 rounded-md text-[10px] outline-none"
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >
              <option value="">—</option>
              {guilds.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.memberCount})</option>)}
            </select>
          </SettingRow>
          {channels.length > 0 && (
            <SettingRow label={t("settingsDiscordChannel")}>
              <select
                value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-2 py-1 rounded-md text-[10px] outline-none"
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <option value="">—</option>
                {channels.filter((c) => c.type === 0).map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </select>
            </SettingRow>
          )}

          {/* Auto-response */}
          <SettingRow label={t("settingsDiscordAutoResponse")} description={t("settingsDiscordAutoResponseDesc")}>
            <button
              onClick={() => toggleAutoResponse(!autoResponse)}
              className="relative w-10 h-5 rounded-full transition-all"
              style={{ background: autoResponse ? "#5865F2" : "var(--switch-background)" }}
            >
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: autoResponse ? "22px" : "2px" }} />
            </button>
          </SettingRow>

          {/* Test message */}
          {selectedChannel && (
            <div className="flex items-center gap-1.5">
              <input
                value={testMsg} onChange={(e) => setTestMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="#channel..."
                className="flex-1 px-2.5 py-1.5 rounded-md text-[10px] outline-none"
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
              <button
                onClick={sendMessage}
                disabled={!testMsg.trim()}
                className="px-2.5 py-1.5 rounded-md text-[10px]"
                style={{ background: sendResult === "ok" ? "#22C55E" : sendResult === "error" ? "#C00018" : "#5865F2", color: "#fff", opacity: !testMsg.trim() ? 0.5 : 1 }}
              >
                {sendResult === "ok" ? "✓" : sendResult === "error" ? "✗" : "→"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Help */}
      <div className="px-3 py-2 rounded-lg text-[9px]" style={{ background: "rgba(88,101,242,0.06)", border: "1px solid rgba(88,101,242,0.15)", color: "var(--muted-foreground)" }}>
        {t("settingsDiscordBotTokenHelp")}
      </div>
    </Section>
  );
}

// ── MCP Servers ────────────────────────────────────────────────────────

function McpSettings({ t }: { t: (key: string) => string }) {
  const [servers, setServers] = useState<{ name: string; ready: boolean; tools: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [env, setEnv] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await window.orun.mcp.listServers();
      setServers(list || []);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const add = async () => {
    setError("");
    if (!name.trim() || !command.trim()) {
      setError("Informe nome e comando");
      return;
    }
    let parsedArgs: string[] = [];
    let parsedEnv: Record<string, string> = {};
    if (args.trim()) {
      try {
        const a = JSON.parse(args.trim());
        if (!Array.isArray(a) || a.some((x: unknown) => typeof x !== "string")) throw new Error();
        parsedArgs = a;
      } catch {
        setError('Args deve ser um array JSON de strings, ex: ["--flag"]');
        return;
      }
    }
    if (env.trim()) {
      try {
        const e = JSON.parse(env.trim());
        if (typeof e !== "object" || e === null || Array.isArray(e) || Object.values(e).some((v) => typeof v !== "string")) throw new Error();
        parsedEnv = e;
      } catch {
        setError('Env deve ser um objeto JSON de chave=valor, ex: {"KEY":"value"}');
        return;
      }
    }
    setAdding(true);
    try {
      const result = await window.orun.mcp.addServer({ name: name.trim(), command: command.trim(), args: parsedArgs, env: parsedEnv });
      if (!result.ok) {
        setError(result.error || "Falha ao adicionar servidor");
        return;
      }
      setName("");
      setCommand("");
      setArgs("");
      setEnv("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao adicionar servidor");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (srvName: string) => {
    try {
      await window.orun.mcp.removeServer(srvName);
    } catch {
      // ignore
    }
    await refresh();
  };

  return (
    <Section title={t("mcp")} icon={Server} accent="#7C3AED">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Model Context Protocol</span>
        <button onClick={refresh} disabled={loading} className="p-1.5 rounded-md" style={{ color: "var(--muted-foreground)" }} title="Atualizar">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="py-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>{t("mcpEmpty")}</div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-2">
          {servers.map((s) => (
            <div key={s.name} className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: s.ready ? "#22C55E" : "#EF4444" }} />
                <span className="text-[10px] font-medium" style={{ color: "var(--foreground)" }}>{s.name}</span>
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{s.tools} tools</span>
              </div>
              <button onClick={() => remove(s.name)} className="p-1 rounded-md" style={{ color: "#EF4444" }} title="Remover">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (ex: penpot)" className="w-full px-2.5 py-1.5 rounded-md text-[10px] outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Comando (ex: node)" className="w-full px-2.5 py-1.5 rounded-md text-[10px] outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
        <input value={args} onChange={(e) => setArgs(e.target.value)} placeholder={'Args (JSON) ex: ["C:\\caminho\\index.js"]'} className="w-full px-2.5 py-1.5 rounded-md text-[10px] outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
        <input value={env} onChange={(e) => setEnv(e.target.value)} placeholder={'Env (JSON) ex: {"KEY":"value"}'} className="w-full px-2.5 py-1.5 rounded-md text-[10px] outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }} />
        {error && <div className="text-[9px]" style={{ color: "#EF4444" }}>{error}</div>}
        <button
          onClick={add}
          disabled={adding || !name.trim() || !command.trim()}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] transition-colors"
          style={{ background: "#7C3AED", color: "#fff", fontFamily: "'Sora', sans-serif", opacity: !name.trim() || !command.trim() ? 0.5 : 1 }}
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {t("mcpAdd")}
        </button>
      </div>
    </Section>
  );
}

// ── Ambient Sounds ─────────────────────────────────────────────────────

const SOUND_ICONS: Record<string, React.ElementType> = {
  Cloud, TreePine, Waves, CupSoda, Flame, Ear,
};

function AmbientSoundsSection({ t }: { t: (key: string) => string }) {
  const [active, setActive] = useState<string[]>([]);
  const [volume, setVolumeState] = useState(0.5);

  const toggleSound = (id: string) => {
    if (active.includes(id)) {
      stopSound(id);
      setActive(getActiveSounds());
    } else {
      startSound(id);
      setActive(getActiveSounds());
    }
  };

  const handleVolume = (vol: number) => {
    setVolumeState(vol);
    setVolume(vol);
  };

  useEffect(() => {
    return () => { stopAll(); };
  }, []);

  return (
    <Section title={t("sounds_ambient")} icon={Volume2} accent="#8B5CF6">
      <div className="grid grid-cols-3 gap-2">
        {AMBIENT_SOUNDS.map((sound) => {
          const Icon = SOUND_ICONS[sound.icon] || Ear;
          const isActive = active.includes(sound.id);
          return (
            <button
              key={sound.id}
              onClick={() => toggleSound(sound.id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-lg transition-all"
              style={{
                background: isActive ? `${sound.color}20` : "var(--secondary)",
                border: `2px solid ${isActive ? sound.color : "var(--border)"}`,
                color: isActive ? sound.color : "var(--muted-foreground)",
              }}
            >
              <Icon size={18} />
              <span className="text-[9px] tracking-wider text-center leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                {t(sound.name)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-1 mt-2">
        <span className="text-[9px]" style={{ color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}>{t("sounds_volume")}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => handleVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-[#8B5CF6]"
        />
        <span className="text-[9px] w-8 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
      {active.length > 0 && (
        <button
          onClick={() => { stopAll(); setActive([]); }}
          className="w-full mt-1 py-1.5 rounded-lg text-[9px]"
          style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)", fontFamily: "'Sora', sans-serif" }}
        >
          Stop All
        </button>
      )}
    </Section>
  );
}

// ── Tab Navigation ──────────────────────────────────────────────────────

type SettingsTab = "ai" | "integrations" | "appearance" | "system" | "profiles" | "shield" | "optimizer";

const getTabs = (t: (key: string) => string): { id: SettingsTab; label: string; icon: React.ElementType }[] => [
  { id: "ai", label: t("settingsTabAI"), icon: Bot },
  { id: "integrations", label: t("settingsTabIntegrations"), icon: Plug },
  { id: "appearance", label: t("settingsTabAppearance"), icon: Palette },
  { id: "system", label: t("settingsTabSystem"), icon: Cpu },
  { id: "profiles", label: t("settingsTabProfiles"), icon: Users },
  { id: "shield", label: t("settingsTabShield"), icon: Shield },
  { id: "optimizer", label: t("settingsTabOptimizer"), icon: Sparkles },
];

// ── Keyboard Shortcut Builder ───────────────────────────────────────────

const DEFAULT_SHORTCUTS = [
  { id: "cmdPalette", label: "Paleta de Comandos", defaultKeys: "Ctrl+K" },
  { id: "newChat", label: "Novo Chat", defaultKeys: "Ctrl+N" },
  { id: "closePanel", label: "Fechar Painel", defaultKeys: "Esc" },
  { id: "agents", label: "Agentes", defaultKeys: "Ctrl+Shift+O" },
  { id: "automation", label: "Automação", defaultKeys: "Ctrl+Shift+A" },
  { id: "settings", label: "Configurações", defaultKeys: "Ctrl+Shift+S" },
  { id: "profile", label: "Perfil", defaultKeys: "Ctrl+Shift+P" },
  { id: "email", label: "Email", defaultKeys: "Ctrl+Shift+E" },
  { id: "calendar", label: "Calendário", defaultKeys: "Ctrl+Shift+C" },
  { id: "activity", label: "Atividades", defaultKeys: "Ctrl+Shift+L" },
];

function KeyboardShortcutBuilder() {
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("orun-custom-shortcuts") || "{}"); } catch { return {}; }
  });
  const [recording, setRecording] = useState<string | null>(null);

  function handleStartRecord(id: string) {
    setRecording(id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!recording) return;
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");
    const key = e.key === "Escape" ? "Esc" : e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) parts.push(key);
    const combo = parts.join("+");
    if (combo) {
      const updated = { ...customShortcuts, [recording]: combo };
      setCustomShortcuts(updated);
      localStorage.setItem("orun-custom-shortcuts", JSON.stringify(updated));
    }
    setRecording(null);
  }

  useEffect(() => {
    if (!recording) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      const key = e.key === "Escape" ? "Esc" : e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) parts.push(key);
      const combo = parts.join("+");
      if (combo) {
        const updated = { ...customShortcuts, [recording]: combo };
        setCustomShortcuts(updated);
        localStorage.setItem("orun-custom-shortcuts", JSON.stringify(updated));
      }
      setRecording(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [recording, customShortcuts]);

  function getKeys(id: string): string {
    return customShortcuts[id] || DEFAULT_SHORTCUTS.find(s => s.id === id)?.defaultKeys || "";
  }

  return (
    <div className="space-y-1" onKeyDown={handleKeyDown}>
      {recording && (
        <div className="text-[9px] text-center py-1.5 rounded-lg mb-2" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>
          Pressione a combinação de teclas desejada...
        </div>
      )}
      {DEFAULT_SHORTCUTS.map((s) => (
        <SettingRow key={s.id} label={s.label}>
          <button
            onClick={() => handleStartRecord(s.id)}
            className="text-[10px] px-2 py-0.5 rounded border font-mono transition-all hover:opacity-80"
            style={{
              color: recording === s.id ? "#F59E0B" : "var(--muted-foreground)",
              borderColor: recording === s.id ? "#F59E0B" : "var(--border)",
              background: recording === s.id ? "rgba(245,158,11,0.1)" : "var(--card)",
            }}
          >
            {recording === s.id ? "..." : getKeys(s.id)}
          </button>
        </SettingRow>
      ))}
      <p className="text-[8px] pt-1 text-center" style={{ color: "var(--muted-foreground)" }}>
        Clique em um atalho para personalizar
      </p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export function SettingsPanel({ onClose, onOpenAgentModels, onOpenUsage, onOpenWhatsApp, onOpenTelegram, onOpenSuporte, onOpenAchievements }: { onClose: () => void; onOpenAgentModels: () => void; onOpenUsage: () => void; onOpenWhatsApp: () => void; onOpenTelegram: () => void; onOpenSuporte?: () => void; onOpenAchievements?: () => void }) {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai");
  const [provider, setProvider] = useState<OrunProvider>("ollama");
  const [model, setModel] = useState(PROVIDER_INFO.ollama.defaultModel);
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Hampton, the central AI of Orun OS, a personal AI operating system. Be direct, helpful, and concise. IMPORTANTE: Sempre responda em português do Brasil (pt-BR). Nunca use outro idioma."
  );
  const [apiKey, setApiKey] = useState("");
  const [apiKey2, setApiKey2] = useState("");
  const [apiKey3, setApiKey3] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [hasKey2, setHasKey2] = useState(false);
  const [hasKey3, setHasKey3] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [freeModels, setFreeModels] = useState<Record<string, string[]>>({});
  const [modelCatalog, setModelCatalog] = useState<Record<string, { id: string; free: boolean }[]>>({});
  const [fallbackProvider, setFallbackProvider] = useState<OrunProvider | "none">("none");
  const [fallbackModel, setFallbackModel] = useState("");
  const [runInBackground, setRunInBackground] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [backgroundListening, setBackgroundListening] = useState(false);
  const [wakeServiceRunning, setWakeServiceRunning] = useState(false);
  const [wakeDiagnostic, setWakeDiagnostic] = useState<{ python?: boolean; packages?: boolean; tcpPort?: boolean } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; message?: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [backups, setBackups] = useState<Array<{ name: string; path: string; size: number; date: string }>>([]);
  const [restoring, setRestoring] = useState(false);
  const [lsBackups, setLsBackups] = useState<Array<{ name: string; path: string; size: number; date: string }>>([]);
  const [backupInfo, setBackupInfo] = useState<{ lastBackup: string | null; nextBackup: string | null; totalBackups: number; storageUsed: number }>({ lastBackup: null, nextBackup: null, totalBackups: 0, storageUsed: 0 });
  const [lsRestoring, setLsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);

  useEffect(() => {
    if (isElectron) {
      window.orun.db?.listBackups?.().then(setBackups).catch(() => {});
      AutoBackup.getBackupInfo().then(setBackupInfo).catch(() => {});
      AutoBackup.listBackups().then(setLsBackups).catch(() => {});
    }
  }, []);
  const [ttsEngine, setTtsEngine] = useState<string>("");
  const [ttsVoice, setTtsVoice] = useState<string>("");
  const [showEncryption, setShowEncryption] = useState(false);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ provider: OrunProvider; model: string; baseUrl?: string; systemPrompt?: string }>("ai").then((saved) => {
      if (saved) {
        setProvider(saved.provider);
        setModel(saved.model);
        if (saved.baseUrl) setBaseUrl(saved.baseUrl);
        if (saved.systemPrompt) setSystemPrompt(saved.systemPrompt);
      }
    });
    window.orun.ai.knownFreeModels().then(setFreeModels);
    window.orun.ai.modelCatalog().then(setModelCatalog);
    window.orun.settings.get<{ provider: OrunProvider; model: string } | null>("aiFallback").then((fb) => {
      if (fb) { setFallbackProvider(fb.provider); setFallbackModel(fb.model); }
    });
    window.orun.settings.get<boolean>("runInBackground").then((v) => setRunInBackground(Boolean(v)));
    window.orun.settings.get<boolean>("autoStart").then((v) => setAutoStart(Boolean(v)));
    window.orun.settings.get<boolean>("wakeWordEnabled").then((v) => setWakeWordEnabled(Boolean(v)));
    window.orun.settings.get<boolean>("backgroundListening").then((v) => setBackgroundListening(Boolean(v)));
    window.orun.wakeListener?.status().then((s) => {
      setBackgroundListening(s?.running ?? false);
      setWakeServiceRunning(s?.running ?? false);
    });
    window.orun.settings.get<string>("theme").then((v) => { if (v === "light" || v === "dark") { setTheme(v); } });
    window.orun.settings.get<{ engine: string; voiceId: string }>("tts").then((v) => { if (v) { setTtsEngine(v.engine); setTtsVoice(v.voiceId); } });
    const unsubscribe = window.orun.app.onUpdateStatus((status) => { setUpdateStatus(status); setCheckingUpdate(false); });
    return unsubscribe;
  }, []);

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    const result = await window.orun.app.checkForUpdates();
    if (!result.ok) { setUpdateStatus({ status: "error", message: result.error }); setCheckingUpdate(false); }
  };

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.providerKeyCount(provider).then((count) => {
      setHasKey(count >= 1);
      setHasKey2(count >= 2);
      setHasKey3(count >= 3);
    });
  }, [provider]);

  const refreshOllamaModels = async () => {
    if (!isElectron) return;
    setLoadingModels(true);
    setOllamaModels(await window.orun.ai.listOllamaModels(baseUrl));
    setLoadingModels(false);
  };

  useEffect(() => {
    if (provider === "ollama") refreshOllamaModels();
  }, [provider]);

  const save = async () => {
    if (!isElectron) return;
    await window.orun.settings.set("ai", { provider, model, baseUrl, systemPrompt });
    await window.orun.settings.set("aiFallback", fallbackProvider === "none" ? null : { provider: fallbackProvider, model: fallbackModel });
    await window.orun.settings.set("runInBackground", runInBackground);
    await window.orun.app.setRunInBackground(runInBackground);
    await window.orun.settings.set("autoStart", autoStart);
    await window.orun.app?.setAutoStart?.(autoStart);
    await window.orun.settings.set("wakeWordEnabled", wakeWordEnabled);
    await window.orun.settings.set("theme", theme);
    if (apiKey.trim()) {
      const ok = await window.orun.settings.setProviderKey(provider, 1, apiKey.trim());
      if (ok) {
        setApiKey("");
        setHasKey(true);
      }
    }
    if (apiKey2.trim()) {
      const ok = await window.orun.settings.setProviderKey(provider, 2, apiKey2.trim());
      if (ok) {
        setApiKey2("");
        setHasKey2(true);
      }
    }
    if (apiKey3.trim()) {
      const ok = await window.orun.settings.setProviderKey(provider, 3, apiKey3.trim());
      if (ok) {
        setApiKey3("");
        setHasKey3(true);
      }
    }
  };

  const testConnection = async () => {
    if (!isElectron) return;
    setTestState("testing");
    await save();
    const result = await window.orun.ai.testConnection({ provider, model, baseUrl });
    if (result.ok) setTestState("ok");
    else { setTestState("error"); setTestError(result.error || t("settingsError")); }
  };

  const removeProviderKey = async (index: number) => {
    if (!isElectron) return;
    const ok = await window.orun.settings.deleteProviderKey(provider, index);
    if (ok) {
      if (index === 1) setHasKey(false);
      if (index === 2) setHasKey2(false);
      if (index === 3) setHasKey3(false);
    }
  };

  const info = PROVIDER_INFO[provider];
  const catalogModels = modelCatalog[provider] || [];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[520px] max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(192,0,24,0.1)" }}>
              <Zap size={14} style={{ color: "#C00018" }} />
            </div>
            <div>
              <span className="text-sm tracking-widest uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("settingsTitle")}
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>v{__APP_VERSION__}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0" style={{ borderColor: "var(--border)" }} role="tablist" aria-label="Settings tabs">
          {getTabs(t).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)] outline-none"
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: isActive ? 500 : 300,
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  background: isActive ? "rgba(192,0,24,0.08)" : "transparent",
                }}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          {!isElectron && (
            <div className="mb-4 px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(192,0,24,0.08)", color: "#C00018", border: "1px solid rgba(192,0,24,0.2)" }}>
              {t("settingsBrowserWarning")}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── AI & Model Tab ──────────────────────────── */}
            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                {/* Language */}
                <Section title={t("settings_section_language")} icon={Globe} accent="#3B82F6">
                  <div className="flex gap-2">
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLanguage(opt.value)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors flex-1"
                        style={{
                          background: language === opt.value ? "rgba(192,0,24,0.12)" : "var(--secondary)",
                          border: `1px solid ${language === opt.value ? "#C00018" : "var(--border)"}`,
                          color: language === opt.value ? "#FF1A2D" : "var(--muted-foreground)",
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        <span>{opt.flag}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Provider */}
                <Section title={t("settings_section_ai_provider")} icon={Cloud} accent="#C00018">
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(PROVIDER_INFO) as OrunProvider[]).map((p) => {
                      const pInfo = PROVIDER_INFO[p];
                      const active = provider === p;
                      return (
                        <button
                          key={p}
                          onClick={() => { setProvider(p); setModel(pInfo.defaultModel); setTestState("idle"); }}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors"
                          style={{ borderColor: active ? "#C00018" : "var(--border)", background: active ? "rgba(192,0,24,0.08)" : "transparent", color: active ? "#FF1A2D" : "var(--muted-foreground)" }}
                        >
                          {pInfo.kind === "local" ? <Cpu size={13} /> : <Cloud size={13} />}
                          <span className="text-[8px] tracking-wider text-center" style={{ fontFamily: "'Sora', sans-serif" }}>{pInfo.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {info.note && <p className="text-[9px] mt-2" style={{ color: "var(--muted-foreground)" }}>{info.note}</p>}
                </Section>

                {/* Model */}
                <Section title={t("settings_section_model")} icon={Bot} accent="#8B5CF6">
                  {provider === "ollama" ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={model} onChange={(e) => setModel(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                      >
                        {!ollamaModels.includes(model) && <option value={model}>{model}</option>}
                        {ollamaModels.map((m) => <option key={m} value={m}>{m}</option>)}
                        {ollamaModels.length === 0 && <option value={model}>{model} ({t("settingsOllamaModelsError")})</option>}
                      </select>
                      <button onClick={refreshOllamaModels} className="p-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                        <RefreshCw size={14} className={loadingModels ? "animate-spin" : ""} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={model} onChange={(e) => setModel(e.target.value)}
                        className="w-full mb-2 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                      />
                      {catalogModels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {catalogModels.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setModel(m.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-[8px]"
                              style={{ background: model === m.id ? "rgba(192,0,24,0.15)" : "var(--secondary)", border: `1px solid ${model === m.id ? "#C00018" : "var(--border)"}`, color: model === m.id ? "#FF1A2D" : "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {m.free && <Sparkles size={7} style={{ color: "#22C55E" }} />}
                              <span>{m.id}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </Section>

                {/* Connection */}
                <Section title={t("settings_section_connection")} icon={Plug} accent="#06B6D4">
                  {info.kind === "local" ? (
                    <>
                      <SettingRow label={t("settingsOllamaUrl")} description={t("settings_ollama_url_desc")}>
                        <input
                          value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} onBlur={refreshOllamaModels}
                          className="w-48 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
                          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      </SettingRow>
                    </>
                  ) : (
                    <>
                      <SettingRow label={t("settings_api_key_rotation_desc")} description="">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("settings_api_key_max", { max: "3" })}</span>
                        </div>
                      </SettingRow>
                      <SettingRow label={`${t("settings_api_key_label")} 1 ${hasKey ? t("settings_api_key_saved") : ""}`} description={t("settings_api_key_desc", { label: info.label })}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                            placeholder={hasKey ? "••••••••" : t("settings_api_key_placeholder")}
                            className="w-40 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
                            style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                          />
                          {hasKey && (
                            <button onClick={() => removeProviderKey(1)} title={t("settings_api_key_remove")}
                              className="px-1.5 py-1 rounded text-[9px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                              ✕
                            </button>
                          )}
                        </div>
                      </SettingRow>
                      <SettingRow label={`${t("settings_api_key_label")} 2 ${hasKey2 ? t("settings_api_key_saved") : ""}`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password" value={apiKey2} onChange={(e) => setApiKey2(e.target.value)}
                            placeholder={hasKey2 ? "••••••••" : t("settings_api_key_placeholder")}
                            className="w-40 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
                            style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                          />
                          {hasKey2 && (
                            <button onClick={() => removeProviderKey(2)} title={t("settings_api_key_remove")}
                              className="px-1.5 py-1 rounded text-[9px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                              ✕
                            </button>
                          )}
                        </div>
                      </SettingRow>
                      <SettingRow label={`${t("settings_api_key_label")} 3 ${hasKey3 ? t("settings_api_key_saved") : ""}`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password" value={apiKey3} onChange={(e) => setApiKey3(e.target.value)}
                            placeholder={hasKey3 ? "••••••••" : t("settings_api_key_placeholder")}
                            className="w-40 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
                            style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                          />
                          {hasKey3 && (
                            <button onClick={() => removeProviderKey(3)} title={t("settings_api_key_remove")}
                              className="px-1.5 py-1 rounded text-[9px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>
                              ✕
                            </button>
                          )}
                        </div>
                      </SettingRow>
                    </>
                  )}

                  {/* Fallback */}
                  <SettingRow label={t("settings_fallback_provider_label")} description={t("settings_fallback_provider_desc")}>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={fallbackProvider}
                        onChange={(e) => setFallbackProvider(e.target.value as OrunProvider | "none")}
                        className="px-2 py-1 rounded-md text-[10px] outline-none"
                        style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                      >
                        <option value="none">{t("settings_none")}</option>
                        {(Object.keys(PROVIDER_INFO) as OrunProvider[]).filter((p) => p !== provider).map((p) => (
                          <option key={p} value={p}>{PROVIDER_INFO[p].label}</option>
                        ))}
                      </select>
                      {fallbackProvider !== "none" && (
                        <input
                          value={fallbackModel} onChange={(e) => setFallbackModel(e.target.value)}
                          className="w-28 px-2 py-1 rounded-md text-[9px] outline-none"
                          style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      )}
                    </div>
                  </SettingRow>
                </Section>

                {/* System Prompt */}
                <Section title={t("settingsPersonaSection")} icon={Sparkles} accent="#F59E0B">
                  <textarea
                    value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg text-[11px] outline-none resize-none"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'Inter', sans-serif" }}
                  />
                </Section>
              </motion.div>
            )}

            {/* ── Integrations Tab ───────────────────────── */}
            {activeTab === "integrations" && (
              <motion.div key="integrations" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                {/* WhatsApp */}
                <Section title={t("settingsWhatsAppSection")} icon={MessageCircle} accent="#25D366">
                  <button
                    onClick={onOpenWhatsApp}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors"
                    style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,211,102,0.15)" }}>
                        <MessageCircle size={14} style={{ color: "#25D366" }} />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-medium block" style={{ color: "var(--foreground)" }}>{t("settings_whatsapp_connector_label")}</span>
                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("settings_whatsapp_connector_desc")}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </Section>

                {/* Telegram */}
                <Section title="Telegram" icon={Send} accent="#3B82F6">
                  <button
                    onClick={onOpenTelegram}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors"
                    style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
                        <Send size={14} style={{ color: "#3B82F6" }} />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-medium block" style={{ color: "var(--foreground)" }}>Telegram Bot</span>
                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Conectar bot do Telegram via @BotFather</span>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </Section>

                {/* TTS */}
                {ttsEngine && (
                  <Section title={t("settings_section_tts")} icon={Volume2} accent="#8B5CF6">
                    <SettingRow label={t("settings_tts_engine_label")} description={t("settings_tts_engine_desc", { engine: ttsEngine.toUpperCase() })}>
                      <span className="text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", fontFamily: "'JetBrains Mono', monospace" }}>
                        {ttsEngine.toUpperCase()}
                      </span>
                    </SettingRow>
                    {ttsVoice && (
                      <SettingRow label={t("settings_tts_voice_label")} description={t("settings_tts_voice_desc")}>
                        <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{ttsVoice}</span>
                      </SettingRow>
                    )}
                    <div className="mt-1 px-3 py-2 rounded-lg text-[9px]" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
                      {t("settings_tts_fallback_info")}
                    </div>
                    <SettingRow label={t("settingsTtsPriority")} description={t("settingsTtsPriorityDesc")}>
                      <TtsPrioritySelect t={t} />
                    </SettingRow>
                  </Section>
                )}

                {/* Voice System */}
                <Section title={t("settingsVoiceSystem")} icon={Mic} accent="#C00018">
                  <SettingRow label={t("settingsConversationalMode")} description={t("settingsConversationalModeDesc")}>
                    <VoiceToggle settingKey="conversational" defaultValue={false} />
                  </SettingRow>
                  <SettingRow label={t("settingsNoiseSuppression")} description={t("settingsNoiseSuppressionDesc")}>
                    <VoiceToggle settingKey="noiseSuppression" defaultValue={true} />
                  </SettingRow>
                  <SettingRow label={t("settingsResponseDelay")} description={t("settingsResponseDelayDesc")}>
                    <ResponseDelaySlider />
                  </SettingRow>
                  <SettingRow label={t("settingsSustainedInterrupt")} description={t("settingsSustainedInterruptDesc")}>
                    <VoiceToggle settingKey="sustainedInterrupt" defaultValue={true} />
                  </SettingRow>
                  <SettingRow label={t("settingsProactiveGreeting")} description={t("settingsProactiveGreetingDesc")}>
                    <VoiceToggle settingKey="proactiveGreeting" defaultValue={true} />
                  </SettingRow>
                  <SettingRow label={t("settingsProactiveSpotify")} description={t("settingsProactiveSpotifyDesc")}>
                    <VoiceToggle settingKey="proactiveSpotify" defaultValue={true} />
                  </SettingRow>
                  <SettingRow label={t("settingsProactiveApps")} description={t("settingsProactiveAppsDesc")}>
                    <VoiceToggle settingKey="proactiveApps" defaultValue={false} />
                  </SettingRow>
                </Section>

                {/* Fal.ai */}
                <Section title={`Fal.ai ${t("settingsFalAiNote")}`} icon={Sparkles} accent="#9B59B6">
                  <div className="flex gap-2">
                    <input
                      type="password" id="fal-key-input"
                      placeholder={t("settingsFalAiPlaceholder")}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById("fal-key-input") as HTMLInputElement;
                        if (input?.value.trim()) {
                          await window.orun.settings.setApiKey("fal", input.value.trim());
                          input.value = "";
                          input.placeholder = t("settingsSaved");
                          setTimeout(() => { input.placeholder = t("settingsFalAiPlaceholder"); }, 2000);
                        }
                      }}
                      className="px-3 py-2 rounded-lg text-[10px]"
                      style={{ background: "#9B59B6", color: "#fff" }}
                    >
                      {t("settingsSave")}
                    </button>
                  </div>
                </Section>

                {/* MiniMax-H3 */}
                <Section title={`MiniMax-H3 ${t("settingsMinimaxNote")}`} icon={Sparkles} accent="#7B1FA2">
                  <div className="flex gap-2">
                    <input
                      type="password" id="minimax-key-input"
                      placeholder={t("settingsMinimaxPlaceholder")}
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById("minimax-key-input") as HTMLInputElement;
                        if (input?.value.trim()) {
                          await window.orun.settings.setApiKey("minimax", input.value.trim());
                          input.value = "";
                          input.placeholder = t("settingsSaved");
                          setTimeout(() => { input.placeholder = t("settingsMinimaxPlaceholder"); }, 2000);
                        }
                      }}
                      className="px-3 py-2 rounded-lg text-[10px]"
                      style={{ background: "#7B1FA2", color: "#fff" }}
                    >
                      {t("settingsSave")}
                    </button>
                  </div>
                </Section>

                {/* Firecrawl */}
                <Section title="Firecrawl" icon={Sparkles} accent="#E8544D">
                  <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>
                    Web search e scrape com markdown limpo para as tools de web. Opcional — sem chave,
                    as tools usam DuckDuckGo/HTTP direto.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password" id="firecrawl-key-input"
                      placeholder="fc-... (api.firecrawl.dev)"
                      className="flex-1 px-3 py-2 rounded-lg text-[11px] outline-none"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <button
                      onClick={async () => {
                        const input = document.getElementById("firecrawl-key-input") as HTMLInputElement;
                        if (input?.value.trim()) {
                          await window.orun.settings.setApiKey("firecrawl", input.value.trim());
                          input.value = "";
                          input.placeholder = t("settingsSaved");
                          setTimeout(() => { input.placeholder = "fc-... (api.firecrawl.dev)"; }, 2000);
                        }
                      }}
                      className="px-3 py-2 rounded-lg text-[10px]"
                      style={{ background: "#E8544D", color: "#fff" }}
                    >
                      {t("settingsSave")}
                    </button>
                  </div>
                </Section>

                {/* Google */}
                <GoogleSettings t={t} />

                {/* Spotify */}
                <SpotifySettings t={t} />

                {/* Discord */}
                <DiscordSettings t={t} />

                {/* MCP Servers */}
                <McpSettings t={t} />
              </motion.div>
            )}

            {/* ── Appearance Tab ─────────────────────────── */}
            {activeTab === "appearance" && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <Section title={t("settingsAppearanceSection")} icon={Palette} accent="#C00018">
                  <ThemeToggle />
                </Section>

                <Section title={t("settingsSecuritySection")} icon={Shield} accent="#22C55E">
                  <EncryptionToggle />
                </Section>

                <AmbientSoundsSection t={t} />

                <Section title="Atalhos de Teclado" icon={Keyboard} accent="#F59E0B">
                  <KeyboardShortcutBuilder />
                </Section>
              </motion.div>
            )}

            {/* ── System Tab ─────────────────────────────── */}
            {activeTab === "system" && (
              <motion.div key="system" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <Section title={t("settingsExecutionSection")} icon={Cpu} accent="#C00018">
                  <SettingRow label={t("settingsRunInBackground")} description={t("settingsRunInBackgroundDesc")}>
                    <input type="checkbox" checked={runInBackground} onChange={(e) => setRunInBackground(e.target.checked)} className="accent-[#C00018] w-4 h-4" />
                  </SettingRow>
                  <SettingRow label={t("settingsStartWithWindows")} description={t("settingsStartWithWindowsDesc")}>
                    <input type="checkbox" checked={autoStart} onChange={(e) => { setAutoStart(e.target.checked); window.orun.app?.setAutoStart?.(e.target.checked); }} className="accent-[#C00018] w-4 h-4" />
                  </SettingRow>
                  <SettingRow label={t("settingsWakeWord")} description={t("settings_wake_word_desc")}>
                    <input type="checkbox" checked={wakeWordEnabled} onChange={async (e) => {
                      const on = e.target.checked;
                      setWakeWordEnabled(on);
                      if (isElectron && on) {
                        // In Electron, the browser wake word doesn't work.
                        // Enable the Python-based background listener instead.
                        setBackgroundListening(true);
                        await window.orun.settings.set("backgroundListening", true);
                        await window.orun.wakeListener?.start();
                        const s = await window.orun.wakeListener?.status();
                        setWakeServiceRunning(s?.running ?? false);
                      }
                    }} className="accent-[#C00018] w-4 h-4" />
                  </SettingRow>
                  {wakeWordEnabled && (
                    <div className="ml-1 mb-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      <span>No Electron, usa detecção local via Python (STT Whisper)</span>
                    </div>
                  )}
                  <SettingRow label={t("settingsBackgroundListen")} description={t("settingsBackgroundListenDesc")}>
                    <input
                      type="checkbox"
                      checked={backgroundListening}
                      onChange={async (e) => {
                        const on = e.target.checked;
                        setBackgroundListening(on);
                        await window.orun.settings.set("backgroundListening", on);
                        if (on) {
                          await window.orun.wakeListener?.start();
                        } else {
                          await window.orun.wakeListener?.stop();
                        }
                        const s = await window.orun.wakeListener?.status();
                        setWakeServiceRunning(s?.running ?? false);
                      }}
                      className="accent-[#C00018] w-4 h-4"
                    />
                  </SettingRow>
                  {backgroundListening && (
                    <div className="flex items-center gap-2 mt-1 ml-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${wakeServiceRunning ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        {wakeServiceRunning ? t("settingsWakeServiceRunning") : t("settingsWakeServiceStopped")}
                      </span>
                      <button
                        onClick={async () => {
                          await window.orun.wakeListener?.restart();
                          setTimeout(async () => {
                            const s = await window.orun.wakeListener?.status();
                            setWakeServiceRunning(s?.running ?? false);
                          }, 1000);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                      >
                        {t("settingsWakeServiceRestart")}
                      </button>
                      <button
                        onClick={async () => {
                          const result = await window.orun.wakeListener?.test();
                          setWakeDiagnostic(result);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                      >
                        {t("settingsWakeServiceTest")}
                      </button>
                    </div>
                  )}
                  {wakeDiagnostic && (
                    <div className="mt-1 ml-1 text-[10px] space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                      <div>{wakeDiagnostic.python ? "✓" : "✗"} Python</div>
                      <div>{wakeDiagnostic.packages ? "✓" : "✗"} {t("settingsWakeDiagnosticPackages")}</div>
                      <div>{wakeDiagnostic.tcpPort ? "✓" : "✗"} {t("settingsWakeDiagnosticPort")}</div>
                    </div>
                  )}
                </Section>

                <Section title={t("settingsAgentsSection")} icon={Users} accent="#3B82F6">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onOpenAgentModels}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] transition-colors"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
                    >
                      <Users size={12} /> {t("settings_agent_models_button")}
                    </button>
                    <button
                      onClick={onOpenUsage}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] transition-colors"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
                    >
                      <Activity size={12} /> {t("settings_usage_button")}
                    </button>
                  </div>
                </Section>

                {/* DB Backup/Restore */}
                {isElectron && backups.length > 0 && (
                  <Section title={t("settingsBackupSection") || "Backup & Restore"} icon={Database} accent="#F59E0B">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {backups.map((b) => (
                        <div key={b.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] truncate" style={{ color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{b.name}</div>
                            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                              {new Date(b.date).toLocaleDateString("pt-BR")} · {Math.round(b.size / 1024)}KB
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!confirm(t("settingsRestoreConfirm") || "Restaurar este backup? O app será reiniciado.")) return;
                              setRestoring(true);
                              const result = await window.orun.db?.restore?.(b.path);
                              setRestoring(false);
                              if (result?.ok) {
                                window.location.reload();
                              }
                            }}
                            disabled={restoring}
                            className="ml-2 px-2 py-1 rounded text-[9px] transition-colors"
                            style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}
                          >
                            {restoring ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Backup (LocalStorage) */}
                {isElectron && (
                  <Section title="Backup (LocalStorage)" icon={Database} accent="#8B5CF6">
                    <div className="space-y-2">
                      {backupInfo.lastBackup && (
                        <div className="px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                            Último backup: {new Date(backupInfo.lastBackup).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await AutoBackup.manualBackup();
                            const info = await AutoBackup.getBackupInfo();
                            setBackupInfo(info);
                            const list = await AutoBackup.listBackups();
                            setLsBackups(list);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px]"
                          style={{ background: "#8B5CF6", color: "#fff" }}
                        >
                          <Download size={10} /> Fazer Backup Agora
                        </button>
                        <button
                          onClick={async () => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".json";
                            input.onchange = async () => {
                              const file = input.files?.[0];
                              if (!file) return;
                              const text = await file.text();
                              setRestoreResult("Backup carregado. Verifique os dados no console.");
                              console.log("[backup:restore] Loaded backup data:", text.slice(0, 200));
                            };
                            input.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px]"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                        >
                          <Upload size={10} /> Restaurar Backup
                        </button>
                      </div>
                      {restoreResult && (
                        <div className="px-3 py-2 rounded-lg text-[9px]" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>
                          {restoreResult}
                        </div>
                      )}
                      {lsBackups.length > 0 && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {lsBackups.map((b) => (
                            <div key={b.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] truncate" style={{ color: "var(--foreground)" }}>{b.name}</div>
                                <div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>
                                  {new Date(b.date).toLocaleDateString("pt-BR")} · {Math.round(b.size / 1024)}KB
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  setLsRestoring(true);
                                  const result = await (window as any).orun?.backup?.restore?.(b.path);
                                  if (result?.ok) {
                                    try {
                                      const parsed = JSON.parse(result.data);
                                      const { data } = parsed;
                                      for (const [key, value] of Object.entries(data)) {
                                        if (value) localStorage.setItem(key, value as string);
                                      }
                                      setRestoreResult("Backup restaurado! Dados do localStorage recuperados.");
                                    } catch {
                                      setRestoreResult("Erro ao processar o backup.");
                                    }
                                  }
                                  setLsRestoring(false);
                                }}
                                disabled={lsRestoring}
                                className="ml-2 px-2 py-1 rounded text-[8px]"
                                style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}
                              >
                                {lsRestoring ? <Loader2 size={8} className="animate-spin" /> : "Restaurar"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                <Section title={t("suporte_title")} icon={LifeBuoy} accent="#0EA5E9">
                  <button
                    onClick={onOpenSuporte}
                    className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors"
                    style={{ background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.2)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(14,165,233,0.15)" }}>
                        <LifeBuoy size={14} style={{ color: "#0EA5E9" }} />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-medium block" style={{ color: "var(--foreground)" }}>{t("suporte_title")}</span>
                        <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("suporte_settings_desc")}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </Section>

                {onOpenAchievements && (
                  <Section title={t("achievements_title")} icon={Award} accent="#EAB308">
                    <button
                      onClick={onOpenAchievements}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors"
                      style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,179,8,0.15)" }}>
                          <Award size={14} style={{ color: "#EAB308" }} />
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] font-medium block" style={{ color: "var(--foreground)" }}>{t("achievements_title")}</span>
                          <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{t("achievements_desc")}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  </Section>
                )}

                <Section title={t("settingsUpdatesSection")} icon={RefreshCw} accent="#22C55E">
                  <button
                    onClick={checkForUpdates}
                    disabled={checkingUpdate}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px]"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
                  >
                    {checkingUpdate && <Loader2 size={12} className="animate-spin" />}
                    {t("settingsCheckUpdates")}
                  </button>
                  {updateStatus?.status === "not-available" && <p className="text-[9px] mt-1" style={{ color: "#22C55E" }}>{t("settingsLatestVersion")}</p>}
                  {updateStatus?.status === "available" && <p className="text-[9px] mt-1" style={{ color: "#C00018" }}>{t("settingsUpdateAvailable")} {updateStatus.version}</p>}
                  {updateStatus?.status === "downloading" && <p className="text-[9px] mt-1" style={{ color: "#F59E0B" }}>{t("settingsDownloading")} {updateStatus.percent ?? 0}%</p>}
                  {updateStatus?.status === "downloaded" && (
                    <button onClick={() => window.orun.app.installUpdate()} className="w-full py-2 mt-1 rounded-lg text-[10px]" style={{ background: "#C00018", color: "#fff" }}>
                      {t("settingsRestartInstall")} {updateStatus.version}
                    </button>
                  )}
                  {updateStatus?.status === "error" && <p className="text-[9px] mt-1" style={{ color: "#C00018" }}>{updateStatus.message}</p>}
                </Section>
              </motion.div>
            )}
            {/* ── Profiles Tab ────────────────────────────── */}
            {activeTab === "profiles" && (
              <motion.div key="profiles" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <ProfilesPanel t={t} />
              </motion.div>
            )}
            {/* ── Shield Tab ──────────────────────────────── */}
            {activeTab === "shield" && (
              <motion.div key="shield" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <ShieldPanel />
              </motion.div>
            )}
            {/* ── Optimizer Tab ───────────────────────────── */}
            {activeTab === "optimizer" && (
              <motion.div key="optimizer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                <OptimizerPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0 flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={testConnection} disabled={testState === "testing"}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px]"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
          >
            {testState === "testing" && <Loader2 size={12} className="animate-spin" />}
            {testState === "ok" && <CheckCircle2 size={12} style={{ color: "#22C55E" }} />}
            {testState === "error" && <XCircle size={12} style={{ color: "#C00018" }} />}
            {t("settingsTestConnection")}
          </button>
          <button
            onClick={async () => { await save(); onClose(); }}
            className="flex-1 py-2.5 rounded-lg text-[10px] font-medium"
            style={{ background: "#C00018", color: "#fff", fontFamily: "'Sora', sans-serif" }}
          >
            {t("settingsSave")}
          </button>
        </div>
        {testState === "error" && <p className="text-[9px] px-5 pb-3" style={{ color: "#C00018" }}>{testError}</p>}
      </motion.div>
    </motion.div>
  );
}

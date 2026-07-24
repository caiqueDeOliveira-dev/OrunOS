import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { X, Share2, Instagram, Video, Twitter, Copy, Check, Loader2, Send, Settings2, Zap } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";

function getPlatforms(t: (key: string) => string) {
  return [
    { id: "instagram_stories", label: "Stories", icon: Instagram, color: "#E1306C", desc: t("socialMediaStoriesDesc"), publishKey: "instagram" as const, mediaType: "story" as const },
    { id: "instagram_reels", label: "Reels", icon: Instagram, color: "#E1306C", desc: t("socialMediaReelsDesc"), publishKey: "instagram" as const, mediaType: "reel" as const },
    { id: "instagram_carousel", label: "Carrossel", icon: Instagram, color: "#E1306C", desc: t("socialMediaCarouselDesc"), publishKey: "instagram" as const, mediaType: "post" as const },
    { id: "tiktok", label: "TikTok", icon: Video, color: "#000000", desc: t("socialMediaTikTokDesc"), publishKey: "tiktok" as const, mediaType: undefined },
    { id: "x_post", label: "Post X", icon: Twitter, color: "#1DA1F2", desc: t("socialMediaXPostDesc"), publishKey: "twitter" as const, mediaType: undefined },
    { id: "x_thread", label: "Thread X", icon: Twitter, color: "#1DA1F2", desc: t("socialMediaXThreadDesc"), publishKey: "twitter" as const, mediaType: undefined },
  ];
}

function getHooks(t: (key: string) => string) {
  return [
    t("socialMediaHook1"),
    t("socialMediaHook2"),
    t("socialMediaHook3"),
    t("socialMediaHook4"),
    t("socialMediaHook5"),
    t("socialMediaHook6"),
    t("socialMediaHook7"),
    t("socialMediaHook8"),
  ];
}

interface WebhookConfig {
  webhookUrl: string;
  headerName?: string;
  headerValue?: string;
}

interface Props {
  onClose: () => void;
  onSelectAgent: (agentName: string) => void;
}

export function SocialMediaPanel({ onClose, onSelectAgent }: Props) {
  const { t } = useTranslation();
  const platforms = getPlatforms(t);
  const hooks = getHooks(t);
  const [platform, setPlatform] = useState("instagram_reels");
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<Record<string, WebhookConfig>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.socialMedia.getConfig().then((cfg) => {
      if (cfg) setWebhookConfig(cfg as Record<string, WebhookConfig>);
    });
  }, []);

  const saveWebhookConfig = async () => {
    if (!isElectron) return;
    await window.orun.socialMedia.setConfig(webhookConfig as Record<string, WebhookConfig | undefined>);
  };

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setResult(null);

    const platformInfo = platforms.find((p) => p.id === platform);
    const prompt = `Crie um conteúdo para ${platformInfo?.label} sobre: "${topic}". ` +
      (hook ? `Use este gancho: "${hook}". ` : "") +
      `Plataforma: ${platform}. ` +
      `Formato: ${platformInfo?.desc}. ` +
      `Foque nos nichos: histórias apagadas, Thomas Sankara, Lumumba, Salvador Allende, ` +
      `luta contra escravidão no Brasil, luta contra racismo, grandes pessoas negras. ` +
      `Inclua: gancho, script/texto completo, dicas visuais, 15-20 hashtags, CTA, melhor horário. ` +
      `Responda em português do Brasil.`;

    onSelectAgent("Social Media");
    setResult(`Prompt enviado para o agente Social Media:\n\n${prompt}\n\nO agente vai gerar o conteúdo completo. Veja na conversa principal.`);
    setGenerating(false);
  };

  const publishContent = async (text: string) => {
    if (!isElectron || !text.trim()) return;
    const platformInfo = platforms.find((p) => p.id === platform);
    if (!platformInfo) return;

    setPublishing(true);
    setPublishResult(null);

    const payload: Record<string, unknown> = {
      platform: platformInfo.publishKey,
      text,
    };

    if (platformInfo.publishKey === "instagram") {
      if (!mediaUrl.trim()) {
        setPublishing(false);
        setPublishResult(t("socialMediaInstagramReqImage"));
        setTimeout(() => { if (mountedRef.current) setPublishResult(null); }, 5000);
        return;
      }
      payload.imageUrl = mediaUrl;
      payload.format = platformInfo.mediaType;
    } else if (platformInfo.publishKey === "tiktok") {
      if (!mediaUrl.trim()) {
        setPublishing(false);
        setPublishResult(t("socialMediaTiktokReqMedia"));
        setTimeout(() => { if (mountedRef.current) setPublishResult(null); }, 5000);
        return;
      }
      if (mediaUrl.includes(".mp4") || mediaUrl.includes("video")) {
        payload.videoUrl = mediaUrl;
      } else {
        payload.imageUrl = mediaUrl;
      }
    }

    const result = await window.orun.socialMedia.publish(payload as { platform: "instagram" | "tiktok" | "twitter"; text: string; imageUrl?: string; videoUrl?: string; format?: string });

    setPublishing(false);
    if (result.ok) {
      setPublishResult(`${t("socialMediaPublishedSuccess")} ${platformInfo.label}`);
    } else {
      setPublishResult(`${t("socialMediaPublishError")}: ${result.error}`);
    }
    setTimeout(() => { if (mountedRef.current) setPublishResult(null); }, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => { if (mountedRef.current) setCopied(false); }, 2000);
  };

  const configuredPlatforms = Object.keys(webhookConfig).filter((k) => webhookConfig[k]?.webhookUrl);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 size={16} style={{ color: "#9b59b6" }} />
            <span className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "#eee" }}>
              Social Media
            </span>
            {configuredPlatforms.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(46,204,113,0.15)", color: "#2ecc71" }}>
                <Zap size={8} /> {configuredPlatforms.length} plataforma{configuredPlatforms.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(!showSettings)} style={{ color: showSettings ? "#9b59b6" : "var(--muted-foreground)" }}>
              <Settings2 size={14} />
            </button>
            <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={16} /></button>
          </div>
        </div>

        <p className="text-[10px] mb-4" style={{ color: "var(--muted-foreground)" }}>
          {t("socialMediaCreateViral")}
        </p>

        {/* Webhook Settings */}
        {showSettings && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <span className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: "#9b59b6" }}>
              {t("socialMediaWebhooksN8n")}
            </span>
            <p className="text-[9px] mb-3" style={{ color: "var(--muted-foreground)" }}>
              {t("socialMediaConfigureWebhooks")}
            </p>
            {(["instagram", "tiktok", "twitter"] as const).map((p) => (
              <div key={p} className="mb-2">
                <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{p}</label>
                <input
                  value={webhookConfig[p]?.webhookUrl || ""}
                  onChange={(e) => setWebhookConfig((prev) => ({
                    ...prev,
                    [p]: { ...prev[p], webhookUrl: e.target.value },
                  }))}
                  placeholder={`https://seu-n8n.com/webhook/social-${p}`}
                  className="w-full px-2 py-1.5 rounded text-[10px] outline-none"
                  style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
              </div>
            ))}
            <button
              onClick={async () => { await saveWebhookConfig(); setShowSettings(false); }}
              className="w-full mt-2 py-1.5 rounded text-[10px]"
              style={{ background: "#9b59b6", color: "var(--foreground)" }}
            >
              {t("socialMediaSaveWebhooks")}
            </button>
          </div>
        )}

        {/* Platform Selection */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>
          {t("socialMediaPlatform")}
        </label>
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {platforms.map((p) => {
            const isConfigured = !!webhookConfig[p.publishKey]?.webhookUrl;
            return (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px]"
                style={{
                  background: platform === p.id ? "var(--border)" : "var(--secondary)",
                  border: `1px solid ${platform === p.id ? p.color : "var(--border)"}`,
                  color: platform === p.id ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                <p.icon size={12} />
                {p.label}
                {isConfigured && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2ecc71" }} />}
              </button>
            );
          })}
        </div>

        {/* Topic */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>
          {t("social_topic_label")}
        </label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t("social_topic_placeholder")}
          className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-3"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />

        {/* Hook Selection */}
        <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>
          {t("social_hook_label")}
        </label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {hooks.map((h) => (
            <button
              key={h}
              onClick={() => setHook(hook === h ? "" : h)}
              className="px-2 py-1 rounded-md text-[9px]"
              style={{
                background: hook === h ? "#9b59b6" : "var(--secondary)",
                border: `1px solid ${hook === h ? "#9b59b6" : "var(--border)"}`,
                color: hook === h ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Media URL (for Instagram/TikTok) */}
        {(platforms.find((p) => p.id === platform)?.publishKey === "instagram" ||
          platforms.find((p) => p.id === platform)?.publishKey === "tiktok") && (
          <>
            <label className="block text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              {platforms.find((p) => p.id === platform)?.publishKey === "instagram" ? t("socialMediaImageUrl") : t("socialMediaMediaUrl")}
            </label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={t("social_photo_placeholder")}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-3"
              style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </>
        )}

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={!topic.trim() || generating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs mb-3"
          style={{
            background: topic.trim() ? "#9b59b6" : "var(--border)",
            border: "1px solid #232323",
            color: topic.trim() ? "var(--foreground)" : "var(--muted-foreground)",
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
          {generating ? t("socialMediaGenerating") : t("socialMediaGenerateContent")}
        </button>

        {/* Publish Result */}
        {publishResult && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px]" style={{
            background: publishResult.includes("sucesso") ? "rgba(46,204,113,0.1)" : "rgba(192,0,24,0.1)",
            border: `1px solid ${publishResult.includes("sucesso") ? "rgba(46,204,113,0.3)" : "rgba(192,0,24,0.3)"}`,
            color: publishResult.includes("sucesso") ? "#2ecc71" : "#C00018",
          }}>
            {publishResult}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-3 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#9b59b6" }}>{t("socialMediaGeneratedPrompt")}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyToClipboard(result)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px]"
                  style={{ background: "var(--border)", color: "var(--muted-foreground)" }}
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? t("socialMediaCopied") : t("socialMediaCopy")}
                </button>
                <button
                  onClick={() => publishContent(result)}
                  disabled={publishing}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px]"
                  style={{
                    background: webhookConfig[platforms.find((p) => p.id === platform)?.publishKey || ""]?.webhookUrl ? "rgba(46,204,113,0.15)" : "var(--border)",
                    color: webhookConfig[platforms.find((p) => p.id === platform)?.publishKey || ""]?.webhookUrl ? "#2ecc71" : "var(--muted-foreground)",
                  }}
                >
                  {publishing ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                    {t("socialMediaPublish")}
                </button>
              </div>
            </div>
            <p className="text-[11px] whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{result}</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../../../../../i18n/I18nProvider";
import { useMarketingStore } from "../marketing-store";
import { WorkspaceCard } from "../../../components/WorkspaceCard";
import { WorkspaceBadge } from "../../../components/WorkspaceBadge";
import { WorkspaceButton } from "../../../components/WorkspaceButton";
import { WorkspaceInput } from "../../../components/WorkspaceInput";
import { WorkspaceEmptyState } from "../../../components/WorkspaceEmptyState";
import type { ScheduledPost } from "../marketing-types";

const PLATFORMS = ["instagram", "tiktok", "twitter"] as const;

export function ScheduleView() {
  const { t } = useTranslation();
  const scheduledPosts = useMarketingStore((s) => s.scheduledPosts || []);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [hashtagsStr, setHashtagsStr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!autoPublish) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    const check = async () => {
      const now = Date.now();
      const store = useMarketingStore;
      const state = store.getState?.();
      if (!state?.scheduledPosts) return;
      const due = state.scheduledPosts.filter(
        (p: ScheduledPost) => p.status === "pending" && new Date(p.scheduledAt).getTime() <= now
      );
      for (const post of due) {
        try {
          const platforms = post.platforms as ["instagram" | "tiktok" | "twitter"];
          const result = await window.orun?.socialMedia?.publishMulti({
            platforms,
            text: post.content,
            hashtags: post.hashtags,
            imageUrl: post.imageUrl,
          });
          const ok = result?.some((r) => r.ok);
          store.setState?.((s: any) => ({
            scheduledPosts: (s.scheduledPosts || []).map((p: ScheduledPost) =>
              p.id === post.id
                ? { ...p, status: ok ? ("published" as const) : ("failed" as const), publishedAt: ok ? new Date().toISOString() : undefined, error: ok ? undefined : "Publishing failed" }
                : p
            ),
          }));
        } catch {
          store.setState?.((s: any) => ({
            scheduledPosts: (s.scheduledPosts || []).map((p: ScheduledPost) =>
              p.id === post.id ? { ...p, status: "failed" as const, error: "Publishing error" } : p
            ),
          }));
        }
      }
    };
    intervalRef.current = setInterval(check, 30000);
    check();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoPublish]);

  const handleCreate = async () => {
    if (!title || !content || !scheduledAt) {
      setMessage({ type: "error", text: t("Preencha título, conteúdo e data") });
      return;
    }
    const post: ScheduledPost = {
      id: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      content,
      platforms,
      scheduledAt,
      status: "pending",
      hashtags: hashtagsStr.split(",").map((h) => h.trim()).filter(Boolean),
      imageUrl: imageUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    const store = useMarketingStore;
    store.setState?.((s: any) => ({
      scheduledPosts: [...(s.scheduledPosts || []), post],
    }));
    setTitle("");
    setContent("");
    setPlatforms(["instagram"]);
    setScheduledAt("");
    setHashtagsStr("");
    setImageUrl("");
    setShowForm(false);
    setMessage({ type: "success", text: t("Post agendado com sucesso") });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = (postId: string) => {
    const store = useMarketingStore;
    store.setState?.((s: any) => ({
      scheduledPosts: (s.scheduledPosts || []).filter((p: ScheduledPost) => p.id !== postId),
    }));
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    try {
      const platforms = post.platforms as ["instagram" | "tiktok" | "twitter"];
      const result = await window.orun?.socialMedia?.publishMulti({
        platforms,
        text: post.content,
        hashtags: post.hashtags,
        imageUrl: post.imageUrl,
      });
      const ok = result?.some((r) => r.ok);
      const store = useMarketingStore;
      store.setState?.((s: any) => ({
        scheduledPosts: (s.scheduledPosts || []).map((p: ScheduledPost) =>
          p.id === post.id
            ? { ...p, status: ok ? ("published" as const) : ("failed" as const), publishedAt: ok ? new Date().toISOString() : undefined, error: ok ? undefined : result?.find((r) => !r.ok)?.error || "Unknown error" }
            : p
        ),
      }));
      setMessage({ type: ok ? "success" : "error", text: ok ? t("Publicado com sucesso") : t("Falha ao publicar") });
    } catch {
      setMessage({ type: "error", text: t("Erro ao publicar") });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const statusBadge = (status: ScheduledPost["status"]) => {
    const variants: Record<string, "yellow" | "green" | "red"> = { pending: "yellow", published: "green", failed: "red" };
    return <WorkspaceBadge variant={variants[status]}>{status === "pending" ? t("Pendente") : status === "published" ? t("Publicado") : t("Falhou")}</WorkspaceBadge>;
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{ color: "#FFFFFF" }}>{t("Posts Agendados")}</span>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-[9px]" style={{ color: "#A0A0A0" }}>
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="w-3 h-3 accent-red-600"
            />
            {t("Auto-publicar")}
          </label>
          <WorkspaceButton onClick={() => setShowForm(!showForm)} variant="primary" size="sm">
            {showForm ? t("Cancelar") : t("Novo Agendamento")}
          </WorkspaceButton>
        </div>
      </div>

      {message && (
        <div className={`text-[9px] px-2 py-1 rounded ${message.type === "success" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <WorkspaceCard>
          <div className="space-y-2">
            <WorkspaceInput
              placeholder={t("Título do post")}
              value={title}
              onChange={(v) => setTitle(v)}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("Conteúdo do post")}
              className="w-full text-[10px] rounded-md px-2 py-1.5 resize-none"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #252525", color: "#FFFFFF", minHeight: 60 }}
            />
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-1 text-[9px]" style={{ color: "#A0A0A0" }}>
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    className="w-3 h-3 accent-red-600"
                  />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
            <WorkspaceInput
              type="datetime-local"
              value={scheduledAt}
              onChange={(v) => setScheduledAt(v)}
            />
            <WorkspaceInput
              placeholder={t("Hashtags (separadas por vírgula)")}
              value={hashtagsStr}
              onChange={(v) => setHashtagsStr(v)}
            />
            <WorkspaceInput
              placeholder={t("URL da imagem (opcional)")}
              value={imageUrl}
              onChange={(v) => setImageUrl(v)}
            />
            <WorkspaceButton onClick={handleCreate} variant="primary" size="sm">{t("Agendar")}</WorkspaceButton>
          </div>
        </WorkspaceCard>
      )}

      {scheduledPosts.length === 0 && !showForm ? (
        <WorkspaceEmptyState
          icon={<span style={{ fontSize: 18 }}>📅</span>}
          message={t("Nenhum post agendado")}
        />
      ) : (
        scheduledPosts.map((post) => (
          <WorkspaceCard key={post.id}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: "#FFFFFF" }}>{post.title}</p>
                <p className="text-[9px] text-ellipsis overflow-hidden whitespace-nowrap" style={{ color: "#A0A0A0" }}>
                  {post.content}
                </p>
              </div>
              {statusBadge(post.status)}
            </div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {post.platforms.map((p) => (
                <WorkspaceBadge key={p} variant="red">{p}</WorkspaceBadge>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[8px]" style={{ color: "#A0A0A0" }}>
                {new Date(post.scheduledAt).toLocaleString("pt-BR")}
                {post.hashtags.length > 0 && ` • ${post.hashtags.map((h) => `#${h}`).join(" ")}`}
              </span>
              <div className="flex gap-1">
                {post.status === "pending" && (
                  <WorkspaceButton onClick={() => handlePublishNow(post)} variant="primary" size="sm">{t("Publicar Agora")}</WorkspaceButton>
                )}
                <WorkspaceButton onClick={() => handleDelete(post.id)} variant="ghost" size="sm">{t("Excluir")}</WorkspaceButton>
              </div>
            </div>
            {post.status === "failed" && post.error && (
              <p className="text-[8px] mt-1 text-red-400">{post.error}</p>
            )}
            {post.publishedAt && (
              <p className="text-[8px] mt-1" style={{ color: "#A0A0A0" }}>
                {t("Publicado em")}: {new Date(post.publishedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </WorkspaceCard>
        ))
      )}
    </div>
  );
}

// components/WorldScreen.tsx
// WORLD space — o pulso ao vivo do universo do usuário. Estilo worldmonitor:
// grid de cards com imagem (feeds BR diretos: G1/UOL/Agência Brasil), fila de
// vídeos (canais de jornalismo no YouTube) e mercados/clima (fase 2 mantida).

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Globe, ArrowLeftRight, Newspaper, CloudSun, Compass, Sun, Cloud, CloudFog,
  CloudDrizzle, CloudRain, CloudSnow, CloudLightning, TrendingUp, TrendingDown,
  Play, ExternalLink, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getAgents } from "../constants";
import { useMarketQuotes, useWeather, useWorldNews } from "../hooks/useWorldData";
import { relativeTime } from "./ActivityStream";
import { isElectron } from "../constants";

function weatherIcon(code: number | null): LucideIcon {
  if (code == null) return CloudSun;
  if (code <= 1) return Sun;
  if (code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code <= 48) return CloudFog;
  if (code <= 57) return CloudDrizzle;
  if (code <= 67 || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  return CloudLightning;
}

function fmtPrice(n: number): string {
  const digits = n >= 1000 ? 0 : n >= 10 ? 2 : 2;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={`ws-card p-4 flex flex-col gap-3 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CardTitle({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} strokeWidth={1.8} style={{ color: "var(--primary)" }} />
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

const Skeleton = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-3 rounded animate-pulse" style={{ background: "var(--surface-3)", width: `${90 - i * 15}%` }} />
    ))}
  </div>
);

const Unavailable = ({ label }: { label: string }) => (
  <p className="text-[11px] py-2" style={{ color: "var(--text-tertiary)" }}>{label}</p>
);

/** Capa da notícia: imagem com fallback em gradiente se falhar/ausente. */
function NewsCover({ image, alt }: { image?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = image && !failed;
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg shrink-0" style={{ background: failed || !image ? "linear-gradient(135deg, rgba(195,0,47,0.16), var(--surface-3))" : undefined }}>
      {showImg ? (
        <img
          src={image}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper size={22} strokeWidth={1.4} style={{ color: "var(--text-tertiary)" }} />
        </div>
      )}
    </div>
  );
}

export function WorldScreen() {
  const { t, locale } = useTranslation();
  const { quotes, error: quotesError } = useMarketQuotes();
  const { weather, error: weatherError } = useWeather();
  const { items: news, videos, error: newsError } = useWorldNews();
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const agents = getAgents(t);

  const sources = useMemo(() => {
    const set = new Set<string>();
    (news || []).forEach((n) => n.source && set.add(n.source));
    return [...set];
  }, [news]);

  const filteredNews = useMemo(
    () => (sourceFilter ? (news || []).filter((n) => n.source === sourceFilter) : news || []),
    [news, sourceFilter]
  );

  const now = new Date();
  const dateLabel = `${now.toLocaleDateString(locale, { weekday: "long" })}, ${now.toLocaleDateString(locale, { day: "numeric", month: "long" })}`;
  const usd = quotes?.find((q) => q.pair === "USD");
  const WeatherIcon = weatherIcon(weather?.code ?? null);

  return (
    <div className="flex-1 overflow-y-auto ws-scrollbar">
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(195,0,47,0.12)", color: "var(--primary)" }}>
              <Globe size={18} strokeWidth={1.7} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
              {t("worldTitle")}
            </h1>
          </div>
          <p className="text-[13px] pl-12" style={{ color: "var(--muted-foreground)" }}>{t("worldSubtitle")}</p>
        </motion.div>

        {/* Day summary hero */}
        <Card delay={0.05} className="mt-6">
          <CardTitle icon={Globe} label={t("worldModuleDaySummary")} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[26px] font-semibold tracking-tight leading-none capitalize" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {dateLabel}
              </p>
              {weather && (
                <p className="text-[11px] mt-1.5 truncate max-w-[320px]" style={{ color: "var(--text-tertiary)" }}>{weather.city}</p>
              )}
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              {weather && (
                <div className="flex items-center gap-2">
                  <WeatherIcon size={20} strokeWidth={1.6} style={{ color: "var(--warn)" }} />
                  <span className="text-[22px] font-medium font-data tabular-nums leading-none" style={{ color: "var(--foreground)" }}>
                    {weather.temperature != null ? `${Math.round(weather.temperature)}°` : "—"}
                  </span>
                </div>
              )}
              {usd && (
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-[0.12em]" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>USD</p>
                  <p className="text-[16px] font-medium font-data tabular-nums leading-tight" style={{ color: "var(--foreground)" }}>R$ {fmtPrice(usd.price)}</p>
                </div>
              )}
              {!weather && !quotes && <Skeleton />}
            </div>
          </div>
        </Card>

        {/* Markets + Climate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Card delay={0.1}>
            <CardTitle icon={ArrowLeftRight} label={t("worldModuleMarkets")} />
            {quotesError ? (
              <Unavailable label={`${t("worldUnavailable")} · AwesomeAPI`} />
            ) : !quotes ? (
              <Skeleton />
            ) : (
              <ul className="space-y-2">
                {quotes.map((q) => (
                  <li key={q.pair} className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium w-9 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>{q.pair}</span>
                    <span className="text-[13px] font-data tabular-nums" style={{ color: "var(--foreground)" }}>R$ {fmtPrice(q.price)}</span>
                    <span
                      className="ml-auto flex items-center gap-1 text-[10px] font-data tabular-nums"
                      style={{ color: q.changePercent >= 0 ? "var(--ok)" : "var(--err)" }}
                    >
                      {q.changePercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {q.changePercent >= 0 ? "+" : ""}{q.changePercent.toFixed(2)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card delay={0.15}>
            <CardTitle icon={CloudSun} label={t("worldModuleClimate")} />
            {weatherError ? (
              <Unavailable label={`${t("worldUnavailable")} · Open-Meteo`} />
            ) : !weather ? (
              <Skeleton />
            ) : (
              <div className="flex items-center gap-4">
                <WeatherIcon size={34} strokeWidth={1.4} style={{ color: "var(--warn)" }} />
                <div>
                  <p className="text-[24px] font-medium font-data tabular-nums leading-none" style={{ color: "var(--foreground)" }}>
                    {weather.temperature != null ? `${Math.round(weather.temperature)}°C` : "—"}
                  </p>
                  <p className="text-[10px] mt-1 font-data tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                    {weather.min != null ? `${Math.round(weather.min)}°` : "—"} / {weather.max != null ? `${Math.round(weather.max)}°` : "—"} · {t("worldFeelsLike")} {weather.feelsLike != null ? `${Math.round(weather.feelsLike)}°` : "—"}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Vídeos — fila horizontal estilo worldmonitor */}
        {isElectron && videos.length > 0 && (
          <Card delay={0.18} className="mt-3">
            <CardTitle icon={Play} label="Vídeos · Ao vivo e destaques" />
            <div className="flex gap-3 overflow-x-auto pb-1 ws-scrollbar">
              {videos.slice(0, 8).map((v, i) => (
                <a
                  key={`${v.link}-${i}`}
                  href={v.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative w-[210px] shrink-0 rounded-lg overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <div className="aspect-video relative" style={{ background: "var(--surface-3)" }}>
                    <img src={v.image} alt={v.title} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                    <span
                      className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.25)" }}
                    >
                      <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(195,0,47,0.92)", color: "#fff" }}>
                        <Play size={15} fill="currentColor" />
                      </span>
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-[10.5px] leading-snug line-clamp-2 group-hover:text-[var(--primary)] transition-colors" style={{ color: "var(--foreground)" }}>
                      {v.title}
                    </p>
                    <p className="text-[8.5px] mt-1 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                      <span>{v.source}</span>
                      <span className="font-data">{relativeTime(v.publishedAt)}</span>
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Notícias — grid de cards com imagem */}
        <Card delay={0.22} className="mt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle icon={Newspaper} label={t("worldModuleNews")} />
            {sources.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSourceFilter(null)}
                  className="px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors"
                  style={{
                    background: !sourceFilter ? "rgba(195,0,47,0.14)" : "transparent",
                    color: !sourceFilter ? "var(--primary)" : "var(--text-tertiary)",
                    border: `1px solid ${!sourceFilter ? "rgba(195,0,47,0.35)" : "var(--border)"}`,
                  }}
                >
                  Todas
                </button>
                {sources.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSourceFilter(s === sourceFilter ? null : s)}
                    className="px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors"
                    style={{
                      background: s === sourceFilter ? "rgba(195,0,47,0.14)" : "transparent",
                      color: s === sourceFilter ? "var(--primary)" : "var(--text-tertiary)",
                      border: `1px solid ${s === sourceFilter ? "rgba(195,0,47,0.35)" : "var(--border)"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {newsError ? (
            <Unavailable label={`${t("worldUnavailable")} · Feeds BR`} />
          ) : !news ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="aspect-video animate-pulse" style={{ background: "var(--surface-3)" }} />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface-3)", width: "95%" }} />
                    <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--surface-3)", width: "70%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <Unavailable label="Nenhuma notícia para este filtro." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNews.slice(0, 24).map((item, i) => (
                <motion.a
                  key={`${item.link}-${i}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="group rounded-lg overflow-hidden flex flex-col hover:-translate-y-0.5 transition-transform"
                  style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
                >
                  <NewsCover image={item.image} alt={item.title} />
                  <div className="p-2.5 flex flex-col gap-1 flex-1">
                    <p className="text-[11.5px] leading-snug line-clamp-3 flex-1 group-hover:text-[var(--primary)] transition-colors" style={{ color: "var(--foreground)" }}>
                      {item.title}
                    </p>
                    <p className="text-[8.5px] flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                      <span className="px-1.5 py-px rounded-full" style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>{item.source}</span>
                      <span className="font-data">{relativeTime(item.publishedAt)}</span>
                      <ExternalLink size={9} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </Card>

        {/* Universe (local data) */}
        <Card delay={0.26} className="mt-3 mb-2">
          <CardTitle icon={Compass} label={t("worldModuleUniverse")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[20px] font-semibold font-data tabular-nums leading-none" style={{ color: "var(--foreground)" }}>{agents.length}</p>
              <p className="text-[9px] uppercase tracking-[0.12em] mt-1" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{t("navAgents")}</p>
            </div>
            <div>
              <p className="text-[20px] font-semibold font-data tabular-nums leading-none" style={{ color: isElectron ? "var(--foreground)" : "var(--text-tertiary)" }}>{isElectron ? 8 : "—"}</p>
              <p className="text-[9px] uppercase tracking-[0.12em] mt-1" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{t("railSpaces")}</p>
            </div>
            <div>
              <p className="text-[20px] font-semibold font-data tabular-nums leading-none" style={{ color: "var(--foreground)" }}>{quotes ? quotes.length : "—"}</p>
              <p className="text-[9px] uppercase tracking-[0.12em] mt-1" style={{ fontFamily: "'Sora', sans-serif", color: "var(--text-tertiary)" }}>{t("worldModuleMarkets")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

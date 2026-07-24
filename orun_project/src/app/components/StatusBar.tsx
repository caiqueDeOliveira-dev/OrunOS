import React, { useEffect, useState } from "react";
import { Cpu, Wifi, Bell, Sparkles, Mic } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";
import type { OrunProvider } from "../../types/orun";
import type { HamptonState } from "../types";

const PROVIDER_SHORT: Record<OrunProvider, string> = {
  ollama: "Ollama", anthropic: "Claude", openai: "OpenAI",
  openrouter: "OpenRouter", groq: "Groq", github: "GitHub",
  opencodezen: "OC Zen",
};

const Clock = React.memo(function Clock({ locale }: { locale: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 30000); return () => clearInterval(i); }, []);
  return (
    <span className="text-[10px] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
      {time.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
});

export const StatusBar = React.memo(function StatusBar({ onOpenModelPicker, hamptonState = "idle" }: { onOpenModelPicker?: () => void; hamptonState?: HamptonState }) {
  const { t, locale } = useTranslation();
  const [aiModel, setAiModel] = useState<{ provider: OrunProvider; model: string } | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ provider: OrunProvider; model: string }>("ai").then((v) => { if (v) setAiModel(v); });
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--card)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        <span className="text-xs tracking-[0.22em] uppercase" style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)", fontWeight: 600 }}>
          Orun OS
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)", boxShadow: "0 0 6px var(--primary)" }} />
          <span className="text-[10px] tracking-widest" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
            {t("statusHamptonOnline")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {aiModel && (
          <button
            onClick={onOpenModelPicker}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:border-[var(--primary)]"
            style={{ background: "color-mix(in srgb, var(--primary) 6%, transparent)", border: "1px solid var(--border)", cursor: onOpenModelPicker ? "pointer" : "default" }}
            title={t("statusChangeModel")}
          >
            <Sparkles size={9} style={{ color: "var(--primary)" }} />
            <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>
              {PROVIDER_SHORT[aiModel.provider]}/{aiModel.model.split("/").pop()?.slice(0, 20) || aiModel.model}
            </span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <Cpu size={10} style={{ color: "var(--muted-foreground)" }} />
          <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{t("statusNativeAI")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={10} style={{ color: online ? "var(--muted-foreground)" : "#EF4444" }} />
          <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: online ? "var(--muted-foreground)" : "#EF4444" }}>{online ? t("statusOnline") : t("statusOffline")}</span>
        </div>
        <Bell size={12} style={{ color: "var(--muted-foreground)" }} />
        <div className="flex items-center gap-1.5">
          {hamptonState === "listening" && (
            <div className="relative">
              <Mic size={11} style={{ color: "#C00018" }} />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#C00018", boxShadow: "0 0 6px #C00018", animation: "orunStatePulse 1s ease-in-out infinite" }} />
            </div>
          )}
          <Clock locale={locale} />
        </div>
      </div>
    </div>
  );
});

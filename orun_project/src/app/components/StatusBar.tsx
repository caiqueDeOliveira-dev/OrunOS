import { useEffect, useState } from "react";
import { Cpu, Wifi, Bell, Sparkles } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { isElectron } from "../constants";
import type { OrunProvider } from "../../types/orun";

const PROVIDER_SHORT: Record<OrunProvider, string> = {
  ollama: "Ollama", anthropic: "Claude", openai: "OpenAI",
  openrouter: "OpenRouter", groq: "Groq", github: "GitHub",
  opencodezen: "OC Zen",
};

export function StatusBar({ onOpenModelPicker }: { onOpenModelPicker?: () => void }) {
  const { t, locale } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [aiModel, setAiModel] = useState<{ provider: OrunProvider; model: string } | null>(null);
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ provider: OrunProvider; model: string }>("ai").then((v) => { if (v) setAiModel(v); });
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#141414", background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        <span className="text-xs tracking-[0.22em] uppercase" style={{ fontFamily: "'Cinzel', serif", color: "#F5F5F5", fontWeight: 600 }}>
          Orun OS
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C00018", boxShadow: "0 0 6px #C00018" }} />
          <span className="text-[10px] tracking-widest" style={{ fontFamily: "'Sora', sans-serif", color: "#888" }}>
            Hampton • Online
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {aiModel && (
          <button
            onClick={onOpenModelPicker}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:border-[#C00018]"
            style={{ background: "rgba(192,0,24,0.06)", border: "1px solid #1e1e1e", cursor: onOpenModelPicker ? "pointer" : "default" }}
            title="Change model"
          >
            <Sparkles size={9} style={{ color: "#2ecc71" }} />
            <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>
              {PROVIDER_SHORT[aiModel.provider]}/{aiModel.model.split("/").pop()?.slice(0, 20) || aiModel.model}
            </span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <Cpu size={10} style={{ color: "#444" }} />
          <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#444" }}>{t("statusNativeAI")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={10} style={{ color: "#444" }} />
          <span className="text-[9px] tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#444" }}>{t("statusConnected")}</span>
        </div>
        <Bell size={12} style={{ color: "#333" }} />
        <span className="text-[10px] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#888" }}>
          {time.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

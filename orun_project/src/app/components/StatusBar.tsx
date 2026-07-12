import { useEffect, useState } from "react";
import { Cpu, Wifi, Bell } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

export function StatusBar() {
  const { t, locale } = useTranslation();
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);

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

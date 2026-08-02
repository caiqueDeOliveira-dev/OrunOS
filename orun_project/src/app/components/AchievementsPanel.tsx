import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Award } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getAll, getStats, type Achievement } from "../services/achievements";

interface Props {
  onClose: () => void;
}

export function AchievementsPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({ unlocked: 0, total: 0, percentage: 0 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setAchievements(getAll());
    setStats(getStats());
    const interval = setInterval(() => {
      setAchievements(getAll());
      setStats(getStats());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[520px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(234,179,8,0.1)" }}>
              <Award size={14} style={{ color: "#EAB308" }} />
            </div>
            <div>
              <span className="text-sm tracking-widest uppercase block" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("achievements_title")}
              </span>
              <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>
                {t("achievements_desc")}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--muted-foreground)", background: "var(--secondary)" }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}>
            {t("achievements_unlocked", { unlocked: stats.unlocked, total: stats.total, percentage: stats.percentage })}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div
                key={a.id}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                style={{
                  background: a.unlocked ? "rgba(234,179,8,0.08)" : "var(--secondary)",
                  border: `1px solid ${a.unlocked ? "rgba(234,179,8,0.25)" : "var(--border)"}`,
                  opacity: a.unlocked || !a.secret ? 1 : 0.4,
                }}
              >
                <span className="text-xl" style={{ filter: a.unlocked ? "none" : "grayscale(1)" }}>
                  {a.unlocked || !a.secret ? a.icon : "?"}
                </span>
                <span
                  className="text-[10px] font-medium text-center leading-tight"
                  style={{ color: a.unlocked ? "var(--foreground)" : "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}
                >
                  {a.unlocked || !a.secret ? a.name : "???"}
                </span>
                {(a.unlocked || !a.secret) && (
                  <span className="text-[8px] text-center leading-tight" style={{ color: "var(--muted-foreground)" }}>
                    {a.description}
                  </span>
                )}
                {!a.unlocked && a.progress > 0 && (
                  <div className="w-full h-1 rounded-full mt-1" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${a.progress}%`, background: "var(--primary)" }}
                    />
                  </div>
                )}
                {a.unlocked && a.unlockedAt && (
                  <span className="text-[7px]" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(a.unlockedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

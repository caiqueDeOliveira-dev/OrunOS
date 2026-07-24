import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";
import { AvatarOrb } from "./AvatarOrb";
import type { HamptonState } from "../types";

interface AvatarHomeProps {
  hamptonState: HamptonState;
}

export function AvatarHome({ hamptonState }: AvatarHomeProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      key="avatar-home"
      className="flex-1 flex flex-col items-center justify-center pb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
    >
      <AvatarOrb size={320} />

      <motion.div
        className="text-center mt-4 space-y-1.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-3xl tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--foreground)", fontWeight: 300 }}>
          {t("homeWelcomeBack")}
        </p>
        <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)", fontWeight: 300 }}>
          {t("homeHowCanIHelp")}
        </p>
      </motion.div>

      <div className="flex items-center gap-3 mt-6">
        {[t("statusNativeAI"), t("homeCloudModels"), t("homeActiveMemory")].map((label, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
            <div className="w-1 h-1 rounded-full" style={{ background: i === 0 ? "#C00018" : "#3a3a3a", boxShadow: i === 0 ? "0 0 4px #C00018" : "none" }} />
            <span className="text-[9px] tracking-wider" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {hamptonState !== "idle" && (
          <motion.span
            className="mt-4 text-[10px] tracking-[0.22em] uppercase"
            style={{ fontFamily: "'Sora', sans-serif", color: "#C00018", animation: "orunStatePulse 1s ease-in-out infinite", display: "inline-block" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {hamptonState === "listening" && t("homeListening")}
            {hamptonState === "thinking" && t("homeThinking")}
            {hamptonState === "speaking" && t("homeSpeaking")}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

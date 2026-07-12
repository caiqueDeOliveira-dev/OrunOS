import { useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  useEffect(() => { const i = setTimeout(onDone, 3600); return () => clearTimeout(i); }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "#080808" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        className="flex flex-col items-center gap-4"
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.4, times: [0, 0.18, 0.82, 1], ease: "easeInOut" }}
      >
        {/* Mark */}
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" stroke="#C00018" strokeWidth="1.5" fill="none" />
          <polygon points="26,12 40,20 40,32 26,40 12,32 12,20" stroke="#C00018" strokeWidth="0.6" fill="rgba(192,0,24,0.04)" />
          <circle cx="26" cy="26" r="5" fill="#C00018" style={{ filter: "drop-shadow(0 0 6px #C00018)" }} />
        </svg>

        <div className="flex flex-col items-center gap-1.5 mt-2">
          <h1
            className="text-4xl tracking-[0.28em] text-[#F5F5F5] uppercase"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 600 }}
          >
            {t("splashBrand")}
          </h1>
          <p
            className="text-sm tracking-[0.18em] text-[#B5B5B5]"
            style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300 }}
          >
            {t("splashSolutions")}
          </p>
        </div>

        {/* Divider line */}
        <motion.div
          className="h-px mt-2"
          style={{ background: "linear-gradient(to right, transparent, #C00018, transparent)" }}
          initial={{ width: 0 }}
          animate={{ width: 220 }}
          transition={{ delay: 0.4, duration: 1.1, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

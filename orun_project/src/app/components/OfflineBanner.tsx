import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <WifiOff size={14} style={{ color: "#EF4444" }} />
          <span className="text-[11px] font-medium" style={{ color: "#EF4444", fontFamily: "'Sora', sans-serif" }}>
            {t("offlineMessage")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

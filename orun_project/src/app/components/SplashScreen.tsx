import { useEffect } from "react";
import { motion } from "motion/react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const i = setTimeout(onDone, 3600); return () => clearTimeout(i); }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.4, times: [0, 0.18, 0.82, 1], ease: "easeInOut" }}
      >
        <svg width="72" height="72" viewBox="0 0 52 52" fill="none">
          <polygon points="26,2 50,14 50,38 26,50 2,38 2,14" stroke="#C00018" strokeWidth="1.5" fill="none" />
          <polygon points="26,12 40,20 40,32 26,40 12,32 12,20" stroke="#C00018" strokeWidth="0.6" fill="rgba(192,0,24,0.04)" />
          <circle cx="26" cy="26" r="5" fill="#C00018" style={{ filter: "drop-shadow(0 0 6px #C00018)" }} />
        </svg>
      </motion.div>
    </motion.div>
  );
}

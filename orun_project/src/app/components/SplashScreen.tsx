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
        <div className="relative">
          <div
            className="absolute rounded-full"
            style={{
              inset: -24,
              background: "radial-gradient(circle, rgba(195,0,47,0.18) 0%, transparent 65%)",
              animation: "orunAuraPulse 2.5s ease-in-out infinite",
            }}
          />
          <img
            src="./LogoIA.png"
            alt="Orun OS"
            className="relative rounded-full"
            style={{
              width: 84,
              height: 84,
              objectFit: "cover",
              border: "1px solid rgba(195,0,47,0.45)",
              boxShadow: "0 0 30px rgba(195,0,47,0.25), inset 0 0 20px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

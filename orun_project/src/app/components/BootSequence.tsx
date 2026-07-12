import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "../../i18n/I18nProvider";
import { getBootMessages } from "../constants";

export function BootSequence({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const BOOT_MESSAGES = getBootMessages(t);
  const [visible, setVisible] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const total = BOOT_MESSAGES.length;
    let i = 0;
    const tick = () => {
      setVisible(p => [...p, i]);
      setProgress(Math.round(((i + 1) / total) * 100));
      i++;
      if (i < total) setTimeout(tick, 380);
    };
    const start = setTimeout(tick, 300);

    // Safety net: if the video fails to load/play, don't get stuck forever.
    const fallback = setTimeout(finish, 9000);

    return () => { clearTimeout(start); clearTimeout(fallback); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#080808" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Loading video background */}
      <video
        ref={videoRef}
        src="./loading.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.9 }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,8,8,0.55) 75%, #080808 100%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, transparent 25%, transparent 70%, rgba(8,8,8,0.85) 100%)" }} />

      {/* Boot text overlay */}
      <div className="relative z-10 w-full max-w-sm px-8 mt-auto mb-12">
        <div className="mb-6 text-center">
          <div className="text-[10px] tracking-[0.32em] text-[#E5E5E5] uppercase mb-1.5" style={{ fontFamily: "'Sora', sans-serif" }}>
            Orun OS
          </div>
          <div className="text-[9px] tracking-[0.22em] text-[#FF1A2D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            v0.2.0 — {t("bootSequence")}
          </div>
        </div>

        <div className="space-y-1.5 mb-6" style={{ minHeight: 40 }}>
          {visible.length > 0 && (
            <div className="flex items-center gap-3">
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: visible.length === BOOT_MESSAGES.length ? "#FF1A2D" : "#C00018" }}>
                {visible.length === BOOT_MESSAGES.length ? "✓" : "›"}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F0F0F0", letterSpacing: "0.04em" }}>
                {BOOT_MESSAGES[visible[visible.length - 1]]}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-[9px] tracking-widest text-[#888]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t("bootLoading")}</span>
            <span className="text-[9px] tabular-nums text-[#FF1A2D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{progress}%</span>
          </div>
          <div className="w-full rounded-full" style={{ height: 1, background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: "linear-gradient(to right, #C00018, #FF1A2D)", transition: "width 0.3s ease", animation: "orunProgressGlow 1.8s ease-in-out infinite" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

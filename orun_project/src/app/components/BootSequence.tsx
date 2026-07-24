import { useRef } from "react";
import { motion } from "motion/react";

export function BootSequence({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  return (
    <motion.div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
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
    </motion.div>
  );
}

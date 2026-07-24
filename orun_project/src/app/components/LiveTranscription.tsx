import { motion, AnimatePresence } from "motion/react";

interface LiveTranscriptionProps {
  text: string;
  isVisible: boolean;
}

/**
 * Shows real-time transcription while the user speaks.
 * Appears as a floating bubble above the chat input.
 */
export function LiveTranscription({ text, isVisible }: LiveTranscriptionProps) {
  return (
    <AnimatePresence>
      {isVisible && text.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full left-0 right-0 mb-2 flex justify-center pointer-events-none"
        >
          <div
            className="px-4 py-2 rounded-xl max-w-[80%] text-center"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <p
              className="text-sm italic"
              style={{ color: "var(--muted-foreground)", fontFamily: "'Inter', sans-serif" }}
            >
              {text}
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-[#C00018] animate-pulse" />
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

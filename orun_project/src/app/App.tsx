import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { I18nProvider } from "../i18n/I18nProvider";
import { GlobalStyles } from "./components/GlobalStyles";
import { CustomCursor } from "./components/CustomCursor";
import { SplashScreen } from "./components/SplashScreen";
import { BootSequence } from "./components/BootSequence";
import { HomeScreen } from "./HomeScreen";
import type { Phase } from "./types";

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");

  return (
    <I18nProvider>
      <div className="fixed inset-0 overflow-hidden" style={{ background: "#080808" }}>
        <GlobalStyles />
        <CustomCursor />

      <AnimatePresence mode="wait">
        {phase === "splash" && (
          <SplashScreen key="splash" onDone={() => setPhase("boot")} />
        )}
        {phase === "boot" && (
          <BootSequence key="boot" onDone={() => setPhase("home")} />
        )}
        {phase === "home" && (
          <motion.div
            key="home"
            className="fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            <HomeScreen />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </I18nProvider>
  );
}

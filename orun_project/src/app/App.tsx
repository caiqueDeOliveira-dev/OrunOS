import { useState, useEffect, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider, useToast } from "./components/Toast";
import { GlobalStyles } from "./components/GlobalStyles";
import { CustomCursor } from "./components/CustomCursor";
import { TitleBar } from "./components/TitleBar";
import { SplashScreen } from "./components/SplashScreen";
import { BootSequence } from "./components/BootSequence";
import { HomeScreen } from "./HomeScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChatSkeleton } from "./components/Skeleton";
import Onboarding from "./components/Onboarding";
import { VoiceOverlay } from "./components/VoiceOverlay";
import { initWorkspaceActionListener, destroyWorkspaceActionListener } from "./plugins/lib/workspace-actions";
import { isElectron } from "./constants";
import type { Phase } from "./types";

function TTSFallbackListener() {
  const { show: toast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const { from, to } = (e as CustomEvent).detail || {};
      if (from && to) {
        toast(`${from} indisponível — usando ${to}`, "warning");
      }
    };
    window.addEventListener("tts:fallback", handler);
    return () => window.removeEventListener("tts:fallback", handler);
  }, [toast]);
  return null;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [voiceOverlayVisible, setVoiceOverlayVisible] = useState(false);

  const handleVoiceOverlayDismiss = useCallback(() => setVoiceOverlayVisible(false), []);

  useEffect(() => {
    if (!isElectron) return;
    Promise.all([
      window.orun.settings.isFirstRun(),
      window.orun.settings.get<boolean>("onboardingDismissed"),
    ]).then(([firstRun, dismissed]) => {
      if (firstRun && !dismissed) {
        setShowOnboarding(true);
      }
    });
    initWorkspaceActionListener();

    const unsub = window.orun.voiceOverlay.onShow(() => {
      setVoiceOverlayVisible(true);
    });

    return () => {
      destroyWorkspaceActionListener();
      unsub();
    };
  }, []);

  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
        <ToastProvider>
        <TTSFallbackListener />
        <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--background)" }}>
          <GlobalStyles />
          <CustomCursor />
          <TitleBar />

        <AnimatePresence mode="wait">
          {phase === "splash" && (
            <ErrorBoundary>
              <SplashScreen key="splash" onDone={() => setPhase("boot")} />
            </ErrorBoundary>
          )}
          {phase === "boot" && (
            <ErrorBoundary>
              <BootSequence key="boot" onDone={() => setPhase("home")} />
            </ErrorBoundary>
          )}
          {phase === "home" && (
            <motion.div
              key="home"
              className="fixed inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <ErrorBoundary>
                <Suspense fallback={<ChatSkeleton />}>
                  <HomeScreen />
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {showOnboarding && (
          <Onboarding
            onComplete={() => setShowOnboarding(false)}
            onDontShowAgain={async () => {
              await window.orun.settings.set("onboardingDismissed", true);
              setShowOnboarding(false);
            }}
          />
        )}

        <VoiceOverlay
          visible={voiceOverlayVisible}
          onDismiss={handleVoiceOverlayDismiss}
        />

        </div>
        </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

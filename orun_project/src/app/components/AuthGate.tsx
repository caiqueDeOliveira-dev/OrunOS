import { useState, useEffect, ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import { LoginScreen } from "./LoginScreen";

interface AuthGateProps {
  children: ReactNode;
}

type GateState = "loading" | "blocked" | "open";

export function AuthGate({ children }: AuthGateProps) {
  const [gate, setGate] = useState<GateState>("loading");
  const [authAvailable, setAuthAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await window.orun.auth.getState();
        if (!mounted) return;
        // null = camada de auth indisponível (sem anon key) → nunca bloquear
        if (!state) {
          setAuthAvailable(false);
          setGate("open");
          return;
        }
        setAuthAvailable(true);
        if (state.status === "authenticated") {
          setGate("open");
          return;
        }
        const skipped = await window.orun.settings.get<boolean>("authSkipped");
        if (!mounted) return;
        setGate(skipped ? "open" : "blocked");
      } catch {
        if (mounted) setGate("open");
      }
    })();

    const unsubscribe = window.orun.auth.onStateChanged((state) => {
      if (!mounted) return;
      setAuthAvailable(true);
      if (state.status === "authenticated") {
        setGate("open");
      } else if (state.status === "unauthenticated") {
        // Sign-out em pleno uso → volta a bloquear e mostra o login de novo
        setGate((g) => (g === "open" ? "blocked" : g));
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (gate === "loading") return null;

  if (!authAvailable) return <>{children}</>;

  return (
    <>
      {gate === "open" ? (
        children
      ) : (
        <AnimatePresence mode="wait">
          <LoginScreen
            key="login"
            onDone={() => setGate("open")}
            onSkip={async () => {
              try { await window.orun.settings.set("authSkipped", true); } catch { /* best effort */ }
              setGate("open");
            }}
          />
        </AnimatePresence>
      )}
    </>
  );
}

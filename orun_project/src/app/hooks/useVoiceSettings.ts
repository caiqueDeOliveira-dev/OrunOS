import { useState, useEffect, useCallback, useRef } from "react";
import { isElectron } from "../constants";

interface VoiceSettings {
  whisperUrl: string | undefined;
  conversationalMode: boolean;
  noiseSuppression: boolean;
  responseDelay: number;
  wakeWordEnabled: boolean;
  toggleWakeWord: (enabled: boolean) => void;
}

export function useVoiceSettings(): VoiceSettings {
  const [whisperUrl, setWhisperUrl] = useState<string | undefined>(undefined);
  const [conversationalMode, setConversationalMode] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [responseDelay, setResponseDelay] = useState(1200);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Read STT settings + auto-detect local server
  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ engine?: string; baseUrl?: string }>("stt").then((v) => {
      if (!mountedRef.current) return;
      if (v?.engine === "whisper" && v?.baseUrl) {
        setWhisperUrl(v.baseUrl);
      } else {
        window.orun.stt.testConnection("http://localhost:8080")
          .then((result: any) => {
            if (!mountedRef.current) return;
            if (result?.ok) {
              setWhisperUrl("http://localhost:8080");
              window.orun?.settings?.set("stt", { engine: "whisper", baseUrl: "http://localhost:8080" }).catch((err: unknown) => console.warn("[IPC error]", err));
            }
          })
          .catch((err: unknown) => console.warn("[IPC error]", err));
      }
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  // Read wake word setting
  useEffect(() => {
    window.orun?.settings?.get<boolean>("wakeWordEnabled").then((v) => {
      if (mountedRef.current) setWakeWordEnabled(Boolean(v));
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  // Read voice settings (conversational, noise suppression, response delay)
  useEffect(() => {
    if (!isElectron) return;
    window.orun.settings.get<{ conversational?: boolean; noiseSuppression?: boolean; responseDelay?: number }>("voice").then((v) => {
      if (!mountedRef.current) return;
      if (v?.conversational) setConversationalMode(true);
      if (v?.noiseSuppression !== undefined) setNoiseSuppression(v.noiseSuppression);
      if (v?.responseDelay) setResponseDelay(v.responseDelay);
    }).catch((err: unknown) => console.warn("[IPC error]", err));
  }, []);

  const toggleWakeWord = useCallback((enabled: boolean) => {
    setWakeWordEnabled(enabled);
    window.orun?.settings?.set("wakeWordEnabled", enabled);
  }, []);

  return { whisperUrl, conversationalMode, noiseSuppression, responseDelay, wakeWordEnabled, toggleWakeWord };
}

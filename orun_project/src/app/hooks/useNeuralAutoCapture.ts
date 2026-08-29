import { useEffect, useRef } from "react";
import { isElectron } from "../constants";
import type { Message } from "../types";

/** 90s sem mensagens novas = conversa ociosa → Curador avalia. */
const IDLE_MS = 90_000;
/** Só reavalia depois de conteúdo novo relevante desde a última captura. */
const MIN_NEW_CHARS = 400;

interface UseNeuralAutoCaptureOptions {
  messages: Message[];
  conversationId: string | null;
  onResult?: (saved: number) => void;
}

/**
 * Observa o chat e, quando a conversa fica ociosa com conteúdo novo,
 * pede ao Curador (Lima Barreto) que registre o que merecer virar nota.
 */
export function useNeuralAutoCapture({ messages, conversationId, onResult }: UseNeuralAutoCaptureOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCapturedLenRef = useRef(0);
  const runningRef = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!isElectron || !conversationId) return;

    const transcriptLen = messages.reduce((acc, m) => acc + m.content.length, 0);
    if (transcriptLen <= lastCapturedLenRef.current) return;
    // Streaming em andamento (última mensagem ainda vazia) → aguarda.
    const last = messages[messages.length - 1];
    if (last && !last.content.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const transcript = messages
          .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
          .join("\n\n");
        if (transcript.length < lastCapturedLenRef.current + MIN_NEW_CHARS) return;
        const res = await window.orun.neural.autoCapture({ conversationId, transcript });
        if (res?.ok && !res.skipped) {
          lastCapturedLenRef.current = transcript.length;
          if ((res.saved ?? 0) > 0) onResultRef.current?.(res.saved ?? 0);
        }
      } catch {
        /* silencioso: curador é fire-and-forget */
      } finally {
        runningRef.current = false;
      }
    }, IDLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [messages, conversationId]);
}

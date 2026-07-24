import { useState, useRef, useCallback, useEffect } from "react";
import { isElectron } from "../constants";
import type { OrunTTSEngine } from "../../types/orun";

interface UseTTSOptions {
  /** Called by useChat to advance spokenUpToRef after incremental speak */
  spokenUpToRef: React.MutableRefObject<number>;
}

function splitSentences(text: string): string[] {
  const abbrevPattern = /\b(?:Dr|Sr|Sra|Prof|Av|Ex|Inst|Eng|Arq|Adv|Dept|Gov|Sen|Dep|Pref)\.$/i;
  const sentenceRegex = /[^.!?…]+[.!?…]+["'\)\]]*\s*/g;
  const chunks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    let sentence = match[0].trim();
    if (!sentence) continue;

    if (abbrevPattern.test(sentence) && match.index + match[0].length < text.length) {
      sentenceRegex.lastIndex = match.index + match[0].length;
      const next = sentenceRegex.exec(text);
      if (next) {
        sentence = (sentence + " " + next[0]).trim();
      }
    }
    chunks.push(sentence);
  }

  if (chunks.length === 0) {
    const maxLen = 800;
    for (let i = 0; i < text.length; i += maxLen) {
      chunks.push(text.slice(i, i + maxLen).trim());
    }
  }
  return chunks.filter(Boolean);
}

export function useTTS({ spokenUpToRef }: UseTTSOptions) {
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [hasVoiceConfigured, setHasVoiceConfigured] = useState(false);

  const ttsSettingsRef = useRef<{ engine: string; voiceId: string; enabled?: boolean } | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCacheRef = useRef<Map<string, { audioBase64: string; mime: string }>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshTTSSettings = async () => {
    if (!isElectron) return;
    const v = await window.orun.settings.get<{ engine: string; voiceId: string; enabled?: boolean }>("tts");
    if (!mountedRef.current) return;
    ttsSettingsRef.current = v || null;
    setHasVoiceConfigured(Boolean(v?.engine && v?.voiceId));
  };

  useEffect(() => { refreshTTSSettings(); }, []);

  useEffect(() => () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  /** Queues text for TTS — splits into sentences and enqueues each one. */
  const speak = useCallback((text: string) => {
    if (!isElectron || !speechEnabled || !text.trim()) return;
    const v = ttsSettingsRef.current;
    if (!v?.engine || !v?.voiceId) return;

    const sentences = splitSentences(text);
    for (const sentence of sentences) {
      audioQueueRef.current = audioQueueRef.current.then(async () => {
        try {
          const cacheKey = `${v.engine}:${v.voiceId}:${sentence}`;
          let cached = ttsCacheRef.current.get(cacheKey);
          let audioBase64: string, mime: string;

          if (cached) {
            audioBase64 = cached.audioBase64;
            mime = cached.mime;
          } else {
            const result = await window.orun.tts.synthesize(v.engine as OrunTTSEngine, v.voiceId, sentence);
            audioBase64 = result.audioBase64;
            mime = result.mime;
            if (result.fallbackFrom) {
              window.dispatchEvent(new CustomEvent("tts:fallback", { detail: { from: result.fallbackFrom, to: result.engine } }));
            }
            if (ttsCacheRef.current.size > 200) {
              const firstKey = ttsCacheRef.current.keys().next().value;
              if (firstKey) ttsCacheRef.current.delete(firstKey);
            }
            ttsCacheRef.current.set(cacheKey, { audioBase64, mime });
          }

          await new Promise<void>((resolve) => {
            const audio = new Audio(`data:${mime};base64,${audioBase64}`);
            currentAudioRef.current = audio;
            audio.onended = () => { currentAudioRef.current = null; resolve(); };
            audio.onerror = () => { currentAudioRef.current = null; resolve(); };
            audio.play().catch(() => resolve());
          });
        } catch {
          currentAudioRef.current = null;
        }
      });
    }
  }, [speechEnabled]);

  /** Stop all TTS audio (called when user starts speaking) */
  const stopTTS = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    audioQueueRef.current = Promise.resolve();
    spokenUpToRef.current = 0;
  }, [spokenUpToRef]);

  const speakIncremental = useCallback((fullTextSoFar: string) => {
    const rest = fullTextSoFar.slice(spokenUpToRef.current);
    if (!rest) return;
    const sentences = splitSentences(rest);
    const toSpeak = sentences.slice(0, 2).join(" ");
    if (toSpeak) {
      speak(toSpeak);
      spokenUpToRef.current += toSpeak.length;
    }
  }, [speak, spokenUpToRef]);

  const speakRemainder = useCallback((fullText: string) => {
    const rest = fullText.slice(spokenUpToRef.current);
    if (rest.trim()) speak(rest);
    spokenUpToRef.current = fullText.length;
  }, [speak, spokenUpToRef]);

  return {
    speechEnabled,
    setSpeechEnabled,
    hasVoiceConfigured,
    spokenUpToRef,
    speak,
    stopTTS,
    speakIncremental,
    speakRemainder,
  };
}

import { useRef, useCallback, useEffect, useState } from "react";
import { VoiceActivityDetector, type VADEvent } from "../voice/vad";
import { createSileroVAD, type SileroVADHandle } from "../voice/silero-vad";
import { detectVoiceCommand, stripCommand, type CommandMatch } from "../voice/voice-commands";
import { saveRecording, type VoiceRecording } from "../voice/voice-history";
import { transcribeWhisper, createBrowserSTT, type WhisperConfig } from "../voice/whisper-stt";
import { attachNoiseSuppression } from "../voice/noise-suppression";
import { blobToCleanWav } from "../voice/audio-clean";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: "no-speech" | "aborted" | "network" | "not-allowed" | "service-not-allowed" | "bad-grammar" | "language-not-supported";
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
  onStateChange: (state: "idle" | "listening" | "thinking" | "speaking") => void;
  onVolume?: (level: number) => void;
  onPartialTranscript?: (text: string) => void;
  onCommand?: (command: CommandMatch) => void;
  onStopTTS?: () => void;
  wakeWordEnabled?: boolean;
  wakeWord?: string;
  whisperConfig?: WhisperConfig;
  /** Auto-open mic after AI finishes speaking (conversational mode) */
  conversationalMode?: boolean;
  /** External hamptonState from parent — used by conversational mode to detect AI idle */
  externalHamptonState?: "idle" | "listening" | "thinking" | "speaking";
  /** Auto-save recordings to IndexedDB */
  saveHistory?: boolean;
  /** Use noise suppression AudioWorklet */
  noiseSuppression?: boolean;
  /** Delay (ms) after user stops speaking before sending to AI (default 600) */
  responseDelay?: number;
  /** Only interrupt the AI when the user's speech persists past a 250ms hold
   * window (avoids cutting TTS on coughs/echo blips). Default true. */
  sustainedInterrupt?: boolean;
  /** i18n translation function */
  t?: (key: string) => string;
}

export function useVoice({
  onTranscript,
  onStateChange,
  onVolume,
  onPartialTranscript,
  onCommand,
  onStopTTS,
  wakeWordEnabled = false,
  wakeWord = "oi orun",
  whisperConfig,
  conversationalMode = false,
  externalHamptonState,
  saveHistory = true,
  noiseSuppression = true,
  responseDelay = 600,
  sustainedInterrupt = true,
  t,
}: UseVoiceOptions) {
  // ── State ────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isWakeListening, setIsWakeListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [lastRecording, setLastRecording] = useState<VoiceRecording | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const sileroVadRef = useRef<SileroVADHandle | null>(null);
  const wakeRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordingStartRef = useRef(0);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const finalTranscriptRef = useRef("");
  const partialTranscriptRef = useRef("");
  const browserSTTRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const noiseSupCtxRef = useRef<AudioContext | null>(null);
  const smartDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Re-entrancy guard: startRecording is async and only sets mediaRecorderRef
  // AFTER awaiting getUserMedia. Without this, two concurrent calls (e.g. the
  // conversational auto-mic timer + a barge-in that fires in the same window)
  // both pass `if (mediaRecorderRef.current) return` and create overlapping
  // recorders/VADs — the loser's stream leaks and the state machine sticks on
  // "listening" forever, re-triggering the auto-mic → infinite loop.
  const startingRef = useRef(false);

  // Barge-in monitor: while the AI is speaking (conversational mode) a light VAD
  // keeps listening; if the user talks over the AI it interrupts TTS and records.
  const bargeInRef = useRef<{
    stream: MediaStream;
    cleaned?: MediaStream;
    ctx: AudioContext;
    noiseCtx?: AudioContext | null;
    analyser: AnalyserNode;
    vad: VoiceActivityDetector;
  } | null>(null);
  const bargeInActiveRef = useRef(false);
  const bargeInHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const BARGE_IN_HOLD_MS = 250;

  // Conversational mode: track hamptonState properly via useState
  const [hamptonState, setHamptonState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  // Keep refs for closures
  const configRef = useRef({ whisperConfig, saveHistory, conversationalMode, responseDelay, noiseSuppression, sustainedInterrupt });
  configRef.current = { whisperConfig, saveHistory, conversationalMode, responseDelay, noiseSuppression, sustainedInterrupt };
  const tRef = useRef(t);
  tRef.current = t;

  const stateRef = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");

  const updateState = useCallback((s: "idle" | "listening" | "thinking" | "speaking") => {
    stateRef.current = s;
    onStateChange(s);
    setHamptonState(s);
  }, [onStateChange]);

  // ── Barge-in monitor helpers ─────────────────────────────────────
  const stopBargeInMonitor = useCallback((handoff = false) => {
    const b = bargeInRef.current;
    bargeInRef.current = null;
    bargeInActiveRef.current = false;
    if (bargeInHoldTimerRef.current) {
      clearTimeout(bargeInHoldTimerRef.current);
      bargeInHoldTimerRef.current = null;
    }
    if (!b) return;
    try { b.vad.stop(); } catch { /* already stopped */ }
    if (!handoff) {
      // Not handing off to a recorder — release everything.
      b.stream.getTracks().forEach((t) => t.stop());
      b.ctx.close().catch(() => {});
      b.noiseCtx?.close().catch(() => {});
      if (streamRef.current === b.stream) streamRef.current = null;
      if (audioContextRef.current === b.ctx) audioContextRef.current = null;
      if (noiseSupCtxRef.current === b.noiseCtx) noiseSupCtxRef.current = null;
      if (analyserRef.current === b.analyser) analyserRef.current = null;
    }
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopBargeInMonitor(false);
    if (smartDelayTimerRef.current) {
      clearTimeout(smartDelayTimerRef.current);
      smartDelayTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (noiseSupCtxRef.current) {
      noiseSupCtxRef.current.close().catch(() => {});
      noiseSupCtxRef.current = null;
    }
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }
    if (sileroVadRef.current) {
      sileroVadRef.current.destroy();
      sileroVadRef.current = null;
    }
    if (browserSTTRef.current) {
      browserSTTRef.current.stop();
      browserSTTRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setVolume(0);
    setPartialTranscript("");
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
  }, [stopBargeInMonitor]);

  // ── Get audio stream + analyser ──────────────────────────────────
  const getStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false, // We handle noise suppression ourselves via AudioWorklet
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
    });

    // Diagnostic: verify stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    console.log("[voice] getUserMedia OK:", {
      trackCount: audioTracks.length,
      label: audioTracks[0]?.label ?? "none",
      readyState: audioTracks[0]?.readyState ?? "none",
      muted: audioTracks[0]?.muted ?? "N/A",
      active: stream.active,
      settings: audioTracks[0]?.getSettings?.() ?? {},
    });
    if (audioTracks.length === 0) {
      console.error("[voice] CRITICAL: getUserMedia returned NO audio tracks!");
    }

    // Apply noise suppression worklet — used ONLY for VAD analysis. The recorder
    // MUST capture the RAW stream: recording an AudioWorklet's MediaStreamDestination
    // produces a corrupt WebM (invalid EBML header) that STT rejects.
    let cleanedStream: MediaStream | undefined;
    if (noiseSuppression) {
      try {
        const { cleanedStream: cleaned, ctx, ready } = await attachNoiseSuppression(stream);
        await ready;
        noiseSupCtxRef.current = ctx;
        cleanedStream = cleaned;
      } catch (err) {
        console.warn("[voice] noise suppression failed, using raw stream:", err);
      }
    }

    // ALWAYS record the raw stream (valid WebM guaranteed)
    const recordStream = stream;

    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: 48000 });
    ctx.resume().then(() => {
      console.log("[voice] AudioContext state:", ctx.state);
    }).catch((err) => {
      console.error("[voice] AudioContext resume FAILED:", err);
    });
    audioContextRef.current = ctx;
    // Use original stream for volume analyser (more responsive)
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    analyserRef.current = analyser;

    return { rawStream: stream, recordStream, cleanedStream };
  }, [noiseSuppression]);

  // ── Volume analyser ──────────────────────────────────────────────
  const startVolumeAnalyser = useCallback(() => {
    volumeIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255; // normalize 0-1
      setVolume(avg);
      onVolume?.(avg);
    }, 50);
  }, [onVolume]);

  const stopVolumeAnalyser = useCallback(() => {
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    setVolume(0);
    onVolume?.(0);
  }, [onVolume]);

  // ── Process recorded audio (shared logic) ────────────────────────
  const processAudio = useCallback(async (audioBlob: Blob, mimeType: string, duration: number) => {
    if (audioBlob.size === 0) {
      updateState("idle");
      return;
    }

    updateState("thinking");

    // Check for voice commands first
    const fullText = finalTranscriptRef.current || partialTranscriptRef.current;
    const command = detectVoiceCommand(fullText);
    if (command) {
      onCommand?.(command);
      updateState("idle");
      return;
    }

    // Clean the audio BEFORE sending: decode to PCM, apply noise gate when
    // enabled, re-encode as 16kHz mono WAV. Recording the raw stream produces a
    // valid WebM, but converting to WAV here guarantees STT compatibility (and
    // skips ffmpeg conversion in the local server entirely).
    let cleanBlob = audioBlob;
    let cleanMime = mimeType;
    try {
      cleanBlob = await blobToCleanWav(audioBlob, configRef.current.noiseSuppression);
      if (cleanBlob.type === "audio/wav") {
        cleanMime = "audio/wav";
      } else {
        console.warn("[voice] audio decode failed, sending original as", cleanBlob.type, "size", cleanBlob.size);
      }
    } catch (err) {
      console.warn("[voice] audio clean failed, sending original:", err);
    }

    // STT order: Groq cloud (whisper-large-v3-turbo) FIRST — fast (~1s) and
    // accurate for natural pt-BR speech — then the local faster-whisper server
    // (good but slower on CPU and less robust to casual speech), then browser
    // SpeechRecognition. If no Groq key exists, transcribeGroq throws quickly
    // and we fall through to the local server.
    const toBase64 = async () => {
      const arrayBuffer = await cleanBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      return btoa(binary);
    };

    const cfg = configRef.current.whisperConfig;

    if (window.orun?.stt?.transcribeGroq) {
      try {
        const audioBase64 = await toBase64();
        console.log("[voice] Groq STT (whisper-large-v3-turbo), audioSize=", audioBase64.length);
        const result = await window.orun.stt.transcribeGroq({
          audioBase64,
          mimeType: cleanMime,
          language: cfg?.language || "pt",
        });
        if (result?.text?.trim() && !result.error) {
          onTranscript(result.text.trim());
          if (configRef.current.saveHistory) {
            const rec = await saveRecording(audioBlob, result.text, duration, result.language);
            setLastRecording(rec);
          }
          return;
        }
        if (result?.error) console.warn("[voice] Groq STT:", result.error);
      } catch (err) {
        console.warn("[voice] Groq STT failed, falling back to local:", err);
      }
    }

    // Local Whisper fallback
    const sttUrls = [cfg?.baseUrl, "http://127.0.0.1:8080"].filter(Boolean) as string[];

    for (const url of sttUrls) {
      try {
        let result: { text: string; language?: string };
        if (window.orun?.stt?.transcribe) {
          const audioBase64 = await toBase64();
          console.log("[voice] IPC STT: calling", url, "audioSize=", audioBase64.length);
          result = await window.orun.stt.transcribe({ baseUrl: url, audioBase64, mimeType: cleanMime, language: cfg?.language || "pt" });
          console.log("[voice] IPC STT result:", JSON.stringify(result));
        } else {
          result = await transcribeWhisper(cleanBlob, { baseUrl: url, language: cfg?.language || "pt" });
        }
        if (result.text?.trim()) {
          onTranscript(result.text.trim());
          if (configRef.current.saveHistory) {
            const rec = await saveRecording(audioBlob, result.text, duration, result.language);
            setLastRecording(rec);
          }
          return;
        }
      } catch (err) {
        console.warn("[voice] STT failed on", url, ":", err);
      }
    }

    // Use browser STT partial results if available
    if (fullText.trim()) {
      onTranscript(fullText.trim());
      if (configRef.current.saveHistory) {
        const rec = await saveRecording(audioBlob, fullText, duration);
        setLastRecording(rec);
      }
    } else {
      console.warn("[voice] No STT available. Configure Whisper STT in Settings > Voice, or start the local STT server.");
      updateState("idle");
    }
  }, [onTranscript, onCommand, updateState]);

  // ── Start recording with VAD + STT ──────────────────────────────
  const startRecording = useCallback(async (reuse = false) => {
    if (startingRef.current || mediaRecorderRef.current) return;
    startingRef.current = true;

    // Stop TTS if playing (interrupt)
    onStopTTS?.();

    try {
      let rawStream: MediaStream;
      let recordStream: MediaStream;
      let cleanedStream: MediaStream | undefined;

      if (reuse && bargeInRef.current) {
        // Reuse the mic stream already opened by the barge-in monitor so we don't
        // lose the first syllables of the interruption ("pa-ra..."). Stop the
        // monitor's VAD loop but keep the tracks alive for the recorder.
        rawStream = bargeInRef.current.stream;
        recordStream = bargeInRef.current.stream;
        cleanedStream = bargeInRef.current.cleaned;
        try { bargeInRef.current.vad.stop(); } catch { /* already stopped */ }
        bargeInRef.current = null;
        bargeInActiveRef.current = false;
      } else {
        const res = await getStream();
        rawStream = res.rawStream;
        recordStream = res.recordStream;
        cleanedStream = res.cleanedStream;
      }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";

      // Use recordStream (potentially noise-suppressed) for MediaRecorder
      const recorder = new MediaRecorder(recordStream, { mimeType });
      chunksRef.current = [];
      finalTranscriptRef.current = "";
      partialTranscriptRef.current = "";
      recordingStartRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cleanup();
        if (chunksRef.current.length === 0) {
          updateState("idle");
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Date.now() - recordingStartRef.current;
        await processAudio(audioBlob, mimeType, duration);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // 250ms timeslices for faster data flow
      startingRef.current = false;
      setIsRecording(true);
      updateState("listening");
      startVolumeAnalyser();

      // Start VAD for precise speech detection (no time limit — VAD auto-stops)
      // Adaptive silence: short commands send fast (~0.6s), long statements keep
      // up to 1.8s of pause room. Adaptive noise floor ignores ambient hum.
      const vad = new VoiceActivityDetector({
        speechThreshold: 0.025,
        silenceThreshold: 0.008,
        silenceDuration: 1800,
        hangover: 500,
        minSpeechDuration: 300,
        adaptiveFloor: true,
        adaptiveSilence: { base: 600, max: 1800, perSecond: 120 },
      });

      // Shared end-of-speech action: wait responseDelay, then stop the recorder.
      let sileroUpgraded = false;
      const stopViaVad = () => {
        smartDelayTimerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }, configRef.current.responseDelay);
      };

      // Feed VAD the noise-suppressed stream when available — background noise
      // would otherwise keep energy above the silence threshold and prevent
      // speech_end from ever firing (auto-send never happens).
      vad.start(cleanedStream ?? rawStream, (event: VADEvent) => {
        if (event.type === "speech_end" && !sileroUpgraded) {
          stopViaVad();
        }
      });
      vadRef.current = vad;

      // Silero VAD upgrade (async): the trained model is far more accurate than
      // RMS. RMS runs immediately so end-of-speech works from the first syllable;
      // Silero replaces it as soon as the model loads. On any failure the RMS
      // VAD stays active (additive, never a blocker).
      const sileroCtx = audioContextRef.current;
      if (sileroCtx) {
        createSileroVAD(cleanedStream ?? rawStream, sileroCtx, {
          onSpeechStart: () => {},
          onSpeechEnd: () => stopViaVad(),
        }).then((silero) => {
          if (!silero || !mediaRecorderRef.current || sileroUpgraded) {
            silero?.destroy();
            return;
          }
          sileroUpgraded = true;
          try { vadRef.current?.stop(); } catch { /* already stopped */ }
          vadRef.current = null;
          sileroVadRef.current = silero;
          silero.start().catch(() => {});
        }).catch(() => {});
      }

      // Start browser STT for real-time transcription
      const browserSTT = createBrowserSTT(
        "pt-BR",
        (partial) => {
          partialTranscriptRef.current = partial;
          setPartialTranscript(partial);
          onPartialTranscript?.(partial);
        },
        (final) => {
          finalTranscriptRef.current += final + " ";
          partialTranscriptRef.current = "";
          setPartialTranscript("");
        },
        (err) => {
          console.warn("[voice] browser STT error:", err);
        }
      );
      browserSTTRef.current = browserSTT;
      browserSTT.start();

    } catch (err) {
      console.error("[voice] failed to start:", err);
      startingRef.current = false;
      updateState("idle");
      cleanup();
    }
  }, [getStream, onTranscript, onStateChange, onPartialTranscript, onCommand, onStopTTS, updateState, startVolumeAnalyser, cleanup, onVolume, processAudio]);

  // ── Stop recording ───────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (smartDelayTimerRef.current) {
      clearTimeout(smartDelayTimerRef.current);
      smartDelayTimerRef.current = null;
    }
    if (browserSTTRef.current) {
      browserSTTRef.current.stop();
      browserSTTRef.current = null;
    }
    if (vadRef.current) {
      vadRef.current.stop();
      vadRef.current = null;
    }
    if (sileroVadRef.current) {
      sileroVadRef.current.destroy();
      sileroVadRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopVolumeAnalyser();
  }, [stopVolumeAnalyser]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Wake word detection ──────────────────────────────────────────
  // In Electron, uses the Python wake word service (background-services.cjs).
  // In browser, uses the Web Speech API.
  const isElectronEnv = typeof window !== "undefined" && !!(window as any).orun;

  // Keep a stable ref to startRecording so the wake effect does NOT re-run on
  // every render (startRecording's identity changes when its callback deps do).
  // Without this, the Electron wake listener IPC would be spammed on every
  // render, blocking the main process with repeated python probes.
  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;

  useEffect(() => {
    if (!wakeWordEnabled) {
      // Stop both Electron and browser wake word systems
      if (isElectronEnv && (window as any).orun?.wakeListener) {
        (window as any).orun.wakeListener.stop();
      }
      if (wakeRecognitionRef.current) {
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.stop();
        wakeRecognitionRef.current = null;
      }
      setIsWakeListening(false);
      return;
    }

    // ── Electron: start Python wake word service ───────────────────
    if (isElectronEnv) {
      (window as any).orun.wakeListener.start();
      (window as any).orun.wakeListener.status().then((s: any) => {
        setIsWakeListening(s?.running ?? false);
      });
      // Wake detection is handled by the Python service (wake_word_service.py)
      // which sends a "voice-overlay:show" IPC event when wake word is detected
      return () => {
        // Don't stop the wake listener here - it persists across component unmounts
        // User controls it via Settings > Background Listening
      };
    }

    // ── Browser: use Web Speech API ────────────────────────────────
    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) return;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";
    recognition.maxAlternatives = 3;

    let lastTranscript = "";
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    const restart = () => {
      if (!wakeWordEnabled || stateRef.current !== "idle") return;
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
          setIsWakeListening(true);
        } catch { /* already running */ }
      }, 200); // Short restart delay for responsiveness
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript !== lastTranscript) {
          lastTranscript = transcript;
          if (
            transcript.includes(wakeWord) ||
            transcript.includes("oi orun") ||
            transcript.includes("oie orun") ||
            transcript.includes("hey orun") ||
            transcript.includes("hampton") ||
            transcript.includes("oi hampton") ||
            transcript.includes("ampton") ||
            transcript.includes("amton")
          ) {
            recognition.stop();
            setIsWakeListening(false);
            startRecordingRef.current();
          }
        }
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") {
        console.warn("[voice] wake word error:", e.error);
        setIsWakeListening(false);
        // SpeechRecognition Web API doesn't work in Electron — stop retrying to avoid infinite error loop
        if (typeof window !== "undefined" && !!(window as any).orun) return;
        // Auto-restart on recoverable errors in browser only
        if (e.error === "network" || e.error === "aborted") {
          restart();
        }
      }
    };

    recognition.onend = () => {
      if (wakeWordEnabled && stateRef.current === "idle") {
        setIsWakeListening(true);
        restart();
      } else {
        setIsWakeListening(false);
      }
    };

    try {
      recognition.start();
      setIsWakeListening(true);
      wakeRecognitionRef.current = recognition;
    } catch { /* ignore */ }

    return () => {
      if (restartTimer) clearTimeout(restartTimer);
      recognition.onend = null;
      recognition.stop();
      wakeRecognitionRef.current = null;
      setIsWakeListening(false);
    };
  }, [wakeWordEnabled, wakeWord]);

  // ── Barge-in: listen while the AI speaks ─────────────────────────
  // While conversational mode is on and the AI is speaking, run a light VAD on
  // the mic. If the user talks over the AI: stop TTS immediately, then start
  // recording (reusing the already-open stream) so the interruption is captured.
  const startBargeInMonitor = useCallback(async () => {
    if (!configRef.current.conversationalMode) return;
    if (mediaRecorderRef.current) return; // already recording
    if (bargeInRef.current) return; // already monitoring

    try {
      const { rawStream, cleanedStream } = await getStream();
      const ctx = audioContextRef.current;
      const analyser = analyserRef.current;
      const noiseCtx = noiseSupCtxRef.current;
      if (!ctx || !analyser) {
        rawStream.getTracks().forEach((t) => t.stop());
        return;
      }

      const vad = new VoiceActivityDetector({
        speechThreshold: 0.035, // a bit higher than recording VAD — avoid self-trigger from TTS echo
        silenceThreshold: 0.012,
        silenceDuration: 1200,
        hangover: 250,
        minSpeechDuration: 200,
        adaptiveFloor: true,
      });
      bargeInRef.current = { stream: rawStream, cleaned: cleanedStream, ctx, noiseCtx, analyser, vad };
      bargeInActiveRef.current = true;

      vad.start(cleanedStream ?? rawStream, (event: VADEvent) => {
        // User started talking over the AI. With sustainedInterrupt on, hold
        // for a short window and only interrupt if speech persists (a cough or
        // TTS echo blip shorter than the hold is ignored). Otherwise interrupt
        // immediately — startRecording stops TTS and reuses the open stream.
        if (event.type === "speech_start" && bargeInActiveRef.current) {
          if (configRef.current.sustainedInterrupt) {
            bargeInHoldTimerRef.current = setTimeout(() => {
              if (bargeInActiveRef.current) startRecordingRef.current(true);
            }, BARGE_IN_HOLD_MS);
          } else {
            startRecordingRef.current(true);
          }
        } else if (event.type === "speech_end" && bargeInActiveRef.current) {
          if (bargeInHoldTimerRef.current) {
            clearTimeout(bargeInHoldTimerRef.current);
            bargeInHoldTimerRef.current = null;
          }
        }
      });
    } catch {
      // Mic unavailable mid-speech — skip barge-in this time.
    }
  }, [getStream, stopBargeInMonitor]);

  // ── Conversational mode: auto-mic after AI finishes speaking ────
  const prevHamptonState = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");
  const wasSpeakingRef = useRef(false);

  // Use external state from parent (HomeScreen) when available — this reflects
  // useChat's direct onHamptonStateChange calls that bypass useVoice's local state
  const effectiveHamptonState = externalHamptonState ?? hamptonState;

  // Keep stateRef in sync with the authoritative display state. useChat drives
  // the state via onHamptonStateChange (externalHamptonState), which does NOT go
  // through updateState — processAudio leaves stateRef on "thinking" and nothing
  // else clears it, so the auto-mic (below) and wake-word guards (which require
  // stateRef.current === "idle") never fire → the mic never re-opens after the
  // first reply and the conversation can't continue.
  useEffect(() => {
    if (externalHamptonState) stateRef.current = externalHamptonState;
  }, [externalHamptonState]);

  // Barge-in: arm the mic monitor while the AI is speaking.
  useEffect(() => {
    if (!configRef.current.conversationalMode) {
      stopBargeInMonitor(false);
      return;
    }
    if (effectiveHamptonState === "speaking") {
      startBargeInMonitor();
    } else {
      stopBargeInMonitor(false);
    }
  }, [effectiveHamptonState, startBargeInMonitor, stopBargeInMonitor]);

  useEffect(() => {
    if (!conversationalMode) return;

    // Track when we enter "speaking" state
    if (effectiveHamptonState === "speaking") {
      wasSpeakingRef.current = true;
    }

    // When we transition from "speaking" to "idle", AI finished — auto-mic
    if (wasSpeakingRef.current && effectiveHamptonState === "idle" && prevHamptonState.current !== "idle") {
      wasSpeakingRef.current = false;
      const timer = setTimeout(() => {
        if (stateRef.current === "idle") {
          startRecordingRef.current();
        }
      }, 800);
      return () => clearTimeout(timer);
    }

    // Reset flag if we go to any other non-speaking state
    if (effectiveHamptonState !== "speaking" && effectiveHamptonState !== "idle") {
      wasSpeakingRef.current = false;
    }

    prevHamptonState.current = effectiveHamptonState;
  }, [conversationalMode, effectiveHamptonState]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isRecording,
    isWakeListening,
    volume,
    partialTranscript,
    lastRecording,
    startRecording,
    stopRecording,
    toggleRecording,
    cleanup,
  };
}

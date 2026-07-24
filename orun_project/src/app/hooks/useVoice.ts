import { useRef, useCallback, useEffect, useState } from "react";
import { VoiceActivityDetector, type VADEvent } from "../voice/vad";
import { detectVoiceCommand, stripCommand, type CommandMatch } from "../voice/voice-commands";
import { saveRecording, type VoiceRecording } from "../voice/voice-history";
import { transcribeWhisper, createBrowserSTT, type WhisperConfig } from "../voice/whisper-stt";
import { attachNoiseSuppression } from "../voice/noise-suppression";

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
  /** Delay (ms) after user stops speaking before sending to AI (default 1200) */
  responseDelay?: number;
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
  responseDelay = 1200,
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
  const wakeRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordingStartRef = useRef(0);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const finalTranscriptRef = useRef("");
  const partialTranscriptRef = useRef("");
  const browserSTTRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const noiseSupCtxRef = useRef<AudioContext | null>(null);
  const smartDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conversational mode: track hamptonState properly via useState
  const [hamptonState, setHamptonState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  // Keep refs for closures
  const configRef = useRef({ whisperConfig, saveHistory, conversationalMode, responseDelay });
  configRef.current = { whisperConfig, saveHistory, conversationalMode, responseDelay };
  const tRef = useRef(t);
  tRef.current = t;

  const stateRef = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");

  const updateState = useCallback((s: "idle" | "listening" | "thinking" | "speaking") => {
    stateRef.current = s;
    onStateChange(s);
    setHamptonState(s);
  }, [onStateChange]);

  // ── Cleanup ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
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
  }, []);

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

    // Apply noise suppression worklet if enabled
    let recordStream = stream;
    if (noiseSuppression) {
      try {
        const { cleanedStream, ctx, ready } = await attachNoiseSuppression(stream);
        await ready;
        noiseSupCtxRef.current = ctx;
        // Use cleaned stream for recording but keep original for VAD
        recordStream = cleanedStream;
      } catch (err) {
        console.warn("[voice] noise suppression failed, using raw stream:", err);
      }
    }

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

    return { rawStream: stream, recordStream };
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

    // Try Whisper STT if configured, with auto-detect fallback
    const cfg = configRef.current.whisperConfig;
    const sttUrls = [cfg?.baseUrl, "http://localhost:8080"].filter(Boolean) as string[];

    for (const url of sttUrls) {
      try {
        let result: { text: string; language?: string };
        if (window.orun?.stt?.transcribe) {
          const blobMimeType = audioBlob.type || "audio/webm";
          const arrayBuffer = await audioBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
          }
          const audioBase64 = btoa(binary);
          console.log("[voice] IPC STT: calling", url, "audioSize=", audioBase64.length);
          result = await window.orun.stt.transcribe({ baseUrl: url, audioBase64, mimeType: blobMimeType, language: cfg?.language || "pt" });
          console.log("[voice] IPC STT result:", JSON.stringify(result));
        } else {
          result = await transcribeWhisper(audioBlob, { baseUrl: url, language: cfg?.language || "pt" });
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
  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    // Stop TTS if playing (interrupt)
    onStopTTS?.();

    try {
      const { rawStream, recordStream } = await getStream();
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
      setIsRecording(true);
      updateState("listening");
      startVolumeAnalyser();

      // Start VAD for precise speech detection (no time limit — VAD auto-stops)
      const vad = new VoiceActivityDetector({
        speechThreshold: 0.025,
        silenceThreshold: 0.008,
        silenceDuration: 2500,
        hangover: 500,
        minSpeechDuration: 300,
      });

      vad.start(rawStream, (event: VADEvent) => {
        if (event.type === "speech_end") {
          // Smart delay: wait a few seconds after user stops speaking
          // This gives them time to continue if they paused briefly
          smartDelayTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }, configRef.current.responseDelay);
        }
      });
      vadRef.current = vad;

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
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    stopVolumeAnalyser();
  }, [stopVolumeAnalyser]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  // ── Wake word detection (Web Speech API only works in browser, not Electron) ──
  useEffect(() => {
    if (!wakeWordEnabled || (typeof window !== "undefined" && !!(window as any).orun)) {
      if (wakeRecognitionRef.current) {
        wakeRecognitionRef.current.onend = null;
        wakeRecognitionRef.current.stop();
        wakeRecognitionRef.current = null;
      }
      setIsWakeListening(false);
      return;
    }

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
            transcript.includes("oi hampton")
          ) {
            recognition.stop();
            setIsWakeListening(false);
            startRecording();
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
  }, [wakeWordEnabled, wakeWord, startRecording]);

  // ── Conversational mode: auto-mic after AI finishes speaking ────
  const prevHamptonState = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");
  const wasSpeakingRef = useRef(false);

  // Use external state from parent (HomeScreen) when available — this reflects
  // useChat's direct onHamptonStateChange calls that bypass useVoice's local state
  const effectiveHamptonState = externalHamptonState ?? hamptonState;

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
          startRecording();
        }
      }, 800);
      return () => clearTimeout(timer);
    }

    // Reset flag if we go to any other non-speaking state
    if (effectiveHamptonState !== "speaking" && effectiveHamptonState !== "idle") {
      wasSpeakingRef.current = false;
    }

    prevHamptonState.current = effectiveHamptonState;
  }, [conversationalMode, effectiveHamptonState, startRecording]);

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

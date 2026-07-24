import { useRef, useCallback, useEffect, useState } from "react";
import { VoiceActivityDetector, type VADEvent } from "../voice/vad";
import { attachNoiseSuppression } from "../voice/noise-suppression";
import type { OrunTTSEngine } from "../../types/orun";

type OverlayState = "idle" | "listening" | "thinking" | "speaking";

interface UseVoiceOverlayOptions {
  onStateChange: (state: OverlayState) => void;
  onVolume?: (level: number) => void;
}

export function useVoiceOverlay({ onStateChange, onVolume }: UseVoiceOverlayOptions) {
  const [state, setState] = useState<OverlayState>("idle");
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const noiseSupCtxRef = useRef<AudioContext | null>(null);
  const smartDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const recordingStartRef = useRef(0);

  const updateState = useCallback((s: OverlayState) => {
    setState(s);
    onStateChange(s);
  }, [onStateChange]);

  // ── Cleanup ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (smartDelayRef.current) { clearTimeout(smartDelayRef.current); smartDelayRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (noiseSupCtxRef.current) { noiseSupCtxRef.current.close().catch(() => {}); noiseSupCtxRef.current = null; }
    if (vadRef.current) { vadRef.current.stop(); vadRef.current = null; }
    if (volumeIntervalRef.current) { clearInterval(volumeIntervalRef.current); volumeIntervalRef.current = undefined; }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setVolume(0);
    onVolume?.(0);
  }, [onVolume]);

  // ── Volume analyser ──────────────────────────────────────────────
  const startVolumeAnalyser = useCallback(() => {
    volumeIntervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length / 255;
      setVolume(avg);
      onVolume?.(avg);
    }, 50);
  }, [onVolume]);

  // ── Get audio stream ─────────────────────────────────────────────
  const getStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
    });

    let recordStream = stream;
    try {
      const { cleanedStream, ctx, ready } = await attachNoiseSuppression(stream);
      await ready;
      noiseSupCtxRef.current = ctx;
      recordStream = cleanedStream;
    } catch { /* use raw stream */ }

    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate: 48000 });
    ctx.resume().catch(() => {});
    audioContextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    analyserRef.current = analyser;

    return { rawStream: stream, recordStream };
  }, []);

  // ── TTS playback ─────────────────────────────────────────────────
  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    updateState("speaking");

    const ttsCfg = await window.orun.settings.get<{ engine: string; voiceId: string }>("tts");
    if (!ttsCfg?.engine || !ttsCfg?.voiceId) {
      updateState("idle");
      return;
    }

    const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
    for (const sentence of sentences) {
      await new Promise<void>((resolve) => {
        ttsQueueRef.current = ttsQueueRef.current.then(async () => {
          try {
            const result = await window.orun.tts.synthesize(ttsCfg.engine as OrunTTSEngine, ttsCfg.voiceId, sentence);
            if (result.fallbackFrom) {
              window.dispatchEvent(new CustomEvent("tts:fallback", { detail: { from: result.fallbackFrom, to: result.engine } }));
            }
            await new Promise<void>((res) => {
              const audio = new Audio(`data:${result.mime};base64,${result.audioBase64}`);
              currentAudioRef.current = audio;
              audio.onended = () => { currentAudioRef.current = null; res(); };
              audio.onerror = () => { currentAudioRef.current = null; res(); };
              audio.play().catch(() => res());
            });
          } catch { /* skip sentence */ }
          resolve();
        });
      });
    }

    updateState("idle");
  }, [updateState]);

  // ── Process recorded audio ───────────────────────────────────────
  const processAudio = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (audioBlob.size === 0) { updateState("idle"); return; }
    updateState("thinking");

    try {
      // Encode to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const audioBase64 = btoa(binary);

      // STT — try configured URL, then auto-detect localhost:8080
      let transcript = "";
      const sttCfg = await window.orun.settings.get<{ baseUrl: string }>("stt");
      const sttUrls = [sttCfg?.baseUrl, "http://localhost:8080"].filter(Boolean) as string[];

      for (const url of sttUrls) {
        try {
          const result = await window.orun.stt.transcribe({ baseUrl: url, audioBase64, mimeType, language: "pt" });
          transcript = result.text?.trim() || "";
          if (transcript) break;
        } catch { /* try next URL */ }
      }

      if (!transcript) {
        window.dispatchEvent(new CustomEvent("tts:fallback", { detail: { from: "stt", to: "none", error: "STT não configurado. Configure em Configurações → Voz → STT." } }));
        updateState("idle");
        return;
      }

      // AI chat — pass agentId so the correct agent handles it
      const aiResponse = await window.orun.ai.chat([{ role: "user", content: transcript }]);

      // TTS
      if (aiResponse?.trim()) {
        await speakText(aiResponse);
      } else {
        updateState("idle");
      }
    } catch (err) {
      console.warn("[voice-overlay] error:", err);
      updateState("idle");
    }
  }, [updateState, speakText]);

  // ── Start recording ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    // Stop any playing TTS when user starts speaking
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); currentAudioRef.current = null; } catch {}
    }
    ttsQueueRef.current = Promise.resolve();

    try {
      const { rawStream, recordStream } = await getStream();
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/wav";

      const recorder = new MediaRecorder(recordStream, { mimeType });
      chunksRef.current = [];
      recordingStartRef.current = Date.now();

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cleanup();
        if (chunksRef.current.length === 0) { updateState("idle"); return; }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await processAudio(audioBlob, mimeType);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      updateState("listening");
      startVolumeAnalyser();

      // VAD
      const vad = new VoiceActivityDetector({
        speechThreshold: 0.025,
        silenceThreshold: 0.008,
        silenceDuration: 2500,
        hangover: 500,
        minSpeechDuration: 300,
      });
      vad.start(rawStream, (event: VADEvent) => {
        if (event.type === "speech_end") {
          smartDelayRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }, 1200);
        }
      });
      vadRef.current = vad;
    } catch (err) {
      console.error("[voice-overlay] mic error:", err);
      updateState("idle");
      cleanup();
    }
  }, [getStream, processAudio, updateState, startVolumeAnalyser, cleanup]);

  // ── Stop recording ───────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (smartDelayRef.current) { clearTimeout(smartDelayRef.current); smartDelayRef.current = null; }
    if (vadRef.current) { vadRef.current.stop(); vadRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); }
  }, []);

  // ── Stop TTS ─────────────────────────────────────────────────────
  const stopTTS = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    ttsQueueRef.current = Promise.resolve();
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    cleanup();
  }, [cleanup]);

  return { state, volume, startRecording, stopRecording, stopTTS, cleanup };
}

"""
Orun OS — Background Wake Word Service
Listens for "OK Orun" (or variants) via mic, signals Electron to show voice overlay.

Usage:
    python wake_word_service.py [--port 8081] [--stt-url http://localhost:8080]

Requires: sounddevice, numpy, requests (pip install sounddevice numpy requests)
"""

import sys
import os
import json
import time
import struct
import socket
import argparse
import threading
import numpy as np

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

# ── Config ─────────────────────────────────────────────────────────────
WAKE_WORDS = [
    "ok orun", "okay orun", "ô orun", "o orun",
    "oi orun", "oie orun", "hey orun", "hampton",
    "oi hampton", "ok hampton",
]
SAMPLE_RATE = 16000
CHUNK_DURATION = 3.0        # seconds per recording chunk
SILENCE_THRESHOLD = 1e-4    # absolute minimum RMS (quiet mics) — default arg value
MIN_SPEECH_DURATION = 0.3   # minimum speech to consider
SLEEP_BETWEEN_CHUNKS = 0.5  # pause between listening cycles
# ── Adaptive VAD ────────────────────────────────────────────────────────
# Uses a rolling noise floor instead of a fixed threshold, so detection
# works even on quiet mics/low gain. Speech is declared when the chunk RMS
# is FLOOR_RATIO x above the rolling floor (and above --threshold).
NOISE_FLOOR_ALPHA = 0.85    # EMA smoothing for the noise floor
FLOOR_RATIO = 3.0           # how much louder than the floor = speech
TARGET_PEAK = 0.9           # peak normalization level before STT
VERBOSE = False

# ── Mic capture via sounddevice ────────────────────────────────────────
def record_chunk(duration, sample_rate):
    """Record a chunk of audio from the mic."""
    import sounddevice as sd
    frames = int(duration * sample_rate)
    try:
        audio = sd.rec(frames, samplerate=sample_rate, channels=1, dtype="float32")
        sd.wait()
        return audio.flatten()
    except Exception as e:
        print(f"[wake] mic error: {e}", flush=True)
        return None


def compute_rms(audio):
    """Compute RMS energy of audio."""
    return float(np.sqrt(np.mean(audio ** 2)))


def normalize_audio(audio, target_peak=TARGET_PEAK):
    """Peak-normalize audio so quiet mics still reach the STT with a strong
    signal. Returns audio unchanged if the chunk is pure silence."""
    peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
    if peak < 1e-9:
        return audio
    return audio * (target_peak / peak)


def detect_speech(audio, abs_threshold, min_duration, sample_rate, noise_floor):
    """Adaptive VAD: declares speech when chunk RMS is FLOOR_RATIO x above the
    rolling noise floor (and above abs_threshold). Returns
    (has_speech, speech_duration, updated_noise_floor)."""
    rms = compute_rms(audio)
    threshold = max(noise_floor * FLOOR_RATIO, abs_threshold)

    frame_len = int(0.02 * sample_rate)  # 20ms frames
    speech_frames = 0
    for i in range(0, len(audio) - frame_len, frame_len):
        frame = audio[i:i + frame_len]
        if compute_rms(frame) > threshold * 0.5:
            speech_frames += 1

    speech_duration = speech_frames * 0.02
    if speech_duration < min_duration or rms < threshold:
        new_floor = noise_floor * NOISE_FLOOR_ALPHA + rms * (1 - NOISE_FLOOR_ALPHA)
        return False, speech_duration, new_floor
    return True, speech_duration, noise_floor


# ── Silero VAD (opcional) ──────────────────────────────────────────────
# Muito mais preciso que o VAD por RMS. Se torch/torchaudio não estiverem
# instalados, o serviço cai automaticamente para o VAD adaptativo (RMS).
_SILERO_MODEL = None
_SILERO_UTILS = None
_SILERO_TRIED = False


def _load_silero():
    """Lazy-load silero-vad. Returns (model, utils) or (None, None)."""
    global _SILERO_TRIED
    if _SILERO_TRIED:
        return _SILERO_MODEL, _SILERO_UTILS
    _SILERO_TRIED = True
    try:
        import torch  # noqa: F401
        torch.set_num_threads(1)
        model, utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            trust_repo=True,
            force_reload=False,
        )
        _SILERO_MODEL, _SILERO_UTILS = model, utils
        print("[wake] Silero VAD loaded (speech detection de alta precisão)", flush=True)
    except Exception as e:
        print(f"[wake] Silero VAD indisponível ({e}) — usando VAD por RMS", flush=True)
        _SILERO_MODEL, _SILERO_UTILS = None, None
    return _SILERO_MODEL, _SILERO_UTILS


def detect_speech_silero(audio, sample_rate):
    """Run silero VAD over the chunk. Returns (has_speech, speech_duration)
    or None if silero is unavailable."""
    model, utils = _load_silero()
    if model is None or utils is None:
        return None
    try:
        import torch
        (get_speech_timestamps, _, _, _, _) = utils
        tensor = torch.from_numpy(audio).float()
        timestamps = get_speech_timestamps(tensor, model, sampling_rate=sample_rate)
        duration = sum(int(ts["end"] - ts["start"]) for ts in timestamps) / sample_rate
        return bool(timestamps), duration
    except Exception as e:
        print(f"[wake] Silero inference error ({e}) — fallback RMS", flush=True)
        return None


# ── Send audio to STT server ──────────────────────────────────────────
WAKE_PROMPT = "Ok Orun, okay Orun, oi Orun, oie Orun, hey Orun, Ok Hampton, oi Hampton"


def transcribe_audio(audio, sample_rate, stt_url):
    """Send audio to the STT server and return the transcription."""
    import io
    import wave
    import requests

    # Convert to 16-bit PCM WAV
    audio_int16 = (normalize_audio(audio) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())
    buf.seek(0)

    try:
        resp = requests.post(
            f"{stt_url}/v1/audio/transcriptions",
            files={"file": ("audio.wav", buf, "audio/wav")},
            data={"language": "pt", "initial_prompt": WAKE_PROMPT},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("text", "").strip()
    except Exception as e:
        print(f"[wake] STT error: {e}", flush=True)
    return ""


# ── Check wake word ────────────────────────────────────────────────────
import re

# Fuzzy patterns: Whisper may transcribe "orun" as variations
ORUN_FUZZY = re.compile(
    r"(?:ok|okay|ô|o|oi|oie|hey|oi\s+hampton|ok\s+hampton)\s+"
    r"(?:orun|orum|oren|ourum|orõ|orã|orum|oren|orunh|orún)",
    re.IGNORECASE,
)
HAMPTON_EXACT = re.compile(r"\bhampton\b", re.IGNORECASE)


def contains_wake_word(text):
    """Check if text contains a wake word variant (exact + fuzzy)."""
    text_lower = text.lower().strip()

    # Exact match first
    for wake in WAKE_WORDS:
        if wake in text_lower:
            return True

    # Fuzzy match for "orun" variations
    if ORUN_FUZZY.search(text_lower):
        return True

    # Exact "hampton" match
    if HAMPTON_EXACT.search(text_lower):
        return True

    return False


# ── Signal Electron via TCP ────────────────────────────────────────────
def signal_electron(port, token=""):
    """Send a wake signal to the Electron app via TCP."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            s.connect(("127.0.0.1", port))
            s.sendall(json.dumps({"type": "wake", "token": token}).encode())
    except Exception as e:
        print(f"[wake] signal error: {e}", flush=True)


# ── Main loop ──────────────────────────────────────────────────────────
def main():
    global VERBOSE
    parser = argparse.ArgumentParser(description="Orun OS Wake Word Service")
    parser.add_argument("--port", type=int, default=8081, help="TCP port for Electron IPC (default: 8081)")
    parser.add_argument("--stt-url", type=str, default="http://localhost:8080", help="STT server URL")
    parser.add_argument("--threshold", type=float, default=SILENCE_THRESHOLD, help="VAD energy threshold")
    parser.add_argument("--token", type=str, default="", help="Auth token for TCP IPC")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument(
        "--vad", type=str, default="auto", choices=["auto", "silero", "rms"],
        help="VAD engine: auto (silero se disponível, senão RMS), silero, rms (default: auto)",
    )
    args = parser.parse_args()
    VERBOSE = args.verbose

    print(f"[wake] Starting wake word service...", flush=True)
    print(f"[wake] STT server: {args.stt_url}", flush=True)
    print(f"[wake] Electron IPC port: {args.port}", flush=True)
    print(f"[wake] Threshold: {args.threshold}", flush=True)
    print(f"[wake] VAD engine: {args.vad}", flush=True)
    print(f"[wake] Wake words: {WAKE_WORDS}", flush=True)

    # Test STT server connectivity
    try:
        import requests
        resp = requests.get(f"{args.stt_url}/v1/audio/detect-language", timeout=3)
        print(f"[wake] STT server: connected (status {resp.status_code})", flush=True)
    except Exception as e:
        print(f"[wake] WARNING: STT server not reachable at {args.stt_url}: {e}", flush=True)
        print(f"[wake] Wake word detection will fail without STT server!", flush=True)

    # Preload VAD engine at startup (avoid blocking the first chunk)
    use_silero = False
    if args.vad != "rms":
        model, _ = _load_silero()
        use_silero = model is not None
        print(f"[wake] VAD engine ativo: {'silero' if use_silero else 'RMS'}", flush=True)
    else:
        print("[wake] VAD engine ativo: RMS", flush=True)

    print(f"[wake] Listening...", flush=True)

    consecutive_failures = 0
    max_failures = 5
    noise_floor = args.threshold

    while True:
        try:
            # Record a chunk
            audio = record_chunk(CHUNK_DURATION, SAMPLE_RATE)
            if audio is None:
                consecutive_failures += 1
                if consecutive_failures >= max_failures:
                    print("[wake] Too many mic failures, sleeping 10s...", flush=True)
                    time.sleep(10)
                    consecutive_failures = 0
                time.sleep(1)
                continue

            consecutive_failures = 0

            # Log RMS energy for debugging
            rms = compute_rms(audio)
            if VERBOSE:
                print(f"[wake] RMS energy: {rms:.6f} (floor: {noise_floor:.6f})", flush=True)

            # Choose VAD engine
            if use_silero:
                res = detect_speech_silero(audio, SAMPLE_RATE)
                if res is not None:
                    has_speech, duration = res
                else:
                    has_speech, duration, noise_floor = detect_speech(
                        audio, args.threshold, MIN_SPEECH_DURATION, SAMPLE_RATE, noise_floor
                    )
            else:
                # Check for speech (adaptive noise floor)
                has_speech, duration, noise_floor = detect_speech(
                    audio, args.threshold, MIN_SPEECH_DURATION, SAMPLE_RATE, noise_floor
                )

            if not has_speech:
                if VERBOSE:
                    print(f"[wake] No speech (RMS={rms:.6f} <= floor*{FLOOR_RATIO}), floor={noise_floor:.6f}", flush=True)
                time.sleep(SLEEP_BETWEEN_CHUNKS)
                continue

            print(f"[wake] Speech detected ({duration:.1f}s, RMS={rms:.6f}), transcribing...", flush=True)

            # Transcribe
            text = transcribe_audio(audio, SAMPLE_RATE, args.stt_url)
            if not text:
                print("[wake] No text from STT", flush=True)
                time.sleep(SLEEP_BETWEEN_CHUNKS)
                continue

            print(f"[wake] Transcript: \"{text}\"", flush=True)

            # Check wake word
            if contains_wake_word(text):
                print(f"[wake] ✓ Wake word detected! Signaling Electron...", flush=True)
                signal_electron(args.port, args.token)
                time.sleep(2)  # Cooldown after detection
            else:
                if VERBOSE:
                    print(f"[wake] No wake word found in: \"{text}\"", flush=True)

            time.sleep(SLEEP_BETWEEN_CHUNKS)

        except KeyboardInterrupt:
            print("[wake] Stopped", flush=True)
            break
        except Exception as e:
            print(f"[wake] Error: {e}", flush=True)
            time.sleep(2)


if __name__ == "__main__":
    main()

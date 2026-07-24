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
SILENCE_THRESHOLD = 0.01    # RMS energy threshold (lower = more sensitive)
MIN_SPEECH_DURATION = 0.3   # minimum speech to consider
SLEEP_BETWEEN_CHUNKS = 0.5  # pause between listening cycles
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


def detect_speech(audio, threshold, min_duration, sample_rate):
    """Simple energy-based VAD. Returns (has_speech, speech_duration)."""
    rms = compute_rms(audio)
    if rms < threshold:
        return False, 0.0

    # Find speech segments
    frame_len = int(0.02 * sample_rate)  # 20ms frames
    speech_frames = 0
    for i in range(0, len(audio) - frame_len, frame_len):
        frame = audio[i:i + frame_len]
        if compute_rms(frame) > threshold * 0.5:
            speech_frames += 1

    speech_duration = speech_frames * 0.02
    return speech_duration >= min_duration, speech_duration


# ── Send audio to STT server ──────────────────────────────────────────
WAKE_PROMPT = "Ok Orun, okay Orun, oi Orun, oie Orun, hey Orun, Ok Hampton, oi Hampton"


def transcribe_audio(audio, sample_rate, stt_url):
    """Send audio to the STT server and return the transcription."""
    import io
    import wave
    import requests

    # Convert to 16-bit PCM WAV
    audio_int16 = (audio * 32767).astype(np.int16)
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
def signal_electron(port):
    """Send a wake signal to the Electron app via TCP."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            s.connect(("127.0.0.1", port))
            s.sendall(json.dumps({"type": "wake"}).encode())
    except Exception as e:
        print(f"[wake] signal error: {e}", flush=True)


# ── Main loop ──────────────────────────────────────────────────────────
def main():
    global VERBOSE
    parser = argparse.ArgumentParser(description="Orun OS Wake Word Service")
    parser.add_argument("--port", type=int, default=8081, help="TCP port for Electron IPC (default: 8081)")
    parser.add_argument("--stt-url", type=str, default="http://localhost:8080", help="STT server URL")
    parser.add_argument("--threshold", type=float, default=SILENCE_THRESHOLD, help="VAD energy threshold")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()
    VERBOSE = args.verbose

    print(f"[wake] Starting wake word service...", flush=True)
    print(f"[wake] STT server: {args.stt_url}", flush=True)
    print(f"[wake] Electron IPC port: {args.port}", flush=True)
    print(f"[wake] Threshold: {args.threshold}", flush=True)
    print(f"[wake] Wake words: {WAKE_WORDS}", flush=True)

    # Test STT server connectivity
    try:
        import requests
        resp = requests.get(f"{args.stt_url}/v1/audio/detect-language", timeout=3)
        print(f"[wake] STT server: connected (status {resp.status_code})", flush=True)
    except Exception as e:
        print(f"[wake] WARNING: STT server not reachable at {args.stt_url}: {e}", flush=True)
        print(f"[wake] Wake word detection will fail without STT server!", flush=True)

    print(f"[wake] Listening...", flush=True)

    consecutive_failures = 0
    max_failures = 5

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
                print(f"[wake] RMS energy: {rms:.4f} (threshold: {args.threshold})", flush=True)

            # Check for speech
            has_speech, duration = detect_speech(audio, args.threshold, MIN_SPEECH_DURATION, SAMPLE_RATE)
            if not has_speech:
                if VERBOSE:
                    print(f"[wake] No speech (RMS={rms:.4f} < threshold={args.threshold})", flush=True)
                time.sleep(SLEEP_BETWEEN_CHUNKS)
                continue

            print(f"[wake] Speech detected ({duration:.1f}s, RMS={rms:.4f}), transcribing...", flush=True)

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
                signal_electron(args.port)
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

"""
Orun OS — Wake Word Diagnostic Script
Tests all components of the wake word pipeline.

Usage:
    python test_wake_word.py
"""

import sys
import os
import platform
import subprocess
import importlib
import time
import json
import socket

print("=" * 60)
print("  Orun OS — Wake Word Diagnostic")
print("=" * 60)
print()

errors = []
warnings = []
ok_count = 0

def check(name, ok, msg_ok="", msg_fail=""):
    global ok_count
    if ok:
        ok_count += 1
        print(f"  [OK]    {name}: {msg_ok}")
    else:
        errors.append(name)
        print(f"  [FAIL]  {name}: {msg_fail}")

def warn(name, msg):
    warnings.append(name)
    print(f"  [WARN]  {name}: {msg}")

# ── 1. Python version ─────────────────────────────────────────────
print("1. Python Environment")
print("-" * 40)
ver = sys.version_info
check("Python version", ver >= (3, 8),
      f"{ver.major}.{ver.minor}.{ver.micro}",
      f"Need Python 3.8+, found {ver.major}.{ver.minor}.{ver.micro}")
print()

# ── 2. Required packages ──────────────────────────────────────────
print("2. Required Packages")
print("-" * 40)
required = {
    "sounddevice": "Audio recording",
    "numpy": "Audio processing",
    "requests": "HTTP requests to STT",
    "flask": "STT server",
    "faster_whisper": "Local speech-to-text",
}
for pkg, desc in required.items():
    try:
        mod = importlib.import_module(pkg)
        ver_str = getattr(mod, "__version__", "installed")
        check(pkg, True, f"v{ver_str} ({desc})", "")
    except ImportError:
        check(pkg, False, "", f"pip install {pkg} ({desc})")
print()

# ── 3. Microphone test ────────────────────────────────────────────
print("3. Microphone Test")
print("-" * 40)
try:
    import sounddevice as sd
    devices = sd.query_devices()
    default_input = sd.query_devices(kind="input")
    check("Input device found", True, default_input["name"], "")

    # Try recording 1 second
    print("  Recording 1 second from mic... (speak now)")
    audio = sd.rec(int(1.0 * 16000), samplerate=16000, channels=1, dtype="float32")
    sd.wait()
    import numpy as np
    rms = float(np.sqrt(np.mean(audio ** 2)))
    check("Audio captured", rms > 0.001, f"RMS energy: {rms:.4f}", f"RMS too low: {rms:.4f} — mic may be muted")

    if rms < 0.01:
        warn("Low energy", f"RMS={rms:.4f} is very low. Try lowering threshold to --threshold {max(0.005, rms * 0.5):.4f}")
    elif rms > 0.1:
        warn("High energy", f"RMS={rms:.4f} is very high. Background noise? Try --threshold 0.02")

    # Test VAD with current threshold
    from wake_word_service import detect_speech, SILENCE_THRESHOLD
    has_speech, duration = detect_speech(audio.flatten(), SILENCE_THRESHOLD, 0.3, 16000)
    if has_speech:
        check("VAD detection", True, f"Speech detected ({duration:.1f}s) with threshold={SILENCE_THRESHOLD}", "")
    else:
        warn("VAD", f"No speech detected with threshold={SILENCE_THRESHOLD}. Suggested threshold: {max(0.005, rms * 0.3):.4f}")

except Exception as e:
    check("Microphone", False, "", str(e))
print()

# ── 4. STT Server ─────────────────────────────────────────────────
print("4. STT Server (port 8080)")
print("-" * 40)
stt_running = False
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(("127.0.0.1", 8080))
    sock.close()
    stt_running = (result == 0)
    check("STT server reachable", stt_running, "Port 8080 is open", "Port 8080 is not open — STT server not running")
except Exception as e:
    check("STT server reachable", False, "", str(e))

if stt_running:
    try:
        import requests
        resp = requests.get("http://localhost:8080/v1/audio/detect-language", timeout=5)
        check("STT server responsive", resp.status_code in [200, 405, 404],
              f"Status {resp.status_code}", f"Status {resp.status_code}")
    except Exception as e:
        check("STT server responsive", False, "", str(e))
else:
    print("  [INFO]  To start STT server: python stt_server.py --port 8080")
print()

# ── 5. Wake Word TCP Port ─────────────────────────────────────────
print("5. Wake Word TCP Port (8081)")
print("-" * 40)
try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(("127.0.0.1", 8081))
    sock.close()
    if result == 0:
        check("Port 8081", False, "", "Port 8081 is already in use — another wake word service may be running")
    else:
        check("Port 8081", True, "Available", "")
except Exception as e:
    check("Port 8081", True, "Available", "")
print()

# ── 6. Full transcribe test ───────────────────────────────────────
print("6. Transcription Test (if STT server running)")
print("-" * 40)
if stt_running:
    try:
        import numpy as np
        import io
        import wave
        import requests as req

        # Generate a test audio with some energy (simulated speech)
        duration = 2.0
        t = np.linspace(0, duration, int(16000 * duration))
        # Simple tone + noise to simulate speech
        test_audio = 0.05 * np.sin(2 * np.pi * 440 * t) + 0.01 * np.random.randn(len(t))
        test_audio = test_audio.astype(np.float32)

        audio_int16 = (test_audio * 32767).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(audio_int16.tobytes())
        buf.seek(0)

        resp = req.post(
            "http://localhost:8080/v1/audio/transcriptions",
            files={"file": ("test.wav", buf, "audio/wav")},
            data={"language": "pt"},
            timeout=10,
        )
        if resp.status_code == 200:
            text = resp.json().get("text", "")
            check("Transcription endpoint", True, f"Response: '{text}'", "")
        else:
            check("Transcription endpoint", False, "", f"HTTP {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        check("Transcription endpoint", False, "", str(e))

    # Test with initial_prompt (wake word bias)
    try:
        import numpy as np
        import io
        import wave
        import requests as req

        duration = 2.0
        t = np.linspace(0, duration, int(16000 * duration))
        test_audio = 0.05 * np.sin(2 * np.pi * 440 * t) + 0.01 * np.random.randn(len(t))
        test_audio = test_audio.astype(np.float32)

        audio_int16 = (test_audio * 32767).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(audio_int16.tobytes())
        buf.seek(0)

        WAKE_PROMPT = "Ok Orun, okay Orun, oi Orun, oie Orun, hey Orun, Ok Hampton, oi Hampton"
        resp = req.post(
            "http://localhost:8080/v1/audio/transcriptions",
            files={"file": ("test.wav", buf, "audio/wav")},
            data={"language": "pt", "initial_prompt": WAKE_PROMPT},
            timeout=10,
        )
        if resp.status_code == 200:
            text = resp.json().get("text", "")
            check("Transcription with wake prompt", True, f"Response: '{text}'", "")
        else:
            check("Transcription with wake prompt", False, "", f"HTTP {resp.status_code}")
    except Exception as e:
        check("Transcription with wake prompt", False, "", str(e))
else:
    print("  [SKIP]  STT server not running, skipping transcription test")
print()

# ── Summary ───────────────────────────────────────────────────────
print("=" * 60)
if errors:
    print(f"  RESULT: {len(errors)} issue(s) found!")
    print()
    for e in errors:
        print(f"  - {e}")
    print()
    print("  Fix the issues above and try again.")
elif warnings:
    print(f"  RESULT: OK with {len(warnings)} warning(s)")
    print()
    for w in warnings:
        print(f"  - {w}")
else:
    print(f"  RESULT: All {ok_count} checks passed!")
print()

if errors or warnings:
    print("  TIPS:")
    print("  - Install missing packages: pip install sounddevice numpy requests")
    print("  - Start STT server: python stt_server.py --port 8080")
    print("  - Adjust threshold: python wake_word_service.py --threshold 0.008")
    print("  - Run with verbose: python wake_word_service.py --verbose")
print("=" * 60)

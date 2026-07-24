"""
Orun OS — Local Piper TTS Server
Fast, lightweight, offline text-to-speech using Piper.

Usage:
    python piper_server.py [--port 5002] [--model pt_BR-faber-medium]

First run downloads the voice model (~50MB).
"""

import sys
import os
import io
import json
import wave
import argparse
import time
import struct

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

from flask import Flask, request, jsonify, Response

app = Flask(__name__)
model = None
model_name = None
SAMPLE_RATE = 22050

# Available Portuguese Piper voices (Hugging Face)
PT_VOICES = {
    "pt_BR-faber-medium": "rhasspy/piper-voices",
    "pt_BR-cssilva-medium": "rhasspy/piper-voices",
    "pt_BR-tugao-medium": "rhasspy/piper-voices",
}

DEFAULT_MODEL = "pt_BR-cadu-medium"


def load_model(model_id):
    """Load a Piper voice model."""
    global model, model_name, SAMPLE_RATE
    print(f"[piper] Loading voice model '{model_id}'...")
    start = time.time()

    from piper import PiperVoice

    model_dir = os.path.join(os.path.expanduser("~"), ".cache", "piper", "voices")
    os.makedirs(model_dir, exist_ok=True)

    # Derive onnx path from model_id: pt_BR-cadu-medium → pt/pt_BR/cadu/medium/pt_BR-cadu-medium.onnx
    parts = model_id.split("-")  # [pt_BR, cadu, medium]
    lang = parts[0].replace("_", "/")  # pt/BR → pt_BR becomes pt/BR
    lang_base = parts[0].split("_")[0]  # pt
    country = parts[0].split("_")[1] if "_" in parts[0] else ""
    speaker = parts[1] if len(parts) > 1 else "medium"
    quality = parts[2] if len(parts) > 2 else "medium"

    # Try multiple paths
    candidates = [
        os.path.join(model_dir, lang_base, parts[0], speaker, quality, f"{model_id}.onnx"),
        os.path.join(model_dir, f"{model_id}.onnx"),
    ]

    model_path = None
    config_path = None
    for p in candidates:
        cfg_p = p + ".json"
        if os.path.exists(p) and os.path.exists(cfg_p):
            model_path = p
            config_path = cfg_p
            break

    if not model_path:
        print(f"[piper] Model not cached, downloading from Hugging Face...")
        from huggingface_hub import hf_hub_download

        # Build HF path
        hf_path = f"{lang_base}/{parts[0]}/{speaker}/{quality}/{model_id}.onnx"
        hf_path_json = f"{lang_base}/{parts[0]}/{speaker}/{quality}/{model_id}.onnx.json"
        try:
            model_path = hf_hub_download(repo_id="rhasspy/piper-voices", filename=hf_path, local_dir=model_dir)
            config_path = hf_hub_download(repo_id="rhasspy/piper-voices", filename=hf_path_json, local_dir=model_dir)
        except Exception as e:
            print(f"[piper] Download failed: {e}")
            print("[piper] Falling back to espeak-ng synthesizer...")
            _load_espeak_fallback()
            return

    model = PiperVoice.load(model_path, config_path)
    SAMPLE_RATE = model.config.sample_rate
    model_name = model_id
    elapsed = time.time() - start
    print(f"[piper] Model loaded in {elapsed:.1f}s (sample_rate={SAMPLE_RATE})")


def _load_espeak_fallback():
    """Load espeak-ng as fallback if Piper model can't be downloaded."""
    global model, model_name
    print("[piper] Using espeak-ng as fallback synthesizer")
    model_name = "espeak-ng-fallback"
    model = "espeak"


def synthesize_piper(text):
    """Synthesize text using Piper model."""
    if model == "espeak":
        return synthesize_espeak(text)

    # Piper returns iterable of AudioChunk with audio_int16_bytes
    chunks = list(model.synthesize(text))
    raw_pcm = b"".join(c.audio_int16_bytes for c in chunks)

    # Wrap in WAV
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(raw_pcm)
    buf.seek(0)
    return buf.read()


def synthesize_espeak(text):
    """Fallback: use espeak-ng command line if available."""
    import subprocess
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name

    try:
        # Try espeak-ng first, then espeak
        for cmd in ["espeak-ng", "espeak"]:
            try:
                subprocess.run(
                    [cmd, "-v", "pt", "-w", tmp_path, text],
                    capture_output=True, timeout=10, check=True,
                )
                with open(tmp_path, "rb") as f:
                    return f.read()
            except (FileNotFoundError, subprocess.CalledProcessError):
                continue

        # Last resort: return silence
        return b""
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.route("/api/tts", methods=["POST"])
def tts():
    """Simple TTS endpoint: POST { "text": "..." } → WAV audio."""
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        audio_bytes = synthesize_piper(text)
        if not audio_bytes:
            return jsonify({"error": "Synthesis produced no audio"}), 500

        return Response(audio_bytes, mimetype="audio/wav", headers={
            "X-Sample-Rate": str(SAMPLE_RATE),
            "X-Model": model_name or "unknown",
        })
    except Exception as e:
        print(f"[piper] Synthesis error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/v1/audio/speech", methods=["POST"])
def openai_compat():
    """OpenAI-compatible TTS endpoint: POST { "input": "...", "model": "..." } → audio."""
    data = request.get_json(silent=True) or {}
    text = data.get("input", "").strip()
    if not text:
        return jsonify({"error": "No input provided"}), 400

    try:
        audio_bytes = synthesize_piper(text)
        return Response(audio_bytes, mimetype="audio/wav")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": model_name,
        "engine": "piper",
        "sample_rate": SAMPLE_RATE,
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Orun OS Piper TTS Server")
    parser.add_argument("--port", type=int, default=5002, help="Server port (default: 5002)")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Voice model (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    load_model(args.model)
    print(f"[piper] Server running on http://localhost:{args.port}")
    print(f"[piper] API: POST http://localhost:{args.port}/api/tts")
    app.run(host="0.0.0.0", port=args.port, debug=False)

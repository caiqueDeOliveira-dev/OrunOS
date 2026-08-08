"""
Orun OS — Local Whisper STT Server
Compatible with OpenAI /v1/audio/transcriptions API format.
Uses faster-whisper for fast local inference.

Usage:
    python stt_server.py [--port 8080] [--model base] [--device cpu]

First run downloads the model (~150MB for base).
"""

import sys
import os
import io
import json
import tempfile
import argparse
import time
from flask import Flask, request, jsonify

# Suppress noisy logs
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

app = Flask(__name__)
model = None
model_name = None

def load_model(model_size="base", device="cpu", compute_type="int8"):
    global model, model_name
    print(f"[stt] Loading whisper model '{model_size}' on {device} (compute_type={compute_type})...")
    start = time.time()
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    model_name = model_size
    elapsed = time.time() - start
    print(f"[stt] Model loaded in {elapsed:.1f}s")


@app.route("/v1/audio/transcriptions", methods=["POST"])
def transcribe():
    """OpenAI-compatible transcription endpoint."""
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    # Get audio file from form data
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    language = request.form.get("language", None)
    response_format = request.form.get("response_format", "json")

    print(f"[stt] Received file: {file.filename} content_type={file.content_type} size={request.content_length}")

    # Save to temp file (faster-whisper needs a file path)
    suffix = ".wav"
    if file.filename:
        suffix = os.path.splitext(file.filename)[1] or ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    # Convert webm/ogg to wav if needed (faster-whisper works best with wav)
    wav_path = tmp_path
    if suffix in (".webm", ".ogg", ".mp4"):
        wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
        try:
            import subprocess
            result = subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
                capture_output=True, timeout=30
            )
            print(f"[stt] ffmpeg conversion: returncode={result.returncode} stderr={result.stderr.decode()[-200:]}")
            if result.returncode != 0:
                print(f"[stt] ffmpeg failed, using raw file")
                wav_path = tmp_path
        except Exception as conv_err:
            print(f"[stt] ffmpeg conversion failed: {conv_err}, using raw file")
            wav_path = tmp_path
    print(f"[stt] Transcribing: {wav_path} (size={os.path.getsize(wav_path)})")

    try:
        # Transcribe with anti-hallucination defaults:
        # - condition_on_previous_text=False stops the model from repeating
        #   itself / echoing when the clip is mostly silence.
        # - no_speech_threshold rejects clips that are (likely) pure silence.
        # - log_prob/compression thresholds discard degenerate low-confidence
        #   or repetitive transcriptions.
        def _form_bool(key, default):
            raw = request.form.get(key)
            if raw is None:
                return default
            return str(raw).strip().lower() in ("1", "true", "yes", "on")

        def _form_float(key, default):
            raw = request.form.get(key)
            if raw is None or str(raw).strip() == "":
                return default
            try:
                return float(raw)
            except ValueError:
                return default

        kwargs = {
            "beam_size": 5,
            "vad_filter": True,
            "condition_on_previous_text": _form_bool("condition_on_previous_text", False),
            "no_speech_threshold": _form_float("no_speech_threshold", 0.6),
            "log_prob_threshold": _form_float("log_prob_threshold", -1.0),
            "compression_ratio_threshold": _form_float("compression_ratio_threshold", 2.4),
        }
        if language:
            kwargs["language"] = language

        # initial_prompt biases the model toward specific words (e.g. wake words)
        initial_prompt = request.form.get("initial_prompt", None)
        if initial_prompt:
            kwargs["initial_prompt"] = initial_prompt

        segments, info = model.transcribe(wav_path, **kwargs)

        full_text = ""
        segment_list = []
        for seg in segments:
            full_text += seg.text
            segment_list.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
            })

        no_speech_prob = getattr(info, "no_speech_prob", None)
        result = {
            "text": full_text.strip(),
            "language": info.language,
            "duration": info.duration,
            "no_speech_prob": round(no_speech_prob, 3) if no_speech_prob is not None else None,
        }

        if response_format == "verbose_json":
            result["segments"] = segment_list

        return jsonify(result)

    except Exception as e:
        print(f"[stt] Transcription error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        for p in (tmp_path, wav_path):
            try:
                os.unlink(p)
            except:
                pass


@app.route("/v1/audio/detect-language", methods=["POST"])
def detect_language():
    """Detect the language of an audio file."""
    if model is None:
        return jsonify({"error": "Model not loaded"}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(tmp_path, beam_size=1, language=None)
        # Consume iterator to get language info
        for _ in segments:
            pass
        return jsonify({"language": info.language, "probability": 1.0})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": model_name,
        "engine": "faster-whisper",
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Orun OS Whisper STT Server")
    parser.add_argument("--port", type=int, default=8080, help="Server port (default: 8080)")
    parser.add_argument(
        "--model", type=str, default="base",
        help="Whisper model: tiny, base, small, medium, large-v3, distil-large-v3 (default: base)",
    )
    parser.add_argument("--device", type=str, default="cpu", help="Device: cpu or cuda (default: cpu)")
    parser.add_argument(
        "--compute-type", type=str, default="int8",
        help="Compute type: int8 (CPU rápido), float16 (GPU), int8_float16 (GPU misto) (default: int8)",
    )
    parser.add_argument(
        "--host", type=str, default="127.0.0.1",
        help="Bind address (default: 127.0.0.1 — use 0.0.0.0 somente para acesso via rede)",
    )
    args = parser.parse_args()

    load_model(args.model, args.device, args.compute_type)
    print(f"[stt] Server running on http://{args.host}:{args.port}")
    print(f"[stt] API: POST http://localhost:{args.port}/v1/audio/transcriptions")
    # threaded=True allows concurrent transcription requests (each transcribe()
    # call runs independently in faster-whisper), so wake-word detection and
    # user dictation don't block each other.
    app.run(host=args.host, port=args.port, debug=False, threaded=True)

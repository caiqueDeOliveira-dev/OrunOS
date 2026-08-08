"""
Orun OS - Local Edge TTS Server
Free Microsoft Edge neural voices (no API key / no token limits).
Used as a fallback when cloud engines like ElevenLabs run out of quota.

Usage:
    python edge_tts_server.py [--port 5003] [--voice pt-BR-FranciscaNeural]

Requires: flask, edge-tts (pip install flask edge-tts)
"""

import os
import sys
import argparse
import time

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

from flask import Flask, request, jsonify, Response

app = Flask(__name__)

DEFAULT_VOICE = "pt-BR-FranciscaNeural"

# Portuguese (Brazil) neural voices + a few English fallbacks
PT_VOICES = [
    "pt-BR-FranciscaNeural", "pt-BR-AntonioNeural", "pt-BR-ThalitaNeural",
    "pt-BR-BrendaNeural", "pt-BR-ElzaNeural", "pt-BR-GiovannaNeural",
    "pt-BR-HeloisaNeural", "pt-BR-LeilaNeural", "pt-BR-LeticiaNeural",
    "pt-BR-YaraNeural", "pt-BR-DonatoNeural", "pt-BR-FabioNeural",
    "pt-BR-HumbertoNeural", "pt-BR-MuriloNeural", "pt-BR-RicardoNeural",
    "pt-BR-ValerioNeural",
]
EN_VOICES = [
    "en-US-AriaNeural", "en-US-GuyNeural", "en-US-JennyNeural",
    "en-US-AndrewNeural", "en-US-EmmaNeural", "en-GB-SoniaNeural",
]
ALL_VOICES = PT_VOICES + EN_VOICES


def synthesize_edge(text, voice, rate=None):
    """Synthesize text using edge-tts. Returns MP3 bytes."""
    import edge_tts

    if voice not in ALL_VOICES:
        voice = DEFAULT_VOICE

    kwargs = {}
    if rate:
        kwargs["rate"] = rate

    communicate = edge_tts.Communicate(text, voice, **kwargs)
    chunks = []
    for chunk in communicate.stream_sync():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    if not chunks:
        raise RuntimeError("Edge TTS produced no audio")
    return b"".join(chunks)


def stream_edge(text, voice, rate=None):
    """Stream edge-tts audio chunks incrementally (yields audio bytes)."""
    import edge_tts

    if voice not in ALL_VOICES:
        voice = DEFAULT_VOICE

    kwargs = {}
    if rate:
        kwargs["rate"] = rate

    communicate = edge_tts.Communicate(text, voice, **kwargs)
    sent = 0
    for chunk in communicate.stream_sync():
        if chunk["type"] == "audio":
            sent += len(chunk["data"])
            yield chunk["data"]
    if sent == 0:
        raise RuntimeError("Edge TTS produced no audio")


@app.route("/api/tts", methods=["POST"])
def tts():
    """POST { "text": "...", "voice": "...", "rate": "+0%" } -> MP3 audio (streamed)."""
    data = request.get_json(silent=True) or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    voice = data.get("voice") or DEFAULT_VOICE
    rate = data.get("rate")

    def generate():
        start = time.time()
        total = 0
        try:
            for chunk in stream_edge(text, voice, rate):
                total += len(chunk)
                yield chunk
            elapsed = time.time() - start
            print(f"[edge] Streamed {total} bytes in {elapsed:.1f}s (voice={voice})", flush=True)
        except Exception as e:
            print(f"[edge] Synthesis error: {e}", flush=True)
            yield f'{{"error": "{e}"}}'.encode()

    return Response(generate(), mimetype="audio/mpeg", headers={
        "X-Voice": voice,
        "X-Accel-Buffering": "no",
    })


@app.route("/v1/audio/speech", methods=["POST"])
def openai_compat():
    """OpenAI-compatible TTS endpoint: POST { "input": "...", "voice": "..." } -> MP3 (streamed)."""
    data = request.get_json(silent=True) or {}
    text = data.get("input", "").strip()
    if not text:
        return jsonify({"error": "No input provided"}), 400
    voice = data.get("voice") or DEFAULT_VOICE

    # OpenAI "speed" (0.25–4.0) maps to edge-tts rate ("+50%" == speed 1.5)
    speed = data.get("speed")
    rate = None
    if speed:
        try:
            pct = int(round((float(speed) - 1.0) * 100))
            rate = f"{pct:+d}%"
        except (TypeError, ValueError):
            rate = None

    def generate():
        try:
            for chunk in stream_edge(text, voice, rate):
                yield chunk
        except Exception as e:
            print(f"[edge] Synthesis error: {e}", flush=True)
            yield f'{{"error": "{e}"}}'.encode()

    return Response(generate(), mimetype="audio/mpeg", headers={
        "X-Voice": voice,
        "X-Accel-Buffering": "no",
    })


@app.route("/voices", methods=["GET"])
def voices():
    return jsonify(ALL_VOICES)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "engine": "edge-tts",
        "voice": DEFAULT_VOICE,
        "voices": len(ALL_VOICES),
    })


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Orun OS Edge TTS Server")
    parser.add_argument("--port", type=int, default=5003, help="Server port (default: 5003)")
    parser.add_argument("--voice", type=str, default=DEFAULT_VOICE, help=f"Default voice (default: {DEFAULT_VOICE})")
    parser.add_argument(
        "--host", type=str, default="127.0.0.1",
        help="Bind address (default: 127.0.0.1 — use 0.0.0.0 somente para acesso via rede)",
    )
    args = parser.parse_args()

    DEFAULT_VOICE = args.voice
    print(f"[edge] Edge TTS server on http://{args.host}:{args.port}")
    print(f"[edge] API: POST http://localhost:{args.port}/api/tts")
    print(f"[edge] Default voice: {DEFAULT_VOICE}")
    app.run(host=args.host, port=args.port, debug=False, threaded=True)

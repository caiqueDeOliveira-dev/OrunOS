"""
Orun OS — Local Kokoro TTS Server
Kokoro-82M: TTS neural local de alta qualidade, com voz pt-BR.

Usage:
    pip install kokoro onnxruntime soundfile  # ou: pip install kokoro[fast]
    python kokoro_server.py [--port 5004] [--device cpu|cuda]

Primeira execução baixa o modelo (~350MB) para ~/.cache/kokoro.
API:
    POST /api/tts  { "text": "...", "voice": "pf_dora", "speed": 1.0 } -> wav
    GET  /health
    GET  /voices
"""

import os
import io
import json
import time
import wave
import argparse

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

from flask import Flask, request, Response, jsonify

app = Flask(__name__)

SAMPLE_RATE = 24000

# Kokoro v1.0 voices (prefixos: a=EN-US, b=EN-GB, e=ES, f=FR, i=IT, j=JA, m=ZH, p=PT-BR)
VOICES = {
    # Português (Brasil)
    "pf_dora": "p", "pm_alex": "p",
    # Inglês (US)
    "af_heart": "a", "af_bella": "a", "af_nicole": "a", "af_sarah": "a", "af_sky": "a",
    "am_michael": "a", "am_onyx": "a", "am_adam": "a",
    # Inglês (GB)
    "bf_emma": "b", "bf_lily": "b", "bm_george": "b", "bm_daniel": "b",
    # Espanhol
    "ef_dora": "e", "em_alex": "e",
    # Francês
    "ff_siwis": "f", "fm_daniel": "f",
}

_PIPELINES = {}  # lang_code -> pipeline
_LOAD_ERROR = None


def _load_pipeline(lang_code):
    global _LOAD_ERROR
    if lang_code in _PIPELINES:
        return _PIPELINES[lang_code]
    try:
        from kokoro import KPipeline
        pipeline = KPipeline(lang_code=lang_code)
        _PIPELINES[lang_code] = pipeline
        return pipeline
    except Exception as e:
        _LOAD_ERROR = str(e)
        raise


def _synthesize(pipeline, text, voice, speed):
    """Run Kokoro and return raw PCM float32 at SAMPLE_RATE."""
    chunks = []
    for _gs, _ps, audio in pipeline(text, voice=voice, speed=float(speed)):
        chunks.append(audio.numpy())
    if not chunks:
        raise RuntimeError("Kokoro produced no audio")
    import numpy as np
    return np.concatenate(chunks) if len(chunks) > 1 else chunks[0]


@app.route("/voices", methods=["GET"])
def list_voices():
    return jsonify({"voices": list(VOICES.keys()), "sample_rate": SAMPLE_RATE})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok" if _PIPELINES or _LOAD_ERROR is None else "error",
        "engine": "kokoro",
        "sample_rate": SAMPLE_RATE,
        "voices": list(VOICES.keys()),
        "model_error": _LOAD_ERROR,
    })


@app.route("/api/tts", methods=["POST"])
def tts():
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Missing 'text'"}), 400

    voice = (body.get("voice") or "pf_dora").strip()
    speed = float(body.get("speed", 1.0))
    lang_code = VOICES.get(voice)
    if lang_code is None:
        lang_code = "p" if voice.startswith("p") else "a"

    try:
        pipeline = _load_pipeline(lang_code)
        audio = _synthesize(pipeline, text, voice, speed)

        import numpy as np
        pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm.tobytes())
        buf.seek(0)
        return Response(buf.getvalue(), mimetype="audio/wav")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Orun OS Kokoro TTS Server")
    parser.add_argument("--port", type=int, default=5004, help="Server port (default: 5004)")
    parser.add_argument(
        "--host", type=str, default="127.0.0.1",
        help="Bind address (default: 127.0.0.1 — use 0.0.0.0 somente para acesso via rede)",
    )
    args = parser.parse_args()

    print("[kokoro] Starting Kokoro TTS server...", flush=True)
    print(f"[kokoro] Voices: {list(VOICES.keys())}", flush=True)
    try:
        _load_pipeline("p")
        print("[kokoro] Modelo pré-carregado (pt-BR)", flush=True)
    except Exception as e:
        print(f"[kokoro] Modelo indisponível no momento ({e}).", flush=True)
        print("[kokoro] Instale com: pip install kokoro", flush=True)

    app.run(host=args.host, port=args.port, debug=False, threaded=True)

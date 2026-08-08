"""
Orun OS — Daemon unificado de voz (STT + TTS + Wake num processo só).

Substitui os 3 subprocessos (stt_server.py, edge_tts_server.py,
wake_word_service.py) por um único processo que:
  - Serve STT em :8080  (POST /v1/audio/transcriptions — compatível OpenAI)
  - Serve TTS em :5003  (POST /api/tts e /v1/audio/speech — streaming)
  - Roda a detecção de wake word "OK Orun" em thread própria, sinalizando o
    app Electron via TCP em :8081 (mesmo protocolo do wake_word_service.py)

Subsistemas são lazy-loaded: se uma dependência faltar, aquele endpoint
retorna 503 com mensagem clara em vez de derrubar o daemon inteiro.

Uso:
    python daemon_server.py [--stt-port 8080] [--tts-port 5003]
                            [--wake-port 8081] [--wake-token ""]
                            [--model small] [--device cpu] [--compute-type int8]
"""

import os
import sys
import time
import argparse
import threading

os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"

from flask import Flask, request, jsonify, Response

# ── Subsistemas reutilizados (módulos dos servidores individuais) ────────
# Importar é seguro: ambos só iniciam servidores dentro de `if __name__ ==
# "__main__"`. Reusamos as rotas originais para garantir paridade de API.
import stt_server
import edge_tts_server

STT_APP = Flask("orun-stt")
TTS_APP = Flask("orun-tts")


def _copy_routes(src_app, dst_app):
    """Registra as rotas de src_app em dst_app (mesmos endpoints/view funcs)."""
    for rule in src_app.url_map.iter_rules():
        if rule.endpoint == "static":
            continue
        dst_app.add_url_rule(
            rule.rule,
            rule.endpoint,
            view_func=src_app.view_functions[rule.endpoint],
            methods=rule.methods,
        )


_copy_routes(stt_server.app, STT_APP)
_copy_routes(edge_tts_server.app, TTS_APP)


# ── Wake word thread (reusa a lógica do wake_word_service.py) ─────────────
def run_wake_loop(stt_url, wake_port, token, stop_event):
    import wake_word_service as ww

    noise_floor = ww.SILENCE_THRESHOLD
    consecutive_failures = 0
    while not stop_event.is_set():
        try:
            audio = ww.record_chunk(ww.CHUNK_DURATION, ww.SAMPLE_RATE)
            if audio is None:
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    print("[daemon:wake] Many mic failures, sleeping 10s...", flush=True)
                    stop_event.wait(10)
                    consecutive_failures = 0
                stop_event.wait(1)
                continue
            consecutive_failures = 0

            # Silero VAD se disponível (muito mais preciso que RMS — evita
            # falsos positivos com ruído ambiente), senão VAD adaptativo RMS.
            has_speech, duration, noise_floor = ww.detect_speech_auto(
                audio, ww.SILENCE_THRESHOLD, ww.MIN_SPEECH_DURATION,
                ww.SAMPLE_RATE, noise_floor,
            )
            if not has_speech:
                stop_event.wait(ww.SLEEP_BETWEEN_CHUNKS)
                continue

            print(f"[daemon:wake] Speech detected ({duration:.1f}s), transcribing...", flush=True)
            text, no_speech_prob = ww.transcribe_audio(audio, ww.SAMPLE_RATE, stt_url)
            if not text:
                stop_event.wait(ww.SLEEP_BETWEEN_CHUNKS)
                continue

            # Rejeita ruído ambiente (Whisper alucina "orun/hampton" em
            # TV/teclado/etc. mesmo sem fala real).
            if no_speech_prob is not None and no_speech_prob > ww.NO_SPEECH_REJECT:
                print(f"[daemon:wake] No-speech prob {no_speech_prob:.2f} — descartando ruído: \"{text}\"", flush=True)
                stop_event.wait(ww.SLEEP_BETWEEN_CHUNKS)
                continue

            print(f"[daemon:wake] Transcript: \"{text}\"", flush=True)
            if ww.contains_wake_word(text):
                command = ww.strip_wake_word(text)
                print(f"[daemon:wake] ✓ Wake word detected! Command: \"{command}\"", flush=True)
                ww.signal_electron(wake_port, token, command or None)
                stop_event.wait(2)  # cooldown após detecção

            stop_event.wait(ww.SLEEP_BETWEEN_CHUNKS)
        except Exception as e:
            print(f"[daemon:wake] Error: {e}", flush=True)
            stop_event.wait(2)


def start_wake_thread(stt_url, wake_port, token):
    if not token or wake_port <= 0:
        print("[daemon:wake] Desativado (sem --wake-token)", flush=True)
        return None
    stop_event = threading.Event()
    thread = threading.Thread(
        target=run_wake_loop, args=(stt_url, wake_port, token, stop_event),
        daemon=True,
    )
    thread.start()
    print(f"[daemon:wake] Thread de wake word ativa (TCP :{wake_port})", flush=True)
    return stop_event


# ── Servidores (Flask threaded em duas portas) ───────────────────────────
def serve(app, port, host="127.0.0.1"):
    from werkzeug.serving import make_server
    server = make_server(host, port, app, threaded=True)
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description="Orun OS Daemon unificado de voz")
    parser.add_argument("--stt-port", type=int, default=8080)
    parser.add_argument("--tts-port", type=int, default=5003)
    parser.add_argument("--wake-port", type=int, default=8081)
    parser.add_argument("--wake-token", type=str, default="")
    parser.add_argument("--model", type=str, default="small")
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--compute-type", type=str, default="int8")
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()

    # STT: carrega o modelo em thread (TTS responde imediatamente)
    print(f"[daemon] Carregando modelo Whisper '{args.model}' em background...", flush=True)

    def _load_stt():
        try:
            stt_server.load_model(args.model, args.device, args.compute_type)
        except Exception as e:
            print(f"[daemon:stt] Falha ao carregar modelo: {e}", flush=True)

    threading.Thread(target=_load_stt, daemon=True).start()

    # Silero VAD: pré-carrega em background (primeiro chunk não fica lento
    # carregando torch.hub). Se faltar dependência, cai para VAD RMS.
    def _preload_silero():
        import wake_word_service as ww
        try:
            ww._load_silero()
        except Exception as e:
            print(f"[daemon:wake] Silero pré-carga falhou ({e}) — usando RMS", flush=True)

    threading.Thread(target=_preload_silero, daemon=True).start()

    # Wake word (thread própria; reusa o STT do próprio daemon via HTTP)
    stt_url = f"http://{args.host}:{args.stt_port}"
    stop_wake = start_wake_thread(stt_url, args.wake_port, args.wake_token)

    threads = [
        threading.Thread(target=serve, args=(STT_APP, args.stt_port, args.host), daemon=True, name="stt"),
        threading.Thread(target=serve, args=(TTS_APP, args.tts_port, args.host), daemon=True, name="tts"),
    ]
    for t in threads:
        t.start()

    print(f"[daemon] STT em http://{args.host}:{args.stt_port}/v1/audio/transcriptions", flush=True)
    print(f"[daemon] TTS em http://{args.host}:{args.tts_port}/api/tts", flush=True)
    print("[daemon] Pronto. Ctrl+C para encerrar.", flush=True)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[daemon] Encerrando...", flush=True)
        if stop_wake:
            stop_wake.set()


if __name__ == "__main__":
    main()

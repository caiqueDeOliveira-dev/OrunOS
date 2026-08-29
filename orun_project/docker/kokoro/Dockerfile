# Orun OS — Kokoro TTS local (kokoro_server.py, protocolo do tts-router)
# Imagem enxuta: torch CPU (~200MB) em vez do wheel default CUDA (~2.5GB).
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir kokoro flask soundfile numpy

COPY docker/kokoro/kokoro_server.py .

EXPOSE 5004
CMD ["python", "kokoro_server.py", "--host", "0.0.0.0"]

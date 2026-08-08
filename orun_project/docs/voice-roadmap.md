# Roadmap — Sistema de Voz do Orun OS

Registro permanente do plano de melhorias do sistema de voz (curado a partir da análise
externa de ChatGPT/Gemini em 2026-08-04). Status atualizado a cada sessão para não perder
o histórico. O desktop (`orun_project`) é a base de referência; o mobile acompanha depois.

## Princípios

- Validar no banco/pipeline real sempre por scripts isolados (temp) e remover depois.
- Não matar/alterar a instância do app que estiver rodando.
- Validação final de cada fase: `npm run typecheck` + `npm test` (670 testes) em `orun_project/`.
- Dependência nova só com aprovação — usuário já aprovou Silero VAD (item 6).

## Fase 1 — Latência e confiabilidade (itens 1-6)

| # | Item | Status |
| --- | --- | --- |
| 1 | Slider `responseDelay` funcional (SettingsPanel) | ✅ concluído |
| 2 | Auto-dismiss do overlay 30s/60s | ✅ concluído |
| 3 | Fim-de-fala adaptativo (VAD proporcional à fala) | ✅ concluído |
| 4 | Barge-in sempre ativo no modo conversa | ✅ concluído |
| 5 | TTS streaming (sentence-chunking + pré-sintetização paralela) | ✅ concluído |
| 6 | Silero VAD (novo provider, fallback RMS) | ✅ concluído |

Arquivos: `src/app/voice/vad.ts`, `src/app/hooks/useVoice.ts`, `src/app/hooks/useTTS.ts`,
`src/app/components/SettingsPanel.tsx`, `src/app/components/VoiceOverlay.tsx`.

## Fase 2 — Unificação de pipeline (item 8)

| # | Item | Status |
| --- | --- | --- |
| 8 | VoiceOverlay passa a usar `useVoice` + `useChat` + `useTTS` (mesma fiação do HomeScreen), removendo `useVoiceOverlay.ts` duplicado | ✅ concluído |

Ganhos: VAD adaptativo, Groq fallback, responseDelay das settings, barge-in, conversa
contínua com histórico e comandos de voz de graça.

## Fase 3 — Comandos de voz e wake word

| # | Item | Status |
| --- | --- | --- |
| 7 | Wake word mais robusto ("OK Orun" — Porcupine/openWakeWord como alternativa ao pipeline Whisper-chunks) | ⏳ adiado: otimizações aplicadas (item 12); Porcupine exige chave paga, openWakeWord exige modelo custom treinado |
| 9 | Comandos de voz com destinos (ex.: "abra o Telegram", "manda WhatsApp para ...", "toca Spotify") | ✅ concluído (ação `open` + `extractOpenTarget` + evento `voice:open` roteado no HomeScreen) |
| 10 | Conversa contínua com histórico no overlay (vem junto com a Fase 2) | ✅ concluído (junto da Fase 2) |

## Fase 4 — Servidores

| # | Item | Status |
| --- | --- | --- |
| 11 | `stt_server.py` single-worker → threaded/paralelo (porta 8080) | ✅ concluído (`app.run(threaded=True)`) |
| 12 | `wake_word_service.py` otimizações (janela deslizante de áudio, cache) | ✅ parcial: `--chunk-duration` configurável, `SLEEP_BETWEEN_CHUNKS` 0.5→0.2, `MIN_SPEECH_DURATION` 0.4 |
| 13 | `edge_tts_server.py` streaming real por chunks (porta 5003) | ✅ concluído (generator Response + `threaded=True` + `rate`/`speed`) |

## Fase 5 — Arquitetura

| # | Item | Status |
| --- | --- | --- |
| 14 | Escutar-enquanto-fala simultâneo (full-duplex) | ✅ concluído (barge-in com hold de 250ms de fala sustentada — evita cortes por tosse/eco) |
| 15 | Daemon unificado FastAPI (STT + VAD + Wake + TTS num processo só) — maior risco, por último | ✅ concluído (daemon_server.py Flask, opt-in `voiceDaemon`, fallback gracioso) |
| 16 | Fallback chain TTS/STT refinado (ex.: kokoro) | ✅ concluído (kokoro na chain + prioridade local-first/cloud-first) |

## Como ficou a Fase 5 (implementado em 2026-08-04)

### Item 14 — Escutar-enquanto-fala (barge-in com hold)
- `useVoice.ts`: novo `sustainedInterrupt` (default true). No barge-in, `speech_start`
  inicia um hold de 250ms; se a fala do usuário persistir (sem `speech_end`), interrompe
  o TTS e grava reutilizando o stream já aberto. Tosse/eco < 250ms são ignorados.
- Setting nova em Settings > Voz: "Interrupção com Fala Sustentada".
- O mic já usa `echoCancellation: true` (getUserMedia), reduzindo auto-eco.
- Validação manual: falar por cima do Orun durante uma resposta e conferir que a fala
  chega íntegra ao chat (sem cortar por tosse).

### Item 15 — Daemon unificado (daemon_server.py, opt-in)
- `daemon_server.py`: um processo com STT (:8080), TTS edge (:5003) e wake word
  (thread própria, sinalizando via TCP :8081 — mesmo protocolo do main process).
  Reusa os módulos stt_server/edge_tts_server/wake_word_service (paridade de API),
  lazy-load por subsistema (dep ausente → 503, não derruba o daemon). Flask threaded.
- `background-services.cjs`: setting `voiceDaemon` (default off) troca os 3 subprocessos
  pelo daemon com fallback gracioso se falhar. Piper/Kokoro seguem independentes.
- Smoke test isolado (portas 8090/5093) passou: STT e TTS `/health` 200.
- Para ativar: `db.setSetting("voiceDaemon", true)` (ou via future UI) e reiniciar o app.
- Dependências: NENHUMA nova (flask/faster-whisper/edge-tts/sounddevice já usados).

### Item 16 — Fallback chain TTS/STT refinado
- `electron/ipc/media-handlers.cjs`: chain agora inclui `kokoro` (2º local) e é
  configurável via `ttsFallbackPriority`: `local-first` (edge→kokoro→piper→bark→xtts→
  f5tts→clouds) ou `cloud-first`. Cloud só é tentada quando há chave (senão skip rápido).
  Fallback vale para QUALQUER engine primária (não só cloud) — edge/kokoro fora do ar
  caem para cloud automaticamente.
- Settings > TTS: seletor "Prioridade de Fallback TTS".
- STT já refinado (renderer): local → Groq → browser.

## Decisões registradas (lições aprendidas)

- Barge-in entrega ~90% do efeito do full-duplex com ~10% do esforço — full-duplex ficou para a Fase 5.
- Daemon unificado (item 15) é o maior risco (mexe em STT/wake/TTS juntos) — só depois de validar as fases 1-4.
- O pipeline de gravação SEMPRE grava o stream RAW (não o do AudioWorklet) — Worklet dest → WebM corrompido (EBML inválido). Worklet/noise-suppression é usado SÓ para alimentar o VAD.
- Wake word atual já usa VAD adaptativo (EMA) antes do Whisper em chunks de 3s — base para o item 7.
- Comandos `open`: o `CommandMatch` agora carrega `text` (transcript completo) para o destino ser extraído do contexto inteiro, não só do verbo.
- Fase 5 foi implementada de forma aditiva e com default seguro (2026-08-04): barge-in com hold (off não muda nada), daemon opt-in via `voiceDaemon` (default off), fallback TTS com prioridade configurável (default local-first = comportamento anterior + kokoro). Nenhuma mudança ativa por padrão quebra o pipeline existente.
- Daemon (item 15) validação: smoke test isolado em portas 8090/5093; validação final deve ser um ciclo completo com o app rodando e `voiceDaemon=true`.

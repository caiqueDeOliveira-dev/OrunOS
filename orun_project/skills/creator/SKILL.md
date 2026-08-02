# Creator — Skill de Produção de Áudio e Vídeo

Produção de conteúdo audiovisual de elite: do beat ao export, tudo é criado no workspace, nunca só descrito.

## Workflow áudio

1. **Brief**: BPM, estilo (trap 140, house 128, lo-fi 85), duração (bars).
2. **Gere**: `generate_beat(bpm, style, bars)` no `creator-audio`.
3. **Edite**: `set_eq`, `add_reverb(wet_dry)`, `add_delay(ms)`, `normalize(target_db=-3)`.
4. **Tune**: `tune_to_note(note)`, `pitch_shift(semitones)`, `time_stretch(rate)`.
5. **Exporte**: `export_audio`.

## Workflow vídeo

1. `add_clip(name, duration)` → 2. organize na timeline (`get_timeline`) → 3. `set_text`, `set_transition` → 4. `export_video`.

## Regras de ouro

- "Criar beat" → **chame generate_beat imediatamente** com parâmetros adequados.
- "Gravar" → `start_recording`; "parar" → `stop_recording`; "tocar" → `play`; "pausar" → `pause`; "exportar" → `export_audio`.
- BPM comuns: trap 130-160, house 118-128, lo-fi 70-90, boom bap 80-95.
- Mixagem: deixe o loudness alvo em ~-14 LUFS (mastering) / pico seguro -3 dB (normalize).
- Sempre abra o workspace primeiro (`open_workspace`) antes de `workspace_action`.

## Checklist

- [ ] Workspace aberto antes de agir
- [ ] Beat/áudio criado no workspace (não só descrito)
- [ ] Efeitos aplicados de forma coerente com o estilo
- [ ] Export realizado quando pedido
- [ ] JSON de saída (música):
  `{"title": "...", "engine": "wondera", "genre": "...", "duration_sec": N, "status": "..."}`

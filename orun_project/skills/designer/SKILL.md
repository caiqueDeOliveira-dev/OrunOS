# Designer — Skill de Design e Identidade Visual

Produza peças de design consistentes com o design system do Orun, da ideia ao export final.

## Design System Orun

- Fundo: `#080000`
- Destaque/primário: `#C00018`
- Secundário: `#8B0000`
- Fontes: `JetBrains Mono` (código/técnico), `Inter` (UI/texto corrido)
- Estética: dark, alto contraste, vermelho como acento, tons quase pretos como base

## Workflow

1. **Briefing**: capte o objetivo da peça (post, currículo, cartão, capa), público e canal.
2. **Escolha o template**: `create_template` (resume, business-card, social-post, thumbnail...).
3. **Componha**: `add_element` (texto, imagem), ajuste posições, aplique o accent `#C00018`.
4. **Ajuste hierarquia**: `bring_forward`/`send_backward` para ordenar camadas.
5. **Exporte**: `export_design` e informe o caminho/URL de saída.

## Geração de imagem (Fooocus local primeiro)

- Prefira **Fooocus** (sem custo, local): prompt em português/inglês descritivo, com estilo, luz e composição.
- Fallback **Fal.ai** (FLUX / SD) se o Fooocus estiver fora.
- Para 3D: **Tripo** (texto→3D) / **ComfyUI**, formatos glTF/FBX/OBJ.
- Sempre refine o prompt: sujeito + ambiente + iluminação + estilo + qualidade ("highly detailed, 8k").

## Checklist de qualidade

- [ ] Segue o design system (cores/fontes corretas)
- [ ] Hierarquia visual clara (o que importa mais é maior/mais contraste)
- [ ] Espaçamento e alinhamento consistentes
- [ ] A peça é legível no formato do canal (stories 1080x1920, post 1080x1080, thumbnail 1280x720)

## Referência rápida

- Cores derivadas (no fundo escuro): use vermelho claro para hover, `#C00018` para CTA.
- JSON de saída ao gerar imagem:
  `{"engine": "fooocus|fal|tripo|comfyui", "prompt": "...", "model_used": "...", "output_url": "..."}`

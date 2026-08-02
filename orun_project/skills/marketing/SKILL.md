# Marketing — Skill de Marketing e Conteúdo Viral

De estratégia a conteúdo pronto para publicar, com copywriting de alta conversão e dados registrados no workspace Marketing.

## Frameworks de copy (escolha o que encaixa)

- **AIDA**: Atenção → Interesse → Desejo → Ação.
- **PAS**: Problema → Agitar → Solução.
- **Hook 3-3-3**: 3 palavras provocam, 3 frases explicam, 3 segundos para fisgar.

## Workflow

1. **Objetivo**: campanha/post serve para o quê (venda, engajamento, autoridade)?
2. **Público**: para quem? dor principal?
3. **Crie a peça**: copy + imagem (`generate_image` → `publish_to_social` quando aplicável).
4. **Registre**: `add_campaign` / `create_post` / `schedule_post` no workspace.
5. **Meça**: proponha KPIs e revisite com dados quando disponíveis.

## Regras de ouro

- Headline com benefício concreto, CTA com verbo de ação ("Compre", "Baixe", "Teste").
- Uma mensagem por post; menos é mais.
- Adapte formato ao canal (Stories vertical, feed quadrado, TikTok vertical curto).
- Não prometa o que o produto não entrega.

## Checklist

- [ ] Copy com hook forte + CTA claro
- [ ] Imagem coerente com a mensagem (quando gerada)
- [ ] Post/campanha registrado no workspace
- [ ] Hashtags/plataformas definidas no agendamento
- [ ] JSON de saída:
  `{"campaign_name": "...", "objective": "...", "channels": ["..."], "target_audience": "...", "kpis": ["..."]}`

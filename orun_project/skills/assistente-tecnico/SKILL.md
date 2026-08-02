# Assistente Tecnico — Skill de Eletrônica e Oficina

Gestão de assistência técnica com estoque controlado e diagnóstico fundamentado.

## Workflow

1. **Registre a OS**: `registrar_conserto(produto, problema, cliente)`.
2. **Diagnostique**: componente/sintoma → teste lógico (alimentação → sinal → saída). Pesquise o defeito típico do modelo.
3. **Atualize status**: `atualizar_status` (aguardando → diagnosticando → em_conserto → aguardando_peca → concluido → entregue).
4. **Peças**: confira estoque (`listar_pecas_faltando`), adicione peças usadas, `gerar_lista_compras` quando abaixo do mínimo.
5. **Ferramentas**: `listar_ferramentas_faltando` e sugira aquisição.

## Referência rápida (eletrônica)

- **Lei de Ohm**: `V = I × R`; potência `P = V × I`.
- **Resistores**: bandas de cor → valor (1ª, 2ª bandas = dígitos, 3ª = multiplicador, 4ª = tolerância).
- **Capacitores eletrolíticos**: verificar inchamento/vazamento = sinal de troca.
- **Ordem de checagem em "não liga"**: fonte/alimentação → fusíveis → reguladores → oscilador → saída.

## Regras de ouro

- Nunca prometa prazo sem ver a peça.
- Peça sempre quantidade mínima definida para o alerta de estoque baixo.
- Registre TUDO no workspace (`open_workspace(workspace='assistente-tecnico')` + `workspace_action`).

## Checklist

- [ ] OS registrada com produto/problema/cliente
- [ ] Diagnóstico fundamentado (não "chute")
- [ ] Peças/ferramentas atualizadas no estoque
- [ ] Lista de compras gerada quando aplicável

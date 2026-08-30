# Squad Memory: Finance Squad

## Estilo de Escrita

- Tom: objetivo, transparente, orientado a ação
- Linguagem: números claros, porcentagens, comparações MoM/YoY
- Formato: tabelas, bullet points, alertas visuais
- Tom de voz: sóbrio, construtivo, nunca alarmista

## Design Visual

- Cores: verde receita (#00A859), vermelho despesa (#E03E3E), azul investimento (#3B82F6), âmbar alerta (#F5A623)
- Gráficos: barras empilhadas, linhas de tendência, gauges de orçamento
- Cards: saldo atual, variação MoM, % orçamento usado

## Estrutura de Conteúdo

1. Snapshot matinal (saldo, contas, cartões, investimentos)
2. Transações do dia (categorizadas, valor, status)
3. Orçamentos por categoria (gasto vs limite, % usado)
4. Metas (fundo emergência, investimentos, quitação dívidas)
5. Alertas (fatura vencendo, orçamento estourado, meta atrasada)

## Proibições Explícitas

- Não dar consultoria de investimento personalizada
- Não prometer rentabilidade
- Não acessar contas bancárias diretamente (apenas leitura via integração)
- Não julgar gastos ("gasto supérfluo") — apenas reportar

## Técnico (específico do squad)

- Integração: Finance Agent (Conceição) + APIs bancárias (Open Finance) + planilhas
- Sincronização: diária 06h, manual sob demanda
- Alertas: orçamento > 80%, fatura vencendo 3d, meta < 50% no mês
- Relatórios: diário (EOD), semanal (domingo), mensal (dia 1)
- Backup: export CSV/JSON automático
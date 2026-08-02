# Finance — Skill de Finanças Pessoais

Gestão financeira por dados: todo movimento vai para o workspace Finance e toda resposta de valor termina com JSON estruturado.

## Referência rápida

- **Regra 50/30/20**: 50% necessidades, 30% lazer, 20% investimento/dívidas (referência inicial).
- **Reserva de emergência**: 3–6 meses de custo de vida.
- **Categorias**: food, transport, housing, entertainment, health, education, salary, investment, other.
- **Custo por dia**: divida gasto do mês por 30 para comparar com limite diário.

## Workflow

1. Classifique o lançamento (`add_transaction`) com descrição clara e categoria certa.
2. Confirme valores: PIX/recibo/cartão — extraia data, valor, estabelecimento e tipo.
3. Dê contexto: saldo do período, maior categoria, alerta se passou do orçamento da categoria.
4. Sugira ação prática (cortar categoria X, criar meta de reserva).

## Regras de ouro

- **Nunca** invente um lançamento; se a foto do recibo for ilegível, peça confirmação.
- Moeda padrão BRL; converta só quando explícito.
- Valores sempre com 2 casas decimais.
- JSON de saída:
  `{"description": "...", "amount": N, "currency": "BRL", "category": "...", "type": "expense|income"}`

## Checklist

- [ ] Lançamento registrado no workspace
- [ ] Categoria coerente com a natureza do gasto
- [ ] Consumo/limite informado quando aplicável
- [ ] Resposta em pt-BR, objetiva e com próximo passo

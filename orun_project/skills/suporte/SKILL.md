# Suporte — Skill de Suporte Técnico e Qualidade

Atendimento de suporte com método: colete evidência → diagnostique → registre → acompanhe até resolver.

## Workflow de atendimento

1. **Evidência**: o que aconteceu, quando, qual o comportamento esperado? (se houver print/erro, registre).
2. **Diagnóstico**: use as ferramentas (`read_file`, `run_command`, logs) para checar hipóteses antes de concluir.
3. **Solução**: mais simples primeiro (reiniciar → configurar → reinstalar).
4. **Registre**: bug com gravidade (baixa/média/alta/crítica) e status.
5. **Acompanhe**: retorne para confirmar resolução.

## Regras de ouro

- Não adivinhe: se não pode verificar, diga o que faria e peça o dado que falta.
- Classifique gravidade com critério (crítica = impede uso/risco de dado).
- Separe fato de hipótese na resposta.
- Toda solução deve incluir como verificar que funcionou.

## Engajamento de suporte (método)

- **Reproduza antes de teorizar**: "bug errado = fix errado". Só teorize depois de reproduzir o sintoma exato do usuário com os passos que ele deu — peça os passos se faltarem.
- **Verifique a alegação (triage)**: confirme o problema reproduzindo a partir dos passos do reporte antes de abrir/concluir; não aceite nem descarte por cara. Estado da issue: precisa-triagem → precisa-info → pronto-pra-agente / pronto-pra-humano / wontfix (com motivo).
- **Pergunte com questionário estruturado**: se faltar informação, faça UMA rodada de perguntas objetivas e fechadas (o quê/quando/esperado/ambiente/passos) em vez de múltiplas perguntas soltas — "grille o envio, não o assunto".
- **Re-apresente mensagens confusas**: se o pedido não chegou, re-pitch em linguagem simples e neutra ("entendi que você quer X — é isso?") antes de avançar.
- **Escalacione com handoff compacto**: ao passar para outro agente/humano, entregue um resumo do que foi feito + o que falta + "skills sugeridas" para o próximo — não recontar a conversa toda.
- **Guie passos manuais (wizard)**: para ações que exigem a mão do usuário (credenciais, painel, reinstalação), dê um passo de cada vez com o resultado esperado de cada um — nunca despeje 10 passos de uma vez.

## Checklist

- [ ] Detalhes coletados (o quê/quando/esperado)
- [ ] Diagnóstico com evidência (não chute)
- [ ] Bug registrado com gravidade
- [ ] Passos de verificação fornecidos
- [ ] Acompanhamento até o fechamento

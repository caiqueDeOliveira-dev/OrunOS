# Automation — Skill de Automações e Integrações

Automações de elite são: acionadas por gatilho claro, com condição explícita, tratamento de erro e retry. Construa no workspace Automation (`open_workspace(workspace='automation-flow')`).

## Workflow

1. **Gatilho**: o que dispara? (evento, horário, webhook, mensagem, arquivo).
2. **Condição**: o que precisa ser verdade para seguir?
3. **Ações**: ordene e defina o dado que flui entre nós.
4. **Erro**: o que acontece se uma ação falhar? (retry, notificação, fila).
5. **Registre**: `add_node`/`add_edge` no fluxo e valide com `simulate`.

## Padrões prontos

- **Rota de mensagem**: recebe mensagem → identifica assunto → encaminha ao agente certo (trigger_agent).
- **Webhook → ação**: recebe payload JSON → valida → cria tarefa/notifica.
- **Agendado**: horário fixo → puxa dados → gera relatório → envia.

## Regras de ouro

- Nunca exponha credenciais dentro do fluxo; use referências a config segura.
- Toda automação que altera dados deve ter verificação/dry-run quando possível.
- Documente cada fluxo (objetivo) para ser mantível.

## Checklist

- [ ] Gatilho, condição e ações explícitos
- [ ] Erro e retry definidos
- [ ] Fluxo salvo no workspace (`save_flow`)
- [ ] Resposta em pt-BR com resumo do desenho

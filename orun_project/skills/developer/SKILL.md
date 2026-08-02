# Developer — Skill de Engenharia de Software

Workflow de engenharia de elite: planejar → implementar → verificar → revisar. Use SEMPRE o Developer IDE (`workspace_action(workspace='developer', ...)`) para que o código apareça no Explorer e os comandos no Terminal.

## Workflow

1. **Entenda**: leia o arquivo/contexto antes de editar. `list_files` + `read_file`.
2. **Planeje**: 1-2 frases do que vai mudar e quais arquivos. Para tarefas > 1 arquivo, liste os passos.
3. **Implemente**: `write_file`/`edit_file`. Código mínimo, seguindo as convenções do projeto.
4. **Verifique**: `execute_command` com o comando de checagem correto (typecheck/lint/teste) e corrija até passar.
5. **Feche**: resposta curta (1-3 linhas): o que criou, onde, resultado.

## Regras de ouro

- **Nunca** escreva código só no chat — tudo no IDE.
- **Nunca** escreva fora do workspace do Developer (raiz = a pasta que o usuário chama de "hello").
- **Não** adicione comentários óbvios; código deve se auto-explicar.
- **Nunca** deixe segredos/keys no código. Use env vars.
- Se um comando falhar, leia o erro e tente de novo — não desista na primeira tentativa.

## Checklist de qualidade

- [ ] Typecheck/lint passou (comando do projeto)
- [ ] Sem código morto, imports não usados ou logs de debug
- [ ] Tratou edge cases (entrada vazia, erro de rede, arquivo inexistente)
- [ ] Segue o padrão do restante do código (estilo, libs já usadas)
- [ ] Não escreveu arquivos fora do workspace sem permissão

## Referência rápida

- JS/TS: `node --check <file>` para sintaxe; `tsc --noEmit` para tipos.
- Python: `python -m py_compile <file>` para sintaxe.
- JSON: sempre `JSON.parse`/`JSON.stringify` com try/catch.
- Regex de saída (revisão de código) — finalize com:
  `{"repo": "...", "file_path": "...", "summary": "...", "issues_found": N, "severity": "low|medium|high|critical"}`

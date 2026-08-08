# Developer — Skill de Engenharia de Software (Elite)

Workflow de engenharia de elite: entender → planejar → implementar → verificar → revisar → versionar. Use SEMPRE o Developer IDE (`workspace_action(workspace='developer', ...)`) para que o código apareça no Explorer e os comandos no Terminal. Ferramentas nativas de Developer Elite disponíveis: `git_status`, `git_log`, `git_diff`, `git_stash`, `git_remote`, `gh_pr`, `semgrep_scan`, `library_docs`, `run_tests`, `code_review`.

## Workflow

1. **Entenda**: leia o arquivo/contexto antes de editar. `list_files` + `read_file`. Para projeto desconhecido, primeiro `git_log` para ver a história e `git_status` para ver o estado atual.
2. **Planeje**: 1-2 frases do que vai mudar e quais arquivos. Para tarefas > 1 arquivo, liste os passos.
3. **Implemente**: `write_file`/`edit_file`. Código mínimo, seguindo as convenções do projeto.
4. **Verifique**: `execute_command` com o comando de checagem correto (typecheck/lint/teste) e corrija até passar. Para segurança: `semgrep_scan` antes de entregar.
5. **Revise**: `git_diff` (diff das mudanças) e revise criticamente o que escreveu.
6. **Feche**: resposta curta (1-3 linhas): o que criou, onde, resultado.

## Regras de ouro

- **Nunca** escreva código só no chat — tudo no IDE.
- **Nunca** escreva fora do workspace do Developer (raiz = a pasta que o usuário chama de "hello").
- **Não** adicione comentários óbvios; código deve se auto-explicar.
- **Nunca** deixe segredos/keys no código. Use env vars.
- Se um comando falhar, leia o erro e tente de novo — não desista na primeira tentativa.

## Git Intelligence (workflow elite)

Antes de qualquer mudança, entenda o estado do repo:

1. `git_status` → branch atual + arquivos modificados/adicionados/removidos/untracked.
2. `git_log` → commits recentes (padrão de mensagens, escopo do trabalho atual).
3. `git_diff` → o que já foi alterado (use `path` para focar num arquivo).
4. `git_stash action="list"` → stashes existentes.

Ao terminar uma entrega:

- Verifique o diff final com `git_diff` (e `git_diff stat=true` para o resumo).
- Se o usuário pedir para versionar, avise que `git_status` mostra o estado e sugira o comando de commit no Terminal (o agente não faz commit sem o usuário pedir).
- Use `git_stash action="push" message="..."` para guardar trabalho em andamento antes de experimentar; `git_stash action="pop"` para restaurar.

**Remotes e PRs (GitHub)**:

- `git_remote` → lista os remotes do repo (nome, URL, fetch/push). Use antes de operações que dependem de origem (PRs, fetch, push).
- `gh_pr action="list"` → PRs abertos do repo.
- `gh_pr action="view" number=N` → detalhe de um PR específico.
- `gh_pr action="create" base="main" title="..." body="..."` → cria PR (precisa de gh instalado e autenticado; o agente prepara o conteúdo e informa o usuário antes de criar).
- Se `gh` não estiver instalado/autenticado, o erro orientativo indica como resolver (`gh auth login`).

## Code Review (workflow elite)

Quando o usuário pedir revisão de código (próprio ou de outro agente):

1. `code_review` → bundle único com os arquivos alterados, o diff e (se `includeSemgrep=true`) o scan de segurança. Se preferir granular, `git_diff` para as mudanças recentes (ou `read_file` do arquivo alvo).
2. Analise: correção, segurança, edge cases, convenções do projeto, código morto.
3. Finalize SEMPRE com o JSON de revisão:
   `{"repo": "...", "file_path": "...", "summary": "...", "issues_found": N, "severity": "low|medium|high|critical"}`
4. Cite linhas concretas (`file:linha`) em vez de elogios genéricos.

## Test Generator (workflow elite)

Quando o usuário pedir testes (ou a tarefa envolver lógica nova):

1. Identifique o framework do projeto (`package.json` — vitest/jest/pytest) e como os testes rodam (`npm test`, `npm run test`).
2. Crie o arquivo de teste ao lado do código (padrão do projeto, ex.: `__tests__/*.test.cjs`).
3. Cubra: caminho feliz, edge cases (entrada vazia, erro de rede, arquivo inexistente), e os casos que o código trata.
4. Rode `run_tests` e **repita até passar** — nunca entregue teste vermelho. `run_tests` auto-detecta o framework (vitest/jest/mocha/npm test/pytest/go/cargo); use `file="<caminho>"` para rodar um único arquivo e iterar rápido.
5. Feche com o resultado do comando de teste (passado/falhas).

## Refactor (workflow elite)

Quando o usuário pedir refatoração:

1. `git_stash action="push"` se houver trabalho em andamento (não misturar).
2. Faça mudanças **pequenas e incrementais**, preservando comportamento.
3. Após cada passo, rode o teste/typecheck — não acumule quebras.
4. `git_diff` antes de finalizar para conferir que nada foi perdido.
5. Se o refactor mudar assinaturas públicas, atualize os callers (use `search_content`).

## Semgrep (segurança dev-time)

Para código novo ou revisão, `semgrep_scan` busca problemas de segurança/vazamentos antes de entregar (ex.: injeção, credenciais hardcoded, código inseguro). Usa por default o ruleset bundlado do Developer Elite (`electron/developer-semgrep-rules.yml`); passe `config` para rulesets adicionais. Se `semgrep` não estiver instalado, instale com `pip install semgrep` ou ignore e prossiga — o agente continua a verificação manual.

## Docs de bibliotecas (Context7)

Para usar uma lib sem conhecer a API atual:

1. `library_docs libraryName="<lib>" query="<o que quero fazer>"` → resolve a lib e devolve um `libraryId`.
2. `library_docs libraryId="<id>" query="<pergunta específica>"` → snippets de documentação atuais.

**Context7 via MCP (opcional)**: para usar como servidor MCP (tools expostas no loop, não via `library_docs`), adicione em Settings → MCP a entrada: `{ name: "context7", command: "npx", args: ["-y", "@upstash/context7-mcp"] }`. O app auto-carrega servidores persistidos em `mcpServers` no startup (`main.cjs:1442`) e funde as tools no autonomous loop (`autonomous-loop.cjs:106`).

## Checklist de qualidade

- [ ] Typecheck/lint passou (comando do projeto)
- [ ] Testes relevantes passaram (`npm test` / comando do projeto)
- [ ] Sem código morto, imports não usados ou logs de debug
- [ ] Tratou edge cases (entrada vazia, erro de rede, arquivo inexistente)
- [ ] Segue o padrão do restante do código (estilo, libs já usadas)
- [ ] Não escreveu arquivos fora do workspace sem permissão
- [ ] Revisou o diff antes de fechar (`git_diff`)
- [ ] Sem segredos/keys no código

## Referência rápida

- JS/TS: `node --check <file>` para sintaxe; `tsc --noEmit` para tipos.
- Python: `python -m py_compile <file>` para sintaxe.
- JSON: sempre `JSON.parse`/`JSON.stringify` com try/catch.
- Git: `git_status` → estado; `git_log` → histórico; `git_diff` → mudanças; `git_stash` → guardar/restaurar; `git_remote`/`gh_pr` → remotes e PRs; `code_review` → bundle de revisão (diff + semgrep + arquivos).
- Testes: `run_tests` → roda a suíte (auto-detecta vitest/jest/mocha/npm/pytest/go/cargo) e devolve passado/falhas.
- Regex de saída (revisão de código) — finalize com:
  `{"repo": "...", "file_path": "...", "summary": "...", "issues_found": N, "severity": "low|medium|high|critical"}`

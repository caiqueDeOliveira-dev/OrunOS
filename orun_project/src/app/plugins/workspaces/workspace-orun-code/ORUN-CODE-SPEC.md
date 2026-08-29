# ORUN CODE — Product Specification v1.1

> **Visão**: O Orun Code não é "uma IA que programa". É o **ambiente de engenharia de software inteligente do Orun OS** — uma mistura conceitual de VS Code + Cursor + Cline + Roo Code + Cody + Aider + OpenHands, com arquitetura própria.
> **Fluxo central**: entender → pesquisar → planejar → implementar → testar → revisar → otimizar → documentar.
> **Identidade**: dark-first, extremamente limpa, vermelho reservado para ações/estado ativo, lobo discreto. Nada de visual "IA futurista genérica".
> **Consolidação (v0.2.0)**: Orun Code é agora o **único** workspace de IDE do Orun OS — o antigo workspace **Developer** foi absorvido (remoção do plugin e das pastas `workspace-developer-ide`/`workspace-finance-ledger`). A ponte real de arquivos/terminal/segurança do Developer (`developer-actions`) foi portada para `actions.ts`.

---

## Fases de desenvolvimento

| Fase | Nome | Conteúdo | Status |
| --- | --- | --- | --- |
| 1 | IDE | Activity Bar, Explorer, CodeEditor, Terminal, minmapa, status bar, tabs, busca | ✅ Implementado (v0.1.0) |
| 2 | Orun AI | Chat, Contexto, Plan, Changes, Review, modes Plan/Act, approval | ✅ Parcial (UI + ponte real de ações) |
| 3 | Intelligence | AST, LSP, busca semântica, code graph, memória do projeto | ⏳ Próxima |
| 4 | Agents | Architect, Planner, Coder, Debugger, Tester, Reviewer | ⏳ |
| 5 | Autonomous Engineering | multi-agent, task board, worktrees, checkpoints, rollback | ⏳ |
| 6 | Professional Engineering | Security Center, Performance, dependências, CI/CD, browser, MCP marketplace, health | ⏳ |
| 7 | Orun Ecosystem | integração com Orun Music, Financial, Health, etc. via MCP | ⏳ |

---

## Palette (design tokens)

Base do IDE — dark, editor-first:

| Token | Hex |
| --- | --- |
| `--oc-bg` | `#0B0D10` |
| `--oc-panel` | `#0E1013` |
| `--oc-card` | `#101318` |
| `--oc-card2` | `#151920` |
| `--oc-card3` | `#1A1F27` |
| `--oc-border` | `#20252D` |
| `--oc-border-hi` | `#292F38` |
| `--oc-text` | `#F2F4F7` |
| `--oc-sub` | `#A7ADB7` |
| `--oc-dim` | `#6E7580` |
| `--oc-primary` / bright / dark | `#E50914` / `#FF3340` / `#8F050D` |
| `--oc-success` / alert / error / info | `#22C55E` / `#F59E0B` / `#EF4444` / `#4DA3FF` |

Fontes: **Inter** (sans) + **JetBrains Mono** (código).

---

## Workspace — Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ORUN CODE        Project: Orun OS       main ●       🔍     ⚙          │
├────┬───────────────┬─────────────────────────────────┬──────────────────┤
│ 🗂 │  SIDEBAR      │                                 │ ORUN AI           │
│ 🔎 │  Explorer     │       CODE EDITOR               │  Chat             │
│ 🌳 │  Search       │    (abas + minimapa)            │  Context          │
│ 🧠 │  Git          │                                 │  Plan             │
│ 🤖 │  Intelligence │                                 │  Changes          │
│ 🧪 │  Agents       │                                 │  Review           │
│ 🛡 │  ...          │                                 │  [Plan|Act]       │
│ ▶  │               │                                 │                  │
│ ⚙  │               │                                 │                  │
├────┴───────────────┴─────────────────────────────────┴──────────────────┤
│ TERMINAL │ PROBLEMS │ OUTPUT │ TESTS │ GIT │ AGENT LOG │ MCP            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Módulos (visão completa)

### Activity Bar
Explorer, Search, Source Control, **Intelligence**, **Agents**, Testing, Security, Dependencies, MCP, Settings + toggle Orun AI + toggle painéis inferiores.

### Orun AI panel (segundo cérebro)
- **Chat** — conversa com o agente.
- **Context** — contexto da codebase (AST, grafos, git, memória, `@`-mentions).
- **Plan** — plano de implementação numerado.
- **Changes** — diff de mudanças (create/edit/delete/rename + status).
- **Review** — code review gerado (severidade por arquivo/linha).
- **Modes**: `Plan` (lê/propõe, não altera) vs `Act` (executa/edita). Pill colorida na barra e na status bar.

### Painel inferior
Terminal, Problems, Output, Tests, Git, Agent Log, MCP (servers + tools + connect).

### Painéis lateral
- **Intelligence**: Project Health (Architecture/Code Health/Security/Test Coverage/Documentation/Technical Debt), Architecture Map, Call/Dependency/Symbol Graphs.
- **Agents**: pipeline Architect→Planner→Coder→Debugger→Tester→Reviewer→Security→Documenter, com status (idle/working/done/waiting) + "Executar Pipeline Completo".

---

## Funções futuras (Fase 4+)

- **Intelligence Engine**: AST, LSP, embeddings, dependency/call/symbol/import/API graph, histórico Git, padrões e arquitetura detectada automaticamente.
- **Git Intelligence**: status, diff visual, commits automáticos opcionais, branch management, rollback/checkpoint, changelog automático, PR, commit message inteligente, análise de regressão.
- **Approval Center**: 🟢 SAFE (auto: ler/pesquisar/analisar/planos/testes seguros) · 🟡 ASK (pedir: modificar arquivos, instalar deps, comandos, commits) · 🔴 BLOCK (sempre exigir: apagar projeto, destrutivos, secrets, produção/deploy).
- **Test Lab** / **Security Center** (com auto-remediate) / **Dependency Center** / **Browser Lab** / **Project Health**.
- **MCP Control Center** — ferramentas/recursos/prompts/permissões/logs.
- **Task Board** multi-agente (Backlog→Todo→Doing→Review→Done).
- **Memória do projeto**: `.orun/memory/`, `.orun/rules/`, `.orun/agents/`, `.orun/tasks/`, `.orun/plans/`, `.orun/snapshots/`, `.orun/intelligence/`.

---

## Arquivos da implementação atual

Local: `src/app/plugins/workspaces/workspace-orun-code/`

| Arquivo | Papel |
| --- | --- |
| `index.ts` | Registro do plugin (`OrunCode`) |
| `OrunCode.tsx` | Layout principal (activity bar + sidebar + editor + painel Orun AI + bottom) |
| `orun-code.tsx` | Tokens de cor, CSS vars, `OCRoot`, modes Plan/Act |
| `types.ts` | Tipos do estado + helpers (lang, highlight, format bytes) |
| `store.ts` | `createStore` com persistência localStorage |
| `actions.ts` | Ponte real herdada do Developer: read/write/list/delete/rename/search de arquivos, execute_command (terminal), analyze_security (via `window.orun.developer` / `/api/developer`), workspace_info |
| `components/ActivityBar.tsx` | Barra de ícones estendida + logo OC |
| `components/FileExplorer.tsx` | Explorer de arquivos |
| `components/SearchPanel.tsx` | Busca |
| `components/GitPanel.tsx` | Source Control + Git Intelligence |
| `components/IntelligencePanel.tsx` | Project Health + Architecture Map + grafos |
| `components/AgentsPanel.tsx` | Agent Center (pipeline) |
| `components/OrunAIPanel.tsx` | Painel Chat/Context/Plan/Changes/Review + modes |
| `components/BottomPanel.tsx` | Terminal/Problems/Output/Tests/Git/Agent Log/MCP |
| `components/CodeEditor.tsx` | Editor com abas, edição, salvar, highlight |
| `components/Minimap.tsx` | Minimapa |
| `components/StatusBar.tsx` | Status bar com indicador de mode |

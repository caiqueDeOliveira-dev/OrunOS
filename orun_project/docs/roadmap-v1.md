# Roadmap Orun OS v1.0 — Da coleção de agentes à plataforma

Registro permanente curado em 2026-08-04 a partir da proposta de roadmap do ChatGPT
(15 módulos). Aqui a proposta foi **filtrada pela realidade do codebase**: o que vale a pena,
o que NÃO vale, a ordem correta e como cada módulo reusa o que já existe. O desktop
(`orun_project`) é a base de referência; o mobile acompanha depois via Supabase compartilhado.

## Princípios (regras de ouro)

1. **Plataforma = contrato de extensão + memória compartilhada + orquestrador.** Módulo novo
   que não reforça esses 3 pilares é feature, não arquitetura.
2. **Tudo novo entra como skill** no contrato de extensão (formalização do `PLUGIN_MAP`),
   nunca como tela acoplada no `HomeScreen.tsx` monolítico.
3. **Mobile herda de graça**: qualquer estado novo vive no Supabase compartilhado
   (`memories`, `commands`, `usage_events`, etc.). Se o mobile não herdou, é sinal de que
   a feature foi construída do jeito errado.
4. **Validação real sempre via scripts isolados (temp)**, depois removidos. Não matar a
   instância do app que estiver rodando.
5. Validação final de cada módulo: `npm run typecheck` + `npm test` em `orun_project/`.

## Módulo 0 — Estabilidade (faz parte de todo sprint, não é fase isolada)

O ChatGPT não citou isto; é a fundação da plataforma.

- 81 erros de lint pré-existentes; `electron/*.cjs` fora do lint (adicionar ao eslint).
- `HomeScreen.tsx` com 500+ linhas: quebrar em componentes/hooks à medida que novos módulos tocarem nele.
- IPC do main process com pouca cobertura de teste (renderer tem 679 testes).
- Definir `CommandMatch`/tipos compartilhados num pacote comum (desktop↔core↔mobile).

## Módulo 1 — Skill Manager (contrato de extensão) ⭐ PRIORIDADE MÁXIMA

**Por que primeiro:** o workspace já é plugin-based (`PLUGIN_MAP`, `workspace-actions`).
Formalizar isso num contrato de skill é a fundação de todos os "Elite" e do marketplace.

- Registro de skills + metadados (nome, versão, autor, permissões, dependências, compatibilidade).
- Loader inteligente (carregar/descarregar sob demanda, cache).
- Permissões declaradas por skill (leitura de arquivo, rede, voz, etc.) — igual `permissions` do opencode.
- Instalar/atualizar/desinstalar (origem: pasta local primeiro; marketplace depois).

*O que NÃO fazer agora:* assinatura digital, score de qualidade, benchmark de skills, marketplace
online — isso é fase 2 do módulo, só depois do contrato local funcionar.

### Status (atualizado em 2026-08-04 — contrato v1 implementado)

Backend do contrato pronto e testado (736 testes):

- `electron/skill-manager.cjs` — registry novo:
  - **Manifest v1** validado: `id`, `name`, `version` (semver), `author`, `description`,
    `entry`, `permissions[]` (whitelist `KNOWN_PERMISSIONS`), `dependencies` (`{skillId: range}`),
    `compat` (`minOrun`/`platforms`). Desconhecido em permission → warning; manifest inválido bloqueia.
  - **Semver**: `compareSemver` + `satisfiesRange` (`*`, `x`, `1.2`, `^`, `~`, `>= <`, ranges AND).
  - **Dependências**: `resolveLoadOrder()` topológico — detecta ciclo, dep ausente, dep desabilitada,
    versão fora da faixa. `details()` reporta estado por dependência.
  - **Lifecycle**: `installFromDir` (pasta local, `force` para substituir), `uninstall`,
    `setEnabled` (marker `.disabled`), `list()` enriquecido, `reload()` (descarga + carga na ordem),
    `surfaceTools()`/`executeTool()` com gate de enabled + manifest válido.
  - Proteção de path traversal em `_skillDir`.
- `electron/plugin-system.cjs` — runtime ganhou `unloadAll()` e `isLoaded()` (sem quebra: mesmas exports).
- `electron/ipc/skill-handlers.cjs` — handlers `skills:list/details/install/install-dialog/uninstall/
  set-enabled/reload/tools/dir/open-dir`, registrados no `main.cjs` (ctx `skillManager`).
- `electron/preload.cjs` + `src/types/orun.d.ts` + `src/test/setup.ts` — API `window.orun.skills` exposta/tipada/mockada.
- Testes: `electron/__tests__/skill-manager.test.cjs` (33 testes: validação, semver, lifecycle, runtime).

Falta (próxima iteração do módulo): UI de gerenciamento (listar/instalar/habilitar por workspace ou
Settings), plugar `surfaceTools()` no router do agente (hoje só o `autonomous-loop` usa tools de plugin),
e o contrato por-agente (skills → agentes).

## Módulo 2 — Memory Engine (substrato compartilhado) ⭐

**Por que:** é o "cérebro de longo prazo". O `memories` no Supabase já existe; falta a parte
semântica e a consolidação.

- pgvector no Supabase (coluna `embedding`) + busca semântica nas memórias.
- Injetar memória relevante no prompt do chat (melhora imediata do `useChat`).
- Consolidação automática: cron que resume conversas do dia → memória de longo prazo.
- Escopos: por agente, por projeto, por usuário (colunas de scope na tabela).
- Esquecimento inteligente (TTL/dedupe) — depois.

*O que NÃO fazer agora:* Mem0/Graphiti/Neo4j/LightRAG. São dependências pesadas; o valor
delas (grafo + vetores) chega com pgvector + uma tabela de relações. Se precisar de grafo
real no futuro, Graphiti é o candidato — mas só quando houver caso de uso concreto.

### Status (atualizado em 2026-08-04 — core local-first implementado, 736 testes)

- `electron/memory-engine.cjs` — engine novo (local-first, JSON no userData):
  - **Escopos** por agente (`scopeAgent`) e projeto (`scopeProject`); memórias globais (sem
    escopo) aparecem em qualquer escopo, memórias escopadas só no seu.
  - **Upsert por chave composta** (`scopeAgent::scopeProject::key`), dedup de conteúdo
    idêntico, `created_at` preservado em updates.
  - **Embeddings** via `embed()` injetado (desktop usa `rag.getEmbedding`, nomic-embed-text);
    busca **cosine** com fallback textual quando o embedder está offline.
  - **Injeção no prompt**: `injectForPrompt()` gera o bloco `<memorias_relevantes>` para
    append no system prompt.
  - **Consolidação**: `consolidate()` resume memórias maduras (>24h) por escopo em um fato
    de longo prazo (`tags: ["long-term","consolidation"]`), sem apagar as originais.
  - **Esquecimento**: `remove()` (forget mecanicista) + espelho opcional na nuvem.
- `electron/memory-supabase.cjs` — cloud adapter **offline-first**: capability check cacheado
  (precisa de `DATABASE_URL` + coluna `embedding` + `user_id` nullable). Até a migration 0008
  ser aplicada, roda 100% local sem erros.
- `electron/ipc/memory-handlers.cjs` — handlers `memory:save/search/inject/consolidate/
  remove/stats`; `electron/preload.cjs` + `src/types/orun.d.ts` + `src/test/setup.ts` —
  API `window.orun.memory` exposta/tipada/mockada.
- **Injeção ativa no chat**: `ai:chat` e `ai:chat-stream` (`ipc/ai-handlers.cjs`) consultam
  memória do agente (última mensagem do usuário) e anexam o bloco ao system prompt.
- `main.cjs`: `memoryEngine` inicializado no startup (embed=rag, cloud=memory-supabase,
  summarize=aiRouter) e exposto no ctx via **getter** (mesmo padrão fixado para `skillManager`
  — corrige a ordem de init do registro de IPC).
- Migration **`0008_memory_engine.sql`** adicionada no monorepo (`supabase-sync/.../migrations`) e
  **aplicada ao banco real** (pg + `DIRECT_URL`, script temp removido): pgvector 0.8.2, `user_id`
  nullable, colunas `device_id/scope_agent/scope_project/source/embedding vector(768)`, índice HNSW
  e função `match_memories()` — **espelho local→Supabase validado de ponta a ponta** (save com
  embedding → row no banco → soft-delete; registro de teste limpo).
- Fixes encontrados na validação real: cert self-signed do Supabase (adapter usa
  `rejectUnauthorized: false`), `id` composto local não é UUID → `uid` (uuid, estável entre updates)
  usado como PK da nuvem, e vetor enviado no formato `[0.1,0.2,...]` (o `pg` serializava com aspas e
  o pgvector rejeitava).
- Testes: `electron/__tests__/memory-engine.test.cjs` (26 testes: id composto, `uid` uuid, cosine,
  dedup, busca textual/semântica, escopo, injeção, consolidação, remove, stats, espelho cloud).

Falta (próxima iteração do módulo): usar `match_memories()` no ai-relay do mobile (mobile herda a
memória do desktop de graça); agendar a consolidação automática (cron diário); TTL/decay de
relevância (access_count); UI de memória (listar/pesquisar/esquecer) no desktop.

## Módulo 3 — Knowledge Engine (Obsidian NÃO é a base) ⚠️ ajuste

A proposta original inverte a prioridade. O `docs/obsidian-integration.md` já registra que
Obsidian está adiado porque o usuário **não usa Obsidian**. Correção:

- Fonte de verdade = Supabase (`memories` + tabela `documents` se precisar).
- Knowledge Engine = hub de docs auto-gerados: changelog, roadmap, ADR, diário — gerados a
  partir de `git log` + decisões das sessões (o `voice-roadmap.md` e o `AGENTS.md` já são
  esse padrão, feitos na mão).
- Obsidian = **sync/export opcional** quando o usuário adotar PKM (skill `obsidian-skills` do
  kepano já mapeada no doc). Nunca storage primário.

### Status (atualizado em 2026-08-04 — implementado e validado)

- `electron/knowledge-engine.cjs` — hub de docs auto-gerados (local-first JSON no userData +
  espelho cloud): changelog (via `git log`), diário (commits + memórias + resumo LLM opcional),
  ADR estruturado, note. `makeId(kind,title,date)` = upsert por identidade composta; `uid` uuid
  como PK do Supabase.
- `electron/knowledge-supabase.cjs` — adapter offline-first (capability check, upsert
  `ON CONFLICT (id)`, soft delete com `deleted_at`, `device_id = NULL`).
- IPC `knowledge:*` + `preload` + tipos `KnowledgeDoc*` + mock; `knowledgeSummarize` (diário via
  LLM) no `main.cjs`.
- Migration **`0009_knowledge_engine.sql`** (tabela `documents`) criada e **aplicada ao banco real**
  (via DIRECT_URL) — adapters M2/M3/M4 validados de ponta a ponta no Supabase.
- Testes: `electron/__tests__/knowledge-engine.test.cjs` (13 testes).

## Módulo 4 — Planner Engine (orquestrador) ⭐

**Por que:** dá a sensação de autonomia e compõe com a voz pronta.

- Tabela `commands` + n8n já existem: o planner roteia subtarefas para agentes ou webhooks n8n.
- Objetivo → plano → subtarefas → prioridades → execução → revisão (loop simples, serial).
- Estado persistido no Supabase (planner/tasks) → mobile enxerga.
- Voz como input: "ok orun, organiza minha semana" → planner.

*O que NÃO fazer agora:* GTD completo, Kanban visual, scheduler com dependências, roadmaps
automáticos. Começar com um `Task` (title, agent, status, priority, dependencies) serial.

### Status (atualizado em 2026-08-04 — implementado e validado)

- `electron/planner-engine.cjs` — orquestrador serial (local-first JSON + espelho cloud):
  `createTask`/`listTasks`/`getTask`/`updateTask`/`executeNext` (serial)/`runGoal` (loop com
  guard)/`plan` (LLM → subtarefas com dependências por índice)/`review`/`stats`/`nextReady`/
  `isGoalDone`; `STATUS` exportado; `plan`/`executeTask`/`review` injetáveis para testes.
- `electron/planner-supabase.cjs` — adapter offline-first da tabela `planner_tasks`.
- IPC `planner:*` + `preload` + tipos `PlannerTask`/`PlannerReview` + mock; `plannerPlan`
  (LLM → JSON com `parsePlanJson` robusto a markdown) e `plannerExecute` (roteia para o agente via
  `agentPrompts.promptFor` ou IA central) no `main.cjs`.
- Migration **`0010_planner_engine.sql`** (tabela `planner_tasks`) criada e **aplicada ao banco real**.
- **UI `PlannerPanel.tsx`**: objetivo → "Planejar" (LLM) → lista de tarefas com status/prioridade/
  agente/dependências/resultado/erro + ações "Próxima"/"Executar tudo"/"Revisar". Item "Planner"
  na Sidebar, rota de voz, `plannerOpen` no hook.
- Testes: `electron/__tests__/planner-engine.test.cjs` (13 testes).

## Módulo 5 — Agent Hub (colaboração)

Começar pelo que dá mais valor com menos complexidade:

- Compartilhar memória (vem de graça do Módulo 2 — escopo por agente).
- Compartilhar ferramentas (vem de graça do Módulo 1 — skills como ferramentas).
- **Delegação serial**: Central decide → especialista executa → resultado volta. 80% do valor.
- Um schema único de agente: `(persona, ferramentas, escopo de memória, permissões)` — os 17
  agentes seedados viram instâncias desse schema.

*O que NÃO fazer agora:* comunicação em tempo real entre agentes, paralelismo, load balancing,
supervisor com fila. Excessos.

### Status (atualizado em 2026-08-04 — implementado e validado)

- `electron/agent-hub.cjs` — engine puro e testável:
  - **Schema único de agente** `(persona, ferramentas, escopo de memória, permissões)`:
    `buildAgentRegistry()` no `main.cjs` deriva as 16 instâncias do `DEFAULT_PROMPTS` +
    `AGENT_TOOL_PERMISSIONS`. `listSchemas()`/`getSchema(id)`/`listNames()`.
  - **Delegação serial**: `delegate()` = Central decide (route LLM, prompt Hampton) → especialista
    executa (persona do agente via `promptFor`) → escalação (central assume) se falhar. Retorna
    trace dos passos (`route`/`execute`/`escalate`) para a UI. `route`/`execute`/`escalate`
    injetáveis; `agentHint` faz delegação direta.
- IPC `agent-hub:*` (list/get/route/delegate) + `preload` + tipos `AgentSchema`/`DelegationResult`
  + mock. `hubRoute`/`hubExecute`/`hubEscalate` no `main.cjs` (via `aiRouter` + `resolveAISettings`).
- **UI `AgentHubPanel.tsx`**: painel com delegação serial (request → central → especialista →
  resultado com trace passo a passo, seletor de especialista opcional) + grid do schema dos 16
  agentes (persona preview, tools, memória, permissões). Item "Agent Hub" na Sidebar, rota de voz,
  `agentHubOpen` no hook.
- Testes: `electron/__tests__/agent-hub.test.cjs` (13 testes: schema, roteamento, hint, escalação).
- Verificação: typecheck ✓, npm test ✓ 785 passando (era 772).

## Módulo 6 — Analytics / Dashboard

**Por que:** é o menor esforço da lista (20%) com maior percepção de valor (80%). O app JÁ
loga `usage_events`, `health_log`, `finance_log`, `marketing_log`.

- Painel que soma o que já existe: uso de skills, saúde dos agentes, histórico de tarefas, erros.
- Métricas de sistema (CPU/RAM/GPU/Disco) via IPC novo, barato no Electron.

**Status (atualizado em 2026-08-05): COMPLETO.**

- `electron/analytics.cjs` (novo): agrega o que o app JÁ loga — novo log persistente `app_events`
  (evento por ação relevante: chat IA, planner, agent hub, skills, knowledge), contagens das tabelas
  de domínio (`conversations`, `messages`, `finance_log`, `health_log`, `marketing_log`, `daily_agenda`),
  uso agregado de IA (`usage`: requests/tokens), telemetria in-memory (`ai:telemetry`) e stats dos
  engines (planner/memory/knowledge/skills). Métricas de sistema reais (CPU/RAM/disco/uptime) via
  `os` + `fs.statfsSync` — **sem `Math.random()`**; `systemStats`/getters injetáveis para teste.
- Tabela local `app_events` (SQLite) + espelho cloud via `sync_outbox` (adicionada em `SYNC_TABLES`).
  Migration **`0011_app_events.sql`** no monorepo (nome NÃO colide com `usage_events`, que é a tabela
  de custo por provider do schema 0001) — **aplicada ao banco real** (colunas uuid/user_id/device_id/
  type/agent/detail/created_at + indexes) e **upsert cloud validado** com o shape do push.
- IPC: `analytics:summary` / `analytics:system` / `analytics:event` + preload + tipos + mock.
- Instrumentação: `ai:chat`, `ai:chat-stream`, `planner:*`, `agent-hub:delegate` (com escalação),
  `skills:install`, `knowledge:save` logam `app_events`.
- UI `AnalyticsPanel.tsx`: gauges de CPU/RAM/disco, uso de IA, eventos hoje/total, registros de
  domínio, stats dos engines, contadores de telemetria. `DashboardWidgets.tsx` agora usa métricas
  reais (fallback ao antigo randômico quando sem API). Item "Analytics" na Sidebar, rota de voz
  (`analytics`), `analyticsOpen` no hook (também completou as rotas de voz `planner`/`agentHub`).
- Testes: `electron/__tests__/analytics.test.cjs` (10 testes, fake db em memória — better-sqlite3 é
  ABI Electron e não roda no Node do vitest) + testes de voz para as novas rotas.
- Verificação: typecheck ✓, npm test ✓ 796 passando (era 785).

## Módulo 7 — Elites como skills (sob demanda)

Depois da base, cada "Elite" vira um pacote de skills + agente especialista:

1. **Developer Elite** (primeiro — mais próximo do uso real): Context7, MCP, Git Intelligence,
   Test Generator, Refactor, Code Review. Semgrep como analisador dev-time.
2. **Designer Elite**: Penpot (o workspace já usa), design system, iconografia, prompt de imagem.
3. **Creator Elite**: só o que já existe parcialmente (ComfyUI/FFmpeg/music producer) — video IA
   e lip sync ficam fora (poço de recursos).
4. **Cyber Security**: só Semgrep dev-time. EDR/IDS/Honeypot/nuclei → jamais no v1.

## Parking lot (NÃO fazer — reavaliar só em v2)

- **Home Intelligence** (ESP32/Tuya/HA): hardware, manutenção infinita. Só se o usuário tiver
  os dispositivos e pedir.
- **Cyber Security completo**: passivo + risco de segurança falsa.
- **Plugin Marketplace online**: depende do contrato (Módulo 1) amadurecer.
- **World Model completo**: resumir a "contexto do usuário" (agenda/clima/horário) via provider
  de contexto no planner, não módulo próprio.
- **Visão 2.0**: Digital Twin, Simulation Engine, Self-Healing, Agent Academy, Workflow Builder,
  Skill Store, Universal Memory. Parque temático — registrar, não planejar.

## Ordem de execução recomendada (resumo)

```
Módulo 0 (estabilidade, contínua)
   ↓
Módulo 1 — Skill Manager        ← contrato de extensão
   ↓
Módulo 2 — Memory Engine         ← substrato compartilhado (pgvector)
   ↓
Módulo 3 — Knowledge Engine      ← docs auto + export Obsidian
   ↓
Módulo 4 — Planner Engine        ← orquestrador (serial)
   ↓
Módulo 5 — Agent Hub             ← delegação + schema único de agente
   ↓
Módulo 6 — Analytics/Dashboard   ← surfacing do que já é logado
   ↓
Módulo 7 — Elites como skills    ← Developer primeiro, sob demanda
```

## Critério de "chegou na plataforma"

O Orun OS vira plataforma quando: (1) qualquer skill/agente novo é instalável sem tocar no
código do shell, (2) toda memória é pesquisável semanticamente e compartilhada entre agentes,
(3) um objetivo vira plano → subtarefas → execução → revisão sem intervenção manual.

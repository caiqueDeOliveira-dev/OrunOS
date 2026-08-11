# Skills & MCPs — Banco de ideias para o futuro

> Status: **adiado / ideia futura**. Lista curada de skills e MCPs que não precisamos hoje,
> mas que podem ser úteis no futuro. Quando alguém (você ou um agente) precisar, é só vir aqui.
> Fonte de verdade: este arquivo. Sempre que testarmos/adotarmos um item, marcar como **adotado** com data.

---

## Como usar

- Cada item tem: nome, o que faz, quando valeria a pena, onde encaixaria no ecossistema Orun.
- **Não instalar agora** a menos que a necessidade seja real (cada integração tem custo de manutenção).
- Antes de adotar, atualizar este arquivo e o `MEMORY.md` global.

---

## MCPs (Model Context Protocol)

### 1. Context7 — docs de bibliotecas on-demand
- **O que é:** MCP que resolve docs atualizadas de qualquer biblioteca (via `@upstash/context7-mcp`).
- **Status atual:** já existe como **tool nativa** `library_docs` no Developer (Módulo 7, 2026-08-07) e o `mcp-client.cjs` do desktop já auto-carrega `mcpServers`.
- **Quando valeria:** ligar o server MCP Context7 (em vez da tool) para o Developer ter docs com rate limit maior e snippets de qualidade. Wiring já existe — só adicionar `{ name: "context7", command: "npx", args: ["-y", "@upstash/context7-mcp"] }` em `mcpServers`.
- **Encaixe:** Developer / AssistenteTecnico.

### 2. Playwright MCP — automação de browser
- **O que é:** MCP que controla Chrome/Chromium (navegar, clicar, extrair, screenshot).
- **Quando valeria:** automações web reais no Automation (ex.: preencher formulário, coletar dado de site sem API, monitorar página). O OrunTV já usa Playwright (via Python) para extrair `.m3u8` — um MCP unificaria isso no desktop.
- **Encaixe:** Automation, OrunTV, Marketing (agendamento de posts em plataformas sem API).

### 3. Git/GitHub MCP
- **O que é:** MCP oficial do GitHub (issues, PRs, repos) ou servidores git (status/diff/commit).
- **Status atual:** já temos Git Intelligence nativo (`git_status`/`git_log`/`git_diff`/`git_stash`/`git_remote`/`gh_pr` + `code_review`/`run_tests`).
- **Quando valeria:** se o Developer precisar de operações que as tools nativas não cobrem (ex.: buscar issues por label, comentar em PR, revisar CI). Sem necessidade por enquanto.
- **Encaixe:** Developer, OrunVS.

### 4. Filesystem MCP
- **O que é:** MCP oficial com acesso a filesystem (leitura/escrita com scoping de diretórios).
- **Status atual:** o desktop já resolve caminhos contra o developer workspace via `getWorkspaceDir()`/`resolveAgentPath()`.
- **Quando valeria:** acesso a outros diretórios com permissão granular (ex.: Orun Files, pastas de mídia do OrunTV). Cuidado com segurança — escopo estrito.
- **Encaixe:** Developer, Orun Files, OrunTV.

### 5. PostgreSQL / Supabase MCP
- **O que é:** MCP que dá ao agente acesso a consultar o banco (schemas, queries, migrações).
- **Status atual:** todo o ecossistema usa o Supabase compartilhado; consultas hoje são via código.
- **Quando valeria:** quando os agentes precisarem investigar dados do banco em runtime (ex.: "por que o sync falhou?"), mas **com usuário read-only e sem credenciais de service role**.
- **Encaixe:** System, Developer, Analytics.

### 6. Docker MCP
- **O que é:** MCP para gerenciar containers (listar, logs, restart).
- **Quando valeria:** quando o ecossistema rodar serviços empacotados (OrunTV stack, n8n, Fooocus) — um agente System/Automation poderia gerenciá-los.
- **Encaixe:** System, Automation, OrunTV.

### 7. Tavily MCP (busca web)
- **O que é:** MCP de search (Tavily) com rate limits melhores que a tool `web_search`.
- **Status atual:** tool `web_search` já usa Tavily via API.
- **Quando valeria:** se a tool ficar limitada ou precisar de busca estruturada em massa (ex.: pesquisa de mercado para o Marketing).
- **Encaixe:** Marketing, Developer.

### 8. Supabase Edge Functions / ai-relay como MCP (ideia própria)
- **O que é:** expor o `ai-relay` ou funções internas como MCP para apps externos consumirem.
- **Quando valeria:** quando o SO Orun quiser que programas externos (ex.: OrunVS) chamem os agentes do desktop via MCP. É uma direção arquitetural, não uma dependência externa.
- **Encaixe:** todos os apps do ecossistema.

---

## Skills

### 9. diagram-design — diagramas editoriais em HTML/SVG (cathrynlavery)
- **O que é:** skill de 29 tipos de diagrama (arquitetura, flowchart, sequence, ER, timeline, swimlane, quadrant, org chart, Venn, pyramid, loop, Gantt, medallion, etc.) em HTML + SVG autocontido, com design system editorial (sem Mermaid, sem caixas genéricas), onboarding de marca via site, export PNG/SVG via Playwright. 4.6k stars, MIT.
- **Repo:** https://github.com/cathrynlavery/diagram-design
- **Status atual:** avaliado em 2026-08-10 — **adiado** (fora do roadmap; uso esporádico no fluxo atual). Deixar salvo como referência.
- **Quando valeria:** (1) quando o Developer virar ferramenta recorrente de arquitetura de projetos em `Desktop\hello`; (2) quando o Hampton responder "me desenha como funciona o Orun" com um diagrama; (3) documentação visual dos ADRs/knowledge engine.
- **Encaixe:** Developer (docs de arquitetura), Designer, Knowledge Engine. Portar seguiria o padrão de skills do `skill-manager.cjs` (manifest v1) ou virar tool do Designer.

### 10. Obsidian integration (já documentado em separado)
- **O que é:** dar memória de longo prazo via vault Obsidian (repo kepano/obsidian-skills).
- **Status:** **adiado** — ver `docs/obsidian-integration.md`.
- **Quando valeria:** quando o usuário adotar Obsidian de verdade (hoje não usa).

### 11. Skill-creator / técnicas de autorias de skill
- **O que é:** workflow para criar/refinar skills (usado para escrever SKILL.md do Developer, ex.).
- **Status:** o desktop já tem `skills/developer/SKILL.md` "Elite". Aplicável quando criarmos mais skills nativas.
- **Encaixe:** Developer, próximos módulos de "Elites como skills".

### 12. Skill de wiretext (diagramas em unicode para terminal/tweets)
- **O que é:** estilo minimalista de diagramas em texto (ascii/unicode) — complemento barato ao diagram-design.
- **Quando valeria:** respostas rápidas no chat (sem abrir HTML), diagramas em respostas do WhatsApp. Zero integração — só instrução de prompt.
- **Encaixe:** Hampton, qualquer agente.

### 13. Semgrep rulesets adicionais / MCP
- **O que é:** estender o `semgrep_scan` (já nativo no Developer/Cyber Security) com rulesets específicos (ex.: segurança de APIs, IaC, secrets).
- **Quando valeria:** quando o Cyber Security evoluir além do escaneamento básico.
- **Encaixe:** Developer, Cyber Security.

### 14. Edge TTS / voices extras como skill
- **O que é:** documentar/combinar vozes pt-BR do Edge TTS em skills de pronúncia ou diálogo.
- **Status:** Edge TTS já é engine ativo no TTS router (porta 5003).
- **Quando valeria:** quando quisermos personalidade de voz por agente (ex.: cada persona com voz própria).
- **Encaixe:** voz, personas (Círculo Hampton).

---

## Plataformas / Infraestrutura de IA

> Itens que não são skill nem MCP, mas plataformas/infra que podem sustentar o Orun quando virar empresa.
>
> **Contexto empresa:** o usuário vai formalizar o ecossistema como **Grupo Orun Soluções Tecnológicas** — quando isso sair do papel, reavaliar os itens desta seção (ex.: Semantica) com esse olhar de governança para cliente. Registrar formalização no `MEMORY.md` global.

### 15. Semantica — graph-native para governança/auditoria de IA (semantica-agi)
- **O que é:** "Palantir open source para agentes" — knowledge graph + provenance W3C PROV-O + decision intelligence (toda decisão do agente vira nó auditável com causa/impacto) + ontologia SHACL/OWL + razão determinística (Rete/Datalog/SPARQL). Python (`pip install semantica`), self-hosted, MIT, ~4k stars. Tem server MCP próprio + REST + CLI.
- **Repo:** https://github.com/semantica-agi/semantica
- **Status atual:** avaliado em 2026-08-10 — **adiado**. Foi descartado por ser enterprise/regulado demais pro uso pessoal, **mas reaberto** porque o usuário planeja virar empresa.
- **Quando valeria (gatilho):** quando o Orun prestar serviço a **clientes em domínio regulado** (finanças, saúde, jurídico) que exijam auditoria de decisões de IA ("por que o agente aprovou/negou?") exportável em PROV-O/SHACL para regulador. Enquanto for ferramenta pessoal/uso interno, é overkill.
- **Encaixe:** Orun core como camada de governança opcional (serviço Python separado; não substitui Memory/Knowledge Engine atuais). Candidato também a Orun Shield (auditoria) e Orun Auth (LGPD/audit log).
- **Custo de adoção:** alto (serviço Python pesado + armazenamento RDF/LPG). Só quando houver cliente real.

---

## Referências de agentes / prompts

### 16. The Agency — biblioteca de agentes IA prontos (msitarzewski)
- **O que é:** coleção de ~400 agentes especialistas como prompts em markdown (identidade + personalidade + missão + workflows + deliverables + métricas), organizados por divisões (engineering, design, marketing, paid-media, sales, product, project-management, testing, security, healthcare, finance, etc.). MIT, ~142k stars. Instala em Claude Code/Cursor/Codex/Gemini CLI/OpenCode/etc. via `scripts/install.sh --tool ...` ou app nativo (`agencyagents.app`).
- **Repo:** https://github.com/msitarzewski/agency-agents
- **Status atual:** avaliado em 2026-08-10 — **registrado como referência** (sem integração; não usar o install — Orun não roda Claude Code).
- **Quando valeria:** (1) melhorar/ampliar os prompts dos 17 agentes do desktop (`electron/agent-prompts.cjs`) usando os padrões de estrutura (persona + missão + deliverables + métricas de sucesso) e especialistas que não temos (ex.: Code Reviewer, RAG Pipeline Engineer, Multi-Agent Systems Architect, Privacy Engineer, Prompt Engineer, AEO Architect); (2) criar agentes novos nas fases B/C do SO. Mineração é pontual — ler o `.md` do agente desejado e adaptar ao formato Orun (nunca copiar 400).
- **Encaixe:** prompts dos agentes (desktop/mobile), Agent Hub, futuras skills.

### 17. Governança multi-agente de produção — gaps do Agent Hub (derivado do #16)
- **O que é:** conjunto de 5 reforços estruturais no orquestrador multi-agente (Agent Hub / autonomous-loop), extraídos do agente "Multi-Agent Systems Architect" do The Agency, para produção:
  1. **Confidence signal** — subagentes retornam `{resultado, confidence}`; orquestrador escalar (especialista → humano) quando confidence baixa ou outputs contraditórios.
  2. **Circuit breaker por agente** — falha contínua (ex.: 3 em 5) abre breaker com cooldown + estado half-open; hoje só há fallback de provider, sem cooldown por agente.
  3. **Context budget entre hops** — sumarizar saída de cada subagente (≤200 tokens) e passar só o resumo + campos obrigatórios (IDs/decisões) ao próximo, em vez de mensagens íntegras (evita crescimento exponencial do contexto).
  4. **Evals por agente** — suíte ≥20 casos por prompt + baseline + regressão antes de mudar um prompt de agente (hoje só testes estruturais em `agent-prompts.test.cjs`).
  5. **Contrato de papel por agente** — template RECEBE/RESPONSABILIDADE/NÃO RESPONSÁVEL POR/PRODUZ/CRITÉRIOS DE SUCESSO/COMPORTAMENTO DE FALHA no schema do Agent Hub.
- **Status atual:** registrado em 2026-08-10 (mineração do The Agency #16) — **não implementado**. Os que já existem parcialmente: least-privilege (`AGENT_TOOL_PERMISSIONS` + `AGENT_WORKSPACE_SCOPE`), audit log (`SENSITIVE_TOOL_ACTIONS`), delegação serial com step trace (`agent-hub.cjs`), anti-prompt-injection (`INJECTION_DEFENSE`).
- **Quando valeria:** antes de o Agent Hub virar orquestrador de pipelines complexos (Fase B/C do SO) ou quando houver agente delegando para >2 níveis com falhas reais. Implementar em ordem: confidence → circuit breaker → context budget → evals → contrato de papel.

---

## Trending GitHub — avaliado em 2026-08-10

> Passada no `github.com/trending?since=daily` (16 repos). Classificação cruzada com o ecossistema Orun:
> **agora** (ação imediata) / **futuro** (referência/upgrade em Fase B/C) / **não faz sentido** (descartado).

### 18. agent-skills — skills de engenharia "production-grade" (addyosmani) — IMPLEMENTADO
- **O que é:** coleção de skills de engenharia de software para coding agents (code review, refactor, testes, etc.), mantida por Addy Osmani (Google Chrome). JS, 86k stars.
- **Repo:** https://github.com/addyosmani/agent-skills
- **Status atual:** implementado em 2026-08-10. Repo clonado (`%TEMP%\opencode\agent-skills`, 25 skills) e minerado: code-simplification, debugging-and-error-recovery, incremental-implementation, performance-optimization, spec-driven-development.
- **O que foi feito:** seção "Disciplinas de execução (elite)" adicionada ao `skills/developer/SKILL.md` (implementação incremental, debug stop-the-line com causa raiz, simplificação com Chesterton's Fence, performance MEASURE→IDENTIFY→FIX→VERIFY→GUARD, spec antes de código) + bloco `ENGINEERING DISCIPLINE` condensado no prompt do Developer em `agent-prompts.cjs`.
- **Encaixe:** Developer (desktop); OrunVS pode reaproveitar as mesmas seções no futuro.

### 19. Firecrawl — API de contexto web (search + scrape + extração) — IMPLEMENTADO
- **O que é:** "context API to search, scrape and interact with the web at scale" — busca + crawl com render JS + saída markdown + extração estruturada (LLM). TS, 165k stars. Self-hostável, tem API cloud, SDK e **MCP server**.
- **Repo:** https://github.com/firecrawl/firecrawl
- **Status atual:** implementado em 2026-08-10 — upgrade aditivo das tools de web.
- **O que foi feito:** novo `electron/firecrawl.cjs` (Node puro: `scrape` → `/v1/scrape` com markdown/html/text + metadata, `search` → `/v1/search`, `setBaseUrl` p/ self-host, retorna `{error}` em vez de lançar). `web_fetch` agora usa Firecrawl quando há chave `firecrawl` no secretStore (fallback p/ fetch direto se falhar/sem conteúdo); `web_search` tenta Firecrawl primeiro e cai p/ DuckDuckGo. Campo de chave Firecrawl no SettingsPanel. 7 testes (`electron/__tests__/firecrawl.test.cjs`).
- **Encaixe:** tools.cjs (`web_fetch`/`web_search`), Knowledge Engine e Orun Files podem adotar o mesmo módulo depois; opcional expor como MCP.
- **Nota:** chave no secretStore slot `firecrawl` (formato `fc-...`, api.firecrawl.dev); sem chave o comportamento é 100% igual ao anterior.

### 20. code-graph-rag — RAG em grafos para monorepo (vitali87) — FUTURO
- **O que é:** RAG sobre código com knowledge graph — consultar/entender/editar codebases multi-linguagem. Python, 3.5k stars.
- **Repo:** https://github.com/vitali87/code-graph-rag
- **Status atual:** avaliado em 2026-08-10 — **referência futura**. **2026-08-10: superado na prática pelo #35 (code-review-graph)**, que cobre o mesmo problema (grafo de código local para agentes) com MCP + Windows-first + tooling pronta — adotado como MCP opcional no Developer.
- **Quando valeria:** se a direção de entendimento de código for além do #35 (consultas RAG conversacional em grafos multi-linguagem). Complementaria o `rag_search` (nomic-embed) com relações estruturais (grafos de chamadas/imports).
- **Encaixe:** Developer (tools de elite), Knowledge Engine.

### 21. Paperclip — gerenciar agentes no trabalho (paperclipai) — FUTURO
- **O que é:** app open-source para gerenciar agentes no trabalho (dashboard/observabilidade de agentes). TS, 76k stars.
- **Repo:** https://github.com/paperclipai/paperclip
- **Status atual:** avaliado em 2026-08-10 — **referência de UI**.
- **Quando valeria:** quando o Agent Hub virar app do SO (Fase B/C) — inspiração para `AgentHubPanel` (estado dos agentes, filas, traces, invocação). Não adotar o app; só observar padrões de UX.
- **Encaixe:** Agent Hub, Analytics, shell do SO.

### 22. LifeOS — harness de hill-climbing de metas (danielmiessler) — FUTURO
- **O que é:** "General Hill-climbing AI harness" que move do Current State para o Ideal State em vida e trabalho. TS, 18k stars.
- **Repo:** https://github.com/danielmiessler/LifeOS
- **Status atual:** avaliado em 2026-08-10 — **referência de padrão**.
- **Quando valeria:** evoluir o Planner Engine (goal → plan → subtasks) e o agente Personal Assistant com o conceito de estado atual → estado ideal + passos incrementais.
- **Encaixe:** Planner Engine, Personal Assistant, Health (metas).

### 23. TradingAgents — framework multi-agente de trading (TauricResearch) — FUTURO (opcional)
- **O que é:** framework LLM multi-agentes para trading financeiro (research/analyst/trader roles). Python, 97k stars.
- **Repo:** https://github.com/TauricResearch/TradingAgents
- **Status atual:** avaliado em 2026-08-10 — **referência opcional** (depende do interesse do usuário em investimentos).
- **Quando valeria:** se o agente Finance crescer de "controle de gastos" para "análise de mercado" — o padrão de roles multi-agente é um caso de uso do Agent Hub.
- **Encaixe:** Finance, Agent Hub.

### 24. RuView — presença/vitais via WiFi (ruvnet) — FUTURO
- **O que é:** transforma sinais WiFi em inteligência espacial, monitoramento de sinais vitais e detecção de presença sem vídeo. Rust, 89k stars.
- **Repo:** https://github.com/ruvnet/RuView
- **Status atual:** avaliado em 2026-08-10 — **referência experimental** (em estágio inicial, não confiar nos números de stars inflados).
- **Quando valeria:** Orun Home — detecção de presença como trigger de automações (sem câmera/sensor extra). Só quando o projeto amadurecer.
- **Encaixe:** Orun Home (home-app), Orun-Core (satélite `home`).

### 25. ComfyUI — GUI/backend de diffusion modular (Comfy-Org) — FUTURO
- **O que é:** "most powerful and modular diffusion model GUI, api and backend with a graph/nodes interface". Python, 126k stars.
- **Repo:** https://github.com/Comfy-Org/ComfyUI
- **Status atual:** avaliado em 2026-08-10 — **upgrade potencial do Fooocus**. O Fooocus (atual motor local do Designer) é derivado do ecossistema Comfy; ComfyUI é mais modular (nós custom, comunidade enorme).
- **Quando valeria:** se o Designer precisar de fluxos de imagem avançados (workflows custom além de texto→imagem). Custo: GPU dedicada e mais complexidade.
- **Encaixe:** Designer (`generate_image`), eventualmente Creator.

### 26. prime-agent e t3code — coding agents de referência — FUTURO
- **O que é:** `PrimeIntellect-ai/prime-agent` (agente RLM self-improving para coding/long-running tasks, TS, 13k★) e `pingdotgg/t3code` (coding agent, TS, 18k★).
- **Repos:** https://github.com/PrimeIntellect-ai/prime-agent · https://github.com/pingdotgg/t3code
- **Status atual:** avaliados em 2026-08-10 — **referências de arquitetura** para o autonomous loop/Developer.
- **Quando valeria:** estudar como tratam tarefas long-running e self-improvement (feedback do usuário → ajuste de comportamento) para o `autonomous-loop.cjs`.
- **Encaixe:** Developer, autonomous-loop.

### Descartados (não faz sentido) — 2026-08-10
- **NanmiCoder/MediaCrawler** — crawlers de redes sociais chinesas (Xiaohongshu/Douyin/Bilibili). Sem sobreposição com o Marketing (Buffer → IG/TikTok/X).
- **LadybirdBrowser/ladybird** — browser em C++. O SO Orun é web/Electron; um "Orun Browser" seria shell Electron, não engine C++.
- **google-deepmind/weathernext** — modelo meteorológico de pesquisa (compute pesado). API de clima basta para Home IA.
- **opa334/Dopamine** — jailbreak iOS. Irrelevante.
- **msitarzewski/agency-agents** — re-trending do #16 (já registrado); nada a fazer.

### Passada semanal (since=weekly) — 2026-08-10

> Passada no `github.com/trending?since=weekly` (17 repos). Mesma classificação: **agora** / **futuro** / **não faz sentido**.
> Novo aqui (ações/referências inéditas) → **#27–#33**. Re-trendings: semantica (#15), code-graph-rag (#20) e ComfyUI (#25) apareceram de novo — **manter o status registrado** (sem revisão).

### 27. firecrawl/pdf-inspector — inspeção/classificação de PDF (Firecrawl) — ✅ IMPLEMENTADO (2026-08-10)
- **O que é:** biblioteca Rust rápida para inspeção, classificação e extração de texto de PDF — detecta inteligentemente **escaneado vs baseado em texto** para rotear (OCR vs extração direta). 14.3k★, 8.6k★ esta semana.
- **Repo:** https://github.com/firecrawl/pdf-inspector
- **Decisão:** **adotado como heurística JS** (custo de adoção de Rust/FFI não justifica) — heurísticas de classificação replicadas em Node puro, sem dependências.
- **Entregue:**
  - `electron/pdf-inspector.cjs` (Node puro, sem deps): `inspectPdf` (classificação **text/mixed/scanned/unknown**, `hasTextLayer`, páginas via `/MediaBox`, contagem de imagens/fontes, preview de texto) e `extractPdfText` (regex de operadores `Tj`/`TJ` com decodificação de literais; **infla streams FlateDecode via `zlib` nativo**). Limites: 64MB por arquivo, 8MB por stream; filtros não-Flate (DCTDecode/LZW/JBIG2) não decodificados → classificação segue heurística.
  - Tool nativa `pdf_inspect` em `electron/tools.cjs` (definição OpenAI + dispatcher com `isPathAllowed`/`resolveAgentPath`, `extract_text` + `text_limit`).
  - Permissões: `AGENT_TOOL_PERMISSIONS.Developer` e `.Juridico` (leitura de PDFs legais) em `electron/main.cjs`.
  - `skills/developer/SKILL.md` (cabeçalho + Referência rápida).
  - Testes: `electron/__tests__/pdf-inspector.test.cjs` **8 testes** (texto, FlateDecode comprimido, escaneado sem camada de texto, TJ array, escapes, arquivo ausente/não-PDF). Suite: **889 ✓ / 9 skipped** (era 881), typecheck limpo.
- **Encaixe futuro:** Orun Files (extração PDF) e Knowledge Engine (ingestão) podem chamar `pdf_inspect`/`extractPdfText`; OCR de escaneados continua pendente.

### 28. google/skills — Agent Skills oficiais para produtos Google — ⚠️ REVISADO (sem adoção) (2026-08-10)
- **O que é:** skills oficiais do Google para seus produtos/tecnologias (Gmail, Calendar, Sheets, Docs, Drive, BigQuery, etc.), formato compatível com agentes/skills. 17.6k★, 1.6k★ esta semana.
- **Repo:** https://github.com/google/skills
- **Verificação (2026-08-10):** repo clonado (`C:\Users\Caiqu\AppData\Local\Temp\opencode\google-skills`, depth 1) — **a premissa original está ERRADA: o repo NÃO contém skills de Google Workspace** (Gmail/Calendar/Sheets/Docs). Categorias reais: `ads/`, `analytics/`, `cloud/` (SecOps, Vertex AI/Agent Platform, BigQuery, GKE, Firebase, Cloud Logging). Não há o que minerar para o Personal Assistant (Gmail/Calendar).
- **Fonte útil identificada (referência, sem adoção):** `skills/cloud/gemini-api/SKILL.md` — padrões de function calling/structured output/embeddings/context caching no SDK Gen AI (`@google/genai`, JS/TS) servem de referência para o `ai-router.cjs`/`rag`; `skills/cloud/detection-engineering-coverage-evaluation/SKILL.md` é sobre SecOps corporativo (fora do escopo).
- **Conclusão:** marcar como **não-adotado (premissa não confirmada)**. Para produtividade Workspace, fontes mais diretas seriam as APIs oficiais do Google (já integradas via `google-client.cjs`) — nada a adotar deste repo.

### 29. TencentDB-Agent-Memory — hub de memória de time para agentes (TencentCloud) — FUTURO
- **O que é:** hub de memória em nível de time para agentes IA — converte conversas/docs/código em 4 ativos reutilizáveis: **Chat Memory, Skill, LLM-Wiki, Code-Graph** — governados e compartilhados entre agentes e frameworks. TS, 19.4k★, 8k★ esta semana.
- **Repo:** https://github.com/TencentCloud/TencentDB-Agent-Memory
- **Status atual:** avaliado em 2026-08-10 — **referência de evolução** para o Memory Engine (M2).
- **Quando valeria:** quando o Memory Engine crescer de "memória por agente + embeddings" para **memória compartilhada de time** (as 4 formas: memória conversacional, skills, wiki gerada por LLM, grafo de código). Mapeia bem para Fase B/C (Agent Hub + Knowledge Engine).
- **Encaixe:** Memory Engine (`memory-engine.cjs`), Knowledge Engine, Agent Hub.

### 30. loopx — kernel de estado de loop para agent teams (huangruiteng) — FUTURO
- **O que é:** "lightweight loop engineering state kernel" para equipes de agentes long-running — goals duráveis, auto-wake ciente de quota, todos executáveis, logs de evidência e handoffs verificáveis; agnóstico de loop (Codex/Claude Code). Python, 3.9k★, 3.5k★ esta semana.
- **Repo:** https://github.com/huangruiteng/loopx
- **Status atual:** avaliado em 2026-08-10 — **referência de arquitetura** para o autonomous-loop.
- **Quando valeria:** evoluir o `autonomous-loop.cjs` de loop simples (iterações + tools) para **kernel com estado durável** (objetivos, retomada pós-reboot, evidência por iteração, handoff verificado entre agentes) — complementa os gaps do #17 (governança multi-agente).
- **Encaixe:** autonomous-loop.cjs, Planner Engine, Agent Hub.

### 31. reverse-skill — router de skills de segurança/pen-testing (zhaoxuya520) — FUTURO
- **O que é:** pacote de roteamento de skills de reverse engineering / pentest autorizado / pesquisa de segurança para coding agents (Claude Code, Kiro, Cursor, Cline): auto-routing + toolchain bootstrapping on-demand + base de conhecimento auto-evolutiva. PowerShell, 23.3k★, 9.8k★ esta semana.
- **Repo:** https://github.com/zhaoxuya520/reverse-skill
- **Status atual:** avaliado em 2026-08-10 — **candidato a mineração** para o lado de segurança.
- **Quando valeria:** quando o **Orun Shield** (suíte de segurança, em refinamento) ganhar o agente Cyber Security com habilidades ofensivas/de hardening — minerar o roteamento de skills (e não as ferramentas de exploit, que exigem contexto/autorização).
- **Encaixe:** Cyber Security (agente), Orun Shield, skills/cyber-security.

### 32. swarm-forge — coordenação simples de agentes (unclebob) — FUTURO (referência)
- **O que é:** ferramenta simples para coordenar vários agentes (Uncle Bob). Clojure, 2.1k★, 562 esta semana.
- **Repo:** https://github.com/unclebob/swarm-forge
- **Status atual:** avaliado em 2026-08-10 — **referência de padrão** de orquestração enxuta.
- **Quando valeria:** comparar com a delegação serial do Agent Hub — provavelmente nada a adotar (Clojure/outro modelo), mas é leitura barata p/ validar o desenho do hub.
- **Encaixe:** Agent Hub (desenho).

### 33. kaneo — gestão de projetos open source (usekaneo) — FUTURO (referência de UI)
- **O que é:** gestão de projetos open source "all you need, nothing you don't" (kanban/quadros). TS, 8k★, 1.95k★ esta semana.
- **Repo:** https://github.com/usekaneo/kaneo
- **Status atual:** avaliado em 2026-08-10 — **referência de UI/UX** para o Planner.
- **Quando valeria:** evoluir o `PlannerPanel.tsx` de lista serial para quadros/drag-and-drop (Fase B/C do SO, quando o Planner virar app).
- **Encaixe:** Planner Engine (UI), shell do SO.

### Descartados (não faz sentido) — passada semanal 2026-08-10
- **esengine/DeepSeek-Reasonix** — coding agent DeepSeek-native de terminal. O Orun já tem agentes próprios (autonomous-loop) e DeepSeek via OpenCodeZen proxy. Não precisamos de outro agente terminal.
- **lyogavin/airllm** — AirLLM 70B em GPU de 4GB. O Orun usa Ollama local (modelos pequenos) + cloud; GPU é AMD (sem CUDA). Descartado.
- **virgiliojr94/book-to-skill** — livro PDF → skill para Claude Code. Não usamos Claude Code; o Knowledge Engine já cobre docs gerados. Padrão interessante mas nichado.
- **drawdb-io/drawdb** — editor de diagrama de banco + gerador SQL. Sem sobreposição com Orun (nada de modelagem ERD no roadmap).
- **microsoft/AI-For-Beginners** — curso de IA (12 semanas). Conteúdo educacional, não ferramenta; Teacher não depende disso.
- **DataExpert-io/data-engineer-handbook** — guia de links de data engineering. Conteúdo de estudo, não adoção.
- **goauthentik/authentik** — SSO/identity server. Redundante com **Orun Auth** (`@orun/identity`, v0.1.0, 71 testes, MFA/Stripe/LGPD) — o modelo do Orun é SDK + Edge Functions, não servidor self-hosted de SSO.

### Passada mensal (since=monthly) — 2026-08-10

> Passada no `github.com/trending?since=monthly` (21 repos). Mesma classificação: **agora** / **futuro** / **não faz sentido**.
> Novo aqui (ações/referências inéditas) → **#34–#45**. Re-trendings: t3code (#26), TencentDB-Agent-Memory (#29), reverse-skill (#31) e book-to-skill (descartado semanal) apareceram de novo — **manter o status registrado** (sem revisão).

### 34. mattpocock/skills — Skills de engenharia "para engenheiros de verdade" — ✅ ADOTADO (minerado 2026-08-10)
- **O que é:** skills de engenharia reais de Matt Pocock (TypeScript Wizard), direto do diretório `.agents`. Shell/markdown, 212.5k★, 49.4k★ este mês.
- **Repo:** https://github.com/mattpocock/skills
- **Decisão (2026-08-10):** **minerado** — mesmo padrão do #16/#18: conteúdo extraído para as skills/prompts do ecossistema, sem adotar o repo. Repo clonado em `%TEMP%\opencode\mattpocock-skills` (35 skills; engenharia, produtividade, misc, in-progress).
- **Entregue:**
  - `skills/developer/SKILL.md`: Code Review agora com **eixos Padrões-vs-Spec** + baseline de 12 smells de Fowler (pin do diff three-dot, repo vence o baseline, smells = judgement call); **Test Generator → TDD red-green** (seams pré-combinados, anti-padrões acoladado/tautológico/slicing horizontal, mock só em fronteiras de sistema, fatias verticais); **Debugging** com gate de **loop red-capable** (sem hipótese antes do comando que reproduz), 3–5 hipóteses falsificáveis ranqueadas, prefixo `[DEBUG-]`, regressão só em seam correto (sem seam = o achado); novas seções **Deep modules** (teste de deleção, interface = superfície de teste, 1/2 adapters, injete dependências) e **Merge conflicts** (por intenção, nunca `--abort`); tickets em fatia vertical + expand–contract na disciplina de spec.
  - `electron/agent-prompts.cjs` (prompt do Developer): bloco `CODE REVIEW QUALITY` com os dois eixos + 12 smells; novo bloco `TDD` (seams/red-green/anti-padrões/mock em fronteiras); `ENGINEERING DISCIPLINE` debugging reescrito para loop red-capable + hipóteses falsificáveis + `[DEBUG-]` + seam correto; spec ganhou tickets de fatia vertical + expand–contract.
  - `skills/suporte/SKILL.md`: seção "Engajamento de suporte (método)" — reproduzir antes de teorizar, triage com verificação da alegação, questionário estruturado, re-pitch de mensagens confusas, handoff compacto, passos guiados (wizard).
  - `skills/assistente-tecnico/SKILL.md`: regras de diagnóstico — reproduzir sintoma, loop de teste tight (medição que reproduz o defeito), uma variável por vez, passos manuais um a um.
  - Verificação: `node --check` em agent-prompts.cjs ✓; typecheck limpo.
- **Encaixe:** Developer (skills), AssistenteTecnico, Suporte. Não-minerado (fora de escopo): skills de escrita/conteúdo, wayfinder, teach, setup/router específicos de Claude Code.

### 35. code-review-graph — grafo de inteligência de código local-first (tirth8205) — ✅ ADOTADO (MCP opcional documentado 2026-08-10)
- **O que é:** grafo de inteligência de código local-first para MCP e CLI — constrói um mapa persistente do codebase para ferramentas de IA lerem só o que importa, com contexto benchmarkado. Python, 29.7k★, 10.3k★ este mês.
- **Repo:** https://github.com/tirth8205/code-review-graph
- **Decisão (2026-08-10):** **adotado como MCP opcional** para o Developer — eleva o #20 (code-graph-rag) de "referência futura" para ação. Repo clonado em `%TEMP%\opencode\code-review-graph`. Avaliação: spawn stdio bate com o `mcp-client.cjs` (`{ name, command, args }`); Windows first-class (uvx/`uv` já instalado, Python 3.11.9); local-only, sem API key; `build_or_update_graph_tool` faz o build do grafo (SQLite tree-sitter, ~10s em 500 arquivos).
- **Entregue:** config documentada em `skills/developer/SKILL.md` (Settings → MCP, **não é default** — processo Python residente + build do grafo): `{ name: "code-review-graph", command: "uvx", args: ["code-review-graph", "serve", "--repo", "<workspace>", "--tools", "build_or_update_graph_tool,get_minimal_context_tool,detect_changes_tool,get_review_context_tool,get_impact_radius_tool,query_graph_tool"] }`. Notas: o cliente MCP não passa `cwd` → `--repo` obrigatório; filtro `--tools` exclui `refactor_tool`/`apply_refactor_tool`/`embed_graph_tool` (edição/embeddings ficam nas tools nativas); ~8k tokens de descrição de tools se não filtrar.
- **Encaixe:** Developer (tools de elite / MCP), `mcp-client.cjs`. Não substitui `code_review`/`semgrep_scan` — é a camada de *impact tracing* (blast-radius cross-file: "o que mais quebra se eu mudar isso?").

### 36. DeepTutor — tutoria personalizada lifelong (HKUDS) — FUTURO
- **O que é:** framework de tutoria personalizada ao longo da vida (lifelong personalized tutoring). Python, 33.8k★, 8.1k★ este mês.
- **Repo:** https://github.com/HKUDS/DeepTutor
- **Status atual:** avaliado em 2026-08-10 — **referência futura**.
- **Quando valeria:** evoluir o agente Teacher (micro-learning, quizzes, progresso) com sequenciamento curricular adaptativo e memória do aluno.
- **Encaixe:** Teacher (agente), `teacher_progress`, Planner Engine (planos de estudo).

### 37. open-seo — alternativa open source a Semrush/Ahrefs (every-app) — FUTURO
- **O que é:** alternativa open source a Semrush e Ahrefs (SEO research). TS, 11.2k★, 6.9k★ este mês.
- **Repo:** https://github.com/every-app/open-seo
- **Status atual:** avaliado em 2026-08-10 — **referência futura**.
- **Quando valeria:** quando o Marketing crescer de "publicação" para "estratégia de conteúdo" (pesquisa de palavras-chave, rank tracking) — integrar via API/webhooks ao invés de self-host.
- **Encaixe:** Marketing (agente), `marketing_log`.

### 38. worldmonitor — dashboard de inteligência global em tempo real (koala73) — FUTURO (app Fase C)
- **O que é:** dashboard de inteligência global em tempo real — agregação de notícias com IA, monitoramento geopolítico e rastreamento de infraestrutura em uma tela unificada de consciência situacional. TS, 80.5k★, 18.8k★ este mês.
- **Repo:** https://github.com/koala73/worldmonitor
- **Status atual:** avaliado em 2026-08-10 — **candidato a app nativo Fase C**.
- **Quando valeria:** como **app nativo do SO Orun** (Fase C) — monitoramento de notícias/mercado com o `web_search`/Firecrawl como motor, reusando o design system premium.
- **Encaixe:** shell do SO (Fase C), `web_search`, Marketing.

### 39. archify — skill de diagramas de arquitetura (tt-a1i) — FUTURO (referência de skill)
- **O que é:** agent skill para diagramas bonitos e verificáveis de arquitetura, workflow, sequência, data-flow e lifecycle — HTML autocontido com motion e exportação nítida. HTML, 11.2k★, 7.7k★ este mês.
- **Repo:** https://github.com/tt-a1i/archify
- **Status atual:** avaliado em 2026-08-10 — **referência futura** (complementa #9 diagram-design e #12 wiretext).
- **Quando valeria:** gerar diagramas de arquitetura/workflow para o Developer (docs ADR do Knowledge Engine) e o Automation (visualização de fluxos).
- **Encaixe:** Developer, Knowledge Engine (docs), Automation.

### 40. OpenCut — alternativa open source ao CapCut (OpenCut-app) — FUTURO (app Fase C)
- **O que é:** a alternativa open source ao CapCut (editor de vídeo). TS, 82.1k★, 20.3k★ este mês.
- **Repo:** https://github.com/OpenCut-app/OpenCut
- **Status atual:** avaliado em 2026-08-10 — **candidato a app nativo Fase C**.
- **Quando valeria:** o workspace Creator (Video) atual é um editor simples; um app de vídeo completo (timeline, efeitos, exportação) seria um app nativo do SO.
- **Encaixe:** Creator (Video), shell do SO (Fase C).

### 41. pi — toolkit de agente IA (earendil-works) — FUTURO
- **O que é:** AI agent toolkit: unified LLM API, agent loop, TUI, coding agent CLI. TS, 86.6k★, 17.1k★ este mês.
- **Repo:** https://github.com/earendil-works/pi
- **Status atual:** avaliado em 2026-08-10 — **referência de arquitetura** para o autonomous-loop.
- **Quando valeria:** estudar o design do agent loop (API unificada de LLM + TUI) para evoluir o `autonomous-loop.cjs`/`ai-router.cjs`.
- **Encaixe:** autonomous-loop.cjs, ai-router.cjs, Developer.

### 42. speech-to-speech — agentes de voz locais com modelos open source (huggingface) — FUTURO
- **O que é:** construa agentes de voz locais com modelos open source. Python, 12k★, 6.2k★ este mês.
- **Repo:** https://github.com/huggingface/speech-to-speech
- **Status atual:** avaliado em 2026-08-10 — **referência futura** para o pipeline de voz.
- **Quando valeria:** evoluir o sistema de voz (STT/TTS/duplex) do desktop para conversa de voz contínua local (turn-taking natural) — complementa o roadmap de voz.
- **Encaixe:** useVoice/tts-router, VoiceOverlay, daemon de voz.

### 43. cangjie-skill — destila conteúdo longo em Agent Skills (kangarooking) — FUTURO
- **O que é:** destila livros, vídeos longos e podcasts em Agent Skills executáveis. Python, 7k★, 4.6k★ este mês.
- **Repo:** https://github.com/kangarooking/cangjie-skill
- **Status atual:** avaliado em 2026-08-10 — **referência de pipeline** para o Knowledge Engine.
- **Quando valeria:** ingestão de conteúdo longo (livros/artigos/vídeos) → skills/docs estruturados no Knowledge Engine; se encaixa com o `pdf_inspect` (#27) para extração de PDFs.
- **Encaixe:** Knowledge Engine, Orun Files.

### 44. orca — ADE para frotas de agentes paralelos (stablyai) — FUTURO
- **O que é:** "Agent Development Environment" para trabalhar com uma frota de agentes paralelos — rode qualquer coding agent com sua própria assinatura, disponível em desktop, mobile e… TS, 41.7k★, 26.2k★ este mês.
- **Repo:** https://github.com/stablyai/orca
- **Status atual:** avaliado em 2026-08-10 — **referência futura** para paralelismo de agentes.
- **Quando valeria:** quando o Agent Hub precisar de execução paralela de agentes (hoje é serial) — os gaps do #17 incluem filas/concorrência.
- **Encaixe:** Agent Hub, autonomous-loop, shell do SO (Fase C).

### 45. hallmark — skill anti-AI-slop de design (Nutlope) — FUTURO (referência)
- **O que é:** skill de design anti-"AI slop" para Claude Code, Cursor e Codex — padrões de qualidade visual para evitar saída genérica. CSS, 23.5k★, 19.4k★ este mês.
- **Repo:** https://github.com/Nutlope/hallmark
- **Status atual:** avaliado em 2026-08-10 — **referência futura**.
- **Quando valeria:** quando o Designer/Developer gerar UI (ou o Agent Designer criar designs no workspace) — minerar os princípios de qualidade visual contra o estilo genérico de IA.
- **Encaixe:** Designer, Developer (skills), Marketing (assets).

### Descartados (não faz sentido) — passada mensal 2026-08-10
- **diegosouzapw/OmniRoute** — gateway de IA (1 endpoint, 290+ providers). Modelo middleman centralizado conflita com a privacidade/local-first do Orun (Ollama + proxy OpenCodeZen já cobrem); não adotar gateway terceiro.
- **1jehuang/jcode** — harness de execução de código "RAM efficient" em Rust. O Orun executa via tools nativas (run_command/workspace) no workspace; não há gap.
- **MoonshotAI/kimi-code** — CLI de coding agent (Kimi Code). Já temos agentes próprios; DeepSeek/Kimi via OpenCodeZen proxy. Não precisamos de outro CLI de agente.
- **agegr/pi-web** — Web UI para o agente pi. É só a interface do #41 (que já é futuro); sem valor isolado.
- **virgiliojr94/book-to-skill** — re-trending do descartado semanal (livro PDF → skill Claude Code). Mantém-se descartado.
- **Shubhamsaboo/awesome-llm-apps** — lista de 100+ apps RAG. Conteúdo de estudo, não adoção.

---

## Regras de curadoria

- **Adotar** = implementado e testado no ecossistema → mover para o Work Log (ORUN_OS_PROMPT.md) e marcar aqui como **adotado (data)**.
- **Reavaliar** = quando surgir uma necessidade concreta que o item resolve — não adotar "porque é legal".
- **Podar** = se um item ficar obsoleto (serviço morto, repo arquivado, substituído por nativo), remover com nota.
- Qualquer agente pode propor itens aqui durante as sessões; o usuário decide a adoção.

# Orun SO — Visão Geral (programas → sistema operacional)

Registro permanente da visão do **SO Orun** (criado em 2026-08-09 a partir da decisão do usuário:
"meu objetivo final é a criação de um sistema operacional; antes quero fazer os programas que serão
incorporados ao SO para deixá-lo completo e profissional").

> Este documento é o **mapa-mãe** do ecossistema. O `roadmap-v1.md` cobre a plataforma interna do
> desktop (módulos 1–7, todos implementados). Este cobre **o que o SO é e quais programas o compõem**.

---

## 1. O que é o SO Orun

O SO Orun **não é um kernel tradicional** (Linux/Windows). É um **sistema operacional baseado em web
e Electron**: um *shell* completo (janelas, barra de tarefas, menu, multitarefa) que hospeda
**programas/apps** construídos pelo ecossistema Orun. O desktop Orun OS (`orun_project`) já é o
embrião desse shell — workspaces plugin-based, avatares, chat, voz, agentes.

```
┌─────────────────────────────────────────────────────────────┐
│                    ORUN SO (shell + apps)                    │
│  ┌──────────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Window Mgr   │  │  Taskbar │  │ Launcher  │  │ Settings│ │
│  └──────┬───────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘ │
│         │               │              │               │      │
│  ┌──────▼───────────────▼──────────────▼───────────────▼───┐ │
│  │          App Container (contrato de skill/plugin)        │ │
│  └──────┬───────────────┬───────────────┬───────────────┬──┘ │
│  ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼──┐│
│  │ OrunVS     │  │  OrunTV    │  │ Orun Shield │  │ OrunHome││
│  │ (dev IDE)  │  │  (mídia)   │  │ (segurança) │  │ (casa)  ││
│  └────────────┘  └────────────┘  └─────────────┘  └─────────┘│
│  + agentes, voz, memória, WhatsApp, agenda, finanças, ...    │
└─────────────────────────────────────────────────────────────┘
          │ compartilham: Supabase + Orun-Core + agents
```

**Princípio:** cada projeto do ecossistema é um **programa** (app) do SO. O SO é a camada que os
hospeda, com janelas próprias, identidade visual única e o Orun (agentes + voz) integrado.

---

## 2. Catálogo de programas do SO

### 2.1 Existentes (base do SO)

| Programa | Projeto/repo | Estado | Papel no SO |
| --- | --- | --- | --- |
| **Orun OS** (shell) | `Desktop\orun-os\orun_project` | v0.6.6 — base madura | O SO em si: 17 agentes, workspaces, voz, WhatsApp/Telegram/Discord, agenda, finanças, saúde, plugins |
| **Orun-Core** | `Desktop\Orun-Core` | v0.1.2 — 60 testes | Kernel compartilhado: `getSupabaseClient`, hub `devices`/`commands`, tipos |
| **Orun Mobile** | `Downloads\orun-monorepo_1\orun-monorepo` | 211 testes | Espelho móvel do SO (chat, agentes, design system) |
| **Orun Home** | `packages/home-app` (monorepo) | APK no tablet | App smarthome (modo local + Home Assistant, satélite `home` do hub) |
| **OrunVS** | `Desktop\OrunVS` | v0.1.1 — VSIX gerado | App de desenvolvimento: IDE (chat IA multi-provider, edição de arquivos, terminal) |
| **OrunTV** | `Downloads\oruntv_2\oruntv` + `Desktop\OrunTV ROBO` | monorepo media + robô streams | App de mídia/entretenimento (Jellyfin+Sonarr/Radarr/Prowlarr/Bazarr/qBittorrent + apps) |
| **Orun Shield** | `Downloads\Orun Shield\orun-security-suite` | 115 testes (não é git ainda) | App de segurança + otimização: 6 pacotes — `orun-shield-core` (ClamAV/VirusTotal/YARA/Sentinela/firewall/quarentena), `orun-sentinela-agent` (IA p/ linguagem natural), `orun-shield-mobile` (Safe Browsing/root/pinning), `orun-system-optimizer` (disco/limpeza com área de espera/atualizações winget/brew/apt), `orun-shield-integration` + `orun-system-optimizer-integration` (cola Electron/React) |
| **Orun Design (Órum)** | `Downloads\Orun Design\orum-project` | Módulos 00–06 (não é git) | Plataforma de criação de sites p/ devs: prospecção (Google Places), gerador de prompt de site/app, campanha WhatsApp semi-automatizada, editor Monaco integrado, contrato, contas/planos (Mercado Pago + modo demo) |

### 2.2 Planejados (para incorporar)

| Programa | Status | Papel no SO |
| --- | --- | --- |
| **Orun Store** | Não existe | Marketplace de apps/skills do SO (contrato de skill já define o formato) |
| **Orun Files** | Não existe | Gerenciador de arquivos (reaproveitar `FileExplorer.tsx` do workspace Developer) |
| **Orun Office** | Não existe | Produtividade: documentos/planilhas (alinhado ao Teacher/Marketing) |
| **Orun Browser** | Não existe | Navegador embutido (reaproveitar `web_fetch`/`web_search` + janela webview) |
| **Orun Music / Media Player** | Não existe | Player (reaproveitar workspaces Creator audio/video + Spotify) |
| **Orun Mail / Agenda** | Parcial | Reaproveitar Google/Gmail/Calendar já integrados no desktop |
| **Orun Identity** | Não existe | Login único do SO (reaproveitar auth do Órum / Supabase auth) |
| **Orun Backup** | Não existe | Snapshots locais + espelho Supabase |

---

## 3. Melhorias recomendadas por projeto (diagnóstico 2026-08-09)

> Diagnóstico feito com inspeção dos 4 projetos na máquina do usuário (OrunVS, OrunTV,
> Orun Shield, Orun Design). Cada item é o "próximo passo" concreto para tirar o projeto
> da metade.

### 3.1 OrunVS (`Desktop\OrunVS`)
1. **Commit das pendências** (primeiro): `.vscodeignore`, `logo.svg`, `package.json`,
   `resources/main.js` modificados + untracked `AGENTS.md`, `esbuild.js`, `icon.png`, `icon.svg`,
   `test-icon.svg`.
2. **Alinhar providers ao ecossistema**: adicionar **opencodezen** (provider primário do desktop);
   remover/desativar **github** (GitHub Models aposentado — HTTP 410). Hoje: gemini/groq/openrouter/
   deepseek/github/hf/ollama.
3. **Testes reais**: `extension.test.ts` tem 459 bytes (vazio). `chatprovider.ts` (77 KB — o core)
   não tem cobertura. Testar a lógica de chat/providers com mock.
4. **Conectar ao ecossistema**: `memory_search`/`rag_search` (memória de longo prazo do desktop) e
   agentes Orun no chat.
5. **Publicar** no VS Code Marketplace (2 VSIX já gerados, nenhum publicado).

### 3.2 OrunTV (`Downloads\oruntv_2\oruntv`)
1. **README na raiz** (não existe nenhum `.md`): documentar monorepo, stack e como rodar.
2. **Scripts raiz**: só `test` (core) e `build:core`. Faltam `typecheck`, `dev`, scripts por app e
   `docker compose up` documentado.
3. **`apps/tizen` sem package.json** — não é workspace. Integrar ou documentar.
4. **Robô de streams (`meu_robote.py`, Desktop\OrunTV ROBO) solto**: integrar em
   `packages/shared-logic`/script do monorepo (URL hardcoded `multicanaishd` hoje).
5. **Cobertura de testes** dos apps (raiz só roda `@oruntv/core`).

### 3.3 Orun Shield (`Downloads\Orun Shield\orun-security-suite`)
1. **Não é git**: `git init` + commit + push (mais avançado dos 4 — 115 testes).
2. **Integrar no `orun-monorepo`** (o `ORUN_ECOSYSTEM_OVERVIEW.md` já define a ordem):
   `shield-core`/`system-optimizer` → `sentinela-agent`/`shield-mobile` → integrações Electron
   (mesclar `preload.ts`, `initializeShield`/`initializeOptimizer` no `main.ts`).
3. **Validação Windows/macOS** (netsh, winget, firewall real, root/jailbreak físico) — a máquina do
   usuário é Windows, ideal p/ winget/netsh.
4. **Secrets via secret store do desktop** (`ORUN_VT_API_KEY`, `EXPO_PUBLIC_SAFE_BROWSING_KEY`,
   `EXPO_PUBLIC_VT_KEY`) — não hardcode.
5. **Alinhar com agente Cyber Security (Zumbi)** + `semgrep_scan` do desktop (consumir resultados).

### 3.4 Orun Design — Órum (`Downloads\Orun Design\orum-project`)
1. **Não é git**: `git init` + commit + push.
2. **`users.json` → Supabase**: `userStore.js` já suporta; usar o **mesmo projeto compartilhado**
   (`kmfmeewibravdsxemzuj`), não criar um novo.
3. **Mercado Pago real**: `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET` (webhook já
   validado, só faltam os segredos).
4. **Validação ao vivo** via `ROTEIRO-DE-TESTE.md` contra Supabase real.
5. **Uniformizar identidade** com a paleta canônica `premium.tsx` (já é preto+vermelho-sangue).

---

## 4. Inventário de apps do SO (completo)

### 4.1 Apps-base (qualquer SO precisa)
| App | Reaproveita | Status |
| --- | --- | --- |
| **Orun Files** | `FileExplorer.tsx` (Developer) | Planejado |
| **Orun Store** | `skill-manager.cjs` (contrato de skill) | Planejado |
| **Orun Music/Player** | workspaces Creator + `spotify-client.cjs` | Planejado |
| **Orun Browser** | `web_fetch`/`web_search` + webview | Planejado |
| **Orun Office** | Teacher + Marketing agents | Planejado |
| **Orun Mail/Agenda** | Google/Gmail/Calendar do desktop | Parcial |

### 4.2 Apps de ecossistema (só o Orun tem)
| App | Reaproveita | Status |
| --- | --- | --- |
| **Orun Voice/Settings** | voz (wake/TTS/STT) — vira app | Existe no desktop |
| **Orun Agents Hub** | `AgentHubPanel` (17 agentes) | Existe no desktop |
| **Orun Backup** | snapshots locais + Supabase | Planejado |
| **Orun Identity** | auth do Órum / Supabase auth | Planejado |
| **Orun Update** | electron-updater do desktop | Existe no desktop |

### 4.3 Infraestrutura (kernel)
- **Orun-Core** já é o kernel (Supabase client + hub `devices`/`commands`) — todo app deve usá-lo.

---

## 5. Arquitetura (como os programas viram SO)

1. **Shell** (Electron): janelas, barra de tarefas, menu iniciar, multitarefa, snap. O desktop atual
   evolui para isso — workspaces já são "apps em tela cheia"; falta o gerenciador de janelas com
   múltiplos apps simultâneos.
2. **App Container**: o contrato de skill/plugin do desktop (`electron/skill-manager.cjs`) é o formato
   de app do SO. Um "programa" do SO = uma skill registrada, com permissões declaradas.
3. **Shared core**: `Orun-Core` (Supabase client + hub devices/commands) é o kernel; todo programa
   usa o mesmo banco compartilhado e os mesmos agentes.
4. **Identidade**: paleta premium (preto + vermelho sangue `#C3002F`), LogoIA, HomeHampton — padrão
   já definido em `premium.tsx`/`theme.css`.

---

## 6. Fases de construção (ordem proposta)

### Fase A — Completar os programas em andamento (atual)
> Objetivo: nenhum programa "na metade". Os projetos inacabados viram apps prontos.

1. **OrunVS** → v0.2.0: commitar mudanças pendentes, alinhar providers com o desktop
   (opencodezen/groq/openrouter — hoje tem gemini/groq/openrouter/deepseek/github/hf/ollama),
   publicar no marketplace.
2. **OrunTV** → v1.0: terminar apps (dashboard/desktop/mobile/tizen), rodar a media stack,
   integrar o robô de extração de streams (`meu_robote.py`).
3. **Orun Shield** → já tem motor completo (115 testes) — falta: inicializar git, integrar no
   `orun-monorepo` (ordem: shield-core/system-optimizer → sentinela-agent/shield-mobile →
   integrações Electron, mesclar preload.ts, `initializeShield`/`initializeOptimizer` no main).
4. **Orun Design (Órum)** → Fase 1 do MVP pronta (módulos 00–06): falta git, Supabase no
   userStore (hoje JSON), configuração real Mercado Pago (hoje demo) e validação ao vivo.
5. **Orun Home** → fechar ciclo satélite `home` (sendCommand + heartbeats validados).

### Fase B — Shell do SO
> Objetivo: o desktop vira um gerenciador de janelas com múltiplos apps rodando juntos.

1. Window manager (mover/redimensionar/snap/mínimo/máximo de apps em janelas).
2. Barra de tarefas + menu iniciar (launcher de apps do SO).
3. Roteamento app↔agente: cada app conhece seu agente (mapa já existe: `AGENT_PLUGIN_MAP`).

### Fase C — Apps nativos incorporados
> Objetivo: os programas externos viram apps DO shell.

1. OrunVS e OrunTV e Orun Shield como apps nativos (janela própria dentro do shell).
2. Orun Files, Orun Store, Orun Music/Browser (primeiros apps novos nativos).

### Fase D — Distribuição
> Objetivo: SO instalável como produto.

1. Build único instalável (Windows/macOS/Linux) que já inclui os apps.
2. Orun Store como canal de instalação de apps/skills.
3. (Futuro distante, opcional) boot image estilo ChromeOS/Fedora — **não é meta agora**.

---

## 7. Prioridade recomendada

Curto prazo: **Fase A** — completar o que existe: **OrunVS → OrunTV → Orun Shield (git + integração) → Orun Design (git + Supabase + validação)**.
Médio prazo: **shell do SO** (Fase B).
Longo prazo: apps nativos + Store (Fases C/D).

Motivo: o SO só é "completo e profissional" se os programas que ele hospeda estiverem prontos.
O shell é construído depois que os apps existem (evita construir janelas vazias).

---

## 8. Riscos / decisões registradas

- **Risco (OrunTV)**: extração de streams pode esbarrar em DRM/ToS de sites terceiros. Decisão:
  o robô extrai HLS/mpd/mp4 de fontes abertas; para conteúdo protegido, usar Jellyfin com
  biblioteca própria (Sonarr/Radarr) em vez de scraping.
- **Decisão**: SO é web/Electron, **não** kernel Linux. Kernel próprio fica fora do escopo.
- **Decisão**: programas são construídos primeiro, shell depois.
- **Decisão**: Orun Home já é um app do SO (satélite `home` no hub).
- **Regra de trabalho**: nunca matar/alterar a instância do app rodando do usuário.
- **Migrações/validação**: sempre via scripts isolados (temp) e remover depois; Supabase
  compartilhado `kmfmeewibravdsxemzuj`.

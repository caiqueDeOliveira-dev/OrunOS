# Orun OS — Complete System Prompt

## Objetivo: o SO Orun

O objetivo final do usuário é transformar o ecossistema Orun em um **sistema operacional completo e profissional — o SO Orun**. É baseado em **web/Electron** (um shell com janelas, taskbar e launcher que hospeda os programas do ecossistema), NÃO um kernel Linux. Documento-mãe: `orun_project/docs/so-orun-roadmap.md`.

Ordem de fases: **A** = completar os projetos na metade (OrunVS → OrunTV → Orun Shield) → **B** = shell do SO (window manager/taskbar/launcher) → **C** = apps nativos incorporados → **D** = distribuição (build único + Orun Store). Todos os apps usam o mesmo Supabase compartilhado (`kmfmeewibravdsxemzuj`). O desktop (este projeto) é a referência/base e o shell futuro do SO.

## Overview
Orun OS is a **desktop AI operating system** built with Electron + React + Vite. It runs as a native Windows/macOS/Linux app, featuring a multi-agent AI system with autonomous tool-calling, WhatsApp/Telegram/Discord/Email integrations, voice interaction (TTS/STT/wake word), social media publishing, Google Calendar/Gmail sync, Spotify control, and a plugin-based workspace system. Part of the **Orun ecosystem** (desktop + mobile monorepo + Orun-Core + Supabase shared project); the desktop is the reference base for all of them.

- **Version**: 0.6.19
- **Stack**: Electron 31, React 18.3, Vite 6, Tailwind CSS 4, TypeScript
- **AI Providers**: OpenCodeZen (primary), Groq, OpenRouter (fallback chain); Ollama local-only; GitHub Models retired (410); DeepSeek/PaLM reachable via OpenCodeZen proxy; **Orun AI Router** integrado (dashboard + API REST)
- **DB**: SQLite (local) + Supabase/PostgreSQL (cloud sync, push-first, same shared project used by mobile/core: ref `kmfmeewibravdsxemzuj`)
- **Language**: Portuguese (pt-BR) default, English/Spanish/French supported
- **Tests**: 1070 passed / 9 skipped (59 test files)
- **Repo**: all code in `orun_project/` subdirectory
- **Docs**: `docs/roadmap-v1.md` (plataforma), `docs/voice-roadmap.md` (voz), `docs/so-orun-roadmap.md` (visão SO) — curados, atualizados por sessão

---

## Ecossistema de Projetos Orun

O objetivo final do ecossistema é o **SO Orun** (ver `orun_project/docs/so-orun-roadmap.md`): um sistema operacional completo e profissional baseado em web/Electron (shell com janelas/taskbar/launcher hospedando os programas do ecossistema), NÃO um kernel Linux. Ordem de fases: **A** = completar os projetos na metade (**OrunVS → OrunTV → Orun Shield**) → **B** = shell do SO → **C** = apps nativos incorporados → **D** = distribuição (build único + Orun Store).

Todos os apps usam o **mesmo Supabase compartilhado** (`kmfmeewibravdsxemzuj`) e o mesmo conjunto de agentes/prompts.

### Catálogo de projetos

| # | Projeto | Status | Caminho | Stack | O que é |
|---|---------|--------|---------|-------|---------|
| 1 | **Orun OS (desktop)** | **v0.6.19** — referência/base | `C:\Users\Caiqu\OneDrive\Desktop\orun-os\orun_project` | Electron 31, React 18.3, Vite 6, Tailwind 4, TS | App desktop multi-agente, workspace plugin-based, WhatsApp/Telegram/Discord, voz, Spotify, n8n, sync Supabase |
| 2 | **Orun Mobile (monorepo)** | ativo — whatsapp-baileys em Docker | `C:\Users\Caiqu\Downloads\orun-monorepo_1\orun-monorepo` (branch `master`) | Expo/React Native, Supabase, Deno Edge Functions | App mobile (expo-router), `whatsapp-baileys` (Docker), `supabase-sync`, ai-relay/telegram/whatsapp webhooks |
| 3 | **Orun-Core** | v0.1.2 — 60 testes | `C:\Users\Caiqu\OneDrive\Desktop\Orun-Core` | TypeScript | Core compartilhado: `getSupabaseClient` (transport WebSocket p/ Electron), hub `devices`/`commands`, satélites (`home`, `tv`, `shield`) |
| 4 | **OrunVS** | **v0.3.7** — 14 arquivos com falha (sem testes rodando) | `C:\Users\Caiqu\OneDrive\Desktop\OrunVS` | VS Code extension, TS | Extensão VS Code com chat IA multi-provider (OpenCodeZen/Gemini/Groq/OpenRouter/DeepSeek/HF/Ollama), fallback chain, memória local, skills, **client MCP stdio + catálogo on-demand** |
| 5 | **OrunTV** | v0.1.0 — sem git | `C:\Users\Caiqu\Downloads\oruntv_2\oruntv` | Jellyfin + Sonarr/Radarr/Prowlarr/Bazarr/qBittorrent; apps dashboard/desktop/mobile/tizen; packages core/shared-logic | Media stack completo |
| 6 | **Orun Shield** | **v0.3.2** — app separado, commitado | `C:\Users\Caiqu\OneDrive\Desktop\Orun Shield\orun-security-suite` | 5 pacotes TS (shield-core, sentinela-agent, shield-mobile, system-optimizer) + orun-shield-app | Suíte de segurança (proteção, otimização, monitoramento) — app standalone Electron |
| 7 | **Orun Home (home-app)** | ativo — APK via EAS | `packages/home-app` no monorepo | Expo SDK 54, RN, expo-router, zustand, supabase-js | App tablet smarthome (landscape): dashboard, dispositivos, cenários, automações, assistente (agente Home IA), satélite `home` do hub; HA opcional |
| 8 | **Orun Auth (@orun/identity)** | **v0.1.0 — integrado no desktop (vendored)** | `C:\Users\Caiqu\OneDrive\Desktop\Orun Auth\Orun Auth\packages\identity` + vendored em `orun_project/vendor/orun-identity/` | TS (pacote puro), vitest, Deno Edge Functions | Camada centralizada de identidade/auth do ecossistema: sign in/up/out, OAuth, magic link, refresh, storage seguro, SessionRegistry multi-device, Turnstile, billing Stripe, licenciamento offline (JWT), MFA/TOTP, audit log, LGPD, passkeys (beta). 5 Edge Functions deployadas. **Integrado no desktop (v0.6.10+)** — auth gate, login/signup, licença, LGPD |
| 9 | **Orun Files** | **bruto (v0.1.0) — sem git** | `C:\Users\Caiqu\OneDrive\Desktop\orun-files\orun-files` (+ zip em `Downloads\orun-files.zip`) | Electron, JS puro, Gemini API (`text-embedding-004` + `gemini-2.0-flash`), electron-store, chokidar | Gerenciador de arquivos com IA: busca semântica (embeddings + cosseno, fallback textual), organização automática, preview universal, indexação com chokidar |
| 10 | **Orun Design** | **não encontrado** | `C:\Users\Caiqu\Downloads\Orun Design\orum-project` | Backend Node + frontend HTML/CSS/JS puro | Diretório não encontrado na última varredura (pode ter sido removido) |
| — | **Orun TV / Orun Shield (roteiro original)** | adiado | — | TBD | Adiado "pra depois" — **reaberto** pela visão SO (OrunTV e Orun Shield voltaram como projetos ativos) |

> **Nota**: Orun Auth e Orun Files estão **bruto** (v0.1.0, entregues via zip) — o código existe e é funcional, mas **precisa de refinamento**: integração nos apps reais (Auth), extração de conteúdo + batching + undo + empacotamento (Files), alinhamento de identidade visual e de API keys com o restante do ecossistema.

---

## Architecture

### Main Process (`electron/main.cjs`)
Entry point that initializes: SQLite DB, AI router, WhatsApp/Telegram/Discord bots, Google OAuth, Spotify client, n8n bridge, scheduler, plugin system, webhook receiver, Python child processes (wake word, Piper TTS, Whisper STT), auto-updater, tray icon, and ~1100 lines of IPC handlers. All IPC is registered in `main.cjs` directly (not in separate handler files — except Google, media, settings, data, AI, update, Spotify, Discord handlers which are in `electron/ipc/`).

### Preload (`electron/preload.cjs`)
Exposes `window.orun` to the renderer with namespaced APIs: `orun.ai`, `orun.settings`, `orun.db`, `orun.whatsapp`, `orun.telegram`, `orun.google`, `orun.spotify`, `orun.socialMedia`, `orun.shell`, `orun.plugins`, `orun.mcp`, `orun.files`, `orun.evidence`, `orun.notifications`, `orun.speech`, `orun.ipc`, `orun.audio`, `orun.waAutomation`, `orun.career`, `orun.aiRouter`.

### React App (`src/app/`)
- **Entry**: `src/main.tsx` → `<App />`
- **App.tsx**: Splash → Boot → Home phases with providers (I18nProvider, ThemeContext, ToastProvider)
- **HomeScreen.tsx**: Main hub with 25+ lazy-loaded panels, sidebar navigation, chat view, workspace view, command palette, keyboard shortcuts. Central screen shows the `HomeHampton` avatar with the Orun LogoIA on a radial glow.
- **State**: React hooks (useChat, useVoice, usePanelNavigation, useTTS, useVoiceSettings, useKeyboardShortcuts, usePersonalization) — no external state library (no Redux/Zustand)
- **Styling**: `src/styles/theme.css` with CSS variables (e.g., `var(--card)`, `var(--border)`, `var(--foreground)`). Dark theme is **premium black + blood red** (`.dark` block: bg `#050505`, card `#141414`, primary `#C3002F`, border `#252525`, sidebar `#08080A`); light theme kept. Theme switching via `.dark`/`.light` class on `<html>`.
- **Workspace design system**: `src/app/plugins/workspaces/premium.tsx` — shared premium components/palette (P) + Tailwind utility classes (`ws-*`, `ws-card`, `ws-button`, etc.) used by the 16 workspace plugins. Brand updates go here + `theme.css`.

---

## Agent System

### Agent List (defined in `src/app/constants.ts`)
19 agents, each with a dedicated prompt in `electron/agent-prompts.cjs`:

1. **Hampton** — Main AI, autonomous loop (up to 15 tool iterations). Central coordinator.
2. **Developer** (Rebouças) — Code review, development, technical guidance
3. **Designer** (Abdias) — Image generation (Fal AI / Fooocus local) & 3D design
4. **Creator** (Pixinguinha) — Audio & video production
5. **Health** (Juliano) — Health, nutrition & fitness tracking
6. **Finance** (Conceição) — Financial tracking & analysis
7. **Teacher** (Firmina) — Educational assistant
8. **Marketing** (Machado) — Social media marketing (Buffer API + n8n)
9. **Automation** (Sônia) — n8n & workflow automation
10. **Automotive** (Teodoro) — Vehicle management & maintenance
11. **System** (Milton) — System diagnostics, PowerShell health checks
12. **Juridico** (Luiz Gama) — Legal document assistant (Brazilian law)
13. **AssistenteTecnico** (João Cândido) — Technical support
14. **Suporte** (Lélia) — General support
15. **Personal Assistant** (Carolina) — Scheduling, reminders, WhatsApp-integrated assistant
16. **Home IA** (Dandara) — Home automation & control (workspace `HomeIA`)
17. **Cyber Security** (Zumbi) — Security diagnostics & hardening (workspace `CyberSecurity`)
18. **CaOS Commander** (Lobo 🐺) — Bot Discord management, Palworld server, Tropa do CaOS
19. **Carreiras** (Irene) — Job search, resume optimization, LinkedIn profiles

### AI Router (`electron/ai-router.cjs`)
Routes requests through providers with fallback chain: **OpenCodeZen → Groq → OpenRouter** (GitHub Models removed — retired with 410 brownout). Supports streaming, tool-calling (OpenAI function-calling format), tool-use loop, rate limiting, token counting, and `reasoning_content` passthrough (DeepSeek thinking-mode requirement).

### Agent Model Selection (`electron/main.cjs`)
- `AGENT_RECOMMENDED_MODELS` maps each agent to `{ provider, model }` (e.g. `Juridico`/`Developer` → `opencodezen/big-pickle`).
- `resolveAISettings(agentId)` prefers a persisted DB override from `settings.agentModels` (table `%APPDATA%\Orun OS\orun-os.sqlite3`) over the code map — **DB override wins**; update the DB row to change a model (keychain/persisted values survive code edits).

### Platform Modules (Módulos 1–6 do `docs/roadmap-v1.md`, implementados)
- **Skill Manager** (`electron/skill-manager.cjs`, IPC `skills:*`): contract v1 — manifest (id/version semver/permissions/dependencies/compat), topological load order, `installFromDir`/`uninstall`/`setEnabled`/`reload`/`surfaceTools`, path-traversal guard. UI pending.
- **Memory Engine** (`electron/memory-engine.cjs` + `memory-supabase.cjs`, IPC `memory:*`): local-first JSON + cloud mirror; scopes by agent/project; composite-key upsert; embeddings (nomic-embed-text via `rag.getEmbedding`) with cosine search + textual fallback; `<memorias_relevantes>` block injected into `ai:chat`/`ai:chat-stream` system prompt; `consolidate()` daily; pgvector migration `0008` applied to real Supabase.
- **Knowledge Engine** (`electron/knowledge-engine.cjs` + `knowledge-supabase.cjs`, IPC `knowledge:*`): auto-generated docs hub (changelog via `git log`, diário, ADR) local + cloud; migration `0009` (table `documents`). Obsidian is **not** the source of truth (user doesn't use it; deferred).
- **Planner Engine** (`electron/planner-engine.cjs` + `planner-supabase.cjs`, IPC `planner:*`): serial orchestrator — goal → LLM plan → subtasks with dependencies → `executeNext` → `review`; UI `PlannerPanel.tsx`; migration `0010` (table `planner_tasks`).
- **Agent Hub** (`electron/agent-hub.cjs`, IPC `agent-hub:*`): unified agent schema `(persona, tools, memory scope, permissions)` derived from `DEFAULT_PROMPTS` + `AGENT_TOOL_PERMISSIONS`; serial delegation Central → specialist → escalate with step trace; UI `AgentHubPanel.tsx`.
- **Analytics** (`electron/analytics.cjs`, IPC `analytics:*`): aggregates what the app already logs — new persistent `app_events` table + real system metrics (CPU/RAM/disk via `os`+`fs.statfsSync`, no `Math.random()`), instrumented in `ai:chat`, `planner:*`, `agent-hub:delegate`, `skills:install`, `knowledge:save`; UI `AnalyticsPanel.tsx`; migration `0011` applied.

### Autonomous Loop (`electron/autonomous-loop.cjs`)
Hampton's tool-calling loop: up to 15 iterations, tool results fed back into context, `reasoning_content` preserved on assistant messages, timeout 120s per iteration (was 60s), transient errors (timeout/429/5xx/network) retry on the SAME provider before switching. Detects when tools produce images/files and re-inserts them as attachments.

### Tool System
~20+ tools defined in `electron/tools.cjs`: `generate_image` (Fooocus local first, Fal AI fallback), `generate_3d`, `generate_video`, `generate_music`, `web_search` (Tavily), `web_scrape`, `create_reminder`, `get_agenda`, `create_event`, `delete_event`, `list_emails`, `send_email`, `save_file`, `read_file`, `run_command`, `publish_to_social`, `read_memory`, `save_memory`, `execute_n8n`, `report_bug`.

Tools are **individually assigned** to agents via `agentTools` map in `main.cjs`. Each agent gets only its permitted tools.

**File-path resolution**: `write_file`/`edit_file`/`read_file`/`list_files`/`search_*`/`run_command` resolve relative paths against the **developer workspace** (`settings.developerWorkspace`, default `Desktop\hello`), not `process.cwd()` — via `getWorkspaceDir()`/`resolveAgentPath()` in `tools.cjs`. Every prompt instructs agents to create files under `{DEVELOPER_WORKSPACE}` and reply briefly with the path (no full code in chat).

**Agent→workspace scoping**: `AGENT_WORKSPACE_SCOPE` + `checkWorkspaceScope()` (tools.cjs) — agents may only `open_workspace`/`workspace_action` their own workspace; anything else returns an error. Prevents agents (e.g. Juridico) from writing fabricated files into the Developer workspace.

### Response Cache (`electron/response-cache.cjs`)
In-memory, per `(lastUserMsg, agentId)`, 1h TTL, **not persisted** — restart clears it. `window.orun.ai.cacheClear()` also works.

---

## Communications

### WhatsApp (`electron/whatsapp.cjs` + `whatsapp-handler.cjs`)
- Uses **Baileys 7.0.0-rc13** (WhatsApp Web protocol, not Business API)
- QR code authentication via Electron window or terminal
- Auto-reconnect (15 attempts), session persistence
- Scans all groups on connect via `groupFetchAllParticipating()`
- Routes messages to agents via `agentJids` map (group JID → agent name)
- Image detection: messages with images routed to Health agent for analysis
- Personal Assistant agent processes WhatsApp messages directly (fixed to return `matched` instead of `undefined`)

### WhatsApp Automation (`electron/whatsapp-automation.cjs`)
- Keyword-triggered rules engine (notify/task/summary actions)
- Scheduled broadcasts (with anti-ban protections)
- Daily message cap (45 msg/day), 2-5s random delays between sends
- Rate limit bar in UI
- N8N webhook forwarding

### Telegram (`electron/telegram.cjs`)
- **grammY** bot framework
- Message routing to agents
- QR login for group management

### Discord (`electron/discord-bot.cjs`)
- **discord.js v14**
- Message routing to agents

### Email (`electron/email-service.cjs`)
- Gmail API polling every 60 seconds
- Keyword-based routing: "sistema"/"pc"/"computador"/"windows"/"performance"/"lento" → System agent
- Other keywords route to Finance, Marketing, Health, Developer agents

---

## Google Integration (`electron/google-client.cjs` + `electron/ipc/google-handlers.cjs`)

### OAuth Flow
- User enters Client ID + Client Secret in Settings UI
- Stored in encrypted `secretStore` (Electron `safeStorage`)
- Starts local HTTP server on `http://127.0.0.1:9223/callback`
- Opens browser for user to authorize
- Receives code via callback, exchanges for tokens
- Tokens persisted in encrypted store
- Auto-refresh on expiry (`refresh_token`)

### Scopes
- `gmail.readonly`, `gmail.send`, `gmail.modify`
- `calendar.readonly`, `calendar.events`, `calendar.calendars.readonly`

### Gmail API
- `listMessages()`, `getMessage()`, `sendMessage()`, `replyToMessage()`, `markAsRead()`
- Exposed via `window.orun.gmail.*` in preload

### Calendar API
- `listEvents()`, `createEvent()`, `updateEvent()`, `deleteEvent()`, `listCalendars()`
- Exposed via `window.orun.calendar.*` in preload

---

## Social Media (`electron/social-media.cjs`)

### Buffer API (Primary)
- Direct GraphQL mutations to `api.buffer.com`
- Token: `kQrYXf0l5eMzGhubupK7dLgIXy1kEggK5Z0Awu_7RyR`
- Channel IDs (hardcoded in `buildBufferMutation()`):
  - Twitter: `6a56337980cc80cdcab127ba`
  - Instagram: `6a56336480cc80cdcab126c3`
  - TikTok: `6a56339f80cc80cdcab12992`
- Instagram/TikTok require at least one image/video
- Twitter accepts text-only
- Config stored in settings as `bufferApi: { token, channels: { twitter, instagram, tiktok } }`
- UI for config in SocialMediaPanel.tsx (token + channel ID fields)

### n8n Fallback
- Webhooks at `http://localhost:5678/webhook-test/social-media-{platform}`
- 3 workflows: Instagram, TikTok, Twitter — all execute successfully but n8n's HTTP Request node v4.2 has a bug (`requestOptions.json: false` when `responseFormat` is `"autodetect"`), causing `MutationError` from Buffer
- Direct Buffer calls work perfectly — this is the primary path

---

## Voice System

**Roadmap/status**: `docs/voice-roadmap.md` (Fases 1–5; itens concluídos em 2026-08-04).

### Wake Word
- Python service (`wake_word_service.py`, port 8081, protocol: TCP signal to main) — **working**. VAD adaptativo (EMA floor, RMS > `max(floor*3, threshold)` with default 1e-4), audio peak-normalized (0.9) before Whisper, fuzzy match "ok orun"/"orun"/"hampton" (fixed the crash).
- When wake fires: overlay opens → STT transcribes → `[ai:autonomous] agent=hampton messages=2`. **Known issue**: voice-triggered autonomous requests HANG on iteration 1 (typed requests with larger history work fine) — under diagnosis, do not ship voice-to-Hampton fixes without testing typed path too.

### STT (Speech-to-Text)
- **Local**: Whisper (`stt_server.py`, Flask port 8080, `faster-whisper small`, `threaded=True`) → **Groq** (cloud) → browser fallback (renderer).
- Worklet/noise-suppression feeds the VAD only; recording always uses the RAW stream (WebM from Worklet dest is corrupt/EBML-invalid).

### TTS (Text-to-Speech)
- **Cloud**: ElevenLabs (primary, keyed), Google Cloud TTS, Azure TTS
- **Local**: Piper TTS (port 5002), Edge TTS (gratis, `edge_tts_server.py` port 5003, streaming generator, 16 vozes pt-BR), Kokoro, XTTS, Bark, F5-TTS
- Fallback chain configurable via `ttsFallbackPriority`: `local-first` (`edge→kokoro→piper→bark→xtts→f5tts→clouds`) or `cloud-first`; cloud only tried when a key exists. Fallback applies to ANY primary engine (edge/kokoro down → cloud).
- TTS router in `electron/tts-router.cjs`; engine `edge` added to ENGINES/listVoices/synthesize.

### Voice Daemon (opt-in, `daemon_server.py`)
- Unified single-process daemon: STT (:8080), TTS edge (:5003), wake word (thread, TCP :8081) — replaces the 3 subprocesses. Lazy-loaded subsystems (missing dep → 503, doesn't kill daemon). Enable via `db.setSetting("voiceDaemon", true)` + restart. Default off.

### Frontend Voice
- `useVoice.ts` hook (590 lines): VAD (RMS + **Silero VAD** ONNX provider, fallback RMS), Whisper STT, wake word (browser + Python), noise suppression, conversational mode (auto-mic after AI speaks), **barge-in with 250ms sustained-speech hold** (`sustainedInterrupt`), `echoCancellation: true`.
- `src/app/voice/`: `vad.ts`, `silero-vad.ts`, `audio-clean.ts`, `voice-commands.ts`, `voice-history.ts` (IndexedDB), `whisper-stt.ts`, `noise-suppression.ts`.
- Voice commands with targets: "abra o Telegram" → `voice:open` action routed in HomeScreen.
- Overlay now uses the same `useVoice` + `useChat` + `useTTS` pipeline as HomeScreen (removed duplicate `useVoiceOverlay.ts`); chat honors the active agent via `activeAgent.ts` store.

---

## Database

### SQLite (Local)
- **File**: stored in Electron `app.getPath("userData")` / `orun-data.db`
- **Tables** in `electron/db/core.cjs`: `conversations`, `messages`, `settings`, `usage`, `tts_usage`, `nutrition_log`, `finance_log`, `health_log`, `developer_reviews`, `teacher_progress`, `video_projects`, `image3d_generations`, `music_projects`, plus `app_events` (analytics) and sync outbox
- Domain-specific CRUD in `electron/db/domain.cjs`
- Auto-encrypt DB on app quit, auto-recover on corruption
- Auto-backup (keeps last 3) in `%APPDATA%/Orun OS/evidence/backups/`

### PostgreSQL / Supabase (Cloud)
- Push-first sync, shared project `kmfmeewibravdsxemzuj` (host `aws-0-ca-central-1.pooler.supabase.com`); `DIRECT_URL` in `orun_project/.env` for direct `pg` migration application
- Migrations applied to real DB via `pg` + `DIRECT_URL` (avoids Supabase CLI password): `0008_memory_engine.sql` (pgvector), `0009_knowledge_engine.sql` (`documents`), `0010_planner_engine.sql` (`planner_tasks`), `0011_app_events.sql`
- Sync every 5 minutes (`SYNC_INTERVAL_MS: 300000` in `.env`)
- Adapters (memory/knowledge/planner) are **offline-first**: capability check cached, `rejectUnauthorized: false` for the self-signed cert, `device_id = NULL`/`uid`-uuid shape for cloud rows

---

## Workspace Plugin System

### Registry (`src/app/plugins/PluginRegistry.ts`)
- Central TypeScript registry: `registerPlugin()`, `getPlugin()`, `isPluginEnabled()`, `setPluginEnabled()`
- Agent → Plugin mapping: `getPluginForAgent(agentName)` returns workspace plugin ID
- State (enabled/disabled/active tab/settings) persisted in `localStorage`

### Host (`src/app/plugins/PluginHost.tsx`)
- Lazy-loads workspace component based on plugin ID
- Compatibility checking (`checkCompatibility`)
- Error boundary per plugin
- Tab management (if plugin declares tabs)
- Lifecycle hooks: `onMount`, `onUnmount`, `onActivate`, `onDeactivate`

### 19 Workspace Plugins

| Plugin ID | Agent | Path |
|-----------|-------|------|
| `System` | System | `workspace-system-console/` |
| `Health` | Health | `workspace-health-dashboard/` |
| `Finance` | Finance | `workspace-finance-ledger/` |
| `Developer` | Developer | `workspace-developer-ide/` |
| `Designer` | Designer | `workspace-designer-image/` |
| `Marketing` | Marketing | `workspace-marketing-studio/` |
| `Teacher` | Teacher | `workspace-teacher-whiteboard/` |
| `Creator_Audio` | Creator (Audio) | `workspace-creator-audio/` |
| `Creator_Audio` | Creator (Video) | `workspace-creator-video/` |
| `Automation` | Automation | `workspace-automation-flow/` |
| `Automotive` | Automotive | `workspace-automotive-garage/` |
| `Juridico` | Juridico | `workspace-juridico/` |
| `AssistenteTecnico` | Assistente Técnico | `workspace-assistente-tecnico/` |
| `Suporte` | Suporte | `workspace-suporte/` |
| `PersonalAssistant` | Personal Assistant | `workspace-personal-assistant/` |
| `HomeIA` | Home IA | `workspace-home-ia/` |
| `CyberSecurity` | Cyber Security | `workspace-cyber-security/` |
| `GroupFeed` | WhatsApp Grupos | `workspace-group-feed/` |
| `Career` | Carreiras | `workspace-career/` |

Each workspace has: `index.ts` (registers plugin), a main component, and optionally `*-actions.ts` for registering tool actions.

### Workspace UI (premium redesign)
- All 19 workspaces share the premium dark design system (`src/app/plugins/workspaces/premium.tsx`): consistent palette (black `#050505`/`#0A0A0C`, cards `#141414`, blood red `#C3002F`), `ws-*` typography/utility classes in `theme.css`, shared components (PanelHeader, StatCard, MetricGrid, charts, etc.).
- Workspaces render **full-screen** inside `WorkspaceView.tsx`; a draggable **floating chat bubble** (`src/app/components/FloatingWorkspaceChat.tsx`, LogoIA icon) opens a 340×460 chat panel with mic/input/send wired to the workspace agent.
- Home IA workspace also exports `HomeHampton.tsx` (`{ state, size, image }`), used by the central HomeScreen (230px, `/LogoIA.png`) and by the Home IA workspace itself.

---

## Scheduler (`electron/scheduler.cjs`)
- Uses **node-cron** for cron-based scheduling
- Each agent can have a schedule (cron expression + prompt template)
- Agent-specific prompts: Nutritionist (health goals), Finance (spending analysis), Developer (code review), Teacher (micro-learning), etc.
- System agent: CPU/memory/disk/Windows Update/Defender health checks
- Sends scheduled messages via `deliverAgentMessage()` which reads `agentJids` from WhatsApp settings

---

## Known Issues & Quirks

1. **Voice wake word false positives FIXED (v0.6.18)** — wake_word_service.py now requires unambiguous words ("orun"/"hampton") or prefix+word ("ok orun"); ambiguous phonemes ("oram"/"oren") no longer trigger. Browser matcher mirrors the same rules. Conversational mode has 12s safety window — incomplete turns discard audio. Do not regress without testing 24+ phonetic variants.
2. **Secret store per-app**: dev uses `%APPDATA%\orun-os` (slot `opencodezen` must hold a valid OpenCodeZen key `sk-...`; a previous dev profile had an OpenRouter-format key → 401 `Invalid API key`). Installed app uses `%APPDATA%\Orun OS`. 14 keys copied installed→dev on 2026-08-06.
3. **GitHub Models retired** (HTTP 410 brownout) — removed from all provider chains. Do not re-add.
4. **Groq free tier rate limits** (8k TPM) — 429s when used as primary; OpenCodeZen `big-pickle` is the recommended primary.
5. **OpenRouter** often holds an invalid/expired key in the secret store (401) — it just wastes one fallback hop; re-enter a valid key in Settings → Motor de IA if wanted.
6. **Self-signed cert** on Supabase → adapters use `rejectUnauthorized: false`; sync still may log "self signed certificate in certificate chain" (non-blocking).
7. **Fal.ai `Forbidden`** (key `9c348ed2...` on dev) and **Fooocus `fetch failed`** in `generate_image` — Fooocus (localhost:7865, `C:\Users\Caiqu\Fooocus`) is primary, Fal fallback; Fooocus needs its API running (`iniciar-fooocus-api.bat`).
8. **Silero VAD web fails** in dev (Vite 500 on `ort-wasm-simd-threaded.mjs?import`) → falls back to RMS VAD. Non-blocking.
9. **The close button does NOT quit the app** — it hides to tray (`runInBackground` default true). Minimized window freezes `requestAnimationFrame`/Web Animations API → boot→home transition can stall; check the tray / restore the window before killing processes.
10. **SQLite in Electron**: `better-sqlite3` is Electron-ABI — vitest (Node) can't load it; analytics tests use an in-memory fake db.
11. **`run_command` shell metacharacter guard** blocks commands with shell metacharacters (anti-injection) — may block legit commands.
12. **Agent model override lives in the DB**: `settings.agentModels` overrides `AGENT_RECOMMENDED_MODELS` — to change an agent's model, update the DB row (persisted beats code).

---

## Key Files Reference

### Electron (Main Process)
- `electron/main.cjs` — Entry point, IPC, module init, agent tool permissions
- `electron/preload.cjs` — Context bridge, window.orun API
- `electron/agent-prompts.cjs` — All 19 agent system prompts
- `electron/ai-router.cjs` — AI provider routing with fallback chain
- `electron/autonomous-loop.cjs` — Tool-calling loop
- `electron/tools.cjs` — Tool definitions (~20+ tools)
- `electron/scheduler.cjs` — Cron scheduling for agents
- `electron/whatsapp.cjs` — Baileys WhatsApp connection
- `electron/whatsapp-handler.cjs` — Message routing by agent JID
- `electron/whatsapp-automation.cjs` — Keyword rules, broadcasts, rate limiting
- `electron/google-client.cjs` — Google OAuth, Gmail, Calendar API
- `electron/social-media.cjs` — Buffer API + n8n fallback
- `electron/email-service.cjs` — Gmail polling, email-to-agent routing
- `electron/spotify-client.cjs` — Spotify OAuth + API
- `electron/db/core.cjs` — SQLite schema, CRUD, settings
- `electron/secret-store.cjs` — Encrypted credential storage
- `electron/skill-manager.cjs` — Skill contract v1 (manifest, semver, deps, lifecycle)
- `electron/memory-engine.cjs` / `memory-supabase.cjs` — Memory engine + pgvector cloud mirror
- `electron/knowledge-engine.cjs` / `knowledge-supabase.cjs` — Auto-generated docs hub
- `electron/planner-engine.cjs` / `planner-supabase.cjs` — Serial orchestrator
- `electron/agent-hub.cjs` — Unified agent schema + serial delegation
- `electron/analytics.cjs` — App events + real system metrics
- `electron/ipc/skill-handlers.cjs`, `memory-handlers.cjs`, `knowledge-handlers.cjs`, `planner-handlers.cjs`, `agent-hub-handlers.cjs`, `analytics-handlers.cjs` — IPC for the platform modules
- `electron/career.cjs` — Job search engine (Firecrawl + DuckDuckGo fallback, resume/cover letter generation, profile management)
- `electron/ipc/career-handlers.cjs` — IPC for career module
- `electron/discord-bridge.cjs` — Brain↔Discord bridge (7 tools: discord_status/server_info/channels/roles/plan/apply/archive_game)
- `electron/tropa-modules.cjs` — Tropa do CaOS community modules (jogos, guildas, cargos, painel)
- `electron/palworld-setup.cjs` — Palworld server setup engine (analyze/plan/execute with confirmation)
- `electron/firecrawl.cjs` — Firecrawl API client (scrape, search, setBaseUrl)
- `electron/developer-tools.cjs` — Developer elite tools (gitStatus/gitLog/gitDiff/gitStash/semgrepScan/libraryDocs/runTests/codeReview/ghPr)
- `electron/proactive.cjs` — Proactive events (boot greeting, Spotify watcher, active app watcher)

### React (Frontend)
- `src/app/App.tsx` — Root component
- `src/app/HomeScreen.tsx` — Main hub with all panels
- `src/app/constants.ts` — Agent definitions, isElectron flag
- `src/app/components/SocialMediaPanel.tsx` — Buffer config UI
- `src/app/components/WhatsAppPanel.tsx` — WhatsApp connection + group assignment
- `src/app/components/SettingsPanel.tsx` — Google OAuth + all settings
- `src/app/plugins/PluginRegistry.ts` — Plugin system registry
- `src/app/plugins/PluginHost.tsx` — Plugin host/lifecycle
- `src/app/plugins/workspaces/premium.tsx` — Premium design system shared by the 19 workspaces
- `src/app/components/FloatingWorkspaceChat.tsx` — Draggable floating chat bubble/panel in workspaces
- `src/app/components/PlannerPanel.tsx` — Planner UI (goal → tasks)
- `src/app/components/AgentHubPanel.tsx` — Agent Hub UI (delegation + schema grid)
- `src/app/components/AnalyticsPanel.tsx` — Analytics dashboard
- `src/app/components/SkillsPanel.tsx` — Skill manager UI
- `src/app/components/MemoryPanel.tsx` — Memory management UI
- `src/app/components/AiRouterPanel.tsx` — Orun AI Router dashboard + API REST
- `src/styles/theme.css` — Global theme (`.dark` = premium black + blood red, `ws-*` classes)
- `public/LogoIA.png` — Orun logo (central HomeHampton avatar, sidebar/titlebar/splash icons, floating chat bubble, Electron tray/window icons)
- `src/i18n/translations.ts` — All translations (6300+ lines, 4 languages)
- `src/types/orun.d.ts` — TypeScript type definitions for window.orun
- `src/app/hooks/useChat.ts` — Chat state machine
- `src/app/hooks/useVoice.ts` — Voice recording + STT + wake word

### Infrastructure
- `package.json` — Scripts: `npm run dev` (Vite), `npm run electron:dev` (Vite + Electron), `npm run dist` (build), `npm run typecheck` (tsc --noEmit), `npm test` (vitest run, ~1070 tests)
- `.env` — `DATABASE_URL`, `DIRECT_URL`, `SYNC_INTERVAL_MS`
- `supabase/migrations/001_initial_schema.sql` — PostgreSQL schema
- `.github/workflows/build.yml` — CI/CD for Windows/macOS/Linux
- `docs/roadmap-v1.md`, `docs/voice-roadmap.md` — curados, fonte de verdade dos planos

---

## How to Run
```bash
cd orun_project
npm run electron:dev    # Development (Vite hot reload + Electron)
npm run dist            # Production build
npm run typecheck       # TypeScript check
npm run lint            # ESLint
```

## How to Add a New Agent
1. Add prompt to `electron/agent-prompts.cjs` and `electron/scheduler.cjs`
2. Add to agent list in `src/app/constants.ts` (name, icon, color, desc)
3. Add tool permissions in `electron/main.cjs` (`agentTools` map)
4. Add email routing keywords in `electron/email-service.cjs`
5. Add agent page data in `src/app/components/agentPageData.ts`
6. Create workspace plugin in `src/app/plugins/workspaces/workspace-{name}/`
7. Register in `PluginRegistry.ts` (`AGENT_PLUGIN_MAP`)
8. Add dynamic import in `HomeScreen.tsx` (`WORKSPACE_PLUGINS`)
9. Add agent chart component if needed
10. Add translations in `src/i18n/translations.ts`

---

## Work Log

### 2026-08-10 (tarde) — Trending monthly: passada registrada + AGORA #34 (mattpocock/skills) e #35 (code-review-graph) executados

**Passada mensal (`since=monthly`, 21 repos) registrada** em `docs/skills-mcps-futuro.md` — novos **#34–#45** + descartados mensais; re-trendings (t3code #26, TencentDB #29, reverse-skill #31, book-to-skill) mantidos com status registrado:
- **FUTURO novos**: DeepTutor (Teacher), open-seo (Marketing), worldmonitor (app Fase C), archify (diagramas, complementa #9/#12), OpenCut (app vídeo Fase C), pi (autonomous-loop), speech-to-speech (voz), cangjie-skill (Knowledge Engine), orca (Agent Hub paralelo), hallmark (anti-AI-slop p/ Designer/Developer).
- **Descartados mensais**: OmniRoute (gateway middleman + privacidade), jcode, kimi-code, pi-web, awesome-llm-apps, book-to-skill (re-trending).

**#34 mattpocock/skills ADOTADO (minerado)** — clonado em `%TEMP%\opencode\mattpocock-skills` (35 skills: engenharia/produtividade/misc/in-progress). O que foi para o ecossistema:
- `skills/developer/SKILL.md`: **Code Review** com eixos **Padrões-vs-Spec** (independentes, nunca mesclados) + baseline de **12 smells de Fowler** (pin do diff three-dot; repo documentado vence o baseline; smells = judgement call; pular o que tooling enforça); **Test Generator → TDD red-green** (seams pré-combinados, anti-padrões acoladado-à-implementação/tautológico/slicing-horizontal, **mock só em fronteiras de sistema**, fatias verticais, refactor fora do loop); **Debugging** com gate de **loop red-capable** (sem hipótese antes do comando que reproduz o bug), 3–5 hipóteses falsificáveis ranqueadas (`Se X, então Y`), `[DEBUG-<tag>]` para cleanup, regressão só em **seam correto** (sem seam = o achado), hipótese correta no commit; novas seções **Deep modules** (teste de deleção, interface = superfície de teste, 1/2 adapters, injete dependências) e **Merge conflicts** (resolver por intenção, nunca `--abort`, typecheck→tests→format); spec ganhou **tickets de fatia vertical** + **expand–contract**.
- `electron/agent-prompts.cjs` (Developer): `CODE REVIEW QUALITY` com os dois eixos + 12 smells; novo bloco **`TDD`**; `ENGINEERING DISCIPLINE` debugging reescrito p/ red-capable loop + hipóteses falsificáveis + `[DEBUG-]` + seam correto; spec com fatias verticais + expand–contract.
- `skills/suporte/SKILL.md`: seção **"Engajamento de suporte (método)"** — reproduzir antes de teorizar, triage com verificação da alegação, questionário estruturado (grillar o envio), re-pitch de mensagens confusas, handoff compacto, passos guiados (wizard).
- `skills/assistente-tecnico/SKILL.md`: regras de diagnóstico — reproduzir sintoma, **loop de teste tight** (medição que reproduz o defeito), uma variável por vez, passos manuais um a um.

**#35 code-review-graph ADOTADO (MCP opcional documentado)** — eleva o #20; clonado em `%TEMP%\opencode\code-review-graph` (MIT, Python, v2.3.7). Avaliação: spawn stdio bate com `mcp-client.cjs` (que **não passa `cwd`** → `--repo` obrigatório); Windows first-class (uvx/`uv` instalado); local-only sem API key; grafo SQLite tree-sitter (`build_or_update_graph_tool`). Config documentada em `skills/developer/SKILL.md` (Settings → MCP, **off por default** — processo Python residente): `{ name, command: "uvx", args: ["code-review-graph","serve","--repo",…,"--tools", "build_or_update_graph_tool,get_minimal_context_tool,detect_changes_tool,get_review_context_tool,get_impact_radius_tool,query_graph_tool"] }`; `--tools` exclui `refactor_tool`/`apply_refactor_tool`/`embed_graph_tool` (edição fica nas tools nativas); sem filtro ≈ 8k tokens de descrição. Não substitui `code_review`/`semgrep_scan` — é a camada de *impact tracing* (blast-radius cross-file).

**Verificação**: `node --check` agent-prompts.cjs ✓; typecheck ✓; **npm test 889 ✓ / 9 skipped** (inalterado — mudanças são prompt/skill/docs, sem código de runtime). Docs atualizados: `skills-mcps-futuro.md` (#34/#35 ✅, #20 superado, passada mensal registrada) e este work log.

### 2026-08-10 — PDF inspector (#27) adotado como tool JS + google/skills (#28) verificado e descartado

**#27 firecrawl/pdf-inspector → tool nativa `pdf_inspect`** (heurística em Node puro, sem Rust/CLI):
- `electron/pdf-inspector.cjs` (novo, zero deps): `inspectPdf` classifica **text/mixed/scanned/unknown** (espelha a heurística do pdf-inspector Rust), `hasTextLayer`, páginas (`/MediaBox`), contagem de imagens/fontes, preview; `extractPdfText` extrai texto via regex de operadores `Tj`/`TJ` com decodificação de literais (`\(`, `\)`, `\\`, `\nnn`) e **infla streams FlateDecode via `zlib` nativo**. Limites: 64MB/arquivo, 8MB/stream; filtros não-Flate não decodificados (classificação segue heurística).
- `electron/tools.cjs`: tool def `pdf_inspect` (args `path`, `extract_text`, `text_limit`) + dispatcher com `resolveAgentPath`/`isPathAllowed`; retorna `{ok, classification, pages, imageCount, fontCount, textOps, hasTextLayer, textPreview, text?}`.
- `electron/main.cjs`: `pdf_inspect` adicionado a `AGENT_TOOL_PERMISSIONS.Developer` e `.Juridico` (leitura de PDFs legais).
- `skills/developer/SKILL.md`: cabeçalho + Referência rápida com `pdf_inspect`.
- Testes: `electron/__tests__/pdf-inspector.test.cjs` — **8 testes** (texto puro, FlateDecode comprimido, escaneado sem camada de texto, TJ array, escapes, arquivo ausente/não-PDF). Suite: **889 ✓ / 9 skipped** (era 881); `node --check` ✓; typecheck limpo. Smoke via dispatcher real validado (classificação + extração ponta a ponta).
- **Encaixe futuro:** Orun Files (extração de conteúdo real de PDF) e Knowledge Engine (ingestão) podem chamar `pdf_inspect`/`extractPdfText`. OCR de escaneados continua pendente.

**#28 google/skills → REVISADO, sem adoção**:
- Repo clonado em `%TEMP%\opencode\google-skills` (depth 1): **a premissa do #28 estava errada — o repo NÃO tem skills de Google Workspace** (Gmail/Calendar/Sheets/Docs). Categorias reais: `ads/`, `analytics/`, `cloud/` (SecOps, Vertex AI/Agent Platform, BigQuery, GKE, Firebase). Nada a minerar para o Personal Assistant (integração Gmail/Calendar já via `google-client.cjs`).
- Referência registrada (sem adoção): `skills/cloud/gemini-api/SKILL.md` (padrões de function calling/structured output/embeddings/caching no SDK `@google/genai` — útil p/ `ai-router.cjs`/`rag` no futuro) e `detection-engineering-coverage-evaluation` (SecOps corporativo, fora de escopo).
- `docs/skills-mcps-futuro.md`: #27 → **✅ IMPLEMENTADO**, #28 → **⚠️ REVISADO (sem adoção)**.

### 2026-08-10 — Ferramentas de web upgrçadeadas (Firecrawl) + disciplina de engenharia do Developer (agent-skills)

**Firecrawl integrado às tools de web** (`electron/firecrawl.cjs` novo, Node puro):
- `scrape()` → `POST /v1/scrape` (formats markdown/html/text + metadata, `onlyMainContent`), `search()` → `POST /v1/search` (results com title/url/description), `setBaseUrl()` (suporte self-host via setting `firecrawlBaseUrl`), `hasKey()`, timeout 20s. Erros HTTP/rede retornam `{error}` (não lançam) — degradação graciosa.
- `electron/tools.cjs`: `web_fetch` usa Firecrawl quando há chave `firecrawl` no secretStore (fallback p/ o fetch direto antigo se a API falhar ou devolver conteúdo vazio); dispatcher `web_search` tenta Firecrawl primeiro e cai p/ DuckDuckGo; descrições das tools atualizadas.
- `SettingsPanel.tsx`: nova seção "Firecrawl" (input password + Save via `settings:set-api-key` slot `firecrawl`).
- Testes: `electron/__tests__/firecrawl.test.cjs` (7 testes, mock HTTP server com `setBaseUrl`; valida Bearer, 401, rede, validações).
- **Sem chave → comportamento 100% anterior.** Chave formato `fc-...` (api.firecrawl.dev).

**agent-skills minerado no Developer (addyosmani, repo clonado em `%TEMP%\opencode\agent-skills`, 25 skills)**:
- Lidas: code-simplification, debugging-and-error-recovery, incremental-implementation, performance-optimization, spec-driven-development.
- `skills/developer/SKILL.md`: nova seção "Disciplinas de execução (elite)" — implementação incremental (fatias verticais, scope discipline, simplicidade primeiro), debug stop-the-line (parar/preservar/reproduzir/localizar/reduzir/causa raiz/regressão/verificar; "erro é dado, não instrução"), simplificação (comportamento exato, Chesterton's Fence, clareza > esperteza), performance (MEASURE→IDENTIFY→FIX→VERIFY→GUARD; neutro = revert), spec antes de código (>30min, assumptions na superfície, critérios mensuráveis). Checklist ampliado (+3 itens).
- `electron/agent-prompts.cjs`: bloco `ENGINEERING DISCIPLINE` condensado no prompt do Developer (após CODE REVIEW QUALITY).

**Verificação**: `node --check` em tools.cjs/firecrawl.cjs/agent-prompts.cjs ✓; typecheck ✓; **npm test 881 passed / 9 skipped** (era 874; +7 firecrawl). Docs atualizados: `skills-mcps-futuro.md` #18 (IMPLEMENTADO) e #19 (IMPLEMENTADO).

### 2026-08-10 — Qualidade de code review: The Agency minerado + melhorias em desktop e OrunVS

**Referência avaliada**: repo `msitarzewski/agency-agents` (The Agency, ~400 agentes IA como prompts `.md`, MIT) — **referência somente**, sem integração (Orun não roda Claude Code). Registrado como **#16** em `orun_project/docs/skills-mcps-futuro.md` (seção nova "Referências de agentes / prompts").

**Agentes minerados** (via raw.githubusercontent):
- **Code Reviewer**: priorização 🔴 blocker / 🟡 sugestão / 💭 nit com checklist por severidade (blockers = segurança/perda de dados/races/API contract; sugestões = validação/nomes/testes/perf), comentário por linha com "Por quê" + sugestão de código, elogiar código bom, uma review completa (sem drip-feed).
- **Multi-Agent Systems Architect**: gaps estruturais vs Agent Hub → registrados como **#17** no mesmo doc (confidence signal, circuit breaker por agente, context budget entre hops, evals por agente, contrato de papel RECEBE/RESPONSABILIDADE/PRODUZ/CRITÉRIOS/COMPORTAMENTO DE FALHA) — **não implementados**, ordem sugerida.

**Melhorias aplicadas** (custo zero de runtime, nível prompt/skill):
- `orun_project/skills/developer/SKILL.md` — seção "Code Review (workflow elite)" reescrita: 5 dimensões (correção/segurança/manutenibilidade/performance/testes) + edge cases, convenções e código morto; marcadores 🔴/🟡/💭 com checklist por severidade; formato de comentário concreto ("Por quê" + código); sugerir não exigir; elogiar código bom; uma review completa; perguntar se intenção ambígua; JSON final mantido.
- `orun_project/electron/agent-prompts.cjs` — prompt do Developer ganhou bloco "CODE REVIEW QUALITY" com as mesmas regras (marcadores, formato de comentário, praise, uma review completa, perguntar se ambíguo).
- `OrunVS/skills/code-review/SKILL.md` — mesmo upgrade (5 dimensões + edge cases/convenções/código morto, marcadores de prioridade, formato de comentário "Por quê + Sugestão", elogiar bom código, uma review completa, perguntar se ambíguo). CHANGELOG [Unreleased] atualizado.

**Verificação**: desktop **874 ✓ / 9 skipped** (suíte completa); OrunVS `test:core` **96 ✓**; `node --check` em `agent-prompts.cjs` ✓.

### 2026-08-09 — Mobile: 3 bugs de chat corrigidos + Orun Home sem aparência simulada (monorepo)

**Mobile-app — bugs do chat** (`packages/mobile-app`):
- **Scroll subindo/descendo**: auto-scroll disparava por `messages.length` (mudava ao carregar histórico) + FlatList sem `maintainVisibleContentPosition` + slicing `displayedMessages` com `displayCount` inconsistente. Fix em `app/(tabs)/chat.tsx` e `app/chat/[agentId].tsx`: removidos `PAGE_SIZE`/`displayCount`/`displayedMessages`; auto-scroll por `lastMessageIdRef` (só quando a última msg muda e usuário está no fim); `maintainVisibleContentPosition={{ minIndexForVisible: 0 }}`; `onEndReached={loadMore}`; `ListHeaderComponent` com botão "Carregar mais" (sem contagem restante).
- **Chat cortado na metade**: `NeonBackground` era fechado antes do FlatList/ChatInput (ficavam fora do fundo). Fix: fundo envolve header + FlatList + ChatInput + modais.
- **"Barra de mudo" sobreposta**: não existe — grep `mudo|mute|silenc` sem resultados no mobile-app; `ChatInput` não tem botão mudo; as barras eram o `ListHeaderComponent` e a barra de erro do `ProviderPicker` (corrigidas junto).
- `MarkdownRenderer.tsx:250`: `JSX.Element[]` → `React.ReactElement[]` (erro TS2503 com React 19). Typecheck ✓ + mobile **117 testes ✓**.

**Orun Home "profissional/pronto"** (`packages/home-app`) — sem Home Assistant (usuário não tem HA; PC não pode ser HA):
- `HomeConfig.mode: "local" | "ha"` (removido `"simulated"`); default = **local (tablet/satélite = fonte de dados)**.
- `homeStore.ts`: `normalizeConfig()` migra config persistida antiga (`simulated`→`local`); `saveConfig` não força `simulated`; `connected` só em modo `ha`.
- `homeAssistant.ts`: `testConnection` seta `mode:"ha"` + `connected` (não reverte para simulado).
- `index.tsx` (dashboard): subtítulo por fonte ("Controlado por este tablet via satelite Orun" / "Conectado ao Home Assistant"). `dispositivos.tsx`: badge "Local"/"Home Assistant"/"HA sem conexao".
- `sistema.tsx`: seção "Fonte de dados" com segmented **Local (tablet)**/Home Assistant; modo local mostra card explicativo (HA = integração avançada e opcional); host+token+"Salvar e testar" só no modo HA. Alertas sem texto "simulado".
- Contrato satélite (`executeCommand`) intocado — não referencia `config.mode`. Typecheck home-app ✓ (sem suite de testes própria).

### 2026-08-09 — Orun Home (tablet smarthome): pacote `home-app` no monorepo + APK via EAS Build

**App tablet smarthome criado** — novo pacote `packages/home-app` no monorepo (`C:\Users\Caiqu\Downloads\orun-monorepo_1\orun-monorepo`), espelho do workspace Home IA do desktop:
- **Stack**: Expo SDK 54, React Native, expo-router, zustand + AsyncStorage (estado local simulado), supabase-js, expo-screen-orientation, @react-native-community/slider.
- **Tema**: paleta `P` portada do `premium.tsx` do desktop (`src/theme/premium.ts` — bg `#050505`, primary `#C3002F`, etc.).
- **Estado**: `homeStore.ts` — 4 cômodos/17 dispositivos mock, 4 automações, 4 cenas; ações toggle/setBrightness/setTemperature/lock/runAutomation/activateScene.
- **Serviços**: `satelliteController.ts` (satélite `home` do hub — heartbeat 30s + poll 5s, executa as 9 ações do contrato desktop, fallback offline), `homeAssistant.ts` (REST opcional), `chatService.ts` (agente Home IA via ai-relay, seed `0005`), `supabaseClient.ts`, `authStore.ts`.
- **7 telas**: dashboard (3 colunas), dispositivos, cenários, automações, assistente (chat Home IA), sistema (config HA + status satélite + trava landscape), +not-found. Landscape fullscreen (trava runtime) — decisão do usuário.
- **Hub estendido**: Orun-Core ganhou `home` em `DeviceType`/`SatelliteTarget`/`SATELLITE_ACTIONS` + migration `0007_ecosystem.sql` com checks `'home'` (bloco idempotente). Migration **`0012_home_satellite.sql`** (supabase-sync) **aplicada no banco real** — checks validados, upsert device `home` + command `target='home'` OK.
- **Verificado**: home-app typecheck ✓, Orun-Core 60 testes ✓ + dist regenerado, supabase-sync/whatsapp-baileys ✓.

**APK gerado via EAS Build** — `eas init` criou o projeto `@caique.o.castaldeli.dev/orun-home` (id `1426e091-0702-47ad-9703-482e85529e2c`); `eas.json` espelhando o mobile-app (profile `preview` injeta `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`); `app.config.ts` ganhou `extra.eas.projectId`. Build Android preview **FINISHED** (~11 min, keystore em cloud). **APK baixado: `C:\Users\Caiqu\Downloads\orun-home-preview.apk` (73,48 MB)** — instalar no tablet via "fontes desconhecidas". Package `com.orun.home`, expira 2026-08-23.

**Pendências**: validação ao vivo no tablet (landscape, chat Home IA, `sendCommand({target:"home",...})` do desktop/mobile com heartbeats em `devices` + ack em `commands`).

### 2026-08-08 — Voz: TTS edge no dev, STT Groq-first e Proatividade (saudação de boot + reação ao Spotify)

**TTS habilitado no profile dev** (por isso Hampton só respondia por texto): o DB dev tinha `tts = NULL`. Script temp setou `tts = {"engine":"edge","voiceId":"pt-BR-FranciscaNeural","enabled":true}` e `voice = {"responseDelay":3500,"conversational":true}` nos DBs dev (`%APPDATA%\orun-os`) e instalado (`%APPDATA%\Orun OS`). Edge TTS já roda na 5003.

**STT invertido (Groq-first)** — `src/app/hooks/useVoice.ts`: tenta `window.orun.stt.transcribeGroq` (whisper-large-v3-turbo) ANTES do Whisper local (faster-whisper small em CPU, lento) e do browser. Sem key Groq → falha rápido → fallback local. Também corrigido erro de typecheck `TS2448` (`cfg` usado antes de declarar): `const cfg = configRef.current.whisperConfig` movido para antes do bloco Groq.

**Proatividade (novo)** — `electron/proactive.cjs` (novo módulo `createProactiveEvents`):
- **Saudação de boot**: após a janela terminar de carregar + 15s, se `wakeWordEnabled` + TTS configurado + `proactiveGreeting` (default true), envia prompt proativo (Hampton fala e pergunta em que pode ajudar).
- **Watcher do Spotify**: poll `spotifyClient.getPlayback()` a cada 6s; transição `is_playing` false→true dispara prompt ("pergunte o que quer ouvir"). Gate `proactiveSpotify` (default true). Debounce global de 60s entre fontes (evita spam em trocas seguidas de música).
- Wiring: `main.cjs` (`proactive.start({windowLoadedPromise})` no whenReady, `stop()` no before-quit; `sendToRenderer` = show+focus da janela + `voice-overlay:show` + `voice-overlay:proactive`), `preload.cjs` (`voiceOverlay.onProactive`), `App.tsx` (ouve → `proactivePrompt` state → prop no overlay), `VoiceOverlay.tsx` (com prompt proativo envia via `chat.handleSend` em vez de `startRecording`; segundo effect trata prompt chegando com o overlay já aberto — para gravação e envia; modo conversacional reabre o mic após a fala).
- UI: toggles `settingsProactiveGreeting`/`settingsProactiveSpotify` em SettingsPanel (seção Sistema de Voz) + traduções nas 4 línguas.

**Proatividade de apps (novo)** — watcher de janela ativa em `electron/proactive.cjs`:
- **Probe persistente**: processo PowerShell único (spawn `-Command`, stdio pipe) com `GetForegroundWindow()` via Add-Type (user32.dll), responde `ProcessName|MainWindowTitle` a cada "ping"; poll a cada 8s (`APP_POLL_MS`), primeira amostra vira baseline (`appPrimed` — não dispara para o app já aberto quando o watcher inicia).
- **Mapa `APP_PROMPTS`**: code, code-insiders, browser (chrome/msedge/firefox/brave/opera/vivaldi/arc via `PROCESS_TO_KEY`), explorer, terminal (WindowsTerminal/cmd/pwsh), notepad, discord, word (WINWORD), excel (EXCEL), powerpoint (POWERPNT). `resolveAppKey()` exclui o próprio app (`electron`, EXCLUDED_PROCESSES) e Spotify.
- **Gate**: `settingsProactiveApps` (default true); debounce global 60s entre fontes + `APP_DEBOUNCE_MS = 600000` por app (não re-pergunta ao alternar janelas). Mesma `sendToRenderer`/overlay do greeting.
- UI: toggle `settingsProactiveApps` em SettingsPanel + traduções nas 4 línguas.
- Teste: `electron/__tests__/proactive.test.cjs` (5 testes — mapeamento de processos, exclusões, prompts). Probe validado isolado: foreground dev = `electron|Orun OS` (excluído, correto).

**Verificação**: `node --check` nos 3 `.cjs` ✓; typecheck ✓; **npm test 854 passed / 9 skipped** (era 849).

**Pendência**: validação ao vivo (reiniciar Electron: saudação ~15s após abrir; abrir VSCode/navegador → pergunta do Hampton; tocar música no Spotify app → pergunta; STT rápido). Próximos opcionais: rotear voz pelo `useChat` do HomeScreen (eliminar pipeline duplicado do overlay); ajustar VAD do wake para fala natural; abrir o app que disparou a proativa.

### 2026-07-31 — Creator Audio vinyl turntable, Personal Assistant agenda, Developer IDE workspace actions

**Creator Audio (vinyl turntables with scratch-to-rewind)** — `workspace-creator-audio/`
- `DeckPanel.tsx` redesigned: metallic platter ring, spinning vinyl (CSS `vinylSpin` 2.4s linear infinite while playing, `vinylCoast` 9s when loaded/idle), micro-grooves, center label, animated tonearm (rotates onto the record when playing), progress ring around the disc (SVG stroke-dashoffset), LED pulse dot, vinyl sheen, glowing accents.
- Scratch-to-rewind: pointer-drag on the disc itself. `SECONDS_PER_TURN = 3` (full clockwise spin scrubs +3s). Playback auto-pauses on grab and resumes on release if it was playing. Hint text shows "↩ VOLTANDO A MÚSICA / ↪ AVANÇANDO".
- Rotation accumulation fix: angle delta is tracked per-pointermove (wrapped to ±180°/step) and accumulated in `scrubTotalAngleRef` so continuous backward spins keep rewinding instead of "flipping" at ±180° (the old code reset `delta` relative to the start angle after half a turn, which stopped the rewind and reversed it).
- `audio-engine.ts`: new exported `seekDeck(deck, seconds)` — stops the deck source, clamps target to `0..duration-0.05`, sets `offset`, returns `{ success, currentTime, duration }`. **Note:** its return type is annotated explicitly (`{success:true; currentTime; duration} | {success:false; error}`) because TS widens `{ success: true }` object literals to `success: boolean` and breaks `if (res.success)` narrowing.
- `useDJStore` store + `getDeckState`/`playDeck`/`pauseDeck` drive position updates (100ms interval while playing).

**Personal Assistant workspace (calendar/agenda)** — `workspace-personal-assistant/PersonalAssistantWorkspace.tsx`
- Redesigned as a calendar/agenda: month grid with navigation + "Hoje", per-day event dots, day agenda with time-range cards, inline "+ Novo evento" form (9h–10h prefill from selected day) creating via `window.orun.calendar.createEvent`, "Próximos 7 dias" list (click jumps to that day/month), collapsible Gmail section with unread badge and reply flow.

**Developer IDE workspace-first agent actions** — `electron/agent-prompts.cjs`, `workspace-developer-ide/`
- Developer prompt rewritten: agent must call `open_workspace(workspace='developer')` then `workspace_action(workspace='developer', action='write_file'|'read_file'|'list_files'|'execute_command')` so files land in the IDE Explorer and command output in the IDE Terminal. Chat replies must be brief (1–3 lines). Direct tools (`write_file`/`edit_file`/`run_command`) are fallback only.

**Workspace routing / scroll fixes**
- `electron/tools.cjs`: `validWorkspaces` now includes `juridico`, `assistente-tecnico`, `personal-assistant`, `suporte`; `open_workspace` + `workspace_action` + `generateImage` + `runCommand`/`isCommandSafe` + audit log.
- `src/app/HomeScreen.tsx` `workspace:open` PLUGIN_MAP: `juridico→Juridico`, `assistente-tecnico→AssistenteTecnico`, `suporte→Suporte`, `personal-assistant→Personal Assistant`.
- Scroll pattern to follow (Health workspace, `HealthWorkspace.tsx:45`): `flex flex-col h-full overflow-y-auto ws-scrollbar`. AssistenteTecnico root already has `overflow-y-auto` — verify the parent height chain. Juridico still needs the fix.

**Renderer error logging (new)**
- `electron/preload.cjs`: forwards `window.onerror` and `unhandledrejection` to main via `renderer:error` IPC.
- `electron/main.cjs`: `ipcMain.on("renderer:error", ...)` logs to `main.log` (max 2000 chars). Use this to diagnose UI crashes (e.g., Settings not opening, workspace errors) instead of guessing.

**Open items being worked on (after this entry)**
- AssistenteTecnico workspace shows a runtime error (error boundary screen) — root cause pending, use the new `[renderer]` log lines to capture it.
- Settings panel not opening — same approach, capture `[renderer]` errors.
- `main.log` currently noisy with `[wake] Missing Python packages: sounddevice/numpy/requests` every ~1s; suppress when wake word is disabled.

### 2026-07-31 (late) — Juridico agent fixed: legal advice now answered, no tool-echo, no fake evidence

**Root cause of "Juridico only echoes tool XML / fails"**
Reproduced via CDP (`window.orun.ai.chat` with agentId `"Juridico"`). The llama-3.3-70b model on groq was emitting tool syntax as literal text (`<open_workspace>`, `<write_file>`, `<workspace_action>` tags), and the autonomous loop then failed through a cascade:
1. `open_workspace` tool schema in `electron/tools.cjs` only listed 11 workspace IDs — `juridico`, `assistente-tecnico`, `personal-assistant`, `suporte` were missing → Groq returned HTTP 400 `tool call validation failed ... value must be one of "creator-audio", ...` → provider fallback chain → final error.
2. Juridico workspace registers **no actions** (`workspace-juridico/` has only `index.ts` + `JuridicoWorkspace.tsx`) → `workspace_action` returned `Workspace "juridico" not in registry`.
3. `memory_save` threw `AggregateError` mid-loop.
4. The model also **invented fake evidence files** (`ronda_1.txt`, `ronda_1.jpg`, ... under `Desktop\evidencias\`) during tests — unacceptable for a legal-use agent.

**Fixes applied**
- `electron/tools.cjs` (~line 504): added `juridico`, `assistente-tecnico`, `personal-assistant`, `suporte` to the `open_workspace` tool schema enum (execution-side `validWorkspaces` already had them).
- `electron/agent-prompts.cjs` (Juridico section): prompt rewritten to ALWAYS answer legal analysis first — identify the violated right (desvio/acúmulo de função, jornada, periculosidade, equiparação salarial), cite law + article (CLT/CF), list verbas reclamáveis + how to prove (testemunhas, fotos com data/hora), then practical step-by-step + prazos. Forbids echoing the user, forbids literal `<tag>` tool calls, forbids inventing evidence files.
- `electron/main.cjs` `AGENT_RECOMMENDED_MODELS`: `Juridico` → `{ provider: "opencodezen", model: "big-pickle" }` (was groq llama-3.3-70b). big-pickle produces real legal answers with correct CLT citations.
- `electron/main.cjs` `AGENT_TOOLS.Juridico`: removed `write_file` entirely so the agent cannot fabricate evidence files. Now: `read_file, list_files, memory_save, memory_search, rag_search, notify, schedule_task, trigger_agent, web_search, web_fetch, open_workspace, workspace_action`.
- Voice chat now honors the active agent: new `src/app/utils/activeAgent.ts` module store; `src/app/hooks/useChat.ts` syncs `activeAgent` → store; `src/app/hooks/useVoiceOverlay.ts` (~line 163) passes `getActiveAgentStore() || undefined` as agentId (before, voice always routed to Hampton regardless of the agent selected in the chat).

**Verified via CDP (autonomous loop, real user scenario)**
- Juridico now answers with full legal analysis: Lei 7.102/1983 (segurança privada), CLT Art. 456 ("o empregador não pode exigir do empregado serviços estranhos ao contrato"), desvio/acúmulo de função, equiparação salarial, passo a passo para documentar provas e procurar advogado/sindicato.
- Correct real `open_workspace("juridico")` tool call (no more schema 400); `workspace_action` on juridico returns "not in registry" but the loop handles it gracefully.
- No fake evidence files written after `write_file` removal. Test-generated evidence dirs under `Desktop\evidencias\` were cleaned.

**Tests**: `npx vitest run electron/__tests__` → 534 passed, 9 skipped (17 files). `npx tsc --noEmit` clean.

**Open items**
- `workspace-juridico` still registers no workspace actions → `workspace_action(catalogar_evidencia/criar_caso)` returns "not in registry". Consider adding a `juridico-actions.ts` (mirror `workspace-personal-assistant/personal-assistant-actions.ts`) if cataloging real evidence is wanted.
- AssistenteTecnico error boundary + Settings not opening: still not reproduced via CDP; ask the user to reproduce live with `[renderer]` logging active.

### 2026-07-31 (late follow-up) — Real root cause: persisted agent-model override; added agent→workspace scoping

**Root cause of the user still seeing literal `<workspace_action>` tags (after the first fix round)**
- The DB `settings.agentModels` table (`%APPDATA%\Orun OS\orun-os.sqlite3`) had a persisted override `"Juridico": {"provider":"groq","model":"llama-3.3-70b-versatile"}`. `resolveAISettings(agentId)` in `electron/main.cjs:446` prefers this override over `AGENT_RECOMMENDED_MODELS`, so the code change to opencodezen/big-pickle was silently overridden. Log at 20:58:55 confirmed: `[autonomous] iteration 1 provider=groq model=llama-3.3-70b-versatile agent=Juridico`.
- Fixed by updating the DB row directly (Python sqlite3) → `Juridico: opencodezen/big-pickle`. `db.getSetting` reads fresh per request, no restart needed for the value; restart clears the in-memory 1h response cache (a bad response may have been cached under the user's exact message).
- The in-memory response cache (`electron/response-cache.cjs`) is NOT persisted — restart clears it. `window.orun.ai.cacheClear()` also works (needs the renderer/CDP).

**New bypass found during verification (big-pickle): agent wrote a fabricated dossier to the Developer workspace**
- With big-pickle, Juridico correctly answered in text AND wanted to "create the dossier" — but because `workspace-juridico` registers no actions, the model called `open_workspace("developer")` + `workspace_action(workspace="developer", action="write_file", path="juridico/casos/...")`, writing a fabricated `relatorio_inicial.md` (fake date 15/11/2024) to the developerWorkspace dir `C:\Users\Caiqu\OneDrive\Desktop\hello\juridico\casos\...`. The `write_file` tool removal was bypassed via the Developer workspace's `write_file` action (handler `electron/ipc/data-handlers.cjs` `developer:write-file`).
- Fixed with **agent→workspace scoping** in `electron/tools.cjs`: new `AGENT_WORKSPACE_SCOPE` map (Juridico→juridico, Developer→developer, Creator→creator-audio/video, Personal Assistant→personal-assistant, AssistenteTecnico→assistente-tecnico, Suporte→suporte, etc.) and `checkWorkspaceScope(agentId, name, args)` enforced in `executeTool` — agents may only `open_workspace`/`workspace_action` their own workspace; anything else returns `{ error: 'Agent "X" can only use workspace(s): ...' }`. Exported from tools.cjs.
- `electron/main.cjs` `getToolsForAgent` now injects the scoped workspace into the `open_workspace`/`workspace_action` tool descriptions so the model picks the right workspace up front.
- `electron/agent-prompts.cjs` (Juridico): added — if the juridico workspace tool errors/doesn't exist, do NOT insist and do NOT use another workspace to write files; answer in text with the full legal orientation.
- Deleted the fabricated dossier dir (`Desktop\hello\juridico`).

**Final verified behavior (CDP, exact user message, fresh app)**
- Juridico → `toolCalls: []`, full legal text: CLT art. 456 § único (desvio de função), CF/88 art. 7º XXX, Súmula 6 TST (equiparação salarial), table of verbas + foundations. No files written. `hello\juridico` and `Desktop\evidencias` clean after.
- Tests: `npx vitest run electron/__tests__` → 534 passed / 9 skipped. The 20:58 bad run's model (groq/llama-3.3-70b) is no longer reachable for Juridico because the DB override now points at opencodezen/big-pickle.

**Open items (unchanged)**
- `workspace-juridico` has no registered actions — if real evidence cataloging is wanted, add `juridico-actions.ts`. Until then the agent answers in text only (safe).
- AssistenteTecnico error boundary + Settings not opening: not reproduced; user to reproduce live with `[renderer]` logging.
- `main.log` wake-word spam (`Missing Python packages: sounddevice...`) still drowns logs every ~1s; consider suppressing when wake word is disabled.

### 2026-07-31 (perf) — App freezing/heavy: root cause was blocking wake-word spam; now idle at 0% CPU

**Symptom**: user reported the app "travando e pesada" (freezing/heavy).

**Root cause (confirmed live)**: `src/app/hooks/useVoice.ts` wake-word effect depended on `startRecording`, whose useCallback identity changes every render (its own deps are unstable) → the effect re-ran on EVERY render → `window.orun.wakeListener.start()` IPC fired ~8-10×/sec. Each IPC call ran `startWakeWordService()` in `electron/background-services.cjs`, which executed **2 blocking `execSync` probes** (`python --version` + `python -c "import sounddevice..."`) — each ~130ms, in the main process. At 8-10 calls/sec the main process was blocked ~1-1.3s per second → frozen UI, delayed IPC/timers. The deps check failed (sounddevice missing), so `wakeWordProcess` stayed null and the guard `if (wakeWordProcess) return;` never short-circuited.

**Fixes (no functionality lost)**
1. `electron/background-services.cjs`: cached the Python dependency probe (`wakeDepsCheckedAt`/`wakeDepsOk`, `WAKE_DEPS_RECHECK_MS = 60s`). `startWakeWordService` now runs the blocking probes at most once per 60s; subsequent calls are no-ops. Cache reset in `stopWakeWordService()` and on explicit restart/test, so a deliberate user toggle still re-checks.
2. `src/app/hooks/useVoice.ts`: added `startRecordingRef = useRef(startRecording)` (reassigned each render); the wake effect now calls `startRecordingRef.current()` and depends only on `[wakeWordEnabled, wakeWord]` (was `[wakeWordEnabled, wakeWord, startRecording]`).
3. `src/app/components/AvatarOrb.tsx`: removed the 60ms `setInterval`→`setTick` — `tick` was never referenced in the render output (all animation is CSS), so it was re-rendering the whole orb subtree ~16×/sec with zero visual change.

**Measured after fix** (fresh restart): all electron processes idle at **0% CPU** over a 10s window (previously saturated). Wake IPC latency: `status()` = 1ms, `start()` = 0-1ms after the first cached probe (~134ms once per 60s). `main.log` wake spam dropped from ~1/s to 1 entry in 2+ minutes.

**Audited and left as-is**: main-process intervals (rate-limiter cleanup 60s, supabase sync configurable, whatsapp watchdog 60s), renderer intervals that only run while their feature is active (VAD 50ms during recording, volume meters while recording, DashboardWidgets clock 1s, StatusBar 30s, ThemeContext 60s, SettingsPanel polls only when open, Creator decks only while playing, autoBackup). `tsc --noEmit` clean, 534 tests pass.

### 2026-07-31 (blank screen) — "App abriu mas não mostra imagem": window was MINIMIZED, freezing rAF and stalling the boot→home transition

**Symptom**: user reported the app opened but showed no image/content. `main.log` had `[LOAD FAIL] -102 ERR_CONNECTION_REFUSED` at 21:18:53 — the window had loaded while the Vite dev server was down (a previous restart had killed it), i.e. part 1 of the blank page.

**After restarting Vite + CDP `Page.reload`, the page loaded fine but stayed on a near-empty shell**: only the custom title bar + the BootSequence `<video src="./loading.mp4">` mounted, with the boot container stuck at `opacity: 0` and the HomeScreen (phase `home`) never appearing. No console errors, no React exceptions, no reduced-motion. CDP timeline showed the boot video playing to the end (8s) yet the container opacity never animated to 1.

**Root cause**: the Electron windows were **minimized** (both the app window and the detached DevTools window — Win32 rect `-32000,-32000`, `IsIconic`=true). A minimized/occluded Chromium page freezes `requestAnimationFrame` and the Web Animations API:
- `document.visibilityState === "hidden"`, `document.hasFocus() === false`
- `rAF` never ticked (evaluate hung 8s); `element.animate(...).finished` never resolved
- `motion/react` (v12) drives the App phase transition (`AnimatePresence mode="wait"` in `src/app/App.tsx`); with animations frozen, the BootSequence `exit` never completes → `mode="wait"` never mounts the HomeScreen. Video playback and `setTimeout` still worked (compositor/timer driven), which is why the app appeared "half alive".

**Fix**: restored the app window via Win32 (`ShowWindow(hwnd, SW_RESTORE=9)` + `SetForegroundWindow`). Immediately: `visibilityState:"visible"`, `focus:true`, rAF 61 ticks/s, and the app mounted the full HomeScreen (Hampton • Online, model OC Zen/big-pickle, chat input present).

**Operational lessons**
- The close button does NOT quit the app — `electron/main.cjs:344-351` hides the window (`runInBackground` default true). So the app can be "open but invisible"; check the tray. Window state (incl. minimized) persists via `windowBounds` in settings.
- If the app ever looks stuck on the black/boot screen, first check window state: `Get-Process electron | select Id, MainWindowHandle` and restore the window (minimized → frozen rAF → motion animations stall). Do NOT restart/kill processes before checking this.
- A fresh `electron` relaunch with `--remote-debugging-port=9222` + a running Vite is the reliable dev flow; killing node+electron also kills Vite.
- Useful CDP scripts now in `%TEMP%\opencode\`: `cdp-timeline.js` (1s DOM sampling), `cdp-waapi.js`/`cdp-raf.js` (frozen-animation probes), `cdp-focus.js` (visibility/rAF check + bringToFront).

### 2026-07-31 (Developer agent) — fixed the 400 error chain; Developer now writes code to Desktop\hello

**Symptom**: user asked Developer to make a Python calculator "na pasta hello". Developer answered `Erro do cliente (400). Verifique sua configuração.` The workspace setup was NOT the problem — the log (21:57) showed Developer correctly calling `open_workspace("developer")`. The failure was the AI provider chain inside the autonomous loop:
1. `groq` (Developer's model `qwen/qwen3-32b`) → HTTP 429 rate limit (free tier 8k TPM) on the within-groq fallback `openai/gpt-oss-120b`.
2. `openrouter` → HTTP 401 Missing Authentication header (stored key invalid).
3. `github` → HTTP 410 GitHub Models retirement brownout (github is effectively retired/dead).
4. `opencodezen/big-pickle` → within-provider fallback to `deepseek-v4-flash-free` → HTTP 400 `The reasoning_content in the thinking mode must be passed back to the API`.

**Root cause of the 400**: DeepSeek (proxied via opencodezen) in thinking mode requires assistant `reasoning_content` to be echoed back verbatim on the next request. The app dropped it everywhere: `formatMessagesFor` (ai-router.cjs) preserved only `tool_call_id`/`tool_calls`; `chatOpenAICompatible`/`streamOpenAICompatible` never returned `choice.message.reasoning_content`; and `autonomous-loop.cjs` pushed assistant context messages as `{role, content, tool_calls}` only.

**Fixes**
- `electron/ai-router.cjs`: `formatMessagesFor` now carries `reasoning_content` through; `chatOpenAICompatible` returns `reasoningContent` from `choice.message.reasoning_content`; `streamOpenAICompatible` accumulates `delta.reasoning_content` and returns it too.
- `electron/autonomous-loop.cjs`: assistant messages pushed back into context (tool-call feed + the forced-tool retry path) now include `reasoning_content` when present.
- Developer model → `opencodezen/big-pickle`: updated `AGENT_RECOMMENDED_MODELS.Developer` in main.cjs AND the DB override `settings.agentModels.Developer` (the DB override wins, same pattern as Juridico). Avoids the rate-limited groq path; fallback chain stays as safety net.
- Developer code location: the prompt already preferred `workspace_action`, but big-pickle used the direct `write_file` tool which resolves relative paths against `process.cwd()` (project root) → file landed in `orun_project\hello` instead of the developer workspace. Fixed with a `{DEVELOPER_WORKSPACE}` placeholder in the Developer prompt (agent-prompts.cjs) that `buildSystemPrompt` (main.cjs) replaces with the live `settings.developerWorkspace` (default `Desktop\hello`) — the prompt now mandates absolute paths under that folder for the direct tools.

**Verified via CDP** (autonomous loop, `orun.ai.autonomous`, real request): Developer opened `developer` workspace → `workspace_action(write_file)` with absolute path `C:\Users\Caiqu\OneDrive\Desktop\hello\calculadora.py` → `workspace_action(execute_command)` `python -m py_compile ... && echo OK` → replied with the full path. File exists (1258 bytes) and compiles. Tests: 534 passed / 9 skipped; `tsc --noEmit` clean.

**Notes / open items**
- `openrouter` has an invalid/expired key in the secret store (401 every time); it only wastes one fallback hop now. Re-enter a valid key in Settings → Motor de IA if OpenRouter is wanted.
- `github` provider is in retirement brownout (410) and health-checked `down` — consider removing it from `allProviders`/`fallbackProviders` in a future pass.
- `%TEMP%\opencode\cdp-verify-dev.js` is the reusable Developer-agent verification (tool calls + final text).

## 2026-07-31 22:25 � Site do Developer caindo na pasta do projeto em vez do workspace

- **Sintoma**: user pediu site (barbearia) no chat principal; arquivos cairam em orun_project\barbearia\ (base = process.cwd()) e nao no Explorer do Developer IDE. Chat mostrou o codigo inteiro.
- **Causa raiz**: Hampton usou write_file com caminho relativo arbearia/index.html; write_file/edit_file/read_file/list_files/search_* e run_command (cwd) resolviam relativo contra process.cwd() (raiz do projeto). Nenhuma instrucao mandava o agente principal gravar no developer workspace.
- **Fix (tools.cjs)**: novo helper getWorkspaceDir() (ctx.db.getSetting('developerWorkspace') || process.cwd()) + resolveAgentPath(); write_file/edit_file/read_file/list_files/search_files/search_content resolvem relativo contra o workspace; run_command cwd default = workspace.
- **Fix (main.cjs)**: buildSystemPrompt agora acrescenta a TODOS os prompts (qualquer agentId, inclusive chat principal agentId=undefined) a instrucao: criar arquivos no developer workspace ({DEVELOPER_WORKSPACE}), nao colar codigo inteiro no chat, responder curto com caminho.
- **Fix (agent-prompts.cjs)**: prompt Developer atualizado � tools diretas agora resolvem relativo contra o workspace (antes dizia para usar sempre caminho absoluto).
- **Verificado via CDP** (agentId=undefined, caminho real do chat): write_file relativo landingtest/index.html -> C:\Users\Caiqu\OneDrive\Desktop\hello\landingtest\index.html, resposta curta sem codigo. Site arbearia movido de orun_project\ para Desktop\hello\barbearia\. Pasta lixo C:\Users\Caiqu\landingtest (do 1o teste com agentId='Hampton') removida.
- **Atencao**: agentId='Hampton' (explicito) usa promptFor -> DEFAULT_PROMPTS['System'], nao o else de buildSystemPrompt � mas a instrucao agora e incondicional, cobre ambos.
- Testes: 662 passed / 9 skipped; tsc --noEmit limpo. Electron reiniciado (page D4B7DD5615716735D5DE3ABCC7D7242E); Vite/npm intocados.

## 2026-07-31 23:05 � 'Site na pasta hello' criava pasta hello\hello aninhada
- **Sintoma**: user pediu 'site de restaurante dentro da pasta hello' (chat do Developer IDE); arquivos foram para Desktop\hello\hello\index.html etc (aninhado). Parecia que nada aparecia no Explorer (na pratica aparecia como pasta 'hello' na raiz).
- **Causa**: agente via 'hello' no nome do workspace e prefixava os caminhos com 'hello/'; com a resolucao relativa contra o developerWorkspace (fix anterior), 'hello/index.html' -> Desktop\hello\hello\index.html. Legacy: Desktop\hello\hello\ ja existia (restaurante antigo + calculadora duplicada de tentativa anterior).
- **Fix (prompts)**: buildSystemPrompt (main.cjs) agora avisa em TODO prompt: 'a pasta hello do usuario E a raiz do workspace ({DEVELOPER_WORKSPACE}); NUNCA crie subpasta chamada hello; ex.: restaurante/index.html -> {DEVELOPER_WORKSPACE}\restaurante\index.html'. Mesma nota adicionada ao prompt do Developer (agent-prompts.cjs).
- **Limpeza do workspace**: site de restaurante consolidado em Desktop\hello\restaurante\ (index.html 5671 + css\style.css + js\script.js; arquivos orfaos style/script antigos da raiz removidos). Pasta aninhada Desktop\hello\hello\ removida (site antigo preservado em restaurante\ antes da limpeza; calculadora.py duplicada removida; landingtest de teste removido).
- **Verificado via CDP (agentId=Developer, pedido identico do user)**: open_workspace -> write_file restaurante/index.html -> restaurante/css/style.css -> restaurante/js/script.js -> list_files/read_file confirmando. Resposta curta com caminho completo C:\Users\Caiqu\OneDrive\Desktop\hello\restaurante\, sem codigo no chat.
- **ATENCAO Move-Item**: Move-Item com array de sources + destino com trailing backslash transformou pasta vazia em arquivo e perdeu arquivos do move (style.css/script.js do site novo). Usar sempre -LiteralPath e destino por arquivo, sem barra final.

## 2026-07-31 23:35 � Explorer da Developer IDE nao mostrava conteudo das pastas (codigo 'feito no chat')
- **Sintoma**: user via a pasta (ex.: restaurante/) no Explorer mas ao clicar nao havia nada dentro; parecia que o agente 'so codava no chat'.
- **Causa**: FileExplorer.tsx so listava UM nivel (developer:list-files nao-recursivo) e toggleFolder so alternava expanded sem carregar filhos � pastas nunca populavam children.
- **Fix (src/app/plugins/workspaces/workspace-developer-ide/components/FileExplorer.tsx)**: refreshFiles agora monta a ARVORE completa recursivamente (readDirRecursive, como o handleImportFolder ja fazia) com pastas expanded:true; toggleFolder ganhou lazy-load via loadChildren (listFiles do node.path) quando a pasta expande sem filhos; conteudo de arquivos preservado para arquivos ja carregados e lido para os demais.
- Verificado: typecheck limpo; 662 testes passed / 9 skipped. Vite HMR aplicou a mudanca (app rodando em http://localhost:5173/). IDE nao estava aberta no momento do check via DOM (impossivel validar a arvore renderizada sem o IDE aberto � user confirma abrindo a Developer IDE).
- Comportamento alvo (pedido do user, 'quero o agente codando igual voce'): user pede -> agente cria/edita arquivos de verdade -> arvore do Explorer recarrega (developer:file-written) e mostra tudo, inclusive subpastas.

## 2026-08-01 00:15 � Erro 410 no chat (github brownout) ao falhar opencodezen
- **Sintoma**: user recebeu 'Nao foi possivel acessar o motor de IA... Erro do cliente (410)'.
- **Causa raiz** (log 23:10): cadeia do autonomous-loop � opencodezen deu 'Autonomous iteration timed out' (timeout de 60s) -> groq 401 (key invalida/vazia) -> openrouter 401 (key invalida/vazia) -> github 410 (github_models_retirement_brownout, GitHub Models em aposentadoria) -> esse 410 virava o erro final mostrado.
- **Fix (autonomous-loop.cjs)**: fallbackProviders = ['opencodezen','groq','openrouter'] (github REMOVIDO � morto); novo retriedProvider: erros transitorios (timed out/429/5xx/network) dao RETRY no MESMO provider antes de trocar; timeout por iteracao 60s -> 120s.
- **Fix (ai-router.cjs)**: allProviders em routeChat/streamRouteChat = ['opencodezen','groq','openrouter'] (github removido).
- **Estado das chaves**: groq e openrouter retornam 401 Missing Authentication header (chaves invalidas/vazias no secret store). Unico provider funcional: opencodezen (primario de todos os agentes via agentModels + ai global). Sugerir ao user limpar/atualizar as chaves de groq e openrouter em Configuracoes -> Motor de IA (fallback continua quebrado se opencodezen cair de vez).
- **Observacao**: setting global i ainda tem baseUrl=http://localhost:11434 (sobra de configuracao Ollama) � inerte pois opencodezen usa baseUrl fixa do OPENAI_COMPATIBLE.
- Verificado via CDP (chat principal, agentId undefined): resposta 'ok' sem erro, 1 iteracao provider=opencodezen model=big-pickle agent=hampton. Testes 662 passed / 9 skipped; tsc limpo.

## 2026-07-31 23:35 � Sistema de voz ativado (wake word 'ok orun' nao funcionava)
- **Causa raiz**: servicos de voz (wake_word_service.py, stt_server.py, piper_server.py) sem os pacotes Python instalados. Log: 'Missing Python packages: import sounddevice, numpy, requests'. Wake nem iniciava; STT/Piper crashavam no import (portas 8080/5002/8081 livres).
- **Fix**: pip install numpy sounddevice flask faster-whisper piper-tts (todas no Python 3.11.9 global). requests 2.33.0 ja existia.
- **Segundo problema (mic baixo)**: mic H510-PRO captava RMS ambiente ~0.000025 (float32) vs limiar fixo 0.01 (435x abaixo). Mesmo falando, headset com ganho baixo nao cruzava o limiar.
- **Fix (wake_word_service.py)**: VAD adaptativo � piso de ruido rolante (EMA alpha=0.85), fala declarada quando RMS > max(floor*3.0, threshold) com threshold default 1e-4 (era 0.01); audio peak-normalizado (TARGET_PEAK=0.9) antes do Whisper (mic baixo => STT ouve melhor); log RMS com 6 casas p/ debug.
- **Acoes**: modelo whisper 'small' pre-baixado (cache HF ~460MB) para STT subir rapido; Electron reiniciado (pagina CDP nova: 115D18547AAB4E6C3FE1C57F6A64175B); wake listener reiniciado via CDP.
- **Estado**: STT ok (faster-whisper small, porta 8080), Piper ok (pt_BR-cadu-medium, porta 5002), wake ok (porta 8081, STT conectado, VAD adaptativo com floor convergindo para 0.00007). TTS config eh elevenlabs (cloud), piper e fallback.
- **Proximo passo**: user falar 'ok orun' para validar de ponta a ponta. Se nao acionar, conferir nivel do mic no Windows (Config -> Som -> Microfone H510 -> nivel/boost).

## 2026-08-01 02:25 � Fallback TTS: Edge TTS (gratis) entre ElevenLabs e Piper
- **Pedido**: user quer opcao melhor que Piper p/ quando os tokens do ElevenLabs acabarem. Recomendado Edge TTS (vozes neurais gratuitas da Microsoft, sem API key/tokens).
- **Implementado**:
  - pip install edge-tts (7.2.8).
  - NOVO edge_tts_server.py (Flask, porta 5003): POST /api/tts {text, voice} -> MP3; /v1/audio/speech (OpenAI-compat); /voices; /health. 16 vozes pt-BR (Francisca/Antonio/Thalita/Brenda/...) + 6 en-US/en-GB. Voice invalida cai p/ default pt-BR-FranciscaNeural.
  - ackground-services.cjs: startEdgeTtsServer/stopEdgeTtsServer adicionados a start()/stop().
  - 	ts-router.cjs: engine 'edge' em ENGINES/listVoices/synthesize; EDGE_VOICES hardcoded espelhando o servidor; edgeSynthesize -> POST localhost:5003/api/tts.
  - media-handlers.cjs: FALLBACK_CHAIN = ['edge','piper','bark']; isCloud inclui 'edge'.
  - Renderer: 'edge' adicionado em OrunTTSEngine (orun.d.ts), ENGINE_INFO (VoicesPicker, kind cloud sem key), PROVIDER_LABELS (UsagePanel).
- **Verificado via CDP**: synthesize('edge','pt-BR-FranciscaNeural') -> MP3 base64 ok; fallback force elevenlabs (voz invalida) -> {engine:'edge', fallbackFrom:'elevenlabs'} MP3 ok. HTTP direto 5003: 17KB MP3. Typecheck limpo, 662 testes ok.
- **Nota**: edge-tts precisa de internet (sem internet -> erro -> cai p/ piper local). Requer pip install edge-tts na maquina (ja feito).

## 2026-08-01 02:40 � Ideia futura registrada: Integracao Obsidian
- User nao usa Obsidian hoje, mas quer no futuro dar memoria de longo prazo ao Orun via vault.
- Documento criado: orun_project/docs/obsidian-integration.md (status: adiado).
- Resumo: usar repo oficial kepano/obsidian-skills (MIT, 35k+ stars); Fase 1 = apontar vault como workspace (reusar getWorkspaceDir/resolveAgentPath); Fase 2 = injetar regras do obsidian-markdown no prompt dos agentes; Fase 3 = bases/canvas/defuddle/cli. Cuidado: privacidade + Orun nao tem sistema de skills (prompts).

## 2026-08-01 05:45 � Geracao de imagem: Fooocus local como principal + fal.ai fallback
- **Pedido**: user quer substituir o fal.ai (dando problemas) pelo Fooocus, gerador local gratuito (SDXL/FLUX, estilo Midjourney). Decisao do user: Fooocus principal + fal fallback.
- **Arquitetura**: Fooocus roda como servico local separado (mesmo padrao do STT/Piper/Edge). Orun conecta via HTTP: POST http://127.0.0.1:7865/v1/generation/text-to-image {prompt, negative_prompt, aspect_ratios_selection, image_number, output_format} -> {images:[{url,seed}]}. Sem chave.
- **Implementado**:
  - image-3d.cjs: DEFAULT_FOOOCUS_URL (http://127.0.0.1:7865); FOOOCUS_ASPECT_MAP (presets fal -> dims W*H, ex: landscape_16_9 -> 1344*768); generateFooocusImage (fetch, timeout 10min); testFooocusConnection (/ping); exportados.
  - tools.cjs generate_image: tenta Fooocus primeiro (baseUrl do setting fooocusBaseUrl ou default); falha -> fal.ai se tiver key (model default fal-ai/flux/schnell, retorna fallback:'fal'); sem key -> erro orientativo.
  - media-handlers.cjs image3d:generate-image: mesma cadeia Fooocus->fal; novo IPC image3d:fooocus-test.
  - preload.cjs: fooocusTest + fooocusDefaultUrl expostos em window.orun.image3d.
  - orun.d.ts: tipos fooocusTest/fooocusDefaultUrl.
  - agent-prompts.cjs (Designer): descricao e JSON final atualizados p/ engine fooocus|fal|tripo|comfyui.
- **Verificado**: node --check ok nos 5 .cjs; typecheck (tsc --noEmit) limpo; lint sem erros novos (76 erros pre-existentes nos workspaces). Teste de modulo: sem servidor -> testFooocusConnection {ok:false,'fetch failed'} e generateFooocusImage lanca -> fallback captura.
- **Pendencia do user**: instalar/rodar o Fooocus na maquina (Python + PyTorch CUDA + ~6GB de modelos; precisa GPU p/ ser rapido; porta 7865). Orun ja esta pronto p/ conectar. Opcional: campo p/ configurar fooocusBaseUrl no Settings.

## 2026-08-01 04:20 - Fooocus instalado e integracao validada de ponta a ponta
- **Instalacao** em `C:\Users\Caiqu\Fooocus` (fora do OneDrive): git clone depth 1 de `lllyasviel/Fooocus` (2 DOIS "l"; `illyasviel` = 404); venv Python 3.11; `torch 2.13.0+cpu` (GPU e AMD Radeon RX 7600, sem CUDA); requirements_versions.txt instalado. Modelos: juggernautXL_v8Rundiffusion (6.8GB), vae_approx, fooocus_expansion, offset LoRA, Lightning LoRA (376MB).
- **Bridge proprio** `fooocus_api.py` (o repo oficial NAO tem /v1/generation; forks com API sumiram/404): FastAPI na porta 7865, POST /v1/generation/text-to-image, GET /ping, GET /health, serve /outputs. Reusa modules.config/flags/async_worker via AsyncTask (ordem dos args copiada dos ctrls de webui.py).
- **Preset Lightning por padrao** (4 passos) + `--always-cpu 16` (Ryzen 7 5700X) -> ~5-6 min/imagem 1344x768 (Speed/30 passos levaria ~50 min).
- **Bugs corrigidos**: (1) aspect ratio precisa ser "1152x896" (U+00D7, SEM espacos) -> normalize_aspect; (2) vae_name nao pode ser None nem 'Disabled' (crash no meta_parser / FileNotFoundError models\vae\Disabled) -> sentinela `flags.default_vae` = 'Default (model)'. Alem disso, 2 execucoes morreram sem traceback durante o save (kill externo suspeito/Defender?); nao reproduziu apos os fixes (3/3 sucessos).
- **Watchdog** `watch_bridge.ps1` reinicia o servico automaticamente se cair; `iniciar-fooocus-api.bat` agora usa o watchdog (prod).
- **Validado**: 3 geracoes reais OK (gato 1152x896, paisagem 1344x768 com width/height no JSON), imagem servida via /outputs (HTTP 200, image/png). Contrato exato do Orun (aspect 1344*768, output_format png) aceito.
- **Status**: falta reiniciar o app Orun p/ carregar image-3d.cjs/tools.cjs/media-handlers.cjs/preload.cjs (codigo ja pronto e testado). Para o servico subir no reboot: iniciar-fooocus-api.bat. Opcional pendente: campo fooocusBaseUrl no Settings.

## 2026-08-03 — Premium redesign: 16 workspaces, tema dark global, tela central com a LogoIA, chat flutuante

**Design system compartilhado** — `src/app/plugins/workspaces/premium.tsx` + `src/styles/theme.css`
- Paleta premium dark: fundo `#050505`/`#0A0A0C`, cards `#141414`, primary vermelho sangue `#C3002F`, borda `#252525`, sidebar `#08080A`.
- Componentes/utilitarios compartilhados (PanelHeader, StatCard, MetricGrid, classes `ws-*`) — os 16 workspaces foram redesenhados em cima disso.
- Bloco `.dark` global do `theme.css` alinhado a paleta premium (antes: `#121215`/`#D4203A`); light mantido. Nenhum teste depende de cores CSS.

**Tela central** — `src/app/HomeScreen.tsx`
- Troca do `HamptonAvatar` (orbe holográfico) pelo `HomeHampton` (import direto de `workspace-home-ia/HomeHampton.tsx`), `image="/LogoIA.png"` size 230, sobre glow radial vermelho. Lazy import não usado de `HamptonAvatar` removido.

**Chat flutuante nos workspaces** — `src/app/components/FloatingWorkspaceChat.tsx`
- Bolinha 56px arrastável com a LogoIA (pointer events, clamp nas bordas; clicar sem arrastar abre/fecha) + painel 340×460 preto/vermelho: header com estado do agente, bolhas, mic/input/send.
- `WorkspaceView.tsx` agora renderiza o workspace em tela cheia + `FloatingWorkspaceChat` (barra fixa de ChatInput removida).
- Props: `messages`, `hamptonState`, `onSendMessage`, `onMicClick`, `voiceVolume`, `partialTranscript`.

**Verificado**: `npm run typecheck` limpo; `npm test` 670 passando; HMR sem erros.

## 2026-08-04 — Nova LogoIA aplicada em toda a UI + ícones do Electron regenerados

- **Logo correta**: `IMGS/LogoIA.png` (1,9MB, 1122×1402) → copiada para `public/LogoIA.png` (1.915.464 bytes). Antiga antiga logo (errada) descartada antes de aplicar.
- **UI atualizada** para usar `/LogoIA.png`: SplashScreen (hexágono SVG → img 84px circular com aura), Sidebar (hexágono → img 26px), TitleBar (hexágono → img 16px), QuickChat (`AvatarOrb` → img 28px, import removido). HomeHampton/HomeWorkspace/FloatingWorkspaceChat já usavam `/LogoIA.png`.
- **Ícones do Electron regenerados** da nova logo (recorte quadrado central, a logo é 1122×1402 não-quadrada): `build/icon.png` e `build/icon-top.png` 792px, `build/tray-icon.png` 128px, `build/tray-icon@2x.png` 256px.
- **Verificado**: typecheck limpo; 670 testes passando; HMR sem erros. `public/HomeIA.png` (2MB, antigo) permanece mas não é usada como imagem no `src/`.

## 2026-08-04 — Plataforma: Módulos 1–5 do roadmap (Skill/Memory/Knowledge/Planner/Agent Hub)

Implementados e validados conforme `docs/roadmap-v1.md` (contrato de extensão → memória → docs → orquestrador → delegação):

- **Skill Manager (M1)**: contrato v1 (manifest, semver `compareSemver`/`satisfiesRange`, deps topológicas, lifecycle install/uninstall/setEnabled/reload, `surfaceTools`/`executeTool`, path-traversal guard). IPC `skills:*` + `window.orun.skills`. Testes: 33.
- **Memory Engine (M2)**: local-first JSON + espelho cloud; escopo por agente/projeto; upsert por chave composta; embeddings cosine (nomic-embed-text) com fallback textual; injeção `<memorias_relevantes>` no chat; consolidação diária. Migration `0008` (pgvector, HNSW, `match_memories()`) aplicada ao Supabase real. Testes: 26.
- **Knowledge Engine (M3)**: hub de docs auto (changelog git log, diário, ADR) local + cloud; migration `0009` (`documents`). Testes: 13.
- **Planner Engine (M4)**: orquestrador serial (goal→plan LLM→tasks com deps→executeNext→review); UI `PlannerPanel`; migration `0010` (`planner_tasks`). Testes: 13.
- **Agent Hub (M5)**: schema único de agente + delegação serial com trace (route/execute/escalate); UI `AgentHubPanel`; roda com `aiRouter` + `resolveAISettings`. Testes: 13.
- Verificação: typecheck limpo; 785 testes passando.

## 2026-08-05 — Módulo 6 (Analytics) completo

- `electron/analytics.cjs`: agrega o que o app já loga — tabela `app_events`, métricas de sistema reais (CPU/RAM/disco via `os`+`fs.statfsSync`, sem `Math.random()`), telemetria `ai:telemetry`, stats dos engines. Migration `0011` aplicada. IPC `analytics:*`.
- Instrumentação em `ai:chat`, `planner:*`, `agent-hub:delegate`, `skills:install`, `knowledge:save`. UI `AnalyticsPanel.tsx` (gauges CPU/RAM/disco, uso de IA, eventos); `DashboardWidgets` usa métricas reais (fallback randômico sem API).
- Rotas de voz completadas: `planner`, `agentHub`, `analytics`. Verificação: typecheck limpo; 796 testes passando (era 785).

## 2026-08-06 — Dev profile: chaves do motor de IA + wake word OK; hang de request por voz (bug aberto)

**Objetivo da sessão**: validar wake word + voz no dev app. Resultado: wake e STT funcionam; **bug de request por voz reproduzido**.

- **Chaves do dev corrigidas**: o profile dev (`%APPDATA%\orun-os`) tinha key `sk-or-v1-...` (formato OpenRouter) no slot `opencodezen` → 401 `Invalid API key`. Copiadas as 14 keys funcionais do app instalado (`%APPDATA%\Orun OS`) para o dev via script temp `copykeys.cjs` (14/14 OK). `secretStore.init` validado (`keys.enc.json` criado, decrypt round-trip OK).
- **API opencodezen confirmada viva**: `GET https://opencode.ai/zen/v1/models` → 200; `POST .../chat/completions` `big-pickle` → 200. Provider health pós-restart: `groq:up, openrouter:up, github:down (410, removido da cadeia), opencodezen:up, ollama:down (local-only)`.
- **Chat digitado OK no dev**: "TESTE DE CONEXÃO" rodou iterações 1→12 com tools reais. Isola o problema para o caminho voz→autonomous (não é API/key).
- **Wake word confirmado de ponta a ponta**: `[wake] Transcript: "Ok Orun"` → `Wake word detected via TCP` → overlay → STT → `[ai:autonomous] agent=hampton messages=2`.
- **BUG ABERTO (critical)**: requests por voz (`messages=2/4`) **penduram SEMPRE na iteration 1** — nem o timeout de 120s do loop nem o de 60s do `postJSON` disparam, nenhum erro logado, nenhum tool_call. Requests digitados (histórico 6/8/10) rodam normalmente. Reproduzido múltiplas vezes (08:35:27 m=2, 08:35:41 m=4, 08:36:08 voz, 08:37:52 m=2, 08:43:04 m=2 voz). Causa raiz não identificada; instrumentação pendente em `ai-router.cjs`/`autonomous-loop.cjs` (ver Known Issues #1).
- **Pastas do projeto esclarecidas**: a canônica é `C:\Users\Caiqu\OneDrive\Desktop\orun-os` (git `master`, v0.6.6). `orun-os.worktrees\orun-os-roadmap-v1-voice-knowledge` é worktree de branch morto (04/08); `Downloads\orun-monorepo_1` é cópia antiga. Pastas `Desktop\Orun-Core`, `OrunTV`, `OrunVS` são projetos separados.
- **Ambiente dev rodando**: electron dev com keys OK + Vite 5173 + serviços python (STT :8080, wake :8081, piper :5002, edge :5003, kokoro :5004). Duplicatas de serviços python observadas (possível lixo de launches sobrepostos).

**Próximos passos registrados**: instrumentar caminho autônomo (logs antes/depois do HTTP em `routeChat`/`chatOpenAICompatible` + estado de rate limit + concorrência em `activeAutonomousRequests`); comparar payload voz vs digitado; limpar serviços python duplicados; revalidar typecheck/testes após edições.

## 2026-08-06 (tarde) — Bug "voz pendura na iteração 1" RESOLVIDO: causa-raiz no renderer, não no main

**Sintoma**: wake word → STT → `[ai:autonomous] messages=2/4` "pendurava SEMPRE na iteration 1" (nenhum timeout de 120s/45s/60s disparava, nenhum erro, nenhum tool_call); requests digitados (`messages=6/8/10`) funcionavam.

**Causa-raiz (renderer, `VoiceOverlay.tsx`)**: o overlay cria um `useChat` próprio (linha 33) e tinha um efeito `useEffect(() => () => { tts.stopTTS(); chat.cleanup(); }, [tts, chat])`. `useTTS`/`useChat` retornam objetos NOVOS a cada render → o cleanup rodava a CADA render:
1. `chat.cleanup()` chamava `cancelStreamRef.current()` (o `stop()` de `window.orun.ai.autonomous`, preload.cjs:51-87) → `ai:autonomous-cancel` → main anulava o loop silenciosamente (retorna null, handler não envia done) → overlay preso em "thinking" para sempre. O primeiro `onToolCall`/`setMessages` re-renderiza → cancela → "hang na iteração 1, sem tool calls".
2. Em respostas de texto puro, o re-render do `onDone` (setState speaking) rodava `tts.stopTTS()` matando a fala no início → "não ouço nada".
3. A resposta ficava no `useChat` invisível do overlay (nenhuma mensagem renderizada) → "não vejo nada".
4. Auto-dismiss quebrado (cleanup do timer a cada mudança de estado) → overlay nunca fechava sozinho.
Requests digitados passam pelo `useChat` do HomeScreen (cleanup interno estável `[cleanup]`) — por isso nunca afetados. A evidência `messages=4` (08:35:41 após m=2 em 08:35:27) já provava que os requests do main COMPLETAVAM; o bug era 100% de UX/renderer.

**Fixes**:
- `electron/autonomous-loop.cjs`: `startedAt` + `logDone(iterations, toolCalls)` → `[autonomous] done agent=... iterations=... toolCalls=... ms=...` nas duas saídas (texto puro + fim do loop).
- `electron/ipc/ai-handlers.cjs`: `[ai:autonomous] done agent=... len=...` no sucesso.
- `src/app/components/VoiceOverlay.tsx`: (1) cleanup de unmount com `latestTtsRef`/`latestChatRef` + deps `[]` (só no unmount real); (2) timer re-armado por `[visible, state]` com `handleDismissRef`/`clearDismissTimer` estáveis — 30s idle/listening, 60s speaking, **nunca em thinking**; (3) transcript das mensagens renderizado no overlay (painel scrollável, bolhas no tema preto/vermelho) — resposta visível mesmo sem TTS.

**Verificação**: `node --check` ✓; typecheck ✓; 796 testes ✓ / 9 skipped.

**Pendência**: teste ao vivo do fluxo de voz ("ok orun" → transcript + áudio + `[autonomous] done` no log). Opção B (rotear voz pelo useChat do HomeScreen) fica como evolução para eliminar o pipeline duplicado.

## 2026-08-07 — Módulo 7 do roadmap: Developer Elite (Git Intelligence + Semgrep + Context7)

Primeira entrega do Módulo 7 ("Elites como skills — Developer primeiro, sob demanda"). Implementado como **tools nativas no contrato existente** + **SKILL.md enriquecido**, reaproveitando o workspace scoping já existente.

**Novo módulo** — `electron/developer-tools.cjs` (Node puro, sem import electron → testável via vitest):
- `gitStatus` — branch atual + working-tree status (modificado/adicionado/deletado/untracked, contagens).
- `gitLog(n)` — commits recentes (hash curto + subject + refs), clamp 1–100, repo sem commits → resposta graciosa.
- `gitDiff({base, head, path, staged, stat})` — diff do working tree, de uma ref, ou entre duas refs; com filtro de path e diffstat.
- `gitStash({action: list|push|pop, message})` — listar/criar/restaurar stashes.
- `semgrepScan({dir, pattern, config})` — scan estático dev-time via semgrep (detecta instalação; ausente → erro orientativo).
- `libraryDocs({query, libraryName, libraryId, type})` — Context7: passo 1 resolve lib (`/v2/libs/search`, sem key, low rate limit); passo 2 retorna snippets de docs (`/v2/context`). `setContext7Base()` como hook de teste.
- Segurança: **todas** as chamadas via `execFile` com args em array (sem shell) — sem injeção de metacharacters, cross-platform.

**Registro no contrato** — `electron/tools.cjs`:
- 6 novas entradas em `TOOL_DEFINITIONS` (formato OpenAI tools): `git_status`, `git_log`, `git_diff`, `git_stash`, `semgrep_scan`, `library_docs`.
- 6 casos novos no dispatcher `executeToolRaw` (rodam contra `getWorkspaceDir()`, a mesma base das tools de arquivo).
- `git_stash` adicionado a `SENSITIVE_TOOL_ACTIONS` (audit `git_write`).

**Permissões** — `electron/main.cjs` `AGENT_TOOL_PERMISSIONS.Developer` ganhou as 6 tools (Developer foi o único agente atualizado nesta entrega; as tools só existem para ele).

**Skill** — `skills/developer/SKILL.md` elevado para "Elite": novas seções Git Intelligence, Code Review (JSON de saída obrigatório), Test Generator (criar testes + rodar até passar, nunca entregar vermelho), Refactor (incremental, stash antes, testes após cada passo), Semgrep dev-time, Docs de bibliotecas via Context7; checklist estendido.

**Testes** — `electron/__tests__/developer-tools.test.cjs` (11 testes): repo git real temporário (`makeRepo` — git init + user config + commit), cobre gitStatus (branch/changes/untracked, fora-de-repo gracioso), gitLog, gitDiff (working tree e entre commits), gitStash push/list/pop, semgrep indisponível → aviso, libraryDocs (query obrigatória, resolução via mock HTTP local, snippets com libraryId, erro HTTP 500). Suite git usa `describe.skip` quando `git` não existe na máquina.

**Verificação**: `node --check` nos 3 `.cjs` ✓; typecheck ✓; **807 testes ✓ / 9 skipped** (era 796).

**Próximo (Módulo 7, sob demanda)**: Context7 como MCP server opcional (o `mcp-client.cjs` já suporta stdio), Git Intelligence avançado (PRs/remotes), Test Generator ligado ao autonomous loop, Code Review/Refactor como tools dedicadas, Semgrep ruleset. Adicionar as tools de elite a outros agentes (ex.: Cyber Security → semgrep_scan) se fizer sentido.

## 2026-08-07 (fase 2) — Developer Elite: Git Intelligence avançado (remotes + GitHub PRs) e Semgrep p/ Cyber Security

Segunda entrega do Módulo 7, aprovada pelo usuário ("ok pode fazer"). Mesmo padrão: tools nativas + SKILL.md.

**Novo em `electron/developer-tools.cjs`** (constante `GH = "gh"`, helpers `ghAvailable()`/`ghAuthed()`, tudo via `execFile`):
- `gitRemote(workspace)` — lista remotes (`git remote -v`), normaliza em `{name, url, direction}`; fora de repo → erro gracioso.
- `ghPr(workspace, {action: list|create|view, base, head, title, body, number})` — `gh pr list --limit 20`, `gh pr create --fill`, `gh pr view [N]`; gh ausente → erro orientativo (instalar em cli.github.com), gh não autenticado → erro orientativo (`gh auth login`).
- Exportados: `gitRemote`, `ghPr`, `ghAvailable`, `ghAuthed`.

**Registro no contrato** — `electron/tools.cjs`:
- 2 novas entradas em `TOOL_DEFINITIONS`: `git_remote`, `gh_pr`.
- 2 casos novos no dispatcher `executeToolRaw`.

**Permissões** — `electron/main.cjs` `AGENT_TOOL_PERMISSIONS`:
- `Developer` ganhou `git_remote`, `gh_pr`.
- `"Cyber Security"` ganhou `semgrep_scan` (primeiro outro agente com tool de elite — scan de segurança é caso de uso natural).

**Skill** — `skills/developer/SKILL.md`: seção "Remotes e PRs (GitHub)" (git_remote antes de operações de origem; gh_pr list/view/create com preparação de conteúdo pelo agente), ferramentas listadas no cabeçalho, checklist Git atualizado.

**Testes** — `electron/__tests__/developer-tools.test.cjs` agora com **14 testes** (+3): gitRemote lista remotes (origin fetch+push), gitRemote fora de repo gracioso, ghPr fora de repo gracioso.

**Verificação**: `node --check` nos 3 `.cjs` ✓; typecheck ✓; **810 testes ✓ / 9 skipped** (era 807). (1ª execução da suíte teve 1 falha transitória de rede no auto-updater; rerun verde.)

**Próximo (Módulo 7, sob demanda)**: Test Generator ligado ao autonomous loop, Code Review/Refactor como tools dedicadas, Semgrep ruleset, Context7 como MCP server opcional (wiring já existe — `main.cjs:1440` auto-carrega `mcpServers`; `autonomous-loop.cjs:106` funde `mcpClient.getAllTools()`), Context7 via MCP. Mais agentes com tools de elite se fizer sentido (ex.: `semgrep_scan` → AssistenteTecnico/Suporte).

## 2026-08-07 (fase 3) — Developer Elite: Test Generator (`run_tests`), Code Review bundle, Semgrep ruleset bundlado e Context7 via MCP

Terceira entrega do Módulo 7, aprovada ("pode fazer tudo"). Fechou os itens pendentes do Módulo 7.

**Novas tools nativas** — `electron/developer-tools.cjs`:
- `runTests(workspace, {dir, command, file})` — **Test Generator**: auto-detecta o framework (`detectTestCommand`: vitest/jest/mocha/npm test via package.json, pytest via pytest.ini/pyproject/setup.cfg, go via go.mod, cargo via Cargo.toml); roda a suíte (timeout 120s) e devolve `{ok, framework, command, passed, failed, output(tail)}`. `file` roda um único arquivo (vitest/jest/mocha/pytest). `command` permite override. **Segurança**: em win32, npm/npx são `.cmd` shims → `shell:true` necessário no execFile; como args são concatenados nesse modo, `command`/`file` controlados pelo agente são validados contra metachars de shell (`&|;<>^()$`"`') antes de rodar.
- `codeReview(workspace, {base, head, staged, includeSemgrep})` — **Code Review bundle**: retorna em uma chamada branch + arquivos alterados (git status) + diff (working tree/refs/staged) + scan semgrep opcional (se `includeSemgrep`). Fora de repo → erro gracioso.
- **Semgrep ruleset bundlado**: novo `electron/developer-semgrep-rules.yml` (8 regras de alto sinal: eval/new Function, shell:true em exec/spawn, pickle/eval em Python, http:// cleartext, env em template string, console.log/print debug INFO) usado como `--config` DEFAULT do `semgrep_scan` quando não há pattern/config (antes sem default → semgrep auto).

**Registro no contrato** — `electron/tools.cjs`: 2 novas entradas em `TOOL_DEFINITIONS` (`run_tests`, `code_review`) + 2 casos no dispatcher `executeToolRaw`.

**Permissões** — `electron/main.cjs`: `Developer` ganhou `run_tests` e `code_review`. (AssistenteTecnico/Suporte **já têm todas** as tools de elite — não estão no mapa restritivo `AGENT_TOOL_PERMISSIONS`, logo `getToolsForAgent` retorna tudo por default em `main.cjs:244`; sem mudança necessária.)

**Skill** — `skills/developer/SKILL.md`: Test Generator agora usa `run_tests` (auto-detecta framework, `file=` para iterar rápido); Code Review usa `code_review` (bundle diff+semgrep) mantendo JSON de saída; seção Context7 documenta o MCP opcional (`{ name: "context7", command: "npx", args: ["-y", "@upstash/context7-mcp"] }` — auto-carregado de `mcpServers` em `main.cjs:1442`, tools fundidas em `autonomous-loop.cjs:106`); cabeçalho + referência rápida atualizados.

**Testes** — `electron/__tests__/developer-tools.test.cjs` agora com **21 testes** (+7): codeReview bundle (arquivos+diff) e fora-de-repo; detectTestCommand vitest/pytest/null; runTests sem framework → orientativo; ruleset bundlado existe e é YAML com `rules:`/`- id:`. Validação ao vivo via script temp: `run_tests` com projeto vitest real → `{ok, passed:1}`, com `file` → ok, `command: "vitest run & echo pwned"` → **rejeitado pelo guard de metachars**.

**Verificação**: `node --check` nos 3 `.cjs` ✓; typecheck ✓; **817 testes ✓ / 9 skipped** (era 810). Suite completa green.

**Módulo 7 completo** (todas as entregas de "Elites como skills — Developer"): Git Intelligence (status/log/diff/stash/remote/PRs), Semgrep (scan + ruleset bundlado + Cyber Security), Context7 (tool `library_docs` + MCP opcional), Test Generator (`run_tests`), Code Review (`code_review`). Restam apenas ideias futuras opcionais (ex.: Context7 como server MCP já configurado por default; rulesets adicionais; Test Generator com cobertura).

## 2026-08-07 — Camada de Persona: "Círculo Hampton" (identidade/lore sobre os agentes existentes)

Aprovado pelo usuário ("pode dar nome aos 17 agentes"). Os **IDs técnicos não foram renomeados** — isso quebraria DB (`settings.agentModels`), WhatsApp (`agentJids`), permissões e workspaces. Em vez disso, adicionada uma **camada de persona** (nome + identidade/lore) por cima dos IDs, coerente com a lore (Hampton = inteligência central, homenagem a Fred Hampton; especialistas = "Círculo Hampton", homenagens inspiradas, não personagens literais).

**Personas (17)**: Hampton→Hampton, Developer→**Rebouças** (André Rebouças, engenheiro), Designer→**Abdias** (Nascimento, artista), Creator→**Pixinguinha** (música), Health→**Juliano** (Moreira, psiquiatra), Finance→**Conceição** (Evaristo, escritora), Teacher→**Firmina** (Maria Firmina dos Reis, educadora), Marketing→**Machado** (de Assis, escrita), Automation→**Sônia** (Guimarães, física/engenheira), Automotive→**Teodoro** (Sampaio, engenheiro), System→**Milton** (Santos, geógrafo), Juridico→**Luiz Gama** (advogado abolicionista), AssistenteTecnico→**João Cândido** (Almirante Negro), Suporte→**Lélia** (Gonzalez, intelectual), Personal Assistant→**Carolina** (Maria de Jesus, memória), Home IA→**Dandara** (guerreira do lar), Cyber Security→**Zumbi** (defesa).

**Main process** — `electron/agent-prompts.cjs`:
- Novo `AGENT_PERSONA_LORE` (fonte canônica: 17 entradas `{name, identity}`) + helpers `agentPersonaName(agentId)` e `personaBlock(agentId)` (bloco `---PERSONA (id)---\nVocê é {nome} — {identidade}\n---END PERSONA---`), exportados.
- `promptFor` agora injeta `personaBlock(agentId)` **no início** do prompt (antes do prompt base) — agentes desconhecidos não ganham persona.
- `electron/main.cjs`:
  - `buildSystemPrompt` (else-branch, chat principal sem agentId) prepende `personaBlock("Hampton")` — Hampton é a persona central do chat principal.
  - `buildAgentRegistry` (usado pelo Agent Hub) agora inclui `personaName` no schema (via `agentPersonaName`).

**Renderer** — espelho de `persona` em `src/app/constants.ts` (`getAgents`), pontos de exibição atualizados (IDs internos intactos em toda lógica):
- `AgentsPanel.tsx`: lista mostra o nome da persona (tooltip `persona (id)`); clique/`onOpenAgentPage`/`onViewData` continuam com o ID.
- `HomeScreen.tsx:500` → `ChatView.tsx:57`: header do chat mostra a persona do agente ativo (`currentAgent?.persona || chat.activeAgent`), fallback "Hampton".
- `AgentPage.tsx`: chip de persona (nome + ID técnico mono) sob a tagline da página imersiva.
- `AgentHubPanel.tsx`: schema grid mostra `personaName` + ID (`personaName?: string` na interface).
- `AgentModelsPanel.tsx:110`: coluna do agente mostra a persona (tooltip com ID); selects/overrides continuam por ID.

**Testes** — `electron/__tests__/agent-prompts.test.cjs` agora com **9 testes** (+5): todo `DEFAULT_PROMPTS` tem persona; `promptFor` injeta o bloco; `personaBlock` vazio p/ desconhecido; `agentPersonaName` fallback; Hampton existe.

**Verificação**: `node --check` nos 2 `.cjs` ✓; typecheck ✓; **822 testes ✓ / 9 skipped** (era 817); lint 0 erros (warnings pré-existentes).

**Notas / próximos**: manter `AGENT_PERSONA_LORE` (main) e `constants.ts` (renderer) em sincronia ao renomear; `AgentHubPanel` exibe `personaName` que só aparece quando o app é reiniciado (vem do backend). Ideias futuras: mostrar a identidade completa no tooltip/AgentPage, e considerar personas nos prompts do mobile (ai-relay lê `persona_prompt` do banco — atualizar só se desejado).

### 2026-08-10 — OrunVS v0.3.3+v0.3.4: client MCP stdio + catálogo on-demand (commitado, VSIX instalado)

Continuação do Módulo 7 / Fase A do SO (OrunVS). Adicionado suporte a **MCP** na extensão, todos os servidores **dormentes por padrão** com ativação **sob demanda** pela IA:

- **Client MCP próprio** (`src/mcp.ts`, módulo puro sem `vscode`): JSON-RPC 2.0 sobre stdio, `initialize` `2024-11-05`, `tools/list`/`tools/call`, buffer de linha, pending Map, timeout 15s, `shell` no Windows p/ `npx`, nomes `server__tool`, `normalizarConfigsMCP`, `blocoFerramentasMCP`.
- **`src/core.ts`**: `AcaoTipo` += `MCP_CALL`; `parseAcoes` extrai `[MCP_CALL]` (tool obrigatória, args JSON opcional); `MCP_INSTRUCOES`; `enriquecerSystemPrompt(base, {memorias, skills, mcp})` injeta o bloco MCP só quando não-vazio.
- **Catálogo curado** (`src/mcp-catalog.ts`): 12 servidores (git, github, context7, fetch, tavily, sequential-thinking, postgres, supabase, docker, penpot, filesystem, playwright); `resolverCatalogoConfig` com placeholders `{workspace}`/`{setting:orunvs.chave}`; `montarBlocoCatalogo` (rodando / dormente "inicia ao usar" / desativado "NÃO chame").
- **`src/chatprovider.ts`**: `_chamarMCP` on-demand (valida allowlist `orunvs.mcpAtivos`, avisa config faltante, sobe o processo no 1º `[MCP_CALL]`, cacheia); `stopMCP` no `deactivate()`.
- **Settings**: `orunvs.mcpHabilitado` (true), `orunvs.mcpAtivos` (default `[]`), `orunvs.mcpServers` (custom, on-demand), chaves `githubToken`/`tavilyKey`/`postgresConnectionString`/`supabaseAccessToken`/`supabaseProjectRef`.
- **Verificação**: typecheck ✓; **87 testes ✓** (novos `mcp.test.ts` 12 + `mcp-catalog.test.ts` 9); bundle ✓; **VSIX `orunvs-0.3.4.vsix` gerado e instalado**; **commit `8f7eeca`** (main, 17 arquivos, +1735/−12; incluiu v0.3.2/v0.3.3 pendentes: memória/skills/verificações/MCP) — working tree limpo.
- **Config do usuário**: `orunvs.mcpAtivos` = todos os 12; chaves `githubToken`/`tavilyKey`/`supabaseAccessToken`/`postgresConnectionString` preenchidas no `settings.json` do VS Code (DIRECT_URL do desktop). Falta só Reload Window.
- **Catálogo de projetos atualizado** neste arquivo: adicionados **Orun Auth** (`@orun/identity`, bruto v0.1.0, 71/71 testes, 5 Edge Functions, pronto p/ refinar/integrar) e **Orun Files** (bruto v0.1.0, Electron + Gemini, busca semântica/organização/preview, pronto p/ refinar). Orun Design listado como "em avaliação".



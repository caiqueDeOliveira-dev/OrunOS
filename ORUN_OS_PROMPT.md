# Orun OS — Complete System Prompt

## Overview
Orun OS is a **desktop AI operating system** built with Electron + React + Vite. It runs as a native Windows/macOS/Linux app, featuring a multi-agent AI system with autonomous tool-calling, WhatsApp/Telegram/Discord/Email integrations, voice interaction (TTS/STT/wake word), social media publishing, Google Calendar/Gmail sync, Spotify control, and a plugin-based workspace system.

- **Version**: 0.6.3
- **Stack**: Electron 31, React 18.3, Vite 6, Tailwind CSS 4, TypeScript
- **AI Providers**: Groq, OpenRouter, GitHub Models, OpenCodeZen, Ollama, DeepSeek, Google PaLM
- **DB**: SQLite (local) + Supabase/PostgreSQL (cloud sync, push-first)
- **Language**: Portuguese (pt-BR) default, English/Spanish/French supported
- **Repo**: all code in `orun_project/` subdirectory

---

## Architecture

### Main Process (`electron/main.cjs`)
Entry point that initializes: SQLite DB, AI router, WhatsApp/Telegram/Discord bots, Google OAuth, Spotify client, n8n bridge, scheduler, plugin system, webhook receiver, Python child processes (wake word, Piper TTS, Whisper STT), auto-updater, tray icon, and ~1100 lines of IPC handlers. All IPC is registered in `main.cjs` directly (not in separate handler files — except Google, media, settings, data, AI, update, Spotify, Discord handlers which are in `electron/ipc/`).

### Preload (`electron/preload.cjs`)
Exposes `window.orun` to the renderer with namespaced APIs: `orun.ai`, `orun.settings`, `orun.db`, `orun.whatsapp`, `orun.telegram`, `orun.google`, `orun.spotify`, `orun.socialMedia`, `orun.shell`, `orun.plugins`, `orun.mcp`, `orun.files`, `orun.evidence`, `orun.notifications`, `orun.speech`, `orun.ipc`, `orun.audio`, `orun.waAutomation`.

### React App (`src/app/`)
- **Entry**: `src/main.tsx` → `<App />`
- **App.tsx**: Splash → Boot → Home phases with providers (I18nProvider, ThemeContext, ToastProvider)
- **HomeScreen.tsx**: Main hub with 25+ lazy-loaded panels, sidebar navigation, chat view, workspace view, command palette, keyboard shortcuts
- **State**: React hooks (useChat, useVoice, usePanelNavigation, useTTS, useVoiceSettings, useKeyboardShortcuts, usePersonalization) — no external state library (no Redux/Zustand)
- **Styling**: Inline styles with CSS variables (e.g., `var(--card)`, `var(--border)`, `var(--foreground)`) — not Tailwind classes. Theme switching via `data-theme` attribute on `<html>`.

---

## Agent System

### Agent List (defined in `src/app/constants.ts`)
15 agents, each with a dedicated prompt in `electron/agent-prompts.cjs`:

1. **Hampton** — Main AI, autonomous loop (up to 15 tool iterations). Central coordinator.
2. **Developer** — Code review, development, technical guidance
3. **Designer** — Image generation (Fal AI) & 3D design
4. **Creator** — Audio & video production
5. **Health** — Health, nutrition & fitness tracking
6. **Finance** — Financial tracking & analysis
7. **Teacher** — Educational assistant
8. **Marketing** — Social media marketing (Buffer API + n8n)
9. **Automation** — n8n & workflow automation
10. **Automotive** — Vehicle management & maintenance
11. **Juridico** — Legal document assistant (Brazilian law)
12. **AssistenteTecnico** — Technical support
13. **Suporte** — General support
14. **Personal Assistant** — Scheduling, reminders, WhatsApp-integrated assistant
15. **System** — System diagnostics, PowerShell health checks

### AI Router (`electron/ai-router.cjs`)
Routes requests through 7 providers with fallback chain: Primary → Groq → OpenRouter → GitHub → OpenCodeZen → DeepSeek → PaLM. Supports streaming, tool-calling (OpenAI function-calling format), tool-use loop, rate limiting, token counting.

### Autonomous Loop (`electron/autonomous-loop.cjs`)
Hampton's tool-calling loop: up to 15 iterations, tool results fed back into context. Detects when tools produce images/files and re-inserts them as attachments.

### Tool System
~20+ tools defined in `electron/tools.cjs`: `generate_image` (Fal AI), `generate_3d`, `generate_video`, `generate_music`, `web_search` (Tavily), `web_scrape`, `create_reminder`, `get_agenda`, `create_event`, `delete_event`, `list_emails`, `send_email`, `save_file`, `read_file`, `run_command`, `publish_to_social`, `read_memory`, `save_memory`, `execute_n8n`, `report_bug`.

Tools are **individually assigned** to agents via `agentTools` map in `main.cjs`. Each agent gets only its permitted tools.

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

### TTS (Text-to-Speech)
- **Cloud**: ElevenLabs, Google Cloud TTS, Azure TTS
- **Local**: Piper TTS (Python + Flask, port 5002), XTTS, Bark, F5-TTS (Python submodule)
- Piper/Flask server often fails if `flask` package not installed (`pip install flask`)
- TTS router in `electron/tts-router.cjs`

### STT (Speech-to-Text)
- **Local**: Whisper (Python + Flask, port 8080), also fails without `flask`
- **Cloud**: Cloud API fallback via `electron/stt-router.cjs`

### Wake Word (`electron/wake-word/`)
- Python-based wake word detection (`sounddevice`, `numpy`, `requests`)
- Background service that stops/starts with app
- Often shows "Missing Python packages" (needs `pip install sounddevice numpy requests`)

### Frontend Voice
- `useVoice.ts` hook (590 lines): VAD (Voice Activity Detection), Whisper STT, wake word (browser + Python), noise suppression, conversational mode (auto-mic after AI speaks)
- `src/app/voice/`: `vad.ts`, `voice-commands.ts`, `voice-history.ts` (IndexedDB), `whisper-stt.ts`, `noise-suppression.ts`

---

## Database

### SQLite (Local)
- **File**: stored in Electron `app.getPath("userData")` / `orun-data.db`
- **13 tables** in `electron/db/core.cjs`: `conversations`, `messages`, `settings`, `usage`, `tts_usage`, `nutrition_log`, `finance_log`, `health_log`, `developer_reviews`, `teacher_progress`, `video_projects`, `image3d_generations`, `music_projects`
- Domain-specific CRUD in `electron/db/domain.cjs`
- Auto-encrypt DB on app quit, auto-recover on corruption
- Auto-backup (keeps last 3) in `%APPDATA%/Orun OS/evidence/backups/`

### PostgreSQL / Supabase (Cloud)
- Push-first sync, 11 tables synced
- 14 tables in migration schema + RLS policies
- Sync every 5 minutes (`SYNC_INTERVAL_MS: 300000` in `.env`)
- Often shows "self signed certificate in certificate chain" error (SSL config issue)

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

### 15 Workspace Plugins

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

Each workspace has: `index.ts` (registers plugin), a main component, and optionally `*-actions.ts` for registering tool actions.

---

## Scheduler (`electron/scheduler.cjs`)
- Uses **node-cron** for cron-based scheduling
- Each agent can have a schedule (cron expression + prompt template)
- Agent-specific prompts: Nutritionist (health goals), Finance (spending analysis), Developer (code review), Teacher (micro-learning), etc.
- System agent: CPU/memory/disk/Windows Update/Defender health checks
- Sends scheduled messages via `deliverAgentMessage()` which reads `agentJids` from WhatsApp settings

---

## Known Issues & Quirks

1. **WhatsApp groups not loading on panel open**: Fixed — now calls `loadGroups()` inside `status().then()` callback when connected
2. **Google OAuth 403 access_denied**: App in "Testing" mode — user must add their email as test user in Google Cloud Console
3. **n8n HTTP Request node v4.2 bug**: `requestOptions.json: false` prevents JSON serialization — use direct Buffer API instead
4. **Piper/Whisper Python servers fail**: Need `pip install flask` (and for wake word: `sounddevice`, `numpy`, `requests`)
5. **PostgreSQL sync SSL error**: "self signed certificate in certificate chain" — SSL configuration issue with Supabase
6. **Electron cache errors**: "Unable to move the cache: Access denied" — non-critical, Electron caching issue on Windows
7. **Agent ID mismatch**: "Social Media" in DB should map to "Marketing" — fixed by aliasing in frontend
8. **System agent `System:` label in scheduler**: Was using JS label instead of `case "System":` — fixed

---

## Key Files Reference

### Electron (Main Process)
- `electron/main.cjs` — Entry point, IPC, module init, agent tool permissions
- `electron/preload.cjs` — Context bridge, window.orun API
- `electron/agent-prompts.cjs` — All 15 agent system prompts
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

### React (Frontend)
- `src/app/App.tsx` — Root component
- `src/app/HomeScreen.tsx` — Main hub with all panels
- `src/app/constants.ts` — Agent definitions, isElectron flag
- `src/app/components/SocialMediaPanel.tsx` — Buffer config UI
- `src/app/components/WhatsAppPanel.tsx` — WhatsApp connection + group assignment
- `src/app/components/SettingsPanel.tsx` — Google OAuth + all settings
- `src/app/plugins/PluginRegistry.ts` — Plugin system registry
- `src/app/plugins/PluginHost.tsx` — Plugin host/lifecycle
- `src/i18n/translations.ts` — All translations (6300+ lines, 4 languages)
- `src/types/orun.d.ts` — TypeScript type definitions for window.orun
- `src/app/hooks/useChat.ts` — Chat state machine
- `src/app/hooks/useVoice.ts` — Voice recording + STT + wake word

### Infrastructure
- `package.json` — Scripts: `npm run dev` (Vite), `npm run electron:dev` (Vite + Electron), `npm run dist` (build)
- `.env` — `DATABASE_URL`, `DIRECT_URL`, `SYNC_INTERVAL_MS`
- `supabase/migrations/001_initial_schema.sql` — PostgreSQL schema
- `.github/workflows/build.yml` — CI/CD for Windows/macOS/Linux

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


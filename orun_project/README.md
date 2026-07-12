
  # Orun OS

  A desktop AI assistant app (Electron + React) with a real, working AI
  backend: pick a **local model via Ollama** or a **cloud model** (Claude /
  OpenAI) right from the Settings panel, and Hampton answers for real, with
  live streaming — no more scripted replies. Conversations are saved
  locally in SQLite and browsable from a history panel.

  ## What's actually implemented right now

  - ✅ Native desktop window (Electron), not just a browser tab
  - ✅ **Video boot screen** — your loading animation plays while Orun OS starts up
  - ✅ Real AI chat: **6 providers** — Ollama (local), Claude, OpenAI, OpenRouter, Groq, GitHub Models (cloud) — switchable anytime in Settings
  - ✅ **Free cloud model support** — OpenRouter (`:free` models), Groq (generous free tier), GitHub Models (free with a GitHub token), with quick-pick chips for known-good free model IDs
  - ✅ **Per-agent model assignment** — give any of the 18 agents its own provider/model instead of the global default (Settings → "Configure a different model per agent")
  - ✅ Streaming responses — text appears as it's generated
  - ✅ Conversation history — browse, resume, or delete past chats
  - ✅ Ollama model picker — dropdown of models you've already pulled
  - ✅ Configurable system prompt — give Hampton a persona
  - ✅ Context window trimming — long conversations don't grow unbounded (naive sliding window; see note below)
  - ✅ **n8n automation connector** — connect to a self-hosted or Cloud n8n instance, list workflows, and trigger any Webhook-node workflow with a JSON payload
  - ✅ **Hampton can trigger automations on its own (beta)** — define named automations (name, description, webhook) and, if you flip the toggle, Hampton decides mid-conversation when to fire one — it can only pick from what you've defined, never invents a URL
  - ✅ **Stop button** — cancels an in-flight response for real (aborts the actual HTTP request, not just the UI)
  - ✅ **AI-summarized context** — once a conversation exceeds the context window, older messages get compressed into an AI-generated summary instead of silently dropped (falls back to a plain trim if summarization itself fails)
  - ✅ **Usage tracking** — a "Usage today" panel shows requests + input/output tokens per provider, so you can see how close you are to a free tier's limits
  - ✅ **Automatic provider fallback** — configure a backup provider/model; if the primary one errors out before sending any content, Orun OS retries once on the fallback automatically
  - ✅ **Tray icon + background mode** — optionally keep Orun OS running after the window closes (Settings → "Keep running in the background"), reachable again from the system tray
  - ✅ **Real installers** — `npm run dist` produces an actual installable app; a GitHub Actions workflow builds Windows `.exe` / macOS `.dmg` / Linux `.AppImage` automatically and publishes them as a release
  - ✅ **In-app update button** — Settings → "Check for updates" checks, downloads, and offers to restart-and-install, no manual reinstall needed (once you've set up the GitHub repo — see below)
  - ✅ **Voice system (TTS)** — Hampton can talk back. 3 cloud engines (ElevenLabs, Google Cloud TTS, Azure Cognitive Services) + 4 local engine connectors (XTTS v2, Piper, Bark, F5-TTS). Type `/vozes` in chat to browse and pick a voice; type `/model` to browse and pick an AI model — both work the same way: double-click a provider to see its options, single-click a voice to preview it, double-click to select it
  - ✅ API keys (all 5 cloud AI providers + n8n + 3 cloud TTS providers) encrypted at rest via the OS keychain
  - ✅ **Real agent chats** — any agent can now hold its own conversation (not just Hampton), using whichever model you assigned it. Two agents have real specialized behavior: **Nutritionist** (photo of food → calorie/macro estimate → logged to a daily total) and **Personal Trainer** (generates a workout, can be scheduled to fire automatically every morning)
  - ✅ **Daily agent schedules** — any agent can be set to run automatically at a fixed time each day, delivered as an OS notification and/or WhatsApp message
  - ✅ **WhatsApp connector (beta)** — link your own WhatsApp, send yourself a food photo and get calories back, receive your morning workout automatically. Built on an unofficial library (Baileys), **not** Meta's official API — see the disclosure below
  - ✅ **Real mic dictation** — the mic button now actually transcribes speech (browser's built-in engine) instead of just toggling a "Listening" animation
  - ✅ **Soft wake word (beta)** — say "Hampton" or "Orun" to start talking hands-free; uses the same non-local speech engine, opt-in and clearly disclosed
  - ✅ **Sentence-by-sentence voice replies** — Hampton starts speaking each sentence as soon as it finishes streaming, instead of waiting for the whole reply
  - ✅ **Edit & regenerate messages** — fix a typo and resend, or regenerate Hampton's last reply, without wiping the whole conversation
  - ✅ **TTS usage tracking** — characters/requests per voice engine per day, next to the existing text-model usage panel
  - ✅ **Global hotkey** (`Ctrl/Cmd+Shift+H`) — bring Orun OS to the front from anywhere, useful now that it can run in the background
  - ✅ Conversations persisted locally in SQLite (`orun-os.sqlite3` in your user data folder)
  - ✅ Structured logging to disk (`electron-log`)
  - ✅ Auto-update wiring via `electron-updater` (inactive until you point `build.publish` at your own GitHub repo)
  - ✅ Installable build (`npm run dist`) → Windows `.exe` / macOS `.dmg` / Linux `.AppImage`
  - ✅ Automated tests for the AI router and the persistence layer (`npm test`)
  - ✅ Codebase split into focused files instead of one 900-line `App.tsx`

  Everything else described in the original project brief (3D avatar engine
  beyond the static SVG, Developer/Designer/Health/Finance agent *logic*,
  voice, most of the Automation Engine beyond n8n, plugin system, etc.) is
  **UI scaffolding only for now** — the buttons exist, the logic behind them
  doesn't yet. Per-agent models are *assigned* and saved, but individual
  agents don't have their own chat conversations wired up yet — only
  Hampton's main chat actually talks to a model today.

  ## Running it locally

  ```bash
  npm install                 # installs dependencies
  npm run electron:dev        # rebuilds native modules for Electron, then launches the app (hot reload)
  ```

  Web-only preview (no AI backend, uses the old scripted replies):
  ```bash
  npm run dev
  ```

  Run the test suite:
  ```bash
  npm test                    # rebuilds native modules for plain Node first, then runs vitest
  ```

  > **Why "rebuild" shows up twice above:** `better-sqlite3` is a native
  > module compiled against a specific JS-engine ABI. Electron and plain
  > Node.js use *different* ABIs, so the same install can't run both without
  > a quick recompile in between. `npm run electron:dev` / `npm run dist`
  > rebuild it for Electron; `npm test` rebuilds it for Node. You never have
  > to think about this unless you're running both back-to-back — each
  > script handles its own rebuild automatically.

  ## Building an installer

  **Locally** (produces an installer for whatever OS you run this on):
  ```bash
  npm run dist
  ```
  Output lands in `release/` — a `.exe` (Windows), `.dmg` (macOS) or
  `.AppImage` (Linux). This was tested end-to-end while building this
  project — a real 133MB `.AppImage` built and packaged cleanly on Linux.

  **All 3 platforms at once, without owning a Windows or Mac machine:**
  push this repo to GitHub — `.github/workflows/build.yml` is already set
  up. Run it manually (Actions tab → "Build installers" → Run workflow)
  for downloadable artifacts, or push a version tag
  (`git tag v0.1.0 && git push --tags`) to also publish a GitHub Release
  with all 3 installers attached — the same release the in-app update
  button checks against.

  ## In-app updates

  Settings → **"Check for updates"** — checks GitHub for a newer release,
  downloads it in the background (with a progress %), and once ready shows
  **"Restart & install update"**. Needs the repo set up first (below) —
  without that, it'll just say it couldn't check.

  ## Voice system — Hampton talking back

  Type **`/vozes`** in the chat box (instead of a normal message) to open
  the voice picker:
  1. Double-click a provider (ElevenLabs, Google Cloud TTS, Azure, XTTS v2,
     Piper, Bark, F5-TTS) to see its voices.
  2. Enter the API key (cloud) or local server URL (local engines), click
     "Save & refresh voices".
  3. **Single-click** a voice to hear a short sample. **Double-click** to
     select it — Hampton will now speak every reply out loud. A 🔊 icon
     appears in the chat header to mute/unmute without losing your choice.

  **`/model`** works the same way for AI models instead of voices: double-click
  a provider to see its models (Ollama's installed models, or known/free
  models for cloud providers), single-click one to make it the active model —
  a faster path than opening full Settings.

  ### About the 3 cloud voice APIs
  - **ElevenLabs** — real "list voices" API with a hosted preview per voice,
    so previews play instantly without using your quota.
  - **Google Cloud TTS** — needs a Google Cloud API key with the
    Text-to-Speech API enabled; previews are synthesized on the spot.
  - **Azure Cognitive Services** — needs both an API key *and* your Speech
    resource's region (e.g. `eastus`) — both fields show up when you open it.

  ### About the 4 local engines
  None of these are bundled — Orun OS doesn't ship a Python/ML runtime, same
  reasoning as n8n. Each connects to a server you run yourself:
  - **XTTS v2** — works with the community **xtts-api-server** wrapper
    (the closest thing to a standard for self-hosting XTTS v2).
  - **Piper** — there's no single standard Piper HTTP server, so this is a
    best-effort generic connector (`POST {text}` → raw audio back). No voice
    list — whichever `.onnx` voice the server loaded is what you get.
  - **Bark** — same situation as Piper for the server side, but Bark's voice
    *presets* (e.g. `en_speaker_0`) are a fixed public list, so those are
    built in and selectable even without a live server to ask.
  - **F5-TTS** — clones a voice from reference audio rather than picking a
    named voice, so it shows up as a single "Default" option that just
    defers to however your local server is configured.

  ## Real agent chats, WhatsApp, and daily schedules

  Click any agent in the Agents panel (not just Hampton) to open its own
  conversation, using whatever model you assigned it in "Per-agent models".
  Two agents go further than "has a persona":

  - **Nutritionist** — send a food photo (📎 in the chat box) and it replies
    with an estimate and a running daily total (Settings → per-agent →
    Nutritionist to see/change its model; needs a vision-capable model —
    GPT-4o, Claude, or Gemini via OpenRouter all work).
  - **Personal Trainer** — generates a single day's workout on request, and
    can be scheduled (⏰ icon next to the agent in "Per-agent models") to
    generate and deliver one automatically every morning.

  Any agent can get a daily schedule this way, not just Personal Trainer —
  it just happens to be the one that makes obvious sense for it.

  **Delivery**: a scheduled message always fires as an OS notification. If
  WhatsApp is connected (below), it's also sent there.

  ### WhatsApp (beta) — real but with a real trade-off to know about

  Settings → **WhatsApp connector** → scan the QR code with WhatsApp
  (Linked Devices → Link a Device), same as linking WhatsApp Web. Once
  connected, message yourself (WhatsApp's "Message Yourself" chat) — a food
  photo goes to the Nutritionist, text goes to Hampton, and your scheduled
  Personal Trainer message shows up there too.

  **This uses Baileys, an unofficial reverse-engineered WhatsApp Web
  client — not Meta's official Business API.** That's a deliberate choice:
  the official path requires a Meta Business account, phone verification,
  and app review, which doesn't fit "message yourself a food photo" as a
  personal project. The trade-off is that this technically violates
  WhatsApp's Terms of Service. For low-volume personal use (you messaging
  your own linked chat), the practical ban risk is low — but it isn't zero,
  and there's no official support if it goes wrong. This was implemented
  and syntax-checked but **could not be tested against a live WhatsApp
  account** in this environment — the first real link + message is the
  actual test.

  ### Wake word & mic dictation — not local

  Both the mic button and the "Hampton"/"Orun" wake word use the browser
  engine built into Electron (Chromium's `SpeechRecognition`). That engine
  sends audio to Google's servers to transcribe — it is **not** processed
  on your machine, unlike the local LLMs/TTS elsewhere in this app. Wake
  word is opt-in (Settings) and off by default for exactly this reason.

  ## Setting up an AI provider

  Open the app → click the gear icon (bottom of the sidebar) → **AI Engine Settings**:

  - **Local (Ollama)** — install [ollama.com](https://ollama.com), run
    `ollama pull llama3.1` once, then select "Ollama (Local)". A dropdown
    lists whatever models you've pulled. Nothing leaves your machine, no
    API key needed.
  - **Cloud (Claude / OpenAI)** — select the provider, paste your API key.
    It's encrypted with Electron's `safeStorage` (OS keychain) before it
    touches disk.
  - **System prompt** — edit Hampton's persona/instructions directly in the
    same panel.

  Use **Test connection** to confirm it's wired up before chatting. Past
  conversations live behind the history icon (clock) right above Settings.

  ## Free cloud providers — getting API keys

  - **OpenRouter** — [openrouter.ai](https://openrouter.ai) → create a key.
    Models ending in `:free` cost nothing (rate-limited: ~20 req/min, 50/day
    on a fresh account, 1,000/day after adding $10 in credits — you don't
    have to spend it, just having credits raises the free-tier cap).
  - **Groq** — [console.groq.com](https://console.groq.com) → API Keys.
    Free tier, extremely fast inference (their custom LPU hardware).
  - **GitHub Models** — GitHub → Settings → Developer settings → Personal
    access tokens → create one with the `models` scope. Free with GitHub-set
    rate limits.

  All three show up as quick-pick chips in Settings once selected, so you
  don't have to remember exact model IDs.

  ## Per-agent models

  Settings → **"Configure a different model per agent"** opens a table of
  all 18 agents. Leave an agent on "Default" to use the global AI Engine
  Settings, or pick a specific provider + model for it — e.g. Developer on
  Claude for code quality, Translator on a free Groq model to keep costs at
  zero. This is saved and ready, but note: **individual agents don't have
  their own chat UI yet** — only Hampton's main chat is wired to actually
  call a model right now. This sets up the assignment for when each agent
  gets real logic.

  ## Automation — connecting n8n

  Orun OS does **not** bundle or run n8n — n8n is a full Node/Postgres app,
  better run on its own. Instead, Orun OS connects to an n8n instance you
  already have (self-hosted via Docker, or n8n Cloud):

  1. Get n8n running — easiest is `docker run -it --rm -p 5678:5678 n8nio/n8n`, or use n8n Cloud.
  2. In n8n: Settings → n8n API → Create an API Key.
  3. In Orun OS: click the **Automation** icon in the sidebar → paste your
     n8n URL (e.g. `http://localhost:5678`) and API key → Test connection.
     This lists your workflows so you can confirm it's talking to the right instance.
  4. To actually run a workflow from Orun OS, build it in n8n starting with
     a **Webhook** node, activate the workflow, and paste its production
     webhook URL into the "Trigger a workflow" box — with an optional JSON
     payload and header auth if you configured one.

  This is a working connector today, manual by default — Hampton only fires
  a workflow on its own if you turn on "Let Hampton trigger these
  automatically" (beta) in the Automation panel and define at least one
  named automation there (name + description + webhook URL). Hampton sees
  the name/description of each one in its system prompt and decides for
  itself, mid-conversation, whether the user's request matches — it can
  only pick from what you've explicitly defined, never invent a URL.

  ## Setting up auto-update (required for the "Check for updates" button)

  `electron-updater` and the update button are wired in, but need a real
  release feed to check against:
  1. Push this repo to your own GitHub repo.
  2. Replace `CHANGE_ME` in `package.json` → `build.publish.owner` with your GitHub username.
  3. Either push a version tag (triggers the CI workflow to build + publish
     automatically) or run `npm run dist` locally and upload the installer
     + `latest*.yml` files from `release/` to a GitHub Release yourself.

  From then on, both the startup auto-check and the Settings button check
  that repo's releases.

  ## Project layout

  ```
  .github/workflows/build.yml  CI: builds Windows/macOS/Linux installers, publishes releases
  build/
    icon.png / tray-icon.png    Generated app + tray icons (swap anytime)
  electron/
    main.cjs          Electron main process — window, tray, IPC handlers, logging, auto-update
    preload.cjs        Secure bridge exposed to the UI as window.orun (incl. streaming)
    ai-router.cjs         Routes chat (streaming + non-streaming) to all 6 providers
    tts-router.cjs        Routes text-to-speech to all 7 voice engines
    agent-prompts.cjs      Default persona per agent + Nutritionist/Personal Trainer parsing
    whatsapp.cjs           WhatsApp connector (Baileys) — QR link, message routing
    scheduler.cjs           Daily agent schedules (node-cron)
    n8n.cjs              n8n REST API + webhook connector
    db.cjs              SQLite: conversations (+ per-agent), messages, settings, usage, nutrition log
    __tests__/            Vitest unit tests for the above (19 tests)
  public/
    loading.mp4          Boot screen video
  src/app/
    App.tsx                        Root: splash → boot → home phase orchestration
    HomeScreen.tsx                 Main screen: avatar, chat, streaming, conversation switching
    types.ts / constants.ts        Shared types and static data
    components/
      SplashScreen.tsx / BootSequence.tsx     Startup sequence (video boot screen)
      HamptonAvatar.tsx                       The SVG avatar + animation states
      Sidebar.tsx / StatusBar.tsx             Navigation chrome
      AgentsPanel.tsx / ConversationList.tsx  Slide-out panels
      SettingsPanel.tsx                       AI provider / model / API key / system prompt / updates
      AgentModelsPanel.tsx                    Per-agent model assignment
      AutomationPanel.tsx                     n8n connector
      UsagePanel.tsx                          Requests/tokens per provider today
      VoicesPicker.tsx                        /vozes — voice engine + voice selection
      ModelPicker.tsx                         /model — quick model switch from chat
      WhatsAppPanel.tsx                       WhatsApp QR link + status
      ChatInput.tsx / MessageBubble.tsx       Chat UI primitives (incl. image attach, edit/regenerate)
      GlobalStyles.tsx / CustomCursor.tsx     Visual polish
  ```

  ## Known limitations (roadmap)

  - **Only Nutritionist and Personal Trainer have real specialized logic.**
    The other 16 agents get the same real chat infrastructure (their own
    conversation, their own assigned model, a default persona) but not
    distinct behavior yet — same honest gap as always, just moved one
    layer deeper.
  - **WhatsApp is untested against a live account** — built and
    syntax-checked correctly, but this environment can't scan a QR code or
    hold a real WhatsApp session. The first real link is the real test.
  - **WhatsApp/Baileys is unofficial** and technically against WhatsApp's
    ToS — low ban risk for personal low-volume use, not zero.
  - **Wake word and mic dictation are not local** — Chromium's speech
    engine sends audio to Google. There is currently no local/offline
    speech-to-text option (unlike the local LLM and local TTS options).
  - **The conversation database is not encrypted** — only API keys are
    (via `safeStorage`). `orun-os.sqlite3`, including nutrition logs and
    every conversation, is plain SQLite on disk. Worth real encryption
    (e.g. SQLCipher) as a follow-up if sensitive data ends up in there.
  - Cloud TTS (ElevenLabs, Google, Azure) costs real money past their free
    tiers — Hampton speaking every reply adds up faster than text chat.
    There's a mute toggle (🔊 in the chat header) but no per-message opt-out yet.
  - Piper, Bark, and F5-TTS have no true standard local server, unlike
    Ollama for LLMs — the connectors are best-effort and may need small
    tweaks to match whatever wrapper you're actually running.
  - Context summarization uses one extra AI call on the same provider —
    if that provider is slow/rate-limited, the summary silently falls back
    to a plain trim rather than blocking the real reply.
  - Provider fallback only kicks in if the primary provider fails *before*
    streaming any content — a failure mid-stream just surfaces the error.
  - Hampton's autonomous n8n triggering is genuinely beta — relies on the
    model reliably emitting a specific tag; works best with capable models.
  - The tray icon is a generated placeholder — swap `build/icon.png` /
    `build/tray-icon.png` for your own art anytime.
  - Auto-update needs your own GitHub repo configured before it does anything.

  ## Original design

  This is a code bundle for Complete the task. The original project is available at https://www.figma.com/design/JJ1lhLCGRbSIB1i6taOk1S/Complete-the-task.
  
// electron/proactive.cjs
//
// Proactivity: Hampton fala por conta própria em momentos oportunos.
//  - Boot: após o app carregar, se a voz estiver habilitada, faz uma saudação.
//  - Spotify: quando o usuário começa a tocar música, pergunta o que quer ouvir.
//  - Apps: quando o usuário abre/fica em um app mapeado (VSCode, navegador,
//    Explorador de Arquivos, terminal...), pergunta se precisa de ajuda.
//
// Gated por settings persistidos:
//  - proactiveGreeting (boolean, default ON)
//  - proactiveSpotify (boolean, default ON)
//  - proactiveApps (boolean, default OFF — perguntar ao abrir apps irrita; quem
//    quiser pode reativar no Settings → Sistema de Voz)
// Requer wake word habilitado (voz ativa) + TTS configurado para falar.

const { spawn } = require("child_process");

const PROACTIVE_DEBOUNCE_MS = 60000;
const BOOT_GREETING_DELAY_MS = 15000;
const SPOTIFY_POLL_MS = 6000;
const APP_POLL_MS = 8000;
const APP_DEBOUNCE_MS = 600000; // 10 min por app (evita re-perguntar ao alternar entre janelas)
const FOREGROUND_TIMEOUT_MS = 3000;

// Processos do próprio Orun que nunca devem disparar proatividade.
const EXCLUDED_PROCESSES = new Set([
  "electron",
  "orun",
  "orun os",
  "orun-os",
]);

// Processo (foreground) → prompt proativo. Spotify fica de fora: o watcher de
// música (via API) já cobre a reação a "começou a tocar".
const APP_PROMPTS = {
  "code": "O usuário acabou de abrir o Visual Studio Code. Pergunte em que ele vai trabalhar hoje e se precisa de ajuda (ex.: revisar código, refatorar, escrever testes, corrigir um bug). Seja breve.",
  "code-insiders": "O usuário acabou de abrir o Visual Studio Code Insiders. Pergunte em que ele vai trabalhar hoje e se precisa de ajuda. Seja breve.",
  "browser": "O usuário acabou de abrir o navegador. Pergunte se ele está pesquisando algo ou se precisa de ajuda com alguma informação na internet. Seja breve.",
  "explorer": "O usuário acabou de abrir o Explorador de Arquivos. Pergunte se precisa de ajuda para organizar, encontrar ou gerenciar arquivos. Seja breve.",
  "terminal": "O usuário acabou de abrir um terminal. Ofereça ajuda com comandos, scripts ou automação. Seja breve.",
  "notepad": "O usuário acabou de abrir um editor de texto simples. Pergunte se precisa de ajuda para escrever algo. Seja breve.",
  "discord": "O usuário acabou de abrir o Discord. Pergunte se precisa de ajuda para preparar mensagens ou resumos de conversas. Seja breve.",
  "word": "O usuário acabou de abrir o Microsoft Word. Pergunte se precisa de ajuda com o documento (estrutura, revisão, texto). Seja breve.",
  "excel": "O usuário acabou de abrir o Microsoft Excel. Pergunte se precisa de ajuda com a planilha (fórmulas, análise, dados). Seja breve.",
  "powerpoint": "O usuário acabou de abrir o Microsoft PowerPoint. Pergunte se precisa de ajuda com a apresentação. Seja breve.",
};

// Nome do processo (lowercase) → chave do prompt.
const PROCESS_TO_KEY = {
  "code": "code",
  "chrome": "browser",
  "msedge": "browser",
  "firefox": "browser",
  "brave": "browser",
  "opera": "browser",
  "vivaldi": "browser",
  "arc": "browser",
  "explorer": "explorer",
  "windowsterminal": "terminal",
  "terminal": "terminal",
  "cmd": "terminal",
  "pwsh": "terminal",
  "notepad": "notepad",
  "discord": "discord",
  "winword": "word",
  "excel": "excel",
  "powerpnt": "powerpoint",
};

function resolveAppKey(processName) {
  if (!processName || typeof processName !== "string") return null;
  const name = processName.trim().toLowerCase();
  if (!name || EXCLUDED_PROCESSES.has(name)) return null;
  if (name.startsWith("code - insiders") || name === "code - insiders") return "code-insiders";
  if (name === "code" || name.startsWith("code ")) return "code";
  return PROCESS_TO_KEY[name] || null;
}

// Janelas do shell/desktop (ex.: Win+D / "Mostrar área de trabalho", taskbar,
// Progman) têm MainWindowTitle vazio. NÃO são apps que o usuário "abriu":
// ignorá-las evita o overlay de voz disparar sempre que o usuário minimiza e
// restaura todos os apps (o desktop vira foreground e o `explorer.exe` sem
// título era confundido com "abriu o Explorador de Arquivos").
function isAppWindow(name, title) {
  return !!title && typeof title === "string" && title.trim().length > 0;
}

const PS_SCRIPT = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class OrunForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
'@
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line -ne 'ping') { continue }
  $h = [OrunForeground]::GetForegroundWindow()
  [uint32]$procId = 0
  [OrunForeground]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
  $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($null -ne $p) { [Console]::Out.WriteLine($p.ProcessName + '|' + $p.MainWindowTitle) } else { [Console]::Out.WriteLine('||') }
  [Console]::Out.Flush()
}
`;

function createProactiveEvents({ log, getDb, getSpotifyClient, sendToRenderer }) {
  let started = false;
  let bootTimer = null;
  let spotifyTimer = null;
  let appTimer = null;
  let lastFireAt = 0;
  let spotifyWasPlaying = false;

  // Foreground watcher state
  let psProc = null;
  let psLineBuffer = "";
  let psResolvers = [];
  let appPrimed = false;
  let lastAppKey = null;
  const appFireAt = new Map();

  function voiceEnabled() {
    const db = getDb();
    return db && db.getSetting("wakeWordEnabled", false) === true;
  }

  function ttsConfigured() {
    const db = getDb();
    if (!db) return false;
    const tts = db.getSetting("tts", null);
    return !!(tts && tts.engine && tts.voiceId);
  }

  function fire(prompt, source) {
    const now = Date.now();
    if (now - lastFireAt < PROACTIVE_DEBOUNCE_MS) return false;
    if (!voiceEnabled() || !ttsConfigured()) return false;
    lastFireAt = now;
    log.info(`[proactive] ${source}: ${prompt.slice(0, 80)}`);
    try {
      sendToRenderer({ prompt, source });
    } catch (err) {
      log.error(`[proactive] sendToRenderer failed (${source}):`, err.message);
    }
    return true;
  }

  function scheduleBootGreeting(windowLoadedPromise) {
    const db = getDb();
    if (!db || db.getSetting("proactiveGreeting", true) === false) return;
    (windowLoadedPromise || Promise.resolve()).then(() => {
      bootTimer = setTimeout(() => {
        fire(
          "O usuário acabou de ligar o computador. Diga oi de forma calorosa, apresente-se em uma linha e pergunte em que pode ajudar hoje. Seja breve.",
          "boot"
        );
      }, BOOT_GREETING_DELAY_MS);
    }).catch(() => {});
  }

  async function checkSpotify() {
    const spotifyClient = getSpotifyClient();
    const db = getDb();
    if (!spotifyClient || !db || db.getSetting("proactiveSpotify", true) === false) {
      spotifyWasPlaying = false;
      return;
    }
    let playing = false;
    try {
      const playback = await spotifyClient.getPlayback();
      playing = !!(playback && playback.is_playing);
    } catch {
      return; // erro transitório / não conectado → mantém estado anterior
    }
    if (playing && !spotifyWasPlaying) {
      fire(
        "O usuário acabou de começar a tocar música no Spotify. Seja breve e pergunte o que ele quer ouvir agora, oferecendo ajuda com o controle da música.",
        "spotify"
      );
    }
    spotifyWasPlaying = playing;
  }

  // ── Foreground app watcher (Windows) ──────────────────────────────────
  // Um único processo PowerShell persistente responde "name|title" da janela
  // em primeiro plano a cada "ping" (barato: sem spawn a cada poll).

  function startForegroundProbe() {
    try {
      psProc = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", PS_SCRIPT], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      psProc.stdout.on("data", (d) => {
        psLineBuffer += d.toString();
        let idx;
        while ((idx = psLineBuffer.indexOf("\n")) >= 0) {
          const line = psLineBuffer.slice(0, idx).replace(/\r$/, "").trim();
          psLineBuffer = psLineBuffer.slice(idx + 1);
          const r = psResolvers.shift();
          if (r) r(line);
        }
      });
      psProc.on("error", () => { psProc = null; });
      psProc.on("exit", () => { psProc = null; });
    } catch {
      psProc = null;
    }
  }

  function requestForeground() {
    return new Promise((resolve) => {
      if (!psProc || psProc.killed) startForegroundProbe();
      if (!psProc) { resolve("||"); return; }
      const timer = setTimeout(() => { resolve("||"); }, FOREGROUND_TIMEOUT_MS);
      psResolvers.push((line) => { clearTimeout(timer); resolve(line); });
      try {
        psProc.stdin.write("ping\n");
      } catch {
        clearTimeout(timer);
        resolve("||");
      }
    });
  }

  async function checkForegroundApp() {
    const db = getDb();
    if (!db || db.getSetting("proactiveApps", false) === false) {
      appPrimed = false;
      return;
    }
    const line = await requestForeground();
    const [name, title] = (line || "").split("|");
    // Ignora o desktop/shell (janela de foreground sem título — ex.: Win+D).
    // Sem isso, minimizar e restaurar todos os apps fazia o desktop virar o
    // foreground e o `explorer.exe` (sem título) era tratado como "abriu o
    // Explorador de Arquivos", disparando o overlay de voz.
    if (!isAppWindow(name, title)) return;
    const key = resolveAppKey(name);
    // Sticky: quando a janela fica desconhecida (ex.: app minimizado / Orun em
    // primeiro plano), mantém o último app mapeado. Assim minimizar e voltar
    // para o MESMO app não dispara nova pergunta.
    if (!key) return;
    if (key === lastAppKey) return;
    lastAppKey = key;
    if (!appPrimed) { appPrimed = true; return; } // primeira amostra = baseline
    // Dispara no máximo UMA vez por app por sessão (não re-pergunta depois de 10 min).
    if (appFireAt.has(key)) return;
    appFireAt.set(key, Date.now());
    fire(APP_PROMPTS[key], "app:" + key);
  }

  function startForegroundWatcher() {
    appTimer = setInterval(() => {
      checkForegroundApp().catch(() => {});
    }, APP_POLL_MS);
  }

  function stopForegroundWatcher() {
    if (appTimer) { clearInterval(appTimer); appTimer = null; }
    if (psProc && !psProc.killed) {
      try { psProc.kill(); } catch {}
    }
    psProc = null;
    psResolvers = [];
    appPrimed = false;
    lastAppKey = null;
    appFireAt.clear();
  }

  function start(options = {}) {
    if (started) return;
    started = true;
    scheduleBootGreeting(options.windowLoadedPromise);
    spotifyTimer = setInterval(() => {
      checkSpotify().catch(() => {});
    }, SPOTIFY_POLL_MS);
    startForegroundWatcher();
    log.info("[proactive] started (boot greeting + spotify watcher + foreground app watcher)");
  }

  function stop() {
    started = false;
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    if (spotifyTimer) { clearInterval(spotifyTimer); spotifyTimer = null; }
    stopForegroundWatcher();
    spotifyWasPlaying = false;
  }

  return { start, stop, resolveAppKey };
}

module.exports = {
  createProactiveEvents,
  resolveAppKey,
  isAppWindow,
  APP_PROMPTS,
  PROACTIVE_DEBOUNCE_MS,
  BOOT_GREETING_DELAY_MS,
  SPOTIFY_POLL_MS,
  APP_POLL_MS,
  APP_DEBOUNCE_MS,
};

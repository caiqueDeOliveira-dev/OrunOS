// background-services.cjs
// Manages background processes: wake word listener and Piper TTS server.

const path = require("path");
const fs = require("fs");
const net = require("net");

function createBackgroundServices({ app, db, log, mainWindow }) {
  const { spawn } = require("child_process");
  const { randomBytes } = require("crypto");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  // ── Wake Word Service ──────────────────────────────────────────────
  let wakeWordProcess = null;
  let wakeWordServer = null;
  const WAKE_PORT = 8081;
  const WAKE_TOKEN = randomBytes(16).toString("hex"); // Auth token for TCP messages
  // Dependency check cache: prevents the blocking python --version / import
  // probes from re-running on every startWakeWordService() call (the renderer
  // can call start() frequently). Only refreshed on explicit restart/test.
  let wakeDepsCheckedAt = 0;
  let wakeDepsOk = false;
  const WAKE_DEPS_RECHECK_MS = 60 * 1000;

  // ── TTS echo suppression ─────────────────────────────────────────────
  // The renderer reports when TTS audio is playing (voice:tts-state IPC) so
  // wake-word false positives — the mic picking up the assistant's own voice
  // (echo) and re-triggering "ok orun" — are dropped. Suppresses during
  // playback plus a short window after it ends.
  let ttsPlaying = false;
  let lastTtsEndAt = 0;
  const WAKE_ECHO_COOLDOWN_MS = 2500;

  function setTtsState(playing) {
    ttsPlaying = !!playing;
    if (!ttsPlaying) lastTtsEndAt = Date.now();
  }

  function showOverlayFromWake(text) {
    if (ttsPlaying || Date.now() - lastTtsEndAt < WAKE_ECHO_COOLDOWN_MS) {
      log.info("[wake] suppressed (TTS echo window)");
      return;
    }
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    if (text && typeof text === "string" && text.trim()) {
      // Wake word + command captured in the same utterance: open the overlay
      // already primed with the transcribed command → the agent acts directly,
      // no second phrase needed.
      log.info(`[wake] Command: "${text.trim()}"`);
      mainWindow.webContents.send("voice-overlay:proactive", { prompt: text.trim(), source: "wake" });
    } else {
      mainWindow.webContents.send("voice-overlay:show");
    }
  }

  // ── TCP server p/ wake word (compartilhado entre modo subprocesso e daemon) ──
  // Em modo daemon, o daemon roda a detecção internamente e sinaliza AQUI via
  // TCP — o protocolo é idêntico ao do wake_word_service.py (JSON {type, token}).
  function ensureWakeTcpServer() {
    if (wakeWordServer) return;
    wakeWordServer = net.createServer((socket) => {
      let data = "";
      socket.on("data", (chunk) => { data += chunk.toString(); });
      socket.on("end", () => {
        try {
          const msg = JSON.parse(data);
          if (msg.token !== WAKE_TOKEN) {
            log.warn("[wake] Unauthorized wake attempt (invalid token)");
            return;
          }
          if (msg.type === "wake") {
            log.info("[wake] Wake word detected via TCP");
            showOverlayFromWake(msg.text);
          }
        } catch { /* ignore malformed messages */ }
      });
    });
    wakeWordServer.listen(WAKE_PORT, "127.0.0.1", () => {
      log.info(`[wake] TCP server listening on port ${WAKE_PORT}`);
    });
    wakeWordServer.on("error", (err) => {
      log.error("[wake] TCP server error:", err.message);
      wakeWordServer = null;
    });
  }

  function startWakeWordService() {
    if (wakeWordProcess) return;

    const scriptPath = path.join(__dirname, "..", "wake_word_service.py");
    if (!fs.existsSync(scriptPath)) {
      log.warn("[wake] wake_word_service.py not found at", scriptPath);
      return;
    }

    // Verify Python is available (cached — only once per recheck window)
    const now = Date.now();
    if (now - wakeDepsCheckedAt < WAKE_DEPS_RECHECK_MS) {
      if (!wakeDepsOk) return; // Already failed recently — avoid blocking probes
    } else {
      wakeDepsCheckedAt = now;
      try {
        const { execSync } = require("child_process");
        const pyVersion = execSync(`${pythonCmd} --version`, { timeout: 5000, stdio: "pipe" }).toString().trim();
        log.info(`[wake] Python found: ${pyVersion}`);
        try {
          execSync(`${pythonCmd} -c "import sounddevice, numpy, requests"`, { timeout: 10000, stdio: "pipe" });
          log.info("[wake] Required Python packages: OK");
          wakeDepsOk = true;
        } catch (err) {
          log.error("[wake] Missing Python packages:", err.message);
          log.error("[wake] Install with: pip install sounddevice numpy requests");
          wakeDepsOk = false;
          return;
        }
      } catch (err) {
        log.error("[wake] Python not found or not working:", err.message);
        log.error("[wake] Make sure Python is installed and in your PATH");
        wakeDepsOk = false;
        return;
      }
    }

    if (!wakeWordServer) {
      ensureWakeTcpServer();
    }

    // Use 127.0.0.1, NOT localhost: no Windows "localhost" can resolve to ::1
    // first, and a Docker/other service listening on ::1:8080 would hijack the
    // wake-word STT requests (STT server binds only to 127.0.0.1).
    const sttUrl = db.getSetting("stt", {})?.baseUrl || "http://127.0.0.1:8080";
    wakeWordProcess = spawn(pythonCmd, [scriptPath, "--port", String(WAKE_PORT), "--stt-url", sttUrl, "--token", WAKE_TOKEN, "--verbose"], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    wakeWordProcess.on("error", (err) => {
      log.error("[wake] Failed to start:", err.message);
      wakeWordProcess = null;
    });
    wakeWordProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[wake]", line);
    });
    wakeWordProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[wake:err]", line);
    });
    wakeWordProcess.on("exit", (code) => {
      log.info(`[wake] Service exited with code ${code}`);
      wakeWordProcess = null;
    });

    log.info("[wake] Background wake word service started");
  }

  function killWithTimeout(proc, label, timeoutMs = 3000) {
    if (!proc) return;
    try {
      proc.kill();
      const timer = setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch {}
      }, timeoutMs);
      proc.on("exit", () => clearTimeout(timer));
    } catch {}
  }

  function stopWakeWordService() {
    if (wakeWordProcess) { killWithTimeout(wakeWordProcess, "wake"); wakeWordProcess = null; }
    if (wakeWordServer) { wakeWordServer.close(); wakeWordServer = null; }
    wakeDepsCheckedAt = 0;
    wakeDepsOk = false;
    log.info("[wake] Background wake word service stopped");
  }

  // ── Piper TTS Server ───────────────────────────────────────────────
  let piperProcess = null;
  const PIPER_PORT = 5002;

  // ── Edge TTS Server (free neural voices fallback) ───────────────────
  let edgeProcess = null;
  const EDGE_PORT = 5003;

  function startEdgeTtsServer() {
    if (edgeProcess) return;
    const scriptPath = path.join(__dirname, "..", "edge_tts_server.py");
    if (!fs.existsSync(scriptPath)) return;

    edgeProcess = spawn(pythonCmd, [scriptPath, "--port", String(EDGE_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    edgeProcess.on("error", (err) => {
      log.error("[edge] Failed to start:", err.message);
      edgeProcess = null;
    });
    edgeProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[edge]", line);
    });
    edgeProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[edge:err]", line);
    });
    edgeProcess.on("exit", () => { edgeProcess = null; });
    log.info("[edge] Edge TTS server starting on port", EDGE_PORT);
  }

  function stopEdgeTtsServer() {
    if (edgeProcess) { killWithTimeout(edgeProcess, "edge"); edgeProcess = null; }
  }

  function startPiperServer() {
    if (piperProcess) return;
    const scriptPath = path.join(__dirname, "..", "piper_server.py");
    if (!fs.existsSync(scriptPath)) return;

    piperProcess = spawn(pythonCmd, [scriptPath, "--port", String(PIPER_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    piperProcess.on("error", (err) => {
      log.error("[piper] Failed to start:", err.message);
      piperProcess = null;
    });
    piperProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[piper]", line);
    });
    piperProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[piper:err]", line);
    });
    piperProcess.on("exit", () => { piperProcess = null; });
    log.info("[piper] Local TTS server starting on port", PIPER_PORT);
  }

  function stopPiperServer() {
    if (piperProcess) { killWithTimeout(piperProcess, "piper"); piperProcess = null; }
  }

  // ── Whisper STT Server ─────────────────────────────────────────────
  let sttProcess = null;
  const STT_PORT = 8080;

  function startSttServer() {
    if (sttProcess) return;
    const scriptPath = path.join(__dirname, "..", "stt_server.py");
    if (!fs.existsSync(scriptPath)) return;

    const sttCfg = db.getSetting("stt", {}) || {};
    const args = ["--port", String(STT_PORT)];
    if (sttCfg.model) args.push("--model", sttCfg.model);
    if (sttCfg.device) args.push("--device", sttCfg.device);
    if (sttCfg.computeType) args.push("--compute-type", sttCfg.computeType);

    sttProcess = spawn(pythonCmd, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    sttProcess.on("error", (err) => {
      log.error("[stt] Failed to start:", err.message);
      sttProcess = null;
    });
    sttProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[stt]", line);
    });
    sttProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[stt:err]", line);
    });
    sttProcess.on("exit", () => { sttProcess = null; });
    log.info(`[stt] Whisper STT server starting on port ${STT_PORT} (model=${sttCfg.model || "small"}, device=${sttCfg.device || "cpu"})`);
  }

  function stopSttServer() {
    if (sttProcess) { killWithTimeout(sttProcess, "stt"); sttProcess = null; }
  }

  // ── Daemon unificado (STT + TTS + Wake num processo só) ──────────────
  // Opt-in via setting "voiceDaemon" (default off). Substitui os subprocessos
  // de STT (8080), Edge TTS (5003) e wake word por um único daemon_server.py
  // que bind as mesmas portas — o app não precisa saber de diferença. Se o
  // daemon falhar ao iniciar, volta gracioso para os subprocessos individuais.
  let daemonProcess = null;

  function startDaemon() {
    if (daemonProcess) return;
    const scriptPath = path.join(__dirname, "..", "daemon_server.py");
    if (!fs.existsSync(scriptPath)) return;

    const sttCfg = db.getSetting("stt", {}) || {};
    const args = [
      "--stt-port", String(STT_PORT),
      "--tts-port", String(EDGE_PORT),
      "--wake-port", String(WAKE_PORT),
      "--wake-token", WAKE_TOKEN,
      "--host", "127.0.0.1",
    ];
    if (sttCfg.model) args.push("--model", sttCfg.model);
    if (sttCfg.device) args.push("--device", sttCfg.device);
    if (sttCfg.computeType) args.push("--compute-type", sttCfg.computeType);

    // O daemon sinaliza o wake via TCP no próprio main process.
    ensureWakeTcpServer();

    daemonProcess = spawn(pythonCmd, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    daemonProcess.on("error", (err) => {
      log.error("[daemon] Failed to start:", err.message);
      daemonProcess = null;
    });
    daemonProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[daemon]", line);
    });
    daemonProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[daemon:err]", line);
    });
    daemonProcess.on("exit", (code) => {
      log.info(`[daemon] Daemon exited with code ${code}`);
      daemonProcess = null;
    });
    log.info(`[daemon] Daemon unificado iniciando (STT :${STT_PORT}, TTS :${EDGE_PORT}, Wake :${WAKE_PORT})`);
  }

  function stopDaemon() {
    if (daemonProcess) { killWithTimeout(daemonProcess, "daemon"); daemonProcess = null; }
  }

  // ── Kokoro TTS Server (neural, pt-BR) ──────────────────────────────
  let kokoroProcess = null;
  const KOKORO_PORT = 5004;

  function startKokoroServer() {
    if (kokoroProcess) return;
    const scriptPath = path.join(__dirname, "..", "kokoro_server.py");
    if (!fs.existsSync(scriptPath)) return;

    kokoroProcess = spawn(pythonCmd, [scriptPath, "--port", String(KOKORO_PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    kokoroProcess.on("error", (err) => {
      log.error("[kokoro] Failed to start:", err.message);
      kokoroProcess = null;
    });
    kokoroProcess.stdout?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.info("[kokoro]", line);
    });
    kokoroProcess.stderr?.on("data", (buf) => {
      const line = buf.toString().trim();
      if (line) log.warn("[kokoro:err]", line);
    });
    kokoroProcess.on("exit", () => { kokoroProcess = null; });
    log.info("[kokoro] Kokoro TTS server starting on port", KOKORO_PORT);
  }

  function stopKokoroServer() {
    if (kokoroProcess) { killWithTimeout(kokoroProcess, "kokoro"); kokoroProcess = null; }
  }

  // ── Register IPC handlers ──────────────────────────────────────────
  const { ipcMain } = require("electron");
  ipcMain.handle("app:start-wake-listener", () => { startWakeWordService(); return true; });
  ipcMain.handle("app:stop-wake-listener", () => { stopWakeWordService(); return true; });
  ipcMain.handle("app:wake-listener-status", () => ({ running: !!wakeWordProcess }));
  ipcMain.handle("app:restart-wake-listener", () => {
    stopWakeWordService();
    setTimeout(() => startWakeWordService(), 500);
    return true;
  });
  // Renderer → main: report TTS playback state so the wake word service can
  // suppress echo-triggered false positives.
  ipcMain.on("voice:tts-state", (_event, { playing } = {}) => {
    setTtsState(playing);
  });
  ipcMain.handle("app:test-wake-word", async () => {
    // Quick diagnostic: test Python, deps, and STT connectivity
    const { execSync } = require("child_process");
    const results = {};
    try {
      execSync(`${pythonCmd} --version`, { timeout: 5000, stdio: "pipe" });
      results.python = true;
    } catch { results.python = false; }
    try {
      execSync(`${pythonCmd} -c "import sounddevice, numpy, requests"`, { timeout: 10000, stdio: "pipe" });
      results.packages = true;
    } catch { results.packages = false; }
    try {
      const sock = new net.Socket();
      await new Promise((resolve, reject) => {
        sock.setTimeout(2000);
        sock.on("connect", () => { sock.destroy(); resolve(); });
        sock.on("error", reject);
        sock.on("timeout", reject);
        sock.connect(WAKE_PORT, "127.0.0.1");
      });
      results.tcpPort = true;
    } catch { results.tcpPort = false; }
    return results;
  });

  return {
    start: () => {
      const useDaemon = db.getSetting("voiceDaemon", false) === true;
      if (useDaemon) {
        // Modo daemon: um único processo cobre STT (8080), Edge TTS (5003) e
        // wake word. Piper/Kokoro continuam como subprocessos independentes.
        log.info("[services] voiceDaemon=ON — usando daemon unificado");
        startDaemon();
        startPiperServer();
        startKokoroServer();
        return;
      }

      if (db.getSetting("backgroundListening", false)) startWakeWordService();
      startPiperServer();
      startSttServer();
      startEdgeTtsServer();
      startKokoroServer();
    },
    stop: () => {
      stopWakeWordService();
      stopPiperServer();
      stopSttServer();
      stopEdgeTtsServer();
      stopKokoroServer();
      stopDaemon();
    },
  };
}

module.exports = { createBackgroundServices };

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

  function showOverlayFromWake() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
    mainWindow.webContents.send("voice-overlay:show");
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
      wakeWordServer = net.createServer((socket) => {
        let data = "";
        socket.on("data", (chunk) => { data += chunk.toString(); });
        socket.on("end", () => {
          try {
            const msg = JSON.parse(data);
            // Validate auth token
            if (msg.token !== WAKE_TOKEN) {
              log.warn("[wake] Unauthorized wake attempt (invalid token)");
              return;
            }
            if (msg.type === "wake") {
              log.info("[wake] Wake word detected via TCP");
              showOverlayFromWake();
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

    const sttUrl = db.getSetting("stt", {})?.baseUrl || "http://localhost:8080";
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
    },
  };
}

module.exports = { createBackgroundServices };

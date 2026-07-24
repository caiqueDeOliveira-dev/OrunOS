// background-services.cjs
// Manages background processes: wake word listener and Piper TTS server.

const path = require("path");
const fs = require("fs");
const net = require("net");

function createBackgroundServices({ app, db, log, mainWindow }) {
  const { spawn } = require("child_process");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  // ── Wake Word Service ──────────────────────────────────────────────
  let wakeWordProcess = null;
  let wakeWordServer = null;
  const WAKE_PORT = 8081;

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

    // Verify Python is available
    try {
      const { execSync } = require("child_process");
      const pyVersion = execSync(`${pythonCmd} --version`, { timeout: 5000, stdio: "pipe" }).toString().trim();
      log.info(`[wake] Python found: ${pyVersion}`);
    } catch (err) {
      log.error("[wake] Python not found or not working:", err.message);
      log.error("[wake] Make sure Python is installed and in your PATH");
      return;
    }

    // Verify dependencies
    try {
      const { execSync } = require("child_process");
      execSync(`${pythonCmd} -c "import sounddevice, numpy, requests"`, { timeout: 10000, stdio: "pipe" });
      log.info("[wake] Required Python packages: OK");
    } catch (err) {
      log.error("[wake] Missing Python packages:", err.message);
      log.error("[wake] Install with: pip install sounddevice numpy requests");
      return;
    }

    if (!wakeWordServer) {
      wakeWordServer = net.createServer((socket) => {
        let data = "";
        socket.on("data", (chunk) => { data += chunk.toString(); });
        socket.on("end", () => {
          try {
            const msg = JSON.parse(data);
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
    wakeWordProcess = spawn(pythonCmd, [scriptPath, "--port", String(WAKE_PORT), "--stt-url", sttUrl, "--verbose"], {
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
    log.info("[wake] Background wake word service stopped");
  }

  // ── Piper TTS Server ───────────────────────────────────────────────
  let piperProcess = null;
  const PIPER_PORT = 5002;

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

    sttProcess = spawn(pythonCmd, [scriptPath, "--port", String(STT_PORT)], {
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
    log.info("[stt] Whisper STT server starting on port", STT_PORT);
  }

  function stopSttServer() {
    if (sttProcess) { killWithTimeout(sttProcess, "stt"); sttProcess = null; }
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
    },
    stop: () => {
      stopWakeWordService();
      stopPiperServer();
      stopSttServer();
    },
  };
}

module.exports = { createBackgroundServices };

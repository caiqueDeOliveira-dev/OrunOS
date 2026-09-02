// electron/whatsapp.cjs
//
// Personal WhatsApp connector for Orun OS, built on Baileys.
// Auto-detects groups from incoming messages and saves them for routing.

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const logger = require("./logger.cjs");

let sock = null;
let currentStatus = "disconnected";
let listeners = { onStatus: () => {}, onQR: () => {}, onMessage: () => {} };
let sentMessageIds = new Map(); // id -> timestamp (ecos da própria resposta, evita loop)
let reconnectTimer = null;
let reconnectAttempts = 0;
let boot401Retried = false;
const MAX_RECONNECT_ATTEMPTS = 15;
let knownGroups = []; // [{ jid, name }]
let userDataPath = "";
let autoConnectEnabled = true;
let watchdogTimer = null;

// Log de mensagens por grupo (para a aba "Grupos" do renderer).
const MAX_GROUP_MESSAGES = 150;
let messageLog = new Map(); // jid -> [{ id, fromMe, bot, senderJid, senderName, text, imageBase64, imageMime, audioMime, audioDuration, timestamp }]

function getMessagesFile() {
  return path.join(userDataPath, "whatsapp-messages.json");
}

function loadMessageLog() {
  if (!userDataPath) return;
  try {
    const file = getMessagesFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      messageLog = new Map(Object.entries(data || {}));
    }
  } catch { /* ignore */ }
}

function saveMessageLog() {
  if (!userDataPath) return;
  try {
    const obj = {};
    for (const [jid, arr] of messageLog) obj[jid] = arr;
    fs.writeFileSync(getMessagesFile(), JSON.stringify(obj));
  } catch { /* ignore */ }
}

function logGroupMessage(jid, entry) {
  if (!jid || !jid.endsWith("@g.us")) return;
  if (!messageLog.has(jid)) messageLog.set(jid, []);
  const arr = messageLog.get(jid);
  arr.push(entry);
  if (arr.length > MAX_GROUP_MESSAGES) arr.splice(0, arr.length - MAX_GROUP_MESSAGES);
  saveMessageLog();
  if (listeners.onGroupMessage) {
    listeners.onGroupMessage({ jid, message: entry });
  }
}

function getGroupMessages(jid) {
  return messageLog.get(jid) || [];
}

function getStatus() {
  return currentStatus;
}

function trackSentMessage(key) {
  const id = key?.key?.id || key?.id;
  if (!id) return;
  const now = Date.now();
  if (sentMessageIds.size > 3000) {
    for (const [k, ts] of sentMessageIds) {
      if (now - ts > 600000) sentMessageIds.delete(k);
    }
  }
  sentMessageIds.set(id, now);
}

function setListeners(l) {
  listeners = { ...listeners, ...l };
}

function getGroupsFile() {
  return path.join(userDataPath, "whatsapp-groups.json");
}

function loadGroups() {
  try {
    const file = getGroupsFile();
    if (fs.existsSync(file)) knownGroups = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { /* ignore */ }
}

function saveGroups() {
  try {
    fs.writeFileSync(getGroupsFile(), JSON.stringify(knownGroups, null, 2));
  } catch { /* ignore */ }
}

function addGroup(jid, name) {
  if (!jid || !jid.endsWith("@g.us")) return;
  const existing = knownGroups.find((g) => g.jid === jid);
  if (existing) {
    if (name && name !== "Grupo sem nome" && !existing.nameFixed) {
      existing.name = name;
      existing.nameFixed = true;
      saveGroups();
    }
    return;
  }
  knownGroups.push({ jid, name: name || "Grupo sem nome", nameFixed: false });
  saveGroups();
  logger.wa.info(`[whatsapp] discovered group: ${name} (${jid})`);
}

function listGroups() {
  return knownGroups;
}

async function connect(userData) {
  userDataPath = userData;
  loadGroups();
  loadMessageLog();

  const baileys = await import("@whiskeysockets/baileys");
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    Browsers,
  } = baileys;

  if (currentStatus === "connecting" || currentStatus === "connected") return sock;

  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null; }

  // Reset reconnect attempts on manual connect
  reconnectAttempts = 0;

  currentStatus = "connecting";
  listeners.onStatus(currentStatus);

  const authDir = userDataPath + "/whatsapp-auth";
  let state, saveCreds;
  try {
    ({ state, saveCreds } = await useMultiFileAuthState(authDir));
  } catch (err) {
    logger.wa.error("[whatsapp] auth state failed:", err.message);
    currentStatus = "disconnected";
    listeners.onStatus(currentStatus, { error: err.message });
    return null;
  }

  let version;
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
    logger.wa.info(`[whatsapp] WA Web version: ${version.join(".")}`);
  } catch (err) {
    logger.wa.warn("[whatsapp] could not fetch WA version, using default:", err.message);
    version = [2, 3000, 1035194821];
  }

  const newSock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    printQRInTerminal: false,
    version,
    browser: Browsers.windows("Chrome"),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock = newSock;

  newSock.ev.on("creds.update", saveCreds);

  newSock.ev.on("connection.update", async (update) => {
    if (newSock !== sock) return;
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    logger.wa.info(`[whatsapp] connection.update: connection=${connection} qr=${!!qr} isNewLogin=${isNewLogin} statusCode=${lastDisconnect?.error?.output?.statusCode}`);

    if (qr) {
      try {
        currentStatus = "qr";
        const dataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
        listeners.onQR(dataUrl);
      } catch (err) {
        logger.wa.error("[whatsapp] QRCode.toDataURL failed:", err.message);
        currentStatus = "qr";
        listeners.onQR(null);
      }
      listeners.onStatus(currentStatus);
    }

    if (connection === "open") {
      currentStatus = "connected";
      reconnectAttempts = 0;
      boot401Retried = false;
      logger.wa.info("[whatsapp] connected as", { selfJid: newSock.user?.id, selfLid: newSock.user?.lid || newSock.authState?.creds?.me?.lid || "N/A" });
      listeners.onStatus(currentStatus, { selfJid: newSock.user?.id, selfLid: newSock.user?.lid || newSock.authState?.creds?.me?.lid || null });

      try {
        const result = await newSock.groupFetchAllParticipating();
        if (result && typeof result === "object") {
          for (const [jid, metadata] of Object.entries(result)) {
            addGroup(jid, metadata.subject || metadata.name || "Grupo sem nome");
          }
          logger.wa.info(`[whatsapp] fetched ${knownGroups.length} groups from Baileys`);
          for (const g of knownGroups) {
            try {
              const meta = await newSock.groupMetadata(g.jid);
              if (meta?.subject) {
                g.name = meta.subject;
                g.nameFixed = true;
              }
            } catch { /* group might be inaccessible */ }
          }
          saveGroups();
          listeners.onStatus(currentStatus, { selfJid: newSock.user?.id, groupsRefreshed: true });
        }
      } catch (err) {
        logger.wa.error("[whatsapp] groupFetchAllParticipating failed:", err.message);
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      const msg = lastDisconnect?.error?.message || "unknown";
      logger.wa.info(`[whatsapp] connection closed: statusCode=${statusCode} loggedOut=${loggedOut} msg=${msg}`);

      if (loggedOut) {
        // 401 durante o boot (socket nunca chegou a abrir) costuma ser conflito
        // de sessão pós-restart/update: a sessão anterior ainda está viva no
        // servidor. Dá UMA chance de reconexão antes de apagar as credenciais.
        if (currentStatus === "connecting" && !boot401Retried) {
          boot401Retried = true;
          currentStatus = "reconnecting";
          listeners.onStatus(currentStatus, { attempt: 1, maxAttempts: MAX_RECONNECT_ATTEMPTS, nextRetryMs: 8000 });
          logger.wa.info("[whatsapp] 401 no boot (conflito de sessão pós-restart) — reconectando em 8s");
          reconnectTimer = setTimeout(() => connect(userDataPath).catch(() => {}), 8000);
          return;
        }
        logger.wa.info("[whatsapp] logged out, cleaning auth");
        currentStatus = "disconnected";
        listeners.onStatus(currentStatus, { loggedOut });
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch { /* ignore */ }
        reconnectAttempts = 0;
        return;
      }

      reconnectAttempts++;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 60000);
        currentStatus = "reconnecting";
        listeners.onStatus(currentStatus, { attempt: reconnectAttempts, maxAttempts: MAX_RECONNECT_ATTEMPTS, nextRetryMs: delay });
        logger.wa.info(`[whatsapp] reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimer = setTimeout(() => connect(userDataPath).catch(() => {}), delay);
      } else {
        logger.wa.info("[whatsapp] max reconnect attempts reached, waiting 120s cooldown");
        currentStatus = "disconnected";
        listeners.onStatus(currentStatus, { maxReached: true });
        setTimeout(() => {
          reconnectAttempts = 0;
          if (autoConnectEnabled && userDataPath) {
            logger.wa.info("[whatsapp] cooldown expired, retrying auto-connect");
            connect(userDataPath).catch(() => {});
          }
        }, 120000);
      }
    }
  });

  newSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (newSock !== sock) return;
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid;
      const senderJid = msg.key.participant || jid;
      const fromMe = Boolean(msg.key.fromMe);
      // Eco da própria resposta enviada pelo socket — ignora (evita loop).
      if (fromMe && sentMessageIds.has(msg.key.id)) continue;
      const isImage = Boolean(msg.message.imageMessage);
      const isAudio = Boolean(msg.message.audioMessage);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.audioMessage?.contextInfo?.quotedMessage?.conversation || "";
      const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || msg.message?.imageMessage?.contextInfo?.mentionedJid || [];

      if (jid?.endsWith("@g.us")) {
        const groupName = msg.message.groupMetadata?.subject || msg.pushName || null;
        addGroup(jid, groupName);
      }

      let imageBase64 = null;
      if (isImage) {
        try {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          imageBase64 = buffer.toString("base64");
        } catch {
          // If media download fails, still forward the text/caption.
        }
      }

      let audioBase64 = null;
      let audioMime = null;
      let audioDuration = null;
      if (isAudio) {
        try {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          audioBase64 = buffer.toString("base64");
          audioMime = msg.message.audioMessage?.mimetype || "audio/ogg; codecs=opus";
          audioDuration = msg.message.audioMessage?.seconds || null;
        } catch (err) {
          logger.wa.warn("[whatsapp] audio download failed:", err.message);
        }
      }

      const msgTimestamp = Number.isInteger(msg.messageTimestamp) ? msg.messageTimestamp * 1000 : (msg.messageTimestamp?.low ? msg.messageTimestamp.low * 1000 : Date.now());

      listeners.onMessage({
        jid,
        senderJid,
        senderName: msg.pushName || null,
        text,
        imageBase64,
        audioBase64,
        audioMime,
        audioDuration,
        fromMe,
        mentionedJids,
        selfJid: newSock.user?.id || null,
        selfLid: newSock.user?.lid || newSock.authState?.creds?.me?.lid || null,
        externalMessageId: msg.key.id || null,
        timestamp: msgTimestamp,
      });

      logGroupMessage(jid, {
        id: msg.key.id || null,
        fromMe,
        senderJid,
        senderName: msg.pushName || null,
        text,
        mentionedJids,
        imageBase64,
        imageMime: isImage ? (msg.message.imageMessage?.mimetype || "image/jpeg") : null,
        audioMime: isAudio ? (msg.message.audioMessage?.mimetype || null) : null,
        audioDuration: isAudio ? (msg.message.audioMessage?.seconds || null) : null,
        timestamp: msgTimestamp,
      });
    }
  });

  logger.wa.info("[whatsapp] socket created, waiting for connection...");
  return sock;
}

async function sendMessage(jid, text) {
  if (!sock || currentStatus !== "connected") throw new Error("WhatsApp is not connected.");
  try {
    const result = await sock.sendMessage(jid, { text });
    trackSentMessage(result);
    logGroupMessage(jid, {
      id: result?.key?.id || null,
      fromMe: true,
      bot: true,
      senderName: sock.user?.name || sock.user?.verifiedName || "Eu",
      text,
      timestamp: Date.now(),
    });
  } catch (err) {
    if (err.message?.includes("Connection Closed") || err.message?.includes("not connected")) {
      currentStatus = "disconnected";
      listeners.onStatus(currentStatus);
      throw new Error("WhatsApp connection lost. Reconnecting...");
    }
    throw err;
  }
}

async function sendAudioMessage(jid, buffer, mime = "audio/ogg; codecs=opus", ptt = true) {
  if (!sock || currentStatus !== "connected") throw new Error("WhatsApp is not connected.");
  try {
    const result = await sock.sendMessage(jid, { audio: buffer, mimetype: mime, ptt });
    trackSentMessage(result);
    logGroupMessage(jid, {
      id: result?.key?.id || null,
      fromMe: true,
      bot: true,
      senderName: sock.user?.name || sock.user?.verifiedName || "Eu",
      text: null,
      audioMime: mime,
      audioDuration: null,
      timestamp: Date.now(),
    });
  } catch (err) {
    if (err.message?.includes("Connection Closed") || err.message?.includes("not connected")) {
      currentStatus = "disconnected";
      listeners.onStatus(currentStatus);
      throw new Error("WhatsApp connection lost. Reconnecting...");
    }
    throw err;
  }
}

async function disconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent auto-reconnect
  if (sock) {
    try {
      // Fecha o WebSocket sem desautenticar a sessão (logout() derrubaria o
      // pareamento e, com o restart do auto-update, gera 401/logout no boot).
      if (typeof sock.ws?.close === "function") sock.ws.close();
      if (sock.ev?.removeAllListeners) sock.ev.removeAllListeners();
    } catch { /* already disconnected */ }
    sock = null;
  }
  currentStatus = "disconnected";
  listeners.onStatus(currentStatus);
}

async function sendTestMessage(jid, agentName) {
  if (!sock || currentStatus !== "connected") throw new Error("WhatsApp is not connected.");
  const msg = `✅ Teste de roteamento - Agente: *${agentName}*\nSe você está vendo esta mensagem, o roteamento está funcionando corretamente!`;
  const result = await sock.sendMessage(jid, { text: msg });
  logGroupMessage(jid, {
    id: result?.key?.id || null,
    fromMe: true,
    bot: true,
    senderName: sock.user?.name || sock.user?.verifiedName || "Eu",
    text: msg,
    timestamp: Date.now(),
  });
}

module.exports = { connect, disconnect, sendMessage, sendAudioMessage, getStatus, setListeners, listGroups, sendTestMessage, getGroupMessages, autoConnect: connect, setAutoConnect: (enabled) => { autoConnectEnabled = enabled; } };

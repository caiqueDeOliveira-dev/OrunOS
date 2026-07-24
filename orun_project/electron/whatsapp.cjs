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
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let knownGroups = []; // [{ jid, name }]
let userDataPath = "";
let autoConnectEnabled = true;

function getStatus() {
  return currentStatus;
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
      logger.wa.info("[whatsapp] connected as", newSock.user?.id);
      listeners.onStatus(currentStatus, { selfJid: newSock.user?.id });

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
      currentStatus = "disconnected";
      listeners.onStatus(currentStatus, { loggedOut });

      if (loggedOut) {
        logger.wa.info("[whatsapp] logged out, cleaning auth");
        try { fs.rmSync(authDir, { recursive: true, force: true }); } catch { /* ignore */ }
        reconnectAttempts = 0;
        return;
      }

      reconnectAttempts++;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 60000);
        logger.wa.info(`[whatsapp] reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimer = setTimeout(() => connect(userDataPath).catch(() => {}), delay);
      } else {
        logger.wa.info("[whatsapp] max reconnect attempts reached, waiting 120s cooldown");
        setTimeout(() => {
          reconnectAttempts = 0;
          if (autoConnectEnabled) {
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
      const isImage = Boolean(msg.message.imageMessage);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

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

      listeners.onMessage({ jid, text, imageBase64, fromMe: msg.key.fromMe });
    }
  });

  logger.wa.info("[whatsapp] socket created, waiting for connection...");
  return sock;
}

async function sendMessage(jid, text) {
  if (!sock || currentStatus !== "connected") throw new Error("WhatsApp is not connected.");
  try {
    await sock.sendMessage(jid, { text });
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
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  if (sock) {
    try { await sock.logout(); } catch { /* already disconnected */ }
    sock = null;
  }
  currentStatus = "disconnected";
  listeners.onStatus(currentStatus);
}

async function sendTestMessage(jid, agentName) {
  if (!sock || currentStatus !== "connected") throw new Error("WhatsApp is not connected.");
  const msg = `✅ Teste de roteamento - Agente: *${agentName}*\nSe você está vendo esta mensagem, o roteamento está funcionando corretamente!`;
  await sock.sendMessage(jid, { text: msg });
}

module.exports = { connect, disconnect, sendMessage, getStatus, setListeners, listGroups, sendTestMessage, autoConnect: connect, setAutoConnect: (enabled) => { autoConnectEnabled = enabled; } };

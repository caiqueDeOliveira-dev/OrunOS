// electron/whatsapp.cjs
//
// Personal WhatsApp connector for Orun OS, built on Baileys.
// Auto-detects groups from incoming messages and saves them for routing.

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

let sock = null;
let currentStatus = "disconnected";
let listeners = { onStatus: () => {}, onQR: () => {}, onMessage: () => {} };
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATJECTS = 10;
let knownGroups = []; // [{ jid, name }]
let userDataPath = "";

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
  // Only update name if the new name is not a pushName (i.e. not the user's own name)
  // We consider a name valid if it's longer than 2 chars and not purely a personal name pattern
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
  console.log(`[whatsapp] discovered group: ${name} (${jid})`);
}

function listGroups() {
  return knownGroups;
}

async function connect(path) {
  userDataPath = path;
  loadGroups();

  const baileys = await import("@whiskeysockets/baileys");
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, downloadMediaMessage } = baileys;

  if (currentStatus === "connecting" || currentStatus === "connected") return sock;

  currentStatus = "connecting";
  listeners.onStatus(currentStatus);

  const authDir = path + "/whatsapp-auth";
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    printQRInTerminal: false,
    reconnectInterval: (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
    maxReconnectAttempts: MAX_RECONNECT_ATJECTS,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        currentStatus = "qr";
        const dataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
        listeners.onQR(dataUrl);
      } catch (err) {
        console.error("[whatsapp] QRCode.toDataURL failed:", err.message);
        currentStatus = "qr";
        listeners.onQR(null);
      }
      listeners.onStatus(currentStatus);
    }

    if (connection === "open") {
      currentStatus = "connected";
      reconnectAttempts = 0;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      listeners.onStatus(currentStatus, { selfJid: sock.user?.id });

      // Actively fetch all groups the user participates in
      try {
        const result = await sock.groupFetchAllParticipating();
        if (result && typeof result === "object") {
          for (const [jid, metadata] of Object.entries(result)) {
            addGroup(jid, metadata.subject || metadata.name || "Grupo sem nome");
          }
          console.log(`[whatsapp] fetched ${knownGroups.length} groups from Baileys`);
          // Now fetch metadata for each group to get correct names
          for (const g of knownGroups) {
            try {
              const meta = await sock.groupMetadata(g.jid);
              if (meta?.subject) {
                g.name = meta.subject;
                g.nameFixed = true;
              }
            } catch { /* group might be inaccessible */ }
          }
          saveGroups();
          listeners.onStatus(currentStatus, { selfJid: sock.user?.id, groupsRefreshed: true });
        }
      } catch (err) {
        console.error("[whatsapp] groupFetchAllParticipating failed:", err.message);
        // Fallback: try store
        try {
          if (sock.store && typeof sock.store.chats?.all === "function") {
            const allChats = sock.store.chats.all();
            for (const chat of allChats) {
              if (chat.id?.endsWith("@g.us")) {
                addGroup(chat.id, chat.name || chat.subject);
              }
            }
          }
        } catch { /* store not available */ }
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      currentStatus = "disconnected";
      listeners.onStatus(currentStatus, { loggedOut });
      if (!loggedOut && reconnectAttempts < MAX_RECONNECT_ATJECTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimer = setTimeout(() => connect(userDataPath).catch(() => {}), delay);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid;
      const isImage = Boolean(msg.message.imageMessage);
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";

      // Auto-discover groups from incoming messages
      if (jid?.endsWith("@g.us")) {
        const groupName = msg.message.groupMetadata?.subject || msg.pushName || null;
        addGroup(jid, groupName);

        // Also try to get group name from the conversation store
        try {
          if (sock.store && typeof sock.store.chats?.get === "function") {
            const chat = sock.store.chats.get(jid);
            if (chat?.name) addGroup(jid, chat.name);
          }
        } catch { /* ignore */ }
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
  reconnectAttempts = MAX_RECONNECT_ATJECTS;
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

module.exports = { connect, disconnect, sendMessage, getStatus, setListeners, listGroups, sendTestMessage };

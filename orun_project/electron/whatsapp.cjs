// electron/whatsapp.cjs
//
// Personal WhatsApp connector for Orun OS, built on Baileys — a reverse
// engineered client for WhatsApp's multi-device Web protocol.
//
// IMPORTANT: this is NOT the official WhatsApp Business API. Baileys works
// by impersonating a linked device (exactly like scanning WhatsApp Web),
// which is technically against WhatsApp's Terms of Service. For personal,
// low-volume automation (you messaging your own linked chat) the practical
// ban risk is low, but it is not zero and there is no official support
// channel if something goes wrong. This is a deliberate trade-off — there's
// no way to get the "message myself a food photo" experience through the
// official Cloud API without a Meta Business account, phone verification,
// and app review.

const path = require("path");
const QRCode = require("qrcode");

let sock = null;
let currentStatus = "disconnected"; // disconnected | connecting | qr | connected
let listeners = { onStatus: () => {}, onQR: () => {}, onMessage: () => {} };

function getStatus() {
  return currentStatus;
}

function setListeners(l) {
  listeners = { ...listeners, ...l };
}

async function connect(userDataPath) {
  // Lazy-require: baileys pulls in a fair number of transitive deps, no
  // need to pay that cost for people who never touch the WhatsApp feature.
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

  currentStatus = "connecting";
  listeners.onStatus(currentStatus);

  const authDir = path.join(userDataPath, "whatsapp-auth");
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentStatus = "qr";
      const dataUrl = await QRCode.toDataURL(qr);
      listeners.onQR(dataUrl);
      listeners.onStatus(currentStatus);
    }

    if (connection === "open") {
      currentStatus = "connected";
      listeners.onStatus(currentStatus, { selfJid: sock.user?.id });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      currentStatus = "disconnected";
      listeners.onStatus(currentStatus, { loggedOut });
      if (!loggedOut) {
        // Transient disconnect (network blip, server restart) — try again.
        setTimeout(() => connect(userDataPath).catch(() => {}), 3000);
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

      let imageBase64 = null;
      if (isImage) {
        try {
          const { downloadMediaMessage } = require("@whiskeysockets/baileys");
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
  await sock.sendMessage(jid, { text });
}

async function disconnect() {
  if (sock) {
    try { await sock.logout(); } catch { /* already disconnected */ }
    sock = null;
  }
  currentStatus = "disconnected";
}

module.exports = { connect, disconnect, sendMessage, getStatus, setListeners };

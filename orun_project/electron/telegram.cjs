// telegram.cjs
// Telegram Bot connection layer using grammY.
// Manages bot lifecycle, message handling, and status.

const { Bot } = require("grammy");

let bot = null;
let currentStatus = "disconnected"; // disconnected | connecting | connected
let listeners = { onStatus: null, onMessage: null };

function setLogger(l) { log = l; }
let log = console;

function getStatus() { return currentStatus; }

function setListeners(cb) {
  listeners = { ...listeners, ...cb };
}

function notifyStatus(extra = {}) {
  listeners.onStatus?.({ status: currentStatus, ...extra });
}

async function connect(token) {
  if (bot) await disconnect();
  if (!token) throw new Error("Telegram bot token is required");

  currentStatus = "connecting";
  notifyStatus();

  try {
    bot = new Bot(token);

    // Verify token by getting bot info
    const me = await bot.api.getMe();
    log.info(`[telegram] Bot connected: @${me.username} (${me.first_name})`);

    // Register message handler
    bot.on("message", (ctx) => {
      const msg = ctx.message;
      if (!msg) return;

      const chatId = String(msg.chat.id);
      const chatType = msg.chat.type; // private, group, supergroup
      const text = msg.text || msg.caption || "";
      const from = msg.from;
      const chatTitle = msg.chat.title || msg.chat.first_name || "Direct";

      // Ignore messages from the bot itself
      if (from?.is_bot) return;

      // Extract image if present
      let imageBase64 = null;
      if (msg.photo && msg.photo.length > 0) {
        // We'll get the file later via bot.api.getFile
        imageBase64 = msg.photo[msg.photo.length - 1].file_id; // Store file_id for later
      }

      listeners.onMessage?.({
        chatId,
        chatType,
        chatTitle,
        text,
        imageFileId: imageBase64,
        from: from ? { id: from.id, firstName: from.first_name, username: from.username } : null,
        messageId: msg.message_id,
      });
    });

    // Error handler
    bot.catch((err) => {
      log.error("[telegram] Bot error:", err.message);
    });

    // Start polling
    await bot.start({
      onStart: () => {
        currentStatus = "connected";
        notifyStatus({ botInfo: me });
      },
    });
  } catch (err) {
    currentStatus = "disconnected";
    notifyStatus({ error: err.message });
    bot = null;
    throw err;
  }
}

async function disconnect() {
  if (bot) {
    try {
      bot.stop();
    } catch {}
    bot = null;
  }
  currentStatus = "disconnected";
  notifyStatus();
}

async function sendMessage(chatId, text) {
  if (!bot || currentStatus !== "connected") {
    throw new Error("Telegram bot not connected");
  }
  // Split long messages (Telegram limit: 4096 chars)
  const chunks = splitMessage(text, 4096);
  for (const chunk of chunks) {
    await bot.api.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
  }
}

async function sendPhoto(chatId, photoFileId, caption) {
  if (!bot || currentStatus !== "connected") return;
  await bot.api.sendPhoto(chatId, photoFileId, { caption: caption || "" });
}

async function getChat(chatId) {
  if (!bot) return null;
  try {
    return await bot.api.getChat(chatId);
  } catch { return null; }
}

async function getUpdates() {
  if (!bot) return [];
  try {
    return await bot.api.getUpdates({ limit: 100 });
  } catch { return []; }
}

function splitMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    // Try to split at last newline before maxLength
    let splitIdx = remaining.lastIndexOf("\n", maxLength);
    if (splitIdx <= 0) splitIdx = maxLength;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }
  return chunks;
}

module.exports = {
  connect,
  disconnect,
  sendMessage,
  sendPhoto,
  getChat,
  getUpdates,
  getStatus,
  setListeners,
  setLogger,
};

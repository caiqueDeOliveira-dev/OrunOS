// telegram-automation.cjs
// Rate limiting and message queue for Telegram bot.

const DAILY_LIMIT = 100; // Telegram is more permissive than WhatsApp
const MIN_DELAY_MS = 500;
const MAX_DELAY_MS = 2000;

function createTelegramAutomation({ log }) {
  let messageQueue = [];
  let dailyCount = 0;
  let lastResetDate = getToday();
  let processing = false;

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function resetIfNeeded() {
    const today = getToday();
    if (today !== lastResetDate) {
      dailyCount = 0;
      lastResetDate = today;
    }
  }

  function canSend() {
    resetIfNeeded();
    return dailyCount < DAILY_LIMIT;
  }

  async function queueMessage(fn) {
    resetIfNeeded();
    if (dailyCount >= DAILY_LIMIT) {
      log.warn("[telegram:auto] Daily limit reached, dropping message");
      return { ok: false, error: "Daily limit reached" };
    }
    messageQueue.push(fn);
    processQueue();
    return { ok: true, queued: messageQueue.length };
  }

  async function processQueue() {
    if (processing || messageQueue.length === 0) return;
    processing = true;

    while (messageQueue.length > 0) {
      const fn = messageQueue.shift();
      try {
        await fn();
        dailyCount++;
        // Random delay between messages
        const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        log.error("[telegram:auto] Queue item failed:", err.message);
      }
    }

    processing = false;
  }

  function getStats() {
    resetIfNeeded();
    return {
      dailyCount,
      dailyLimit: DAILY_LIMIT,
      queueLength: messageQueue.length,
    };
  }

  return { queueMessage, canSend, getStats };
}

module.exports = { createTelegramAutomation };

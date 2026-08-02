const { GoogleClient } = require("../google-client.cjs");
const emailService = require("../email-service.cjs");

function register(ipcMain, ctx) {
  const { secretStore, log, db, aiRouter } = ctx;
  const google = new GoogleClient();
  google.setLogger(log);

  emailService.init({ googleClient: google, logger: log, routeFn: null });

  // ── Credentials ──────────────────────────────────────────────
  ipcMain.handle("google:get-credentials", async () => {
    try { return (await secretStore.get("google_credentials")) || { clientId: "", clientSecret: "" }; }
    catch { return { clientId: "", clientSecret: "" }; }
  });

  ipcMain.handle("google:set-credentials", async (_e, clientId, clientSecret) => {
    await secretStore.set("google_credentials", { clientId, clientSecret });
    google.setCredentials(clientId, clientSecret);
    return { ok: true };
  });

  // ── OAuth ────────────────────────────────────────────────────
  ipcMain.handle("google:get-auth-url", async () => {
    try {
      if (!google.hasCredentials()) throw new Error("Configure Client ID e Client Secret primeiro");
      return google.getAuthUrl();
    } catch (err) {
      return { url: null, error: err.message };
    }
  });

  ipcMain.handle("google:start-callback-server", async () => {
    try {
      google._onTokenCallback = async (tokens) => {
        await secretStore.set("google_tokens", { tokens, savedAt: Date.now() });
      };
      await google.startCallbackServer();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("google:stop-callback-server", async () => {
    google.stopCallbackServer();
    return { ok: true };
  });

  ipcMain.handle("google:save-tokens", async (_e, tokens) => {
    await secretStore.set("google_tokens", { tokens, savedAt: Date.now() });
    google.setTokens(tokens);
    return { ok: true };
  });

  ipcMain.handle("google:load-tokens", async () => {
    try {
      const stored = await secretStore.get("google_tokens");
      if (stored?.tokens) {
        const creds = await secretStore.get("google_credentials");
        if (creds?.clientId) google.setCredentials(creds.clientId, creds.clientSecret);
        google.setTokens(stored.tokens);
        const ok = google.isConnected();
        return { ok: true, connected: ok };
      }
      return { ok: true, connected: false };
    } catch { return { ok: true, connected: false }; }
  });

  ipcMain.handle("google:is-connected", async () => google.isConnected());

  ipcMain.handle("google:disconnect", async () => {
    google.stopCallbackServer();
    emailService.stopPolling();
    await secretStore.delete("google_tokens");
    return { ok: true };
  });

  // ── Gmail ────────────────────────────────────────────────────
  ipcMain.handle("gmail:list-messages", async (_e, opts) => {
    try { return await google.listMessages(opts || {}); }
    catch (err) { return []; }
  });

  ipcMain.handle("gmail:get-message", async (_e, messageId) => {
    try { return await google.getMessage(messageId); }
    catch (err) { return null; }
  });

  ipcMain.handle("gmail:send", async (_e, to, subject, body, threadId) => {
    try { return await google.sendMessage(to, subject, body, threadId); }
    catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("gmail:reply", async (_e, messageId, body) => {
    try { return await google.replyToMessage(messageId, body); }
    catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("gmail:mark-read", async (_e, messageId) => {
    try { await google.markAsRead(messageId); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  // ── Email Service (polling + AI) ─────────────────────────────
  ipcMain.handle("email-service:start", async () => {
    emailService.startPolling();
    return { ok: true };
  });

  ipcMain.handle("email-service:stop", async () => {
    emailService.stopPolling();
    return { ok: true };
  });

  ipcMain.handle("email-service:status", async () => {
    return { polling: true, connected: google.isConnected() };
  });

  ipcMain.handle("email-service:analyze", async (_e, emailId) => {
    try {
      const email = await google.getMessage(emailId);
      if (!email) return { error: "Email não encontrado" };
      const analysis = await emailService.analyzeAndReply(email, aiRouter);
      return analysis;
    } catch (err) {
      return { error: err.message };
    }
  });

  // ── Calendar ─────────────────────────────────────────────────
  ipcMain.handle("calendar:list-events", async (_e, opts) => {
    try { return await google.listEvents(opts || {}); }
    catch (err) { return []; }
  });

  ipcMain.handle("calendar:create-event", async (_e, eventData) => {
    try { return await google.createEvent(eventData); }
    catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("calendar:update-event", async (_e, eventId, updates) => {
    try { return await google.updateEvent(eventId, updates); }
    catch (err) { return { error: err.message }; }
  });

  ipcMain.handle("calendar:delete-event", async (_e, eventId) => {
    try { await google.deleteEvent(eventId); return { ok: true }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle("calendar:list-calendars", async () => {
    try { return await google.listCalendars(); }
    catch (err) { return []; }
  });

  // ── Restore on startup ─────────────────────────────────────
  (async () => {
    try {
      const creds = await secretStore.get("google_credentials");
      const stored = await secretStore.get("google_tokens");
      if (creds?.clientId) google.setCredentials(creds.clientId, creds.clientSecret);
      if (stored?.tokens) {
        google.setTokens(stored.tokens);
        if (google.isConnected()) emailService.startPolling();
      }
    } catch { /* ignore */ }
  })();
}

module.exports = { register };

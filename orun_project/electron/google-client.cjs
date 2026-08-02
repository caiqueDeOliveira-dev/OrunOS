const http = require("http");
const { URL } = require("url");
const crypto = require("crypto");
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendars.readonly",
];

class GoogleClient {
  constructor() {
    this.oAuth2Client = null;
    this.tokens = null;
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = "http://127.0.0.1:9223/callback";
    this.server = null;
    this.log = console;
    this._onTokenCallback = null;
  }

  setLogger(log) {
    this.log = log || console;
  }

  setCredentials(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, this.redirectUri);
    if (this.tokens) this.oAuth2Client.setCredentials(this.tokens);
  }

  hasCredentials() {
    return Boolean(this.clientId && this.clientSecret);
  }

  setTokens(tokens) {
    this.tokens = tokens;
    if (this.oAuth2Client) {
      this.oAuth2Client.setCredentials(tokens);
    }
  }

  isConnected() {
    if (!this.tokens || !this.tokens.access_token) return false;
    if (!this.tokens.expiry_date) return true;
    return Date.now() < this.tokens.expiry_date - 60000;
  }

  async ensureToken() {
    if (this.isConnected()) return true;
    if (this.tokens?.refresh_token && this.oAuth2Client) {
      try {
        const { credentials } = await this.oAuth2Client.refreshAccessToken();
        this.tokens = credentials;
        if (this._onTokenCallback) await this._onTokenCallback(credentials);
        return true;
      } catch (err) {
        this.log.error("[google] Token refresh failed:", err.message);
      }
    }
    return false;
  }

  getAuthUrl() {
    if (!this.oAuth2Client) throw new Error("Set credentials first");
    const state = crypto.randomBytes(16).toString("hex");
    const url = this.oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state,
      prompt: "consent",
    });
    return { url, state };
  }

  async startCallbackServer() {
    return new Promise((resolve, reject) => {
      if (this.server) { resolve(); return; }
      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://127.0.0.1:9223`);
        if (url.pathname === "/callback") {
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          if (error) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            const msg = error === "access_denied"
              ? 'Erro: acesso negado. Adicione seu email como "Usuário de teste" em Google Cloud Console > OAuth > Tela de consentimento.'
              : `Erro: ${error}`;
            res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;max-width:500px;text-align:center"><h2>❌ ${msg}</h2></body></html>`);
            return;
          }
          if (code) {
            try {
              const { tokens } = await this.oAuth2Client.getToken(code);
              this.oAuth2Client.setCredentials(tokens);
              this.tokens = tokens;
              if (this._onTokenCallback) await this._onTokenCallback(tokens);
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>✅ Google conectado! Pode fechar esta janela.</h2></body></html>`);
              this.log.info("[google] OAuth tokens received successfully");
            } catch (err) {
              res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
              res.end(`<html><body style="background:#0A0A0C;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>❌ Erro ao conectar: ${err.message}</h2></body></html>`);
              this.log.error("[google] Token exchange failed:", err.message);
            }
          }
        }
      });
      this.server.listen(9223, "127.0.0.1", () => {
        this.log.info("[google] Callback server listening on :9223");
        resolve();
      });
      this.server.on("error", reject);
    });
  }

  stopCallbackServer() {
    if (this.server) { this.server.close(); this.server = null; }
  }

  // ── Gmail ────────────────────────────────────────────────────
  async listMessages({ maxResults = 20, query = "" } = {}) {
    await this.ensureToken();
    const gmail = google.gmail({ version: "v1", auth: this.oAuth2Client });
    const res = await gmail.users.messages.list({ userId: "me", maxResults, q: query || undefined });
    return res.data.messages || [];
  }

  async getMessage(messageId) {
    await this.ensureToken();
    const gmail = google.gmail({ version: "v1", auth: this.oAuth2Client });
    const res = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    return parseMessage(res.data);
  }

  async sendMessage(to, subject, bodyText, threadId) {
    await this.ensureToken();
    const gmail = google.gmail({ version: "v1", auth: this.oAuth2Client });
    const utf8Bytes = Buffer.from(
      `From: me\r\nTo: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\nMIME-Version: 1.0\r\n\r\n${bodyText}`
    );
    const raw = utf8Bytes.toString("base64url");
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw, threadId } });
    return res.data;
  }

  async markAsRead(messageId) {
    await this.ensureToken();
    const gmail = google.gmail({ version: "v1", auth: this.oAuth2Client });
    await gmail.users.messages.modify({ userId: "me", id: messageId, requestBody: { removeLabelIds: ["UNREAD"] } });
  }

  async replyToMessage(messageId, bodyText) {
    await this.ensureToken();
    const msg = await this.getMessage(messageId);
    const threadId = msg.threadId;
    const subject = msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`;
    const to = msg.from;
    return this.sendMessage(to, subject, bodyText, threadId);
  }

  // ── Calendar ─────────────────────────────────────────────────
  async listEvents({ maxResults = 20, timeMin, timeMax } = {}) {
    await this.ensureToken();
    const calendar = google.calendar({ version: "v3", auth: this.oAuth2Client });
    const res = await calendar.events.list({
      calendarId: "primary",
      maxResults,
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });
    return res.data.items || [];
  }

  async createEvent({ summary, description, startTime, endTime, timeZone = "America/Sao_Paulo" }) {
    await this.ensureToken();
    const calendar = google.calendar({ version: "v3", auth: this.oAuth2Client });
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: startTime, timeZone },
        end: { dateTime: endTime, timeZone },
      },
    });
    return res.data;
  }

  async updateEvent(eventId, updates) {
    await this.ensureToken();
    const calendar = google.calendar({ version: "v3", auth: this.oAuth2Client });
    const res = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: updates,
    });
    return res.data;
  }

  async deleteEvent(eventId) {
    await this.ensureToken();
    const calendar = google.calendar({ version: "v3", auth: this.oAuth2Client });
    await calendar.events.delete({ calendarId: "primary", eventId });
  }

  async listCalendars() {
    await this.ensureToken();
    const calendar = google.calendar({ version: "v3", auth: this.oAuth2Client });
    const res = await calendar.calendarList.list();
    return res.data.items || [];
  }
}

function parseMessage(msg) {
  const headers = {};
  (msg.payload?.headers || []).forEach((h) => { headers[h.name?.toLowerCase()] = h.value; });
  const body = getMessageBody(msg.payload);
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "",
    date: headers.date || "",
    snippet: msg.snippet || "",
    body,
    labelIds: msg.labelIds || [],
    internalDate: parseInt(msg.internalDate) || 0,
  };
}

function getMessageBody(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf8");
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = getMessageBody(part);
      if (text) return text;
    }
  }
  return payload.body?.data ? Buffer.from(payload.body.data, "base64url").toString("utf8") : "";
}

module.exports = { GoogleClient, SCOPES };

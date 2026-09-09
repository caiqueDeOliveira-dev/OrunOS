// electron/calcom-client.cjs
//
// Cal.com self-hosted (v6.x) API client for Orun OS.
// Auth: NextAuth session (csrf + callback/credentials) for authed tRPC queries.
// Booking: public routes (no auth) — POST /api/book/event, POST /api/cancel,
//   GET /api/trpc/slots/getSchedule.

const https = require("https");
const http = require("http");

let _host = "http://localhost:3000";
let _email = "";
let _password = "";
let _cookie = null;
let _cookieExpiry = 0;
let _log = null;

function init(options = {}) {
  if (options.host) _host = options.host.replace(/\/+$/, "");
  if (options.email) _email = options.email;
  if (options.password) _password = options.password;
  if (options.log) _log = options.log;
}

function _logMsg(level, msg) {
  if (_log && _log.calcom && _log.calcom[level]) _log.calcom[level](msg);
  else if (console[level]) console[level]("[Cal.com]", msg);
}

function _extractSetCookie(setCookie, name) {
  if (!setCookie) return null;
  for (const sc of Array.isArray(setCookie) ? setCookie : [setCookie]) {
    const m = sc.match(new RegExp(`${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

// Collect name=value pairs from set-cookie headers (HttpOnly ok — we only need values as a jar).
function _cookieJar(setCookie) {
  const jar = [];
  if (setCookie) {
    for (const sc of Array.isArray(setCookie) ? setCookie : [setCookie]) {
      const m = sc.match(/^([^=;\s]+)=([^;]*)/);
      if (m) jar.push(`${m[1]}=${m[2]}`);
    }
  }
  return jar.join("; ");
}

function _request(method, path, body, cookie, opts = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(path, _host); } catch (e) { return reject(new Error(`Cal.com: invalid URL ${path}`)); }
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const headers = { Accept: "application/json" };
    let bodyStr = null;
    if (opts.form) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      bodyStr = new URLSearchParams(opts.formData ?? body ?? {}).toString();
    } else if (body) {
      headers["Content-Type"] = "application/json";
      bodyStr = JSON.stringify(body);
    }
    if (bodyStr) headers["Content-Length"] = Buffer.byteLength(bodyStr);
    if (cookie) headers["Cookie"] = cookie;

    const req = lib.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function _json(res) {
  try { return JSON.parse(res.data); } catch { return null; }
}

// ── Auth (NextAuth) ──────────────────────────────────────────────────

async function _login() {
  if (_cookie && Date.now() < _cookieExpiry) return _cookie;

  if (!_email) _email = "orun@orun.local";
  if (!_password) throw new Error("Cal.com credentials not configured");

  _logMsg("info", "Authenticating (NextAuth)...");

  const csrfRes = await _request("GET", "/api/auth/csrf", null, null);
  const csrfBody = await _json(csrfRes);
  const csrfToken = csrfBody && csrfBody.csrfToken;
  if (!csrfToken) throw new Error(`Cal.com csrf failed (HTTP ${csrfRes.status})`);
  const jar = _cookieJar(csrfRes.headers["set-cookie"]);

  const loginRes = await _request("POST", "/api/auth/callback/credentials", null, jar || null, {
    form: true,
    formData: { csrfToken, email: _email, password: _password, callbackUrl: `${_host}/` },
  });

  const sessionCookie = _extractSetCookie(loginRes.headers["set-cookie"], "next-auth.session-token");
  if (!sessionCookie) throw new Error(`Cal.com login failed (HTTP ${loginRes.status})`);

  _cookie = `next-auth.session-token=${sessionCookie}`;
  _cookieExpiry = Date.now() + 30 * 24 * 3600 * 1000;
  _logMsg("info", "Auth OK");
  return _cookie;
}

async function _authedGet(path) {
  const cookie = await _login();
  const res = await _request("GET", path, null, cookie);
  if (res.status >= 200 && res.status < 300) return _json(res);
  throw new Error(`Cal.com ${path} failed (HTTP ${res.status})`);
}

// Authed tRPC call. Queries → GET with batch=1 wrapper; mutations → single POST with body {json}.
async function _trpcAuthed(endpoint, opPath, input = {}, method = "POST") {
  const cookie = await _login();
  let res;
  if (method === "GET") {
    res = await _request("GET", `/api/trpc/${endpoint}/${opPath}?batch=1&input=${_trpcEnc({ "0": { json: input } })}`, null, cookie);
  } else {
    res = await _request("POST", `/api/trpc/${endpoint}/${opPath}`, { json: input }, cookie);
  }
  if (res.status >= 200 && res.status < 300) {
    const parsed = await _json(res);
    const data = _trpcData(parsed);
    if (data && data.result && data.result.data) return data.result.data.json;
    return data;
  }
  const parsed = await _json(res);
  const msg = (parsed && parsed.error && parsed.error.json && parsed.error.json.message) || "";
  const zod = (parsed && parsed.error && parsed.error.data && JSON.stringify(parsed.error.data)) || "";
  throw new Error(`Cal.com ${endpoint}/${opPath} failed (HTTP ${res.status})${msg ? ": " + msg : ""}${zod ? " | " + zod.slice(0, 300) : ""}`);
}

// ── Webhook management (authed) ────────────────────────────────────

async function listWebhooks() {
  const data = await _trpcAuthed("webhook", "list", {}, "GET");
  if (Array.isArray(data)) return data;
  return (data && data.webhooks) || [];
}

async function registerWebhook({ url, eventTriggers, active = true, secret = null, payloadTemplate = null }) {
  if (!url) throw new Error("Cal.com: webhook url is required");
  const input = {
    subscriberUrl: url,
    eventTriggers: Array.isArray(eventTriggers) ? eventTriggers : [eventTriggers],
    active,
    secret: secret || null,
    payloadTemplate: payloadTemplate || null,
  };
  const data = await _trpcAuthed("webhook", "create", input);
  return data || { ok: true };
}

async function deleteWebhook({ id }) {
  if (!id) throw new Error("Cal.com: webhook id is required");
  const data = await _trpcAuthed("webhook", "delete", { id });
  return data || { ok: true };
}

// tRPC batch response: [{ result: { data: { json } } }]
function _trpcData(batch) {
  if (Array.isArray(batch) && batch[0] && batch[0].result) return batch[0].result.data.json;
  return batch;
}

function _trpcEnc(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}

// ── Public API ───────────────────────────────────────────────────────

async function listEventTypes() {
  const input = { "0": { json: null, meta: { values: { filters: ["undefined"], forRoutingForms: ["undefined"] } } } };
  const res = await _authedGet(`/api/trpc/eventTypes/getByViewer?batch=1&input=${_trpcEnc(input)}`);
  const data = _trpcData(res);
  const groups = (data && data.eventTypeGroups) || [];
  return groups.flatMap((g) =>
    ((g && g.eventTypes) || []).map((et) => ({
      id: et.id,
      slug: et.slug,
      title: et.title,
      length: et.length,
      hidden: !!et.hidden,
      userId: et.userId,
      schedulingType: et.schedulingType,
    }))
  );
}

async function getAvailability({ startTime, endTime, timeZone = "America/Sao_Paulo", eventTypeSlug, eventTypeId, usernameList = ["orun"], duration = null }) {
  const input = {
    json: {
      isTeamEvent: false,
      usernameList,
eventTypeSlug: eventTypeSlug || "",
      eventTypeId: eventTypeId || null,
      startTime,
      endTime,
      timeZone,
      duration,
      rescheduleUid: null,
      orgSlug: null,
      teamMemberEmail: null,
      routedTeamMemberIds: null,
      skipContactOwner: false,
      routingFormResponseId: null,
      email: null,
      embedConnectVersion: "0",
      _isDryRun: false,
    },
    meta: {
      values: {
        duration: ["undefined"],
        orgSlug: ["undefined"],
        teamMemberEmail: ["undefined"],
        routedTeamMemberIds: ["undefined"],
        routingFormResponseId: ["undefined"],
      },
    },
  };
  const res = await _request("GET", `/api/trpc/slots/getSchedule?batch=1&input=${_trpcEnc({ "0": input })}`, null, null);
  if (!(res.status >= 200 && res.status < 300)) throw new Error(`Cal.com availability failed (HTTP ${res.status})`);
  const data = _trpcData(await _json(res));
  const byDay = (data && data.slots) || {};
  const slots = Object.values(byDay).flat();
  return slots.map((s) => ({ time: s.time, attendees: s.attendees || null, bookingUid: s.bookingUid || null }));
}

async function findNextSlots({ eventTypeSlug, eventTypeId, timeZone = "America/Sao_Paulo", days = 7, duration = null }) {
  const start = new Date();
  const end = new Date(Date.now() + days * 24 * 3600 * 1000);
  const pad = (d) => d.toISOString().slice(0, 19) + ".000Z";
  return getAvailability({
    eventTypeSlug,
    eventTypeId,
    timeZone,
    duration,
    startTime: pad(start),
    endTime: pad(end),
  });
}

// Convert an absolute instant to a local-time ISO string in the given IANA tz
// ("2026-09-07T09:00:00-03:00") as required by /api/book/event.
function _tzOffsetMinutes(timeZone, date) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset", hour12: false });
    const parts = dtf.formatToParts(date);
    const tz = (parts.find((p) => p.type === "timeZoneName") || {}).value || "";
    const m = tz.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      return sign * (Number(m[2]) * 60 + Number(m[3]));
    }
  } catch {}
  return -180; // fallback America/Sao_Paulo (UTC-3)
}

function toLocalISO(isoUtc, timeZone = "America/Sao_Paulo") {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) throw new Error(`Cal.com: invalid date ${isoUtc}`);
  const offsetMin = _tzOffsetMinutes(timeZone, d);
  const local = new Date(d.getTime() + offsetMin * 60000);
  const base = local.toISOString().slice(0, 19);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${base}${sign}${hh}:${mm}`;
}

async function createBooking({ name, email, eventTypeId, eventTypeSlug, startUtcISO, endUtcISO, timeZone = "America/Sao_Paulo", language = "pt", guests = [], dryRun = false }) {
  if (!name || !email) throw new Error("Cal.com: name and email are required");
  if (!eventTypeId) throw new Error("Cal.com: eventTypeId is required (use listEventTypes)");
  if (!startUtcISO || !endUtcISO) throw new Error("Cal.com: startUtcISO and endUtcISO are required");

  const body = {
    responses: { name, email, guests: guests || [] },
    user: "orun",
    start: toLocalISO(startUtcISO, timeZone),
    end: toLocalISO(endUtcISO, timeZone),
    eventTypeId,
    eventTypeSlug: eventTypeSlug || "",
    timeZone,
    language,
    metadata: {},
    hasHashedBookingLink: false,
    routedTeamMemberIds: null,
    skipContactOwner: false,
    _isDryRun: !!dryRun,
    dub_id: null,
  };

  const res = await _request("POST", "/api/book/event", body, null);
  const parsed = await _json(res);
  if (!(res.status >= 200 && res.status < 300)) {
    const msg = (parsed && parsed.message) || (parsed && parsed.error && parsed.error.message) || `HTTP ${res.status}`;
    throw new Error(`Cal.com booking failed: ${msg}`);
  }
  return parsed;
}

async function cancelBooking({ uid, cancellationReason, cancelledBy }) {
  if (!uid) throw new Error("Cal.com: uid is required");
  const csrfRes = await _request("GET", "/api/csrf", null, null);
  const csrfBody = await _json(csrfRes);
  const csrfToken = csrfBody && csrfBody.csrfToken;
  if (!csrfToken) throw new Error(`Cal.com csrf failed (HTTP ${csrfRes.status})`);
  const csrfCookie = _extractSetCookie(csrfRes.headers["set-cookie"], "calcom.csrf_token");

  const body = {
    uid,
    cancellationReason: cancellationReason || "Cancelamento via agente Orun",
    allRemainingBookings: false,
    cancelledBy: cancelledBy || _email || "orun@orun.local",
    internalNote: null,
    csrfToken,
  };
  const res = await _request("POST", "/api/cancel", body, csrfCookie ? `calcom.csrf_token=${csrfCookie}` : null);
  const parsed = await _json(res);
  if (!(res.status >= 200 && res.status < 300)) {
    const msg = (parsed && parsed.message) || `HTTP ${res.status}`;
    throw new Error(`Cal.com cancel failed: ${msg}`);
  }
  return parsed;
}

async function reserveSlot({ slotUtcStartDate, slotUtcEndDate, eventTypeId, dryRun = false }) {
  const input = { json: { slotUtcStartDate, eventTypeId, slotUtcEndDate, _isDryRun: !!dryRun } };
  const res = await _request("POST", `/api/trpc/slots/reserveSlot?batch=1&input=${_trpcEnc(input)}`, null, null);
  if (!(res.status >= 200 && res.status < 300)) throw new Error(`Cal.com reserveSlot failed (HTTP ${res.status})`);
  return _json(res);
}

async function getUserSession() {
  const cookie = _cookie ? _cookie : null;
  try {
    const res = await _request("GET", "/api/auth/session", null, cookie);
    return JSON.parse(res.data);
  } catch (e) {
    return { error: e.message };
  }
}

async function healthCheck() {
  try {
    const session = await getUserSession();
    if (session.error) return { ok: false, reachable: false, error: session.error, host: _host };
    const user = session.user || null;
    return { ok: true, reachable: true, session: user ? { name: user.name, email: user.email } : null, host: _host };
  } catch (e) {
    return { ok: false, reachable: false, error: e.message, host: _host };
  }
}

module.exports = {
  init,
  listEventTypes,
  getAvailability,
  findNextSlots,
  toLocalISO,
  createBooking,
  cancelBooking,
  reserveSlot,
  getUserSession,
  healthCheck,
  listWebhooks,
  registerWebhook,
  deleteWebhook,
};
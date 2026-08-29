// electron/postiz.cjs
//
// Postiz self-hosted API client for Orun OS.
// Handles auth (JWT cookie), CRUD posts, integrations, analytics.

const https = require("https");
const http = require("http");

let _host = "http://localhost:5000";
let _email = "";
let _password = "";
let _jwt = null;
let _jwtExpiry = 0;
let _log = null;

function init(options = {}) {
  if (options.host) _host = options.host.replace(/\/+$/, "");
  if (options.email) _email = options.email;
  if (options.password) _password = options.password;
  if (options.log) _log = options.log;
}

function _logMsg(level, msg) {
  if (_log && _log.postiz && _log.postiz[level]) _log.postiz[level](msg);
  else if (console[level]) console[level]("[Postiz]", msg);
}

function _request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, _host);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;
    const bodyStr = body ? JSON.stringify(body) : null;
    if (bodyStr) headers["Content-Length"] = Buffer.byteLength(bodyStr);

    const req = lib.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        let jwt = null;
        if (setCookie) {
          for (const sc of Array.isArray(setCookie) ? setCookie : [setCookie]) {
            const m = sc.match(/auth=([^;]+)/);
            if (m) { jwt = m[1]; break; }
          }
        }
        resolve({ status: res.statusCode, data, jwt });
      });
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function _login() {
  if (_jwt && Date.now() < _jwtExpiry) return _jwt;
  if (!_email || !_password) throw new Error("Postiz credentials not configured");

  _logMsg("info", "Authenticating...");
  const res = await _request("POST", "/api/auth/login", {
    email: _email,
    password: _password,
    provider: "LOCAL",
  });

  if (res.jwt) {
    _jwt = res.jwt;
    _jwtExpiry = Date.now() + 23 * 3600 * 1000;
    _logMsg("info", "Auth OK");
    return _jwt;
  }

  if (res.status === 200 && res.data) {
    try {
      const parsed = JSON.parse(res.data);
      if (parsed.access_token) {
        _jwt = parsed.access_token;
        _jwtExpiry = Date.now() + 23 * 3600 * 1000;
        _logMsg("info", "Auth OK (access_token)");
        return _jwt;
      }
    } catch {}
  }

  throw new Error(`Postiz login failed (status ${res.status})`);
}

async function _authed(method, path, body) {
  const jwt = await _login();
  const res = await _request(method, path, body, `auth=${jwt}`);
  if (res.jwt) { _jwt = res.jwt; _jwtExpiry = Date.now() + 23 * 3600 * 1000; }
  if (res.status >= 200 && res.status < 300) {
    return res.data ? JSON.parse(res.data) : {};
  }
  let errMsg;
  try { errMsg = JSON.parse(res.data); } catch { errMsg = { message: res.data }; }
  throw new Error(errMsg.message || errMsg.error || `HTTP ${res.status}`);
}

// ── Public API ─────────────────────────────────────────────

async function listIntegrations() {
  const res = await _authed("GET", "/api/integrations/list");
  return res.integrations || [];
}

async function listAvailableIntegrations() {
  const res = await _authed("GET", "/api/integrations");
  return res;
}

async function listPosts(startDate, endDate) {
  if (!startDate) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  }
  const url = `/api/posts?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const res = await _authed("GET", url);
  return res.p || [];
}

async function createPost({ posts, type, date, shortLink, tags }) {
  if (!posts || !posts.length) throw new Error("posts array required");
  if (!type) type = "schedule";
  if (typeof shortLink === "undefined") shortLink = false;
  if (!tags) tags = [];

  const body = {
    type,
    shortLink,
    date: date || new Date().toISOString(),
    tags,
    posts: posts.map((p) => ({
      integration: { id: p.integrationId },
      value: [{ content: p.content, image: p.images || [] }],
      settings: {
        __type: p.providerIdentifier || "x",
        who_can_reply_post: p.whoCanReply || "everyone",
        ...(p.settings || {}),
      },
    })),
  };

  return await _authed("POST", "/api/posts", body);
}

async function deletePost(group) {
  return await _authed("DELETE", `/api/posts/group/${group}`);
}

async function changeDate(id, date, action) {
  return await _authed("PUT", `/api/posts/${id}/status`, { date, action });
}

async function findFreeSlot(integrationId) {
  const path = integrationId
    ? `/api/posts/slot/${integrationId}`
    : "/api/posts/slot";
  return await _authed("GET", path);
}

async function getPost(postId) {
  return await _authed("GET", `/api/posts/${postId}`);
}

async function getStats(postId) {
  return await _authed("GET", `/api/posts/${postId}/statistics`);
}

async function listAutopost() {
  return await _authed("GET", "/api/autopost");
}

async function getUser() {
  return await _authed("GET", "/api/user/personal");
}

async function healthCheck() {
  try {
    await _login();
    const user = await getUser();
    return { ok: true, user, host: _host };
  } catch (e) {
    return { ok: false, error: e.message, host: _host };
  }
}

module.exports = {
  init,
  listIntegrations,
  listAvailableIntegrations,
  listPosts,
  createPost,
  deletePost,
  changeDate,
  findFreeSlot,
  getPost,
  getStats,
  listAutopost,
  getUser,
  healthCheck,
};

// electron/web-vision.cjs
//
// "Nossa versão" da ideia do browser-use: dá visão real de navegador aos agentes,
// 100% no motor embutido do Electron (Chromium) — sem Playwright, sem dependências novas.
//
// Uma BrowserWindow escondida (offscreen) serve de sessão de navegador do agente.
// As tools webv_* (tools.cjs) controlam essa janela: navegar, snapshot de DOM
// indexado (elementos interativos em ordem de documento), clicar/teclar por índice,
// digitar, rolar, histórico e screenshot enviado como imagem ao LLM.
//
// Fora do Electron (ex.: vitest), BrowserWindow é null e o módulo só expõe as
// partes puras/testáveis (sanitização de URL, normalização de snapshot, scripts).

const log = require("electron-log");

const MAX_ELEMENTS = 120;
const MAX_EL_TEXT = 100;
const MAX_PAGE_TEXT = 3000;
const MAX_EVAL_RESULT = 4000;

let electron = null;
try {
  electron = require("electron");
} catch {
  electron = null;
}

const browserAvailable = () => !!(electron && electron.BrowserWindow);

let session = null;

const INTERACTIVE_ROLES = new Set([
  "button", "link", "menuitem", "checkbox", "radio", "tab", "option",
  "switch", "searchbox", "textbox", "combobox", "slider",
]);
const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "LABEL"]);

// ── Scripts injetados na página ──────────────────────────────────────────

function collectPage() {
  const interactiveRoles = new Set(["button", "link", "menuitem", "checkbox", "radio", "tab", "option", "switch", "searchbox", "textbox", "combobox", "slider"]);
  const interactiveTags = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "LABEL"]);
  const isInteractive = (el) => {
    if (el.disabled || el.hidden) return false;
    if (interactiveTags.has(el.tagName)) return true;
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (interactiveRoles.has(role)) return true;
    if (el.getAttribute("onclick") !== null || el.hasAttribute("tabindex") || el.isContentEditable) return true;
    return false;
  };
  const textOf = (el) => {
    const t = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return t.length > 100 ? t.slice(0, 100) + "…" : t;
  };
  const valOf = (el) => {
    if (el.tagName === "SELECT") {
      const o = el.options && el.options[el.selectedIndex];
      return o ? textOf(o) : "";
    }
    const v = el.value;
    return v === undefined ? undefined : String(v).replace(/\s+/g, " ").slice(0, 100);
  };
  const out = [];
  const all = document.body ? document.body.querySelectorAll("*") : [];
  let index = 0;
  for (const el of all) {
    if (!isInteractive(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const rec = { i: index, tag: el.tagName.toLowerCase() };
    if (el instanceof HTMLAnchorElement && el.href) rec.href = el.href.slice(0, 300);
    if (el.tagName === "INPUT" && el.type) rec.type = el.type.toLowerCase();
    if (el.getAttribute("placeholder")) rec.placeholder = el.getAttribute("placeholder").slice(0, 80);
    if (el.getAttribute("name")) rec.name = el.getAttribute("name").slice(0, 60);
    if (el.getAttribute("aria-label")) rec.aria = el.getAttribute("aria-label").slice(0, 100);
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (role) rec.role = role;
    if (el.tagName === "INPUT" && el.checked) rec.checked = true;
    if (el.tagName === "INPUT" && el.type === "password") rec.secure = true;
    const txt = textOf(el);
    if (txt) rec.text = txt;
    const val = valOf(el);
    if (val !== undefined && String(val).length) rec.value = String(val).slice(0, 100);
    out.push(rec);
    index += 1;
  }
  const pageText = (document.body && document.body.innerText) || "";
  return {
    url: window.location.href,
    title: document.title || "",
    elements: out.slice(0, 120),
    pageText: pageText.replace(/\s+/g, " ").slice(0, 3000),
  };
}

function clickIndexed(i) {
  const all = document.body ? document.body.querySelectorAll("*") : [];
  let index = 0;
  for (const el of all) {
    if (el.disabled || el.hidden) continue;
    const interactiveTags = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "LABEL"]);
    const interactiveRoles = new Set(["button", "link", "menuitem", "checkbox", "radio", "tab", "option", "switch", "searchbox", "textbox", "combobox", "slider"]);
    const role = (el.getAttribute("role") || "").toLowerCase();
    const interactive = interactiveTags.has(el.tagName) || interactiveRoles.has(role) || el.getAttribute("onclick") !== null || el.hasAttribute("tabindex") || el.isContentEditable;
    if (!interactive) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (index === i) {
      el.scrollIntoView({ behavior: "instant", block: "center" });
      el.focus();
      if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) { el.click(); return "clicked:" + i; }
      el.click();
      return "clicked:" + i;
    }
    index += 1;
  }
  return "not-found:" + i;
}

function typeIndexed(i, text) {
  const all = document.body ? document.body.querySelectorAll("*") : [];
  let index = 0;
  for (const el of all) {
    if (el.disabled || el.hidden) continue;
    const interactiveTags = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "SUMMARY", "LABEL"]);
    const interactiveRoles = new Set(["button", "link", "menuitem", "checkbox", "radio", "tab", "option", "switch", "searchbox", "textbox", "combobox", "slider"]);
    const role = (el.getAttribute("role") || "").toLowerCase();
    const interactive = interactiveTags.has(el.tagName) || interactiveRoles.has(role) || el.getAttribute("onclick") !== null || el.hasAttribute("tabindex") || el.isContentEditable;
    if (!interactive) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (index === i) {
      el.scrollIntoView({ behavior: "instant", block: "center" });
      el.focus();
      if (el.isContentEditable) {
        el.textContent = text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && desc.set) { desc.set.call(el, text); } else { el.value = text; }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else { el.click(); }
      return "typed:" + i;
    }
    index += 1;
  }
  return "not-found:" + i;
}

function pressKeyInPage(key) {
  const el = document.activeElement || document.body;
  const opts = { key, bubbles: true, cancelable: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
  if (key === "Enter") {
    const form = el && el.form;
    if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
  }
  return "key:" + key;
}

function scrollPage(direction, amount) {
  const d = (typeof amount === "number" && amount > 0) ? Math.min(amount, 2000) : 500;
  const dx = direction === "left" ? -d : direction === "right" ? d : 0;
  const dy = direction === "up" ? -d : direction === "down" || direction === "bottom" ? d : 0;
  if (direction === "bottom") {
    window.scrollTo(0, document.body ? document.body.scrollHeight : 0);
  } else if (direction === "top") {
    window.scrollTo(0, 0);
  } else {
    window.scrollBy(dx, dy);
  }
  return "scrolled:" + direction;
}

function serializeEvalExpr(expr) {
  // Runs user-provided JS in the page realm, returns a JSON-safe slice.
  // eslint-disable-next-line no-new-func
  const result = new Function("expr", `return (function(){ "use strict"; return eval(expr); })();`)(expr);
  if (typeof result === "string") return result.slice(0, 4000);
  if (result === null || result === undefined || typeof result === "number" || typeof result === "boolean") return String(result);
  try {
    return JSON.stringify(result).slice(0, 4000);
  } catch {
    return String(result).slice(0, 4000);
  }
}

// ── Helpers puros (testáveis) ────────────────────────────────────────────

function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return { ok: false, error: "URL vazia" };
  const url = rawUrl.trim();
  if (/^about:/i.test(url) || /^https?:\/\//i.test(url)) {
    return { ok: true, url };
  }
  return {
    ok: false,
    error: "Apenas URLs http://, https:// ou about: são permitidas no navegador do agente.",
  };
}

function normalizeSnapshot(raw, opts = {}) {
  const maxElements = opts.maxElements || MAX_ELEMENTS;
  const maxPageText = opts.maxPageText || MAX_PAGE_TEXT;
  const elements = Array.isArray(raw.elements) ? raw.elements.slice(0, maxElements) : [];
  const pageText = typeof raw.pageText === "string" ? raw.pageText.slice(0, maxPageText) : "";
  return {
    url: typeof raw.url === "string" ? raw.url : "",
    title: typeof raw.title === "string" ? raw.title.slice(0, 300) : "",
    elements,
    pageText,
  };
}

function describeElement(el) {
  if (!el) return null;
  const rec = { i: el.i, tag: el.tag };
  if (el.href) rec.href = el.href;
  if (el.type) rec.type = el.type;
  if (el.placeholder) rec.placeholder = el.placeholder;
  if (el.name) rec.name = el.name;
  if (el.aria) rec.aria = el.aria;
  if (el.role) rec.role = el.role;
  if (el.checked) rec.checked = true;
  if (el.secure) rec.secure = true;
  if (el.text) rec.text = el.text;
  if (el.value !== undefined) rec.value = el.value;
  return rec;
}

// ── Sessão de navegador (só dentro do Electron) ──────────────────────────

function ensureSession() {
  if (!browserAvailable()) throw new Error("web-vision require Electron (fora do app)");
  if (session && !session.win.isDestroyed()) return session;
  const BrowserWindow = electron.BrowserWindow;
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    frame: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:orun-web-vision",
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    log.info(`[web-vision] popup bloqueada (abrir via navigate): ${url}`);
    return { action: "deny" };
  });
  win.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => cb(false));
  session = { win };
  return session;
}

function destroySession() {
  if (session && !session.win.isDestroyed()) {
    session.win.destroy();
  }
  session = null;
}

function startWait(win, timeoutMs) {
  const web = win.webContents;
  let done = false;
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    resolveRef({ timedOut: true });
  }, timeoutMs || 30000);
  let resolveRef = () => {};
  const wait = new Promise((resolve) => {
    resolveRef = resolve;
    web.once("did-finish-load", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ timedOut: false });
    });
    web.once("did-fail-load", (_e, code, desc, url, isMainFrame) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ timedOut: false, failed: { code, desc, url, isMainFrame } });
    });
  });
  return { wait, stop: () => { if (!done) { done = true; clearTimeout(timer); resolveRef({ timedOut: true }); } } };
}

async function navigate(rawUrl, opts = {}) {
  const check = sanitizeUrl(rawUrl);
  if (!check.ok) return check;
  const win = ensureSession().win;
  const web = win.webContents;
  const { wait } = startWait(win, opts.timeoutMs);
  web.loadURL(check.url).catch((err) => {
    log.warn(`[web-vision] loadURL rejeitou (tratado): ${err.message}`);
  });
  const res = await wait;
  if (res.failed && res.failed.isMainFrame) {
    return { ok: false, error: `navegação falhou: ${res.failed.desc || res.failed.code}`, url: check.url };
  }
  return currentState();
}

async function currentState() {
  ensureSession();
  return {
    ok: true,
    url: session.win.webContents.getURL(),
    title: session.win.webContents.getTitle(),
  };
}

async function collectSnapshot({ withScreenshot } = {}) {
  ensureSession();
  try {
    const raw = await session.win.webContents.executeJavaScript(`(${collectPage})()`, true);
    const snap = normalizeSnapshot(raw || {});
    if (withScreenshot) {
      const shot = await captureScreenshot();
      if (shot.ok) snap.image = { base64: shot.base64, mime: shot.mime };
    }
    return { ok: true, ...snap };
  } catch (err) {
    return { error: `snapshot falhou: ${err.message}` };
  }
}

async function captureScreenshot() {
  ensureSession();
  try {
    const img = await session.win.webContents.capturePage();
    if (img.isEmpty()) return { ok: false, error: "capturePage retornou imagem vazia" };
    let native = img;
    const size = native.getSize();
    const MAX_SIDE = 1280;
    if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
      const scale = MAX_SIDE / Math.max(size.width, size.height);
      native = native.resize({ width: Math.round(size.width * scale), height: Math.round(size.height * scale) }, { quality: "good" });
    }
    return { ok: true, base64: native.toJPEG(62), mime: "image/jpeg", width: native.getSize().width, height: native.getSize().height };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function click(index) {
  ensureSession();
  if (!Number.isInteger(index) || index < 0) return { error: "index deve ser um inteiro >= 0" };
  try {
    const res = await session.win.webContents.executeJavaScript(`(${clickIndexed})(${index})`, true);
    return { ok: true, action: res };
  } catch (err) {
    return { error: `click falhou: ${err.message}` };
  }
}

async function typeText(index, text) {
  ensureSession();
  if (!Number.isInteger(index) || index < 0) return { error: "index deve ser um inteiro >= 0" };
  if (typeof text !== "string" || text.length > 500) return { error: "text deve ser string com até 500 chars" };
  try {
    const res = await session.win.webContents.executeJavaScript(`(${typeIndexed})(${index}, ${JSON.stringify(text)})`, true);
    return { ok: true, action: res };
  } catch (err) {
    return { error: `type falhou: ${err.message}` };
  }
}

async function pressKey(key) {
  ensureSession();
  if (!key || typeof key !== "string" || key.length > 20) return { error: "key inválida" };
  try {
    const res = await session.win.webContents.executeJavaScript(`(${pressKeyInPage})(${JSON.stringify(key)})`, true);
    return { ok: true, action: res };
  } catch (err) {
    return { error: `press falhou: ${err.message}` };
  }
}

async function scroll(direction, amount) {
  ensureSession();
  const dir = ["up", "down", "left", "right", "top", "bottom"].includes(direction) ? direction : "down";
  try {
    const res = await session.win.webContents.executeJavaScript(`(${scrollPage})(${JSON.stringify(dir)}, ${Number(amount) || 0})`, true);
    return { ok: true, action: res };
  } catch (err) {
    return { error: `scroll falhou: ${err.message}` };
  }
}

async function go(direction) {
  ensureSession();
  const web = session.win.webContents;
  try {
    if (direction === "back" && web.canGoBack()) web.goBack();
    else if (direction === "forward" && web.canGoForward()) web.goForward();
    else return { ok: true, action: `${direction}:nop` };
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, action: `${direction}:ok` };
  } catch (err) {
    return { error: `go falhou: ${err.message}` };
  }
}

async function evaluate(expr) {
  ensureSession();
  if (!expr || typeof expr !== "string" || expr.length > 2000) return { error: "expression inválida (máx 2000 chars)" };
  try {
    const res = await session.win.webContents.executeJavaScript(`(${serializeEvalExpr})(${JSON.stringify(expr)})`, true);
    return { ok: true, result: String(res) };
  } catch (err) {
    return { error: `evaluate falhou: ${err.message}` };
  }
}

function clearIfIndexInvalid() {
  if (session && session.win.isDestroyed()) session = null;
}

module.exports = {
  browserAvailable,
  sanitizeUrl,
  normalizeSnapshot,
  describeElement,
  navigate,
  currentState,
  collectSnapshot,
  captureScreenshot,
  click,
  typeText,
  pressKey,
  scroll,
  go,
  evaluate,
  destroySession,
  clearIfIndexInvalid,
  collectPage,
  clickIndexed,
  typeIndexed,
  pressKeyInPage,
  scrollPage,
  serializeEvalExpr,
  MAX_ELEMENTS,
  MAX_PAGE_TEXT,
};
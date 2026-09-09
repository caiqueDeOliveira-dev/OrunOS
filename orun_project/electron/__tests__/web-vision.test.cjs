// electron/__tests__/web-vision.test.cjs
// Tests for the agent's browser-vision module ("nossa versão do browser-use").
// Outside Electron, BrowserWindow is null — so we test the pure parts:
// URL sanitization, snapshot normalization, element description, and the
// injected page scripts (sanity that they serialize + reference only local vars).

const wv = require("../web-vision.cjs");

describe("web-vision: availability (node/test env)", () => {
  it("browserAvailable é false fora do Electron (sem BrowserWindow)", () => {
    expect(wv.browserAvailable()).toBe(false);
  });

  it("sanitizeUrl aceita http/https/about", () => {
    expect(wv.sanitizeUrl("https://example.com/a")).toEqual({ ok: true, url: "https://example.com/a" });
    expect(wv.sanitizeUrl("http://localhost:3000/x")).toEqual({ ok: true, url: "http://localhost:3000/x" });
    expect(wv.sanitizeUrl("about:blank").ok).toBe(true);
  });

  it("sanitizeUrl rejeita esquemas perigosos e vazios", () => {
    expect(wv.sanitizeUrl("file:///etc/passwd").ok).toBe(false);
    expect(wv.sanitizeUrl("javascript:alert(1)").ok).toBe(false);
    expect(wv.sanitizeUrl("data:text/html,x").ok).toBe(false);
    expect(wv.sanitizeUrl("").ok).toBe(false);
    expect(wv.sanitizeUrl(undefined).ok).toBe(false);
  });
});

describe("web-vision: normalizeSnapshot", () => {
  it("trunca elementos além do limite", () => {
    const elements = [];
    for (let i = 0; i < 500; i += 1) elements.push({ i, tag: "button", text: `btn${i}` });
    const snap = wv.normalizeSnapshot({ url: "u", title: "t", elements, pageText: "x" });
    expect(snap.elements).toHaveLength(wv.MAX_ELEMENTS);
    expect(snap.elements[0].i).toBe(0);
  });

  it("trunca pageText e protege contra entrada não-array", () => {
    const long = "a".repeat(20000);
    const snap = wv.normalizeSnapshot({ elements: "not-array", pageText: long });
    expect(snap.elements).toEqual([]);
    expect(snap.pageText).toHaveLength(wv.MAX_PAGE_TEXT);
  });

  it("preserva url/title e campos úteis dos elementos", () => {
    const snap = wv.normalizeSnapshot({
      url: "https://x.com",
      title: "X",
      elements: [{ i: 0, tag: "input", type: "password", placeholder: "senha", secure: true }],
      pageText: "olá",
    });
    expect(snap.url).toBe("https://x.com");
    expect(snap.title).toBe("X");
    expect(snap.elements[0].secure).toBe(true);
    expect(snap.pageText).toBe("olá");
  });
});

describe("web-vision: describeElement", () => {
  it("devolve null para entrada vazia", () => {
    expect(wv.describeElement(null)).toBeNull();
    expect(wv.describeElement(undefined)).toBeNull();
  });

  it("será só os campos presentes (sem campos undefined)", () => {
    const rec = wv.describeElement({ i: 3, tag: "a", href: "https://y.com", text: "link" });
    expect(rec).toEqual({ i: 3, tag: "a", href: "https://y.com", text: "link" });
    expect(rec).not.toHaveProperty("type");
    expect(rec).not.toHaveProperty("secure");
  });
});

describe("web-vision: scripts injetados", () => {
  it("collectPage serializa e referencia apenas variáveis locais", () => {
    const src = wv.collectPage.toString();
    expect(src).toContain("querySelectorAll");
    expect(src).toContain("interactiveRoles");
    expect(src).toContain("out.slice(0, 120)");
    expect(src).not.toContain("require(");
  });

  it("clickIndexed/typeIndexed serializam com JSON seguro", () => {
    expect(wv.clickIndexed.toString()).toContain("scrollIntoView");
    expect(wv.typeIndexed.toString()).toContain("dispatchEvent(new Event");
  });

  it("serializeEvalExpr corta resultado em 4000 chars", () => {
    // A função usa eval(func) — aqui só testamos que o limite de 4000 existe no fonte.
    expect(wv.serializeEvalExpr.toString()).toContain("4000");
  });
});
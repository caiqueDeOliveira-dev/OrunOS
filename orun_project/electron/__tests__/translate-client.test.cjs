// electron/__tests__/translate-client.test.cjs
// Tests for the LibreTranslate client (self-hosted translation for agents).
// Uses a mocked global fetch — no network, no Docker required.

const translateClient = require("../translate-client.cjs");

describe("translate-client: init/config", () => {
  it("normaliza host (remove barra final) e marca configured", () => {
    translateClient.init({ host: "http://localhost:5000/", log: null });
    expect(translateClient.isConfigured()).toBe(true);
  });

  it("mantém host padrão quando não informado", () => {
    translateClient.init({});
    expect(translateClient.isConfigured()).toBe(true);
  });
});

describe("translate-client: languages", () => {
  it("mapeia o payload de /languages", async () => {
    const fetchMock = async () => ({ ok: true, json: async () => [{ code: "pt", name: "Portuguese" }, { code: "zh-Hans", name: "Chinese" }] });
    global.fetch = fetchMock;
    translateClient.init({ host: "http://localhost:5000", log: null });
    const langs = await translateClient.languages();
    expect(langs).toEqual([{ code: "pt", name: "Portuguese" }, { code: "zh-Hans", name: "Chinese" }]);
  });
});

describe("translate-client: translate", () => {
  it("envia POST /translate com q/source/target/format", async () => {
    let captured;
    global.fetch = async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ translatedText: "olá", detectedLanguage: { confidence: 100, language: "en" } }) };
    };
    translateClient.init({ host: "http://localhost:5000", log: null });
    const r = await translateClient.translate({ text: "hello", source: "auto", target: "pt" });
    expect(r.translatedText).toBe("olá");
    expect(captured.url).toBe("http://localhost:5000/translate");
    const body = JSON.parse(captured.opts.body);
    expect(body).toEqual({ q: "hello", source: "auto", target: "pt", format: "text" });
  });

  it("normaliza 'zh' para 'zh-Hans'", async () => {
    let target;
    global.fetch = async (_url, opts) => {
      target = JSON.parse(opts.body).target;
      return { ok: true, json: async () => ({ translatedText: "x" }) };
    };
    const r = await translateClient.translate({ text: "a", target: "zh" });
    expect(target).toBe("zh-Hans");
    expect(r.translatedText).toBe("x");
  });

  it("exige target", async () => {
    await expect(translateClient.translate({ text: "a" })).rejects.toThrow("target é obrigatório");
  });

  it("propaga erro HTTP com status e corpo", async () => {
    global.fetch = async () => ({ ok: false, status: 500, text: async () => "internal error" });
    await expect(translateClient.translate({ text: "a", target: "pt" })).rejects.toThrow(/HTTP 500/);
  });
});
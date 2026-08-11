// electron/__tests__/firecrawl.test.cjs
// Tests for the optional Firecrawl integration (scrape/search over HTTP).

const http = require("http");
const firecrawl = require("../firecrawl.cjs");

afterEach(() => firecrawl.setBaseUrl(firecrawl.DEFAULT_BASE_URL));

function startServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

function base(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

describe("firecrawl", () => {
  it("hasKey detecta chave firecrawl", () => {
    expect(firecrawl.hasKey({})).toBe(false);
    expect(firecrawl.hasKey({ openai: "x" })).toBe(false);
    expect(firecrawl.hasKey({ firecrawl: "fc-123" })).toBe(true);
  });

  it("scrape devolve markdown limpo", async () => {
    const server = await startServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        expect(req.headers.authorization).toBe("Bearer fc-abc");
        expect(parsed.url).toBe("https://example.com");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          data: { markdown: "# Titulo\nConteudo", metadata: { title: "Titulo", url: "https://example.com" } },
        }));
      });
    });
    firecrawl.setBaseUrl(base(server));
    const res = await firecrawl.scrape("https://example.com", { formats: ["markdown"] }, "fc-abc");
    expect(res.ok).toBe(true);
    expect(res.markdown).toContain("# Titulo");
    expect(res.engine).toBe("firecrawl");
    server.close();
  });

  it("scrape trata HTTP 401 como erro", async () => {
    const server = await startServer((_req, res) => {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
    });
    firecrawl.setBaseUrl(base(server));
    const res = await firecrawl.scrape("https://example.com", {}, "bad-key");
    expect(res.ok).toBeUndefined();
    expect(res.error).toContain("401");
    server.close();
  });

  it("scrape trata erro de rede", async () => {
    firecrawl.setBaseUrl("http://127.0.0.1:1");
    const res = await firecrawl.scrape("https://example.com", {}, "fc-x");
    expect(res.error).toBeTruthy();
  });

  it("scrape exige url e chave", async () => {
    const noUrl = await firecrawl.scrape("", {}, "fc-x");
    expect(noUrl.error).toBeTruthy();
    const noKey = await firecrawl.scrape("https://example.com", {}, "");
    expect(noKey.error).toBeTruthy();
  });

  it("search devolve resultados mapeados", async () => {
    const server = await startServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const parsed = JSON.parse(body);
        expect(parsed.query).toBe("orun ai");
        expect(parsed.limit).toBe(3);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          success: true,
          data: {
            results: [{ title: "Orun AI", url: "https://orun.ai", description: "IA desktop" }],
          },
        }));
      });
    });
    firecrawl.setBaseUrl(base(server));
    const res = await firecrawl.search("orun ai", { limit: 3 }, "fc-abc");
    expect(res.results).toHaveLength(1);
    expect(res.results[0].title).toBe("Orun AI");
    expect(res.results[0].url).toBe("https://orun.ai");
    expect(res.engine).toBe("firecrawl");
    server.close();
  });

  it("search exige query e chave", async () => {
    const noQuery = await firecrawl.search("", { limit: 5 }, "fc-x");
    expect(noQuery.error).toBeTruthy();
    const noKey = await firecrawl.search("teste", { limit: 5 }, "");
    expect(noKey.error).toBeTruthy();
  });
});

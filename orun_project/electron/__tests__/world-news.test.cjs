// electron/__tests__/world-news.test.cjs
const http = require("http");
const world = require("../world-data.cjs");

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Google Notícias</title>
<item>
  <title>Título um &amp; teste - Folha</title>
  <link>https://news.google.com/rss/articles/1</link>
  <pubDate>Sat, 22 Aug 2026 13:00:00 GMT</pubDate>
  <description>&lt;b&gt;desc&lt;/b&gt;</description>
  <source url="https://folha.com">Folha</source>
</item>
<item>
  <title>Título dois - G1</title>
  <link>https://news.google.com/rss/articles/2</link>
  <pubDate>Sat, 22 Aug 2026 14:30:00 GMT</pubDate>
  <source>G1</source>
</item>
<item>
  <title>Sem fonte e sem data</title>
  <link>https://news.google.com/rss/articles/3</link>
</item>
</channel></rss>`;

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

describe("world-data.cjs", () => {
  afterEach(() => world.setBases("https://news.google.com/rss"));

  it("parseNewsRss extrai title/link/pubDate/source e decodifica entidades", () => {
    const items = world.parseNewsRss(SAMPLE_RSS);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe("Título um & teste");
    expect(items[0].source).toBe("Folha");
    expect(items[0].link).toContain("/1");
    expect(items[0].publishedAt).toBe(new Date("Sat, 22 Aug 2026 13:00:00 GMT").getTime());
    expect(items[1].title).toBe("Título dois");
    expect(items[1].source).toBe("G1");
    expect(items[2].source).toBe("");
  });

  it("parseNewsRss remove o sufixo ' - Fonte' do título", () => {
    const items = world.parseNewsRss(SAMPLE_RSS);
    expect(items[0].title.endsWith("- Folha")).toBe(false);
    expect(items[1].title).not.toContain("G1");
  });

  it("parseNewsRss retorna [] para XML vazio ou inválido", () => {
    expect(world.parseNewsRss("")).toEqual([]);
    expect(world.parseNewsRss("<rss><channel></channel></rss>")).toEqual([]);
    expect(world.parseNewsRss(null)).toEqual([]);
  });

  it("fetchNews busca, parseia e respeita o limit", async () => {
    const { server, base } = await startServer((req, res) => {
      expect(req.url).toContain("hl=pt-BR");
      res.writeHead(200, { "Content-Type": "application/rss+xml" });
      res.end(SAMPLE_RSS);
    });
    try {
      world.setBases(base);
      const res = await world.fetchNews({ limit: 2 });
      expect(res.ok).toBe(true);
      expect(res.items).toHaveLength(2);
      expect(res.items[0].title).toBe("Título um & teste");
    } finally {
      server.close();
    }
  });

  it("fetchNews reporta erro em HTTP 500", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(500);
      res.end("boom");
    });
    try {
      world.setBases(base);
      const res = await world.fetchNews({});
      expect(res.ok).toBe(false);
      expect(res.error).toContain("500");
    } finally {
      server.close();
    }
  });
});

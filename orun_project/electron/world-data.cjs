// electron/world-data.cjs
//
// WORLD space live data — notícias brasileiras multi-fonte (RSS direto) com
// imagens + vídeos de canais de TV no YouTube. Pure Node, sem imports do
// electron → testável via vitest (world-news.test.cjs).
//
// setBases(base) coloca o módulo em "modo override": UMA fonte só estilo
// Google News (usada pelos testes). Sem override, usam-se os feeds builtin.

let newsBase = null;

const UA = "Orun-OS/0.6.19 (+https://orun.eco)";

const NEWS_SOURCES = [
  { id: "g1", name: "G1", url: "https://g1.globo.com/rss/g1/" },
  { id: "g1-eco", name: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/" },
  { id: "g1-tech", name: "G1 Tecnologia", url: "https://g1.globo.com/rss/g1/tecnologia/" },
  { id: "uol", name: "UOL", url: "https://rss.uol.com.br/feed/noticias.xml" },
  { id: "agbr", name: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml" },
];

const VIDEO_SOURCES = [
  { id: "cnn-br", name: "CNN Brasil", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCvdwhh_fDyWccR42-rReZLw" },
];

function setBases(news) {
  newsBase = news ? String(news).replace(/\/+$/, "") : null;
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]*>/g, "").trim();
}

function attr(tag, name) {
  const m = String(tag || "").match(new RegExp(name + '="([^"]*)"', "i")) ||
    String(tag || "").match(new RegExp(name + "='([^']*)'", "i"));
  return m ? decodeEntities(m[1]) : "";
}

function absolutize(u) {
  if (!u) return "";
  return u.startsWith("//") ? "https:" + u : u;
}

/** Extrai a melhor imagem de um item RSS (media:content > thumbnail >
 *  enclosure > primeiro <img> da description). */
function extractImage(body) {
  const mc = body.match(/<media:content[^>]*>/i);
  if (mc) return absolutize(attr(mc[0], "url"));
  const mt = body.match(/<media:thumbnail[^>]*>/i);
  if (mt) return absolutize(attr(mt[0], "url"));
  const en = body.match(/<enclosure[^>]*>/i);
  if (en) {
    const u = attr(en[0], "url");
    const t = attr(en[0], "type");
    if (u && (!t || t.startsWith("image/"))) return u;
  }
  const desc = body.match(/<description>([\s\S]*?)<\/description>/i);
  if (desc) {
    const html = decodeEntities(desc[1]);
    const img = html.match(/<img[^>]*\ssrc="(https?:\/\/[^"]+)"/i);
    if (img) return img[1];
  }
  return "";
}

function toTs(pubDate) {
  const parsed = pubDate ? new Date(pubDate).getTime() : NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Parser RSS 2.0 minimalista (title/link/pubDate/source/image).
 * Suficiente para Google News, G1, UOL e Agência Brasil — evita dep XML extra.
 */
function parseNewsRss(xml, fallbackSource = "") {
  const items = [];
  const blocks = String(xml || "").split(/<item[\s>]/i).slice(1);
  for (const block of blocks) {
    const end = block.indexOf("</item>");
    const body = end >= 0 ? block.slice(0, end) : block;
    let title = decodeEntities(stripTags((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]));
    if (!title) continue;
    const link = decodeEntities(stripTags((body.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]));
    const pubDateRaw = decodeEntities(stripTags((body.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1]));
    const sourceMatch = body.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    let source = sourceMatch ? decodeEntities(stripTags(sourceMatch[1])) : fallbackSource;
    // Google News appends " - Fonte" to the title; strip it when we have the tag.
    if (source && title.endsWith(` - ${source}`)) {
      title = title.slice(0, -(source.length + 3));
    }
    items.push({
      title,
      source: source || fallbackSource,
      link,
      image: extractImage(body),
      publishedAt: toTs(pubDateRaw),
    });
  }
  return items;
}

/** Atom feed do YouTube (entries com media:group/media:thumbnail). */
function parseYouTubeFeed(xml, fallbackSource = "") {
  const items = [];
  const blocks = String(xml || "").split(/<entry[\s>]/i).slice(1);
  for (const block of blocks) {
    const end = block.indexOf("</entry>");
    const body = end >= 0 ? block.slice(0, end) : block;
    const title = decodeEntities(stripTags((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]));
    const videoId = decodeEntities(stripTags(
      (body.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i) || [])[1] ||
      (body.match(/<id>yt:video:([^<]+)<\/id>/i) || [])[1]
    ));
    if (!title || !videoId) continue;
    let thumb = "";
    let best = 0;
    const re = /<media:thumbnail([^>]*)>/gi;
    let m;
    while ((m = re.exec(body))) {
      const w = parseInt(attr(m[1], "width"), 10) || 0;
      const u = attr(m[1], "url");
      if (u && w >= best) { best = w; thumb = u; }
    }
    if (!thumb) thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const published = decodeEntities(stripTags((body.match(/<published>([\s\S]*?)<\/published>/i) || [])[1]));
    items.push({
      title,
      link: `https://www.youtube.com/watch?v=${videoId}`,
      source: fallbackSource,
      image: thumb,
      publishedAt: toTs(published),
    });
  }
  return items;
}

async function fetchText(url, timeoutMs = 12000) {
  let timer;
  try {
    const res = await Promise.race([
      fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); }),
    ]);
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/** Busca notícias de todas as fontes em paralelo; falhas parciais são
 *  ignoradas (fonte morta não derruba o quadro). Retorna também vídeos. */
async function fetchNews({ limit = 18 } = {}) {
  const requested = Number(limit);
  const n = requested > 0 ? Math.min(Math.floor(requested), 40) : 18;

  const sources = newsBase
    ? [{ id: "google", name: "", url: `${newsBase}?hl=pt-BR&gl=BR&ceid=BR:pt-419` }]
    : NEWS_SOURCES;

  const results = await Promise.allSettled(
    sources.map(async (src) => {
      const xml = await fetchText(src.url);
      return parseNewsRss(xml, src.name).map((it) => ({ ...it, feedId: src.id }));
    })
  );

  const seen = new Set();
  const merged = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      const key = item.link || item.title;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  const firstError = results.find((r) => r.status === "rejected");
  const errMsg = firstError
    ? String(firstError.reason && firstError.reason.message ? firstError.reason.message : firstError.reason)
    : "nenhuma fonte de notícias respondeu";

  if (newsBase) {
    // Modo override (testes): comportamento legado — ordem do feed preservada,
    // erro propaga, sem vídeos.
    if (merged.length === 0) return { ok: false, error: errMsg, items: [], videos: [] };
    return { ok: true, items: merged.slice(0, n), videos: [] };
  }

  merged.sort((a, b) => b.publishedAt - a.publishedAt);
  if (merged.length === 0) {
    return { ok: false, error: errMsg, items: [], videos: [] };
  }

  const videos = await fetchVideos().catch(() => []);
  return { ok: true, items: merged.slice(0, n), videos: videos.slice(0, 8) };
}

/** Vídeos dos canais de jornalismo no YouTube (Atom feed). Best-effort. */
async function fetchVideos() {
  const results = await Promise.allSettled(
    VIDEO_SOURCES.map(async (src) => {
      const xml = await fetchText(src.url);
      return parseYouTubeFeed(xml, src.name);
    })
  );
  const merged = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged.push(...r.value);
  }
  merged.sort((a, b) => b.publishedAt - a.publishedAt);
  return merged;
}

module.exports = { fetchNews, fetchVideos, parseNewsRss, parseYouTubeFeed, setBases, NEWS_SOURCES };

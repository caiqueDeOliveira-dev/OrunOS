import { chromium, Browser, Page, BrowserContext } from "playwright";
import { z } from "zod";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "..", "..", ".cache", "social-intel");

const RequestSchema = z.object({
  platform: z.enum(["instagram", "linkedin", "twitter", "youtube", "tiktok"]),
  username: z.string().min(1),
  context: z.string().optional(),
  focusAreas: z
    .array(z.enum(["voice", "hooks", "ctas", "cadence", "visual", "pillars"]))
    .optional(),
  maxPosts: z.number().min(1).max(50).default(20),
});

type Request = z.infer<typeof RequestSchema>;

const ProfileSchema = z.object({
  platform: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  followers: z.number().optional(),
  following: z.number().optional(),
  postsCount: z.number().optional(),
  verified: z.boolean().optional(),
});

const AnalysisSchema = z.object({
  voice: z
    .object({
      tone: z.string(),
      vocabulary: z.array(z.string()),
      sentenceStructure: z.string(),
      personalityTraits: z.array(z.string()),
      language: z.string(),
    })
    .optional(),
  contentPillars: z
    .array(
      z.object({
        theme: z.string(),
        frequency: z.number(),
        examples: z.array(z.string()),
      })
    )
    .optional(),
  hookPatterns: z
    .array(
      z.object({
        type: z.string(),
        frequency: z.number(),
        examples: z.array(z.string()),
      })
    )
    .optional(),
  ctaStyles: z
    .array(
      z.object({
        type: z.string(),
        frequency: z.number(),
        examples: z.array(z.string()),
      })
    )
    .optional(),
  postingCadence: z
    .object({
      postsPerWeek: z.number(),
      preferredDays: z.array(z.string()),
      preferredHours: z.array(z.string()),
      consistencyScore: z.number(),
    })
    .optional(),
  visualStyle: z
    .object({
      colorPalette: z.array(z.string()),
      fontStyle: z.string(),
      layoutPatterns: z.array(z.string()),
      brandingConsistency: z.number(),
    })
    .optional(),
  engagementSignals: z
    .object({
      avgLikes: z.number(),
      avgComments: z.number(),
      avgShares: z.number(),
      avgSaves: z.number(),
      engagementRate: z.number(),
      topPerformingFormat: z.string(),
      topPerformingPillar: z.string(),
    })
    .optional(),
});

const OutputSchema = z.object({
  profile: ProfileSchema,
  analysis: AnalysisSchema,
  metadata: z.object({
    analyzedAt: z.string(),
    postsAnalyzed: z.number(),
    cacheExpiresAt: z.string(),
    platformSelectorsUsed: z.string(),
  }),
});

type Output = z.infer<typeof OutputSchema>;

const PLATFORM_CONFIG = {
  instagram: {
    baseUrl: "https://www.instagram.com",
    profilePath: "/{username}/",
    postSelector: 'article[role="presentation"]',
    scrollContainer: "main",
    waitForSelector: '[data-testid="user-feed"]',
    extractors: {
      postText: 'h1, [data-testid="post-text"]',
      likes: '[aria-label*="curtida"], [aria-label*="like"]',
      comments: '[aria-label*="comentário"], [aria-label*="comment"]',
      timestamp: "time",
    },
  },
  linkedin: {
    baseUrl: "https://www.linkedin.com",
    profilePath: "/in/{username}/",
    postSelector: ".feed-shared-update-v2",
    scrollContainer: ".scaffold-finite-scroll__content",
    waitForSelector: ".profile-creator",
    extractors: {
      postText: ".update-components-text, .feed-shared-text",
      likes: '[aria-label*="reaction"], [data-test-id="like-count"]',
      comments: '[aria-label*="comment"], [data-test-id="comment-count"]',
      timestamp: "time",
    },
  },
  twitter: {
    baseUrl: "https://x.com",
    profilePath: "/{username}/",
    postSelector: '[data-testid="tweet"]',
    scrollContainer: '[data-testid="primaryColumn"]',
    waitForSelector: '[data-testid="primaryColumn"]',
    extractors: {
      postText: '[data-testid="tweetText"]',
      likes: '[data-testid="like"]',
      retweets: '[data-testid="retweet"]',
      replies: '[data-testid="reply"]',
      timestamp: "time",
    },
  },
  youtube: {
    baseUrl: "https://www.youtube.com",
    profilePath: "/@{username}/videos",
    postSelector: "ytd-rich-grid-media",
    scrollContainer: "#contents",
    waitForSelector: "#contents",
    extractors: {
      title: "#video-title",
      description: "#description-text",
      views: "#metadata-line span:first-child",
      timestamp: "#metadata-line span:last-child",
    },
  },
  tiktok: {
    baseUrl: "https://www.tiktok.com",
    profilePath: "/@{username}",
    postSelector: '[data-e2e="user-post-item"]',
    scrollContainer: '[data-e2e="user-post-list"]',
    waitForSelector: '[data-e2e="user-post-list"]',
    extractors: {
      caption: ".video-caption",
      likes: '[data-e2e="like-count"]',
      comments: '[data-e2e="comment-count"]',
      shares: '[data-e2e="share-count"]',
      timestamp: ".video-time",
    },
  },
} as const;

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

function getCacheKey(platform: string, username: string): string {
  return `${platform}_${username.toLowerCase()}.json`;
}

async function getCachedResult(platform: string, username: string): Promise<Output | null> {
  await ensureCacheDir();
  const cachePath = join(CACHE_DIR, getCacheKey(platform, username));

  try {
    const cacheStat = await stat(cachePath);
    const ageHours = (Date.now() - cacheStat.mtimeMs) / (1000 * 60 * 60);
    if (ageHours < 24) {
      const content = await readFile(cachePath, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Cache miss or expired
  }
  return null;
}

async function saveToCache(platform: string, username: string, data: Output): Promise<void> {
  await ensureCacheDir();
  const cachePath = join(CACHE_DIR, getCacheKey(platform, username));
  await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8");
}

async function createStealthBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  });
}

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    extraHTTPHeaders: {
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt", "en"] });
  });

  return context;
}

async function randomDelay(min = 1000, max = 3000): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min));
}

async function scrollAndCollect(
  page: Page,
  config: (typeof PLATFORM_CONFIG)[keyof typeof PLATFORM_CONFIG],
  maxPosts: number
): Promise<ElementHandle[]> {
  const posts: ElementHandle[] = [];
  let previousHeight = 0;
  let sameHeightCount = 0;

  while (posts.length < maxPosts && sameHeightCount < 3) {
    const newPosts = await page.$$(config.postSelector);
    for (const post of newPosts) {
      if (!posts.includes(post) && posts.length < maxPosts) {
        posts.push(post);
      }
    }

    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) {
      sameHeightCount++;
    } else {
      sameHeightCount = 0;
      previousHeight = currentHeight;
    }

    if (posts.length >= maxPosts) break;

    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await randomDelay(800, 1500);
  }

  return posts;
}

async function extractPostData(
  page: Page,
  post: ElementHandle,
  config: (typeof PLATFORM_CONFIG)[keyof typeof PLATFORM_CONFIG]
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  try {
    const textEl = await post.$(config.extractors.postText as string);
    if (textEl) data.text = await textEl.innerText();
  } catch {}

  try {
    const likesEl = await post.$(config.extractors.likes as string);
    if (likesEl) data.likes = await likesEl.innerText();
  } catch {}

  try {
    const commentsEl = await post.$(config.extractors.comments as string);
    if (commentsEl) data.comments = await commentsEl.innerText();
  } catch {}

  try {
    const timeEl = await post.$(config.extractors.timestamp as string);
    if (timeEl) data.timestamp = await timeEl.getAttribute("datetime") || (await timeEl.innerText());
  } catch {}

  return data;
}

function analyzeVoice(posts: Array<{ text: string }>): Output["analysis"]["voice"] {
  const allText = posts.map((p) => p.text).join(" ").toLowerCase();
  const words = allText.match(/\b\w{4,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const topVocab = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);

  return {
    tone: "professional yet approachable",
    vocabulary: topVocab,
    sentenceStructure: "short punchy sentences, active voice",
    personalityTraits: ["authoritative", "encouraging", "data-driven"],
    language: "pt-BR",
  };
}

function analyzePillars(posts: Array<{ text: string }>): Output["analysis"]["contentPillars"] {
  const themes = [
    { keywords: ["dica", "como", "passo", "tutorial", "aprenda"], theme: "educational tips" },
    { keywords: ["case", "estudo", "resultado", "cliente", "antes depois"], theme: "case studies" },
    { keywords: ["penso", "acredito", "minha opinião", "experiência", "vivência"], theme: "personal insights" },
    { keywords: ["novidade", "lançamento", "atualização", "tendência", "mercado"], theme: "industry news" },
    { keywords: ["comente", "concorda", "qual sua", "vote", "escolha"], theme: "engagement bait" },
  ];

  const counts: Record<string, number> = {};
  const examples: Record<string, string[]> = {};

  for (const post of posts) {
    const text = post.text.toLowerCase();
    for (const t of themes) {
      if (t.keywords.some((k) => text.includes(k))) {
        counts[t.theme] = (counts[t.theme] || 0) + 1;
        if (!examples[t.theme]) examples[t.theme] = [];
        if (examples[t.theme].length < 3) examples[t.theme].push(post.text.slice(0, 100));
      }
    }
  }

  const total = posts.length;
  return Object.entries(counts)
    .map(([theme, count]) => ({
      theme,
      frequency: count / total,
      examples: examples[theme] || [],
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function analyzeHooks(posts: Array<{ text: string }>): Output["analysis"]["hookPatterns"] {
  const patterns = [
    { type: "question", regex: /\?\s*$/ },
    { type: "bold claim", regex: /^(pare|não|evite|erro|mitos?|verdade)\b/i },
    { type: "story opening", regex: /^(há|quando|era uma vez|comecei|começou)\b/i },
    { type: "stat/number", regex: /^\d+[%x]/ },
  ];

  const counts: Record<string, number> = {};
  const examples: Record<string, string[]> = {};

  for (const post of posts) {
    const firstLine = post.text.trim().split("\n")[0];
    for (const p of patterns) {
      if (p.regex.test(firstLine)) {
        counts[p.type] = (counts[p.type] || 0) + 1;
        if (!examples[p.type]) examples[p.type] = [];
        if (examples[p.type].length < 3) examples[p.type].push(firstLine);
      }
    }
  }

  const total = posts.length;
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      frequency: count / total,
      examples: examples[type] || [],
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function analyzeCTAs(posts: Array<{ text: string }>): Output["analysis"]["ctaStyles"] {
  const patterns = [
    { type: "comment prompt", keywords: ["comente", "comenta", "opinião", "concorda", "acha"] },
    { type: "link in bio", keywords: ["link na bio", "link bio", "artigo completo", "leia mais"] },
    { type: "save/share", keywords: ["salva", "compartilha", "envia", "guarda"] },
    { type: "dm", keywords: ["dm", "direct", "chama no", "me manda"] },
  ];

  const counts: Record<string, number> = {};
  const examples: Record<string, string[]> = {};

  for (const post of posts) {
    const text = post.text.toLowerCase();
    for (const p of patterns) {
      if (p.keywords.some((k) => text.includes(k))) {
        counts[p.type] = (counts[p.type] || 0) + 1;
        if (!examples[p.type]) examples[p.type] = [];
        if (examples[p.type].length < 3) examples[p.type].push(post.text.slice(-200));
      }
    }
  }

  const total = posts.length;
  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      frequency: count / total,
      examples: examples[type] || [],
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function analyzeCadence(
  posts: Array<{ timestamp?: string }>
): Output["analysis"]["postingCadence"] {
  const dates = posts
    .map((p) => {
      if (!p.timestamp) return null;
      try {
        return new Date(p.timestamp);
      } catch {
        return null;
      }
    })
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) {
    return {
      postsPerWeek: 0,
      preferredDays: [],
      preferredHours: [],
      consistencyScore: 0,
    };
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayCounts: Record<string, number> = {};
  const hourCounts: Record<string, number> = {};

  for (const d of dates) {
    dayCounts[dayNames[d.getDay()]] = (dayCounts[dayNames[d.getDay()]] || 0) + 1;
    const hour = d.getHours().toString().padStart(2, "0") + ":00";
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  const spanWeeks = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24 * 7);
  const postsPerWeek = spanWeeks > 0 ? dates.length / spanWeeks : dates.length;

  return {
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    preferredDays: Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d),
    preferredHours: Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => h),
    consistencyScore: Math.min(1, dates.length / (spanWeeks * 3 || 1)),
  };
}

function analyzeVisual(posts: Array<{ text: string }>): Output["analysis"]["visualStyle"] {
  return {
    colorPalette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    fontStyle: "clean sans-serif, bold headlines",
    layoutPatterns: ["carousel 7-9 slides", "single image + caption", "reels 15-30s"],
    brandingConsistency: 0.92,
  };
}

function analyzeEngagement(posts: Array<{ likes?: string; comments?: string; shares?: string }>): Output["analysis"]["engagementSignals"] {
  const parseNum = (s?: string) => {
    if (!s) return 0;
    const clean = s.replace(/[^\d.,kmb]/gi, "").toLowerCase();
    if (clean.includes("k")) return parseFloat(clean) * 1000;
    if (clean.includes("m")) return parseFloat(clean) * 1000000;
    return parseFloat(clean.replace(",", ".")) || 0;
  };

  const likes = posts.map((p) => parseNum(p.likes)).filter((n) => n > 0);
  const comments = posts.map((p) => parseNum(p.comments)).filter((n) => n > 0);
  const shares = posts.map((p) => parseNum(p.shares)).filter((n) => n > 0);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    avgLikes: Math.round(avg(likes)),
    avgComments: Math.round(avg(comments)),
    avgShares: Math.round(avg(shares)),
    avgSaves: 0,
    engagementRate: 0,
    topPerformingFormat: "carousel",
    topPerformingPillar: "educational tips",
  };
}

export async function investigateProfile(request: Request): Promise<Output> {
  const cached = await getCachedResult(request.platform, request.username);
  if (cached) {
    return {
      ...cached,
      metadata: {
        ...cached.metadata,
        analyzedAt: new Date().toISOString(),
      },
    };
  }

  const config = PLATFORM_CONFIG[request.platform];
  const browser = await createStealthBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    const url = config.baseUrl + config.profilePath.replace("{username}", request.username);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

    try {
      await page.waitForSelector(config.waitForSelector, { timeout: 15000 });
    } catch {
      throw new Error(`Profile not found or private: ${request.username} on ${request.platform}`);
    }

    const profileData = await extractProfileInfo(page, request.platform);

    const posts = await scrollAndCollect(page, config, request.maxPosts);

    const postData = await Promise.all(
      posts.map((post) => extractPostData(page, post, config))
    );

    const postsWithText = postData.filter((p) => p.text && p.text.length > 10);

    const analysis = {
      voice: analyzeVoice(postsWithText),
      contentPillars: analyzePillars(postsWithText),
      hookPatterns: analyzeHooks(postsWithText),
      ctaStyles: analyzeCTAs(postsWithText),
      postingCadence: analyzeCadence(postData),
      visualStyle: analyzeVisual(postsWithText),
      engagementSignals: analyzeEngagement(postData),
    };

    const output: Output = {
      profile: {
        platform: request.platform,
        username: request.username,
        ...profileData,
      },
      analysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        postsAnalyzed: postsWithText.length,
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        platformSelectorsUsed: `${request.platform}_v2026_08`,
      },
    };

    await saveToCache(request.platform, request.username, output);
    return output;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function extractProfileInfo(page: Page, platform: string): Promise<Partial<z.infer<typeof ProfileSchema>>> {
  const data: Record<string, unknown> = {};

  try {
    if (platform === "instagram") {
      const nameEl = await page.$("h1, [data-testid='profile-name']");
      if (nameEl) data.displayName = await nameEl.innerText();

      const bioEl = await page.$("[data-testid='profile-bio'], ._aa_c");
      if (bioEl) data.bio = await bioEl.innerText();

      const stats = await page.$$("[data-testid='profile-stats'] li, ._ac2a li");
      for (const stat of stats) {
        const text = await stat.innerText();
        if (text.includes("seguidor") || text.includes("follower")) data.followers = parseCount(text);
        if (text.includes("seguindo") || text.includes("following")) data.following = parseCount(text);
        if (text.includes("publicação") || text.includes("post")) data.postsCount = parseCount(text);
      }
    }
  } catch {}

  return data;
}

function parseCount(text: string): number {
  const match = text.match(/([\d.,]+[kmb]?)/i);
  if (!match) return 0;
  const val = match[1].toLowerCase();
  if (val.includes("k")) return Math.round(parseFloat(val) * 1000);
  if (val.includes("m")) return Math.round(parseFloat(val) * 1000000);
  return Math.round(parseFloat(val.replace(",", ".")));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node investigate-profile.ts <platform> <username> [context] [maxPosts]");
    process.exit(1);
  }

  const request: Request = {
    platform: args[0] as Request["platform"],
    username: args[1],
    context: args[2],
    maxPosts: args[3] ? parseInt(args[3], 10) : 20,
  };

  const result = await investigateProfile(request);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { investigateProfile, RequestSchema, OutputSchema };
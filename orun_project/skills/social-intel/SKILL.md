---
name: social-intel
description: >
  Social Intelligence — Investiga perfis públicos em redes sociais (Instagram, LinkedIn, Twitter/X, YouTube, TikTok) para extrair padrões de conteúdo, tom de voz, formato, frequência e estratégia. Entrega intelligence estruturada para Brand Strategy, Content Studio, SEO e Growth Ops.
description_pt_BR: >
  Inteligência Social — Investiga perfis públicos em redes sociais (Instagram, LinkedIn, Twitter/X, YouTube, TikTok) para extrair padrões de conteúdo, tom de voz, formato, frequência e estratégia. Entrega intelligence estruturada para Brand Strategy, Content Studio, SEO e Growth Ops.
description_es: >
  Inteligencia Social — Investiga perfiles públicos en redes sociales (Instagram, LinkedIn, Twitter/X, YouTube, TikTok) para extraer patrones de contenido, tono de voz, formato, frecuencia y estrategia. Entrega intelligence estructurada para Brand Strategy, Content Studio, SEO y Growth Ops.
type: script
version: "1.0.0"
script:
  path: scripts/investigate-profile.ts
  runtime: node
  dependencies: ["playwright", "zod", "@orun/browser"]
env:
  - PLAYWRIGHT_BROWSER_PATH
categories: ["marketing", "research", "social-media", "intelligence", "competitor-analysis"]
---

# Social Intelligence Skill

## When to Use

Use this skill when you need to analyze public social media profiles to extract:
- Content strategy patterns (pillars, topics, formats)
- Voice and tone analysis (vocabulary, style, personality)
- Hook and CTA patterns that drive engagement
- Posting cadence and timing optimization
- Visual style and branding consistency
- Audience engagement signals

**Ideal for:** Competitor analysis, influencer research, trend spotting, content benchmarking, brand voice calibration.

## Ethical Guardrails (MANDATORY)

1. **Public profiles only** — Never attempt to access private/locked accounts
2. **Rate limiting** — Minimum 30 seconds between requests per platform
3. **24-hour cache** — Results cached locally; do not re-scrape within 24h
4. **Explicit opt-in** — User must explicitly request: "Analyze @username for [purpose]"
5. **LGPD/GDPR compliant** — No PII stored beyond what's needed for analysis
6. **No interaction** — Read-only; never like, comment, follow, or DM
7. **Respect robots.txt** — Check and honor platform crawling policies

## Instructions

### Input Format

The agent receives a structured request:

```json
{
  "platform": "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok",
  "username": "target_username",
  "context": "Why this analysis is needed (e.g., 'benchmark for carousel strategy')",
  "focusAreas": ["voice", "hooks", "ctas", "cadence", "visual", "pillars"],
  "maxPosts": 20
}
```

### Execution Flow

1. **Validate request** — Check platform support, username format, cache
2. **Check cache** — Return cached result if < 24h old
3. **Launch browser** — Use Playwright with stealth config
4. **Navigate to profile** — Handle platform-specific selectors
5. **Scroll and collect** — Extract N recent posts (respecting maxPosts)
6. **Parse content** — Structure: text, media type, engagement metrics, hashtags, mentions
7. **Analyze patterns** — Run analysis modules (voice, hooks, ctas, cadence, visual, pillars)
8. **Generate report** — Structured JSON + Markdown summary
9. **Cache result** — Save to local cache with timestamp
10. **Return output** — Formatted for agent consumption

### Output Format

```json
{
  "profile": {
    "platform": "instagram",
    "username": "target_username",
    "displayName": "Target Name",
    "bio": "Profile bio text",
    "followers": 125000,
    "following": 342,
    "postsCount": 892,
    "verified": true
  },
  "analysis": {
    "voice": {
      "tone": "professional yet approachable",
      "vocabulary": ["transform", "scale", "strategy", "insights"],
      "sentenceStructure": "short punchy sentences, active voice",
      "personalityTraits": ["authoritative", "encouraging", "data-driven"],
      "language": "pt-BR"
    },
    "contentPillars": [
      { "theme": "educational tips", "frequency": 0.35, "examples": ["post1", "post2"] },
      { "theme": "case studies", "frequency": 0.25, "examples": ["post3"] },
      { "theme": "personal insights", "frequency": 0.20, "examples": ["post4"] },
      { "theme": "industry news", "frequency": 0.15, "examples": ["post5"] },
      { "theme": "engagement bait", "frequency": 0.05, "examples": ["post6"] }
    ],
    "hookPatterns": [
      { "type": "question", "frequency": 0.40, "examples": ["Já pensou em...?", "E se...?"] },
      { "type": "bold claim", "frequency": 0.30, "examples": ["A maioria erra ao...", "Pare de fazer..."] },
      { "type": "story opening", "frequency": 0.20, "examples": ["Há 2 anos eu...", "Quando comecei..."] },
      { "type": "stat/number", "frequency": 0.10, "examples": ["87% das empresas...", "3x mais resultado..."] }
    ],
    "ctaStyles": [
      { "type": "comment prompt", "frequency": 0.45, "examples": ["Qual sua opinião?", "Concorda? Comenta!"] },
      { "type": "link in bio", "frequency": 0.30, "examples": ["Link na bio para...", "Acesse o artigo completo"] },
      { "type": "save/share", "frequency": 0.15, "examples": ["Salva para depois", "Compartilha com quem precisa"] },
      { "type": "dm", "frequency": 0.10, "examples": ["Me chama no DM", "Respondo todos os DMs"] }
    ],
    "postingCadence": {
      "postsPerWeek": 4.2,
      "preferredDays": ["Tuesday", "Thursday", "Sunday"],
      "preferredHours": ["09:00", "12:00", "18:00"],
      "consistencyScore": 0.87
    },
    "visualStyle": {
      "colorPalette": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
      "fontStyle": "clean sans-serif, bold headlines",
      "layoutPatterns": ["carousel 7-9 slides", "single image + caption", "reels 15-30s"],
      "brandingConsistency": 0.92
    },
    "engagementSignals": {
      "avgLikes": 3200,
      "avgComments": 180,
      "avgShares": 95,
      "avgSaves": 240,
      "engagementRate": 0.038,
      "topPerformingFormat": "carousel",
      "topPerformingPillar": "educational tips"
    }
  },
  "metadata": {
    "analyzedAt": "2026-08-29T10:30:00Z",
    "postsAnalyzed": 20,
    "cacheExpiresAt": "2026-08-30T10:30:00Z",
    "platformSelectorsUsed": "instagram_v2026_08"
  }
}
```

### Handoff Targets

After analysis, hand off to:
- **Content Studio Agent** — Receives `voice`, `hookPatterns`, `ctaStyles`, `visualStyle` for content creation
- **SEO Agent** — Receives `contentPillars`, `hookPatterns` for keyword strategy
- **Growth Ops** — Receives `engagementSignals`, `postingCadence` for optimization

### Platform-Specific Notes

#### Instagram
- Scrapes: Feed posts, Reels (thumbnails), Stories highlights (if public)
- Selectors: `[data-testid="user-feed"]`, `article[role="presentation"]`
- Metrics: Likes, comments, saves (via aria-labels)

#### LinkedIn
- Scrapes: Posts, Articles, Document posts
- Selectors: `.feed-shared-update-v2`, `.update-components-text`
- Metrics: Reactions, comments, reposts

#### Twitter/X
- Scrapes: Tweets, Threads, Replies (top-level)
- Selectors: `[data-testid="tweet"]`, `[data-testid="tweetText"]`
- Metrics: Likes, retweets, replies, bookmarks

#### YouTube
- Scrapes: Video titles, descriptions, thumbnails, Shorts
- Selectors: `#video-title`, `#description-text`, `ytd-rich-grid-media`
- Metrics: Views, likes, comments (public counts)

#### TikTok
- Scrapes: Video captions, hashtags, sounds
- Selectors: `[data-e2e="user-post-item"]`, `.video-caption`
- Metrics: Likes, comments, shares, saves

## Best Practices

- Start with 10-15 posts for quick analysis; 20+ for deep benchmarking
- Focus on last 30 days for current strategy; 90 days for trend analysis
- Cross-reference multiple platforms for same entity when possible
- Tag findings with confidence scores (high/medium/low)
- Always include `metadata.postsAnalyzed` so downstream agents know sample size

## Available Operations

- **Analyze Profile** — Full intelligence report on a single profile
- **Compare Profiles** — Side-by-side analysis of 2-5 profiles
- **Track Changes** — Re-analyze after 30 days to detect strategy shifts
- **Extract Templates** — Convert top-performing posts into reusable templates
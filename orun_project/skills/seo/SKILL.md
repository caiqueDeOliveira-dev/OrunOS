---
name: seo
description: >
  SEO Agent — Pesquisa keywords, audita SEO técnico, otimiza on-page, monitora rankings, identifica content gaps. Integra com Ahrefs/Semrush via MCP, Google Search Console, e ferramentas nativas.
description_pt_BR: >
  Agente SEO — Pesquisa keywords, audita SEO técnico, otimiza on-page, monitora rankings, identifica content gaps. Integra com Ahrefs/Semrush via MCP, Google Search Console, e ferramentas nativas.
description_es: >
  Agente SEO — Investiga palabras clave, audita SEO técnico, optimiza on-page, monitorea rankings, identifica gaps de contenido. Integra con Ahrefs/Semrush via MCP, Google Search Console y herramientas nativas.
type: hybrid
version: "1.0.0"
script:
  path: scripts/seo-audit.ts
  runtime: node
  dependencies: [zod, playwright, cheerio]
mcp:
  server_name: seo-tools
  command: npx
  args: ["-y", "@orun/seo-mcp@latest"]
  transport: stdio
env:
  - AHREFS_API_KEY
  - SEMRUSH_API_KEY
  - GOOGLE_SEARCH_CONSOLE_CREDENTIALS
categories: [marketing, seo, growth, technical-seo, content-strategy]
---

# SEO Skill

## When to Use

Use this skill for:
- Keyword research & clustering (topic clusters, content gaps)
- Technical SEO audits (crawl, indexability, Core Web Vitals)
- On-page optimization (titles, headings, schema, internal linking)
- Rank tracking & SERP feature monitoring
- Competitor SEO analysis (keyword overlap, backlink gaps)
- Content brief generation for Content Studio

## Capabilities

### 1. Keyword Research

```typescript
interface KeywordResearchInput {
  seedKeywords: string[];
  targetLocale: "pt-BR" | "en-US" | "es-ES";
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  maxKeywords: number;
}

interface KeywordCluster {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchVolume: number;
  difficulty: number;
  intent: string;
  contentType: "blog" | "landing" | "video" | "tool";
}
```

**Operations:**
- `discover_keywords(seed, locale)` → expanded keyword list with metrics
- `cluster_keywords(keywords[])` → topic clusters with primary/secondary
- `analyze_competitor_gaps(domain[])` → keywords competitors rank for, we don't
- `get_search_intent(keyword)` → intent classification + SERP analysis

### 2. Technical SEO Audit

```typescript
interface TechnicalAuditInput {
  url: string;
  depth: "shallow" | "deep";
  checkCoreWebVitals: boolean;
}
```

**Checks:**
- Crawlability: robots.txt, sitemap.xml, canonical tags, noindex
- Indexability: coverage report, duplicate content, parameter handling
- Performance: LCP, FID, CLS, TTFB (via PageSpeed/Chrome UX Report)
- Mobile: viewport, tap targets, font sizes, interstitials
- Structured Data: Schema.org validation, rich results eligibility
- Security: HTTPS, HSTS, CSP, mixed content
- International: hreflang, x-default, locale detection

### 3. On-Page Optimization

```typescript
interface OnPageInput {
  url: string;
  targetKeyword: string;
  contentType: "blog" | "landing" | "product" | "category";
}
```

**Optimizations:**
- Title tag: length, keyword placement, CTR optimization
- Meta description: length, keyword, call-to-action
- Heading structure: H1-H6 hierarchy, keyword distribution
- Content: word count, readability, keyword density, LSI terms
- Images: alt text, file names, WebP/AVIF, lazy loading
- Internal links: anchor text diversity, link depth, orphan pages
- Schema markup: Article, Product, FAQ, HowTo, VideoObject

### 4. Rank Tracking

```typescript
interface RankTrackingInput {
  keywords: string[];
  domain: string;
  competitors: string[];
  location: "BR" | "US" | "Global";
  device: "desktop" | "mobile";
}
```

**Metrics:**
- Position (current, previous, best, worst)
- Search volume trends
- SERP features: featured snippet, PAA, video carousel, local pack
- Share of Voice (SoV) vs competitors
- Traffic estimate (position × CTR × volume)

### 5. Content Brief Generation

```typescript
interface ContentBriefOutput {
  targetKeyword: string;
  cluster: string;
  searchIntent: string;
  suggestedTitle: string;
  outline: Heading[];
  wordCountRange: [number, number];
  internalLinkTargets: string[];
  schemaType: string;
  competitorUrls: string[];
  faqQuestions: string[];
  lsiKeywords: string[];
}
```

## Script: seo-audit.ts

```typescript
// Core audit functions using Playwright + Cheerio
export async function crawlSite(url: string, maxPages: number): Promise<CrawlResult>
export async function auditTechnical(url: string): Promise<TechnicalReport>
export async function auditOnPage(url: string, keyword: string): Promise<OnPageReport>
export async function checkCoreWebVitals(url: string): Promise<CWVReport>
export async function validateSchema(url: string): Promise<SchemaReport>
```

## MCP Tools (seo-tools)

| Tool | Description |
|------|-------------|
| `ahrefs_keywords_explorer` | Keyword metrics, difficulty, traffic potential |
| `ahrefs_site_explorer` | Backlink profile, organic keywords, top pages |
| `semrush_keyword_magic` | Keyword variations, questions, related |
| `semrush_position_tracking` | Daily rank updates, SERP features |
| `gsc_search_analytics` | Impressions, clicks, CTR, position by query/page |
| `gsc_url_inspection` | Index status, crawl errors, mobile usability |
| `pagespeed_insights` | Core Web Vitals, opportunities, diagnostics |

## Workflow Integration

### Input Sources
- **Head Growth Ops**: Business objectives, target segments, budget
- **Head Brand Strategy**: Pillar topics, brand keywords, voice constraints
- **Social Intel**: Trending topics, competitor content themes
- **Content Studio**: Existing content inventory, performance data

### Output Consumers
- **Content Studio**: Receives content briefs with outline, keywords, schema
- **Head Growth Ops**: Receives rank reports, traffic forecasts, ROI projections
- **VP Marketing**: Receives SoV reports, competitive landscape, budget allocation

## Quality Gates

### Keyword Selection
- [ ] Search volume ≥ 100/mo (BR) or ≥ 1000/mo (Global)
- [ ] Difficulty ≤ 60 (new domain) / ≤ 75 (established)
- [ ] Intent match: content type aligns with search intent
- [ ] Cannibalization check: no existing page targets same primary keyword

### Technical Audit
- [ ] Zero critical crawl errors
- [ ] LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Zero valid pages with noindex
- [ ] Sitemap: all canonical URLs included, < 50k URLs
- [ ] Schema: zero validation errors on key pages

### On-Page
- [ ] Title: 50-60 chars, primary keyword in first 3 words
- [ ] Meta description: 150-160 chars, includes keyword + CTA
- [ ] H1: Exactly one, matches title intent, includes keyword
- [ ] H2-H6: Logical hierarchy, secondary keywords distributed
- [ ] Internal links: ≥3 to relevant pages, diverse anchors
- [ ] Images: 100% have descriptive alt text

## Output Format (Content Brief)

```json
{
  "briefId": "uuid",
  "targetKeyword": "orun os download",
  "cluster": "orun ecosystem",
  "searchIntent": "transactional",
  "suggestedTitle": "Download Orun OS — Personal AI Desktop Assistant",
  "outline": [
    { "level": 2, "text": "O que é o Orun OS", "keywords": ["orun os", "sistema operacional IA"] },
    { "level": 2, "text": "Requisitos do sistema", "keywords": ["windows", "mac", "linux", "electron"] },
    { "level": 2, "text": "Download e instalação", "keywords": ["download", "instalador", "setup"] },
    { "level": 2, "text": "Primeiros passos", "keywords": ["configuração", "agentes", "supabase"] }
  ],
  "wordCountRange": [1800, 2500],
  "internalLinkTargets": ["/agents", "/architecture", "/privacy"],
  "schemaType": "SoftwareApplication",
  "competitorUrls": ["https://competitor.com/download", "..."],
  "faqQuestions": ["Orun OS é gratuito?", "Funciona offline?", "Como sincronizo?"],
  "lsiKeywords": ["assistente IA desktop", "multi-agente", "privacidade local"],
  "metaDescription": "Baixe o Orun OS grátis — seu sistema operacional pessoal com agentes de IA especialistas. Windows, Mac, Linux. 100% local-first."
}
```
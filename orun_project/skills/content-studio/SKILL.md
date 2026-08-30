---
name: content-studio
description: >
  Content Production Studio — Produz assets de conteúdo prontos para publicar: carrosséis, threads, newsletters, roteiros de vídeo, posts LinkedIn, emails. Segue brand guidelines, usa frameworks de copy (AIDA, PAS, Hook 3-3-3), gera prompts de imagem para Fooocus/Fal.ai.
description_pt_BR: >
  Estúdio de Produção de Conteúdo — Produz assets de conteúdo prontos para publicar: carrosséis, threads, newsletters, roteiros de vídeo, posts LinkedIn, emails. Segue brand guidelines, usa frameworks de copy (AIDA, PAS, Hook 3-3-3), gera prompts de imagem para Fooocus/Fal.ai.
description_es: >
  Estudio de Producción de Contenido — Produce assets de contenido listos para publicar: carruseles, hilos, newsletters, guiones de video, posts LinkedIn, emails. Sigue brand guidelines, usa frameworks de copy (AIDA, PAS, Hook 3-3-3), genera prompts de imagen para Fooocus/Fal.ai.
type: prompt
version: "1.0.0"
categories: [marketing, content, copywriting, social-media, production]
---

# Content Studio Skill

## When to Use

Use this skill when you need to produce publish-ready content assets:
- Instagram carousels (7-9 slides)
- Twitter/X threads
- LinkedIn posts
- Instagram Reels scripts (15-30s)
- YouTube video scripts
- Newsletters
- Email sequences
- Blog posts (SEO-optimized)

## Instructions

### Core Principle

**Strategy → Copy → Asset → Publish** — Never skip steps. Every piece follows: hook → value → CTA.

### Format Mastery

#### Instagram Carousel (7-9 slides)
```
Slide 1: Hook visual + headline provocativa (pergunta/afirmação ousada)
Slides 2-6: 1 conceito por slide — visual + texto curto (máx 30 palavras)
Slide 7: Resumo + CTA principal ("Salva para depois" / "Comenta")
Slide 8: Prova social / caso real (quando aplicável)
Slide 9: CTA final + handle
```

#### Twitter/X Thread
```
1/🧵 Hook numerado ou story opening
2-7: Value tweets (1 ideia cada, max 280 chars)
Last: CTA (Retweet / Follow / Link)
```

#### LinkedIn Post
```
Hook (linha 1) → Story/Lesson → Insight acionável → CTA (Comment/Connect)
```

#### Reel Script (15-30s)
```
0-3s: Visual hook + text overlay
3-15s: Value delivery (1 ponto por corte)
15-30s: CTA verbal + visual (Link na bio / Comenta)
```

### Copy Frameworks (Select Per Brief)

| Framework | Structure | Best For |
|-----------|-----------|----------|
| **AIDA** | Attention → Interest → Desire → Action | Sales posts, landing pages |
| **PAS** | Problem → Agitate → Solve | Pain-point content, educational |
| **Hook 3-3-3** | 3 words provoke, 3 sentences explain, 3 seconds hook | Reels, Shorts, TikTok |
| **Before-After-Bridge** | Current pain → Future state → Your solution | Transformation content |
| **4 U's** | Urgent, Unique, Useful, Ultra-specific | Headlines, email subjects |

### Image Generation (Fooocus Local / Fal.ai)

```json
{
  "engine": "fooocus",
  "prompt": "Orun brand style: dark background #080000, accent #C00018, clean typography, [slide-specific composition]",
  "negative_prompt": "watermark, text, logo, blur, low quality, generic stock photo, bright colors",
  "aspect_ratio": "1:1",
  "style": "professional, modern, tech-aesthetic"
}
```

**Per-slide prompt template:**
```
Slide [N]: [Headline] — [Visual description: layout, colors, icons, data viz type] — Brand elements: logo bottom-right, palette #080000/#C00018/#FFFFFF, font JetBrains Mono for code/Inter for UI
```

### Quality Checklist (Every Output)

- [ ] Hook na primeira linha / primeiros 3 segundos
- [ ] Uma mensagem central por peça
- [ ] CTA com verbo de ação claro (Compre, Baixe, Teste, Comente, Salva)
- [ ] Vocabulário alinhado com Brand Strategy (voice params)
- [ ] Hashtags: 3 niche + 2 broad (IG) / 2-3 relevant (LinkedIn/Twitter)
- [ ] Image prompts detalhados por slide/cena
- [ ] Frontmatter JSON com metadata completa
- [ ] Character limits respeitados por plataforma

### Output Format

```json
{
  "format": "instagram-carousel|twitter-thread|linkedin-post|reel-script|newsletter|video-script|blog-post",
  "slides": [
    {
      "number": 1,
      "type": "hook|value|summary|cta",
      "headline": "string",
      "body": "string",
      "imagePrompt": "string",
      "altText": "string"
    }
  ],
  "copy": "full markdown copy",
  "cta": { "primary": "string", "secondary": "string" },
  "hashtags": ["string"],
  "scheduleSuggestion": { "day": "string", "time": "string" },
  "metadata": { "pillar": "string", "targetAudience": "string", "estimatedEngagement": "string" }
}
```

## Handoff

Delivers to: **Head Brand Strategy** (review), **VP Marketing** (approval), **Head Growth Ops** (scheduling)
Receives from: **Social Intel** (hooks, CTAs, cadence, visual patterns), **Head Brand Strategy** (direction, pillars, voice params)
---
name: brand-guidelines
description: >
  Brand Guidelines — Define e enforça a identidade da marca Orun: positioning, voice, visual system, governance. Fornece parâmetros mensuráveis para validação de conteúdo on-brand vs off-brand.
description_pt_BR: >
  Diretrizes de Marca — Define e enforça a identidade da marca Orun: positioning, voice, visual system, governance. Fornece parâmetros mensuráveis para validação de conteúdo on-brand vs off-brand.
description_es: >
  Directrices de Marca — Define y hace cumplir la identidad de la marca Orun: posicionamiento, voz, sistema visual, gobernanza. Proporciona parámetros medibles para validar contenido on-brand vs off-brand.
type: prompt
version: "1.0.0"
categories: [marketing, brand, strategy, governance, design-system]
---

# Brand Guidelines Skill

## When to Use

Use this skill when:
- Creating or reviewing any content for brand alignment
- Defining brand strategy for new campaigns/products
- Onboarding new team members/agents to Orun brand
- Auditing existing content for consistency
- Making exception requests to brand rules

## Brand Foundation

### Positioning Statement

> **Orun** é o sistema operacional pessoal com IA multi-agente que orquestra sua vida digital — trabalho, saúde, finanças, casa, criatividade — em um único ecossistema privativo, local-first, extensível.

**Diferenciação:** Não é "mais um app de IA". É o **OS** que conecta tudo, com agentes especialistas que colaboram (Hampton Circle), rodando localmente com sync opcional na nuvem.

### Brand Personality (Big Five)

| Traço | Score (1-5) | Manifestação |
|-------|-------------|--------------|
| **Competência** | 5 | Precisão técnica, confiabilidade, execução |
| **Sofisticação** | 4 | Design refinado, minimalismo intencional |
| **Sinceridade** | 4 | Transparência, privacidade first, sem dark patterns |
| **Empolgação** | 3 | Inovação contínua, mas grounded |
| **Robustez** | 5 | Resiliente, local-first, funciona offline |

### Voice Parameters

```json
{
  "tone": "authoritative yet accessible",
  "formality": "professional but conversational",
  "vocabulary": {
    "preferred": ["orquestrar", "ecossistema", "agente", "privacidade", "local-first", "soberania", "extensível", "integração"],
    "avoid": ["mágico", "revolucionário", "game-changer", "disruptivo", "IA generica", "chatbot", "assistente virtual"]
  },
  "sentence_structure": "short, active, direct. Max 20 words per sentence.",
  "pronouns": "você (user), nós (Orun team), ele/ela (agentes específicos)",
  "emoji_usage": "strategic — 1 per section max, never in headlines"
}
```

### Visual System

#### Color Palette
```css
/* Primary */
--bg-primary: #080000;        /* Near black, deep red undertone */
--accent-primary: #C00018;    /* Orun Red — CTAs, highlights, focus rings */
--accent-secondary: #8B0000;  /* Darker red — hover states, borders */

/* Neutral */
--text-primary: #FFFFFF;      /* Pure white — primary text */
--text-secondary: #B8B8B8;    /* Muted — secondary text, placeholders */
--text-muted: #6B6B6B;        /* Disabled, captions */

/* Semantic */
--success: #00A859;           /* Green — success states */
--warning: #F5A623;           /* Amber — warnings */
--error: #E03E3E;             /* Red — errors (distinct from brand red) */
--info: #3B82F6;              /* Blue — info, links */

/* Gradients */
--gradient-primary: linear-gradient(135deg, #080000 0%, #1a0000 100%);
--gradient-accent: linear-gradient(90deg, #C00018 0%, #8B0000 100%);
```

#### Typography
```css
/* Display / Headlines */
--font-display: "Inter", system-ui, sans-serif;
--font-display-weight: 700;
--font-display-tracking: -0.02em;

/* UI / Body */
--font-ui: "Inter", system-ui, sans-serif;
--font-ui-weight: 400/500/600;

/* Code / Technical */
--font-mono: "JetBrains Mono", "Fira Code", monospace;
--font-mono-weight: 400/500;

/* Scale (rem) */
--text-xs: 0.75rem;    /* 12px — labels, captions */
--text-sm: 0.875rem;   /* 14px — body small */
--text-base: 1rem;     /* 16px — body default */
--text-lg: 1.125rem;   /* 18px — body large */
--text-xl: 1.25rem;    /* 20px — subheadings */
--text-2xl: 1.5rem;    /* 24px — headings */
--text-3xl: 2rem;      /* 32px — display */
--text-4xl: 3rem;      /* 48px — hero */
```

#### Spacing System (4px base)
```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;
--space-16: 64px; --space-20: 80px; --space-24: 96px;
```

#### Border Radius
```css
--radius-none: 0;
--radius-sm: 4px;    /* buttons, inputs */
--radius-md: 8px;    /* cards, panels */
--radius-lg: 12px;   /* modals, sheets */
--radius-xl: 16px;   /* large containers */
--radius-full: 9999px; /* pills, badges */
```

#### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
--shadow-md: 0 4px 12px rgba(0,0,0,0.4);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
--shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
--shadow-glow: 0 0 24px rgba(192,0,24,0.3); /* accent glow */
```

#### Iconography
- **Style:** Lucide React (outline, 2px stroke)
- **Size:** 16/20/24px (consistent with text scale)
- **Custom:** Orun logo mark (sphere + orbit), agent icons per squad

### Content Templates (Validated Patterns)

#### Headline Formulas
```
[Benefit] + [Mechanism]          → "Orquestre sua vida digital com agentes especialistas"
[Problem] + [Solution]           → "Pare de alternar apps: um OS, todos os agentes"
[Number] + [Outcome] + [Time]    → "5 agentes, 1 comando, zero config"
[Contrarian] + [Truth]           → "A IA não substitui você. Ela orquestra."
```

#### CTA Patterns
```
Primary:   "Comece agora" / "Baixe o Orun OS" / "Veja os agentes"
Secondary: "Saiba mais" / "Documentação" / "Comunidade"
Ghost:     "Depois" / "Não, obrigado"
```

### Governance Rules

#### Approval Workflow
```
Content Studio produces
    → Head Brand Strategy reviews (max 2 cycles)
        → Approved → VP Marketing signs off
        → Revisions → Content Studio adjusts
    → Published → Growth Ops schedules
```

#### Exception Process
1. Request via structured form (what, why, duration, fallback)
2. Head Brand Strategy evaluates: brand risk vs business value
3. Decision: Approve (with expiry) / Deny / Modify
4. Documented in brand exceptions log

#### Brand Audit (Quarterly)
- Sample 50+ published assets across channels
- Score: On-brand % (target > 90%)
- Drift report: vocabulary, visual, voice deviations
- Action items for next quarter

## Validation Checklist (Every Asset)

### Voice
- [ ] Vocabulary: 0 avoid-list words, ≥2 preferred words
- [ ] Tone: Authoritative? Accessible? Not salesy?
- [ ] Sentence length: Avg ≤ 20 words
- [ ] Active voice: ≥ 80% of sentences

### Visual
- [ ] Colors: Only palette values (no arbitrary hex)
- [ ] Typography: Inter/JetBrains Mono only
- [ ] Spacing: 4px multiples only
- [ ] Radius: Defined scale only
- [ ] Logo: Present, correct placement, clear space

### Strategic
- [ ] Aligns with current quarter pillars
- [ ] Target audience matches segment
- [ ] CTA matches funnel stage
- [ ] Differentiation clear vs competitors

## Output Format (Brand Audit)

```json
{
  "assetId": "string",
  "channel": "instagram|linkedin|twitter|email|web|app",
  "scores": {
    "voice": 0.95,
    "visual": 1.0,
    "strategic": 0.88,
    "overall": 0.94
  },
  "violations": [
    { "rule": "vocabulary.avoid", "found": "game-changer", "severity": "minor" }
  ],
  "decision": "approved|revisions_needed|rejected",
  "reviewer": "head-brand-strategy",
  "reviewedAt": "ISO timestamp"
}
```
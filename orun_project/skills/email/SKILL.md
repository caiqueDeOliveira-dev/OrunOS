---
name: email
description: >
  Email/Lifecycle Skill — Gerencia jornadas de email via Resend: onboarding, nurture, reativação, newsletters, transacionais. Suporta templates, segmentação, A/B testing, agendamento, tracking de entregabilidade.
description_pt_BR: >
  Skill de Email/Lifecycle — Gerencia jornadas de email via Resend: onboarding, nurture, reativação, newsletters, transacionais. Suporta templates, segmentação, A/B testing, agendamento, tracking de entregabilidade.
description_es: >
  Skill de Email/Lifecycle — Gestiona viajes de email via Resend: onboarding, nurture, reactivación, newsletters, transaccionales. Soporta plantillas, segmentación, A/B testing, programación, tracking de entregabilidad.
type: mcp
version: "1.0.0"
mcp:
  server_name: resend
  command: npx
  args: ["-y", "resend-mcp@latest"]
  transport: stdio
env:
  - RESEND_API_KEY
categories: [marketing, email, lifecycle, automation, communication, resend]
---

# Email / Lifecycle Skill

## When to Use

Use this skill for all email operations:
- **Transactional**: Welcome, password reset, receipts, notifications
- **Lifecycle**: Onboarding sequences, feature adoption, re-engagement
- **Marketing**: Newsletters, promotions, product launches
- **Automated**: Behavior-triggered (cart abandon, milestone, churn risk)

## Resend MCP Operations

### Send Single Email
```json
{
  "tool": "send_email",
  "params": {
    "from": "Orun <onboarding@orun.io>",
    "to": ["user@example.com"],
    "subject": "Bem-vindo ao Orun OS 🎯",
    "html": "<html>...</html>",
    "text": "Versão texto...",
    "tags": [{ "name": "category", "value": "onboarding" }],
    "reply_to": "support@orun.io"
  }
}
```

### Batch Send
```json
{
  "tool": "batch_send_emails",
  "params": {
    "emails": [
      { "from": "...", "to": ["a@b.com"], "subject": "...", "html": "..." },
      { "from": "...", "to": ["c@d.com"], "subject": "...", "html": "..." }
    ]
  }
}
```

### Scheduled Send
```json
{
  "tool": "send_email",
  "params": {
    "...": "...",
    "scheduled_at": "2026-09-01T09:00:00Z"
  }
}
```

### Attachments
```json
{
  "attachments": [
    { "filename": "guia.pdf", "path": "./assets/guia.pdf" },
    { "filename": "logo.png", "content": "base64...", "contentType": "image/png" }
  ]
}
```

## Journey Templates

### 1. Onboarding Sequence (7 emails, 14 days)

| Day | Trigger | Subject | Goal | CTA |
|-----|---------|---------|------|-----|
| 0 | Signup | "Bem-vindo ao Orun OS 🎯" | Confirm email, set expectations | "Confirmar email" |
| 1 | Confirmed | "Seu OS pessoal está pronto" | Explain Hampton Circle | "Conhecer agentes" |
| 3 | Active | "3 agentes para começar hoje" | Drive first agent interaction | "Testar Marketing" |
| 7 | Active | "Como o Hampton orquestra" | Deep dive architecture | "Ver arquitetura" |
| 10 | Active | "Dica: sincronize com mobile" | Cross-platform adoption | "Baixar mobile" |
| 14 | Active | "Sua primeira semana no Orun" | Celebrate, ask for feedback | "Dar feedback" |
| 30 | Active | "Um mês depois — o que mudou?" | Retention, upsell signals | "Ver relatório" |

### 2. Feature Adoption (per feature)

| Trigger | Email | Goal |
|---------|-------|------|
| Feature released | "Novo: [Feature] chegou" | Awareness |
| User hasn't tried (7d) | "Você viu o [Feature]?" | Activation |
| User tried once | "Dica avançada: [Feature]" | Depth |
| User power user | "Compartilhe seu workflow" | Advocacy |

### 3. Re-engagement (Churn Prevention)

| Segment | Trigger | Subject | Offer |
|---------|---------|---------|-------|
| Inactive 14d | Last login > 14d | "Sentimos sua falta" | Quick win tip |
| Inactive 30d | Last login > 30d | "O Orun evoluiu" | What's new |
| Inactive 60d | Last login > 60d | "Última chance" | 1:1 demo offer |
| Cancelled | Subscription ended | "O que podíamos melhorar?" | Exit survey |

### 4. Newsletter (Weekly)

**Structure:**
- **Hook**: One-line insight/stat (Orun data or industry)
- **Featured**: One deep-dive (agent spotlight, workflow, case study)
- **Quick Tips**: 3 bullet points (shortcuts, hidden features)
- **Community**: User workflow, template, or question
- **CTA**: "Experimente hoje" → relevant feature page

## Segmentation Schema

```typescript
interface Segment {
  id: string;
  name: string;
  rules: SegmentRule[];
  size: number;
}

interface SegmentRule {
  field: "last_login" | "feature_used" | "plan" | "agent_interactions" | "custom_event";
  operator: "gt" | "lt" | "eq" | "contains" | "not_contains" | "between";
  value: string | number | string[];
  timeframe?: "7d" | "30d" | "90d" | "all";
}
```

**Default Segments:**
- `new_users` — signed up < 7d, no agent interaction
- `active_users` — login ≥ 3x/week, ≥ 2 agents used
- `power_users` — login daily, ≥ 5 agents, custom workflows
- `at_risk` — no login 14d, previously active
- `churned` — no login 60d, was active
- `enterprise` — plan = enterprise/team

## Template System

### Base Template (React Email / MJML)
```tsx
<Html>
  <Head>
    <Preview>{preheader}</Preview>
  </Head>
  <Body style={baseStyles}>
    <Container>
      <Header>
        <Logo src="logo.svg" width="120" />
      </Header>
      <Main>{children}</Main>
      <Footer>
        <SocialLinks />
        <UnsubscribeLink />
        <Address>Orun, São Paulo, BR</Address>
        <PreferencesLink />
      </Footer>
    </Container>
  </Body>
</Html>
```

### Email Components
| Component | Props | Use Case |
|-----------|-------|----------|
| `<Hero>` | headline, subhead, cta, image | Welcome, launch |
| `<FeatureCard>` | icon, title, description, cta | Feature highlight |
| `<TipBox>` | icon, title, tip | Quick tips |
| `<StatBar>` | label, value, trend | Metrics, progress |
| `<CTAButton>` | text, href, variant (primary/secondary/ghost) | All CTAs |
| `<Divider>` | — | Section breaks |

## A/B Testing Framework

```typescript
interface ABTest {
  id: string;
  name: string;
  element: "subject" | "preheader" | "cta_text" | "cta_color" | "send_time" | "from_name";
  variants: Variant[];
  trafficSplit: number; // 0.5 = 50/50
  metric: "open_rate" | "click_rate" | "reply_rate" | "conversion_rate";
  minSampleSize: number;
  maxDurationDays: number;
}
```

**Statistical Rigor:**
- Minimum detectable effect: 10% relative
- Significance: 95% confidence
- Power: 80%
- Sequential testing (peek at 50%, 75%, 100%)

## Deliverability Monitoring

### Health Checks (Daily)
```typescript
interface DeliverabilityHealth {
  domainReputation: "good" | "fair" | "poor";
  spamRate: number;        // target < 0.1%
  bounceRate: number;      // target < 2%
  complaintRate: number;   // target < 0.01%
  inboxPlacement: {
    gmail: number;
    outlook: number;
    yahoo: number;
    apple: number;
  };
}
```

### Alerts
- Spam rate > 0.1% → Immediate investigation
- Bounce rate > 5% → List hygiene required
- Domain reputation "poor" → Pause sends, warmup

## Setup Checklist

- [ ] Domain verified in Resend (DKIM, SPF, DMARC)
- [ ] Subdomain for transactional: `txn.orun.io`
- [ ] Subdomain for marketing: `mkt.orun.io`
- [ ] Suppression list synced (bounces, complaints, unsubscribes)
- [ ] Webhook endpoints: `delivered`, `bounced`, `complained`, `opened`, `clicked`
- [ ] Test emails to: Gmail, Outlook, Yahoo, Apple Mail, Proton
- [ ] Dark mode rendering verified
- [ ] Accessibility: alt text, contrast, semantic HTML

## Output Format (Journey Execution)

```json
{
  "journeyId": "onboarding-v2",
  "contactId": "uuid",
  "step": 3,
  "emailId": "resend_abc123",
  "sentAt": "2026-08-29T09:00:00Z",
  "status": "sent",
  "tracking": {
    "opens": 0,
    "clicks": 0,
    "replies": 0
  },
  "nextStep": {
    "step": 4,
    "scheduledFor": "2026-09-01T09:00:00Z",
    "templateId": "onboarding-day7"
  }
}
```
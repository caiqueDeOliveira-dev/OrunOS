---
name: billing
description: >
  Billing & Subscription — Gerencia lifecycle de assinaturas Stripe: planos, trials, upgrades/downgrades, webhooks, invoicing, licenças offline, proration, dunning. Integra com @orun/identity para multi-tenancy.
description_pt_BR: >
  Billing & Assinaturas — Gerencia lifecycle de assinaturas Stripe: planos, trials, upgrades/downgrades, webhooks, invoicing, licenças offline, proration, dunning. Integra com @orun/identity para multi-tenancy.
description_es: >
  Billing y Suscripciones — Gestiona lifecycle de suscripciones Stripe: planes, trials, upgrades/downgrades, webhooks, facturación, licencias offline, prorrateo, dunning. Integra con @orun/identity para multi-tenancy.
type: hybrid
version: "1.0.0"
script:
  path: scripts/billing.ts
  runtime: node
  dependencies: [stripe, zod, @orun/identity]
mcp:
  server_name: stripe
  command: npx
  args: ["-y", "stripe-mcp@latest"]
  transport: stdio
env:
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - STRIPE_PRICE_IDS
categories: [finance, billing, subscription, stripe, saas, multi-tenant]
---

# Billing & Subscription Skill

## When to Use

Use this skill for all billing operations:
- Subscription management (create, update, cancel, pause, resume)
- Plan/price management (tiers, trials, coupons, promotions)
- Invoice generation & delivery
- Payment method management
- Dunning & failed payment recovery
- Offline license validation (desktop apps)
- Usage-based billing (tokens, API calls, seats)
- Revenue recognition & reporting

## Stripe Architecture (Orun)

### Product/Price Structure

```typescript
// Products = Logical offerings
// Prices = Specific billing configurations

const ORUN_PRODUCTS = {
  orun_os_personal: {
    name: "Orun OS Personal",
    description: "Desktop app + mobile sync + Hampton Circle (personal)",
    prices: [
      { id: "price_monthly", unit_amount: 2900, currency: "brl", recurring: "month" },
      { id: "price_yearly", unit_amount: 29000, currency: "brl", recurring: "year", discount: "17%" },
      { id: "price_lifetime", unit_amount: 49900, currency: "brl", type: "one_time" },
    ],
  },
  orun_os_pro: {
    name: "Orun OS Pro",
    description: "Personal + advanced agents + priority support + API access",
    prices: [
      { id: "price_monthly", unit_amount: 7900, currency: "brl", recurring: "month" },
      { id: "price_yearly", unit_amount: 79000, currency: "brl", recurring: "year", discount: "17%" },
    ],
  },
  orun_os_team: {
    name: "Orun OS Team",
    description: "Pro + team workspace + admin console + SSO + audit logs",
    prices: [
      { id: "price_per_seat_monthly", unit_amount: 4900, currency: "brl", recurring: "month", transform_quantity: true },
      { id: "price_per_seat_yearly", unit_amount: 49000, currency: "brl", recurring: "year", transform_quantity: true },
    ],
  },
  orun_beauty: {
    name: "Orun Beauty",
    description: "SaaS multi-tenant para salões de beleza",
    prices: [
      { id: "price_salon_monthly", unit_amount: 14900, currency: "brl", recurring: "month" },
      { id: "price_salon_yearly", unit_amount: 149000, currency: "brl", recurring: "year", discount: "17%" },
    ],
  },
} as const;
```

### Entitlements Mapping

| Feature | Personal | Pro | Team | Beauty |
|---------|----------|-----|------|--------|
| Desktop App | ✅ | ✅ | ✅ | ❌ |
| Mobile App | ✅ | ✅ | ✅ | ✅ |
| Hampton Circle (17 agents) | ✅ | ✅ | ✅ | ❌ |
| Custom Agents | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ | ✅ |
| Team Workspace | ❌ | ❌ | ✅ | ✅ |
| Admin Console | ❌ | ❌ | ✅ | ✅ |
| SSO (SAML/OIDC) | ❌ | ❌ | ✅ | ✅ |
| Audit Logs | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| Multi-location | ❌ | ❌ | ❌ | ✅ |

## Webhook Events (Handle All)

```typescript
const HANDLED_EVENTS = [
  // Subscription lifecycle
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.trial_will_end",
  "customer.subscription.paused",
  "customer.subscription.resumed",

  // Payment
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",

  // Customer
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "customer.source.updated",

  // Payment method
  "payment_method.attached",
  "payment_method.detached",

  // Checkout
  "checkout.session.completed",
  "checkout.session.expired",

  // Billing portal
  "billing_portal.session_created",

  // Disputes
  "charge.dispute.created",
  "charge.dispute.closed",
];
```

## Core Operations

### 1. Create Subscription (with Trial)

```typescript
async function createSubscription(params: {
  customerId: string;
  priceId: string;
  trialDays?: number;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}): Promise<Subscription> {
  // 1. Create or retrieve customer
  // 2. Attach payment method if provided
  // 3. Create subscription with trial
  // 4. Set up entitlements in @orun/identity
  // 5. Send welcome email (Email skill)
}
```

### 2. Upgrade/Downgrade (Proration)

```typescript
async function changePlan(params: {
  subscriptionId: string;
  newPriceId: string;
  prorationBehavior: "create_prorations" | "none" | "always_invoice";
  effectiveDate?: "immediate" | "next_cycle";
}): Promise<Subscription> {
  // Immediate: prorate, charge/credit now
  // Next cycle: schedule change, no proration
}
```

### 3. Cancel Subscription

```typescript
async function cancelSubscription(params: {
  subscriptionId: string;
  atPeriodEnd: boolean; // true = end of billing cycle
  cancellationReason?: string;
  feedback?: string;
}): Promise<Subscription> {
  // atPeriodEnd=true: subscription.status = "active", cancel_at_period_end = true
  // atPeriodEnd=false: immediate cancel, prorated refund per policy
}
```

### 4. Offline License (Desktop)

```typescript
interface OfflineLicense {
  licenseKey: string; // Signed JWT
  productId: string;
  features: string[];
  issuedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (0 = lifetime)
  deviceId: string; // Hardware fingerprint
  signature: string; // Ed25519
}

async function generateOfflineLicense(params: {
  customerId: string;
  productId: string;
  deviceId: string;
  durationDays: number; // 0 = lifetime
}): Promise<OfflineLicense> {
  // 1. Verify active subscription for product
  // 2. Generate license key with claims
  // 3. Sign with private key (stored in @orun/identity)
  // 4. Record in license ledger
  // 5. Return license for client activation
}

async function validateOfflineLicense(licenseKey: string, deviceId: string): Promise<{
  valid: boolean;
  features: string[];
  expiresAt: number;
  reason?: string;
}> {
  // 1. Verify signature
  // 2. Check expiration
  // 3. Check device binding
  // 4. Check revocation list
  // 5. Return entitlements
}
```

### 5. Dunning Management

```typescript
interface DunningConfig {
  maxRetries: 3;
  retrySchedule: [1, 3, 7]; // days after failure
  finalAction: "cancel" | "pause" | "downgrade";
  gracePeriodDays: 7;
}

async function handlePaymentFailure(invoice: Invoice): Promise<void> {
  const attempt = invoice.attempt_count;
  
  if (attempt <= 3) {
    // Schedule retry with exponential backoff
    await scheduleRetry(invoice, DunningConfig.retrySchedule[attempt - 1]);
    await sendDunningEmail(invoice, attempt); // Email skill
  } else {
    // Final action
    switch (DunningConfig.finalAction) {
      case "cancel":
        await cancelSubscription({ subscriptionId: invoice.subscription, atPeriodEnd: false });
        break;
      case "pause":
        await pauseSubscription(invoice.subscription);
        break;
      case "downgrade":
        await downgradeToFree(invoice.subscription);
        break;
    }
    await sendFinalNotice(invoice); // Email skill
  }
}
```

### 6. Usage-Based Billing (Tokens/API)

```typescript
async function recordUsage(params: {
  subscriptionItemId: string; // Metered price item
  quantity: number;
  timestamp?: number;
  action: "increment" | "set";
}): Promise<void> {
  // Report to Stripe Usage Records API
  // Aggregate locally, report hourly
}

const USAGE_METRICS = {
  ai_tokens: { unit: "1k_tokens", pricePerUnit: 0.002 }, // $0.002 per 1k tokens
  api_calls: { unit: "call", pricePerUnit: 0.0001 },
  seats: { unit: "seat", pricePerUnit: 49.00 }, // Team plan
  storage_gb: { unit: "GB", pricePerUnit: 0.50 },
};
```

## Stripe MCP Tools

| Tool | Description |
|------|-------------|
| `create_customer` | Create customer with metadata |
| `create_subscription` | Create subscription with trial, payment method |
| `update_subscription` | Change plan, quantity, pause/resume |
| `cancel_subscription` | Cancel immediately or at period end |
| `create_invoice` | Generate one-off invoice |
| `create_checkout_session` | Hosted payment page |
| `create_portal_session` | Customer self-service portal |
| `list_prices` | Get active prices for products |
| `retrieve_subscription` | Get current subscription state |
| `create_payment_method` | Save card/bank account |
| `attach_payment_method` | Attach to customer |
| `create_refund` | Full or partial refund |
| `create_credit_note` | Adjust invoice |

## Database Schema (Supabase + @orun/identity)

```sql
-- In @orun/identity schema
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id), -- Multi-tenant
  customer_id TEXT NOT NULL, -- Stripe customer ID
  subscription_id TEXT UNIQUE, -- Stripe subscription ID
  price_id TEXT NOT NULL, -- Stripe price ID
  product_id TEXT NOT NULL, -- Stripe product ID
  status TEXT CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_invoice_id TEXT UNIQUE,
  amount_due INTEGER NOT NULL, // cents
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER NOT NULL,
  currency TEXT DEFAULT 'brl',
  status TEXT CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT UNIQUE,
  type TEXT CHECK (type IN ('card', 'bank_account', 'boleto', 'pix')),
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  subscription_id UUID REFERENCES subscriptions(id),
  license_key TEXT UNIQUE NOT NULL, -- JWT
  product_id TEXT NOT NULL,
  device_id TEXT,
  features TEXT[] DEFAULT '{}',
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = lifetime
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_item_id TEXT NOT NULL, -- Stripe subscription item ID
  metric TEXT NOT NULL, -- ai_tokens, api_calls, seats, storage_gb
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT now(),
  stripe_usage_record_id TEXT
);
```

## Revenue Recognition

```typescript
interface RevenueReport {
  period: { start: Date; end: Date };
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  netNewMrr: number;
  customerCount: number;
  newCustomers: number;
  churnedCustomers: number;
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
  paybackPeriod: number; // months
}
```

## Testing Checklist

- [ ] Subscription create → active, trial starts, entitlements granted
- [ ] Trial ends → converts to paid, invoice generated, payment collected
- [ ] Upgrade immediate → proration invoice, new entitlements
- [ ] Upgrade next cycle → scheduled, no proration
- [ ] Downgrade → proration credit, entitlements reduced at period end
- [ ] Cancel at period end → access until end, then revoked
- [ ] Cancel immediate → prorated refund, access revoked
- [ ] Payment failure → retry schedule, emails sent, final action
- [ ] Offline license → generates, validates, expires, revokes
- [ ] Webhook idempotency → duplicate events handled gracefully
- [ ] Multi-tenant isolation → tenant A cannot see tenant B data

## Handoff

**To:** Head of Finance (revenue reports), VP Marketing (pricing experiments), VP Operations (dunning config)
**From:** Stripe (webhooks), @orun/identity (tenant context), Email skill (dunning emails)
**Consumers:** All @orun/* packages (entitlement checks), Desktop app (offline license)
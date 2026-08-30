---
name: contract-review
description: >
  Contract Review — Revisa contratos (fornecedores, clientes, parceiros, NDAs, termos de uso): extrai riscos, cláusulas-chave, compliance LGPD/GDPR, prazos, obrigações. Gera relatório estruturado para tomada de decisão.
description_pt_BR: >
  Revisão de Contratos — Revisa contratos (fornecedores, clientes, parceiros, NDAs, termos de uso): extrai riscos, cláusulas-chave, compliance LGPD/GDPR, prazos, obrigações. Gera relatório estruturado para tomada de decisão.
description_es: >
  Revisión de Contratos — Revisa contratos (proveedores, clientes, socios, NDAs, términos de uso): extrae riesgos, cláusulas clave, compliance LGPD/GDPR, plazos, obligaciones. Genera informe estructurado para toma de decisiones.
type: prompt
version: "1.0.0"
categories: [legal, compliance, contract-review, risk-management, lgpd, gdpr]
---

# Contract Review Skill

## When to Use

Use this skill for any contract review:
- **Supplier/Vendor** — SaaS agreements, hosting, APIs, professional services
- **Customer/Client** — MSA, SOW, order forms, enterprise agreements
- **Partner** — Referral, reseller, integration, co-marketing
- **NDA** — Mutual, one-way, project-specific
- **Terms of Service / Privacy Policy** — User-facing, platform terms
- **Employment/Contractor** — Offer letters, contractor agreements, IP assignment
- **Licensing** — Software, content, IP, white-label

## Review Framework

### 1. Contract Metadata Extraction

```typescript
interface ContractMetadata {
  contractId: string; // Internal reference
  type: "supplier" | "customer" | "partner" | "nda" | "terms" | "employment" | "licensing";
  counterparty: {
    name: string;
    legalEntity: string;
    jurisdiction: string;
    contact: { name: string; email: string; role: string };
  };
  ourEntity: string; // Orun entity signing
  effectiveDate: string; // ISO date
  expirationDate?: string; // ISO date or "perpetual"
  autoRenewal: boolean;
  renewalNoticeDays: number;
  governingLaw: string; // e.g., "Brazil, São Paulo"
  disputeResolution: "litigation" | "arbitration" | "mediation";
  language: "pt-BR" | "en" | "es";
  currency: "BRL" | "USD" | "EUR";
}
```

### 2. Key Clauses Analysis

#### Financial Terms
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Fees/Pricing** | Amount, frequency, currency, payment terms (Net 30/45/60) | Variable pricing, hidden fees, auto-increase > CPI |
| **Invoicing** | Schedule, method, required docs (PO, receipt) | Manual approval bottlenecks |
| **Late Payment** | Interest rate, grace period, suspension rights | >1.5%/month, immediate suspension |
| **Taxes** | Who bears (ISS, ICMS, VAT, withholding) | Missing tax clause = surprise liability |
| **Refunds/Credits** | Conditions, process, timeline | No refund clause, pro-rata only |

#### Obligations & Deliverables
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Scope of Work** | Detailed specs, acceptance criteria, out-of-scope | Vague scope, "best efforts" only |
| **Timeline/Milestones** | Dates, dependencies, delay remedies | No liquidated damages, no cap on delays |
| **SLA** | Uptime %, response/resolution times, credits | <99.9%, no credits, no monitoring |
| **Performance Standards** | Benchmarks, testing, acceptance | Subjective criteria, no objective measures |
| **Change Orders** | Process, pricing, approval authority | Unilateral changes allowed |

#### Intellectual Property
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **IP Ownership** | Who owns deliverables, background IP, improvements | Contractor owns, joint ownership unclear |
| **License Grant** | Scope (exclusive/non-exclusive), territory, duration, sublicensing | Overly broad, perpetual, irrevocable |
| **Open Source** | Usage policy, attribution, copyleft compliance | No policy, GPL risk |
| **Trade Secrets** | Definition, protection obligations, duration | Overbroad definition, perpetual |

#### Confidentiality & Data Protection
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Definition** | What's confidential, exclusions (public, independent) | Overbroad, no exclusions |
| **Obligations** | Standard of care, permitted disclosures, return/destroy | No destruction requirement |
| **Duration** | Term + survival period | Perpetual confidentiality |
| **LGPD/GDPR** | DPA attached, processor/controller roles, SCCs, breach notice | No DPA, no breach notification timeline |
| **Data Localization** | Storage/processing geography | Must stay in Brazil only |

#### Liability & Indemnification
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Limitation of Liability** | Cap (fees paid, 1x/2x annual, unlimited), carve-outs | Unlimited, no cap, carve-outs missing |
| **Indemnification** | Who indemnifies whom, for what, defense control | One-sided, no control of defense |
| **Exclusions** | Consequential, indirect, lost profits, punitive | Mutual exclusion standard |
| **Insurance** | Required policies, limits, additional insured | No insurance requirement |

#### Term & Termination
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Term** | Initial term, renewal terms, notice period | Auto-renewal without notice |
| **Termination for Cause** | Material breach definition, cure period (30d standard) | No cure period, immediate termination |
| **Termination for Convenience** | Notice period, fees payable | No convenience termination |
| **Effect of Termination** | Wind-down, data return, transition assistance | No transition, immediate cutoff |
| **Survival** | Which clauses survive (confidentiality, IP, liability) | Missing survival clause |

#### Compliance & Regulatory
| Clause | What to Extract | Risk Signals |
|--------|-----------------|--------------|
| **Anti-Corruption** | FCPA, Lei 12.846/2013 compliance | Missing in cross-border |
| **Export Controls** | EAR, ITAR, dual-use | Missing for tech/IP |
| **Sanctions** | OFAC, UN, EU lists | No screening obligation |
| **ESG/Sustainability** | Reporting, certifications | Greenwashing risk |

### 3. Risk Scoring Matrix

```typescript
interface ClauseRisk {
  clause: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "financial" | "legal" | "operational" | "reputational" | "compliance";
  finding: string;
  recommendation: string;
  negotiable: boolean;
  fallbackPosition?: string;
}

const RISK_THRESHOLDS = {
  critical: "Deal-blocker — must fix or walk away",
  high: "Significant exposure — negotiate hard",
  medium: "Manageable — negotiate if leverage",
  low: "Acceptable — monitor only",
};
```

### 4. LGPD/GDPR Specific Checklist

#### For Data Processing Agreements (DPA)
- [ ] Controller/Processor roles clearly defined
- [ ] Purpose limitation — specific, documented purposes
- [ ] Lawful basis identified (consent, legitimate interest, contract)
- [ ] Data categories & subjects enumerated
- [ ] Retention schedule defined
- [ ] Sub-processors listed + flow-down obligations
- [ ] International transfers: SCCs, BCRs, adequacy decision
- [ ] Data subject rights: access, rectification, erasure, portability, objection
- [ ] Breach notification: 72h (GDPR), "reasonable time" (LGPD)
- [ ] DPO contact info provided
- [ ] Audit rights: controller can audit processor
- [ ] Deletion/return of data on termination
- [ ] Security measures: encryption, access controls, pseudonymization

#### For Privacy Policies / Terms of Use
- [ ] Legal basis for each processing activity
- [ ] Cookie policy (consent, categories, withdrawal)
- [ ] Children's data (COPPA, LGPD Art. 14)
- [ ] Automated decision-making / profiling disclosure
- [ ] Cross-border transfer mechanisms
- [ ] Retention periods per data category
- [ ] Contact for data subject requests

### 5. Playbooks by Contract Type

#### SaaS Agreement (As Customer)
**Must-Haves:**
- [ ] SLA ≥ 99.9% with service credits
- [ ] Data ownership: we own our data
- [ ] Export/portability on demand (30 days)
- [ ] DPA attached with SCCs
- [ ] Liability cap ≥ 1x annual fees
- [ ] Termination for convenience (30-90 days)
- [ ] No auto-renewal without 60-day notice
- [ ] Price increase cap (CPI + 2% max)
- [ ] Security: SOC 2 Type II, encryption at rest/transit
- [ ] Sub-processor notification (30 days prior)

#### Professional Services (As Client)
**Must-Haves:**
- [ ] Fixed price or capped T&M
- [ ] Clear deliverables with acceptance criteria
- [ ] IP assignment: we own work product
- [ ] Key personnel clause (no bait-and-switch)
- [ ] Warranty period (90 days minimum)
- [ ] Indemnification for IP infringement
- [ ] Insurance: Professional liability ≥ $1M

#### NDA (Mutual)
**Must-Haves:**
- [ ] Purpose limitation (specific project)
- [ ] Duration: 2-3 years max (not perpetual)
- [ ] Exclusions: public, independent, prior knowledge
- [ ] No license grant (just confidentiality)
- [ ] Return/destroy on request or termination
- [ ] No residual knowledge clause (or narrow)
- [ ] Governing law: Brazil, São Paulo

### 6. Redline Strategy

```typescript
interface Redline {
  clause: string;
  originalText: string;
  proposedText: string;
  rationale: string;
  priority: "must" | "should" | "nice";
  fallback?: string;
}

const REDLINE_TEMPLATES = {
  unlimited_liability: {
    clause: "Limitation of Liability",
    original: "Neither party's liability shall be unlimited...",
    proposed: "Each party's total liability shall not exceed the fees paid in the 12 months preceding the claim, except for (a) breach of confidentiality, (b) IP infringement, (c) gross negligence/willful misconduct.",
    rationale: "Unlimited liability exposes Orun to existential risk. Cap at 1x annual fees is market standard.",
    priority: "must",
  },
  perpetual_confidentiality: {
    clause: "Confidentiality",
    original: "Confidentiality obligations survive indefinitely...",
    proposed: "Confidentiality obligations survive for 3 years post-termination (5 years for trade secrets).",
    rationale: "Perpetual confidentiality is unenforceable and creates indefinite compliance burden.",
    priority: "should",
  },
  auto_renewal_no_notice: {
    clause: "Term",
    original: "This Agreement automatically renews for successive one-year terms...",
    proposed: "This Agreement automatically renews unless either party provides 60 days written notice prior to renewal.",
    rationale: "Auto-renewal without notice traps us in unwanted contracts. 60-day notice is standard.",
    priority: "must",
  },
  broad_ip_assignment: {
    clause: "Intellectual Property",
    original: "All work product, including background IP, shall be owned by Client...",
    proposed: "Contractor assigns deliverables IP. Background IP remains owned by respective party. Contractor grants Client a perpetual, irrevocable, worldwide license to use Background IP incorporated in Deliverables.",
    rationale: "Overbroad assignment captures Contractor's pre-existing tools/frameworks. License is sufficient.",
    priority: "must",
  },
};
```

## Output Format (Contract Review Report)

```json
{
  "reviewId": "cr-2026-0042",
  "contractMetadata": { ... },
  "summary": {
    "overallRisk": "high",
    "criticalCount": 2,
    "highCount": 4,
    "mediumCount": 7,
    "lowCount": 3,
    "recommendation": "negotiate_hard|accept_with_changes|walk_away"
  },
  "clauseAnalysis": [
    {
      "clause": "Limitation of Liability",
      "severity": "critical",
      "category": "legal",
      "finding": "Unlimited liability for both parties",
      "recommendation": "Cap at 1x annual fees with standard carve-outs",
      "negotiable": true,
      "redline": "See redline template: unlimited_liability"
    }
  ],
  "lgpdCompliance": {
    "dpaPresent": false,
    "sccsRequired": true,
    "breachNotificationDefined": false,
    "dataSubjectRightsAddressed": false,
    "gaps": ["No DPA attached", "No SCCs for US subprocessors"]
  },
  "keyDates": {
    "effectiveDate": "2026-09-01",
    "expirationDate": "2027-08-31",
    "renewalNoticeDeadline": "2027-07-02",
    "autoRenewal": true
  },
  "financialSummary": {
    "totalValue": 180000,
    "currency": "BRL",
    "paymentTerms": "Net 30",
    "autoIncrease": "IGPM + 2%",
    "terminationFee": "50% of remaining term"
  },
  "actionItems": [
    { "owner": "Legal", "action": "Negotiate liability cap", "deadline": "2026-08-15" },
    { "owner": "Procurement", "action": "Request DPA + SCCs", "deadline": "2026-08-10" },
    { "owner": "Engineering", "action": "Verify data processing scope", "deadline": "2026-08-20" }
  ],
  "reviewer": "contract-review-agent",
  "reviewedAt": "2026-08-29T10:30:00Z",
  "nextReview": "2027-05-01"
}
```

## Handoff

**To:** Head of Legal/Compliance (final approval), VP Operations (commercial terms), VP Tech (technical clauses)
**From:** Counterparty legal, Procurement, Business owner
**Consumers:** Finance (payment terms), Engineering (IP, data, SLA), Security (data protection)
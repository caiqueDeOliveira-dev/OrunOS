---
name: code-review
description: >
  Code Review Agent — Revisa PRs aplicando padrões Orun: TypeScript strict, Zod validation, orun-typescript-strict, Fowler smell baseline, security (semgrep), test coverage. Bloqueia merges inseguros, ensina via feedback estruturado.
description_pt_BR: >
  Agente de Code Review — Revisa PRs aplicando padrões Orun: TypeScript strict, Zod validation, orun-typescript-strict, Fowler smell baseline, security (semgrep), test coverage. Bloqueia merges inseguros, ensina via feedback estruturado.
description_es: >
  Agente de Code Review — Revisa PRs aplicando estándares Orun: TypeScript strict, validación Zod, orun-typescript-strict, baseline Fowler smells, seguridad (semgrep), cobertura de tests. Bloquea merges inseguros, enseña via feedback estructurado.
type: hybrid
version: "1.0.0"
script:
  path: scripts/code-review.ts
  runtime: node
  dependencies: [zod, simple-git, typescript, semgrep]
mcp:
  server_name: github
  command: npx
  args: ["-y", "@github/mcp@latest"]
  transport: stdio
env:
  - GITHUB_TOKEN
  - SEMGREP_RULES_PATH
categories: [tech, engineering, code-review, security, quality, typescript]
---

# Code Review Skill

## When to Use

Use this skill for every Pull Request in @orun/* packages:
- Automated review on PR open/update
- Manual review request via `@code-review` mention
- Pre-merge gate (required approval)
- Post-merge regression detection

## Review Protocol (Two Independent Axes)

### Axis A: STANDARDS (Repo Conventions + Fowler Baseline)

**Repo Conventions (Non-Negotiable)**
- TypeScript strict mode: `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`
- Zod schemas for all external boundaries (API, DB, config, env)
- `orun-typescript-strict`: discriminated unions over enums, exhaustive matching
- File organization: `src/{domain}/{layer}` — no barrel exports unless >3 consumers
- Imports: absolute `@orun/*` for internal, relative for local
- No `any`, no `unknown` without narrowing, no `// @ts-ignore`

**Fowler Smell Baseline (12 Smells → Judgement Calls)**
| Smell | Detection | Fix Pattern |
|-------|-----------|-------------|
| Mysterious Name | Single-letter, abbreviated, generic names | Rename to intent-revealing |
| Duplicated Code | ≥3 lines identical/similar | Extract function/module |
| Feature Envy | Method uses more other-object data than own | Move method |
| Data Clumps | ≥3 params always together | Group into object/record |
| Primitive Obsession | Primitives for domain concepts | Create branded types |
| Repeated Switches | Same switch on type in multiple places | Polymorphism / strategy map |
| Shotgun Surgery | Change requires edits in many files | Consolidate module |
| Divergent Change | Class changes for different reasons | Split by change reason |
| Speculative Generality | Unused params, abstract for future | YAGNI — delete |
| Message Chains | `a.getB().getC().doD()` | Hide delegate |
| Middle Man | Wrapper delegates everything | Remove wrapper |
| Refused Bequest | Subclass uses little of parent | Composition over inheritance |

**Severity Markers**
- 🔴 **Blocker**: Security vuln, data loss, race condition, broken API contract, unhandled critical error
- 🟡 **Suggestion**: Missing validation, unclear naming, missing tests, N+1/perf, extractable duplication
- 💭 **Nit**: Style inconsistency (if no linter), minor naming, doc gaps

### Axis B: SPEC (Fidelity to Request)

**Spec Sources (Priority Order)**
1. Commit references: `#123`, `Closes #45`, `Fixes #789`
2. User-provided path/context in PR description
3. Spec/docs file in branch (`docs/spec.md`, `SPEC.md`)
4. **No spec available** → Report explicitly in review

**Evaluation**
- Does the code solve the stated problem?
- Are edge cases from spec handled?
- Are success criteria met?
- No scope creep beyond spec

## Review Workflow

```
1. PIN DIFF FIXED POINT
   git diff <base>...HEAD (three-dot, merge-base)
   → If empty/hopeless diff: STOP, don't review

2. RUN AUTOMATED CHECKS (Parallel)
   □ tsc --noEmit (typecheck)
   □ eslint (lint)
   □ vitest run (tests, coverage ≥80%)
   □ semgrep_scan (security ruleset)
   □ depcheck (unused deps)
   □ bundle size delta (esbuild analyze)

3. MANUAL REVIEW (Two Axes)
   For each finding:
     - Marker + Title + Line
     - WHY (real consequence)
     - SUGGESTION (fixed code)
   Praise good code (1 line, why)

4. CLOSE WITH JSON
   {
     "repo": "orun-core",
     "file_path": "src/services/sync.ts",
     "summary": "Fixed race condition in sync scheduler",
     "issues_found": 3,
     "severity": "medium",
     "axes": {
       "standards": [...],
       "spec": [...]
     },
     "decision": "approve|request_changes|escalate"
   }
```

## Semgrep Ruleset (Orun Custom)

```yaml
# .semgrep/orun-rules.yml
rules:
  - id: orun-no-any
    pattern-either:
      - pattern: ": any"
      - pattern: "<any>"
    message: "Avoid 'any' — use proper types or 'unknown' with narrowing"
    severity: ERROR
    languages: [typescript]

  - id: orun-zod-boundary
    pattern-either:
      - pattern: "fetch(...)"
      - pattern: "supabase.from(...)"
      - pattern: "JSON.parse(...)"
      - pattern: "process.env."
    message: "External boundary — validate with Zod schema"
    severity: WARNING
    languages: [typescript]

  - id: orun-no-ts-ignore
    pattern: "// @ts-ignore"
    message: "Fix the type error instead of suppressing"
    severity: ERROR
    languages: [typescript]

  - id: orun-exhaustive-match
    pattern: "switch ($X) { ... }"
    metavariable-regex:
      metavariable: $X
      regex: ".*\\b(kind|type|status|variant)\\b.*"
    message: "Discriminated union — use exhaustive matching with 'never' check"
    severity: WARNING
    languages: [typescript]

  - id: orun-hardcoded-secret
    pattern-either:
      - pattern: "password = \"...\""
      - pattern: "apiKey = \"...\""
      - pattern: "secret = \"...\""
      - pattern: "token = \"...\""
    message: "Hardcoded secret — use environment variables"
    severity: ERROR
    languages: [typescript, javascript, json, yaml]
```

## GitHub Integration

### PR Review Comment Format
```markdown
## Code Review: orun-core#42

### 🔴 Blocker: Security — SQL Injection Risk (src/db/query.ts:47)
**Why:** User input directly interpolated into query string allows injection.
**Fix:** Use parameterized query:
```ts
// Before
const sql = `SELECT * FROM users WHERE email = '${email}'`;

// After
const sql = `SELECT * FROM users WHERE email = $1`;
await pool.query(sql, [email]);
```

### 🟡 Suggestion: Missing Validation — External API Response (src/api/github.ts:23)
**Why:** GitHub API can return error shapes not in current type.
**Fix:** Add Zod schema for response:
```ts
const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().url(),
});
const user = GitHubUserSchema.parse(await response.json());
```

### 💭 Nit: Inconsistent Naming (src/utils/date.ts:12)
**Why:** `fmtDate` vs `formatDate` in same module.
**Fix:** Rename to `formatDate` for consistency.

### ✅ Praise: Clean Architecture (src/services/sync.ts)
**Why:** Clear separation: domain logic pure, adapters at boundaries, testable seams.

---

**Decision:** `request_changes` — 1 blocker, 2 suggestions
**JSON:** {"repo":"orun-core","file_path":"src/db/query.ts","summary":"Fixed race condition in sync scheduler","issues_found":3,"severity":"medium"}
```

## Automation Rules

| Trigger | Action |
|---------|--------|
| PR opened | Auto-assign reviewers (code owners), run CI |
| PR updated | Re-run checks, update review if significant changes |
| `@code-review` mention | Priority review within 2h |
| Merge to main | Post-merge scan for regressions |
| Release tag | Full security scan + dependency audit |

## Quality Gates (Required for Merge)

- [ ] All CI checks pass (typecheck, lint, test, semgrep)
- [ ] Code review approved (no 🔴 blockers)
- [ ] Coverage ≥ 80% (new code ≥ 90%)
- [ ] No bundle size regression > 5%
- [ ] No new critical/high vulnerabilities
- [ ] Spec fidelity confirmed (Axis B)
- [ ] CHANGELOG entry for user-facing changes

## Script: code-review.ts

```typescript
// Core functions
export async function analyzePR(prNumber: number): Promise<ReviewResult>
export async function runSemgrep(files: string[]): Promise<SemgrepFinding[]>
export async function checkTypescript(files: string[]): Promise<TSError[]>
export async function checkCoverage(prNumber: number): Promise<CoverageReport>
export async function postReview(prNumber: number, review: Review): Promise<void>
export function formatReview(review: Review): string // Markdown for GitHub comment
```

## Handoff

**To:** Head of DevRel (approval calibration), Arch Agent (arch changes), Security Audit (vulns)
**From:** Developer (PR author), CI (automated findings)
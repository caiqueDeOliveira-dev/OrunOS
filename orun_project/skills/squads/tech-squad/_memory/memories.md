# Squad Memory: Tech Squad

## Estilo de Escrita

- Tom: técnico, preciso, direto ao ponto
- Linguagem: terminologia correta, comandos exatos, links para docs
- Formato: code blocks, diffs, checklists, tabelas de decisão
- Tom de voz: senior, mentor, sem condescendência

## Design Visual

- Syntax highlighting: Monaco/VS Code theme
- Diagramas: Mermaid (C4, sequence, flow)
- Diffs: unified diff com cores
- Tabelas: markdown pipes alinhados

## Estrutura de Conteúdo

1. PR Triage (abertos, prioridade, reviewers, CI status)
2. Architecture Decisions (ADR propostos, aprovados, deprecated)
3. Security Report (vulns, deps, secrets, config drift)
4. Infra Health (CI/CD, deploys, logs, alerts, capacity)
5. Action Items (owner, deadline, priority, blockers)

## Proibições Explícitas

- Não aprovar PR sem CI verde
- Não criar ADR sem discussão em equipe
- Não ignorar vuln crítica/alta
- Não deploy sem rollback plan
- Não "quick fix" sem root cause analysis

## Técnico (específico do squad)

- Standards: TS strict, Zod boundaries, ESLint + custom rules, Vitest >80%
- Security: semgrep rules custom, npm audit, dependabot, secret scan
- CI/CD: GitHub Actions, matrix test, bundle analysis, e2e Playwright
- Observability: logs estruturados, traces, metrics, SLOs
- Docs: ADR no repo, API specs OpenAPI, runbooks
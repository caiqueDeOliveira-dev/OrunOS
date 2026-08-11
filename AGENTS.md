# AGENTS.md — Orun OS workspace

Contexto persistente carregado em toda sessão. Não apague este arquivo.

## O que é este workspace

Este diretório é o **Orun OS desktop** (`orun_project/`). É o projeto mais avançado e serve de **referência/base** para todo o ecossistema Orun. Vários projetos relacionados vivem FORA deste workspace — caminhos absolutos abaixo.

## Objetivo final: o SO Orun

O objetivo do usuário é transformar o ecossistema Orun em um **sistema operacional completo e profissional** — o **SO Orun** — baseado em **web/Electron** (shell com janelas/taskbar/launcher hospedando os programas do ecossistema), NÃO um kernel Linux. Documento-mãe: `orun_project/docs/so-orun-roadmap.md`. Ordem de fases: **A** = completar os projetos na metade (OrunVS → OrunTV → Orun Shield) → **B** = shell do SO → **C** = apps nativos incorporados → **D** = distribuição (build único + Orun Store). Todos os apps usam o mesmo Supabase compartilhado.

## Repositórios

| Projeto | Caminho | Stack | O que é |
| --- | --- | --- | --- |
| Orun OS (desktop) | `C:\Users\Caiqu\OneDrive\Desktop\orun-os\orun_project` | Electron 31, React 18.3, Vite 6, Tailwind 4, TypeScript | App desktop multi-agente, workspace plugin-based, WhatsApp/Telegram/Discord, voz (TTS/STT/wake word), Spotify, n8n, sync Supabase. **v0.6.8** (referência/base do SO) |
| Orun Mobile (monorepo) | `C:\Users\Caiqu\Downloads\orun-monorepo_1\orun-monorepo` | Expo/React Native, Supabase, Deno Edge Functions | App mobile (expo-router), design system, `supabase-sync` (sync engine + ai-relay/telegram/whatsapp webhooks), `whatsapp-baileys`, **home-app** (tablet smarthome). Branch `master` |
| Orun-Core | `C:\Users\Caiqu\OneDrive\Desktop\Orun-Core` | TypeScript | Core compartilhado: `getSupabaseClient` (aceita `transport` WebSocket p/ Electron), hub `devices`/`commands`, satélites (`home`/`tv`/`shield`). v0.1.2 — 60 testes |
| OrunVS | `C:\Users\Caiqu\OneDrive\Desktop\OrunVS` | VS Code extension, TS | Chat IA multi-provider, fallback chain, memória local, skills, **client MCP stdio + catálogo on-demand**. **v0.3.4** — 87 testes, VSIX instalado |
| OrunTV | `C:\Users\Caiqu\Downloads\oruntv_2\oruntv` | Jellyfin + Sonarr/Radarr/Prowlarr/Bazarr/qBittorrent; apps dashboard/desktop/mobile/tizen | Media stack completo. v0.1.0 — em refinamento |
| Orun Shield | `C:\Users\Caiqu\Downloads\Orun Shield\orun-security-suite` | 6 pacotes TS (shield-core, sentinela-agent, shield-mobile, system-optimizer) + 2 integrações Electron | Suíte de segurança (~115+ testes). v0.1.0 — em refinamento |
| Orun Auth | zip `Downloads\Orun Auth.zip` / `Orun Auth_1.zip` | TS (pacote puro `@orun/identity`), vitest, Deno Edge Functions | Identidade/auth centralizado (OAuth, billing Stripe, MFA, LGPD). **bruto v0.1.0** — 71/71 testes, pronto p/ refinar/integrar |
| Orun Files | zip `Downloads\orun-files.zip` | Electron, JS puro, Gemini API, electron-store, chokidar | Gerenciador de arquivos com IA (busca semântica, organização, preview). **bruto v0.1.0** — pronto p/ refinar |
| Orun Design | `C:\Users\Caiqu\Downloads\Orun Design\orum-project` | Backend Node + frontend HTML/CSS/JS puro | (Em avaliação) |

## Supabase compartilhado (TODOS os apps usam o mesmo projeto)

- project-ref: `kmfmeewibravdsxemzuj` (host `aws-0-ca-central-1.pooler.supabase.com`)
- SQL direto via `pg`: `DIRECT_URL` em `orun_project/.env` (porta 5432 direta / 6543 pooler). **Nunca imprimir segredos.**
- `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` também vêm do `.env` de `packages/whatsapp-baileys` do monorepo.
- Tabelas principais: `agents`, `conversations`, `messages`, `devices`, `commands`, `health_log`, `finance_log`, `marketing_log`, `memories`, `usage_events`.
- Agentes são seed por migration `0005_agent_prompts.sql` (17 agentes, prompts iguais ao desktop). Mobile lê `persona_prompt` do banco em runtime (ai-relay).
- Edge Functions: `ai-relay`, `telegram-webhook`, `whatsapp-webhook`. Providers cloud: `openai`, `openrouter`, `groq`, `github`, `opencode`, `claude`. `ollama` é local-only (ai-relay rejeita).

## Fatos técnicos importantes (lições aprendidas)

- `logger.cjs` do desktop NÃO tem métodos no nível raiz (`logger.info/error/warn`) — só categorias (`logger.sync.*`, `logger.db.*`, etc.).
- supabase-js falha em Node <22 (Electron main) sem WebSocket nativo — passar `transport: require("ws").WebSocket` no `getSupabaseClient`.
- `getSupabaseClient` do core é singleton — primeiro `initEcosystem` vence.
- Desktop chaves no keychain: slots `orun.supabase.url` e `orun.supabase.serviceRoleKey`, `orun.device.id` (deviceId atual `378b64a3-3196-4950-b1d1-f5bdc889ea85`).
- Migrations do mobile devem ser aplicadas no Supabase via script `pg` + `DIRECT_URL` (evita pedir senha do Supabase CLI).

## Comandos

- Desktop tests/typecheck: `npm run typecheck` e `npm test` em `orun_project/` (670 testes).
- Monorepo: `npm test`, `npm run typecheck`, `npm run typecheck:edge-logic` na raiz do monorepo (211 testes).
- Lint desktop: `npm run lint` em `orun_project/` (81 erros pré-existentes; lint não cobre `electron/*.cjs`).

## Regras de trabalho

- Não matar/alterar a instância do app do usuário que estiver rodando.
- TV e Shield estão adiados ("pra depois").
- Validações em banco real sempre via scripts isolados (temp), depois removidos.
- Usuário fala português (pt-BR).

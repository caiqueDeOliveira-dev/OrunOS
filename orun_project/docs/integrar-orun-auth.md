# Integrar o Orun Auth (`@orun/identity`) no Orun OS Desktop

> Status: **Fases A, B, C e D implementadas** (2026-08-11). Schema já aplicado no Supabase compartilhado;
> pacote `@orun/identity` vendored em `vendor/orun-identity`; anon key no secret-store;
> Fase A: `electron/auth.cjs` + IPC + preload + UI (AuthGate/LoginScreen). Fase B: `SessionRegistry`
> ativo (register/revoke de `user_devices` + `sessions`), ligação dono ↔ local em `settings`
> (`identity.owner`) e seção "Conta Orun" no ProfilePanel (dispositivos conectados).
> Fase C: 5 Edge Functions deployadas no Supabase compartilhado (`create-checkout-session`,
> `stripe-webhook`, `issue-license`, `export-user-data`, `delete-account`), chave RSA de licença
> gerada (pública no `.env`, privada como secret da EF), seed de `plans`/`entitlements`
> (`desktop_free`/`desktop_pro`) e integração desktop (LicenseManager/EntitlementsResolver/PrivacyClient
> em `auth.cjs`, IPC `auth:get-license|refresh-license|get-entitlements|start-checkout|export-data|
> delete-account`, preload, tipos e UI de plano/licença + "Meus dados" no ProfilePanel).
> Fase D: portabilidade (export JSON) e esquecimento (delete-account com checagem
> `sole_owner_of_organization`) no ProfilePanel. Stripe deliberadamente adiado — EF retornam 503
> `stripe_not_configured` até as chaves serem configuradas.
> **Feito (2026-08-11)**: Fases A–D implementadas (auth base, SessionRegistry, billing/licença, LGPD);
> Stripe adiado para a v1.0; **Bloco 3 fechado em 2026-08-12** (weak-mode aceito e implementado;
> login opt-in mantido; troca de workspace postergada; dados locais não migram).
> Typecheck ✓, 902 testes ✓. **Aguardando validação ao vivo** no próximo boot/restart do app.
> Código de referência do pacote: `Desktop\Orun Auth\Orun Auth\packages\identity\`
> (cópia: `Downloads\orun-monorepo_1\orun-monorepo\packages\identity\`).

## Objetivo

Dar ao Orun OS desktop uma camada de **autenticação real do dono** (hoje o app roda sem login,
com `service_role` no main process). O `@orun/identity` resolve isso e já nasce com multi-tenant,
billing/licença, MFA, passkeys e LGPD — para quando o ecossistema for comercializado.

## Princípios

1. **Não quebrar a instância em produção** — a Fase A não toca no fluxo atual: sem login, o app
   continua abrindo como hoje (modo local). Login é *opt-in* nesta fase.
2. **Separação de identidades**: o `identity-resolver.cjs` (SQLite local) continua sendo o dono do
   roteamento WhatsApp (users/identities/workspaces/agent_channels). A conta do dono (Supabase Auth)
   é outra camada — a ligação entre elas é definida na Fase B.
3. **Nunca usar `service_role` para auth**. O `AuthClient` usa um client separado com **anon key**.
4. **Migration aditiva / idempotente** já aplicada no banco (variante TEXT ids).

## Fatos mapeados (base do plano)

| Item | Onde | Consequência |
| --- | --- | --- |
| Único supabase-js no main | `sync-adapter.cjs:65` via `@orun/core.getSupabaseClient` com **service_role** | AuthClient precisa de **client com anon key** |
| Boot do app | `main.cjs:1123-1286`: `secretStore.init` → db → `registerIpcHandlers` → createWindow → sync pg → ecossistema | Auth inicializa logo após `secretStore.init`; IPC em `registerIpcHandlers` |
| Armazenamento seguro | `secret-store.cjs` (safeStorage + fallback AES-GCM máquina) | Backend do `ElectronSecureTokenStore` = adapter `KeyValueBackend` sobre este padrão |
| Bridge renderer | `preload.cjs` expõe `window.orun` (contextBridge) | Novo namespace `auth:` seguindo o shape do `useAuthBridge` |
| Identidade local | `identity-resolver.cjs` (SQLite) | Não é a conta do dono; ligação na Fase B |
| First-run | `settings:is-first-run` + `settings:agent-recommended-models` | Tela de login entra na hora de gerar o shell |
| Tokens | `TOKEN_STORE_KEYS`: access/refresh/license/device_id | Store dedicado `orun.identity.*` no secret-store |

## Fases

### Fase A — Auth base (login do dono)

Entrega: dono consegue criar conta / logar / sair; app lembra a sessão; sem login continua
funcionando como hoje.

> **Feito (2026-08-11)**: 1✓ dependência vendored + instalada (`file:vendor/orun-identity`); 2✓ anon key
> salva em `orun.supabase.anonKey` (secret-store); 3✓ `electron/auth.cjs` (createClient anon key +
> `ElectronSecureTokenStore` + kv backend em `%userData%\auth-tokens.json` + `resolveTenantContext` via
> RPC `user_tenant_ids` + RLS); 4✓ `ipc/auth-handlers.cjs` (`auth:get-state/sign-in/sign-up/sign-out` +
> push `auth:state-changed`); 5✓ preload namespace `auth:`; 6✓ `AuthGate` + `LoginScreen` (email/senha,
> cadastro, "continuar sem conta" persistido em `authSkipped`). Validação sandbox do init/initialize OK
> (estado `unauthenticated` sem tokens); typecheck ✓ e 902 testes ✓.

1. **Dependência**: instalar `@orun/identity` no `orun_project` (cópia local como no monorepo,
   ou referência de workspace). peerDeps: `@supabase/supabase-js ^2.45.0` (já existe via core?),
   `jose ^5.9.0`.
2. **Chave anon**: obter a anon key do projeto compartilhado (Dashboard → API keys) e salvar no
   keychain em `orun.supabase.anonKey`. `SUPABASE_URL` já está em `orun.supabase.url`.
3. **`electron/auth.cjs`** (novo):
   - `createAuthClient()`: supabase-js client com `{ url, anonKey, auth: { persistSession: false, autoRefreshToken: true } }`
     (sem WebSocket — auth não usa Realtime; se precisar, reusar `ws` transport como no sync-adapter).
   - `ElectronSecureTokenStore` com backend `KeyValueBackend` sobre `secret-store.cjs`
     (chaves `orun.identity.access_token` etc.).
   - `new AuthClient({ supabase, tokenStore, resolveTenantContext })` — `resolveTenantContext` usa
     `supabase.rpc('user_tenant_ids')` (já criada no banco) e escolhe a membership ativa.
   - `restoreSession()` no boot: se houver refresh token, `auth.initialize()`/setSession e emite o
     estado para o renderer; falha silenciosa (modo local).
   - Hooks `onStateChanged` → `mainWindow.webContents.send('auth:state', state)`.
4. **IPC** (`registerIpcHandlers`): `auth:get-state`, `auth:sign-in` (email+senha),
   `auth:sign-up`, `auth:sign-out`, `auth:mfa-challenge` (se aplicável), `auth:reset-password`.
5. **Preload**: namespace `auth:` no `window.orun` implementando `getState()`, `onStateChanged(cb)`,
   `signIn`, `signUp`, `signOut` (shape exato do `useAuthBridge` em `packages/identity/src/hooks/useAuth.ts`).
6. **UI**: componente `LoginScreen` (email/senha, cadastro, "continuar sem conta") usando `useAuthBridge`;
   gate no shell: se houver sessão → painel normal; senão → LoginScreen por cima, com modo "sem conta"
   mantendo o comportamento atual. Pode compartilhar o design system com Mobile (mesmo hook).
7. **Config no Supabase**: habilitar email/password no Auth (providers), confirmar redirect URLs se
   usar OAuth/magic link. (Opção segura: email+senha + confirmação por email.)

### Fase B — Identidade e tenant

Ligar a conta do dono ao ecossistema local e remoto.

> **Feito (2026-08-11)**: 1✓ `auth.cjs` agora recebe `db` no `init` e ativa o `SessionRegistry`;
> 2✓ `getDeviceFingerprint()` = `orun.device.id` do secret-store (fallback sha256 de
> `hostname:userData`); 3✓ `registerCurrentDevice(state)` no subscribe do AuthClient (login e
> restore de sessão) → `sessionRegistry.registerDevice({platform:"desktop", name:hostname})` +
> `registerSession` (hash sha256 do refresh token, 1 ativa por device, expires 30d) +
> `linkOwnerToLocal` (`settings.identity.owner`); 4✓ IPC `auth:get-owner/list-devices/revoke-device`
> + preload + tipos `OrunOwnerLink`/`OrunDevice` (orun.d.ts); 5✓ `OrunAccountSection` no
> `ProfilePanel.tsx` (conta Orun + dispositivos conectados + revogar + sair); 6✓ `AuthGate`
> re-bloqueia após sign-out. Falhas de registro são não-fatais (log warning, app segue).
> Pendente: validação ao vivo no banco (users/memberships/user_devices/sessions).

1. Bootstrap pós-login: garantir `users` (row do dono), `memberships` + `tenants` (tenant pessoal),
   `user_devices` (registrar este desktop), `sessions` (registro da sessão atual).
   **Feito** — trigger `handle_new_user` já cria user/tenant/membership; `SessionRegistry` cuida
   de `user_devices`/`sessions` (policies RLS: gerenciamento por owner/admin do tenant).
2. Ligação dono ↔ workspace local: mapear o `user_id` do Supabase para o `user` do SQLite do dono
   (o `orun-system` hoje absorve dados sem dono; definir se dados locais migram para o workspace do dono).
   **Feito (metadado)**: `identity.owner` em `settings` guarda o mapeamento `supabaseUserId` ↔ tenant
   ativo. Migração de dados locais para o workspace do dono: **não** feita (fica para depois).
3. `useAuthBridge` + estado de tenant ativo no shell (troca de workspace). **Parcial** — estado de
   tenant vem no `auth:get-state`; troca de workspace no shell ainda não.
4. `SessionRegistry` ativo: registrar/revogar sessões e refletir na UI (sessões remotas).
   **Feito** — registro automático pós-auth, revogação por device no ProfilePanel.

### Fase C — Billing e licença

**Feito** (2026-08-11). Stripe **adiado para a v1.0** (decisão do usuário 2026-08-12 — app ainda em fase de
testes) — EF deployadas com degradação graciosa (503 `stripe_not_configured`).

1. 5 Edge Functions deployadas no Supabase compartilhado: `create-checkout-session`, `stripe-webhook`
   (esta com `--no-verify-jwt`), `issue-license`, `export-user-data`, `delete-account`
   (rodadas de `packages/supabase-sync`). Todas com JWT; `export-user-data` e `delete-account` usam
   service_role. Sem `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, as funções Stripe retornam 503
   `stripe_not_configured`.
2. Secrets: `LICENSE_PRIVATE_KEY_PEM` setado (par RSA gerado; pública `LICENSE_PUBLIC_KEY_PEM` no
   `.env` do desktop com `\n` escapados). **Quando o Stripe for configurado (v1.0)**: setar
   `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` e registrar o webhook apontando para `stripe-webhook`.
3. `LicenseManager` + `EntitlementsResolver` integrados em `electron/auth.cjs` (license via
   `functions.invoke("issue-license")`, grace 3 dias, refresh automático pós-auth);
   UI "Plano e licença" no ProfilePanel (status da licença, upgrade → `startCheckout` →
   `shell.openExternal`).
4. Seed idempotente de `plans`/`entitlements`: `desktop_free` (1 dispositivo, 3 agentes) e
   `desktop_pro` (3 dispositivos, 15 agentes + flags ai_agents_unlimited/voice_unlimited/
   billing_priority_support). `stripe_price_id` do pro consultado em runtime — NULL hoje.

### Fase D — LGPD / privacidade

**Feito** (2026-08-11).

1. `PrivacyClient` integrado: `exportUserData` → `export-user-data` (JSON) e `deleteAccount` →
   `delete-account` (checa `sole_owner_of_organization` → bloqueia com `blockedTenants`; usuário sem
   dependência é removido de `auth.users` + `public.users`).
2. Tela "Meus dados (LGPD)" no ProfilePanel: exportar JSON (download local) e excluir conta com
   confirmação; erro de bloqueio exibido inline.

## Riscos e decisões pendentes

> **Bloco 3 — decisões fechadas em 2026-08-12** (registradas nesta sessão):
> 1. **Weak-mode do `ElectronSecureTokenStore`**: **ACEITO** — `auth.cjs` agora usa um
>    `createSafeStorageAdapter` que sempre reporta disponível e faz fallback para AES-256-GCM
>    derivado de `hostname:userData` (mesmo padrão do `secret-store.cjs`, prefixo `$v2$`); tokens
>    antigos cifrados com safeStorage continuam decifráveis. Login não é mais desabilitado quando
>    DPAPI/safeStorage falha.
> 2. **Login obrigatório vs opt-in**: **MANTER opt-in** (sem conta = modo atual). Reavaliar na v1.0
>    quando o Stripe entrar.
> 3. **Troca de workspace no shell (Fase B item 3)**: **POSTERGADA** (sem usuários multi-tenant
>    reais; o estado já vem no `auth:get-state`, UI fica para quando precisar).
> 4. **Migração de dados locais para o workspace do dono**: **NÃO migrar automaticamente**
>    (`orun-system` segue dono dos dados legados; decisão fica para sync real/v1.0).

- **Stripe adiado para a v1.0** (decisão 2026-08-12): app ainda em testes — sem `STRIPE_SECRET_KEY`/
  `STRIPE_WEBHOOK_SECRET`, upgrade retorna 503 `stripe_not_configured`; licença `desktop_free` funciona.
- **Passkeys/MFA** ficam prontos no pacote mas só expostos na UI se o usuário quiser.
- **Não mexer na instância rodando**: todas as mudanças valem para o próximo build.

## Arquivos previstos

| Ação | Arquivo |
| --- | --- |
| novo | `electron/auth.cjs` |
| novo | `electron/ipc/auth-handlers.cjs` |
| editar | `electron/main.cjs` (init + registerIpcHandlers) |
| editar | `electron/preload.cjs` (namespace `auth:`) |
| novo | `src/app/components/auth/LoginScreen.tsx` (+ gate no shell) |
| editar | `src/types/orun.d.ts` (tipos de estado, espelha `AuthState`) |
| editar | `src/app/App.tsx` (gate) |
| novo | `src/app/components/AuthGate.tsx` (gate opt-in) |
| editar | `src/app/components/ProfilePanel.tsx` (`OrunAccountSection`: conta + dispositivos) |
| editar | `package.json` (dep `@orun/identity`) |

## Verificação

- `npm run typecheck` e `npm test` no `orun_project` (suíte atual 900+ testes).
- Manual: boot sem conta (modo local intacto), criar conta, logar, reabrir app (sessão restaurada),
  sair, logar de novo; conferir row em `users`/`memberships`/`user_devices`/`sessions` no banco.

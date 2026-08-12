# E-mails transacionais do Orun Auth (Resend + Supabase)

Status: **template pronto** (2026-08-11). Entrega e-mails de autenticação **customizados da marca Orun**
(preto premium `#050505` + vermelho `#C3002F`) em vez do template genérico do Supabase.

## Por que Resend

- O SMTP padrão do Supabase só envia para emails da organização do projeto, tem rate limit
  não divulgado e **sem SLA** — não serve para produção.
- Resend: tier grátis **3.000 emails/mês**, boa entregabilidade, SPF/DKIM/DMARC automáticos
  por domínio, e é o parceiro oficial Supabase.

## Dois caminhos

| Caminho | Quando usar | O que é |
| --- | --- | --- |
| **A — Custom SMTP** (este guia) | Agora | Supabase Auth envia os 5 e-mails via SMTP do Resend (`smtp.resend.com:465`) com os templates branded deste diretório. Zero código. |
| **B — Send Email Hook** (futuro) | Quando precisar de i18n por usuário, React Email, ou e-mails fora do auth (recibos, notificações) | Edge Function `send-email` chamada pelo hook do Supabase Auth, renderiza React Email e envia pela Resend **API** (não SMTP). Ver seção ao final. |

---

## Passo 1 — Conta Resend e domínio

1. Criar conta em <https://resend.com>.
2. **Produção**: adicionar um domínio (ex.: `orun.app`) em **Domains** e seguir as instruções de DNS
   (SPF + DKIM via registro `resend._domainkey`; o painel gera automaticamente). Iniciar com DMARC `p=none`
   para monitorar antes de endurecer.
   **Desenvolvimento/teste**: dá para usar o domínio compartilhado `onboarding@resend.dev`
   (só envia para o próprio e-mail da conta).
3. Criar uma **API key** em **API Keys** (vai começar com `re_`). É a única "senha" necessária.

> Decisão pendente: **você tem um domínio para o Orun?** Se sim, usar `no-reply@orun.app`.
> Se não, usamos `onboarding@resend.dev` no dev e definimos o domínio quando comprar.

## Passo 2 — Configurar SMTP no Supabase

Dashboard: **Authentication → Email → SMTP Settings** → habilitar custom SMTP:

| Campo | Valor |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `re_...` (API key do Resend) |
| Sender email | `no-reply@orun.app` (ou `onboarding@resend.dev` no dev) |
| Sender name | `Orun` |

Ou via Management API (mesmo efeito; `$SUPABASE_ACCESS_TOKEN` = token de
Account Settings → Access Tokens):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/kmfmeewibravdsxemzuj/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "mailer_autoconfirm": false,
    "smtp_admin_email": "no-reply@orun.app",
    "smtp_host": "smtp.resend.com",
    "smtp_port": 465,
    "smtp_user": "resend",
    "smtp_pass": "'"$RESEND_API_KEY"'",
    "smtp_sender_name": "Orun"
  }'
```

> **Cuidado**: logo depois de ativar SMTP custom o Supabase aplica um rate limit protetivo de
> **30 emails/hora**. Ajustar em **Authentication → Rate Limits** para um valor real (ex.: 200/h).

## Passo 3 — Colar os templates

Dashboard: **Authentication → Email → Templates**. Para cada tipo, colar **Assunto** e **HTML** do arquivo
correspondente (o botão `{{ .ConfirmationURL }}` dos templates usa a variável do Supabase — funciona
direto no builder):

| Tipo (template do dashboard) | Arquivo | Assunto sugerido |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | `Confirme seu e-mail — Orun` |
| Reset password | `reset-password.html` | `Redefina sua senha — Orun` |
| Magic link | `magic-link.html` | `Seu link de acesso — Orun` |
| Invite user | `invite.html` | `Você foi convidado para o Orun` |
| Change email address | `change-email.html` | `Confirme seu novo e-mail — Orun` |

Variáveis disponíveis nos templates (Go templates do Supabase):
`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`,
`{{ .RedirectTo }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .OldEmail }}`.

**Logo**: os templates usam o wordmark textual `ORUN` por padrão (funciona sem imagem hospedada).
Para usar o logo real, descomentar a linha `<img src="https://orun.app/assets/logo.png">` no header
de cada template e hospedar o `public/LogoIA.png` num CDN/URL pública.

## Passo 4 — Validar

1. Teste SMTP (botão no dashboard) → deve chegar um email de teste no sender.
2. Criar uma conta pelo fluxo de sign-up (Fase A do `docs/integrar-orun-auth.md`) → conferir o email
   de confirmação com a marca.
3. Testar reset de senha e troca de e-mail.

---

## Upgrade futuro — Caminho B (Send Email Hook + React Email)

Quando o ecossistema precisar de i18n (pt/en/es/fr, como o desktop) ou e-mails fora do auth:

1. Edge Function `supabase/functions/send-email` no monorepo, com:
   - secrets: `RESEND_API_KEY`, `SEND_EMAIL_HOOK_SECRET` (gerado em Authentication → Hooks).
   - `standardwebhooks` para verificar o payload do hook e `npm:resend` para enviar.
2. Templates React Email em `_templates/` (conversíveis dos HTML deste diretório).
3. Ativar em **Authentication → Hooks → Send Email hook** apontando para a função.
4. Hook ativo substitui o SMTP para os e-mails de auth (o SMTP deixa de ser usado nesses casos).

Isso também libera a Resend **API** para e-mails de billing/licença (Fase C do `integrar-orun-auth.md`).

## Segurança

- **Nunca** imprimir/logar a API key do Resend nem o `$SUPABASE_ACCESS_TOKEN`.
- Não inserir dados personalizados do usuário (nome, etc.) nos templates de auth — aumentam o risco
  de cair em spam (recomendação oficial do Supabase).
- Sempre que mudar o domínio de envio, verificar SPF/DKIM/DMARC no painel do Resend.

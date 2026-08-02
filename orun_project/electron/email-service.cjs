const POLL_INTERVAL = 60000;
let pollTimer = null;
let googleClient = null;
let log = console;
let onEmailReceived = null;
let routingFn = null;

const AGENT_ROUTES = [
  { keywords: ["financeiro", "fatura", "pagamento", "boleto", "nota fiscal", "invoice", "payment", "bill", "tax", "imposto", "bank", "banco", "cobrança"], agent: "Finance" },
  { keywords: ["saúde", "médico", "consulta", "exame", "health", "doctor", "appointment", "prescription", "receita", "hospital", "plano de saude"], agent: "Health" },
  { keywords: ["aula", "estudante", "curso", "professor", "aluno", "estudo", "homework", "assignment", "grade", "prova", "nota escolar"], agent: "Teacher" },
  { keywords: ["projeto", "código", "bug", "pull request", "commit", "deploy", "issue", "github", "code", "feature", "desenvolvimento"], agent: "Developer" },
  { keywords: ["design", "arte", "imagem", "logo", "branding", "criativo", "photoshop", "ilustração", "identidade visual", "criação"], agent: "Creator" },
  { keywords: ["sistema", "pc", "computador", "windows", "atualização", "update", "driver", "performance", "lento", "travando"], agent: "System" },
  { keywords: ["reunião", "agenda", "evento", "compromisso", "meeting", "schedule", "calendar", "calendario", "lembrete", "aviso"], agent: "Pessoal" },
];

function init({ googleClient: gc, onEmail, routeFn, logger }) {
  googleClient = gc;
  log = logger || console;
  if (onEmail) onEmailReceived = onEmail;
  if (routeFn) routingFn = routeFn;
}

function startPolling() {
  if (pollTimer) return;
  log.info("[email-service] Started polling (interval: 60000ms)");
  poll();
  pollTimer = setInterval(poll, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  log.info("[email-service] Stopped polling");
}

async function poll() {
  if (!googleClient || !googleClient.isConnected()) return;
  try {
    const messages = await googleClient.listMessages({ maxResults: 10, query: "is:unread" });
    for (const msg of messages) {
      try {
        const full = await googleClient.getMessage(msg.id);
        const route = routeEmail(full);
        if (onEmailReceived) onEmailReceived(full, route);
        await googleClient.markAsRead(msg.id);
      } catch (err) {
        log.error("[email-service] Error processing email:", err.message);
      }
    }
  } catch (err) {
    if (err.message !== "No access, no refresh token" && !err.message.includes("invalid_grant")) {
      log.warn("[email-service] Poll error:", err.message);
    }
  }
}

function routeEmail(email) {
  if (routingFn) return routingFn(email);
  const text = `${email.subject} ${email.snippet} ${email.body}`.toLowerCase();
  for (const route of AGENT_ROUTES) {
    if (route.keywords.some((kw) => text.includes(kw))) {
      return route.agent;
    }
  }
  return null;
}

async function analyzeAndReply(email, aiRouter) {
  const agent = routeEmail(email);
  const prompt = `Você é o assistente de email da Orun OS. Analise este email e determine se precisa de resposta imediata, pode ser arquivado, ou precisa ser encaminhado para um agente especializado.

DE: ${email.from}
ASSUNTO: ${email.subject}
CORPO: ${email.body?.slice(0, 2000)}

Responda APENAS com um JSON neste formato (sem marcação):
{"action":"reply/forward/archive","summary":"resumo de 1 linha","agent":"${agent || "none"}","draftReply":"rascunho de resposta se action=reply, ou vazio"}`;
  try {
    const result = await aiRouter.routeChat({ messages: [{ role: "user", content: prompt }], model: "auto" });
    const text = result.content || result.text || result.message?.content || "";
    const jsonMatch = text.match(/{[^}]+}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { action: "archive", summary: "Não foi possível analisar", agent: agent || "none", draftReply: "" };
}

module.exports = { init, startPolling, stopPolling, routeEmail, analyzeAndReply };

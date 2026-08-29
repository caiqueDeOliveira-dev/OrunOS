// ── Curador automático do Neural (Lima Barreto) ─────────────────────────
// Observa conversas que ficaram ociosas e transforma conhecimento
// reutilizável em notas interligadas no segundo cérebro. O Curador DECIDE:
// conversa trivial não vira nota nenhuma.

const MIN_TRANSCRIPT_CHARS = 200;
const MIN_MESSAGES = 4;
const THROTTLE_MS = 10 * 60 * 1000; // 1 captura por conversa a cada 10 min
const DAILY_CAP = 50; // teto diário de execuções do curador
const MAX_TRANSCRIPT_CHARS = 12000;
const MAX_NOTES_PER_RUN = 5;

/** Prompt de extração do Curador: recebe transcrição, devolve JSON puro. */
function buildCuratorMessages(transcript, existingTitles) {
  const known = (existingTitles || []).slice(0, 80).map((t) => `- ${t}`).join("\n");
  return [
    {
      role: "system",
      content:
        "Você é o Curador do Neural (Lima Barreto) — cronista observador do Círculo Hampton. Sua função única: transformar conversas em notas interligadas para o segundo cérebro do usuário.\n\n" +
        "REGRA DE OURO:\n" +
        "- Salve SOMENTE conhecimento reutilizável: decisões, preferências duradouras, fatos técnicos, ideias de projeto, aprendizados, recursos úteis.\n" +
        "- Conversa trivial (saudação, small talk, pedido descartável, status momentâneo) → retorne [].\n" +
        "- NUNCA invente relações: só use [[Wikilink]] quando houver relação real com outra nota.\n" +
        "- Máximo " + MAX_NOTES_PER_RUN + " notas. Cada nota deve fazer sentido sozinha daqui a meses.\n\n" +
        "FORMATO DA RESPOSTA (somente JSON, sem texto antes ou depois):\n" +
        '[{"title":"Título curto","content":"Resumo denso em markdown, pt-BR, com [[Wikilinks]] quando relacionado","tags":["tag1","tag2"]}]\n' +
        "Se nada merecer registro, responda exatamente: []",
    },
    {
      role: "user",
      content:
        "TRANSCRIÇÃO DA CONVERSA:\n---\n" + transcript + "\n---\n\n" +
        "NOTAS JÁ EXISTENTES NO NEURAL (use estes títulos exatos nos wikilinks; NÃO duplique temas):\n" +
        (known || "(nenhuma ainda)"),
    },
  ];
}

/**
 * Extrai o array JSON da resposta do LLM de forma tolerante.
 * Retorna array validado (possivelmente vazio) ou null se não parseou.
 */
function parseCuratorNotes(text) {
  if (!text || typeof text !== "string") return null;
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  let arr;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const notes = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 120) : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if (title.length < 3 || content.length < 20) continue;
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t) => typeof t === "string").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)
      : [];
    notes.push({ title, content: content.slice(0, 8000), tags });
    if (notes.length >= MAX_NOTES_PER_RUN) break;
  }
  return notes;
}

/** Normaliza transcrição para o formato que o curador lê. */
function buildTranscript(messages) {
  const lines = (messages || [])
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant", "hampton"].includes(m.role))
    .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`);
  return lines.join("\n\n").slice(0, MAX_TRANSCRIPT_CHARS);
}

/**
 * Fábrica do capturador com throttle embutido.
 * deps: { routeChat, getSettings, readApiKey, saveNote, listNoteTitles, log }
 */
function createAutoCapturer(deps) {
  const lastRunByConvo = new Map();
  let runsToday = 0;
  let dayKey = "";

  function tickDailyCap(now) {
    const today = new Date(now).toDateString();
    if (today !== dayKey) {
      dayKey = today;
      runsToday = 0;
    }
  }

  function shouldAttempt({ conversationId, transcript }, now = Date.now()) {
    if (!conversationId) return { ok: false, reason: "no-conversation" };
    if (typeof transcript !== "string" || transcript.length < MIN_TRANSCRIPT_CHARS) {
      return { ok: false, reason: "transcript-too-short" };
    }
    const last = lastRunByConvo.get(conversationId) || 0;
    if (now - last < THROTTLE_MS) return { ok: false, reason: "throttled" };
    tickDailyCap(now);
    if (runsToday >= DAILY_CAP) return { ok: false, reason: "daily-cap" };
    // Registra ANTES da execução: falha do LLM também consome o throttle
    // (evita retry-storm contra o provedor).
    lastRunByConvo.set(conversationId, now);
    runsToday += 1;
    return { ok: true };
  }

  async function handle(payload) {
    const { conversationId } = payload || {};
    const transcript = typeof payload?.transcript === "string"
      ? payload.transcript
      : buildTranscript(payload?.messages);
    const gate = shouldAttempt({ conversationId, transcript });
    if (!gate.ok) return { ok: true, skipped: true, reason: gate.reason };

    try {
      const settings = deps.getSettings();
      const apiKey = deps.readApiKey(settings.provider);
      if (!apiKey) return { ok: true, skipped: true, reason: "no-api-key" };

      const existingTitles = await deps.listNoteTitles();
      const messages = buildCuratorMessages(transcript, existingTitles);
      const result = await deps.routeChat({
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKey,
        messages,
      });

      const notes = parseCuratorNotes(result && result.text);
      tickDailyCap(Date.now());

      if (!notes) {
        deps.log("curador: resposta ilegível, nada salvo");
        return { ok: true, saved: 0, parseError: true };
      }
      const knownLower = new Set(existingTitles.map((t) => String(t).toLowerCase()));
      const saved = [];
      for (const note of notes) {
        if (knownLower.has(note.title.toLowerCase())) continue;
        await deps.saveNote(note);
        knownLower.add(note.title.toLowerCase());
        saved.push(note.title);
      }
      deps.log(`curador: ${saved.length} nota(s) salva(s) da conversa ${conversationId}`);
      return { ok: true, saved: saved.length, titles: saved };
    } catch (e) {
      deps.log(`curador: falhou — ${e.message}`);
      return { ok: false, error: e.message };
    }
  }

  return { shouldAttempt, handle, buildTranscript };
}

module.exports = {
  MIN_TRANSCRIPT_CHARS,
  MIN_MESSAGES,
  THROTTLE_MS,
  DAILY_CAP,
  MAX_NOTES_PER_RUN,
  buildCuratorMessages,
  parseCuratorNotes,
  buildTranscript,
  createAutoCapturer,
};

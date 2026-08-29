// electron/career.cjs
//
// Core do agente Carreiras: busca de vagas, otimização de perfis de LinkedIn
// (dois perfis: dono + esposa), preparação de currículo/carta personalizados
// e status de candidatura. Estado persistido em JSON no userData.
//
// Fluxo de segurança (decisão do usuário): o agente PREPARA a candidatura
// (currículo + carta + link) e exige CONFIRMAÇÃO antes de marcar como enviada.
// Nenhuma automação de Easy Apply no LinkedIn (viola ToS → risco de banimento).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const firecrawl = require("./firecrawl.cjs");

// ── Status possíveis de uma vaga ─────────────────────────────────────────
const JOB_STATUS = {
  NOVA: "nova",
  PREPARADA: "curriculo_pronto",
  ENVIADA: "enviada",
  DESCARTADA: "descartada",
};

const VALID_STATUS = Object.values(JOB_STATUS);

// ── Perfis suportados (chave → rótulo) ──────────────────────────────────
const PROFILE_KEYS = {
  CAIQUE: "caique",
  ESPOSA: "esposa",
};

const PROFILE_LABELS = {
  [PROFILE_KEYS.CAIQUE]: "Caíque",
  [PROFILE_KEYS.ESPOSA]: "Esposa",
};

let state = {
  db: null,
  log: null,
  readSecretStore: null,
  userDataPath: null,
  _file: null,
};

// ── Persistência ─────────────────────────────────────────────────────────

function defaultState() {
  return {
    profiles: {
      [PROFILE_KEYS.CAIQUE]: {
        name: "Caíque",
        area: "",
        level: "",
        city: "",
        remote: "",
        targetRoles: [],
        headline: "",
        about: "",
        skills: [],
        experiences: [],
        education: [],
        linkedinUrl: "",
        updatedAt: null,
      },
      [PROFILE_KEYS.ESPOSA]: {
        name: "Esposa",
        area: "",
        level: "",
        city: "",
        remote: "",
        targetRoles: [],
        headline: "",
        about: "",
        skills: [],
        experiences: [],
        education: [],
        linkedinUrl: "",
        updatedAt: null,
      },
    },
    jobs: [],
  };
}

function dataFile() {
  if (!state.userDataPath) return null;
  return path.join(state.userDataPath, "career-state.json");
}

function load() {
  const file = dataFile();
  if (!file || !fs.existsSync(file)) return defaultState();
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      profiles: { ...base.profiles, ...(parsed.profiles || {}) },
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
    };
  } catch (err) {
    state.log?.warn?.(`[career] falha ao ler estado: ${err.message}`);
    return defaultState();
  }
}

function save() {
  const file = dataFile();
  if (!file) return { error: "career não inicializado" };
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(current, null, 2), "utf8");
    return { ok: true };
  } catch (err) {
    state.log?.warn?.(`[career] falha ao salvar estado: ${err.message}`);
    return { error: err.message };
  }
}

let current = defaultState();

// Hook de teste: substitui a busca web (Firecrawl/DuckDuckGo) real.
let searchImplForTest = null;
function _setSearchImplForTest(fn) {
  searchImplForTest = typeof fn === "function" ? fn : null;
}

// ── Init ─────────────────────────────────────────────────────────────────

function init(context = {}) {
  state.db = context.db || null;
  state.log = context.log || null;
  state.readSecretStore = context.readSecretStore || null;
  state.userDataPath = context.userDataPath || null;
  state._file = dataFile();
  current = load();
  return state;
}

/** Útil para testes: substitui o estado em memória e opcionalmente o arquivo. */
function _setStateForTest(next, file) {
  if (file) state._file = file;
  current = next;
}

// ── Perfis ───────────────────────────────────────────────────────────────

function getProfiles() {
  return current.profiles;
}

function getProfile(profileKey) {
  if (!PROFILE_KEYS[String(profileKey || "").toUpperCase()] && profileKey !== PROFILE_KEYS.CAIQUE && profileKey !== PROFILE_KEYS.ESPOSA) {
    return null;
  }
  const key = profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : PROFILE_KEYS.CAIQUE;
  return current.profiles[key];
}

function saveProfile(profileKey, data = {}) {
  if (!PROFILE_KEYS[String(profileKey || "").toUpperCase()] && profileKey !== PROFILE_KEYS.CAIQUE && profileKey !== PROFILE_KEYS.ESPOSA) {
    return { error: `Perfil inválido. Use: ${Object.keys(PROFILE_KEYS).join(", ")}` };
  }
  const key = profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : PROFILE_KEYS.CAIQUE;
  const prev = current.profiles[key] || {};
  current.profiles[key] = {
    ...prev,
    ...data,
    name: data.name || prev.name || PROFILE_LABELS[key],
    updatedAt: new Date().toISOString(),
  };
  const result = save();
  return result.ok ? { ok: true, profile: current.profiles[key] } : result;
}

// ── Vagas ────────────────────────────────────────────────────────────────

function jobId() {
  return crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addJob(job = {}) {
  const profileKey = job.profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : (job.profileKey || PROFILE_KEYS.CAIQUE);
  if (!job.title) return { error: "Vaga sem título" };
  if (!job.url && !job.company) return { error: "Informe ao menos o link ou a empresa da vaga" };

  const normUrl = String(job.url || "").trim().toLowerCase();
  if (normUrl && current.jobs.some((j) => j.url && j.url.toLowerCase() === normUrl)) {
    return { error: "Vaga já cadastrada (mesmo link)" };
  }

  const entry = {
    id: jobId(),
    profileKey,
    title: String(job.title).slice(0, 200),
    company: String(job.company || "").slice(0, 150),
    location: String(job.location || "").slice(0, 120),
    remote: String(job.remote || "").slice(0, 40),
    url: String(job.url || "").slice(0, 1000),
    source: String(job.source || "manual").slice(0, 60),
    foundAt: new Date().toISOString(),
    status: VALID_STATUS.includes(job.status) ? job.status : JOB_STATUS.NOVA,
    appliedAt: job.status === JOB_STATUS.ENVIADA ? new Date().toISOString() : null,
    notes: String(job.notes || "").slice(0, 2000),
  };

  current.jobs.unshift(entry);
  const result = save();
  return result.ok ? { ok: true, job: entry } : result;
}

function listJobs({ profileKey, status } = {}) {
  let jobs = current.jobs;
  if (profileKey && (profileKey === PROFILE_KEYS.CAIQUE || profileKey === PROFILE_KEYS.ESPOSA)) {
    jobs = jobs.filter((j) => j.profileKey === profileKey);
  }
  if (status && VALID_STATUS.includes(status)) {
    jobs = jobs.filter((j) => j.status === status);
  }
  return { jobs, total: jobs.length };
}

function getJob(id) {
  return current.jobs.find((j) => j.id === id) || null;
}

function updateJobStatus(id, status, { appliedAt } = {}) {
  if (!VALID_STATUS.includes(status)) {
    return { error: `Status inválido. Use: ${VALID_STATUS.join(", ")}` };
  }
  const job = getJob(id);
  if (!job) return { error: "Vaga não encontrada" };
  job.status = status;
  if (status === JOB_STATUS.ENVIADA) job.appliedAt = appliedAt || new Date().toISOString();
  if (status !== JOB_STATUS.ENVIADA) job.appliedAt = null;
  const result = save();
  return result.ok ? { ok: true, job } : result;
}

function removeJob(id) {
  const before = current.jobs.length;
  current.jobs = current.jobs.filter((j) => j.id !== id);
  if (current.jobs.length === before) return { error: "Vaga não encontrada" };
  const result = save();
  return result.ok ? { ok: true } : result;
}

// ── Stats (para workspace e respostas do WhatsApp) ───────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStats() {
  const byProfile = {
    [PROFILE_KEYS.CAIQUE]: { total: 0, enviadas: 0, pendentes: 0 },
    [PROFILE_KEYS.ESPOSA]: { total: 0, enviadas: 0, pendentes: 0 },
  };
  let total = 0;
  let enviadas = 0;
  let enviadasHoje = 0;
  let pendentes = 0;
  let preparadas = 0;

  for (const j of current.jobs) {
    total++;
    const key = j.profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : PROFILE_KEYS.CAIQUE;
    byProfile[key].total++;
    if (j.status === JOB_STATUS.ENVIADA) {
      enviadas++;
      byProfile[key].enviadas++;
      if (j.appliedAt && new Date(j.appliedAt) >= startOfToday()) enviadasHoje++;
    } else if (j.status !== JOB_STATUS.DESCARTADA) {
      pendentes++;
      byProfile[key].pendentes++;
      if (j.status === JOB_STATUS.PREPARADA) preparadas++;
    }
  }

  return { total, enviadas, enviadasHoje, pendentes, preparadas, byProfile };
}

// ── Busca de vagas (web_search via Firecrawl + fallback DuckDuckGo) ─────

function webSearch(query, numResults) {
  const keys = state.readSecretStore ? state.readSecretStore() : {};
  if (firecrawl.hasKey(keys)) {
    try {
      const baseUrlSetting = (state.db?.getSetting && state.db.getSetting("firecrawlBaseUrl", "")) || "";
      if (baseUrlSetting) firecrawl.setBaseUrl(baseUrlSetting);
      return firecrawl.search(query, { limit: numResults }, keys.firecrawl);
    } catch (err) {
      // fallback abaixo
    }
  }
  return new Promise((resolve) => {
    const https = require("https");
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const results = [];
        const regex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        const links = [];
        const titles = [];
        const snippets = [];
        let match;
        while ((match = regex.exec(data)) && links.length < numResults) {
          links.push(match[1]);
          titles.push(match[2].replace(/<[^>]+>/g, "").trim());
        }
        while ((match = snippetRegex.exec(data)) && snippets.length < numResults) {
          snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
        }
        for (let i = 0; i < Math.min(links.length, numResults); i++) {
          results.push({ title: titles[i] || "", url: links[i] || "", snippet: snippets[i] || "" });
        }
        resolve({ results, query, engine: "duckduckgo" });
      });
    });
    req.on("error", (e) => resolve({ error: e.message, query }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ error: "Busca expirou", query }); });
  });
}

/**
 * Busca vagas na web e retorna candidatas prontas para revisão (não salva).
 * query: termos da busca. profileKey: qual perfil a vaga pertence.
 */
async function searchJobs(query, profileKey, { limit = 8, autoAdd = false } = {}) {
  if (!query) return { error: "Informe uma busca de vagas (ex.: 'desenvolvedor react remoto')" };
  const key = profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : PROFILE_KEYS.CAIQUE;
  const q = `vagas de emprego ${query} site:linkedin.com OR site:indeed.com OR site:catho.com.br OR site:glassdoor.com OR site:vagas.com.br`;
  const doSearch = searchImplForTest || webSearch;
  const res = await doSearch(q, limit);
  if (res.error) return { error: res.error };
  const candidates = (res.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title.replace(/\s+/g, " ").trim(),
      url: r.url,
      company: "",
      location: "",
      remote: "",
      source: res.engine || "web",
      snippet: r.snippet || "",
    }));
  if (autoAdd) {
    const added = [];
    for (const c of candidates) {
      const r = addJob({ ...c, profileKey: key });
      if (r.ok) added.push(r.job);
    }
    return { ok: true, added, total: added.length };
  }
  return { ok: true, candidates, total: candidates.length };
}

// ── Geração de perfil atraente para recrutadores ─────────────────────────
// Gera conteúdo determinístico (headline/sobre/skills) com base nos dados do
// perfil. O agente (LLM) refina e personaliza usando as tools + web_search.

function areaKeywords(area = "") {
  const a = area.toLowerCase();
  const map = {
    "front": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Next.js", "UI/UX", "Performance Web"],
    "back": ["Node.js", "TypeScript", "APIs REST", "Bancos de dados", "SQL", "Microsserviços", "Arquitetura"],
    "mobile": ["React Native", "Android", "iOS", "App Development", "Expo", "Publicação de apps"],
    "dados": ["Python", "SQL", "ETL", "Dashboards", "BI", "Estatística", "Machine Learning"],
    "devops": ["Docker", "CI/CD", "AWS", "Linux", "Kubernetes", "Automação", "Observabilidade"],
    "qa": ["Testes automatizados", "CI", "Cypress", "Qualidade de software", "Testes de API"],
    "ia": ["IA Generativa", "LLM", "Python", "Pipelines de IA", "Fine-tuning", "RAG"],
  };
  for (const [k, v] of Object.entries(map)) {
    if (a.includes(k)) return v;
  }
  return ["Trabalho em equipe", "Comunicação", "Resolução de problemas", "Organização", "Aprendizado contínuo"];
}

function suggestHeadlines(profile = {}) {
  const area = profile.area || "desenvolvedor(a)";
  const level = profile.level ? `${profile.level} ` : "";
  const city = profile.city ? ` | ${profile.city}` : "";
  const remote = profile.remote ? ` (${profile.remote})` : "";
  const name = profile.name || "";
  return [
    `${level}${area}${remote}${city}`,
    `${level}${area} | ${(profile.targetRoles || []).slice(0, 2).join(" · ") || "Buscando novos desafios"}${remote}`,
    `${name ? name.split(" ")[0] + " · " : ""}${level}${area} | ${(profile.targetRoles || []).slice(0, 1)[0] || "Resultados"}${remote}${city}`,
  ];
}

function suggestAbout(profile = {}) {
  const area = profile.area || "desenvolvedor(a)";
  const level = profile.level || "profissional";
  const skills = (profile.skills || []).slice(0, 6);
  const targets = (profile.targetRoles || []).slice(0, 3).join(", ");
  const goals = targets ? ` Atualmente em busca de oportunidades como ${targets}.` : "";
  const skillLine = skills.length ? ` Principais competências: ${skills.join(", ")}.` : "";
  return [
    `Sou ${level} em ${area}, com experiência prática em entregar soluções com qualidade e foco em resultado.${skillLine}${goals}`,
    `${area} ${level} com histórico de projetos concluídos e melhoria contínua.${skillLine} Valorizo comunicação clara, colaboração e aprendizado constante.${goals}`,
  ];
}

function generateProfileContent(profileKey) {
  const profile = getProfile(profileKey);
  if (!profile) return { error: "Perfil não encontrado" };
  const name = profile.name || PROFILE_LABELS[profileKey];
  const keywords = (profile.skills && profile.skills.length ? profile.skills : areaKeywords(profile.area));
  return {
    ok: true,
    profileKey,
    name,
    headlines: suggestHeadlines(profile),
    about: suggestAbout(profile),
    keywords: keywords.slice(0, 12),
    checklist: [
      "Foto profissional, sorriso sutil, fundo neutro",
      "Headline com a vaga/área-alvo (não apenas o cargo atual)",
      "Sobre com números: anos de experiência, projetos, impacto",
      "Experiências com verbos de ação e resultados mensuráveis",
      "Skills com as palavras-chave das vagas que você quer",
      "Recomendações e conquistas (certificações, prêmios)",
    ],
  };
}

// ── Preparação de candidatura (currículo + carta) ────────────────────────

function appsDir() {
  if (!state.userDataPath) return null;
  return path.join(state.userDataPath, "career", "applications");
}

function escapeMd(text = "") {
  return String(text).replace(/[`*_~#\[\]()>|\\]/g, "\\$&");
}

function buildResumeMarkdown(profile = {}, job = {}) {
  const name = profile.name || "";
  const headline = profile.headline || (profile.area ? `${profile.level || ""} ${profile.area}`.trim() : "");
  const city = profile.city || "";
  const linkedin = profile.linkedinUrl ? ` | LinkedIn: ${profile.linkedinUrl}` : "";
  const skills = (profile.skills || []).join(", ");
  const experiences = Array.isArray(profile.experiences) && profile.experiences.length
    ? profile.experiences.map((e) => {
      const period = e.period ? ` (${e.period})` : "";
      const desc = e.description ? `\n  ${e.description}` : "";
      return `- ${e.role || ""} — ${e.company || ""}${period}${desc}`;
    }).join("\n")
    : "- (adicione suas experiências no perfil para gerar um currículo completo)";

  const education = Array.isArray(profile.education) && profile.education.length
    ? profile.education.map((e) => `- ${e.course || ""} — ${e.institution || ""}${e.year ? ` (${e.year})` : ""}`).join("\n")
    : "- (adicione sua formação no perfil)";

  const targetJob = job.title ? `\n\n**Vaga:** ${job.title}${job.company ? ` — ${job.company}` : ""}` : "";

  return `# ${name}
${headline}
${city}${linkedin}

---

## Objetivo${targetJob}

Busco oportunidade alinhada às minhas competências, onde eu possa agregar com consistência e crescimento.

## Competências
${skills || "- (adicione suas skills no perfil)"}

## Experiência Profissional
${experiences}

## Formação
${education}
`;
}

function buildCoverLetterMarkdown(profile = {}, job = {}, querySummary = "") {
  const name = profile.name || "";
  const area = profile.area || "";
  const skills = (profile.skills || []).slice(0, 5).join(", ");
  const context = querySummary || (job.title ? `A vaga de ${job.title}` : "A vaga anunciada");
  return `# Carta de apresentação

**${name}**

Prezados(as),

Estou me candidatando a ${context}${job.company ? ` na ${job.company}` : ""}. Minha trajetória em ${area || "minha área de atuação"} e competências em ${skills || "aprendizado contínuo"} me motivam a contribuir com a equipe.

Valorizo comunicação clara, trabalho em equipe e resultados. Tenho disponibilidade para alinhar detalhes e uma entrevista no horário mais conveniente.

Agradeço a oportunidade e fico à disposição.

Atenciosamente,
**${name}**
`;
}

/**
 * Prepara currículo + carta personalizados para uma vaga e grava em
 * userData/career/applications/. Retorna os caminhos + preview.
 */
function prepareApplication(jobIdOrUrl, profileKey, { querySummary } = {}) {
  let job = null;
  if (jobIdOrUrl && typeof jobIdOrUrl === "string" && jobIdOrUrl.length < 60) {
    job = getJob(jobIdOrUrl);
  }
  if (!job && jobIdOrUrl && typeof jobIdOrUrl === "string") {
    job = { id: "manual", url: jobIdOrUrl, title: "candidatura", company: "", profileKey };
  }
  if (!job) return { error: "Vaga não encontrada. Informe o id da vaga ou o link dela." };

  const key = job.profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : (profileKey === PROFILE_KEYS.ESPOSA ? PROFILE_KEYS.ESPOSA : PROFILE_KEYS.CAIQUE);
  const profile = getProfile(key) || getProfile(PROFILE_KEYS.CAIQUE);
  if (!profile) return { error: "Perfil não encontrado" };

  const dir = appsDir();
  if (!dir) return { error: "career não inicializado" };
  try {
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safeJob = (job.title || "candidatura").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const base = `${stamp}_${safeJob}`;
    const resumePath = path.join(dir, `${base}_curriculo.md`);
    const letterPath = path.join(dir, `${base}_carta.md`);
    const resumeMd = buildResumeMarkdown(profile, job);
    const letterMd = buildCoverLetterMarkdown(profile, job, querySummary);
    fs.writeFileSync(resumePath, resumeMd, "utf8");
    fs.writeFileSync(letterPath, letterMd, "utf8");
    const result = { ok: true, resumePath, letterPath, jobId: job.id === "manual" ? null : job.id };
    if (job.id && job.id !== "manual") {
      updateJobStatus(job.id, JOB_STATUS.PREPARADA);
    }
    return result;
  } catch (err) {
    state.log?.warn?.(`[career] prepareApplication falhou: ${err.message}`);
    return { error: err.message };
  }
}

// ── Respostas determinísticas para o WhatsApp ────────────────────────────

const CAREER_QUERY_REGEX = /(vaga|vagas|emprego|empregos|curriculo|currículo|candidatura|candidaturas|mandou|enviou|enviado|achou|procurou|procura|procure|busca|buscar|busque|acha|ache)/i;

/** Verbos/marcadores que sinalizam intenção de BUSCAR vagas (não só status). */
const JOB_SEARCH_INTENT = /\b(procura|procure|busca|buscar|busque|acha|ache|encontra|encontre|achei|quero|minha area|área)\b|\b(vaga|vagas|emprego|empregos|oportunidade|oportunidades)\s+(de|em|e|para|como)/i;

/** Extrai a área/query de uma mensagem de busca. Retorna "" se não houver query. */
function extractJobQuery(text = "") {
  if (!text) return "";
  const t = String(text).toLowerCase().trim();
  if (!JOB_SEARCH_INTENT.test(t)) return "";
  let q = t
    .replace(/^(você|voce|tu|pode|pra|para|me|poderia|consegue)?\s*/, "")
    .replace(/^(procura|procure|busca|buscar|busque|acha|ache|encontra|encontre|achei|quero|me ajud[ae] a achar|me ajud[ae] a buscar)\s+/, "")
    .replace(/^(vagas|vaga|empregos|emprego|oportunidades|oportunidade)\s*(de|e|em|para|por)?\s*/, "")
    .replace(/^(uma|um|alguma|algum)\s+/, "")
    .replace(/[\?\!\.;]+$/g, "")
    .trim();
  // Remove uma possível ancoragem de status que sobrasse a frente.
  q = q.replace(/\s*(para mim|pra mim|por favor|hoje|agora|vaga|vagas)\s*$/i, "").trim();
  const stop = /^(uma|um|de|da|do|em|para|por|a|o|as|os|e|ou|com|que|na|no|nessa|nesse|devo|mim|qual|quais|existe|tem|vai)?$/i;
  if (!q || stop.test(q)) return "";
  return q;
}

/** Formata a lista de vagas recém-encontradas para envio no WhatsApp. */
function formatJobResults(query, jobs) {
  const lines = [`📄 *Vagas de ${query}*`];
  if (!jobs || !jobs.length) {
    lines.push(`Não achei vagas para *${query}* agora. Tenta com outras palavras (ex.: "desenvolvedor react remoto").`);
    return lines.join("\n");
  }
  lines.push(`Encontrei ${jobs.length} nova(s) e já deixo salvas no workspace Carreiras:`);
  jobs.slice(0, 6).forEach((j, i) => {
    lines.push(`${i + 1}. *${j.title || "Vaga"}*${j.company ? ` — ${j.company}` : ""}`);
    if (j.location) lines.push(`   📍 ${j.location}`);
    lines.push(`   🔗 ${j.url}`);
  });
  lines.push(`\nQuer que eu prepare o currículo de alguma? Manda o número da vaga.`);
  return lines.join("\n");
}

/** Resposta determinística de status (sem LLM). */
function buildStatusReply() {
  const s = getStats();
  const lines = [];
  lines.push(`🔎 *Status das vagas agora*`);
  lines.push(`• Encontradas: *${s.total}*`);
  lines.push(`   - Caíque: ${s.byProfile[PROFILE_KEYS.CAIQUE].total} | Esposa: ${s.byProfile[PROFILE_KEYS.ESPOSA].total}`);
  lines.push(`• Currículo enviado: *${s.enviadas}*${s.enviadasHoje ? ` (hoje: ${s.enviadasHoje})` : ""}`);
  lines.push(`• Pendentes de envio: *${s.pendentes}*${s.preparadas ? ` (${s.preparadas} com currículo pronto)` : ""}`);
  if (s.total > 0 && s.pendentes > 0) {
    lines.push(`\nQuer que eu liste as vagas mais novas ou prepare o currículo de alguma?`);
  } else if (s.total === 0) {
    lines.push(`\nAinda não encontrei vagas cadastradas. Me diga a área (ex.: "procura vaga de dev") que eu busco.`);
  }
  return lines.join("\n");
}

/**
 * Resposta determinística do agente Carreiras no WhatsApp.
 * Detecta intenção de buscar vagas (ex.: "procura vaga de dev") e faz a
 * busca real (web_search), salvando as encontradas. Caso contrário,
 * responde com o status do pipeline.
 */
async function buildWhatsAppReply(text) {
  const q = extractJobQuery(text || "");
  if (q) {
    const res = await searchJobs(q, PROFILE_KEYS.CAIQUE, { limit: 6, autoAdd: true });
    if (res.error) return `⚠️ Não consegui buscar vagas agora: ${res.error}. Tenta de novo em instantes.`;
    return formatJobResults(q, res.added || []);
  }
  return buildStatusReply();
}

/** Verifica se o texto parece pergunta sobre vagas (para rota determinística). */
function isCareerQuestion(text) {
  return Boolean(text && (CAREER_QUERY_REGEX.test(text) || JOB_SEARCH_INTENT.test(text)));
}

// ── GetState (para workspace + tools) ────────────────────────────────────

function getState() {
  return {
    profiles: getProfiles(),
    jobs: current.jobs,
    stats: getStats(),
    meta: {
      statusLabels: JOB_STATUS,
      profileKeys: PROFILE_KEYS,
      profileLabels: PROFILE_LABELS,
      supportedSearches: [
        "desenvolvedor react remoto",
        "estágio desenvolvimento",
        "analista de dados júnior",
        "desenvolvedor pleno",
      ],
    },
  };
}

module.exports = {
  init,
  _setStateForTest,
  _setSearchImplForTest,
  getState,
  getProfiles,
  getProfile,
  saveProfile,
  addJob,
  listJobs,
  getJob,
  updateJobStatus,
  removeJob,
  getStats,
  searchJobs,
  generateProfileContent,
  prepareApplication,
  buildWhatsAppReply,
  isCareerQuestion,
  extractJobQuery,
  JOB_STATUS,
  VALID_STATUS,
  PROFILE_KEYS,
  PROFILE_LABELS,
};

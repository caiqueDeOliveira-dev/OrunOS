// electron/tools.cjs
//
// Autonomous tool definitions and implementations for Hampton.
// Each tool has a JSON Schema definition (OpenAI tools format) and an
// execute() function that returns a result object.

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");
const https = require("https");
const http = require("http");
const log = require("electron-log");
const logger = require("./logger.cjs");
const { getErrorMessage } = require("./error-messages.cjs");
const auditLog = require("./audit-log.cjs");
const developerTools = require("./developer-tools.cjs");
const firecrawl = require("./firecrawl.cjs");
const discordBridge = require("./discord-bridge.cjs");
const careerBridge = require("./career.cjs");
const neuralHandlers = require("./ipc/neural-handlers.cjs");
const githubService = require("./github-service.cjs");

const GITHUB_TOKEN_SLOT = "orun.github.token";

async function getGithubToken() {
  try {
    if (ctx && ctx.secretStore && typeof ctx.secretStore.get === "function") {
      return await ctx.secretStore.get(GITHUB_TOKEN_SLOT);
    }
  } catch {}
  return null;
}

async function executeGithubTool(name, args) {
  const token = await getGithubToken();
  if (!token) {
    return {
      ok: false,
      error:
        "GitHub não conectado ao Orun Code. Conecte um token em Orun Code → GitHub (etapa de Fase 1 do GitHub Control Center).",
    };
  }
  try {
    if (name === "github_auth_status") return githubService.getAuthStatus(token);
    if (name === "github_repos_list") return githubService.listRepos(token, args || {});
    if (name === "github_repo_info") return githubService.getRepo(token, args.owner, args.repo);
    if (name === "github_user_info") return githubService.getUser(token, args.login);
    if (name === "github_repo_doctor") {
      const report = await githubService.doctorReport(token, { staleDays: args.staleDays });
      if (!report.ok) return report;
      return githubService.summarizeDoctorReport(report);
    }
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
  return { ok: false, error: `Ferramenta GitHub desconhecida: ${name}` };
}

/** Acesso lazy ao Knowledge Engine (criado depois do init no main). */
function getKnowledgeEngine() {
  try {
    return ctx && typeof ctx.getKnowledgeEngine === "function" ? ctx.getKnowledgeEngine() : null;
  } catch {
    return null;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Rate limiter (simple in-memory) ────────────────────────────────────
const agentRateLimiter = {
  _calls: {},
  checkToolRate(agentId) {
    const now = Date.now();
    const window = 60000;
    const maxCalls = 60;
    const calls = this._calls[agentId] || [];
    const recent = calls.filter((t) => now - t < window);
    if (recent.length >= maxCalls) {
      return { allowed: false, reason: `Rate limit: ${maxCalls} calls per ${window / 1000}s exceeded` };
    }
    return { allowed: true };
  },
  recordToolCall(agentId) {
    if (!this._calls[agentId]) this._calls[agentId] = [];
    this._calls[agentId].push(Date.now());
  },
};

// ── Timeout ─────────────────────────────────────────────────────────────
const TOOL_TIMEOUT = 30000; // 30 seconds

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        logger.tools.error(`[TOOL TIMEOUT] ${label} exceeded ${ms}ms`);
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ── Security: blocked commands ──────────────────────────────────────────
// Individual patterns (split for ReDoS safety)
const BLOCKED_PATTERNS = [
  /\brm\s+(-\w*\s+)*(\/|~)/i,
  /\brmdir\s+\/[sq]/i,
  /\bdel\s+\/[sfq]/i,
  /\bformat\s+[a-z]:/i,
  /\bmkfs\./i,
 /\bdd\s+of=/i,
  /\breg\s+delete/i,
  /\bsc\s+delete/i,
  /\bnet\s+user/i,
  /\bpowershell\s+(-\w*\s+)*(-enc|-encodedcommand|IEX|Invoke-Expression|Invoke-WebRequest|DownloadString|DownloadFile|Net\.WebClient)/i,
  /\bcmd\s+\/[ce]\s+.*\|.*(\s*bash|\s*sh|\s*powershell)/i,
  /\bcurl.*\|.*(\s*sh|\s*bash)/i,
  /\bwget.*\|.*(\s*sh|\s*bash)/i,
  /\btakeown/i,
  /\bicacls.*\/grant/i,
  /\bbcdedit/i,
  /\bdiskpart/i,
  /\btaskkill\s+\/f/i,
  /\bStop-Process/i,
  /\bGet-Process.*\|\s*(Kill|Stop)/i,
  /\bcertutil\s+-decode/i,
  /\breagentc/i,
  /\bdism\s+\//i,
];

function isCommandSafe(command) {
  return !BLOCKED_PATTERNS.some((re) => re.test(command));
}

function escapeShellArg(arg) {
  return arg.replace(/["'`\\$();|&{}!<>]/g, "\\$&");
}

function isCommandArgsSafe(command, args) {
  if (/[;&|`$(){}!<>]/.test(command)) return false;
  if (args && /[;&|`$(){}!<>]/.test(args)) return false;
  return true;
}

// ── Security: file path sandboxing ─────────────────────────────────────
let allowedRoots = [];

function setAllowedRoots(roots) {
  allowedRoots = roots.filter(Boolean).map(r => path.resolve(r));
}

function isPathAllowed(filePath) {
  if (allowedRoots.length === 0) {
    // Default: allow only the workspace and userData
    try {
      const resolved = path.resolve(filePath);
      const defaults = [process.cwd()];
      if (process.env.PORTABLE_EXECUTABLE_DIR) defaults.push(process.env.PORTABLE_EXECUTABLE_DIR);
      return defaults.some((root) => resolved.startsWith(root));
    } catch { return false; }
  }
  try {
    const resolved = path.resolve(filePath);
    return allowedRoots.some((root) => resolved.startsWith(root));
  } catch { return false; }
}

let ctx = null; // { db, socialMedia }

function init(userDataPath, context) {
  ctx = context || null;
  discordBridge.init(ctx);
  careerBridge.init({ ...ctx, userDataPath });
  auditLog.init(userDataPath);
}

/** Base dir for relative paths in file tools — the developer workspace. */
function getWorkspaceDir() {
  try {
    if (ctx && ctx.db && typeof ctx.db.getSetting === "function") {
      const ws = ctx.db.getSetting("developerWorkspace", "");
      if (typeof ws === "string" && ws.trim()) return ws.trim();
    }
  } catch {}
  return process.cwd();
}

function resolveAgentPath(p) {
  if (!p) return getWorkspaceDir();
  return path.isAbsolute(p) ? p : path.join(getWorkspaceDir(), p);
}

// ── HTTP helpers ────────────────────────────────────────────────────────

function fetchUrl(urlString, format = "text", redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error("Too many redirects"));
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, format, redirectCount + 1).then(resolve, reject);
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (format === "html") resolve(data);
        else if (format === "markdown") resolve(stripHtml(data));
        else resolve(stripTags(data));
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
  });
}

function stripTags(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "## $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Tool definitions (OpenAI tools format) ──────────────────────────────

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file. Returns text content. Use start_line/end_line for large files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read" },
          start_line: { type: "number", description: "Start line (0-indexed, optional)" },
          end_line: { type: "number", description: "End line exclusive (0-indexed, optional)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with the given content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write" },
          content: { type: "string", description: "Content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Edit a file by searching for exact text and replacing it. The search string must match exactly.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to edit" },
          search: { type: "string", description: "Exact text to find" },
          replace: { type: "string", description: "Replacement text" },
        },
        required: ["path", "search", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories at a path. Returns names with trailing / for directories.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to list" },
          recursive: { type: "boolean", description: "List recursively (default false)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Find files matching a glob pattern. Use ** for recursive matching.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: 'Glob pattern, e.g. "**/*.ts" or "src/**"' },
          path: { type: "string", description: "Base directory (default: cwd)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_content",
      description: "Search file contents for text or regex. Returns matching lines with file:line references.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Text or regex to search for" },
          path: { type: "string", description: "Directory to search in (default: cwd)" },
          include: { type: "string", description: "File glob to include, e.g. *.ts" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Execute a shell command. Returns stdout and stderr. Timeout: 30s default.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to run" },
          cwd: { type: "string", description: "Working directory (optional)" },
          timeout: { type: "number", description: "Timeout ms (default 30000)" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch content from a URL. Returns page text or markdown. Uses Firecrawl (clean markdown) when a key is configured, plain fetch otherwise.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to fetch" },
          format: { type: "string", enum: ["text", "markdown"], description: "Output format (default text)" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_save",
      description: "Save information to long-term memory for later recall across sessions.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Short title for this memory" },
          content: { type: "string", description: "Information to remember" },
          tags: { type: "array", items: { type: "string" }, description: "Tags for categorization" },
        },
        required: ["key", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_search",
      description: "Search long-term memory for previously saved information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify",
      description: "Send a desktop notification to the user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Notification title" },
          body: { type: "string", description: "Notification body text" },
        },
        required: ["title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_task",
      description: "Schedule a reminder or recurring task.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          message: { type: "string", description: "Message to show" },
          delay_seconds: { type: "number", description: "Delay in seconds before firing" },
          recurring: { type: "boolean", description: "If true, repeat daily (default false)" },
        },
        required: ["title", "message", "delay_seconds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_to_social",
      description: "Publish content to social media platforms (Instagram, TikTok, X/Twitter) via n8n webhooks. The content must be ready to publish.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["instagram", "tiktok", "twitter"], description: "Target platform" },
          text: { type: "string", description: "Post text / caption content" },
          hook: { type: "string", description: "Attention-grabbing hook (first line)" },
          hashtags: { type: "array", items: { type: "string" }, description: "Hashtags without #" },
          format: { type: "string", enum: ["stories", "reels", "carousel", "post", "thread"], description: "Content format" },
          imageUrl: { type: "string", description: "Image URL for the post (optional)" },
          videoUrl: { type: "string", description: "Video URL for Reels/TikTok (optional)" },
        },
        required: ["platform", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_to_instagram_direct",
      description: "Publish directly to Instagram via Meta Graph API (Development Mode). Requires Page Access Token + Instagram Business User ID configured in Settings → Integrations → Instagram Direct. Use this for posting to YOUR Instagram account without Postiz/n8n. Image or video required.",
      parameters: {
        type: "object",
        properties: {
          caption: { type: "string", description: "Post caption/text content" },
          imageUrl: { type: "string", description: "Image URL for the post (optional, but required if no video)" },
          videoUrl: { type: "string", description: "Video URL for Reels (optional)" },
        },
        required: ["caption"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_to_linkedin_direct",
      description: "Publish directly to LinkedIn via LinkedIn API v2. Requires Access Token + Person URN configured in Settings → Integrations → LinkedIn Direct. Use this for posting to YOUR LinkedIn profile without Postiz/n8n. Image optional.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Post text content" },
          imageUrl: { type: "string", description: "Image URL for the post (optional)" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image using Fal.ai. Returns a URL you can use for social media posts. Use this when you need an image for Instagram or TikTok.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed text description of the image to generate" },
          model: { type: "string", description: "Fal.ai model ID (default: fal-ai/flux/schnell)", enum: ["fal-ai/flux/schnell", "fal-ai/flux/dev", "fal-ai/flux/pro", "fal-ai/stable-diffusion-xl"] },
          imageSize: { type: "string", description: "Image size", enum: ["square_hd", "landscape_16_9", "portrait_9_16", "landscape_4_3"] },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_video",
      description: "Generate a video using MiniMax-H3 (API v2). Text-to-video, image-to-video (first/last frame), or reference-to-video (up to 9 images, 3 clips, 3 audio tracks). Async task — polls until done. Requires the MiniMax API key set in Settings → API Keys.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed text description of the video to generate (required, max 7000 chars)" },
          resolution: { type: "string", description: "Video resolution", enum: ["768P", "2K"] },
          duration: { type: "number", description: "Duration in seconds (4-15)", enum: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
          ratio: { type: "string", description: "Aspect ratio. Required for text-to-video (not 'adaptive'); ignored (adaptive) for image-to-video.", enum: ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"] },
          firstFrameUrl: { type: "string", description: "Image URL for image-to-video first frame (mutually exclusive with reference_*)", },
          lastFrameUrl: { type: "string", description: "Image URL for image-to-video last frame (mutually exclusive with reference_*)" },
          referenceImageUrls: { type: "array", items: { type: "string" }, description: "Reference image URLs (reference-to-video, max 9)" },
          referenceVideoUrls: { type: "array", items: { type: "string" }, description: "Reference video URLs (reference-to-video, max 3, 2-15s each)" },
          referenceAudioUrls: { type: "array", items: { type: "string" }, description: "Reference audio URLs (reference-to-video, max 3, 2-15s each)" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_agent",
      description: "Trigger another agent to perform a task. Useful for inter-agent automation (e.g., when Health logs a meal, trigger Marketing to create content).",
      parameters: {
        type: "object",
        properties: {
          agent: { type: "string", description: "Target agent name (Health, Finance, Developer, Teacher, Designer, Creator, Marketing, Automation, System)" },
          message: { type: "string", description: "The message/task to send to the target agent" },
        },
        required: ["agent", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information. Returns search results with titles, URLs, and snippets. Uses Firecrawl search when a key is configured, DuckDuckGo otherwise. Use this when you need to find current information, news, or any web content.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          numResults: { type: "number", description: "Number of results (default 5, max 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_get_state",
      description:
        "Retorna o estado completo do agente Carreiras: perfis (Caíque/Esposa), lista de vagas cadastradas com status e estatísticas (total, enviadas, enviadas hoje, pendentes). Use antes de qualquer outra tool de carreira para entender o cenário.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "career_search_jobs",
      description:
        "Busca vagas de emprego na web (LinkedIn, Indeed, Catho, Glassdoor, Vagas.com). Retorna candidatas para REVISÃO — não cadastra automaticamente. Use a query com a área e perfil desejados (ex.: 'desenvolvedor react remoto'). Informe profileKey para associar ao perfil correto.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termos da busca de vagas, ex.: 'desenvolvedor pleno remoto'" },
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Para qual perfil a busca é (padrão: caique)" },
          limit: { type: "number", description: "Máximo de resultados (padrão 8)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_add_job",
      description:
        "Cadastra manualmente uma vaga encontrada (por link ou dados) no rastreador de vagas. Evita duplicatas por link. A vaga nasce com status 'nova'.",
      parameters: {
        type: "object",
        properties: {
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Perfil dono da vaga (padrão: caique)" },
          title: { type: "string", description: "Título da vaga (obrigatório)" },
          company: { type: "string", description: "Empresa" },
          location: { type: "string", description: "Localidade" },
          remote: { type: "string", description: "Remoto/Presencial/Híbrido" },
          url: { type: "string", description: "Link da vaga (obrigatório se sem empresa)" },
          notes: { type: "string", description: "Anotações" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_list_jobs",
      description:
        "Lista vagas cadastradas, opcionalmente filtradas por perfil (caique/esposa) e/ou status (nova, curriculo_pronto, enviada, descartada).",
      parameters: {
        type: "object",
        properties: {
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Filtrar por perfil" },
          status: { type: "string", enum: ["nova", "curriculo_pronto", "enviada", "descartada"], description: "Filtrar por status" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_update_job_status",
      description:
        "Atualiza o status de uma vaga: 'enviada' (candidatura efetivada — NUNCA marque sem o usuário confirmar que enviou no portal), 'curriculo_pronto' (currículo/carta preparados), 'descartada'. O envio de candidatura é sempre feito pelo usuário no LinkedIn/portal; o agente prepara e confirma.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Id da vaga" },
          status: { type: "string", enum: ["nova", "curriculo_pronto", "enviada", "descartada"], description: "Novo status" },
        },
        required: ["id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_save_profile",
      description:
        "Salva/atualiza os dados de um perfil de candidatura (Caíque ou Esposa): área, nível, cidade, regime remoto, cargos-alvo, headline, sobre, skills, experiências, formação, link do LinkedIn. Use para manter os perfis atualizados para busca e geração de currículo.",
      parameters: {
        type: "object",
        properties: {
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Qual perfil salvar" },
          data: {
            type: "object",
            description: "Campos do perfil: { area, level, city, remote, targetRoles[], headline, about, skills[], experiences[], education[], linkedinUrl }",
          },
        },
        required: ["profileKey", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_generate_profile",
      description:
        "Gera conteúdo otimizado para recrutadores de um perfil: sugestões de headline, seção 'Sobre', palavras-chave (keywords) e um checklist de LinkedIn. Baseado nos dados atuais do perfil.",
      parameters: {
        type: "object",
        properties: {
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Qual perfil gerar conteúdo" },
        },
        required: ["profileKey"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_prepare_application",
      description:
        "PREPARA a candidatura de uma vaga: gera currículo (Markdown) e carta de apresentação personalizados com os dados do perfil e grava em userData/career/applications. Recebe o id da vaga (ou link) e profileKey. Marca a vaga como 'curriculo_pronto'. O ENVIO é sempre feito manualmente pelo usuário.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Id da vaga cadastrada" },
          profileKey: { type: "string", enum: ["caique", "esposa"], description: "Perfil para gerar o currículo (padrão: perfil da vaga)" },
          querySummary: { type: "string", description: "Resumo da vaga para a carta de apresentação" },
        },
        required: ["jobId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "career_stats",
      description:
        "Retorna estatísticas de vagas e candidaturas (total, enviadas, enviadas hoje, pendentes, por perfil). Útil para responder perguntas como 'quantos currículos já mandou?'.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "neural_save_note",
      description:
        "Salva uma nota interligada no Neural (segundo cérebro). Use markdown denso no content com [[Título de outra nota]] SOMENTE quando houver relação real. Só salve conhecimento reutilizável — conversa trivial não vira nota.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título curto e reutilizável da nota (âncora para wikilinks)" },
          content: { type: "string", description: "Conteúdo em markdown, pt-BR, denso e autossuficiente" },
          tags: { type: "array", items: { type: "string" }, description: "Tags opcionais (máx 8)" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neural_search_notes",
      description:
        "Busca notas do Neural por termo (título, conteúdo e tags). Use ANTES de salvar para evitar duplicatas.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca" },
          limit: { type: "number", description: "Máximo de resultados (padrão 8)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neural_list_notes",
      description:
        "Lista as notas mais relevantes do Neural (títulos + resumo). Use antes de escrever novas notas.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Máximo de notas (padrão 20)" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neural_get_note",
      description: "Retorna uma nota completa do Neural por id ou título exato.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Id da nota (se souber)" },
          title: { type: "string", description: "Título exato da nota" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neural_backlinks_graph",
      description:
        "Retorna o mapa do Neural: nós (notas reais + conceitos órfãos), arestas ([[wikilinks]]) e backlinks por nota. Útil para enxergar conexões antes de linkar.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "rag_search",
      description: "Semantic search through long-term memory using AI embeddings. More intelligent than memory_search.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (natural language)" },
          tags: { type: "array", items: { type: "string" }, description: "Optional tag filter" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clipboard_read",
      description: "Read the current clipboard content (text).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "clipboard_write",
      description: "Write text to the clipboard.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to copy to clipboard" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "screenshot",
      description: "Take a screenshot of the current screen. Returns the screenshot as a base64 image that can be analyzed.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_action",
      description: "Execute a real action in the active workspace (audio processing, video editing, design manipulation, etc). The workspace must be open for this to work. Actions are processed in real-time by the renderer.",
      parameters: {
        type: "object",
        properties: {
          workspace: {
            type: "string",
            description: "Workspace ID: creator-audio, creator-video, designer, automation-flow, finance, health, teacher, marketing, system, developer, automotive-garage, home-ia, cyber-security",
          },
          action: {
            type: "string",
            description: "Action to execute. creator-audio: start_recording, stop_recording, toggle_metronome, tune_voice, tune_to_note, generate_beat, preview_note, normalize, add_reverb, add_delay, pitch_shift, time_stretch, set_eq, set_volume, play, pause, stop, load_audio, analyze, export_audio, get_realtime_data, generate_music, master_track, separate_stems, autotone, mix_tracks, apply_gain, list_music_models, list_autotone_presets. creator-video: add_clip, delete_clip, split_clip, add_effect, set_transition, set_text, export_video, get_timeline. designer: add_element, delete_element, change_bg, change_canvas_size, duplicate_element, export_design, get_elements, create_template, bring_forward, send_backward. automation-flow: add_node, delete_node, add_edge, delete_edge, simulate, get_flow, save_flow, load_flow, export_flow, import_flow. finance: add_transaction, delete_transaction, get_summary, get_transactions. health: log_meal, log_workout, log_metric, get_summary, get_trends, get_meal_history, log_body_measurement, get_body_measurements, add_exam, get_exams, delete_exam. teacher: add_quiz_question, get_quiz, clear_canvas, export_canvas, start_quiz, get_quiz_status, stop_quiz. marketing: add_campaign, pause_campaign, resume_campaign, get_campaigns, create_post, get_posts. system: execute_command, get_processes, get_resources. developer: read_file, write_file, list_files, execute_command. automotive-garage: add_vehicle, add_service_record, add_expense, get_fleet_summary, get_service_history, get_expenses. home-ia: list_devices, get_home_status, get_device_state, toggle_device, set_brightness, set_temperature, lock_door, run_automation, list_automations, create_automation, toggle_automation, list_scenes, activate_scene, send_voice_message. cyber-security: run_scan, get_report, list_findings, fix_finding, export_report, get_summary",
          },
          params: {
            type: "object",
            description: "Action parameters. Varies per action. Examples: { note:'C4' } for tune_to_note; { bpm:120, beats_per_bar:4 } for toggle_metronome; { bpm:140, style:'trap', bars:4 } for generate_beat; { template:'resume' } for create_template; { elementId:'elm_xxx' } for bring_forward/send_backward; { flowId:'default' } for save_flow/load_flow; { title:'Promoção', body:'50% OFF', channel:'Instagram' } for create_post; { metric:'weight', days:7 } for get_trends; { prompt:'beat trap', genre:'trap', duration:30 } for generate_music; { target_lufs:-14, profile:'balanced' } for master_track; { scale:'chromatic', strength:0.8 } for autotone; { tracks:[{audioBase64:'...',volume:1.0}] } for mix_tracks; { gain:1.5 } for apply_gain",
          },
        },
        required: ["workspace", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_workspace",
      description: "Open a workspace panel in the UI. You MUST call this before using workspace_action. The workspace will be mounted and its actions registered.",
      parameters: {
        type: "object",
        properties: {
          workspace: {
            type: "string",
            enum: ["creator-audio", "creator-video", "designer", "automation-flow", "finance", "health", "teacher", "marketing", "system", "developer", "automotive-garage", "juridico", "assistente-tecnico", "personal-assistant", "suporte", "home-ia", "cyber-security"],
            description: "Workspace ID to open",
          },
        },
        required: ["workspace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_play",
      description: "Control Spotify playback. Play, pause, skip, previous, set volume, seek, shuffle, repeat. Can also play a specific track/playlist/album by URI or search query.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pause", "skip_next", "skip_previous", "set_volume", "seek", "set_shuffle", "set_repeat", "transfer"], description: "Playback action" },
          query: { type: "string", description: "Search query to find and play a track/artist/album/playlist (optional, only for 'play')" },
          uri: { type: "string", description: "Spotify URI to play (e.g. spotify:track:xxx, spotify:playlist:xxx) (optional)" },
          volume: { type: "number", description: "Volume 0-100 (for set_volume)" },
          position_ms: { type: "number", description: "Position in ms (for seek)" },
          state: { type: "boolean", description: "State for shuffle/repeat (true/false)" },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_search",
      description: "Search Spotify for tracks, artists, albums, or playlists. Returns results with names, IDs, and URIs.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          types: { type: "string", description: "Comma-separated types: track,artist,album,playlist (default: track)" },
          limit: { type: "number", description: "Max results (default 5, max 50)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_get_playlists",
      description: "Get the user's Spotify playlists. Returns playlist names, IDs, and track counts.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max playlists (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spotify_get_now_playing",
      description: "Get the currently playing track on Spotify. Returns track name, artist, album, progress, and duration.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "git_status",
      description: "Show the current git branch and working-tree status of the repo (modified/added/deleted/untracked files). Run inside the project repo.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "git_log",
      description: "Show recent commit history (one line per commit: short hash + subject).",
      parameters: {
        type: "object",
        properties: {
          n: { type: "number", description: "Max commits to show (default 15, max 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Show the diff of the working tree (default), of a single ref (base), or between two refs (base..head). Use to review changes before committing.",
      parameters: {
        type: "object",
        properties: {
          base: { type: "string", description: "Git ref to diff against (branch, tag, commit hash). Omit for working-tree diff." },
          head: { type: "string", description: "Second ref for a base..head range (optional)." },
          path: { type: "string", description: "Optional file/subdir filter (comma-separated for several)." },
          staged: { type: "boolean", description: "Diff the staged (index) changes instead of the working tree." },
          stat: { type: "boolean", description: "Show a compact diffstat instead of the full diff." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_stash",
      description: "Stash management: list existing stashes, create one (push), or restore the latest (pop).",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "push", "pop"], description: "Stash action (default list)." },
          message: { type: "string", description: "Label for the stash (used with push)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "semgrep_scan",
      description: "Run a Semgrep static-analysis scan over the project (or a subdirectory) to find security/quality issues before shipping. Requires semgrep installed.",
      parameters: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Subdirectory to scan (default: workspace root)." },
          pattern: { type: "string", description: "Semgrep pattern or rule expression to scan for (comma-separated allowed)." },
          config: { type: "string", description: "Semgrep config (built-in ruleset or rules file, comma-separated allowed)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "library_docs",
      description: "Fetch up-to-date documentation/snippets for a library from Context7. Call with libraryName + query to resolve the library first; the result gives a libraryId to call again for the actual doc snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language question about what you're trying to do." },
          libraryName: { type: "string", description: "Library name to resolve (e.g. 'react', 'express', 'better-sqlite3'). Omit if libraryId is provided." },
          libraryId: { type: "string", description: "Resolved Context7 library ID (e.g. '/facebook/react'). Use the ID returned by a search call." },
          type: { type: "string", enum: ["json", "txt"], description: "Response format (default json)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather and forecast for a city using Open-Meteo (free, no API key). Returns current conditions (temperature, feels like, humidity, wind, condition) plus an N-day forecast (min/max, chance of rain, sunrise/sunset).",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name, optionally with country, e.g. 'São Paulo' or 'Lisboa, Portugal'." },
          days: { type: "number", description: "Forecast days (1-7, default 3)." },
          units: { type: "string", enum: ["metric", "imperial"], description: "Temperature units (default metric)." },
        },
        required: ["location"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_remote",
      description: "List git remotes of the repo (name, URL, fetch/push).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "gh_pr",
      description: "GitHub PRs via gh CLI: list open PRs, create one (--fill by default), or view a specific PR. Requires gh installed and authenticated.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "view"], description: "PR action (default list)." },
          base: { type: "string", description: "Base branch for the PR (used with create)." },
          head: { type: "string", description: "Head branch (defaults to current branch) for create." },
          title: { type: "string", description: "PR title (used with create)." },
          body: { type: "string", description: "PR body (used with create)." },
          number: { type: "number", description: "PR number (used with view)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Run the project's test suite (Test Generator). Auto-detects the framework (vitest/jest/mocha/npm test, pytest, go test, cargo test) in the workspace or subdirectory and returns pass/fail counts + tail of the output. Use after writing/editing code to verify it stays green.",
      parameters: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Subdirectory containing the project to test (default: workspace root)." },
          command: { type: "string", description: "Optional override test command (space-separated args). Example: 'vitest run'." },
          file: { type: "string", description: "Optional: run a single test file (vitest/jest/mocha/pytest only)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_auth_status",
      description: "Check if the GitHub Control Center is connected. Returns the authenticated GitHub login (never the token).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "github_repos_list",
      description: "List the user's GitHub repositories visible to the connected token (read-only). Returns name, description, language, stars, fork/private flags and last update.",
      parameters: {
        type: "object",
        properties: {
          sort: { type: "string", enum: ["updated", "created", "pushed", "full_name"], description: "Sort mode (default updated)." },
          perPage: { type: "number", description: "Results per page (max 100, default 100)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_repo_info",
      description: "Get details of a single GitHub repository (read-only).",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner." },
          repo: { type: "string", description: "Repository name." },
        },
        required: ["owner", "repo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_user_info",
      description: "Get a GitHub user's public profile. Omit login to get the connected account.",
      parameters: {
        type: "object",
        properties: {
          login: { type: "string", description: "GitHub username (optional)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_repo_doctor",
      description: "Read-only health report of the connected GitHub account's repos: buckets empty (delete candidates), stale (archive candidates, no push in N days), attention (no description) and archived. Returns counts + per-repo reason lines.",
      parameters: {
        type: "object",
        properties: {
          staleDays: { type: "number", description: "Days without push to consider a repo stale (default 90)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "code_review",
      description: "One-shot review bundle for a code review: changed files (git status), the diff (working tree or between refs), and optionally a semgrep scan. Returns the material for the agent to write the review. Requires a git repo.",
      parameters: {
        type: "object",
        properties: {
          base: { type: "string", description: "Base ref to diff against (e.g. main)." },
          head: { type: "string", description: "Head ref (default: working tree)." },
          staged: { type: "boolean", description: "Only include staged changes." },
          includeSemgrep: { type: "boolean", description: "Also run a semgrep scan over the workspace (default false)." },
        },
      },
    },
  },
  // --- Developer Elite: Git Write Operations ---
  {
    type: "function",
    function: {
      name: "git_commit",
      description: "Stage files and create a git commit. Stages all changes if no files specified.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Commit message." },
          files: { type: "array", items: { type: "string" }, description: "Specific files to stage (default: all changes)." },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_branch",
      description: "List, create, or delete git branches.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "delete"], description: "Action (default list)." },
          name: { type: "string", description: "Branch name (required for create/delete)." },
          startPoint: { type: "string", description: "Start point for create (e.g. main, HEAD~3)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_checkout",
      description: "Switch branches or restore working tree files.",
      parameters: {
        type: "object",
        properties: {
          branch: { type: "string", description: "Branch to switch to." },
          create: { type: "boolean", description: "Create a new branch (git checkout -b)." },
          file: { type: "string", description: "Restore a specific file from HEAD." },
        },
      },
    },
  },
  // --- Developer Elite: Test Generator ---
  {
    type: "function",
    function: {
      name: "generate_tests",
      description: "Generate a test scaffold from a source file. Analyzes exports and creates a test file with placeholder tests for vitest/jest/mocha/pytest/go/cargo.",
      parameters: {
        type: "object",
        properties: {
          sourceFile: { type: "string", description: "Source file to generate tests for (relative to workspace)." },
          framework: { type: "string", enum: ["vitest", "jest", "mocha", "pytest", "go", "cargo"], description: "Test framework (auto-detected if omitted)." },
        },
        required: ["sourceFile"],
      },
    },
  },
  // --- Developer Elite: Refactor Tools ---
  {
    type: "function",
    function: {
      name: "refactor_rename",
      description: "Safely rename a symbol (function/class/const) across all files in the workspace. Finds all references and updates them atomically.",
      parameters: {
        type: "object",
        properties: {
          oldName: { type: "string", description: "Current name to rename." },
          newName: { type: "string", description: "New name." },
          dir: { type: "string", description: "Subdirectory to search (default: workspace root)." },
        },
        required: ["oldName", "newName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refactor_move",
      description: "Safely move a file to a new location, updating all imports/requires that reference it.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source path (relative to workspace)." },
          to: { type: "string", description: "Destination path (relative to workspace)." },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refactor_extract",
      description: "Extract a block of lines from a source file into a new file, replacing the original with an import placeholder.",
      parameters: {
        type: "object",
        properties: {
          sourceFile: { type: "string", description: "Source file (relative to workspace)." },
          startLine: { type: "number", description: "Start line (1-indexed, inclusive)." },
          endLine: { type: "number", description: "End line (1-indexed, inclusive)." },
          targetFile: { type: "string", description: "Target file name (default: extracted.<ext>)." },
          functionName: { type: "string", description: "Name for the import placeholder comment." },
        },
        required: ["sourceFile", "startLine", "endLine"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pdf_inspect",
      description:
        "Inspect a PDF file (path relative to the developer workspace): returns page count, classification (text/mixed/scanned/unknown), whether it has a selectable text layer, and a text preview. Use extract_text=true to get the full extracted text. Ideal before summarizing or quoting PDF content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to the PDF file (relative to the workspace or absolute)" },
          extract_text: { type: "boolean", description: "If true, also return the full extracted text (default false)" },
          text_limit: { type: "number", description: "Max characters of extracted text to return (default 8000)" },
        },
        required: ["path"],
      },
    },
  },
  // --- Integration tools ---
  { type: "function", function: { name: "telemetry_track", description: "Track an event for observability (agent health, errors, actions).", parameters: { type: "object", properties: { type: { type: "string", description: "Event type (agent.invoked, agent.error, etc.)" }, agentId: { type: "string" }, agentName: { type: "string" }, skillsUsed: { type: "array", items: { type: "string" } }, error: { type: "string" }, isBoundaryError: { type: "boolean" } }, required: ["type"] } } },
  { type: "function", function: { name: "telemetry_health", description: "Get health metrics for a specific agent or all agents.", parameters: { type: "object", properties: { agentId: { type: "string", description: "Agent ID. Omit for all agents." } } } } },
  { type: "function", function: { name: "secret_scan", description: "Scan a directory for leaked secrets (API keys, tokens, passwords) using Gitleaks.", parameters: { type: "object", properties: { path: { type: "string", description: "Directory to scan" }, kind: { type: "string", enum: ["working_tree", "full_history", "staged"], description: "Scan mode" } }, required: ["path"] } } },
  { type: "function", function: { name: "secret_allowlist_add", description: "Add a secret finding to the allowlist (acknowledge as safe/false positive).", parameters: { type: "object", properties: { ruleId: { type: "string" }, filePath: { type: "string" }, reason: { type: "string" } }, required: ["ruleId", "filePath", "reason"] } } },
  { type: "function", function: { name: "finance_list_accounts", description: "List all financial accounts (checking, savings, credit, etc.).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "finance_create_transaction", description: "Create a financial transaction (expense or income).", parameters: { type: "object", properties: { accountId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" }, amountCents: { type: "number", description: "Amount in cents (integer)" }, payee: { type: "string" }, notes: { type: "string" }, categoryId: { type: "string" }, cleared: { type: "boolean" } }, required: ["accountId", "date", "amountCents"] } } },
  { type: "function", function: { name: "finance_budget_month", description: "Get budget summary for a specific month.", parameters: { type: "object", properties: { month: { type: "string", description: "YYYY-MM" } }, required: ["month"] } } },
  { type: "function", function: { name: "social_schedule_post", description: "Schedule a post on social media (Instagram, Twitter, TikTok).", parameters: { type: "object", properties: { accountIds: { type: "array", items: { type: "string" } }, content: { type: "string" }, mediaUrls: { type: "array", items: { type: "string" } }, scheduledFor: { type: "string", description: "ISO datetime" } }, required: ["accountIds", "content", "scheduledFor"] } } },
  { type: "function", function: { name: "social_list_posts", description: "List scheduled social media posts.", parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "published", "cancelled"] } } } } },
  { type: "function", function: { name: "design_list_projects", description: "List design projects from Penpot.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "design_export_file", description: "Export a design file from Penpot as SVG/PNG/PDF.", parameters: { type: "object", properties: { fileId: { type: "string" }, format: { type: "string", enum: ["svg", "png", "pdf"] }, pageId: { type: "string" } }, required: ["fileId", "format"] } } },
  { type: "function", function: { name: "vault_save", description: "Save a bookmark/link to the memory vault (Karakeep).", parameters: { type: "object", properties: { type: { type: "string", enum: ["link", "text", "note"] }, content: { type: "string" }, tags: { type: "array", items: { type: "string" } }, title: { type: "string" } }, required: ["type", "content"] } } },
  { type: "function", function: { name: "vault_search", description: "Search the memory vault in natural language.", parameters: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } } },
  { type: "function", function: { name: "photo_search", description: "Search photos in the Immich library.", parameters: { type: "object", properties: { text: { type: "string" }, personName: { type: "string" }, albumId: { type: "string" }, favorite: { type: "boolean" } } } } },
  // ── Postiz tools ──
  { type: "function", function: { name: "postiz_list_channels", description: "List connected social media channels in Postiz (X, Instagram, etc).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "postiz_list_posts", description: "List posts in Postiz for a date range.", parameters: { type: "object", properties: { startDate: { type: "string", description: "ISO date (default: first of current month)" }, endDate: { type: "string", description: "ISO date (default: last of current month)" } } } } },
  { type: "function", function: { name: "postiz_create_post", description: "Create a post in Postiz. For X/Twitter: content max 280 chars. Use integrationId from postiz_list_channels.", parameters: { type: "object", properties: { integrationId: { type: "string", description: "Channel integration ID from postiz_list_channels" }, content: { type: "string", description: "Post text content" }, date: { type: "string", description: "Scheduled date/time ISO (optional, for schedule type)" }, type: { type: "string", enum: ["schedule", "draft", "now"], description: "schedule=scheduled, draft=draft, now=publish immediately" }, whoCanReply: { type: "string", enum: ["everyone", "following", "mentionedUsers", "subscribers", "verified"], description: "X/Twitter reply setting (default: everyone)" } }, required: ["integrationId", "content"] } } },
  { type: "function", function: { name: "postiz_find_slot", description: "Find next available posting slot in Postiz.", parameters: { type: "object", properties: { integrationId: { type: "string", description: "Optional: specific channel ID" } } } } },
  { type: "function", function: { name: "postiz_health", description: "Check Postiz connection status.", parameters: { type: "object", properties: {} } } },
];

// Ferramentas do CaOS Commander (ponte cérebro ↔ bot Discord — Fase 3)
TOOL_DEFINITIONS.push(...discordBridge.TOOL_DEFINITIONS);

// ── Tool implementations ────────────────────────────────────────────────

function readFile(args) {
  const filePath = resolveAgentPath(args.path);
  if (!isPathAllowed(filePath)) return { error: "Access denied: path outside allowed workspace" };
  try {
    const content = fs.readFileSync(filePath, "utf8");
    if (args.start_line != null || args.end_line != null) {
      const lines = content.split("\n");
      const start = args.start_line || 0;
      const end = args.end_line != null ? args.end_line : lines.length;
      return { content: lines.slice(start, end).join("\n"), total_lines: lines.length };
    }
    if (content.length > 30000) return { content: content.slice(0, 30000) + "\n... [truncated]", truncated: true };
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}

function writeFile(args) {
  let filePath = args.path;
  if (!filePath) return { error: "path is required" };
  // Resolve relative paths against the developer workspace
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(getWorkspaceDir(), filePath);
  }
  if (!isPathAllowed(filePath)) return { error: "Access denied: path outside allowed workspace" };
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, args.content, "utf8");
    // Notify renderer so Developer IDE can refresh
    try {
      const { BrowserWindow } = require("electron");
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send("developer:file-written");
      }
    } catch {}
    return { success: true, bytes: Buffer.byteLength(args.content, "utf8"), path: filePath };
  } catch (err) {
    return { error: err.message };
  }
}

function editFile(args) {
  const filePath = resolveAgentPath(args.path);
  if (!isPathAllowed(filePath)) return { error: "Access denied: path outside allowed workspace" };
  try {
    let content = fs.readFileSync(filePath, "utf8");
    if (!content.includes(args.search)) return { error: "Search text not found in file" };
    content = content.split(args.search).join(args.replace);
    fs.writeFileSync(filePath, content, "utf8");
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function listFiles(args) {
  const dir = resolveAgentPath(args.path);
  if (!isPathAllowed(dir)) return { error: "Access denied: path outside allowed roots" };
  try {
    if (args.recursive) {
      const results = [];
      function walk(d, prefix) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            results.push(`${rel}/`);
            walk(path.join(d, entry.name), rel);
          } else {
            results.push(rel);
          }
        }
      }
      walk(dir, "");
      return { entries: results.slice(0, 500) };
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true }).map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    return { entries };
  } catch (err) {
    return { error: err.message };
  }
}

function searchFiles(args) {
  const base = resolveAgentPath(args.path);
  if (!isPathAllowed(base)) return { error: "Access denied: path outside allowed roots" };
  try {
    const { globSync } = require("glob");
    const matches = globSync(args.pattern, { cwd: base, absolute: false, nodir: false }).slice(0, 200);
    return { matches };
  } catch {
    // Fallback: recursive fs walk (cross-platform, no shell dependency)
    try {
      const pattern = args.pattern || "*";
      const matches = [];
      function walk(dir, depth) {
        if (depth > 5 || matches.length >= 200) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full, depth + 1);
          } else if (entry.name.match(new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"))) {
            matches.push(path.relative(base, full));
          }
        }
      }
      walk(base, 0);
      return { matches };
    } catch (err) {
      return { error: err.message };
    }
  }
}

function searchContent(args) {
  const base = resolveAgentPath(args.path);
  if (!isPathAllowed(base)) return { error: "Access denied: path outside allowed roots" };
  try {
    const include = args.include ? ["-g", args.include] : [];
    const out = execFileSync("rg", ["-n", "--no-heading", "-e", args.pattern, ...include, base], { encoding: "utf8", timeout: 15000, windowsHide: true });
    return { matches: out.trim() };
  } catch (err) {
    if (err.status === 1) return { matches: "No matches found" };
    if (err.code === "ENOENT") {
      return searchContentFallback(args);
    }
    return { error: err.message };
  }
}

function searchContentFallback(args) {
  try {
    const base = resolveAgentPath(args.path);
    const pattern = args.pattern || "";
    const matches = [];
    const include = args.include || null;
    function walk(dir, depth) {
      if (depth > 10 || matches.length >= 500) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (entry.isFile()) {
          if (include && !entry.name.includes(include.replace(/^\.?\*?/, "").replace(/\*$/, ""))) continue;
          try {
            const content = fs.readFileSync(full, "utf8").slice(0, 10000);
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(pattern.toLowerCase())) {
                matches.push(`${path.relative(base, full)}:${i + 1}:${lines[i].slice(0, 200).trim()}`);
              }
            }
          } catch { continue; }
        }
      }
    }
    walk(base, 0);
    const output = matches.slice(0, 200).join("\n");
    return { matches: output || "No matches found" };
  } catch (err) {
    return { error: err.message };
  }
}

function runCommand(args) {
  const fullCommand = args.command || "";
  if (!isCommandSafe(fullCommand)) {
    return { error: "Command blocked for security reasons: " + fullCommand.slice(0, 100) };
  }
  if (args.cwd && !isPathAllowed(args.cwd)) return { error: "Access denied: cwd outside allowed roots" };
  if (!isCommandArgsSafe(fullCommand, null)) {
    return { error: "Blocked: command or arguments contain shell metacharacters" };
  }
  try {
    const output = execSync(fullCommand, {
      encoding: "utf8",
      timeout: args.timeout || 30000,
      cwd: args.cwd || getWorkspaceDir(),
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      shell: true,
    });
    return { stdout: output.slice(0, 20000), exit_code: 0 };
  } catch (err) {
    return { stdout: (err.stdout || "").slice(0, 10000), stderr: (err.stderr || "").slice(0, 5000), exit_code: err.status || 1 };
  }
}

async function webFetch(args) {
  const keys = ctx && ctx.readSecretStore ? ctx.readSecretStore() : {};
  if (firecrawl.hasKey(keys)) {
    try {
      const baseUrlSetting = (ctx?.db?.getSetting && ctx.db.getSetting("firecrawlBaseUrl", "")) || "";
      if (baseUrlSetting) firecrawl.setBaseUrl(baseUrlSetting);
      const res = await firecrawl.scrape(args.url, { formats: [args.format === "html" ? "html" : "markdown"], onlyMainContent: true }, keys.firecrawl);
      if (res.ok) {
        const content = args.format === "html" ? res.html : res.markdown;
        if (content) {
          if (content.length > 30000) return { engine: "firecrawl", content: content.slice(0, 30000) + "\n... [truncated]" };
          return { engine: "firecrawl", content };
        }
      }
      // Firecrawl falhou ou retornou conteúdo vazio → fallback para o fetch direto.
      return fallbackWebFetch(args);
    } catch (err) {
      return fallbackWebFetch(args);
    }
  }
  return fallbackWebFetch(args);
}

async function fallbackWebFetch(args) {
  try {
    const content = await fetchUrl(args.url, args.format || "text");
    if (content.length > 30000) return { content: content.slice(0, 30000) + "\n... [truncated]" };
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}

async function publishToSocial(args) {
  if (!ctx?.socialMedia || !ctx?.db) {
    return { error: "Social media module not initialized. Restart Orun OS." };
  }
  try {
    const result = await ctx.socialMedia.publish({
      platform: args.platform,
      text: args.text,
      hook: args.hook,
      hashtags: args.hashtags,
      format: args.format,
      imageUrl: args.imageUrl,
      videoUrl: args.videoUrl,
    }, ctx.db);
    return result;
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

async function publishInstagramDirectTool(args) {
  if (!ctx?.socialMedia || !ctx?.db) {
    return { error: "Social media module not initialized. Restart Orun OS." };
  }
  try {
    const result = await ctx.socialMedia.publishInstagramDirect({
      imageUrl: args.imageUrl,
      videoUrl: args.videoUrl,
      caption: args.caption,
    }, ctx.db);
    return result;
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

async function publishLinkedInDirectTool(args) {
  if (!ctx?.socialMedia || !ctx?.db) {
    return { error: "Social media module not initialized. Restart Orun OS." };
  }
  try {
    const result = await ctx.socialMedia.publishLinkedInDirect({
      text: args.text,
      imageUrl: args.imageUrl,
    }, ctx.db);
    return result;
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

async function generateImage(args) {
  if (!ctx?.image3d) {
    return { error: "Image generation module not initialized. Restart Orun OS." };
  }
  const keys = ctx.readSecretStore ? ctx.readSecretStore() : {};
  const falKey = keys.fal;
  const fooocusUrl =
    (ctx?.db?.getSetting && ctx.db.getSetting("fooocusBaseUrl", "")) ||
    ctx.image3d.DEFAULT_FOOOCUS_URL;

  // 1) Fooocus local (gratuito, sem chave) primeiro.
  try {
    const result = await ctx.image3d.generateFooocusImage(
      {
        prompt: args.prompt,
        negative_prompt: args.negativePrompt || "",
        imageSize: args.imageSize || "landscape_16_9",
        numImages: args.numImages || 1,
      },
      fooocusUrl
    );
    return { ok: true, imageUrl: result.images?.[0]?.url || null, images: result.images, model: result.model };
  } catch (fooocusErr) {
    // 2) Fallback: Fal.ai (precisa de chave).
    if (!falKey) {
      return {
        error:
          `Fooocus local indisponível (${fooocusErr.message || fooocusErr}). ` +
          `Inicie o Fooocus (http://127.0.0.1:7865) ou adicione a chave Fal.ai em Settings → API Keys.`,
      };
    }
    try {
      const result = await ctx.image3d.generateImage({
        prompt: args.prompt,
        model: args.model || "fal-ai/flux/schnell",
        imageSize: args.imageSize || "landscape_16_9",
      }, falKey);
      return {
        ok: true,
        imageUrl: result.images?.[0]?.url || null,
        images: result.images,
        model: result.model,
        fallback: "fal",
      };
    } catch (falErr) {
      return {
        error: `Fooocus: ${fooocusErr.message || fooocusErr} | Fal.ai: ${falErr.message || falErr}`,
      };
    }
  }
}

async function generateVideo(args) {
  if (!ctx?.videoGenerator) {
    return { error: "Video generation module not initialized. Restart Orun OS." };
  }
  const keys = ctx.readSecretStore ? ctx.readSecretStore() : {};
  const minimaxKey = keys.minimax || keys.minimaxApiKey;
  if (!minimaxKey) {
    return {
      error:
        "MiniMax API key não configurada. Adicione a chave MiniMax em Settings → API Keys (campo MiniMax). " +
        "A geração de vídeo MiniMax-H3 é um serviço pago por segundo de vídeo.",
    };
  }
  try {
    const result = await ctx.videoGenerator.generateVideoAndWait(args, minimaxKey, { baseUrl: args.baseUrl });
    if (result.ok) {
      return {
        ok: true,
        videoUrl: result.videoUrl,
        taskId: result.taskId,
        model: result.model,
        duration: args.duration || 5,
        resolution: args.resolution || "768P",
        ratio: args.ratio || "16:9",
      };
    }
    return { error: result.error || "MiniMax-H3 generation failed" };
  } catch (err) {
    return { error: `MiniMax-H3: ${err.message || err}` };
  }
}

// ── Audit log integration ──────────────────────────────────────────────
const SENSITIVE_TOOL_ACTIONS = {
  write_file: ["write_file"],
  edit_file: ["write_file"],
  run_command: ["execute_command"],
  web_fetch: ["network_request"],
  web_search: ["network_request"],
  publish_to_social: ["network_request"],
  publish_to_instagram_direct: ["network_request"],
  publish_to_linkedin_direct: ["network_request"],
  generate_image: ["api_key_access", "network_request"],
  generate_video: ["api_key_access", "network_request"],
  git_stash: ["git_write"],
  postiz_create_post: ["social_post"],
};

function buildAuditDetails(name, args) {
  switch (name) {
    case "run_command":
      return { command: (args.command || "").slice(0, 200) };
    case "write_file":
    case "edit_file":
      return { path: args.path };
    case "web_fetch":
      return { url: (args.url || "").slice(0, 200) };
    case "web_search":
      return { query: (args.query || "").slice(0, 200) };
    case "publish_to_social":
      return { platform: args.platform, text: (args.text || "").slice(0, 100) };
    case "publish_to_instagram_direct":
      return { caption: (args.caption || "").slice(0, 100) };
    case "publish_to_linkedin_direct":
      return { text: (args.text || "").slice(0, 100) };
    case "generate_image":
      return { prompt: (args.prompt || "").slice(0, 100), model: args.model || "default" };
    case "generate_video":
      return { prompt: (args.prompt || "").slice(0, 100), resolution: args.resolution || "768P", duration: args.duration || 5 };
    default:
      return {};
  }
}

// ── Agent workspace scoping ─────────────────────────────────────────────
// Agents may only open/act on their own workspace, so a legal agent cannot
// write into the developer IDE workspace (or vice-versa) via workspace_action.

const AGENT_WORKSPACE_SCOPE = {
  Juridico: ["juridico"],
  AssistenteTecnico: ["assistente-tecnico"],
  Suporte: ["suporte"],
  "Personal Assistant": ["personal-assistant"],
  Developer: ["developer"],
  Automation: ["automation-flow"],
  Automotive: ["automotive-garage"],
  Creator: ["creator-audio", "creator-video"],
  Designer: ["designer"],
  Finance: ["finance"],
  Health: ["health"],
  Teacher: ["teacher"],
  Marketing: ["marketing"],
  System: ["system"],
  "Home IA": ["home-ia"],
  "Cyber Security": ["cyber-security"],
  Carreiras: ["career"],
};

function checkWorkspaceScope(agentId, name, args) {
  if (!agentId) return null;
  if (name !== "open_workspace" && name !== "workspace_action") return null;
  const allowed = AGENT_WORKSPACE_SCOPE[agentId];
  if (!allowed) return null;
  const ws = args && args.workspace;
  if (ws && !allowed.includes(ws)) {
    return `Agent "${agentId}" can only use workspace(s): ${allowed.join(", ")} (requested "${ws}")`;
  }
  return null;
}

// ── Dispatcher ──────────────────────────────────────────────────────────

async function executeToolRaw(name, args) {
  switch (name) {
    case "read_file": return readFile(args);
    case "write_file": return writeFile(args);
    case "edit_file": return editFile(args);
    case "list_files": return listFiles(args);
    case "search_files": return searchFiles(args);
    case "search_content": return searchContent(args);
    case "run_command": return runCommand(args);
    case "web_fetch": return webFetch(args);
    case "memory_save": {
      const rag = require("./rag.cjs");
      const id = args.key || `mem_${Date.now()}`;
      await rag.save(id, args.content, {}, args.tags || []);
      return { success: true, id };
    }
    case "memory_search": {
      const rag = require("./rag.cjs");
      const result = await rag.search(args.query, 10, args.tags || []);
      return { results: result.results.map((r) => ({ id: r.id, content: r.content, score: r.score, tags: r.tags })), method: result.method };
    }
    case "notify": {
      try {
        const { BrowserWindow } = require("electron");
        const win = BrowserWindow.getAllWindows()[0];
        if (win && !win.isDestroyed()) {
          win.webContents.send("app:notify", { title: args.title || "Orun", body: args.body || "" });
        }
        log.info(`[notify] ${args.title}: ${args.body}`);
        return { success: true };
      } catch (e) { log.info(`[notify] ${args.title}: ${args.body}`); return { success: true }; }
    }
    case "schedule_task": return scheduleTask(args);
    case "publish_to_social": return publishToSocial(args);
    case "publish_to_instagram_direct": return publishInstagramDirectTool(args);
    case "publish_to_linkedin_direct": return publishLinkedInDirectTool(args);
    case "generate_image": return generateImage(args);
    case "generate_video": return generateVideo(args);
    case "discord_status": return discordBridge.execute("status", args || {});
    case "discord_server_info": return discordBridge.execute("server_info", args || {});
    case "discord_channels": return discordBridge.execute("channels", args || {});
    case "discord_roles": return discordBridge.execute("roles", args || {});
    case "discord_plan": return discordBridge.execute("plan", args || {});
    case "discord_apply": return discordBridge.execute("apply", args || {});
    case "discord_archive_game": return discordBridge.execute("archive_game", args || {});
    case "career_get_state": return careerBridge.getState();
    case "career_search_jobs": return await careerBridge.searchJobs(args.query, args.profileKey, { limit: args.limit || 8 });
    case "career_add_job": return careerBridge.addJob(args);
    case "career_list_jobs": return careerBridge.listJobs({ profileKey: args.profileKey, status: args.status });
    case "career_update_job_status": return careerBridge.updateJobStatus(args.id, args.status);
    case "career_save_profile": return careerBridge.saveProfile(args.profileKey, args.data || {});
    case "career_generate_profile": return careerBridge.generateProfileContent(args.profileKey);
    case "career_prepare_application": return careerBridge.prepareApplication(args.jobId, args.profileKey, { querySummary: args.querySummary });
    case "career_stats": return careerBridge.getStats();
    case "neural_save_note": {
      const ke = getKnowledgeEngine();
      if (!ke) return { ok: false, error: "Knowledge Engine indisponível" };
      const title = String(args.title || "").trim().slice(0, 120);
      const content = String(args.content || "").trim();
      if (title.length < 3 || content.length < 10) return { ok: false, error: "Título (3+) e conteúdo (10+) obrigatórios" };
      return ke.save({ kind: "note", title, content, tags: Array.isArray(args.tags) ? args.tags.slice(0, 8).map(String) : [], date: todayISO() });
    }
    case "neural_search_notes": {
      const ke = getKnowledgeEngine();
      if (!ke) return { ok: false, error: "Knowledge Engine indisponível" };
      return neuralHandlers.searchNotes(ke.load(), String(args.query || ""), Number(args.limit) > 0 ? Math.min(Number(args.limit), 25) : 8);
    }
    case "neural_list_notes": {
      const ke = getKnowledgeEngine();
      if (!ke) return { ok: false, error: "Knowledge Engine indisponível" };
      const limit = Number(args.limit) > 0 ? Math.min(Number(args.limit), 50) : 20;
      return neuralHandlers.listNotes(ke.load(), limit);
    }
    case "neural_get_note": {
      const ke = getKnowledgeEngine();
      if (!ke) return { ok: false, error: "Knowledge Engine indisponível" };
      return neuralHandlers.getNote(ke.load(), args.id ? String(args.id) : null, args.title ? String(args.title) : null);
    }
    case "neural_backlinks_graph": {
      const ke = getKnowledgeEngine();
      if (!ke) return { ok: false, error: "Knowledge Engine indisponível" };
      return neuralHandlers.buildSnapshot(ke.load());
    }
    case "web_search": {
      const { query, numResults = 5 } = args;
      const keys = ctx && ctx.readSecretStore ? ctx.readSecretStore() : {};
      if (firecrawl.hasKey(keys)) {
        try {
          const baseUrlSetting = (ctx?.db?.getSetting && ctx.db.getSetting("firecrawlBaseUrl", "")) || "";
          if (baseUrlSetting) firecrawl.setBaseUrl(baseUrlSetting);
          const res = await firecrawl.search(query, { limit: numResults }, keys.firecrawl);
          if (res.results) return res;
          // Firecrawl falhou (rede/API/quota) → fallback DuckDuckGo.
        } catch (err) {
          // Firecrawl lançou → fallback DuckDuckGo.
        }
      }
      try {
        const https = require("https");
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        return new Promise((resolve) => {
          const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
              const results = [];
              const regex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
              const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
              let match;
              const links = [];
              const titles = [];
              const snippets = [];
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
              resolve({ results, query });
            });
          });
          req.on("error", (e) => resolve({ error: e.message, query }));
          req.setTimeout(10000, () => { req.destroy(); resolve({ error: "Search timeout", query }); });
        });
      } catch (e) { return { error: e.message, query }; }
    }
    case "clipboard_read": {
      try {
        const { clipboard } = require("electron");
        return { text: clipboard.readText() || "" };
      } catch (e) { return { error: e.message }; }
    }
    case "pdf_inspect": {
      const pdfInspector = require("./pdf-inspector.cjs");
      const filePath = resolveAgentPath(args.path);
      if (!isPathAllowed(filePath)) return { error: "Access denied: path outside allowed workspace" };
      const info = pdfInspector.inspectPdf(filePath);
      if (info.error) return { error: info.error };
      const out = { ...info };
      if (args.extract_text) {
        const ex = pdfInspector.extractPdfText(filePath, { limit: args.text_limit || 8000 });
        if (ex.text) out.text = ex.text;
      }
      return out;
    }
    case "clipboard_write": {
      try {
        const { clipboard } = require("electron");
        clipboard.writeText(args.text || "");
        return { success: true };
      } catch (e) { return { error: e.message }; }
    }
    case "screenshot": {
      try {
        const { desktopCapturer } = require("electron");
        const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1920, height: 1080 } });
        if (sources.length > 0) {
          const thumbnail = sources[0].thumbnail;
          return { image: thumbnail.toDataURL(), width: thumbnail.getSize().width, height: thumbnail.getSize().height };
        }
        return { error: "No screen source found" };
      } catch (e) { return { error: e.message }; }
    }
    case "rag_search": {
      const rag = require("./rag.cjs");
      const result = await rag.search(args.query, args.topK || 5, args.tags || []);
      return result;
    }
    case "trigger_agent": {
      const { agent, message } = args;
      const validAgents = ["Health", "Finance", "Developer", "Teacher", "Designer", "Creator", "Marketing", "Automation", "System", "Home IA", "Cyber Security"];
      if (!validAgents.includes(agent)) return { error: `Invalid agent: ${agent}. Valid agents: ${validAgents.join(", ")}` };
      return { triggered: true, agent, message, timestamp: Date.now() };
    }
    case "open_workspace": {
      try {
        const { BrowserWindow, ipcMain } = require("electron");
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return { error: "No active window found" };
        const { workspace } = args;
        const validWorkspaces = ["creator-audio", "creator-video", "designer", "automation-flow", "finance", "health", "teacher", "marketing", "system", "developer", "automotive-garage", "juridico", "assistente-tecnico", "personal-assistant", "suporte", "home-ia", "cyber-security", "career"];
        if (!validWorkspaces.includes(workspace)) return { error: `Invalid workspace: ${workspace}. Valid: ${validWorkspaces.join(", ")}` };
        // Set up listener BEFORE sending the open message to avoid race condition
        let cleanedUp = false;
        let onRegistered;
        const cleanup = () => { if (!cleanedUp && onRegistered) { cleanedUp = true; ipcMain.removeListener("workspace:actions-registered", onRegistered); } };
        const confirmed = await new Promise((resolve) => {
          const timer = setTimeout(() => { cleanup(); resolve(false); }, 5000);
          onRegistered = (_event, ws) => {
            if (ws === workspace) {
              clearTimeout(timer);
              cleanup();
              resolve(true);
            }
          };
          ipcMain.on("workspace:actions-registered", onRegistered);
          // Now send the open message after listener is ready
          win.webContents.send("workspace:open", workspace);
        });
        log.info(`[open_workspace] ${workspace} confirmed=${confirmed}`);
        return { success: true, message: `Workspace "${workspace}" opened${confirmed ? " (actions ready)" : " (may still be loading)"}` };
      } catch (e) {
        return { error: e.message };
      }
    }
    case "workspace_action": {
      try {
        const { BrowserWindow, ipcMain } = require("electron");
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return { error: "No active window found" };
        const { workspace, action, params } = args;
        const requestId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let cleanedUp = false;
        let handler;
        const cleanup = () => { if (!cleanedUp && handler) { cleanedUp = true; ipcMain.removeListener("workspace:action:result", handler); } };
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => { cleanup(); reject(new Error(`Workspace action timed out. The workspace "${workspace}" may not be open or its actions may not be registered.`)); }, 30000);
          handler = (_event, rid, data) => {
            if (rid === requestId) { clearTimeout(timer); cleanup(); resolve(data); }
          };
          ipcMain.on("workspace:action:result", handler);
          win.webContents.send("workspace:action", { requestId, workspace, action, params: params || {} });
        });
        log.info(`[workspace_action] ${workspace}/${action} => ${JSON.stringify(result).slice(0, 200)}`);
        return result;
      } catch (e) {
        return { error: e.message };
      }
    }
    case "spotify_play": {
      const { handleSpotifyAction } = require("./ipc/spotify-handlers.cjs");
      const { action, query, uri, volume, position_ms, state } = args;

      if (action === "play" && (query || uri)) {
        if (query && !uri) {
          return await handleSpotifyAction("search_and_play", { query, types: "track", limit: 5 });
        }
        return await handleSpotifyAction("play", { uris: [uri] });
      }

      const payload = { volume, position_ms, state };
      return await handleSpotifyAction(action, payload);
    }
    case "spotify_search": {
      const { handleSpotifyAction } = require("./ipc/spotify-handlers.cjs");
      return await handleSpotifyAction("search", { query: args.query, types: args.types || "track", limit: args.limit || 5 });
    }
    case "spotify_get_playlists": {
      const { handleSpotifyAction } = require("./ipc/spotify-handlers.cjs");
      return await handleSpotifyAction("get_playlists", { limit: args.limit || 20 });
    }
    case "spotify_get_now_playing": {
      const { handleSpotifyAction } = require("./ipc/spotify-handlers.cjs");
      return await handleSpotifyAction("get_now_playing", {});
    }
    case "git_status": {
      return developerTools.gitStatus(getWorkspaceDir());
    }
    case "git_log": {
      return developerTools.gitLog(getWorkspaceDir(), args.n);
    }
    case "git_diff": {
      return developerTools.gitDiff(getWorkspaceDir(), args);
    }
    case "git_stash": {
      return developerTools.gitStash(getWorkspaceDir(), args);
    }
    case "git_remote": {
      return developerTools.gitRemote(getWorkspaceDir());
    }
    case "gh_pr": {
      return developerTools.ghPr(getWorkspaceDir(), args);
    }
    case "github_auth_status":
    case "github_repos_list":
    case "github_repo_info":
    case "github_user_info":
    case "github_repo_doctor": {
      return await executeGithubTool(name, args);
    }
    case "run_tests": {
      return developerTools.runTests(getWorkspaceDir(), args);
    }
    case "code_review": {
      return developerTools.codeReview(getWorkspaceDir(), args);
    }
    case "git_commit": {
      return developerTools.gitCommit(getWorkspaceDir(), args);
    }
    case "git_branch": {
      return developerTools.gitBranch(getWorkspaceDir(), args);
    }
    case "git_checkout": {
      return developerTools.gitCheckout(getWorkspaceDir(), args);
    }
    case "generate_tests": {
      return developerTools.generateTests(getWorkspaceDir(), args);
    }
    case "refactor_rename": {
      return developerTools.refactorRename(getWorkspaceDir(), args);
    }
    case "refactor_move": {
      return developerTools.refactorMove(getWorkspaceDir(), args);
    }
    case "refactor_extract": {
      return developerTools.refactorExtract(getWorkspaceDir(), args);
    }
    case "semgrep_scan": {
      return developerTools.semgrepScan(getWorkspaceDir(), args);
    }
    case "library_docs": {
      return await developerTools.libraryDocs(getWorkspaceDir(), args);
    }
    case "get_weather": {
      const weatherTools = require("./weather-tools.cjs");
      return await weatherTools.getWeather(args);
    }
      // --- Integration tools ---
      case "telemetry_track": {
        if (!ctx.telemetry) return { error: "Telemetry not configured" };
        await ctx.telemetry.track(args);
        return { ok: true };
      }
      case "telemetry_health": {
        if (!ctx.telemetryReader) return { error: "Telemetry reader not configured" };
        if (args.agentId) return ctx.telemetryReader.getAgentHealth(args.agentId);
        return ctx.telemetryReader.getAllAgentsHealth();
      }
      case "secret_scan": {
        if (!ctx.secretScanner) return { error: "Secret scanner not configured (install Gitleaks)" };
        if (!ctx.secretAllowlist) return { error: "Secret allowlist not configured" };
        const { applyAllowlist } = require("@orun/shield-secrets-core");
        const raw = await ctx.secretScanner.scan({ kind: args.kind || "working_tree", path: args.path });
        return applyAllowlist(raw, ctx.secretAllowlist);
      }
      case "secret_allowlist_add": {
        if (!ctx.secretAllowlist) return { error: "Secret allowlist not configured" };
        await ctx.secretAllowlist.add({ ruleId: args.ruleId, filePath: args.filePath, reason: args.reason, addedBy: "agent", addedAt: new Date().toISOString() });
        return { ok: true };
      }
      case "finance_list_accounts": {
        if (!ctx.financeStore) return { error: "Finance store not configured" };
        return ctx.financeStore.listAccounts();
      }
      case "finance_create_transaction": {
        if (!ctx.financeStore) return { error: "Finance store not configured" };
        return ctx.financeStore.createTransaction(args);
      }
      case "finance_budget_month": {
        if (!ctx.financeStore) return { error: "Finance store not configured" };
        return ctx.financeStore.getBudgetMonth(args.month);
      }
      case "social_schedule_post": {
        if (!ctx.socialScheduler) return { error: "Social scheduler not configured" };
        return ctx.socialScheduler.schedulePost(args);
      }
      case "social_list_posts": {
        if (!ctx.socialScheduler) return { error: "Social scheduler not configured" };
        return ctx.socialScheduler.listScheduledPosts(args);
      }
      case "design_list_projects": {
        if (!ctx.designStore) return { error: "Design store not configured" };
        return ctx.designStore.listProjects();
      }
      case "design_export_file": {
        if (!ctx.designStore) return { error: "Design store not configured" };
        return ctx.designStore.exportFile(args.fileId, args.format, args.pageId);
      }
      case "vault_save": {
        if (!ctx.memoryVault) return { error: "Memory vault not configured" };
        return ctx.memoryVault.save(args);
      }
      case "vault_search": {
        if (!ctx.memoryVault) return { error: "Memory vault not configured" };
        return ctx.memoryVault.search(args.query, { limit: args.limit });
      }
      case "photo_search": {
        if (!ctx.photoLibrary) return { error: "Photo library not configured" };
        return ctx.photoLibrary.search(args);
      }
      // ── Postiz tools ──
      case "postiz_list_channels": {
        if (!ctx.postiz) return { error: "Postiz not configured" };
        return ctx.postiz.listIntegrations();
      }
      case "postiz_list_posts": {
        if (!ctx.postiz) return { error: "Postiz not configured" };
        return ctx.postiz.listPosts(args.startDate, args.endDate);
      }
      case "postiz_create_post": {
        if (!ctx.postiz) return { error: "Postiz not configured" };
        return ctx.postiz.createPost({
          posts: [{ integrationId: args.integrationId, content: args.content, whoCanReply: args.whoCanReply || "everyone" }],
          type: args.type || "schedule",
          date: args.date || new Date().toISOString(),
        });
      }
      case "postiz_find_slot": {
        if (!ctx.postiz) return { error: "Postiz not configured" };
        return ctx.postiz.findFreeSlot(args.integrationId);
      }
      case "postiz_health": {
        if (!ctx.postiz) return { error: "Postiz not configured" };
        return ctx.postiz.healthCheck();
      }
    default: return { error: `Unknown tool: ${name}` };
  }
}

async function executeTool(name, args, agentId) {
  if (agentId) {
    const rateCheck = agentRateLimiter.checkToolRate(agentId);
    if (!rateCheck.allowed) {
      logger.tools.warn(`[RATE LIMIT] agent=${agentId} tool=${name}: ${rateCheck.reason}`);
      return { error: rateCheck.reason };
    }
  }

  const actions = SENSITIVE_TOOL_ACTIONS[name];
  if (actions) {
    const details = buildAuditDetails(name, args);
    for (const action of actions) {
      auditLog.logAction(agentId || "system", action, details, "allowed");
    }
  }

  const scopeBlock = checkWorkspaceScope(agentId, name, args);
  if (scopeBlock) {
    logger.tools.warn(`[SCOPE] agent=${agentId} tool=${name} blocked: ${scopeBlock}`);
    if (actions) {
      const details = buildAuditDetails(name, args);
      for (const action of actions) {
        auditLog.logAction(agentId || "system", action, details, "blocked");
      }
    }
    return { error: scopeBlock };
  }

  try {
    const result = await withTimeout(executeToolRaw(name, args), TOOL_TIMEOUT, `tool:${name}`);
    if (agentId) agentRateLimiter.recordToolCall(agentId);

    if (actions) {
      const details = buildAuditDetails(name, args);
      const resultStatus = result && result.error ? "blocked" : "allowed";
      for (const action of actions) {
        auditLog.logAction(agentId || "system", action, details, resultStatus);
      }
    }

    return result;
  } catch (err) {
    const userMessage = getErrorMessage(err);
    logger.tools.error(`[TOOL ERROR] ${name}:`, err.message);

    if (actions) {
      const details = { error: err.message };
      for (const action of actions) {
        auditLog.logAction(agentId || "system", action, details, "blocked");
      }
    }

    return { error: userMessage };
  }
}

module.exports = { init, setAllowedRoots, TOOL_DEFINITIONS, executeTool, isCommandSafe, isCommandArgsSafe, isPathAllowed, agentRateLimiter, AGENT_WORKSPACE_SCOPE };

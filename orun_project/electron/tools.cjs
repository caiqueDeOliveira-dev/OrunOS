// electron/tools.cjs
//
// Autonomous tool definitions and implementations for Hampton.
// Each tool has a JSON Schema definition (OpenAI tools format) and an
// execute() function that returns a result object.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const https = require("https");
const http = require("http");

let memoryDir = null;
let ctx = null; // { db, socialMedia }

function init(userDataPath, context) {
  memoryDir = path.join(userDataPath, "memories");
  if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });
  ctx = context || null;
}

function loadMemories() {
  if (!memoryDir) return [];
  try { return JSON.parse(fs.readFileSync(path.join(memoryDir, "memories.json"), "utf8")); }
  catch { return []; }
}

function saveMemories(memories) {
  if (!memoryDir) return;
  fs.writeFileSync(path.join(memoryDir, "memories.json"), JSON.stringify(memories, null, 2));
}

// ── HTTP helpers ────────────────────────────────────────────────────────

function fetchUrl(urlString, format = "text") {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, format).then(resolve, reject);
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
      description: "Fetch content from a URL. Returns page text or markdown.",
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
];

// ── Tool implementations ────────────────────────────────────────────────

function readFile(args) {
  try {
    const content = fs.readFileSync(args.path, "utf8");
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
  try {
    const dir = path.dirname(args.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(args.path, args.content, "utf8");
    return { success: true, bytes: Buffer.byteLength(args.content, "utf8") };
  } catch (err) {
    return { error: err.message };
  }
}

function editFile(args) {
  try {
    let content = fs.readFileSync(args.path, "utf8");
    if (!content.includes(args.search)) return { error: "Search text not found in file" };
    content = content.replace(args.search, args.replace);
    fs.writeFileSync(args.path, content, "utf8");
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function listFiles(args) {
  try {
    const dir = args.path || ".";
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
  try {
    const base = args.path || ".";
    const { globSync } = require("glob");
    const matches = globSync(args.pattern, { cwd: base, absolute: false, nodir: false }).slice(0, 200);
    return { matches };
  } catch {
    // Fallback: use find command
    try {
      const base = args.path || ".";
      const out = execSync(`find "${base}" -name "${args.pattern.replace("**/", "").replace("*", "*")}" -type f 2>/dev/null | head -200`, { encoding: "utf8", timeout: 10000 });
      return { matches: out.trim().split("\n").filter(Boolean) };
    } catch (err) {
      return { error: err.message };
    }
  }
}

function searchContent(args) {
  try {
    const base = args.path || ".";
    const include = args.include ? `-g "${args.include}"` : "";
    const out = execSync(`rg -n --no-heading -e "${args.pattern}" ${include} "${base}" 2>/dev/null | head -200`, { encoding: "utf8", timeout: 15000 });
    return { matches: out.trim() };
  } catch (err) {
    if (err.status === 1) return { matches: "No matches found" };
    return { error: err.message };
  }
}

function runCommand(args) {
  try {
    const output = execSync(args.command, {
      encoding: "utf8",
      timeout: args.timeout || 30000,
      cwd: args.cwd || undefined,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return { stdout: output.slice(0, 20000), exit_code: 0 };
  } catch (err) {
    return { stdout: (err.stdout || "").slice(0, 10000), stderr: (err.stderr || "").slice(0, 5000), exit_code: err.status || 1 };
  }
}

async function webFetch(args) {
  try {
    const content = await fetchUrl(args.url, args.format || "text");
    if (content.length > 30000) return { content: content.slice(0, 30000) + "\n... [truncated]" };
    return { content };
  } catch (err) {
    return { error: err.message };
  }
}

function memorySave(args) {
  const memories = loadMemories();
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  memories.push({ id, key: args.key, content: args.content, tags: args.tags || [], created_at: Date.now() });
  saveMemories(memories);
  return { success: true, id };
}

function memorySearch(args) {
  const memories = loadMemories();
  const q = args.query.toLowerCase();
  let results = memories.filter((m) => m.key.toLowerCase().includes(q) || m.content.toLowerCase().includes(q));
  if (args.tags?.length) {
    results = results.filter((m) => args.tags.some((t) => m.tags.includes(t)));
  }
  return { results: results.slice(0, 20).map((m) => ({ id: m.id, key: m.key, content: m.content, tags: m.tags, created_at: m.created_at })) };
}

function notifyUser(args) {
  // Log only — responses stay inside the app, no OS notifications.
  console.log(`[notify] ${args.title}: ${args.body}`);
  return { success: true };
}

function scheduleTask(args) {
  // Log only — responses stay inside the app, no OS notifications.
  const delayMs = (args.delay_seconds || 60) * 1000;
  setTimeout(() => {
    console.log(`[schedule_task] ${args.title}: ${args.message}`);
  }, Math.min(delayMs, 86400000));
  return { success: true, fires_in_seconds: Math.min(args.delay_seconds || 60, 86400) };
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

// ── Dispatcher ──────────────────────────────────────────────────────────

async function executeTool(name, args) {
  switch (name) {
    case "read_file": return readFile(args);
    case "write_file": return writeFile(args);
    case "edit_file": return editFile(args);
    case "list_files": return listFiles(args);
    case "search_files": return searchFiles(args);
    case "search_content": return searchContent(args);
    case "run_command": return runCommand(args);
    case "web_fetch": return webFetch(args);
    case "memory_save": return memorySave(args);
    case "memory_search": return memorySearch(args);
    case "notify": return notifyUser(args);
    case "schedule_task": return scheduleTask(args);
    case "publish_to_social": return publishToSocial(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

module.exports = { init, TOOL_DEFINITIONS, executeTool };

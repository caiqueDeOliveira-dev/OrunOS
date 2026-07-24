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
const BLOCKED_COMMANDS = /\b(rm\s+(-\w*\s+)*(\/|~)|rmdir\s+\/[sq]|del\s+\/[sfq]|format\s+[a-z]:|mkfs\.|dd\s+of=|:(){ :\|:& };:|reg\s+delete|sc\s+delete|net\s+user|powershell\s+(-\w*\s+)*(-enc|-encodedcommand|IEX|Invoke-Expression|Invoke-WebRequest|DownloadString|DownloadFile|Net\.WebClient)|cmd\s+\/[ce]\s+.*\|.*(\s*bash|\s*sh|\s*powershell)|curl.*\|.*(\s*sh|\s*bash)|wget.*\|.*(\s*sh|\s*bash)|takeown|icacls.*\/grant|bcdedit|diskpart|taskkill\s+\/f|Stop-Process|Get-Process.*\|\s*(Kill|Stop)|certutil\s+-decode|reagentc|dism\s+\/)/i;

function isCommandSafe(command) {
  return !BLOCKED_COMMANDS.test(command);
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
      description: "Search the web for information. Returns search results with titles, URLs, and snippets. Use this when you need to find current information, news, or any web content.",
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
            description: "Workspace ID: creator-audio, creator-video, designer, automation-flow, finance, health, teacher, marketing, system, developer, automotive-garage",
          },
          action: {
            type: "string",
            description: "Action to execute. creator-audio: start_recording, stop_recording, toggle_metronome, tune_voice, tune_to_note, generate_beat, preview_note, normalize, add_reverb, add_delay, pitch_shift, time_stretch, set_eq, set_volume, play, pause, stop, load_audio, analyze, export_audio, get_realtime_data. creator-video: add_clip, delete_clip, split_clip, add_effect, set_transition, set_text, export_video, get_timeline. designer: add_element, delete_element, change_bg, change_canvas_size, duplicate_element, export_design, get_elements, create_template, bring_forward, send_backward. automation-flow: add_node, delete_node, add_edge, delete_edge, simulate, get_flow, save_flow, load_flow, export_flow, import_flow. finance: add_transaction, delete_transaction, get_summary, get_transactions. health: log_meal, log_workout, log_metric, get_summary, get_trends, get_meal_history. teacher: add_quiz_question, get_quiz, clear_canvas, export_canvas, start_quiz, get_quiz_status, stop_quiz. marketing: add_campaign, pause_campaign, resume_campaign, get_campaigns, create_post, get_posts. system: execute_command, get_processes, get_resources. developer: read_file, write_file, list_files, execute_command. automotive-garage: add_vehicle, add_service_record, add_expense, get_fleet_summary, get_service_history, get_expenses",
          },
          params: {
            type: "object",
            description: "Action parameters. Varies per action. Examples: { note:'C4' } for tune_to_note; { bpm:120, beats_per_bar:4 } for toggle_metronome; { bpm:140, style:'trap', bars:4 } for generate_beat; { template:'resume' } for create_template; { elementId:'elm_xxx' } for bring_forward/send_backward; { flowId:'default' } for save_flow/load_flow; { title:'Promoção', body:'50% OFF', channel:'Instagram' } for create_post; { metric:'weight', days:7 } for get_trends",
          },
        },
        required: ["workspace", "action"],
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
];

// ── Tool implementations ────────────────────────────────────────────────

function readFile(args) {
  if (!isPathAllowed(args.path)) return { error: "Access denied: path outside allowed workspace" };
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
  let filePath = args.path;
  if (!filePath) return { error: "path is required" };
  // Resolve relative paths against process.cwd() (project root)
  if (!path.isAbsolute(filePath)) {
    filePath = path.join(process.cwd(), filePath);
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
  if (!isPathAllowed(args.path)) return { error: "Access denied: path outside allowed workspace" };
  try {
    let content = fs.readFileSync(args.path, "utf8");
    if (!content.includes(args.search)) return { error: "Search text not found in file" };
    content = content.split(args.search).join(args.replace);
    fs.writeFileSync(args.path, content, "utf8");
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function listFiles(args) {
  if (!isPathAllowed(args.path || ".")) return { error: "Access denied: path outside allowed roots" };
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
  if (!isPathAllowed(args.path || ".")) return { error: "Access denied: path outside allowed roots" };
  try {
    const base = args.path || ".";
    const { globSync } = require("glob");
    const matches = globSync(args.pattern, { cwd: base, absolute: false, nodir: false }).slice(0, 200);
    return { matches };
  } catch {
    // Fallback: recursive fs walk (cross-platform, no shell dependency)
    try {
      const base = path.resolve(args.path || ".");
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
  if (!isPathAllowed(args.path || ".")) return { error: "Access denied: path outside allowed roots" };
  try {
    const base = args.path || ".";
    const include = args.include ? ["-g", args.include] : [];
    const out = execFileSync("rg", ["-n", "--no-heading", "-e", args.pattern, ...include, base], { encoding: "utf8", timeout: 15000, windowsHide: true });
    return { matches: out.trim() };
  } catch (err) {
    if (err.status === 1) return { matches: "No matches found" };
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
      cwd: args.cwd || undefined,
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
  logger.tools.info(`[notify] ${args.title}: ${args.body}`);
  return { success: true };
}

function scheduleTask(args) {
  // Log only — responses stay inside the app, no OS notifications.
  const delayMs = (args.delay_seconds || 60) * 1000;
  setTimeout(() => {
    logger.tools.info(`[schedule_task] ${args.title}: ${args.message}`);
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

async function generateImage(args) {
  if (!ctx?.image3d) {
    return { error: "Image generation module not initialized. Restart Orun OS." };
  }
  if (!ctx?.readSecretStore) {
    return { error: "Secret store not available." };
  }
  const keys = ctx.readSecretStore();
  const falKey = keys.fal;
  if (!falKey) {
    return { error: "Fal.ai API key not configured. Go to Settings → API Keys and add your Fal.ai key." };
  }
  try {
    const result = await ctx.image3d.generateImage({
      prompt: args.prompt,
      model: args.model || "fal-ai/flux/schnell",
      imageSize: args.imageSize || "landscape_16_9",
    }, falKey);
    return { ok: true, imageUrl: result.images?.[0]?.url || null, images: result.images, model: result.model };
  } catch (err) {
    return { error: err.message || String(err) };
  }
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
    case "generate_image": return generateImage(args);
    case "web_search": {
      const { query, numResults = 5 } = args;
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
      const validAgents = ["Health", "Finance", "Developer", "Teacher", "Designer", "Creator", "Marketing", "Automation", "System"];
      if (!validAgents.includes(agent)) return { error: `Invalid agent: ${agent}. Valid agents: ${validAgents.join(", ")}` };
      return { triggered: true, agent, message, timestamp: Date.now() };
    }
    case "workspace_action": {
      try {
        const { BrowserWindow, ipcMain } = require("electron");
        const win = BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) return { error: "No active window found" };
        const { workspace, action, params } = args;
        const requestId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const result = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Workspace action timed out after 30s")), 30000);
          const handler = (_event, rid, data) => {
            if (rid === requestId) {
              clearTimeout(timeout);
              ipcMain.removeListener("workspace:action:result", handler);
              resolve(data);
            }
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
    default: return { error: `Unknown tool: ${name}` };
  }
}

async function executeTool(name, args) {
  try {
    return await withTimeout(executeToolRaw(name, args), TOOL_TIMEOUT, `tool:${name}`);
  } catch (err) {
    const userMessage = getErrorMessage(err);
    logger.tools.error(`[TOOL ERROR] ${name}:`, err.message);
    return { error: userMessage };
  }
}

module.exports = { init, setAllowedRoots, TOOL_DEFINITIONS, executeTool, isCommandSafe };

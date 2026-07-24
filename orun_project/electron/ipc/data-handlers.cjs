// electron/ipc/data-handlers.cjs
// Data/domain handlers: n8n, automation, MCP, plugins, health, nutrition,
// finance, developer, teacher, agenda, schedules, sync.

const fs = require("fs");
const path = require("path");
const log = require("electron-log");

function register(ipcMain, ctx) {
  const { db, n8n, secretStore, mcpClient, pluginSystem, supabaseSync, scheduler, app } = ctx;

  // n8n
  ipcMain.handle("n8n:list-workflows", async () => {
    const cfg = db.getSetting("n8n", {});
    return n8n.listWorkflows({ baseUrl: cfg.baseUrl, apiKey: secretStore.readSecretStore().n8n });
  });
  ipcMain.handle("n8n:test-connection", async (_event, overrideCfg) => {
    const cfg = { ...db.getSetting("n8n", {}), ...(overrideCfg || {}) };
    return n8n.testConnection({ baseUrl: cfg.baseUrl, apiKey: secretStore.readSecretStore().n8n });
  });
  ipcMain.handle("n8n:trigger-webhook", async (_event, { webhookUrl, payload, headerName, headerValue }) => {
    if (!webhookUrl || typeof webhookUrl !== "string") return { ok: false, error: "Invalid webhook URL" };
    try { new URL(webhookUrl); } catch { return { ok: false, error: "Invalid webhook URL format" }; }
    try { return { ok: true, result: await n8n.triggerWebhook({ webhookUrl, payload, headerName, headerValue }) }; }
    catch (err) { log.error("[n8n:trigger-webhook] failed:", err.message); return { ok: false, error: err.message || String(err) }; }
  });

  // Automation rules (inter-agent)
  ipcMain.handle("automation:list-rules", () => {
    return db.getSetting("automationRules", []);
  });
  ipcMain.handle("automation:add-rule", (_, rule) => {
    const rules = db.getSetting("automationRules", []);
    rules.push({ id: require("crypto").randomUUID(), ...rule, enabled: true, created_at: Date.now() });
    db.setSetting("automationRules", rules);
    return { ok: true, rules };
  });
  ipcMain.handle("automation:remove-rule", (_, ruleId) => {
    const rules = db.getSetting("automationRules", []);
    const filtered = rules.filter((r) => r.id !== ruleId);
    db.setSetting("automationRules", filtered);
    return { ok: true, rules: filtered };
  });
  ipcMain.handle("automation:toggle-rule", (_, ruleId) => {
    const rules = db.getSetting("automationRules", []);
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) rule.enabled = !rule.enabled;
    db.setSetting("automationRules", rules);
    return { ok: true, rules };
  });

  // MCP Server management
  ipcMain.handle("mcp:list-servers", () => mcpClient.listServers());
  ipcMain.handle("mcp:add-server", async (_, { name, command, args, env }) => {
    try {
      if (!name || typeof name !== "string" || name.length > 100) return { ok: false, error: "Invalid server name" };
      if (!command || typeof command !== "string") return { ok: false, error: "Invalid command" };
      if (command.includes("..") || command.includes("/") || command.includes("\\")) {
        return { ok: false, error: "Command must be a bare executable name, not a path" };
      }
      if (args && !Array.isArray(args)) return { ok: false, error: "Args must be an array" };
      if (env && typeof env !== "object") return { ok: false, error: "Env must be an object" };
      const tools = await mcpClient.addServer(name, command, args || [], env || {});
      return { ok: true, tools: tools.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  ipcMain.handle("mcp:remove-server", (_, name) => {
    mcpClient.removeServer(name);
    return { ok: true };
  });
  ipcMain.handle("mcp:list-tools", () => mcpClient.getAllTools().map((t) => ({ name: t.name, description: t.description })));

  ipcMain.handle("plugins:list", () => pluginSystem.listAvailable());
  ipcMain.handle("plugins:load", (_, id) => pluginSystem.loadPlugin(id));
  ipcMain.handle("plugins:unload", (_, id) => pluginSystem.unloadPlugin(id));
  ipcMain.handle("plugins:load-all", () => pluginSystem.loadAll());

  // Nutrition log
  ipcMain.handle("nutrition:get-daily", (_event, date) => db.getDailyNutrition(date));

  // Finance log
  ipcMain.handle("finance:get-daily", (_event, date) => db.getDailyFinance(date));

  // Health log
  ipcMain.handle("health:get-daily", (_event, date) => db.getDailyHealth(date));

  // Range queries for charts
  ipcMain.handle("finance:get-range", (_, startDate, endDate) => db.getFinanceRange(startDate, endDate));
  ipcMain.handle("health:get-range", (_, startDate, endDate) => db.getHealthRange(startDate, endDate));
  ipcMain.handle("nutrition:get-range", (_, startDate, endDate) => db.getNutritionRange(startDate, endDate));
  ipcMain.handle("developer:get-range", (_, startDate, endDate) => db.getDeveloperRange(startDate, endDate));
  ipcMain.handle("teacher:get-range", (_, startDate, endDate) => db.getTeacherRange(startDate, endDate));
  ipcMain.handle("videoeditor:get-range", (_, startDate, endDate) => db.getCreatorRange(startDate, endDate));
  ipcMain.handle("musicproducer:get-range", (_, startDate, endDate) => db.getCreatorRange(startDate, endDate));
  ipcMain.handle("image3d:get-range", (_, startDate, endDate) => db.getDesignerRange(startDate, endDate));
  ipcMain.handle("usage:get-range", (_, startDate, endDate) => db.getUsageRange(startDate, endDate));

  // Developer reviews
  ipcMain.handle("developer:get-reviews", (_event, date) => db.getDailyReviews(date));

  // Developer workspace integration
  ipcMain.handle("developer:set-workspace", (_, workspacePath) => {
    db.setSetting("developerWorkspace", workspacePath);
    return { ok: true };
  });
  ipcMain.handle("developer:get-workspace", () => {
    return db.getSetting("developerWorkspace", null);
  });
  ipcMain.handle("developer:list-files", (_, dirPath) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { app } = require("electron");
      const resolved = path.resolve(dirPath);
      const allowedRoots = [
        app.getPath("userData"),
        app.getPath("documents"),
        app.getPath("desktop"),
        app.getPath("home"),
      ];
      const isAllowed = allowedRoots.some((root) => resolved.startsWith(root));
      if (!isAllowed) return { error: "Access denied: path outside allowed directories" };
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      return entries
        .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules" && e.name !== "__pycache__")
        .map((e) => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(resolved, e.name) }))
        .slice(0, 100);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("developer:read-file", (_, { filePath }) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { app } = require("electron");
      let resolved = String(filePath || "");
      if (!resolved) return { error: "path is required" };
      // Resolve relative paths against developerWorkspace
      if (!path.isAbsolute(resolved)) {
        const ws = db.getSetting("developerWorkspace", "") || process.cwd();
        resolved = path.join(ws, resolved);
      }
      const absResolved = path.resolve(resolved);
      const allowedRoots = [
        app.getPath("userData"),
        app.getPath("documents"),
        app.getPath("desktop"),
        app.getPath("home"),
      ];
      if (!allowedRoots.some((root) => absResolved.startsWith(root))) {
        return { error: "Access denied: path outside allowed directories" };
      }
      if (!fs.existsSync(absResolved)) return { error: `File not found: ${absResolved}` };
      const stat = fs.statSync(absResolved);
      if (stat.isDirectory()) return { error: "Path is a directory, not a file" };
      if (stat.size > 5 * 1024 * 1024) return { error: "File too large (max 5MB)" };
      const content = fs.readFileSync(absResolved, "utf8");
      return { content };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("developer:write-file", (_, { filePath, content }) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const { app } = require("electron");
      let resolved = String(filePath || "");
      if (!resolved) return { error: "path is required" };
      // Resolve relative paths against developerWorkspace or process.cwd()
      if (!path.isAbsolute(resolved)) {
        const ws = db.getSetting("developerWorkspace", "") || process.cwd();
        resolved = path.join(ws, resolved);
      }
      const absResolved = path.resolve(resolved);
      const allowedRoots = [
        app.getPath("userData"),
        app.getPath("documents"),
        app.getPath("desktop"),
        app.getPath("home"),
      ];
      if (!allowedRoots.some((root) => absResolved.startsWith(root))) {
        return { error: "Access denied: path outside allowed directories" };
      }
      const dir = path.dirname(absResolved);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(absResolved, String(content || ""), "utf8");
      return { success: true, bytes: String(content || "").length, path: absResolved };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("developer:execute-command", (_, { command }) => {
    try {
      const { execSync } = require("child_process");
      const { isCommandSafe } = require("../tools.cjs");
      const cmd = String(command || "").trim();
      if (!cmd) return { stdout: "", stderr: "No command provided", exitCode: 1 };
      if (!isCommandSafe(cmd)) {
        return { stdout: "", stderr: "Command blocked by security policy", exitCode: 1 };
      }
      const output = execSync(cmd, { encoding: "utf8", timeout: 30000, windowsHide: true });
      return { stdout: output, stderr: "", exitCode: 0 };
    } catch (e) {
      return { stdout: "", stderr: e.message, exitCode: e.status || 1 };
    }
  });

  // Teacher progress
  ipcMain.handle("teacher:get-progress", (_event, date) => db.getDailyProgress(date));

  // Daily agent schedules (e.g. Health's morning workout)
  ipcMain.handle("schedules:get", () => scheduler.getSchedules());
  ipcMain.handle("schedules:set", (_event, agentName, cfg) => { scheduler.setSchedule(agentName, cfg); return true; });

  // Health goals & weight tracking
  ipcMain.handle("health:get-goals", () => db.getHealthGoals());
  ipcMain.handle("health:set-goals", (_event, goals) => { db.saveHealthGoals(goals); return true; });
  ipcMain.handle("health:weekly-weight", () => db.getWeeklyWeightComparison());
  ipcMain.handle("health:log-weight", (_event, weightKg) => {
    if (typeof weightKg !== "number" || weightKg < 0 || weightKg > 500) return false;
    const id = require("crypto").randomUUID();
    db.recordHealthMetric({ id, metric: "peso", value: weightKg, unit: "kg", source: "app" });
    ctx.syncEnqueue("health_log", { id, date: new Date().toISOString().slice(0, 10), metric: "peso", value: weightKg, unit: "kg", source: "app", created_at: Date.now() });
    return true;
  });

  // Daily agenda
  ipcMain.handle("agenda:get", (_event, date) => db.getDailyAgenda(date));
  ipcMain.handle("agenda:add", (_event, entry) => { db.saveDailyAgenda(entry); return true; });
  ipcMain.handle("agenda:clear", (_event, date) => { db.clearDailyAgenda(date); return true; });

  // Nutrition file for today
  ipcMain.handle("nutrition:get-today-file", () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = path.join(app.getPath("userData"), "nutrition", `${date}.md`);
      return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
    } catch { return null; }
  });

  // PostgreSQL cloud sync
  ipcMain.handle("sync:status", () => ({ connected: supabaseSync.isConnected() }));
  ipcMain.handle("sync:trigger", async () => {
    if (!supabaseSync.isConnected()) return { ok: false, error: "PostgreSQL not configured" };
    return supabaseSync.sync(db.getDb());
  });
  ipcMain.handle("sync:test", async () => {
    if (!supabaseSync.isConnected()) return { ok: false, error: "PostgreSQL not configured" };
    return supabaseSync.testConnection();
  });
  ipcMain.handle("sync:configure", async (_event, { databaseUrl }) => {
    try {
      // Validate URL format
      if (!databaseUrl || typeof databaseUrl !== "string") return { ok: false, error: "Invalid database URL" };
      try { new URL(databaseUrl); } catch { return { ok: false, error: "Invalid database URL format" }; }
      if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) return { ok: false, error: "URL must start with postgresql:// or postgres://" };
      // Write DATABASE_URL to .env
      const envPath = path.join(__dirname, "..", "..", ".env");
      const directUrl = databaseUrl.replace(":6543/", ":5432/");
      const envContent = [
        "# Orun OS — PostgreSQL Connection",
        `DATABASE_URL="${databaseUrl}"`,
        `DIRECT_URL="${directUrl}"`,
        "# Sync interval in milliseconds (default: 5 minutes)",
        "SYNC_INTERVAL_MS=300000",
        "",
      ].join("\n");
      fs.writeFileSync(envPath, envContent);
      // Also store encrypted in userData for extra security
      try { secretStore.writeSecret("databaseUrl", databaseUrl); } catch { /* best effort */ }
      // Re-init from .env
      const ok = supabaseSync.init();
      if (!ok) return { ok: false, error: "Failed to init PostgreSQL from .env" };
      const test = await supabaseSync.testConnection();
      if (!test.ok) return { ok: false, error: test.error };
      const pull = await supabaseSync.pull(db.getDb());
      log.info(`[sync] configured, initial pull: ${pull.pulled} rows`);
      return { ok: true, pulled: pull.pulled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Import conversation (for export/import feature)
  ipcMain.handle("data:import-conversation", async (_ev, { id, messages }) => {
    try {
      const rawDb = db.getDb();
      rawDb.prepare("INSERT OR IGNORE INTO conversations (id, agent, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))").run(id);

      const stmt = rawDb.prepare("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)");
      for (const msg of messages) {
        stmt.run(msg.id || require("crypto").randomUUID(), id, msg.role, msg.content, msg.created_at || Date.now());
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { register };

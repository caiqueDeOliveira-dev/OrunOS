const fs = require("fs");
const path = require("path");
const log = require("electron-log");

let pluginsDir = null;
let loadedPlugins = new Map();

function init(userDataPath) {
  pluginsDir = path.join(userDataPath, "plugins");
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
}

function listAvailable() {
  if (!pluginsDir) return [];
  try {
    const dirs = fs.readdirSync(pluginsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    return dirs.map((d) => {
      const manifestPath = path.join(pluginsDir, d.name, "manifest.json");
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        return { id: d.name, ...manifest, installed: loadedPlugins.has(d.name) };
      } catch {
        return { id: d.name, name: d.name, version: "0.0.0", error: "Invalid manifest", installed: false };
      }
    });
  } catch { return []; }
}

function loadPlugin(pluginId) {
  if (!pluginsDir) return { error: "Plugin system not initialized" };
  const pluginDir = path.join(pluginsDir, pluginId);
  const manifestPath = path.join(pluginDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return { error: `Plugin ${pluginId} not found` };
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const mainFile = path.join(pluginDir, manifest.main || "index.js");
    if (!fs.existsSync(mainFile)) return { error: `Plugin ${pluginId}: main file not found` };
    const pluginContext = {
      id: pluginId, manifest, dir: pluginDir,
      config: loadPluginConfig(pluginId),
      tools: [], hooks: {},
      registerTool: (tool) => { pluginContext.tools.push(tool); },
      registerHook: (event, handler) => { pluginContext.hooks[event] = handler; },
      saveConfig: (config) => { savePluginConfig(pluginId, config); pluginContext.config = config; },
      log: (...args) => log.info(`[plugin:${pluginId}]`, ...args),
    };
    const vm = require("vm");
    const code = fs.readFileSync(mainFile, "utf8");
    const wrappedCode = `(function(require, module, exports, context) { ${code} })`;
    const fn = vm.runInNewContext(wrappedCode, { setTimeout, setInterval, clearTimeout, clearInterval, console }, { timeout: 5000 });
    const moduleObj = { exports: {} };

    // Restricted require: only allow safe modules
    const ALLOWED_MODULES = new Set(["path", "url", "util", "events", "crypto", "os"]);
    const safeRequire = (mod) => {
      if (!ALLOWED_MODULES.has(mod)) throw new Error(`Plugin require('${mod}') is not allowed`);
      return require(mod);
    };

    fn(safeRequire, moduleObj, moduleObj.exports, pluginContext);
    loadedPlugins.set(pluginId, pluginContext);
    return { success: true, tools: pluginContext.tools.length, hooks: Object.keys(pluginContext.hooks) };
  } catch (e) {
    return { error: e.message };
  }
}

function unloadPlugin(pluginId) {
  const plugin = loadedPlugins.get(pluginId);
  if (!plugin) return { error: "Plugin not loaded" };
  try { if (plugin.hooks.onUnload) plugin.hooks.onUnload(); } catch {}
  loadedPlugins.delete(pluginId);
  return { success: true };
}

function getPluginTools() {
  const tools = [];
  for (const [id, plugin] of loadedPlugins) {
    for (const tool of plugin.tools) {
      tools.push({ name: `plugin_${id}__${tool.name}`, description: `[Plugin:${id}] ${tool.description}`, parameters: tool.parameters || { type: "object", properties: {} } });
    }
  }
  return tools;
}

async function executePluginTool(fullName, args) {
  const sep = fullName.indexOf("__");
  if (sep === -1) return { error: "Invalid plugin tool name" };
  const pluginId = fullName.substring(7, sep);
  const toolName = fullName.substring(sep + 2);
  const plugin = loadedPlugins.get(pluginId);
  if (!plugin) return { error: `Plugin ${pluginId} not loaded` };
  const tool = plugin.tools.find((t) => t.name === toolName);
  if (!tool) return { error: `Tool ${toolName} not found in plugin ${pluginId}` };
  try { return await Promise.race([tool.execute(args, plugin.config), new Promise((_, rej) => setTimeout(() => rej(new Error("Plugin tool timed out after 30s")), 30000))]); } catch (e) { return { error: e.message }; }
}

function emitHook(event, data) {
  for (const [id, plugin] of loadedPlugins) {
    if (plugin.hooks[event]) { try { plugin.hooks[event](data); } catch {} }
  }
}

function loadPluginConfig(pluginId) {
  if (!pluginsDir) return {};
  try { return JSON.parse(fs.readFileSync(path.join(pluginsDir, pluginId, "config.json"), "utf8")); } catch { return {}; }
}

function savePluginConfig(pluginId, config) {
  if (!pluginsDir) return;
  fs.writeFileSync(path.join(pluginsDir, pluginId, "config.json"), JSON.stringify(config, null, 2));
}

function loadAll() {
  const available = listAvailable();
  return available.filter((p) => !p.error).map((p) => ({ id: p.id, ...loadPlugin(p.id) }));
}

module.exports = { init, listAvailable, loadPlugin, unloadPlugin, getPluginTools, executePluginTool, emitHook, loadAll };

// electron/mcp-client.cjs
//
// Minimal MCP (Model Context Protocol) client for Orun OS.
// Connects to MCP servers via stdio and exposes their tools.

const { spawn } = require("child_process");
const { randomUUID } = require("crypto");
const log = require("electron-log");

class MCPServer {
  constructor(name, command, args = [], env = {}) {
    this.name = name;
    this.command = command;
    this.args = args;
    this.env = { ...process.env, ...env };
    this.process = null;
    this.tools = [];
    this.pending = new Map();
    this.buffer = "";
    this.ready = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.command, this.args, {
          env: this.env,
          stdio: ["pipe", "pipe", "pipe"],
        });

        this.process.stdout.on("data", (data) => {
          this.buffer += data.toString();
          this._processBuffer();
        });

        this.process.stderr.on("data", (data) => {
          log.warn(`[mcp:${this.name}] stderr: ${data.toString().trim()}`);
        });

        this.process.on("error", (err) => {
          log.error(`[mcp:${this.name}] spawn error:`, err.message);
          this.ready = false;
          reject(err);
        });

        this.process.on("close", (code) => {
          log.info(`[mcp:${this.name}] process closed with code ${code}`);
          this.ready = false;
        });

        // Initialize handshake
        this._send("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "orun-os", version: "1.0.0" },
        }).then((result) => {
          this.ready = true;
          log.info(`[mcp:${this.name}] initialized: ${JSON.stringify(result?.serverInfo || {})}`);
          return this._listTools();
        }).then((tools) => {
          this.tools = tools;
          log.info(`[mcp:${this.name}] ${tools.length} tools loaded`);
          resolve(tools);
        }).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  _processBuffer() {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch {
        // Not JSON, skip
      }
    }
  }

  async _send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.pending.set(id, { resolve, reject });
      this.process.stdin.write(msg);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP timeout for ${method}`));
        }
      }, 15000);
    });
  }

  async _listTools() {
    const result = await this._send("tools/list", {});
    return (result?.tools || []).map((t) => ({
      name: `${this.name}__${t.name}`,
      description: `[MCP:${this.name}] ${t.description}`,
      parameters: t.inputSchema || { type: "object", properties: {} },
      _mcpServer: this.name,
      _mcpTool: t.name,
    }));
  }

  async callTool(toolName, args) {
    if (!this.ready) return { error: `MCP server ${this.name} not ready` };
    try {
      const result = await this._send("tools/call", { name: toolName, arguments: args });
      const content = result?.content || [];
      const text = content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
      return { text, content };
    } catch (e) {
      return { error: e.message };
    }
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.ready = false;
    }
  }
}

// ── Manager ─────────────────────────────────────────────────────

const servers = new Map();

async function addServer(name, command, args, env) {
  if (servers.has(name)) {
    servers.get(name).stop();
  }
  const server = new MCPServer(name, command, args, env);
  servers.set(name, server);
  const tools = await server.start();
  return tools;
}

function removeServer(name) {
  const server = servers.get(name);
  if (server) {
    server.stop();
    servers.delete(name);
  }
}

function getAllTools() {
  const allTools = [];
  for (const [, server] of servers) {
    allTools.push(...server.tools);
  }
  return allTools;
}

async function callTool(fullToolName, args) {
  const doubleUnderscore = fullToolName.indexOf("__");
  if (doubleUnderscore === -1) return { error: `Invalid MCP tool name: ${fullToolName}` };
  const serverName = fullToolName.substring(0, doubleUnderscore);
  const toolName = fullToolName.substring(doubleUnderscore + 2);
  const server = servers.get(serverName);
  if (!server) return { error: `MCP server not found: ${serverName}` };
  return server.callTool(toolName, args);
}

function listServers() {
  const result = [];
  for (const [name, server] of servers) {
    result.push({ name, ready: server.ready, tools: server.tools.length });
  }
  return result;
}

function stopAll() {
  for (const [, server] of servers) {
    server.stop();
  }
  servers.clear();
}

module.exports = { addServer, removeServer, getAllTools, callTool, listServers, stopAll };

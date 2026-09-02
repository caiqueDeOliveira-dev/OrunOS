import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import {
  createMcpHttpClient,
  extractTextFromResult,
  toMcpContentValue,
  McpRpcError,
  MCP_TOOL_PICK_PATTERN,
  createA2aClient,
  toA2aMessage,
  fromA2aMessage,
  ModelRouter,
  InMemoryComboStore,
  InMemoryProviderConfigStore,
  InMemorySecretStore,
  InMemoryUsageLogStore,
  InMemorySkillStore,
  getProvider,
} from "@orun/ai-router-core";

// ─────────────────────────────────────────────────────────────
// Mock servers
// ─────────────────────────────────────────────────────────────
const mcpLog = { methods: [], toolCalls: [], auth: null };
const a2aLog = { methods: [], sends: [], auth: null };

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

function createMockServers() {
  const mcp = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      mcpLog.auth = req.headers.authorization ?? null;
      const parsed = JSON.parse(body || "{}");
      const { id, method, params } = parsed;
      mcpLog.methods.push(method);
      if (method === "notifications/initialized") {
        res.statusCode = 202;
        res.end();
        return;
      }
      const url = req.url.split("?")[0];
      if (url === "/mcp-sse") {
        res.setHeader("Content-Type", "text/event-stream");
        res.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id, result: rpcResult(method, params) })}\n\n`);
        res.end();
        return;
      }
      if (method === "initialize") {
        json(res, 200, { jsonrpc: "2.0", id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "mock-mcp", version: "1.0" } } });
        return;
      }
      if (method === "tools/list") {
        json(res, 200, { jsonrpc: "2.0", id, result: { tools: [{ name: "complete", description: "gera resposta", inputSchema: {} }, { name: "fail" }, { name: "other" }] } });
        return;
      }
      if (method === "tools/call") {
        mcpLog.toolCalls.push(params);
        if (params.name === "fail") {
          json(res, 200, { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "deu ruim" }], isError: true } });
          return;
        }
        if (params.name === "boom") {
          json(res, 200, { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
          return;
        }
        json(res, 200, { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "resposta do MCP" }], isError: false } });
        return;
      }
      json(res, 500, { jsonrpc: "2.0", id, error: { code: -32000, message: "boom" } });
    });
  });

  const a2a = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      a2aLog.auth = req.headers.authorization ?? null;
      if (req.url === "/.well-known/agent.json") {
        json(res, 200, { name: "mock-agent", url: "http://127.0.0.1/rpc", capabilities: { streaming: true }, skills: [] });
        return;
      }
      const parsed = JSON.parse(body || "{}");
      const { id, method, params } = parsed;
      a2aLog.methods.push(method);
      if (req.url === "/rpc-stream" && method === "message/stream") {
        res.setHeader("Content-Type", "text/event-stream");
        res.write(`event: message/delta\ndata: ${JSON.stringify({ message: { role: "assistant", parts: [{ kind: "text", text: "olá " }] } })}\n\n`);
        res.write(`event: message/complete\ndata: ${JSON.stringify({ message: { role: "assistant", parts: [{ kind: "text", text: "olá mundo" }] } })}\n\n`);
        res.end();
        return;
      }
      if (method === "message/send") {
        a2aLog.sends.push(params);
        json(res, 200, { jsonrpc: "2.0", id, result: { message: { role: "assistant", parts: [{ kind: "text", text: "resposta A2A" }] } } });
        return;
      }
      if (method === "message/stream") {
        // servidor que responde JSON (sem SSE) — deve forçar fallback no adapter
        json(res, 200, { jsonrpc: "2.0", id, result: {} });
        return;
      }
      json(res, 200, { jsonrpc: "2.0", id, error: { code: -32601, message: "nope" } });
    });
  });

  return { mcp, a2a };
}

function rpcResult(method, params) {
  if (method === "tools/call") return { content: [{ type: "text", text: "resposta SSE MCP" }], isError: false };
  return { tools: [{ name: "complete" }] };
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function makeRouter() {
  const cfgStore = new InMemoryProviderConfigStore();
  const secretStore = new InMemorySecretStore();
  const usage = new InMemoryUsageLogStore();
  const router = new ModelRouter(
    new InMemoryComboStore(),
    cfgStore,
    secretStore,
    new InMemorySkillStore(),
    usage,
  );
  return { router, cfgStore, secretStore };
}

const mcpPort = 0;
const a2aPort = 0;
let servers;

beforeAll(async () => {
  servers = createMockServers();
  servers.m = await listen(servers.mcp);
  servers.a = await listen(servers.a2a);
});

afterAll(async () => {
  await close(servers.mcp);
  await close(servers.a2a);
});

const MCP_URL_PREFIX = () => `http://127.0.0.1:${servers.m}`;
const A2A_URL_PREFIX = () => `http://127.0.0.1:${servers.a}`;

// ─────────────────────────────────────────────────────────────
describe("provider registry — MCP/A2A como provider (prio 4)", () => {
  it("registra mcp e a2a com wireFormat próprio", () => {
    expect(getProvider("mcp").wireFormat).toBe("mcp-native");
    expect(getProvider("a2a").wireFormat).toBe("a2a-native");
    expect(getProvider("mcp").capabilities).toContain("tools");
  });
});

describe("mcp client — streamable HTTP (JSON)", () => {
  it("initializa, lista tools e chama tools/call passando as mensagens", async () => {
    const client = createMcpHttpClient({
      endpoint: `${MCP_URL_PREFIX()}/mcp`,
      headersProvider: async () => ({ Authorization: "Bearer k" }),
    });
    const init = await client.initialize();
    expect(init.serverInfo.name).toBe("mock-mcp");
    const tools = await client.toolsList();
    expect(tools.tools.map((t) => t.name)).toContain("complete");
    const result = await client.toolsCall("complete", { messages: [{ role: "user", content: "oi" }] });
    expect(extractTextFromResult(result)).toBe("resposta do MCP");
    expect(mcpLog.auth).toBe("Bearer k");
    const sent = mcpLog.toolCalls[mcpLog.toolCalls.length - 1];
    expect(sent.name).toBe("complete");
    expect(sent.arguments.messages[0].content).toBe("oi");
  });

  it("lança McpRpcError em erro JSON-RPC do servidor", async () => {
    const client = createMcpHttpClient({ endpoint: `${MCP_URL_PREFIX()}/mcp` });
    await expect(client.toolsCall("boom", {})).rejects.toBeInstanceOf(McpRpcError);
    await expect(client.toolsCall("boom", {})).rejects.toMatchObject({ code: -32601 });
  });

  it("converte valores e extrai texto", () => {
    expect(toMcpContentValue({ a: 1 })).toBe('{"a":1}');
    expect(toMcpContentValue("txt")).toBe("txt");
    expect(extractTextFromResult({ content: [{ type: "text", text: "a" }, { type: "image" }, { type: "text", text: "b" }] })).toBe("ab");
    expect(MCP_TOOL_PICK_PATTERN.test("complete-things")).toBe(true);
  });
});

describe("mcp client — respostas via SSE", () => {
  it("resolve tools/call quando o servidor responde em text/event-stream", async () => {
    const client = createMcpHttpClient({ endpoint: `${MCP_URL_PREFIX()}/mcp-sse` });
    const result = await client.toolsCall("complete", {});
    expect(extractTextFromResult(result)).toBe("resposta SSE MCP");
  });
});

describe("mcp adapter — via ModelRouter.tryStep", () => {
  it("rota um step mcp pro tool do servidor e devolve o texto", async () => {
    const { router, cfgStore, secretStore } = makeRouter();
    cfgStore.saveConfig({ providerId: "mcp", accountLabel: "acctA", enabled: true, customBaseUrl: `${MCP_URL_PREFIX()}/mcp` });
    await secretStore.setCredential("mcp", { apiKey: "k" }, "acctA");
    const step = { providerId: "mcp", model: "complete", maxRetries: 0 };
    const attempts = [];
    const result = await router.tryStep({ id: "c", kind: "text", steps: [step] }, step, 0, [{ role: "user", content: "oi" }], { maxTokens: 100 }, attempts);
    expect(result.content).toBe("resposta do MCP");
    expect(attempts).toHaveLength(0);
  });

  it("marca isError como falha do provider", async () => {
    const { router, cfgStore, secretStore } = makeRouter();
    cfgStore.saveConfig({ providerId: "mcp", accountLabel: "acctA", enabled: true, customBaseUrl: `${MCP_URL_PREFIX()}/mcp` });
    await secretStore.setCredential("mcp", { apiKey: "k" }, "acctA");
    const step = { providerId: "mcp", model: "fail", maxRetries: 0 };
    const attempts = [];
    const result = await router.tryStep({ id: "c", kind: "text", steps: [step] }, step, 0, [{ role: "user", content: "oi" }], {}, attempts);
    expect(result).toBeNull();
    expect(attempts[0].error).toContain("erro");
  });
});

describe("a2a — mapeamento de mensagens", () => {
  it("toA2aMessage: system entra na nova mensagem do usuário", () => {
    const { message, history } = toA2aMessage([
      { role: "system", content: "seja curto" },
      { role: "user", content: "olá" },
    ]);
    expect(message.role).toBe("user");
    expect(message.parts[0].text).toBe("seja curto\n\nolá");
    expect(history).toHaveLength(0);
  });

  it("toA2aMessage: mantém histórico com role tool → function-response", () => {
    const { message, history } = toA2aMessage([
      { role: "user", content: "quanto é 2+2?" },
      { role: "assistant", content: "", tool_calls: [{ id: "c1", function: { name: "calc", arguments: '{"a":2,"b":2}' } }] },
      { role: "tool", content: "4", toolCallId: "c1", name: "calc" },
      { role: "user", content: "obrigado" },
    ]);
    expect(message.parts[0].text).toBe("obrigado");
    const roles = history.map((h) => h.role);
    expect(roles).toEqual(["user", "assistant", "user"]);
    const allParts = history.flatMap((h) => h.parts);
    const fc = allParts.find((p) => p.kind === "function-call");
    expect(fc.name).toBe("calc");
    const fr = history.filter((h) => h.parts.some((p) => p.kind === "function-response"));
    expect(fr).toHaveLength(1);
    expect(fr[0].parts[0].name).toBe("calc");
  });

  it("assistant com text + tool_calls viram parts na mesma mensagem", () => {
    const { message, history } = toA2aMessage([
      { role: "user", content: "u" },
      { role: "assistant", content: "vou calcular", tool_calls: [{ id: "c2", function: { name: "calc", arguments: "{}" } }] },
      { role: "user", content: "e aí?" },
    ]);
    expect(message.parts[0].text).toBe("e aí?");
    const allParts = history.flatMap((h) => h.parts);
    const kinds = allParts.map((p) => p.kind);
    expect(kinds).toContain("text");
    expect(kinds).toContain("function-call");
  });

  it("fromA2aMessage: text + function-call → conteúdo + toolCalls OpenAI", () => {
    const { content, toolCalls } = fromA2aMessage({
      role: "assistant",
      parts: [
        { kind: "text", text: "usei a " },
        { kind: "function-call", name: "calc", parameters: '{"a":2}' },
        { kind: "text", text: "ferramenta" },
      ],
    });
    expect(content).toBe("usei a ferramenta");
    expect(toolCalls[0].function.name).toBe("calc");
    expect(toolCalls[0].function.arguments).toBe('{"a":2}');
  });
});

describe("a2a client — JSON-RPC e agent card", () => {
  it("lê o agent card e faz message/send com auth", async () => {
    const client = createA2aClient({
      rpcUrl: `${A2A_URL_PREFIX()}/rpc`,
      headersProvider: async () => ({ Authorization: "Bearer ka" }),
    });
    const card = await client.agentCard();
    expect(card.name).toBe("mock-agent");
    const reply = await client.sendMessage({ message: { role: "user", parts: [{ kind: "text", text: "oi" }] }, history: [] });
    expect(reply.parts[0].text).toBe("resposta A2A");
    expect(a2aLog.auth).toBe("Bearer ka");
  });
});

describe("a2a adapter — via ModelRouter.tryStep", () => {
  it("rota um step a2a pro agente (message/send) e devolve o texto", async () => {
    const { router, cfgStore, secretStore } = makeRouter();
    cfgStore.saveConfig({ providerId: "a2a", accountLabel: "acctA", enabled: true, customBaseUrl: `${A2A_URL_PREFIX()}/rpc` });
    await secretStore.setCredential("a2a", { apiKey: "ka" }, "acctA");
    const step = { providerId: "a2a", model: "agent-orun", maxRetries: 0 };
    const attempts = [];
    const result = await router.tryStep({ id: "c", kind: "text", steps: [step] }, step, 0, [{ role: "system", content: "sys" }, { role: "user", content: "oi" }], {}, attempts);
    expect(result.content).toBe("resposta A2A");
    const send = a2aLog.sends[a2aLog.sends.length - 1];
    expect(send.message.parts[0].text).toBe("sys\n\noi");
    expect(attempts).toHaveLength(0);
  });

  it("streama via message/stream (SSE) quando o servidor suporta", async () => {
    const { router, cfgStore, secretStore } = makeRouter();
    cfgStore.saveConfig({ providerId: "a2a", accountLabel: "acctA", enabled: true, customBaseUrl: `${A2A_URL_PREFIX()}/rpc-stream` });
    await secretStore.setCredential("a2a", { apiKey: "ka" }, "acctA");
    const step = { providerId: "a2a", model: "agent-orun", maxRetries: 0 };
    const chunks = [];
    const result = await router.tryStep(
      { id: "c", kind: "text", steps: [step] },
      step,
      0,
      [{ role: "user", content: "oi" }],
      {},
      [],
      (chunk) => chunks.push(chunk),
    );
    expect(chunks.map((c) => c.deltaText).filter(Boolean)).toEqual(["olá ", "mundo"]);
    expect(chunks.some((c) => c.done === true)).toBe(true);
    expect(result.content).toBe("olá mundo");
  });

  it("degrada pra não-streaming quando o servidor responde JSON a message/stream", async () => {
    const { router, cfgStore, secretStore } = makeRouter();
    cfgStore.saveConfig({ providerId: "a2a", accountLabel: "acctA", enabled: true, customBaseUrl: `${A2A_URL_PREFIX()}/rpc` });
    await secretStore.setCredential("a2a", { apiKey: "ka" }, "acctA");
    const step = { providerId: "a2a", model: "agent-orun", maxRetries: 0 };
    const chunks = [];
    const result = await router.tryStep(
      { id: "c", kind: "text", steps: [step] },
      step,
      0,
      [{ role: "user", content: "oi" }],
      {},
      [],
      (chunk) => chunks.push(chunk),
    );
    expect(result.content).toBe("resposta A2A");
    expect(chunks.filter((c) => c.deltaText).length).toBeGreaterThanOrEqual(1);
  });
});
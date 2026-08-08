const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  addServer,
  removeServer,
  getAllTools,
  callTool,
  listServers,
  stopAll,
} = require("../mcp-client.cjs");

const MOCK_SERVER = `
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  const respond = (result) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\\n");
  switch (msg.method) {
    case "initialize":
      respond({ serverInfo: { name: "mock-mcp", version: "1.0.0" }, capabilities: {} });
      break;
    case "tools/list":
      respond({ tools: [
        { name: "echo", description: "Echo text", inputSchema: { type: "object", properties: { text: { type: "string" } } } },
        { name: "boom", description: "Always fails", inputSchema: { type: "object", properties: {} } },
      ] });
      break;
    case "tools/call":
      if (msg.params.name === "boom") {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32000, message: "mock failure" } }) + "\\n");
      } else {
        respond({ content: [{ type: "text", text: "echo:" + (msg.params.arguments?.text || "") }] });
      }
      break;
  }
});
`;

let tmp;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "orun-mcp-"));
  fs.writeFileSync(path.join(tmp, "mock-mcp-server.cjs"), MOCK_SERVER);
});

afterAll(() => {
  stopAll();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
});

describe("mcp-client: addServer / listServers", () => {
  it("initializes a stdio MCP server and lists its tools", async () => {
    const tools = await addServer("mock", process.execPath, [path.join(tmp, "mock-mcp-server.cjs")]);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe("mock__echo");
    expect(tools[0].description).toContain("[MCP:mock]");
    expect(tools[0].parameters).toBeDefined();
  });

  it("listServers reports ready state and tool count", async () => {
    const servers = listServers();
    const mock = servers.find((s) => s.name === "mock");
    expect(mock).toBeDefined();
    expect(mock.ready).toBe(true);
    expect(mock.tools).toBe(2);
  });

  it("getAllTools flattens tools from all servers with the double-underscore prefix", async () => {
    const all = getAllTools();
    expect(all.some((t) => t.name === "mock__echo")).toBe(true);
    expect(all.some((t) => t.name === "mock__boom")).toBe(true);
  });
});

describe("mcp-client: callTool", () => {
  it("calls a tool and returns its text content", async () => {
    const res = await callTool("mock__echo", { text: "ola" });
    expect(res.error).toBeUndefined();
    expect(res.text).toBe("echo:ola");
  });

  it("returns an error object when the server returns a tool error", async () => {
    const res = await callTool("mock__boom", {});
    expect(res.error).toContain("mock failure");
  });

  it("rejects malformed tool names without a server prefix", async () => {
    const res = await callTool("echo", {});
    expect(res.error).toContain("Invalid MCP tool name");
  });

  it("rejects calls to a server that does not exist", async () => {
    const res = await callTool("ghost__echo", {});
    expect(res.error).toContain("MCP server not found");
  });
});

describe("mcp-client: removeServer", () => {
  it("removes a server and its tools from the registry", async () => {
    removeServer("mock");
    const servers = listServers();
    expect(servers.find((s) => s.name === "mock")).toBeUndefined();
    const res = await callTool("mock__echo", {});
    expect(res.error).toContain("MCP server not found");
  });
});

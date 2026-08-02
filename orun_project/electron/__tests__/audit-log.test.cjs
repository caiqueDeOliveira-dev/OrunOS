const fs = require("fs");
const path = require("path");
const os = require("os");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "audit-test-"));
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((f) => fs.unlinkSync(path.join(dir, f)));
    fs.rmdirSync(dir);
  }
}

describe("audit-log", () => {
  let dir;
  let audit;

  beforeEach(() => {
    dir = tmpDir();
    vi.resetModules();
    audit = require("../audit-log.cjs");
  });

  afterEach(() => {
    rmDir(dir);
  });

  it("init() creates the audit file when it does not exist", () => {
    audit.init(dir);
    const filePath = path.join(dir, "audit.json");
    expect(fs.existsSync(filePath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual([]);
  });

  it("init() does not overwrite existing audit file", () => {
    const filePath = path.join(dir, "audit.json");
    fs.writeFileSync(filePath, JSON.stringify([{ existing: true }]));
    audit.init(dir);
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(content).toEqual([{ existing: true }]);
  });

  it("init() does nothing without userDataPath", () => {
    audit.init();
    expect(audit.getRecentActions()).toEqual([]);
  });

  it("logAction() appends an entry to the audit file", () => {
    audit.init(dir);
    audit.logAction("agent-1", "send_message", { to: "user" }, "ok");
    const entries = audit.getRecentActions();
    expect(entries).toHaveLength(1);
    expect(entries[0].agentId).toBe("agent-1");
    expect(entries[0].action).toBe("send_message");
    expect(entries[0].result).toBe("ok");
    expect(entries[0]).toHaveProperty("timestamp");
    expect(entries[0]).toHaveProperty("details");
  });

  it("logAction() defaults agentId to 'system' when not provided", () => {
    audit.init(dir);
    audit.logAction(null, "test_action", "details", "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].agentId).toBe("system");
  });

  it("logAction() defaults agentId to 'system' when agentId is undefined", () => {
    audit.init(dir);
    audit.logAction(undefined, "test_action", "details", "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].agentId).toBe("system");
  });

  it("getRecentActions() returns last N entries", () => {
    audit.init(dir);
    for (let i = 0; i < 10; i++) {
      audit.logAction("a", "act", "", "ok");
    }
    const recent = audit.getRecentActions(3);
    expect(recent).toHaveLength(3);
  });

  it("getRecentActions() defaults to 50 entries", () => {
    audit.init(dir);
    for (let i = 0; i < 100; i++) {
      audit.logAction("a", "act", "", "ok");
    }
    expect(audit.getRecentActions()).toHaveLength(50);
  });

  it("getActionsByAgent() filters by agent ID", () => {
    audit.init(dir);
    audit.logAction("alice", "chat", "", "ok");
    audit.logAction("bob", "run", "", "ok");
    audit.logAction("alice", "run", "", "ok");
    const filtered = audit.getActionsByAgent("alice");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.agentId === "alice")).toBe(true);
  });

  it("getActionsByAgent() respects count parameter", () => {
    audit.init(dir);
    for (let i = 0; i < 30; i++) {
      audit.logAction("agent-x", "act", "", "ok");
    }
    expect(audit.getActionsByAgent("agent-x", 5)).toHaveLength(5);
  });

  it("getActionsByType() filters by action type", () => {
    audit.init(dir);
    audit.logAction("a", "chat", "", "ok");
    audit.logAction("b", "run", "", "ok");
    audit.logAction("c", "chat", "", "ok");
    const filtered = audit.getActionsByType("chat");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.action === "chat")).toBe(true);
  });

  it("getActionsByType() respects count parameter", () => {
    audit.init(dir);
    for (let i = 0; i < 30; i++) {
      audit.logAction("a", "special", "", "ok");
    }
    expect(audit.getActionsByType("special", 5)).toHaveLength(5);
  });

  it("auto-prune removes oldest entries when exceeding 1000", () => {
    audit.init(dir);
    for (let i = 0; i < 1005; i++) {
      audit.logAction("a", "x", "", "ok");
    }
    const entries = audit.getRecentActions(2000);
    expect(entries).toHaveLength(1000);
  });

  it("auto-prune keeps the most recent 1000 entries", () => {
    audit.init(dir);
    for (let i = 0; i < 1010; i++) {
      audit.logAction("a", "x", `payload-${i}`, "ok");
    }
    const entries = audit.getRecentActions(2000);
    expect(entries).toHaveLength(1000);
    expect(entries[0].details).toBe("payload-10");
    expect(entries[999].details).toBe("payload-1009");
  });

  it("API keys are masked in string details", () => {
    audit.init(dir);
    audit.logAction("agent-1", "set_key", "sk-12345678901234567890", "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].details).toContain("***REDACTED***");
    expect(entries[0].details).not.toContain("12345678901234567890");
  });

  it("API keys are masked in object details", () => {
    audit.init(dir);
    audit.logAction("agent-1", "set_key", { key: "sk-abcdef1234567890abcdef" }, "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].details).toContain("***REDACTED***");
  });

  it("API keys shorter than 20 chars are NOT masked", () => {
    audit.init(dir);
    audit.logAction("agent-1", "set_key", "short-key-12345", "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].details).not.toContain("***REDACTED***");
    expect(entries[0].details).toContain("short-key-12345");
  });

  it("long details are truncated at 1000 chars", () => {
    audit.init(dir);
    const long = ".".repeat(2000);
    audit.logAction("agent-1", "big_log", long, "ok");
    const entries = audit.getRecentActions();
    expect(entries[0].details.length).toBe(1003);
    expect(entries[0].details.endsWith("...")).toBe(true);
  });

  it("load() returns empty array on corrupt JSON", () => {
    const filePath = path.join(dir, "audit.json");
    fs.writeFileSync(filePath, "{corrupt");
    audit.init(dir);
    expect(audit.getRecentActions()).toEqual([]);
  });

  it("load() returns empty array when file is empty string", () => {
    const filePath = path.join(dir, "audit.json");
    fs.writeFileSync(filePath, "");
    audit.init(dir);
    expect(audit.getRecentActions()).toEqual([]);
  });

  it("load() returns empty array when file is not valid array JSON", () => {
    const filePath = path.join(dir, "audit.json");
    fs.writeFileSync(filePath, JSON.stringify({ not: "array" }));
    audit.init(dir);
    expect(audit.getRecentActions()).toEqual([]);
  });
});

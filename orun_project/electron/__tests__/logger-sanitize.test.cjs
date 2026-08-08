// electron/__tests__/logger-sanitize.test.cjs
const logger = require("../logger.cjs");

describe("logger secret masking", () => {
  it("mascara chaves de API em campos de nome sensível", () => {
    const d = logger.sanitize({ apiKey: "sk-or-v1-abc123def456", token: "Bearer ghp_xYzAbC1234567890" });
    expect(d.apiKey).toBe("***");
    expect(d.token).toBe("***");
  });

  it("mascara segredos em strings aninhadas e URLs com query de chave", () => {
    const d = logger.sanitize({
      nested: { password: "hunter2", ok: "fine sk-or-v1-longvalue123" },
      url: "https://x.com?apikey=SECRETVAL&foo=1",
    });
    expect(d.nested.password).toBe("***");
    expect(d.nested.ok).toContain("***");
    expect(d.nested.ok).not.toContain("sk-or-v1");
    expect(d.url).toContain("apikey=***");
    expect(d.url).not.toContain("SECRETVAL");
  });

  it("redactText mascarar tokens no meio de mensagens", () => {
    expect(logger.redactText("msg with sk-abcdefghijklmnop end")).not.toContain("sk-abcdefghijklmnop");
    expect(logger.redactText("Bearer abcdefghijklmnopqrst in msg")).not.toContain("abcdefghijklmnopqrst");
  });

  it("não altera valores limpos", () => {
    const d = logger.sanitize({ agent: "Health", durationMs: 12, tags: ["a", "b"] });
    expect(d.agent).toBe("Health");
    expect(d.durationMs).toBe(12);
    expect(d.tags).toEqual(["a", "b"]);
  });

  it("lidado com arrays de objetos", () => {
    const d = logger.sanitize([{ apiKey: "sk-abc", label: "x" }], "list");
    expect(d[0].apiKey).toBe("***");
    expect(d[0].label).toBe("x");
  });
});

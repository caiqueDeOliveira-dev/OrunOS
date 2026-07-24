const { promptFor, DEFAULT_PROMPTS } = require("../agent-prompts.cjs");

describe("agent-prompts", () => {
  it("promptFor returns a string", () => {
    const result = promptFor("Health");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("DEFAULT_PROMPTS has entries", () => {
    expect(typeof DEFAULT_PROMPTS).toBe("object");
    expect(Object.keys(DEFAULT_PROMPTS).length).toBeGreaterThan(0);
  });

  it("promptFor includes the base prompt content", () => {
    const result = promptFor("Health");
    expect(result).toContain("Health");
  });

  it("promptFor falls back to System for unknown agent", () => {
    const result = promptFor("nonexistent");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

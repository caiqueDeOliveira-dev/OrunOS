const { promptFor, DEFAULT_PROMPTS, AGENT_PERSONA_LORE, agentPersonaName, personaBlock } = require("../agent-prompts.cjs");

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

describe("agent personas (Círculo Hampton)", () => {
  it("every DEFAULT_PROMPTS agent has a persona defined", () => {
    for (const id of Object.keys(DEFAULT_PROMPTS)) {
      expect(AGENT_PERSONA_LORE[id], `missing persona for ${id}`).toBeTruthy();
      expect(AGENT_PERSONA_LORE[id].name).toBeTruthy();
      expect(AGENT_PERSONA_LORE[id].identity).toBeTruthy();
    }
  });

  it("personaBlock injects identity into promptFor output", () => {
    const result = promptFor("Health");
    expect(result).toContain("---PERSONA (Health)---");
    expect(result).toContain(AGENT_PERSONA_LORE.Health.name);
  });

  it("personaBlock returns empty for unknown agents", () => {
    expect(personaBlock("nonexistent")).toBe("");
    expect(personaBlock(undefined)).toBe("");
  });

  it("agentPersonaName resolves persona names and falls back to id", () => {
    expect(agentPersonaName("Developer")).toBe(AGENT_PERSONA_LORE.Developer.name);
    expect(agentPersonaName("nonexistent")).toBe("nonexistent");
    expect(agentPersonaName(undefined)).toBe(null);
  });

  it("Hampton persona exists for the central intelligence", () => {
    expect(AGENT_PERSONA_LORE.Hampton.name).toBe("Hampton");
    expect(personaBlock("Hampton")).toContain("---PERSONA (Hampton)---");
  });
});

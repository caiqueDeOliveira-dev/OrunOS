import { describe, it, expect } from "vitest";
import { routeChat, streamChat, trimContext, buildContext, testConnection } from "../ai-router.cjs";

describe("trimContext", () => {
  it("keeps everything when under the limit", () => {
    const messages = [{ role: "user", content: "hi" }];
    expect(trimContext(messages, "", 16)).toEqual(messages);
  });

  it("trims to the last N messages when over the limit", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({ role: "user", content: `msg ${i}` }));
    const trimmed = trimContext(messages, "", 5);
    expect(trimmed).toHaveLength(5);
    expect(trimmed[trimmed.length - 1].content).toBe("msg 19");
  });

  it("prepends a system prompt when provided", () => {
    const trimmed = trimContext([{ role: "user", content: "hi" }], "Be nice.", 16);
    expect(trimmed[0]).toEqual({ role: "system", content: "Be nice." });
    expect(trimmed).toHaveLength(2);
  });

  it("does not add a system message when the prompt is blank", () => {
    const trimmed = trimContext([{ role: "user", content: "hi" }], "   ", 16);
    expect(trimmed.find((m) => m.role === "system")).toBeUndefined();
  });
});

describe("routeChat / streamChat provider validation", () => {
  it("rejects unknown providers", async () => {
    await expect(routeChat({ provider: "bogus", messages: [] })).rejects.toThrow(/API key/);
    await expect(streamChat({ provider: "bogus", messages: [], onChunk: () => {} })).rejects.toThrow(/API key/);
  });

  it("rejects cloud calls without an API key before making any network request", async () => {
    await expect(
      routeChat({ provider: "anthropic", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
    await expect(
      routeChat({ provider: "openai", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
    await expect(
      routeChat({ provider: "openrouter", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
    await expect(
      routeChat({ provider: "groq", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
    await expect(
      routeChat({ provider: "github", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
  });
});

describe("testConnection", () => {
  it("returns ok:false with a readable error instead of throwing", async () => {
    const result = await testConnection({ provider: "anthropic", messages: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/API key/);
  });
});

describe("image-carrying messages", () => {
  it("still validates the API key before touching the image payload", async () => {
    const messages = [{ role: "user", content: "what is this?", image: { base64: "AAAA", mime: "image/jpeg" } }];
    await expect(routeChat({ provider: "anthropic", messages })).rejects.toThrow(/API key/);
    await expect(routeChat({ provider: "openai", messages })).rejects.toThrow(/API key/);
  });
});

describe("buildContext", () => {
  it("skips summarization when under the message limit", async () => {
    const messages = [{ role: "user", content: "hi" }];
    const { context, summarized } = await buildContext({ messages, systemPrompt: "", maxMessages: 16, provider: "anthropic" });
    expect(summarized).toBe(false);
    expect(context).toEqual(messages);
  });

  it("falls back to a plain trim when summarization fails (e.g. no API key)", async () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({ role: "user", content: `msg ${i}` }));
    // No apiKey provided, so the internal summarization call fails fast and
    // buildContext must fall back to trimming instead of throwing.
    const { context, summarized } = await buildContext({ messages, systemPrompt: "Be nice.", maxMessages: 5, provider: "anthropic" });
    expect(summarized).toBe(false);
    expect(context[0]).toEqual({ role: "system", content: "Be nice." });
    expect(context).toHaveLength(6);
    expect(context[context.length - 1].content).toBe("msg 19");
  });
});

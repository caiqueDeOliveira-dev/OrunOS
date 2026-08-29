import { describe, it, expect } from "vitest";
import { routeChat, streamChat, trimContext, buildContext, testConnection, resolveApiKeys, isKeyQuotaError, isPayloadTooLargeError, truncateMessagesForRetry, markKeyExhausted, isKeyExhausted } from "../ai-router.cjs";
import { checkAll, getStatus } from "../provider-health.cjs";

describe("isPayloadTooLargeError", () => {
  it("detects HTTP 413 and Groq TPM errors", () => {
    const groq413 = new Error('HTTP 413: {"error":{"message":"Request too large for model on tokens per minute (TPM): Limit 8000","code":"rate_limit_exceeded"}}');
    expect(isPayloadTooLargeError(groq413)).toBe(true);
    expect(isPayloadTooLargeError(new Error("request too large for model"))).toBe(true);
  });

  it("does not match quota, auth or generic errors", () => {
    expect(isPayloadTooLargeError(new Error("HTTP 429: rate_limit_exceeded"))).toBe(false);
    expect(isPayloadTooLargeError(new Error("HTTP 401: Missing Authentication header"))).toBe(false);
    expect(isPayloadTooLargeError(new Error("HTTP 404: model does not exist"))).toBe(false);
  });
});

describe("truncateMessagesForRetry", () => {
  it("keeps system messages plus the most recent messages within budget", () => {
    const messages = [
      { role: "system", content: "S".repeat(1000) },
      ...Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: "x".repeat(2000) })),
      { role: "user", content: "latest question" },
    ];
    const out = truncateMessagesForRetry(messages, 8000);
    expect(out[0].role).toBe("system");
    expect(out[out.length - 1].content).toBe("latest question");
    const total = out.reduce((n, m) => n + m.content.length, 0);
    expect(total).toBeLessThanOrEqual(1000 + 8000);
  });

  it("returns the input untouched when it is not an array", () => {
    expect(truncateMessagesForRetry(undefined)).toBeUndefined();
  });

  it("truncates oversized system prompts instead of failing", () => {
    const messages = [
      { role: "system", content: "S".repeat(50000) },
      ...Array.from({ length: 10 }, (_, i) => ({ role: "user", content: "y".repeat(2000) })),
    ];
    const out = truncateMessagesForRetry(messages, 20000);
    const total = out.reduce((n, m) => n + m.content.length, 0);
    expect(total).toBeLessThanOrEqual(20000 + 200);
    expect(out[0].content).toContain("[Contexto truncado");
    expect(out[out.length - 1].content).toBe("y".repeat(2000));
  });
});

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
      routeChat({ provider: "nvidia", messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/API key/);
  });
});

describe("provider health / NVIDIA integration", () => {
  it("tracks NVIDIA in the monitored provider set", async () => {
    await checkAll(() => "dummy-key");
    const status = getStatus();
    expect(status.nvidia).toBeDefined();
    expect(status.nvidia.status).toMatch(/up|down|unknown/);
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

describe("multi-key rotation", () => {
  it("resolveApiKeys accepts an apiKeys array (trimmed, deduped empty)", () => {
    expect(resolveApiKeys({ apiKeys: [" k1 ", "k2", "  ", "k3"] })).toEqual(["k1", "k2", "k3"]);
  });

  it("resolveApiKeys falls back to a single apiKey string", () => {
    expect(resolveApiKeys({ apiKey: " secret " })).toEqual(["secret"]);
  });

  it("resolveApiKeys returns [] when nothing is configured", () => {
    expect(resolveApiKeys({})).toEqual([]);
    expect(resolveApiKeys({ apiKey: "" })).toEqual([]);
  });

  it("isKeyQuotaError detects 429 / quota / billing", () => {
    expect(isKeyQuotaError(new Error("HTTP 429: rate_limit_exceeded"))).toBe(true);
    expect(isKeyQuotaError(new Error("HTTP 402: You exceeded your current quota"))).toBe(true);
    expect(isKeyQuotaError(new Error("insufficient_quota"))).toBe(true);
    expect(isKeyQuotaError(new Error("billing_limits: out of credits"))).toBe(true);
    expect(isKeyQuotaError(new Error("HTTP 503: overloaded"))).toBe(false);
    expect(isKeyQuotaError(new Error("context length exceeded"))).toBe(false);
  });

  it("markKeyExhausted / isKeyExhausted rotate a key on cooldown", () => {
    expect(isKeyExhausted("groq", 0)).toBe(false);
    markKeyExhausted("groq", 0, 60000);
    expect(isKeyExhausted("groq", 0)).toBe(true);
    expect(isKeyExhausted("groq", 1)).toBe(false);
    markKeyExhausted("groq", 0, 0);
    expect(isKeyExhausted("groq", 0)).toBe(false);
  });

  it("routeChat with no keys still rejects with a missing API key error", async () => {
    await expect(routeChat({ provider: "groq", messages: [] })).rejects.toThrow(/API key/);
  });

  it("routeChat skips exhausted keys and reports provider exhaustion without a network call", async () => {
    markKeyExhausted("groq", 0, 60000);
    markKeyExhausted("groq", 1, 60000);
    await expect(
      routeChat({ provider: "groq", model: "openai/gpt-oss-120b", apiKeys: ["k1", "k2"], messages: [{ role: "user", content: "hi" }] })
    ).rejects.toThrow(/All API keys for groq are exhausted or rate-limited/);
    markKeyExhausted("groq", 0, 0);
    markKeyExhausted("groq", 1, 0);
  });
});

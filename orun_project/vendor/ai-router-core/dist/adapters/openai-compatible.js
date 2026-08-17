"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCompatibleAdapter = void 0;
const types_1 = require("./types");
const timeout_1 = require("./timeout");
const read_stream_lines_1 = require("./read-stream-lines");
/**
 * Cobre todo provider que fala o dialeto /v1/chat/completions da OpenAI:
 * Groq, GitHub Models, Cerebras, Mistral, OpenCode Free, Cohere (compat),
 * NVIDIA NIM, SiliconFlow, Chutes, OpenAI, OpenRouter, DeepSeek, xAI,
 * Perplexity, Together, Fireworks, Nebius, Hyperbolic, Kiro, Codex,
 * GitHub Copilot, Cursor, Antigravity, Kimchi, custom-openai-compatible.
 */
class OpenAiCompatibleAdapter {
    wireFormat = "openai-compatible";
    buildHeaders(opts) {
        const auth = opts.credential.oauthAccessToken ?? opts.credential.apiKey;
        const headers = { "Content-Type": "application/json" };
        if (auth)
            headers["Authorization"] = `Bearer ${auth}`;
        return headers;
    }
    async complete(messages, opts) {
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const res = await fetch(`${opts.baseUrl}/chat/completions`, {
                method: "POST",
                signal: timeout.signal,
                headers: this.buildHeaders(opts),
                body: JSON.stringify({
                    model: opts.model,
                    messages: messages.map((m) => ({ role: m.role === "tool" ? "tool" : m.role, content: m.content })),
                    max_tokens: opts.maxTokens,
                    temperature: opts.temperature,
                }),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const body = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)}`, "openai-compatible", res.status, isRateLimit, isQuota, isServerError);
            }
            const data = (await res.json());
            return {
                content: data.choices[0]?.message?.content ?? "",
                promptTokens: data.usage?.prompt_tokens ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
                responseHeaders: res.headers,
            };
        }
        finally {
            timeout.dispose();
        }
    }
    async completeStream(messages, opts, onChunk) {
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const res = await fetch(`${opts.baseUrl}/chat/completions`, {
                method: "POST",
                signal: timeout.signal,
                headers: this.buildHeaders(opts),
                body: JSON.stringify({
                    model: opts.model,
                    messages: messages.map((m) => ({ role: m.role === "tool" ? "tool" : m.role, content: m.content })),
                    max_tokens: opts.maxTokens,
                    temperature: opts.temperature,
                    stream: true,
                    stream_options: { include_usage: true }, // suportado pela OpenAI; outros ignoram silenciosamente
                }),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const body = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)}`, "openai-compatible", res.status, isRateLimit, isQuota, isServerError);
            }
            let content = "";
            let promptTokens = 0;
            let completionTokens = 0;
            for await (const line of (0, read_stream_lines_1.readStreamLines)(res)) {
                if (!line.startsWith("data: "))
                    continue;
                const payload = line.slice(6);
                if (payload === "[DONE]")
                    break;
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                    content += delta;
                    onChunk({ deltaText: delta, done: false });
                }
                if (json.usage) {
                    promptTokens = json.usage.prompt_tokens;
                    completionTokens = json.usage.completion_tokens;
                }
            }
            return { content, promptTokens, completionTokens, responseHeaders: res.headers };
        }
        finally {
            timeout.dispose();
        }
    }
}
exports.OpenAiCompatibleAdapter = OpenAiCompatibleAdapter;
//# sourceMappingURL=openai-compatible.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiCompatibleAdapter = void 0;
const types_1 = require("./types");
const timeout_1 = require("./timeout");
const read_stream_lines_1 = require("./read-stream-lines");
const proxy_pool_1 = require("../proxy-pool");
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
            const body = {
                model: opts.model,
                messages: messages.map((m) => ({ role: m.role === "tool" ? "tool" : m.role, content: m.content, ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}) })),
                max_tokens: opts.maxTokens,
                temperature: opts.temperature,
            };
            if (opts.tools)
                body.tools = opts.tools;
            if (opts.tool_choice)
                body.tool_choice = opts.tool_choice;
            const proxy = opts.proxyPool?.enabled ? (0, proxy_pool_1.getNextProxy)(opts.proxyPool) : null;
            const fetchOpts = { method: "POST", signal: timeout.signal, headers: this.buildHeaders(opts), body: JSON.stringify(body) };
            const res = proxy
                ? await (0, proxy_pool_1.proxyFetch)(`${opts.baseUrl}/chat/completions`, fetchOpts, proxy)
                : await fetch(`${opts.baseUrl}/chat/completions`, fetchOpts);
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const bodyText = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`, "openai-compatible", res.status, isRateLimit, isQuota, isServerError);
            }
            const data = (await res.json());
            const result = {
                content: data.choices[0]?.message?.content ?? "",
                promptTokens: data.usage?.prompt_tokens ?? 0,
                completionTokens: data.usage?.completion_tokens ?? 0,
                responseHeaders: res.headers,
            };
            if (data.choices[0]?.message?.tool_calls) {
                result.toolCalls = data.choices[0].message.tool_calls;
            }
            return result;
        }
        finally {
            timeout.dispose();
        }
    }
    async completeStream(messages, opts, onChunk) {
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const body = {
                model: opts.model,
                messages: messages.map((m) => ({ role: m.role === "tool" ? "tool" : m.role, content: m.content, ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}) })),
                max_tokens: opts.maxTokens,
                temperature: opts.temperature,
                stream: true,
                stream_options: { include_usage: true },
            };
            if (opts.tools)
                body.tools = opts.tools;
            if (opts.tool_choice)
                body.tool_choice = opts.tool_choice;
            const proxy = opts.proxyPool?.enabled ? (0, proxy_pool_1.getNextProxy)(opts.proxyPool) : null;
            const fetchOpts = { method: "POST", signal: timeout.signal, headers: this.buildHeaders(opts), body: JSON.stringify(body) };
            const res = proxy
                ? await (0, proxy_pool_1.proxyFetch)(`${opts.baseUrl}/chat/completions`, fetchOpts, proxy)
                : await fetch(`${opts.baseUrl}/chat/completions`, fetchOpts);
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const bodyText = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`, "openai-compatible", res.status, isRateLimit, isQuota, isServerError);
            }
            let content = "";
            let promptTokens = 0;
            let completionTokens = 0;
            const toolCallsMap = new Map();
            for await (const line of (0, read_stream_lines_1.readStreamLines)(res)) {
                if (!line.startsWith("data: "))
                    continue;
                const payload = line.slice(6);
                if (payload === "[DONE]")
                    break;
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta;
                if (delta?.content) {
                    content += delta.content;
                    onChunk({ deltaText: delta.content, done: false });
                }
                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const idx = tc.index ?? 0;
                        const existing = toolCallsMap.get(idx) ?? { id: "", function: { name: "", arguments: "" } };
                        if (tc.id)
                            existing.id = tc.id;
                        if (tc.function?.name)
                            existing.function.name += tc.function.name;
                        if (tc.function?.arguments)
                            existing.function.arguments += tc.function.arguments;
                        toolCallsMap.set(idx, existing);
                    }
                }
                if (json.usage) {
                    promptTokens = json.usage.prompt_tokens;
                    completionTokens = json.usage.completion_tokens;
                }
            }
            const result = { content, promptTokens, completionTokens, responseHeaders: res.headers };
            if (toolCallsMap.size > 0) {
                result.toolCalls = Array.from(toolCallsMap.values()).map((tc) => ({
                    id: tc.id,
                    type: "function",
                    function: tc.function,
                }));
            }
            return result;
        }
        finally {
            timeout.dispose();
        }
    }
}
exports.OpenAiCompatibleAdapter = OpenAiCompatibleAdapter;
//# sourceMappingURL=openai-compatible.js.map
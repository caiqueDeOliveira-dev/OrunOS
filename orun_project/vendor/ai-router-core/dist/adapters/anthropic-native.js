"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicNativeAdapter = void 0;
const types_1 = require("./types");
const timeout_1 = require("./timeout");
const read_stream_lines_1 = require("./read-stream-lines");
class AnthropicNativeAdapter {
    wireFormat = "anthropic-native";
    buildHeaders(opts) {
        const auth = opts.credential.oauthAccessToken ?? opts.credential.apiKey;
        const isOAuth = !!opts.credential.oauthAccessToken;
        const headers = { "Content-Type": "application/json", "anthropic-version": "2023-06-01" };
        if (isOAuth)
            headers["Authorization"] = `Bearer ${auth}`;
        else if (auth)
            headers["x-api-key"] = auth;
        return headers;
    }
    splitMessages(messages) {
        const system = messages.find((m) => m.role === "system")?.content;
        const rest = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
        return { system, rest };
    }
    async complete(messages, opts) {
        const { system, rest } = this.splitMessages(messages);
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const body = { model: opts.model, system, max_tokens: opts.maxTokens ?? 4096, temperature: opts.temperature, messages: rest };
            if (opts.tools) {
                body.tools = opts.tools.map((t) => ({
                    name: t.function.name,
                    description: t.function.description,
                    input_schema: t.function.parameters ?? {},
                }));
            }
            if (opts.tool_choice) {
                if (opts.tool_choice === "auto" || opts.tool_choice === "none" || opts.tool_choice === "required") {
                    body.tool_choice = { type: opts.tool_choice };
                }
                else {
                    body.tool_choice = { type: "tool", name: opts.tool_choice.function.name };
                }
            }
            const res = await fetch(`${opts.baseUrl}/messages`, {
                method: "POST",
                signal: timeout.signal,
                headers: this.buildHeaders(opts),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const bodyText = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`, "anthropic-native", res.status, isRateLimit, isQuota, isServerError);
            }
            const data = (await res.json());
            const text = data.content.find((c) => c.type === "text")?.text ?? "";
            const result = {
                content: text,
                promptTokens: data.usage?.input_tokens ?? 0,
                completionTokens: data.usage?.output_tokens ?? 0,
                responseHeaders: res.headers,
            };
            const toolUseBlocks = data.content.filter((c) => c.type === "tool_use");
            if (toolUseBlocks.length > 0) {
                result.toolCalls = toolUseBlocks.map((b) => ({
                    id: b.id ?? "",
                    type: "function",
                    function: {
                        name: b.name ?? "",
                        arguments: JSON.stringify(b.input ?? {}),
                    },
                }));
            }
            return result;
        }
        finally {
            timeout.dispose();
        }
    }
    async completeStream(messages, opts, onChunk) {
        const { system, rest } = this.splitMessages(messages);
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const body = {
                model: opts.model,
                system,
                max_tokens: opts.maxTokens ?? 4096,
                temperature: opts.temperature,
                messages: rest,
                stream: true,
            };
            if (opts.tools) {
                body.tools = opts.tools.map((t) => ({
                    name: t.function.name,
                    description: t.function.description,
                    input_schema: t.function.parameters ?? {},
                }));
            }
            if (opts.tool_choice) {
                if (opts.tool_choice === "auto" || opts.tool_choice === "none" || opts.tool_choice === "required") {
                    body.tool_choice = { type: opts.tool_choice };
                }
                else {
                    body.tool_choice = { type: "tool", name: opts.tool_choice.function.name };
                }
            }
            const res = await fetch(`${opts.baseUrl}/messages`, {
                method: "POST",
                signal: timeout.signal,
                headers: this.buildHeaders(opts),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 402 || res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const bodyText = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${bodyText.slice(0, 200)}`, "anthropic-native", res.status, isRateLimit, isQuota, isServerError);
            }
            let content = "";
            let promptTokens = 0;
            let completionTokens = 0;
            // Accumulate tool_use blocks from streaming
            const toolUseMap = new Map();
            for await (const line of (0, read_stream_lines_1.readStreamLines)(res)) {
                if (!line.startsWith("data: "))
                    continue;
                const json = JSON.parse(line.slice(6));
                if (json.type === "content_block_start" && json.content_block?.type === "tool_use") {
                    toolUseMap.set(json.index ?? 0, {
                        id: json.content_block.id ?? "",
                        name: json.content_block.name ?? "",
                        inputJson: "",
                    });
                }
                if (json.type === "content_block_delta" && json.delta?.type === "input_json_delta" && json.delta.partial_json) {
                    const idx = json.index ?? 0;
                    const existing = toolUseMap.get(idx);
                    if (existing)
                        existing.inputJson += json.delta.partial_json;
                }
                if (json.type === "content_block_delta" && json.delta?.type === "text_delta" && json.delta.text) {
                    content += json.delta.text;
                    onChunk({ deltaText: json.delta.text, done: false });
                }
                if (json.type === "message_start" && json.message?.usage?.input_tokens) {
                    promptTokens = json.message.usage.input_tokens;
                }
                if (json.type === "message_delta" && json.usage?.output_tokens) {
                    completionTokens = json.usage.output_tokens;
                }
            }
            const result = { content, promptTokens, completionTokens, responseHeaders: res.headers };
            if (toolUseMap.size > 0) {
                result.toolCalls = Array.from(toolUseMap.values()).map((tu) => ({
                    id: tu.id,
                    type: "function",
                    function: { name: tu.name, arguments: tu.inputJson },
                }));
            }
            return result;
        }
        finally {
            timeout.dispose();
        }
    }
}
exports.AnthropicNativeAdapter = AnthropicNativeAdapter;
//# sourceMappingURL=anthropic-native.js.map
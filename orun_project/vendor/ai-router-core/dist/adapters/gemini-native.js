"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiNativeAdapter = void 0;
const types_1 = require("./types");
const timeout_1 = require("./timeout");
const read_stream_lines_1 = require("./read-stream-lines");
class GeminiNativeAdapter {
    wireFormat = "gemini-native";
    buildBody(messages, opts) {
        const systemInstruction = messages.find((m) => m.role === "system")?.content;
        const contents = messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
        return {
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: { maxOutputTokens: opts.maxTokens, temperature: opts.temperature },
        };
    }
    async complete(messages, opts) {
        const apiKey = opts.credential.apiKey;
        if (!apiKey)
            throw new types_1.ProviderCallError("Credencial ausente", "unknown", 401);
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const url = `${opts.baseUrl}/models/${opts.model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                signal: timeout.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.buildBody(messages, opts)),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const body = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)}`, "gemini-native", res.status, isRateLimit, isQuota, isServerError);
            }
            const data = (await res.json());
            const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
            return {
                content: text,
                promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
                responseHeaders: res.headers,
            };
        }
        finally {
            timeout.dispose();
        }
    }
    async completeStream(messages, opts, onChunk) {
        const apiKey = opts.credential.apiKey;
        if (!apiKey)
            throw new types_1.ProviderCallError("Credencial ausente", "unknown", 401);
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const url = `${opts.baseUrl}/models/${opts.model}:streamGenerateContent?alt=sse&key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                signal: timeout.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.buildBody(messages, opts)),
            });
            if (!res.ok) {
                const isRateLimit = res.status === 429;
                const isQuota = res.status === 403;
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                const body = await res.text().catch(() => "");
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)}`, "gemini-native", res.status, isRateLimit, isQuota, isServerError);
            }
            let content = "";
            let promptTokens = 0;
            let completionTokens = 0;
            for await (const line of (0, read_stream_lines_1.readStreamLines)(res)) {
                if (!line.startsWith("data: "))
                    continue;
                const json = JSON.parse(line.slice(6));
                const delta = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
                if (delta) {
                    content += delta;
                    onChunk({ deltaText: delta, done: false });
                }
                if (json.usageMetadata) {
                    promptTokens = json.usageMetadata.promptTokenCount ?? promptTokens;
                    completionTokens = json.usageMetadata.candidatesTokenCount ?? completionTokens;
                }
            }
            return { content, promptTokens, completionTokens };
        }
        finally {
            timeout.dispose();
        }
    }
}
exports.GeminiNativeAdapter = GeminiNativeAdapter;
//# sourceMappingURL=gemini-native.js.map
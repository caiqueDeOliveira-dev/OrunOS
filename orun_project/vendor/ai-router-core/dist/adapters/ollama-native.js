"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaNativeAdapter = void 0;
const types_1 = require("./types");
const timeout_1 = require("./timeout");
const read_stream_lines_1 = require("./read-stream-lines");
class OllamaNativeAdapter {
    wireFormat = "ollama-native";
    async complete(messages, opts) {
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const res = await fetch(`${opts.baseUrl}/api/chat`, {
                method: "POST",
                signal: timeout.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: opts.model,
                    stream: false,
                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                    options: { temperature: opts.temperature, num_predict: opts.maxTokens },
                }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => "");
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)} — Ollama está rodando? (ollama serve)`, "ollama-native", res.status, false, false, isServerError);
            }
            const data = (await res.json());
            return {
                content: data.message?.content ?? "",
                promptTokens: data.prompt_eval_count ?? 0,
                completionTokens: data.eval_count ?? 0,
            };
        }
        finally {
            timeout.dispose();
        }
    }
    async completeStream(messages, opts, onChunk) {
        const timeout = (0, timeout_1.createTimeoutController)(opts.timeoutMs ?? timeout_1.DEFAULT_TIMEOUT_MS, opts.signal);
        try {
            const res = await fetch(`${opts.baseUrl}/api/chat`, {
                method: "POST",
                signal: timeout.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: opts.model,
                    stream: true,
                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                    options: { temperature: opts.temperature, num_predict: opts.maxTokens },
                }),
            });
            if (!res.ok) {
                const body = await res.text().catch(() => "");
                const isServerError = (0, types_1.isTransientServerStatus)(res.status);
                throw new types_1.ProviderCallError(`HTTP ${res.status}: ${body.slice(0, 200)} — Ollama está rodando? (ollama serve)`, "ollama-native", res.status, false, false, isServerError);
            }
            let content = "";
            let promptTokens = 0;
            let completionTokens = 0;
            // Ollama manda NDJSON puro (uma linha = um objeto JSON), sem prefixo "data: "
            for await (const line of (0, read_stream_lines_1.readStreamLines)(res)) {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    content += json.message.content;
                    onChunk({ deltaText: json.message.content, done: false });
                }
                if (json.done) {
                    promptTokens = json.prompt_eval_count ?? 0;
                    completionTokens = json.eval_count ?? 0;
                }
            }
            return { content, promptTokens, completionTokens };
        }
        finally {
            timeout.dispose();
        }
    }
}
exports.OllamaNativeAdapter = OllamaNativeAdapter;
//# sourceMappingURL=ollama-native.js.map
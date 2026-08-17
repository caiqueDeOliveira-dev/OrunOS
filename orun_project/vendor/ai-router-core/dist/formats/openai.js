"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiFormatError = void 0;
exports.parseOpenAiChatRequest = parseOpenAiChatRequest;
exports.openAiMessagesToRouter = openAiMessagesToRouter;
exports.openAiCompletionResponse = openAiCompletionResponse;
exports.openAiStreamChunk = openAiStreamChunk;
// ─────────────────────────────────────────────────────────────
// Parse do request OpenAI Chat Completions → formato canônico
// ─────────────────────────────────────────────────────────────
class OpenAiFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = "OpenAiFormatError";
    }
}
exports.OpenAiFormatError = OpenAiFormatError;
function parseOpenAiChatRequest(body) {
    if (!body || typeof body !== "object")
        throw new OpenAiFormatError("corpo da request inválido");
    const { model, messages, stream, max_tokens, temperature } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new OpenAiFormatError("campo 'messages' ausente ou vazio");
    }
    return { model, messages, stream: Boolean(stream), max_tokens, temperature };
}
/** Traduz mensagens OpenAI Chat Completions → RouterMessage[]. */
function openAiMessagesToRouter(messages) {
    return messages.map((m) => {
        let content = "";
        if (typeof m.content === "string")
            content = m.content;
        else if (Array.isArray(m.content)) {
            content = m.content
                .map((p) => (p.type === "text" ? p.text ?? "" : ""))
                .filter(Boolean)
                .join("\n");
        }
        const role = m.role === "system" || m.role === "assistant" ? m.role : m.role === "tool" ? "tool" : "user";
        return { role, content, toolCallId: m.tool_call_id };
    });
}
// ─────────────────────────────────────────────────────────────
// Resposta não-streaming
// ─────────────────────────────────────────────────────────────
function openAiCompletionResponse(result, requestedModel) {
    return {
        id: `chatcmpl-${result.usage.timestamp}`,
        object: "chat.completion",
        created: Math.floor(result.usage.timestamp / 1000),
        model: requestedModel,
        choices: [
            {
                index: 0,
                message: { role: "assistant", content: result.content },
                finish_reason: "stop",
            },
        ],
        usage: {
            prompt_tokens: result.usage.promptTokens,
            completion_tokens: result.usage.completionTokens,
            total_tokens: result.usage.promptTokens + result.usage.completionTokens,
        },
    };
}
// ─────────────────────────────────────────────────────────────
// Chunk de streaming (formato OpenAI chat.completion.chunk)
// ─────────────────────────────────────────────────────────────
function openAiStreamChunk(deltaText, requestedModel, done, usage) {
    return {
        id: `chatcmpl-stream-${Date.now()}`,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
            {
                index: 0,
                delta: deltaText ? { content: deltaText } : {},
                finish_reason: done ? "stop" : null,
            },
        ],
        ...(done && usage ? { usage } : {}),
    };
}
//# sourceMappingURL=openai.js.map
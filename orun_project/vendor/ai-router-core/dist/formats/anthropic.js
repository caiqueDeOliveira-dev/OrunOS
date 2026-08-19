"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicFormatError = void 0;
exports.parseAnthropicMessagesRequest = parseAnthropicMessagesRequest;
exports.anthropicMessagesToRouter = anthropicMessagesToRouter;
exports.anthropicCompletionResponse = anthropicCompletionResponse;
exports.anthropicStreamEvents = anthropicStreamEvents;
// ─────────────────────────────────────────────────────────────
// Parse do request Anthropic Messages → formato canônico
// ─────────────────────────────────────────────────────────────
class AnthropicFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = "AnthropicFormatError";
    }
}
exports.AnthropicFormatError = AnthropicFormatError;
function parseAnthropicMessagesRequest(body) {
    if (!body || typeof body !== "object")
        throw new AnthropicFormatError("corpo da request inválido");
    const { model, system, messages, stream, max_tokens, temperature, tools, tool_choice } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new AnthropicFormatError("campo 'messages' ausente ou vazio");
    }
    return { model, system, messages, stream: Boolean(stream), max_tokens, temperature, tools, tool_choice };
}
/** Extrai texto de um content block Anthropic (string, bloco text, ou content aninhado). */
function blockText(block) {
    if (typeof block === "string")
        return block;
    if (block.type === "text")
        return block.text ?? "";
    if (block.type === "tool_result") {
        if (typeof block.content === "string")
            return block.content;
        if (Array.isArray(block.content)) {
            return block.content.map((c) => (c.type === "text" ? c.text ?? "" : "")).filter(Boolean).join("\n");
        }
        return "";
    }
    if (block.type === "tool_use") {
        return `[tool_use: id=${block.id ?? ""} name=${block.name ?? ""} input=${JSON.stringify(block.input ?? {})}]`;
    }
    return "";
}
/** Traduz um request Anthropic Messages → RouterMessage[]. */
function anthropicMessagesToRouter(request) {
    const out = [];
    if (request.system) {
        const systemText = Array.isArray(request.system)
            ? request.system.map(blockText).filter(Boolean).join("\n")
            : request.system;
        if (systemText)
            out.push({ role: "system", content: systemText });
    }
    for (const msg of request.messages) {
        const blocks = typeof msg.content === "string" ? [{ type: "text", text: msg.content }] : msg.content;
        for (const block of blocks) {
            if (block.type === "tool_result") {
                out.push({ role: "tool", content: blockText(block), toolCallId: block.tool_use_id });
            }
            else {
                const text = blockText(block);
                if (text)
                    out.push({ role: msg.role, content: text });
            }
        }
    }
    return out;
}
// ─────────────────────────────────────────────────────────────
// Resposta não-streaming
// ─────────────────────────────────────────────────────────────
function anthropicCompletionResponse(result, requestedModel) {
    const content = [];
    if (result.content) {
        content.push({ type: "text", text: result.content });
    }
    if (result.tool_calls) {
        for (const tc of result.tool_calls) {
            content.push({
                type: "tool_use",
                id: tc.id,
                name: tc.function.name,
                input: JSON.parse(tc.function.arguments || "{}"),
            });
        }
    }
    if (content.length === 0) {
        content.push({ type: "text", text: "" });
    }
    return {
        id: `msg-${result.usage.timestamp}`,
        type: "message",
        role: "assistant",
        model: requestedModel,
        content,
        stop_reason: result.tool_calls && result.tool_calls.length > 0 ? "tool_use" : "end_turn",
        stop_sequence: null,
        usage: {
            input_tokens: result.usage.promptTokens,
            output_tokens: result.usage.completionTokens,
        },
    };
}
function anthropicStreamEvents(requestedModel, messageId) {
    return {
        messageStart: () => ({
            type: "message_start",
            message: {
                id: messageId,
                type: "message",
                role: "assistant",
                model: requestedModel,
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 0, output_tokens: 0 },
            },
        }),
        contentBlockStart: () => ({
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
        }),
        contentBlockDelta: (text) => ({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text },
        }),
        contentBlockStop: () => ({ type: "content_block_stop", index: 0 }),
        messageDelta: (usage) => ({
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: usage.completionTokens },
        }),
        messageStop: () => ({ type: "message_stop" }),
    };
}
//# sourceMappingURL=anthropic.js.map
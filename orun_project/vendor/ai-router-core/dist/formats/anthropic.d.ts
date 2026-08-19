import type { RouterCompletionResult, RouterMessage, ToolDefinition } from "../schema";
export declare class AnthropicFormatError extends Error {
    constructor(message: string);
}
export interface AnthropicContentBlock {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
    tool_use_id?: string;
    content?: string | Array<{
        type: string;
        text?: string;
    }>;
}
export interface AnthropicMessagesRequest {
    model?: string;
    system?: string | Array<AnthropicContentBlock>;
    messages: Array<{
        role: "user" | "assistant";
        content: string | AnthropicContentBlock[];
    }>;
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    tools?: ToolDefinition[];
    tool_choice?: {
        type: string;
        name?: string;
    };
}
export declare function parseAnthropicMessagesRequest(body: unknown): AnthropicMessagesRequest;
/** Traduz um request Anthropic Messages → RouterMessage[]. */
export declare function anthropicMessagesToRouter(request: AnthropicMessagesRequest): RouterMessage[];
export declare function anthropicCompletionResponse(result: RouterCompletionResult, requestedModel: string): {
    id: string;
    type: string;
    role: string;
    model: string;
    content: AnthropicContentBlock[];
    stop_reason: string;
    stop_sequence: null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
};
export interface AnthropicEvent {
    type: string;
    index?: number;
    message?: Record<string, unknown>;
    content_block?: Record<string, unknown>;
    delta?: {
        type?: string;
        text?: string;
        stop_reason?: string | null;
        stop_sequence?: string | null;
    };
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    [key: string]: unknown;
}
export interface AnthropicStreamEvents {
    messageStart: () => AnthropicEvent;
    contentBlockStart: () => AnthropicEvent;
    contentBlockDelta: (text: string) => AnthropicEvent;
    contentBlockStop: () => AnthropicEvent;
    messageDelta: (usage: {
        promptTokens: number;
        completionTokens: number;
    }) => AnthropicEvent;
    messageStop: () => AnthropicEvent;
}
export declare function anthropicStreamEvents(requestedModel: string, messageId: string): AnthropicStreamEvents;

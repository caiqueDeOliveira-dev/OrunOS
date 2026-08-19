import type { RouterCompletionResult, RouterMessage, ToolCall, ToolDefinition, ToolChoice } from "../schema";
export declare class OpenAiFormatError extends Error {
    constructor(message: string);
}
export interface OpenAiChatRequest {
    model?: string;
    messages: Array<{
        role: string;
        content: string | Array<{
            type: string;
            text?: string;
        }> | null;
        tool_call_id?: string;
    }>;
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    tools?: ToolDefinition[];
    tool_choice?: ToolChoice;
}
export declare function parseOpenAiChatRequest(body: unknown): OpenAiChatRequest;
/** Traduz mensagens OpenAI Chat Completions → RouterMessage[]. */
export declare function openAiMessagesToRouter(messages: OpenAiChatRequest["messages"]): RouterMessage[];
export declare function openAiCompletionResponse(result: RouterCompletionResult, requestedModel: string): {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            tool_calls?: {
                id: string;
                type: "function";
                function: {
                    name: string;
                    arguments: string;
                };
            }[] | undefined;
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};
export declare function openAiStreamChunk(deltaText: string, requestedModel: string, done: boolean, usage?: {
    promptTokens: number;
    completionTokens: number;
}, toolCalls?: ToolCall[]): {
    usage?: {
        promptTokens: number;
        completionTokens: number;
    } | undefined;
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        delta: {
            tool_calls?: {
                index: number;
                id: string;
                type: string;
                function: {
                    name: string;
                    arguments: string;
                };
            }[] | undefined;
            content?: string | undefined;
        };
        finish_reason: string | null;
    }[];
};

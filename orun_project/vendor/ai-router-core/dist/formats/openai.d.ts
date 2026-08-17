import type { RouterCompletionResult, RouterMessage } from "../schema";
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
}): {
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
            content: string;
        } | {
            content?: undefined;
        };
        finish_reason: string | null;
    }[];
};

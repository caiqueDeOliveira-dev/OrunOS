import type { RouterMessage } from "../schema";
import type { AdapterCallOptions, IProviderAdapter, RawCompletionResult, StreamChunk } from "./types";
/**
 * Cobre todo provider que fala o dialeto /v1/chat/completions da OpenAI:
 * Groq, GitHub Models, Cerebras, Mistral, OpenCode Free, Cohere (compat),
 * NVIDIA NIM, SiliconFlow, Chutes, OpenAI, OpenRouter, DeepSeek, xAI,
 * Perplexity, Together, Fireworks, Nebius, Hyperbolic, Kiro, Codex,
 * GitHub Copilot, Cursor, Antigravity, Kimchi, custom-openai-compatible.
 */
export declare class OpenAiCompatibleAdapter implements IProviderAdapter {
    readonly wireFormat = "openai-compatible";
    private buildHeaders;
    complete(messages: RouterMessage[], opts: AdapterCallOptions): Promise<RawCompletionResult>;
    completeStream(messages: RouterMessage[], opts: AdapterCallOptions, onChunk: (chunk: StreamChunk) => void): Promise<RawCompletionResult>;
}

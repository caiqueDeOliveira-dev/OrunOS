import type { RouterMessage } from "../schema";
import type { AdapterCallOptions, IProviderAdapter, RawCompletionResult, StreamChunk } from "./types";
export declare class AnthropicNativeAdapter implements IProviderAdapter {
    readonly wireFormat = "anthropic-native";
    private buildHeaders;
    private splitMessages;
    complete(messages: RouterMessage[], opts: AdapterCallOptions): Promise<RawCompletionResult>;
    completeStream(messages: RouterMessage[], opts: AdapterCallOptions, onChunk: (chunk: StreamChunk) => void): Promise<RawCompletionResult>;
}

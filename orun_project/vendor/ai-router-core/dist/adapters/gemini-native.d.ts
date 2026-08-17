import type { RouterMessage } from "../schema";
import type { AdapterCallOptions, IProviderAdapter, RawCompletionResult, StreamChunk } from "./types";
export declare class GeminiNativeAdapter implements IProviderAdapter {
    readonly wireFormat = "gemini-native";
    private buildBody;
    complete(messages: RouterMessage[], opts: AdapterCallOptions): Promise<RawCompletionResult>;
    completeStream(messages: RouterMessage[], opts: AdapterCallOptions, onChunk: (chunk: StreamChunk) => void): Promise<RawCompletionResult>;
}

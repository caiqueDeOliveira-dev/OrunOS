import type { RouterMessage } from "../schema";
import type { AdapterCallOptions, IProviderAdapter, RawCompletionResult, StreamChunk } from "./types";
export declare class OllamaNativeAdapter implements IProviderAdapter {
    readonly wireFormat = "ollama-native";
    complete(messages: RouterMessage[], opts: AdapterCallOptions): Promise<RawCompletionResult>;
    completeStream(messages: RouterMessage[], opts: AdapterCallOptions, onChunk: (chunk: StreamChunk) => void): Promise<RawCompletionResult>;
}

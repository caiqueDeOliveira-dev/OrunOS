import type { RouterMessage } from "../schema";
import type { IEmbeddingProvider } from "./embedding-provider";
export interface SemanticCacheEntry {
    comboId: string;
    promptText: string;
    embedding: number[];
    responseContent: string;
    providerId: string;
    model: string;
    createdAt: number;
}
export interface ISemanticCacheStore {
    listByCombo(comboId: string): Promise<SemanticCacheEntry[]>;
    add(entry: SemanticCacheEntry): Promise<void>;
    /** limpa entradas mais antigas que maxAgeMs, ou mantém só as `maxEntries` mais recentes por combo — implementação decide a estratégia. */
    prune(comboId: string, maxEntries: number): Promise<void>;
}
export interface SemanticCacheLookupResult {
    responseContent: string;
    providerId: string;
    model: string;
    similarity: number;
}
/** Concatena as mensagens da conversa numa única string representativa pra embedar. */
export declare function messagesToPromptText(messages: RouterMessage[]): string;
export declare class SemanticCache {
    private readonly store;
    private readonly embeddingProvider;
    private readonly maxEntriesPerCombo;
    constructor(store: ISemanticCacheStore, embeddingProvider: IEmbeddingProvider, maxEntriesPerCombo?: number);
    lookup(comboId: string, messages: RouterMessage[], threshold: number): Promise<SemanticCacheLookupResult | null>;
    save(comboId: string, messages: RouterMessage[], responseContent: string, providerId: string, model: string): Promise<void>;
}

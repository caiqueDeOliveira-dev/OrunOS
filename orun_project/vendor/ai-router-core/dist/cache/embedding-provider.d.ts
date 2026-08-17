export interface IEmbeddingProvider {
    readonly kind: "local-hash" | "provider";
    embed(text: string): Promise<number[]>;
}
/**
 * Embedding local por hashing de bag-of-words — 100% offline, grátis,
 * zero latência de rede. NÃO é um embedding semântico de verdade (não
 * entende sinônimos/paráfrase), mas pega bem prompts idênticos ou quase
 * idênticos, que já é o caso de uso mais comum de cache (o usuário
 * reenviando a mesma pergunta, ou o mesmo prompt de sistema repetido).
 *
 * Pra similaridade semântica de verdade, injete um `MediaRouterEmbeddingProvider`
 * apontando pra um combo de mídia com um provider `embeddings` real (ex: OpenAI,
 * Cohere, Nebius) — a interface é a mesma, o SemanticCache não muda.
 */
export declare class LocalHashEmbeddingProvider implements IEmbeddingProvider {
    readonly kind: "local-hash";
    embed(text: string): Promise<number[]>;
}
export declare function cosineSimilarity(a: number[], b: number[]): number;

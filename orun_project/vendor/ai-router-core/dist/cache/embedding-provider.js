"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalHashEmbeddingProvider = void 0;
exports.cosineSimilarity = cosineSimilarity;
const LOCAL_EMBEDDING_DIM = 128;
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
class LocalHashEmbeddingProvider {
    kind = "local-hash";
    async embed(text) {
        const vector = new Array(LOCAL_EMBEDDING_DIM).fill(0);
        const words = text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, " ")
            .split(/\s+/)
            .filter(Boolean);
        for (const word of words) {
            const bucket = hashString(word) % LOCAL_EMBEDDING_DIM;
            vector[bucket] += 1;
        }
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
        return vector.map((v) => v / norm);
    }
}
exports.LocalHashEmbeddingProvider = LocalHashEmbeddingProvider;
function hashString(s) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
//# sourceMappingURL=embedding-provider.js.map
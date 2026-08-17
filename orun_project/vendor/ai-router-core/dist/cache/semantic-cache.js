"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCache = void 0;
exports.messagesToPromptText = messagesToPromptText;
const embedding_provider_1 = require("./embedding-provider");
/** Concatena as mensagens da conversa numa única string representativa pra embedar. */
function messagesToPromptText(messages) {
    return messages
        .filter((m) => m.role !== "system") // system prompt (inclusive de skill) não deveria afetar cache hit
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n---\n");
}
class SemanticCache {
    store;
    embeddingProvider;
    maxEntriesPerCombo;
    constructor(store, embeddingProvider, maxEntriesPerCombo = 200) {
        this.store = store;
        this.embeddingProvider = embeddingProvider;
        this.maxEntriesPerCombo = maxEntriesPerCombo;
    }
    async lookup(comboId, messages, threshold) {
        const promptText = messagesToPromptText(messages);
        const entries = await this.store.listByCombo(comboId);
        if (entries.length === 0)
            return null;
        const queryEmbedding = await this.embeddingProvider.embed(promptText);
        let best = null;
        for (const entry of entries) {
            const similarity = (0, embedding_provider_1.cosineSimilarity)(queryEmbedding, entry.embedding);
            if (!best || similarity > best.similarity)
                best = { entry, similarity };
        }
        if (best && best.similarity >= threshold) {
            return {
                responseContent: best.entry.responseContent,
                providerId: best.entry.providerId,
                model: best.entry.model,
                similarity: best.similarity,
            };
        }
        return null;
    }
    async save(comboId, messages, responseContent, providerId, model) {
        const promptText = messagesToPromptText(messages);
        const embedding = await this.embeddingProvider.embed(promptText);
        await this.store.add({ comboId, promptText, embedding, responseContent, providerId, model, createdAt: Date.now() });
        await this.store.prune(comboId, this.maxEntriesPerCombo);
    }
}
exports.SemanticCache = SemanticCache;
//# sourceMappingURL=semantic-cache.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapter = getAdapter;
const openai_compatible_1 = require("./openai-compatible");
const anthropic_native_1 = require("./anthropic-native");
const gemini_native_1 = require("./gemini-native");
const ollama_native_1 = require("./ollama-native");
const vertex_native_1 = require("./vertex-native");
const ADAPTERS = {
    "openai-compatible": new openai_compatible_1.OpenAiCompatibleAdapter(),
    "anthropic-native": new anthropic_native_1.AnthropicNativeAdapter(),
    "gemini-native": new gemini_native_1.GeminiNativeAdapter(),
    "ollama-native": new ollama_native_1.OllamaNativeAdapter(),
    "vertex-native": new vertex_native_1.VertexNativeAdapter(),
};
function getAdapter(wireFormat) {
    const adapter = ADAPTERS[wireFormat];
    if (!adapter) {
        throw new Error(`Nenhum adapter implementado ainda para wireFormat="${wireFormat}"`);
    }
    return adapter;
}
//# sourceMappingURL=registry.js.map
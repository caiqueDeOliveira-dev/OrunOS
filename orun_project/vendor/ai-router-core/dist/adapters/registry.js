"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapter = getAdapter;
const openai_compatible_1 = require("./openai-compatible");
const anthropic_native_1 = require("./anthropic-native");
const gemini_native_1 = require("./gemini-native");
const ollama_native_1 = require("./ollama-native");
const vertex_native_1 = require("./vertex-native");
const mcp_native_1 = require("./mcp-native");
const a2a_native_1 = require("./a2a-native");
const ADAPTERS = {
    "openai-compatible": new openai_compatible_1.OpenAiCompatibleAdapter(),
    "anthropic-native": new anthropic_native_1.AnthropicNativeAdapter(),
    "gemini-native": new gemini_native_1.GeminiNativeAdapter(),
    "ollama-native": new ollama_native_1.OllamaNativeAdapter(),
    "vertex-native": new vertex_native_1.VertexNativeAdapter(),
    "mcp-native": new mcp_native_1.McpNativeAdapter(),
    "a2a-native": new a2a_native_1.A2aNativeAdapter(),
};
function getAdapter(wireFormat) {
    const adapter = ADAPTERS[wireFormat];
    if (!adapter) {
        throw new Error(`Nenhum adapter implementado ainda para wireFormat="${wireFormat}"`);
    }
    return adapter;
}
//# sourceMappingURL=registry.js.map
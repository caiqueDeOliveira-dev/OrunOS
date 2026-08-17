import type { Combo, ProviderConfig, ProviderId, SkillBinding, UsageEvent } from "../schema";
import type { ResolvedCredential } from "../adapters/types";
import type { IAiSecretStore, IComboStore, IProviderConfigStore, ISkillStore, IUsageLogStore } from "./interfaces";
import type { ISemanticCacheStore, SemanticCacheEntry } from "../cache/semantic-cache";
/** Só pra dev local / testes. A versão real vira @orun/settings + SQLite. */
export declare class InMemoryComboStore implements IComboStore {
    private combos;
    getCombo(comboId: string): Promise<{
        id: string;
        name: string;
        kind: "text" | "media";
        steps: {
            providerId: "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github-models" | "gemini" | "cerebras" | "mistral" | "kiro" | "opencode-free" | "vertex-ai" | "cohere" | "nvidia-nim" | "siliconflow" | "chutes" | "cloudflare-workers-ai" | "huggingface-inference" | "deepseek" | "xai" | "perplexity" | "together" | "fireworks" | "nebius" | "hyperbolic" | "claude-code" | "codex" | "github-copilot" | "cursor" | "antigravity" | "kimchi" | "custom-openai-compatible" | "custom-anthropic-compatible";
            model: string;
            maxRetries: number;
            accountLabel?: string | undefined;
        }[];
        isSystemDefault: boolean;
        rtkEnabled: boolean;
        cacheEnabled: boolean;
        cacheSimilarityThreshold: number;
        skillId?: string | undefined;
    } | null>;
    listCombos(): Promise<{
        id: string;
        name: string;
        kind: "text" | "media";
        steps: {
            providerId: "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github-models" | "gemini" | "cerebras" | "mistral" | "kiro" | "opencode-free" | "vertex-ai" | "cohere" | "nvidia-nim" | "siliconflow" | "chutes" | "cloudflare-workers-ai" | "huggingface-inference" | "deepseek" | "xai" | "perplexity" | "together" | "fireworks" | "nebius" | "hyperbolic" | "claude-code" | "codex" | "github-copilot" | "cursor" | "antigravity" | "kimchi" | "custom-openai-compatible" | "custom-anthropic-compatible";
            model: string;
            maxRetries: number;
            accountLabel?: string | undefined;
        }[];
        isSystemDefault: boolean;
        rtkEnabled: boolean;
        cacheEnabled: boolean;
        cacheSimilarityThreshold: number;
        skillId?: string | undefined;
    }[]>;
    saveCombo(combo: Combo): Promise<void>;
    deleteCombo(comboId: string): Promise<void>;
}
export declare class InMemoryProviderConfigStore implements IProviderConfigStore {
    private configs;
    private key;
    getConfig(providerId: ProviderId, accountLabel?: string): Promise<{
        providerId: "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github-models" | "gemini" | "cerebras" | "mistral" | "kiro" | "opencode-free" | "vertex-ai" | "cohere" | "nvidia-nim" | "siliconflow" | "chutes" | "cloudflare-workers-ai" | "huggingface-inference" | "deepseek" | "xai" | "perplexity" | "together" | "fireworks" | "nebius" | "hyperbolic" | "claude-code" | "codex" | "github-copilot" | "cursor" | "antigravity" | "kimchi" | "custom-openai-compatible" | "custom-anthropic-compatible";
        enabled: boolean;
        hasCredential: boolean;
        priority: number;
        rotationMode: "priority" | "round-robin";
        accountLabel?: string | undefined;
        customBaseUrl?: string | undefined;
    } | null>;
    listConfigs(): Promise<{
        providerId: "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github-models" | "gemini" | "cerebras" | "mistral" | "kiro" | "opencode-free" | "vertex-ai" | "cohere" | "nvidia-nim" | "siliconflow" | "chutes" | "cloudflare-workers-ai" | "huggingface-inference" | "deepseek" | "xai" | "perplexity" | "together" | "fireworks" | "nebius" | "hyperbolic" | "claude-code" | "codex" | "github-copilot" | "cursor" | "antigravity" | "kimchi" | "custom-openai-compatible" | "custom-anthropic-compatible";
        enabled: boolean;
        hasCredential: boolean;
        priority: number;
        rotationMode: "priority" | "round-robin";
        accountLabel?: string | undefined;
        customBaseUrl?: string | undefined;
    }[]>;
    saveConfig(config: ProviderConfig): Promise<void>;
}
export declare class InMemorySecretStore implements IAiSecretStore {
    private secrets;
    private key;
    getCredential(providerId: ProviderId, accountLabel?: string): Promise<ResolvedCredential | null>;
    setCredential(providerId: ProviderId, credential: ResolvedCredential, accountLabel?: string): Promise<void>;
}
export declare class InMemorySkillStore implements ISkillStore {
    private skills;
    seed(skill: SkillBinding): void;
    getSkill(skillId: string): Promise<{
        id: string;
        name: string;
        systemPrompt: string;
        toolNames: string[];
        promptStyle: "default" | "caveman" | "ponytail";
    } | null>;
}
export declare class InMemoryUsageLogStore implements IUsageLogStore {
    private events;
    record(event: UsageEvent): Promise<void>;
    listRecent(comboId?: string, limit?: number): Promise<{
        timestamp: number;
        comboId: string;
        stepIndex: number;
        providerId: "ollama" | "anthropic" | "openai" | "openrouter" | "groq" | "github-models" | "gemini" | "cerebras" | "mistral" | "kiro" | "opencode-free" | "vertex-ai" | "cohere" | "nvidia-nim" | "siliconflow" | "chutes" | "cloudflare-workers-ai" | "huggingface-inference" | "deepseek" | "xai" | "perplexity" | "together" | "fireworks" | "nebius" | "hyperbolic" | "claude-code" | "codex" | "github-copilot" | "cursor" | "antigravity" | "kimchi" | "custom-openai-compatible" | "custom-anthropic-compatible";
        model: string;
        promptTokens: number;
        completionTokens: number;
        latencyMs: number;
        success: boolean;
        estimatedCostUsd: number;
        cacheHit: boolean;
        errorCode?: string | undefined;
    }[]>;
}
export declare class InMemorySemanticCacheStore implements ISemanticCacheStore {
    private entries;
    listByCombo(comboId: string): Promise<SemanticCacheEntry[]>;
    add(entry: SemanticCacheEntry): Promise<void>;
    prune(comboId: string, maxEntries: number): Promise<void>;
}

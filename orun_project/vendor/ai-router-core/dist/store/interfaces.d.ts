import type { Combo, ProviderConfig, ProviderId, SkillBinding, UsageEvent } from "../schema";
import type { ResolvedCredential } from "../adapters/types";
/**
 * Fornece os combos configurados. Implementação real: um namespace novo
 * dentro do @orun/settings (scope "account", sincroniza Desktop <-> Mobile).
 */
export interface IComboStore {
    getCombo(comboId: string): Promise<Combo | null>;
    listCombos(): Promise<Combo[]>;
    saveCombo(combo: Combo): Promise<void>;
    deleteCombo(comboId: string): Promise<void>;
}
/**
 * Config de providers habilitados pelo usuário (scope "account").
 * Chaveado por provider + conta — um mesmo provider pode ter várias
 * contas configuradas (ex: 2 chaves Groq pra dobrar o rate-limit efetivo).
 */
export interface IProviderConfigStore {
    getConfig(providerId: ProviderId, accountLabel?: string): Promise<ProviderConfig | null>;
    listConfigs(): Promise<ProviderConfig[]>;
    saveConfig(config: ProviderConfig): Promise<void>;
    deleteConfig(providerId: ProviderId): Promise<void>;
}
/**
 * Segredos (API keys, OAuth tokens) — reusa o ISecretStore que já existe
 * no @orun/identity, injetado igual ao padrão do BaseSettingsStore.
 * Chave sugerida: `ai-router.${providerId}.${accountLabel ?? "default"}`
 */
export interface IAiSecretStore {
    getCredential(providerId: ProviderId, accountLabel?: string): Promise<ResolvedCredential | null>;
    setCredential(providerId: ProviderId, credential: ResolvedCredential, accountLabel?: string): Promise<void>;
}
/**
 * Skills/agentes próprios (system prompt + tools fixos por combo).
 */
export interface ISkillStore {
    getSkill(skillId: string): Promise<SkillBinding | null>;
}
/**
 * Log de uso — scope "device" (não precisa sincronizar), SQLite local
 * (better-sqlite3 no Electron, expo-sqlite no Expo), mesmo padrão do
 * resto do monorepo.
 */
export interface IUsageLogStore {
    record(event: UsageEvent): Promise<void>;
    listRecent(comboId?: string, limit?: number): Promise<UsageEvent[]>;
}

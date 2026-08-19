import type { ISemanticCacheStore, SemanticCacheEntry } from "@orun/ai-router-core";
import Database from "better-sqlite3";
import type { Combo, ProviderConfig, ProviderId, UsageEvent, IComboStore, IProviderConfigStore, IUsageLogStore, IOAuthTokenStore, OAuthTokenSet } from "@orun/ai-router-core";
/**
 * Camada SQLite compartilhada. Em produção: `better-sqlite3` no Electron,
 * troque por `expo-sqlite` no Expo (mesma forma, driver diferente) — igual
 * ao padrão já usado no @orun/settings.
 */
export declare function openAiRouterDatabase(path: string): Database.Database;
export declare class SqliteComboStore implements IComboStore {
    private readonly db;
    constructor(db: Database.Database);
    getCombo(comboId: string): Promise<Combo | null>;
    listCombos(): Promise<Combo[]>;
    saveCombo(combo: Combo): Promise<void>;
    deleteCombo(comboId: string): Promise<void>;
}
export declare class SqliteProviderConfigStore implements IProviderConfigStore {
    private readonly db;
    constructor(db: Database.Database);
    getConfig(providerId: ProviderId, accountLabel?: string): Promise<ProviderConfig | null>;
    listConfigs(): Promise<ProviderConfig[]>;
    saveConfig(config: ProviderConfig): Promise<void>;
    deleteConfig(providerId: ProviderId): Promise<void>;
}
export declare class SqliteUsageLogStore implements IUsageLogStore {
    private readonly db;
    constructor(db: Database.Database);
    record(event: UsageEvent): Promise<void>;
    listRecent(comboId?: string, limit?: number): Promise<UsageEvent[]>;
}
/** Cipher mínimo — injete AES-GCM real do safeStorage (Electron) ou expo-secure-store no lugar disso. */
export interface ITokenCipher {
    encrypt(plain: string): string;
    decrypt(cipherText: string): string;
}
export declare class SqliteOAuthTokenStore implements IOAuthTokenStore {
    private readonly db;
    private readonly cipher;
    constructor(db: Database.Database, cipher: ITokenCipher);
    getTokenSet(providerId: ProviderId, accountLabel?: string): Promise<OAuthTokenSet | null>;
    saveTokenSet(providerId: ProviderId, tokens: OAuthTokenSet, accountLabel?: string): Promise<void>;
}
/** Persistência real do cache semântico — só é usada se combo.cacheEnabled=true. */
export declare class SqliteSemanticCacheStore implements ISemanticCacheStore {
    private readonly db;
    constructor(db: Database.Database);
    listByCombo(comboId: string): Promise<SemanticCacheEntry[]>;
    add(entry: SemanticCacheEntry): Promise<void>;
    prune(comboId: string, maxEntries: number): Promise<void>;
}

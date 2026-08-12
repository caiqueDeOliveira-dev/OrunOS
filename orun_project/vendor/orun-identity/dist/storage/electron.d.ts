import type { ISecureTokenStore } from './ISecureTokenStore';
/**
 * Implementação para Electron (Desktop), reaproveitando o padrão safeStorage
 * já usado no resto do app (ex: secretStore de social-media.cjs).
 *
 * O caller deve passar a instância de `safeStorage` do módulo `electron` e um
 * caminho de arquivo (ou outro backend de persistência, ex: better-sqlite3)
 * onde os bytes criptografados serão gravados — safeStorage só criptografa/
 * descriptografa em memória, não persiste sozinho.
 */
export interface ElectronSafeStorage {
    isEncryptionAvailable(): boolean;
    encryptString(plainText: string): Buffer;
    decryptString(encrypted: Buffer): string;
}
export interface KeyValueBackend {
    read(key: string): Promise<Buffer | null>;
    write(key: string, value: Buffer): Promise<void>;
    delete(key: string): Promise<void>;
    clearAll(): Promise<void>;
}
export declare class ElectronSecureTokenStore implements ISecureTokenStore {
    private readonly safeStorage;
    private readonly backend;
    constructor(safeStorage: ElectronSafeStorage, backend: KeyValueBackend);
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=electron.d.ts.map
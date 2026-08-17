import type Database from "better-sqlite3";
import type { ProviderId, ResolvedCredential, IAiSecretStore } from "@orun/ai-router-core";
import type { ITokenCipher } from "./sqlite";
/**
 * Lê (ou gera na primeira vez) um salt aleatório de 16 bytes, persistido
 * na própria base — nunca hardcoded. Cada instalação do Orun tem o seu.
 */
export declare function getOrCreateCipherSalt(db: Database.Database): Buffer;
/**
 * ⚠️ Stand-in de DEV/teste. Em produção real:
 * - Electron: use `safeStorage.encryptString()` / `decryptString()` (já é o
 *   padrão que você usa no resto do monorepo — chave gerenciada pelo SO).
 * - Expo: use `expo-secure-store` diretamente (Keychain/Keystore nativo),
 *   nem precisa desse cipher manual.
 * Esta classe existe só pra rodar/testar o pacote fora do Electron/Expo.
 *
 * O salt NUNCA é fixo no código — vem de `getOrCreateCipherSalt(db)`, que
 * gera um valor aleatório na primeira execução e persiste. Duas instalações
 * do Orun nunca compartilham o mesmo salt.
 */
export declare class NodeAesGcmCipher implements ITokenCipher {
    private readonly key;
    constructor(passphrase: string, salt: Buffer);
    encrypt(plain: string): string;
    decrypt(cipherText: string): string;
}
/** API keys estáticas cifradas em SQLite — mesmo padrão de tabela do oauth_tokens. */
export declare class SqliteApiKeySecretStore implements IAiSecretStore {
    private readonly db;
    private readonly cipher;
    constructor(db: Database.Database, cipher: ITokenCipher);
    getCredential(providerId: ProviderId, accountLabel?: string): Promise<ResolvedCredential | null>;
    setCredential(providerId: ProviderId, credential: ResolvedCredential, accountLabel?: string): Promise<void>;
}

import type { ISecureTokenStore } from './ISecureTokenStore';
/**
 * Implementação para Expo/React Native (Mobile), usando expo-secure-store.
 *
 * Não importamos expo-secure-store diretamente aqui para manter o pacote
 * livre de dependências nativas — o app mobile injeta as funções do módulo
 * no momento da inicialização.
 */
export interface ExpoSecureStoreModule {
    getItemAsync(key: string): Promise<string | null>;
    setItemAsync(key: string, value: string): Promise<void>;
    deleteItemAsync(key: string): Promise<void>;
}
export declare class ExpoSecureTokenStore implements ISecureTokenStore {
    private readonly secureStore;
    private readonly managedKeys;
    constructor(secureStore: ExpoSecureStoreModule);
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=expo.d.ts.map
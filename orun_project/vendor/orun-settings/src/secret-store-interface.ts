/**
 * @orun/settings — ISecretStore
 *
 * Contrato mínimo para persistir os poucos campos de settings que são
 * segredos (ex: homelab.homeAssistantToken). Deliberadamente o mesmo
 * formato do ISecureTokenStore usado em @orun/identity — cada plataforma
 * já tem uma implementação equivalente lá (Electron safeStorage, Expo
 * expo-secure-store, Tizen Web Crypto AES-GCM); o ideal é REUSAR essas
 * implementações em vez de duplicar, injetando-as aqui via adapter.
 */
export interface ISecretStore {
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * @orun/settings — paths que contêm segredos
 *
 * Qualquer path aqui NUNCA é escrito em texto puro no arquivo/tabela de
 * settings — o valor real vai para o ISecretStore da plataforma, e o blob
 * principal guarda só um placeholder indicando "está setado".
 */
export const SETTINGS_SECRET_PATHS: string[] = ['homelab.homeAssistantToken'];

export function isSecretPath(path: string): boolean {
  return SETTINGS_SECRET_PATHS.includes(path);
}

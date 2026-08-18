import { useCallback } from 'react';
import { useSettingsStore } from './settings-context';
import type { SettingsPath } from '../store-interface';

/**
 * @orun/settings — useResetSetting
 * Retorna uma função pra resetar um path específico pro default do schema.
 * Chame sem argumento (via store diretamente) pra resetar tudo — este hook
 * é focado no caso comum de "resetar este campo", que é o que a maioria
 * das telas de configuração precisa (ex: botão "restaurar padrão" ao lado
 * de um campo).
 */
export function useResetSetting(path: SettingsPath): () => Promise<void> {
  const store = useSettingsStore();
  return useCallback(() => store.reset(path), [store, path]);
}

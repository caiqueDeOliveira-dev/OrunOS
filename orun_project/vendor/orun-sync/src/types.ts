/**
 * @orun/sync — types
 *
 * Motor de sincronização GENÉRICO por "path" (string arbitrária, ex:
 * "settings.core.theme" ou futuramente "beauty.businessHours"). Não conhece
 * o schema do @orun/settings nem de nenhum outro pacote — quem decide QUAIS
 * paths sincronizar é o chamador (ex: o adapter que liga @orun/settings a
 * este engine, usando o scope-map de lá).
 */

/** Um valor sincronizado, em um ponto no tempo, escrito por um device. */
export interface SyncRecord {
  path: string;
  value: unknown;
  /** ISO 8601 */
  updatedAt: string;
  deviceId: string;
}

export type Unsubscribe = () => void;

/**
 * Abstração de transporte — a implementação real usa Supabase Realtime +
 * Postgres, mas o engine não depende disso diretamente (permite testar sem
 * rede e trocar de backend no futuro sem reescrever a lógica de conflito).
 */
export interface SyncTransport {
  /** Busca o estado remoto atual de todos os paths sincronizados do usuário. */
  pullAll(userId: string): Promise<SyncRecord[]>;

  /** Envia uma mudança local pro backend remoto. */
  push(userId: string, record: SyncRecord): Promise<void>;

  /** Assina mudanças remotas em tempo real (de QUALQUER device, incl. o próprio — o engine filtra o eco). */
  subscribe(userId: string, onChange: (record: SyncRecord) => void): Unsubscribe;
}

/**
 * Conflito: local e remoto divergiram desde a última sincronização
 * confirmada. Como a estratégia escolhida é "merge manual", o engine NUNCA
 * resolve isso sozinho — só expõe e espera resolveConflict().
 */
export interface ConflictRecord {
  path: string;
  localValue: unknown;
  remoteValue: unknown;
  remoteUpdatedAt: string;
  remoteDeviceId: string;
}

export type ConflictResolution = 'keep-local' | 'keep-remote';

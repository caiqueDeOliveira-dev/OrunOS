import type { SyncRecord, SyncTransport, Unsubscribe } from '../types';

/**
 * Simula um backend compartilhado (tipo Supabase) entre múltiplas instâncias
 * de InMemorySyncTransport — todas apontando pro mesmo `sharedState` fazem
 * de conta que são devices diferentes falando com o mesmo Postgres/Realtime.
 */
class SharedBackend {
  records = new Map<string, SyncRecord>();
  listeners = new Set<(userId: string, record: SyncRecord) => void>();
}

export class InMemorySyncTransport implements SyncTransport {
  constructor(private readonly backend: SharedBackend) {}

  static createSharedBackend(): SharedBackend {
    return new SharedBackend();
  }

  async pullAll(userId: string): Promise<SyncRecord[]> {
    return Array.from(this.backend.records.values());
  }

  async push(userId: string, record: SyncRecord): Promise<void> {
    this.backend.records.set(record.path, record);
    // simula latência de rede mínima e notifica de forma assíncrona, como Realtime faria
    queueMicrotask(() => {
      this.backend.listeners.forEach((listener) => listener(userId, record));
    });
  }

  subscribe(userId: string, onChange: (record: SyncRecord) => void): Unsubscribe {
    const listener = (_userId: string, record: SyncRecord) => onChange(record);
    this.backend.listeners.add(listener);
    return () => this.backend.listeners.delete(listener);
  }
}

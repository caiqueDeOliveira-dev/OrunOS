import type { SyncRecord, SyncTransport, Unsubscribe } from '../types';

/** Envolve outro transporte e permite simular quedas de rede nos testes. */
export class FlakyTransport implements SyncTransport {
  online = true;

  constructor(private readonly inner: SyncTransport) {}

  async pullAll(userId: string): Promise<SyncRecord[]> {
    if (!this.online) throw new Error('offline (simulado)');
    return this.inner.pullAll(userId);
  }

  async push(userId: string, record: SyncRecord): Promise<void> {
    if (!this.online) throw new Error('offline (simulado)');
    return this.inner.push(userId, record);
  }

  subscribe(userId: string, onChange: (record: SyncRecord) => void): Unsubscribe {
    return this.inner.subscribe(userId, onChange);
  }
}

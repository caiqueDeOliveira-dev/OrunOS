import type { SyncableLocalStore, Unsubscribe } from '../local-store-interface';

/** Store local minimalista (sem validação de schema) — usada só nos testes do SyncEngine. */
export class InMemoryLocalStore implements SyncableLocalStore {
  private data = new Map<string, unknown>();
  private listeners = new Map<string, Set<(newValue: unknown, oldValue: unknown) => void>>();

  async get(path: string): Promise<unknown> {
    return this.data.get(path);
  }

  async set(path: string, value: unknown): Promise<void> {
    const oldValue = this.data.get(path);
    this.data.set(path, value);
    this.listeners.get(path)?.forEach((listener) => listener(value, oldValue));
  }

  subscribe(path: string, listener: (newValue: unknown, oldValue: unknown) => void): Unsubscribe {
    if (!this.listeners.has(path)) this.listeners.set(path, new Set());
    this.listeners.get(path)!.add(listener);
    return () => this.listeners.get(path)?.delete(listener);
  }
}

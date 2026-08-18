import { describe, it, expect } from 'vitest';
import { SyncEngine } from './sync-engine';
import { InMemorySyncTransport } from './test-helpers/in-memory-transport';
import { InMemoryLocalStore } from './test-helpers/in-memory-local-store';
import { FlakyTransport } from './test-helpers/flaky-transport';

function tick(ms = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('SyncEngine — fila offline', () => {
  it('push que falha entra na fila e valor local é aplicado mesmo assim', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const flaky = new FlakyTransport(new InMemorySyncTransport(backend));
    const store = new InMemoryLocalStore();

    const engine = new SyncEngine({
      transport: flaky,
      localStore: store,
      userId: 'user-1',
      deviceId: 'device-1',
      syncedPaths: ['core.theme'],
    });
    await engine.init();

    const pendingSnapshots: string[][] = [];
    engine.subscribePendingPushes((paths) => pendingSnapshots.push(paths));

    flaky.online = false;
    await store.set('core.theme', 'dark');
    await tick();

    expect(engine.getPendingPushPaths()).toContain('core.theme');
    expect(pendingSnapshots.some((s) => s.includes('core.theme'))).toBe(true);
    // offline-first: valor local aplicado mesmo sem confirmação remota
    expect(await store.get('core.theme')).toBe('dark');

    engine.dispose();
  });

  it('retryPendingPushes() limpa a fila quando a conexão volta', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const flaky = new FlakyTransport(new InMemorySyncTransport(backend));
    const store = new InMemoryLocalStore();

    const engine = new SyncEngine({
      transport: flaky,
      localStore: store,
      userId: 'user-1',
      deviceId: 'device-1',
      syncedPaths: ['core.theme'],
    });
    await engine.init();

    flaky.online = false;
    await store.set('core.theme', 'dark');
    await tick();
    expect(engine.getPendingPushPaths()).toHaveLength(1);

    flaky.online = true;
    await engine.retryPendingPushes();
    await tick();
    expect(engine.getPendingPushPaths()).toHaveLength(0);

    engine.dispose();
  });

  it('retryIntervalMs reenvia sozinho quando a conexão volta, sem chamada manual', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const flaky = new FlakyTransport(new InMemorySyncTransport(backend));
    const store = new InMemoryLocalStore();

    const engine = new SyncEngine({
      transport: flaky,
      localStore: store,
      userId: 'user-1',
      deviceId: 'device-1',
      syncedPaths: ['core.theme'],
      retryIntervalMs: 30,
    });
    await engine.init();

    flaky.online = false;
    await store.set('core.theme', 'premium');
    await tick();
    expect(engine.getPendingPushPaths()).toHaveLength(1);

    flaky.online = true; // sem chamar retry manual
    await tick(60);
    expect(engine.getPendingPushPaths()).toHaveLength(0);

    engine.dispose();
  });
});

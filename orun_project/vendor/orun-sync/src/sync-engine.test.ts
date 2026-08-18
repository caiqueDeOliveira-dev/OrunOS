import { describe, it, expect } from 'vitest';
import { SyncEngine } from './sync-engine';
import { InMemorySyncTransport } from './test-helpers/in-memory-transport';
import { InMemoryLocalStore } from './test-helpers/in-memory-local-store';

function tick(ms = 10): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('SyncEngine — propagação básica', () => {
  it('mudança em um device propaga pro outro nos dois sentidos', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const userId = 'user-1';

    const desktopStore = new InMemoryLocalStore();
    const desktopEngine = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: desktopStore,
      userId,
      deviceId: 'device-desktop',
      syncedPaths: ['core.theme', 'core.locale'],
    });
    await desktopEngine.init();

    const mobileStore = new InMemoryLocalStore();
    const mobileEngine = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: mobileStore,
      userId,
      deviceId: 'device-mobile',
      syncedPaths: ['core.theme', 'core.locale'],
    });
    await mobileEngine.init();

    await desktopStore.set('core.theme', 'dark');
    await tick();
    expect(await mobileStore.get('core.theme')).toBe('dark');

    await mobileStore.set('core.locale', 'en-US');
    await tick();
    expect(await desktopStore.get('core.locale')).toBe('en-US');

    // eco não deveria causar loop/exceção — se causasse, o teste acima já teria travado
    expect(await desktopStore.get('core.theme')).toBe(await mobileStore.get('core.theme'));

    desktopEngine.dispose();
    mobileEngine.dispose();
  });
});

describe('SyncEngine — conflito real (merge manual)', () => {
  it('detecta conflito quando dois devices mudam o mesmo path antes de sincronizar', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const userId = 'user-1';

    const storeA = new InMemoryLocalStore();
    await storeA.set('core.theme', 'blood-red');
    const engineA = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: storeA,
      userId,
      deviceId: 'device-a',
      syncedPaths: ['core.theme'],
    });

    const storeB = new InMemoryLocalStore();
    await storeB.set('core.theme', 'blood-red');
    const engineB = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: storeB,
      userId,
      deviceId: 'device-b',
      syncedPaths: ['core.theme'],
    });

    await engineA.init();
    await engineB.init();
    await tick();

    // dispara as duas escritas locais ANTES de dar chance do event loop
    // propagar uma pra outra, senão o conflito nunca acontece de verdade
    const pA = storeA.set('core.theme', 'dark');
    const pB = storeB.set('core.theme', 'premium');
    await Promise.all([pA, pB]);
    await tick(20);

    const conflicts = engineB.getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.path).toBe('core.theme');
    expect(conflicts[0]?.localValue).toBe('premium');
    expect(conflicts[0]?.remoteValue).toBe('dark');

    // merge manual: valor local NÃO é sobrescrito automaticamente
    expect(await storeB.get('core.theme')).toBe('premium');

    await engineB.resolveConflict('core.theme', 'keep-remote');
    expect(await storeB.get('core.theme')).toBe('dark');
    expect(engineB.getConflicts()).toHaveLength(0);

    engineA.dispose();
    engineB.dispose();
  });
});

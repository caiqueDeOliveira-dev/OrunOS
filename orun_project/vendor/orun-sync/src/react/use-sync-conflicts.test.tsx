import { describe, it, expect } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { SyncEngine } from '../sync-engine';
import { InMemorySyncTransport } from '../test-helpers/in-memory-transport';
import { InMemoryLocalStore } from '../test-helpers/in-memory-local-store';
import { SyncProvider } from './sync-provider';
import { useSyncConflicts } from './use-sync-conflicts';

function tick(ms = 20): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ConflictReader({ onRender }: { onRender: (v: ReturnType<typeof useSyncConflicts>) => void }) {
  const result = useSyncConflicts();
  onRender(result);
  return null;
}

describe('useSyncConflicts', () => {
  it('reflete conflitos detectados pelo engine e resolve de verdade', async () => {
    const backend = InMemorySyncTransport.createSharedBackend();
    const storeA = new InMemoryLocalStore();
    await storeA.set('core.theme', 'blood-red');
    const storeB = new InMemoryLocalStore();
    await storeB.set('core.theme', 'blood-red');

    const engineA = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: storeA,
      userId: 'user-1',
      deviceId: 'device-a',
      syncedPaths: ['core.theme'],
    });
    const engineB = new SyncEngine({
      transport: new InMemorySyncTransport(backend),
      localStore: storeB,
      userId: 'user-1',
      deviceId: 'device-b',
      syncedPaths: ['core.theme'],
    });

    const renders: Array<ReturnType<typeof useSyncConflicts>> = [];
    const last = () => renders[renders.length - 1];

    await act(async () => {
      create(
        React.createElement(SyncProvider, {
          engine: engineB,
          children: React.createElement(ConflictReader, { onRender: (v) => renders.push(v) }),
        })
      );
    });
    await act(async () => {
      await tick();
    });
    await act(async () => {
      await engineA.init();
    });
    await act(async () => {
      await tick();
    });

    expect(last().conflicts).toHaveLength(0);

    // gera conflito real: A e B mudam ao mesmo tempo
    await act(async () => {
      const pA = storeA.set('core.theme', 'dark');
      const pB = storeB.set('core.theme', 'premium');
      await Promise.all([pA, pB]);
      await tick(30);
    });

    expect(last().conflicts).toHaveLength(1);
    expect(last().conflicts[0]?.localValue).toBe('premium');

    await act(async () => {
      await last().resolveConflict('core.theme', 'keep-remote');
      await tick();
    });

    expect(last().conflicts).toHaveLength(0);
    expect(await storeB.get('core.theme')).toBe('dark');

    engineA.dispose();
    engineB.dispose();
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { InMemorySettingsStore, InMemorySecretStore } from './test-helpers/in-memory-store';

describe('BaseSettingsStore', () => {
  let store: InMemorySettingsStore;
  let secretStore: InMemorySecretStore;

  beforeAll(async () => {
    secretStore = new InMemorySecretStore();
    store = new InMemorySettingsStore(secretStore);
    await store.init();
  });

  it('default de core.theme é blood-red', async () => {
    expect(await store.get('core.theme')).toBe('blood-red');
  });

  it('set/get de core.theme funciona', async () => {
    await store.set('core.theme', 'dark');
    expect(await store.get('core.theme')).toBe('dark');
  });

  it('set com valor inválido lança erro e não muda o valor', async () => {
    await expect(store.set('core.theme', 'not-a-real-theme')).rejects.toThrow();
    expect(await store.get('core.theme')).toBe('dark');
  });

  it('set em path profundo preserva os irmãos', async () => {
    await store.set('desktop.windowBounds.width', 1600);
    const bounds = await store.get<{ width: number; height: number }>('desktop.windowBounds');
    expect(bounds.width).toBe(1600);
    expect(bounds.height).toBe(800);
  });

  it('listener de path exato dispara com o valor certo', async () => {
    let exactFired = false;
    const unsub = store.subscribe('core.locale', (newVal) => {
      exactFired = newVal === 'en-US';
    });
    await store.set('core.locale', 'en-US');
    expect(exactFired).toBe(true);
    unsub();
  });

  it('listener de namespace pai dispara quando um filho muda', async () => {
    let parentFired = false;
    store.subscribe('core', () => {
      parentFired = true;
    });
    await store.set('core.theme', 'premium');
    expect(parentFired).toBe(true);
  });

  it('listener não dispara mais depois de unsubscribe', async () => {
    let fired = false;
    const unsub = store.subscribe('core.theme', () => {
      fired = true;
    });
    unsub();
    await store.set('core.theme', 'minimal');
    expect(fired).toBe(false);
  });

  it('scope map: windowBounds é device, sidebarCollapsed é account', () => {
    expect(store.getScope('desktop.windowBounds')).toBe('device');
    expect(store.getScope('desktop.sidebarCollapsed')).toBe('account');
  });

  it('campo secreto: valor real vai pro secretStore, blob guarda só placeholder', async () => {
    await store.set('homelab.homeAssistantToken', 'super-secret-token-123');

    expect(await store.get<string>('homelab.homeAssistantToken')).toBe('super-secret-token-123');

    const rawBlob = await store.getAll();
    expect(rawBlob.homelab.homeAssistantToken).toBe('••••••••');

    expect(await secretStore.getSecret('homelab.homeAssistantToken')).toBe('super-secret-token-123');
  });

  it('reset de um path único volta ao default', async () => {
    await store.reset('core.theme');
    expect(await store.get('core.theme')).toBe('blood-red');
  });

  it('reset total volta tudo ao default', async () => {
    await store.set('core.locale', 'es-ES');
    await store.reset();
    expect(await store.get('core.locale')).toBe('pt-BR');
  });

  it('getScope de path desconhecido falha explicitamente (fail fast)', () => {
    expect(() => store.getScope('core.nonexistent.path')).toThrow();
  });
});

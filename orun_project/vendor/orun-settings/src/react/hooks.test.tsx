import { describe, it, expect } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { InMemorySettingsStore } from '../test-helpers/in-memory-store';
import { SettingsProvider } from './settings-provider';
import { useSetting } from './use-setting';
import { useResetSetting } from './use-reset-setting';

function tick(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ThemeReader({ onRender }: { onRender: (v: { value: unknown; loading: boolean }) => void }) {
  const { value, loading } = useSetting<string>('core.theme');
  onRender({ value, loading });
  return null;
}

function ThemeWriter({ triggerRef }: { triggerRef: { current: ((v: string) => Promise<void>) | null } }) {
  const { setValue } = useSetting<string>('core.theme');
  triggerRef.current = setValue;
  return null;
}

function ResetButton({ triggerRef }: { triggerRef: { current: (() => Promise<void>) | null } }) {
  const reset = useResetSetting('core.theme');
  triggerRef.current = reset;
  return null;
}

describe('useSetting / SettingsProvider', () => {
  it('carrega o default, reage a mudanças externas, setValue e reset funcionam', async () => {
    const store = new InMemorySettingsStore();
    const renders: Array<{ value: unknown; loading: boolean }> = [];
    const last = () => renders[renders.length - 1];

    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        React.createElement(SettingsProvider, {
          store,
          fallback: React.createElement('span', null, 'loading'),
          children: React.createElement(ThemeReader, { onRender: (v) => renders.push(v) }),
        })
      );
    });
    await act(async () => {
      await tick();
    });

    expect(last().loading).toBe(false);
    expect(last().value).toBe('blood-red');

    // mudança feita direto na store (fora do React) deve refletir no hook via subscribe
    await act(async () => {
      await store.set('core.theme', 'dark');
    });
    expect(last().value).toBe('dark');

    // setValue do próprio hook
    const writerTrigger: { current: ((v: string) => Promise<void>) | null } = { current: null };
    await act(async () => {
      renderer.update(
        React.createElement(SettingsProvider, {
          store,
          children: [
            React.createElement(ThemeReader, { key: 'r', onRender: (v) => renders.push(v) }),
            React.createElement(ThemeWriter, { key: 'w', triggerRef: writerTrigger }),
          ],
        })
      );
    });
    await act(async () => {
      await tick();
    });
    await act(async () => {
      await writerTrigger.current!('premium');
    });
    expect(last().value).toBe('premium');

    // useResetSetting
    const resetTrigger: { current: (() => Promise<void>) | null } = { current: null };
    await act(async () => {
      renderer.update(
        React.createElement(SettingsProvider, {
          store,
          children: [
            React.createElement(ThemeReader, { key: 'r', onRender: (v) => renders.push(v) }),
            React.createElement(ResetButton, { key: 'x', triggerRef: resetTrigger }),
          ],
        })
      );
    });
    await act(async () => {
      await tick();
    });
    await act(async () => {
      await resetTrigger.current!();
    });
    expect(last().value).toBe('blood-red');
  });

  it('useSetting fora de <SettingsProvider> lança erro explícito', async () => {
    let threw = false;
    const BareReader = () => {
      try {
        useSetting('core.theme');
      } catch {
        threw = true;
      }
      return null;
    };
    await act(async () => {
      create(React.createElement(BareReader));
    });
    expect(threw).toBe(true);
  });
});

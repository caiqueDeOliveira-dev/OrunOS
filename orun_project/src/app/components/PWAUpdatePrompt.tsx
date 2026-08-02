import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
      <span className="text-sm">Nova versão disponível</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        Atualizar
      </button>
    </div>
  );
}

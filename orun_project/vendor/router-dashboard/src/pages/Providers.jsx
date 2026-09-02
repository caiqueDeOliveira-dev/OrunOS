import React, { useEffect, useState, useCallback } from "react";
import { api, providerMeta, tierColor } from "../lib/api";
import { Card, SectionTitle, LoadingState, EmptyState, Spinner, TierBadge } from "../components/ui";

export default function Providers({ onNavigate }) {
  const [providers, setProviders] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api
      .listProviders()
      .then((l) => {
        setProviders(l || []);
      })
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (providers === null) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-semibold tracking-tight">Providers</h1>
          <p className="text-sm text-orun-textSecondary mt-0.5">
            Escolha um provider pre-pronto e adicione a sua API key. Providers com modelo gratuito ficam
            separados dos que sao so pagos.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Provider"}
        </button>
      </div>

      {(showForm || editing) && (
        <ProviderForm
          initial={editing}
          onDone={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
        />
      )}

      <Card padding="none">
        <div className="px-4 py-3 border-b border-orun-border">
          <SectionTitle>Configured Providers</SectionTitle>
        </div>
        <div className="p-2">
          {providers.length === 0 ? (
            <EmptyState>Nenhum provider configurado. Clique em Add Provider para escolher um.</EmptyState>
          ) : (
            providers.map((p) => {
              const meta = providerMeta(p.providerId);
              return (
                <div
                  key={p.providerId}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-semibold text-sm text-black shrink-0"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orun-text font-medium">{meta.label}</span>
                      <span className={`text-2xs font-mono ${tierColor(meta.tier)}`}>{meta.tier}</span>
                      {p.enabled && <TierBadge tier="free" />}
                    </div>
                    <div className="text-2xs text-orun-muted font-mono mt-0.5 flex items-center gap-3">
                      <span>{p.providerId}</span>
                      {p.hasCredential !== undefined && (
                        <span className={p.hasCredential ? "text-orun-success" : "text-orun-warning"}>
                          {p.hasCredential ? "key configured" : "no key"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {meta.url && (
                      <a
                        href={meta.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Abrir ${meta.label} e pegar a API key`}
                        className="px-2.5 py-1 rounded-md text-2xs font-mono text-orun-info hover:bg-orun-infoMuted border border-orun-border hover:border-orun-borderHover transition-colors"
                      >
                        site ↗
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setEditing(providers.find((x) => x.providerId === p.providerId));
                        setShowForm(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-2xs font-mono text-orun-textSecondary hover:text-orun-text border border-orun-border hover:border-orun-borderHover transition-colors"
                    >
                      Key
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Remover provider ${meta.label}?`)) {
                          try {
                            await api.deleteProvider(p.providerId);
                            load();
                          } catch (e) {
                            alert(e.message);
                          }
                        }
                      }}
                      className="px-2.5 py-1 rounded-md text-2xs font-mono text-orun-error hover:bg-orun-error/20 border border-orun-border transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function groupProviders(catalog) {
  if (!catalog) return { free: [], paid: [] };
  const free = [];
  const paid = [];
  for (const pid of Object.keys(catalog)) {
    const models = catalog[pid] || [];
    const hasFree = models.some((m) => m.tier === "free" || m.tier === "local");
    (hasFree ? free : paid).push(pid);
  }
  return { free, paid };
}

function ProviderForm({ initial, onDone }) {
  const [catalog, setCatalog] = useState(null);
  const [providerId, setProviderId] = useState(initial?.providerId ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [keys, setKeys] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);

  const setKey = (idx, v) => setKeys((ks) => ks.map((k, i) => (i === idx ? v : k)));

  useEffect(() => {
    api.listModels().then((r) => setCatalog(r.catalog || {})).catch(() => setCatalog({}));
  }, []);

  const groups = groupProviders(catalog);
  const meta = providerMeta(providerId);
  const haveFree = catalog && providerId
    ? (catalog[providerId] || []).some((m) => m.tier === "free" || m.tier === "local")
    : false;

  async function submit(e) {
    e.preventDefault();
    if (!providerId) {
      alert("Escolha um provider.");
      return;
    }
    setSaving(true);
    try {
      const slots = [
        { accountLabel: "default", key: keys[0] },
        { accountLabel: "key2", key: keys[1] },
        { accountLabel: "key3", key: keys[2] },
      ];
      const filled = slots.filter((s) => s.key && s.key.trim());
      if (filled.length === 0 && !initial) {
        alert("Cole pelo menos uma chave da API.");
        return;
      }
      for (const s of filled) {
        await api.createProvider({ providerId, accountLabel: s.accountLabel, enabled });
        await api.setProviderCredential(providerId, { apiKey: s.key, accountLabel: s.accountLabel });
      }
      if (filled.length === 0) {
        await api.updateProvider(initial.providerId, { ...initial, enabled });
      }
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <SectionTitle>{initial ? `Edit: ${meta.label}` : "Add Provider"}</SectionTitle>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Provider"
            hint="Providers pre-prontos — gratuitos separados dos pagos."
          >
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={!!initial}
              className="w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text focus:border-orun-accent outline-none disabled:opacity-50"
            >
              <option value="">Selecione o provider</option>
              {groups.free.length > 0 && (
                <optgroup label="Tem modelo GRATIS">
                  {groups.free.map((pid) => {
                    const m = providerMeta(pid);
                    return (
                      <option key={pid} value={pid}>
                        {m.label} — {pid}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {groups.paid.length > 0 && (
                <optgroup label="So pago">
                  {groups.paid.map((pid) => {
                    const m = providerMeta(pid);
                    return (
                      <option key={pid} value={pid}>
                        {m.label} — {pid}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="Enabled">
            <label className="flex items-center gap-2 text-sm text-orun-textSecondary py-2 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-orun-accent" />
              Ativo
            </label>
          </Field>
        </div>

        {providerId && (
          <div className="rounded-lg border border-orun-border bg-orun-bg/40 px-3 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center font-display font-semibold text-xs text-black shrink-0"
                style={{ backgroundColor: meta.color }}
              >
                {meta.label[0]}
              </div>
              <span className="text-sm text-orun-text font-medium">{meta.label}</span>
              <span className={`text-2xs font-mono ${tierColor(meta.tier)}`}>{meta.tier}</span>
              {haveFree ? (
                <span className="text-2xs font-mono text-orun-success">possui modelo grátis</span>
              ) : (
                <span className="text-2xs font-mono text-orun-warning">só pago</span>
              )}
            </div>
            {meta.url && (
              <a
                href={meta.url}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-2xs font-mono text-orun-info hover:bg-orun-infoMuted border border-orun-border hover:border-orun-borderHover transition-colors shrink-0"
              >
                Abrir {meta.label} e pegar API key ↗
              </a>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">API Keys (ate 3)</span>
            <span className="block text-2xs text-orun-muted mt-0.5">
              Adicione ate 3 chaves por provider. Quando uma chave estourar o token/quota (429), o router troca
              automaticamente para a proxima.
            </span>
          </div>
          {[
            { idx: 0, label: "Chave 1", sub: "principal" },
            { idx: 1, label: "Chave 2", sub: "fallback" },
            { idx: 2, label: "Chave 3", sub: "fallback" },
          ].map((slot) => (
            <Field key={slot.idx} label={`${slot.label} — ${slot.sub}`}>
              <input
                type="password"
                value={keys[slot.idx]}
                onChange={(e) => setKey(slot.idx, e.target.value)}
                placeholder="sk-..."
                className="w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none font-mono"
              />
            </Field>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {providerId && !haveFree && (
            <p className="text-2xs text-orun-warning">
              Este provider nao tem modelo gratuito no catalogo — o uso sera cobrado no plano pago.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Spinner size="sm" /> : null}
            {initial ? "Save" : "Add Provider"}
          </button>
          {initial?.hasCredential && (
            <button
              type="button"
              onClick={async () => {
                if (confirm("Remover a chave da API deste provider?")) {
                  await api.deleteProviderCredential(initial.providerId);
                  onDone();
                }
              }}
              className="px-3 py-2 rounded-lg text-2xs font-mono text-orun-error hover:bg-orun-error/20 border border-orun-border transition-colors"
            >
              Remove key
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">{label}</span>
      {hint && <span className="block text-2xs text-orun-muted mt-0.5 mb-1.5">{hint}</span>}
      {!hint && <span className="block h-1.5" />}
      {children}
    </label>
  );
}

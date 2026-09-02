import React, { useEffect, useState, useCallback } from "react";
import { api, providerMeta, tierColor } from "../lib/api";
import { Card, SectionTitle, LoadingState, EmptyState, Spinner, TierBadge } from "../components/ui";

export default function Combos({ onNavigate }) {
  const [combos, setCombos] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api
      .listCombos()
      .then((l) => setCombos(l || []))
      .catch(() => setCombos([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (combos === null) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-semibold tracking-tight">Combos</h1>
          <p className="text-sm text-orun-textSecondary mt-0.5">
            Um combo e uma sequencia de steps. Cada step = um provider + 1 ou mais modelos (fallback).
          </p>
        </div>
        <button
          onClick={() => {
            setCreating((v) => !v);
            setEditing(null);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors"
        >
          {creating ? "Cancel" : "+ New Combo"}
        </button>
      </div>

      {creating && (
        <ComboEditor
          key="new"
          combo={null}
          onDone={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <ComboEditor
          key={editing.id}
          combo={editing}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {combos.length === 0 ? (
          <div className="col-span-full">
            <EmptyState>Nenhum combo. Crie o primeiro para comecar a rotear.</EmptyState>
          </div>
        ) : (
          combos.map((c) => (
            <ComboCard
              key={c.id}
              combo={c}
              onEdit={() => {
                setEditing(c);
                setCreating(false);
              }}
              onDeleted={load}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ComboCard({ combo, onEdit, onDeleted }) {
  const meta = (id) => providerMeta(id);
  return (
    <Card glow>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-orun-text">{combo.id}</span>
          {combo.isSystemDefault && (
            <span className="px-1.5 py-0.5 rounded text-2xs font-mono uppercase tracking-wider bg-orun-accentMuted text-orun-accent">
              default
            </span>
          )}
          {combo.kind === "media" && (
            <span className="px-1.5 py-0.5 rounded text-2xs font-mono uppercase tracking-wider bg-orun-infoMuted text-orun-info">
              media
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="px-2.5 py-1 rounded-md text-2xs font-mono text-orun-accent hover:bg-orun-accentMuted transition-colors"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              if (confirm(`Apagar combo ${combo.id}?`)) {
                await api.deleteCombo(combo.id);
                onDeleted();
              }
            }}
            className="px-2.5 py-1 rounded-md text-2xs font-mono text-orun-error hover:bg-orun-error/20 transition-colors"
          >
            Del
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {combo.steps.map((step, si) => {
          const m = meta(step.providerId);
          const models = step.models?.length ? step.models : step.model ? [step.model] : [];
          return (
            <div key={si} className="rounded-lg border border-orun-border bg-orun-bg/40 p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-2xs font-mono text-orun-muted">STEP {si + 1}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-xs font-medium text-orun-text">{m.label}</span>
                <span className={`text-2xs font-mono ${tierColor(m.tier)}`}>{m.tier}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {models.map((mdl, mi) => (
                  <span
                    key={mi}
                    className="px-1.5 py-0.5 rounded border border-orun-border text-2xs font-mono text-orun-textSecondary bg-orun-card"
                  >
                    {mdl}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-2xs text-orun-muted font-mono">
                {combo.rtkEnabled && <span>RTK</span>}
                {combo.cacheEnabled && <span>cache</span>}
                <span>{step.maxRetries ?? 1} retry</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ComboEditor({ combo, onDone }) {
  const [id, setId] = useState(combo?.id ?? "");
  const [kind, setKind] = useState(combo?.kind ?? "text");
  const [rtkEnabled, setRtkEnabled] = useState(combo?.rtkEnabled ?? false);
  const [cacheEnabled, setCacheEnabled] = useState(combo?.cacheEnabled ?? false);
  const [isSystemDefault, setIsSystemDefault] = useState(combo?.isSystemDefault ?? false);
  const [modelCatalog, setModelCatalog] = useState(null);
  const [steps, setSteps] = useState(
    combo?.steps?.map((s) => ({
      providerId: s.providerId,
      models: s.models?.length ? [...s.models] : s.model ? [s.model] : [],
      accountLabel: s.accountLabel ?? "",
      maxRetries: s.maxRetries ?? 1,
    })) ?? [{ providerId: "", models: [], accountLabel: "", maxRetries: 1 }]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listModels().then((r) => setModelCatalog(r.catalog || {}));
  }, []);

  function updateStep(i, patch) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { providerId: "", models: [], accountLabel: "", maxRetries: 1 }]);
  }

  function removeStep(i) {
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanSteps = steps.map((s) => ({
        providerId: s.providerId,
        models: s.models,
        ...(s.accountLabel ? { accountLabel: s.accountLabel } : {}),
        ...(s.maxRetries > 1 ? { maxRetries: s.maxRetries } : {}),
      }));
      const payload = { id, name: id, kind, rtkEnabled, cacheEnabled, isSystemDefault, steps: cleanSteps };
      if (combo) await api.updateCombo(combo.id, payload);
      else await api.saveCombo(payload);
      onDone();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (modelCatalog === null) return <LoadingState />;

  return (
    <Card>
      <SectionTitle>{combo ? `Edit: ${combo.id}` : "New Combo"}</SectionTitle>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-mono text-orun-textSecondary uppercase tracking-wider">Combo ID</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              disabled={!!combo}
              placeholder="meu-combo"
              className="mt-1.5 w-full bg-orun-bg border border-orun-border rounded-lg px-3 py-2 text-sm text-orun-text placeholder:text-orun-muted focus:border-orun-accent outline-none disabled:opacity-50"
            />
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-5 py-2">
              <label className="flex items-center gap-2 text-sm text-orun-textSecondary cursor-pointer">
                <input type="checkbox" checked={rtkEnabled} onChange={(e) => setRtkEnabled(e.target.checked)} className="accent-orun-accent" />
                RTK (token saver)
              </label>
              <label className="flex items-center gap-2 text-sm text-orun-textSecondary cursor-pointer">
                <input type="checkbox" checked={cacheEnabled} onChange={(e) => setCacheEnabled(e.target.checked)} className="accent-orun-accent" />
                Cache
              </label>
              <label className="flex items-center gap-2 text-sm text-orun-textSecondary cursor-pointer">
                <input type="checkbox" checked={isSystemDefault} onChange={(e) => setIsSystemDefault(e.target.checked)} className="accent-orun-accent" />
                Default
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, si) => (
            <StepEditor
              key={si}
              index={si}
              step={step}
              catalog={modelCatalog}
              onChange={(patch) => updateStep(si, patch)}
              onRemove={() => removeStep(si)}
              canRemove={steps.length > 1}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addStep}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-orun-accent border border-orun-accent/30 hover:bg-orun-accentMuted transition-colors"
          >
            + Add step
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-orun-accent text-white hover:bg-orun-accentHover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Spinner size="sm" /> : null}
            {combo ? "Save Combo" : "Create Combo"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function StepEditor({ index, step, catalog, onChange, onRemove, canRemove }) {
  const modelsForProvider = catalog[step.providerId] ?? [];
  const tierByModel = (id) => {
    const found = modelsForProvider.find((m) => m.id === id);
    return found?.tier ?? "paid";
  };

  function toggleModel(modelId) {
    const tier = tierByModel(modelId);
    const exists = step.models.includes(modelId);
    let next;
    if (exists) next = step.models.filter((m) => m !== modelId);
    else next = [...step.models, modelId];
    onChange({ models: next });
    void tier;
  }

  function moveModel(from, dir) {
    const arr = [...step.models];
    const to = from + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[from], arr[to]] = [arr[to], arr[from]];
    onChange({ models: arr });
  }

  return (
    <div className="rounded-xl border border-orun-border bg-orun-bg/40 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xs font-mono text-orun-muted uppercase tracking-wider">Step {index + 1}</span>
        <select
          value={step.providerId}
          onChange={(e) => {
            onChange({ providerId: e.target.value, models: [] });
          }}
          className="bg-orun-card border border-orun-border rounded-lg px-2 py-1.5 text-xs text-orun-text focus:border-orun-accent outline-none"
        >
          <option value="">Selecione o provider</option>
          {Object.entries(catalog).map(([pid]) => {
            const m = providerMeta(pid);
            return (
              <option key={pid} value={pid}>
                {m.label} ({pid})
              </option>
            );
          })}
        </select>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto px-2 py-1 rounded text-2xs font-mono text-orun-error hover:bg-orun-error/20 transition-colors"
          >
            remove
          </button>
        )}
      </div>

      {!step.providerId ? (
        <p className="text-2xs text-orun-muted">Escolha um provider para ver os modelos.</p>
      ) : (
        <>
          <div className="mb-2 text-2xs font-mono text-orun-textSecondary uppercase tracking-wider">
            Modelos selecionados ({step.models.length})
          </div>
          {step.models.length === 0 ? (
            <p className="text-2xs text-orun-muted mb-3">Nenhum modelo. Adicione abaixo os modelos para fallback dentro deste provider.</p>
          ) : (
            <div className="flex flex-col gap-1.5 mb-3">
              {step.models.map((mdl, mi) => (
                <div key={mdl} className="flex items-center gap-2 bg-orun-card rounded-lg border border-orun-border px-2.5 py-1.5">
                  <span className="text-2xs font-mono text-orun-muted w-4">{mi + 1}</span>
                  <span className="text-xs font-mono text-orun-text flex-1">{mdl}</span>
                  <ModelTier id={mdl} tier={tierByModel(mdl)} />
                  <button
                    type="button"
                    onClick={() => moveModel(mi, -1)}
                    disabled={mi === 0}
                    className="text-orun-muted hover:text-orun-text disabled:opacity-30 px-1"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveModel(mi, 1)}
                    disabled={mi === step.models.length - 1}
                    className="text-orun-muted hover:text-orun-text disabled:opacity-30 px-1"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleModel(mdl)}
                    className="text-orun-error hover:bg-orun-error/20 rounded px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-1.5 text-2xs font-mono text-orun-textSecondary uppercase tracking-wider">
            Todos os modelos — adicione quantos quiser
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {modelsForProvider.length === 0 ? (
              <p className="text-2xs text-orun-muted col-span-full">Sem modelos no catalogo para este provider.</p>
            ) : (
              modelsForProvider.map((m) => {
                const selected = step.models.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleModel(m.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? "border-orun-accent/50 bg-orun-accentMuted"
                        : "border-orun-border hover:border-orun-borderHover bg-orun-card"
                    }`}
                  >
                    <span className="text-2xs font-mono text-orun-text truncate">{m.id}</span>
                    <ModelTier id={m.id} tier={m.tier} />
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ModelTier({ id, tier }) {
  const color = tier === "free" || tier === "local" ? "text-orun-success" : tier === "freemium" ? "text-orun-info" : "text-orun-warning";
  const badge = tier === "free" || tier === "local" ? "FREE" : tier === "freemium" ? "FREEMIUM" : "PAID";
  return (
    <span className={`text-2xs font-mono font-bold ${color} shrink-0`} title={id}>
      {badge}
    </span>
  );
}

import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, RefreshCw, Trash2, ShieldCheck, Server } from "lucide-react";
import { isElectron } from "../constants";
import { useTranslation } from "../../i18n/I18nProvider";
import type { OrunRouterCombo, OrunRouterProvider } from "../../types/orun";

const ROUTER_URL = "http://localhost:4321/dashboard";

const TIER_LABEL: Record<string, string> = {
  free: "Grátis",
  paid: "Pago",
  subscription: "Assinatura",
};

const AUTH_LABEL: Record<string, string> = {
  none: "sem chave",
  "api-key": "API key",
  oauth: "OAuth",
};

type Tab = "providers" | "combos";

const TIER_COLOR: Record<string, string> = {
  free: "#2ecc71",
  paid: "#f39c12",
  subscription: "#3498db",
};

export function AiRouterPanel({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("providers");
  const [providers, setProviders] = useState<OrunRouterProvider[] | null>(null);
  const [combos, setCombos] = useState<OrunRouterCombo[] | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [httpRunning, setHttpRunning] = useState(false);

  const reload = async () => {
    if (!window.orun?.aiRouter) return;
    const [provs, comboList, http] = await Promise.all([
      window.orun.aiRouter.listProviders(),
      window.orun.aiRouter.listCombos(),
      window.orun.aiRouter.httpStatus(),
    ]);
    setProviders(provs);
    setCombos(comboList);
    setHttpRunning(!!http?.running);
  };

  useEffect(() => {
    reload().catch((e) => setError(e?.message || "Falha ao carregar o router"));
  }, []);

  if (!isElectron || !window.orun?.aiRouter) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="w-[420px] rounded-2xl border p-6 text-center" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterNotElectron")}</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 rounded-lg text-[10px]" style={{ background: "#C00018", color: "#fff" }}>
            {t("aiRouterBack")}
          </button>
        </div>
      </div>
    );
  }

  const openDashboard = () => {
    if (window.orun?.shell?.openExternal) window.orun.shell.openExternal(ROUTER_URL);
    else window.open(ROUTER_URL, "_blank");
  };

  const saveKey = async (provider: OrunRouterProvider) => {
    const value = (keys[provider.id] || "").trim();
    if (!value) return;
    setError(null);
    setSaving((s) => ({ ...s, [provider.id]: true }));
    try {
      if (provider.authMethod === "api-key" && window.orun.settings?.validateApiKey) {
        const v = await window.orun.settings.validateApiKey(provider.id, value);
        if (v && v.valid === false && v.statusCode && v.statusCode >= 400) {
          setError(`Chave de ${provider.label} rejeitada (HTTP ${v.statusCode}). Verifique e tente de novo.`);
          setSaving((s) => ({ ...s, [provider.id]: false }));
          return;
        }
      }
      await window.orun.settings.setProviderKey(provider.id, 1, value);
      setKeys((k) => ({ ...k, [provider.id]: "" }));
      await reload();
    } catch (e) {
      setError(`Falha ao salvar chave: ${(e as Error)?.message || e}`);
    } finally {
      setSaving((s) => ({ ...s, [provider.id]: false }));
    }
  };

  const deleteKey = async (provider: OrunRouterProvider) => {
    setError(null);
    try {
      const count = await window.orun.settings.providerKeyCount(provider.id);
      for (let i = 1; i <= count; i++) await window.orun.settings.deleteProviderKey(provider.id, i);
      await reload();
    } catch (e) {
      setError(`Falha ao remover chave: ${(e as Error)?.message || e}`);
    }
  };

  const isFreeNoAuth = (p: OrunRouterProvider) => p.authMethod === "none";
  const hasKey = (p: OrunRouterProvider) => p.hasKey;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-[560px] max-h-[86vh] overflow-hidden rounded-2xl border flex flex-col"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* header */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <button onClick={onBack} style={{ color: "var(--muted-foreground)" }} className="hover:opacity-80">←</button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm tracking-widest uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>
                {t("aiRouterTitle")}
              </span>
              {httpRunning ? (
                <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(46,204,113,0.12)", color: "#2ecc71", fontFamily: "'JetBrains Mono', monospace" }}>
                  <Server size={9} /> on
                </span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                  server off
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t("aiRouterDescription")}</p>
          </div>
          <button onClick={onClose} className="text-[10px] hover:opacity-80" style={{ color: "var(--muted-foreground)" }}>✕</button>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 px-5 pt-1">
          {(["providers", "combos"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className="px-3 py-1.5 rounded-lg text-[10px] tracking-wide uppercase transition-colors"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: tab === tb ? "#C00018" : "transparent",
                color: tab === tb ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {tb === "providers" ? "Providers · Tokens" : "Combos"}
            </button>
          ))}
          <button onClick={reload} className="ml-auto p-1.5 rounded-lg hover:opacity-80" style={{ color: "var(--muted-foreground)" }} title="Recarregar">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg text-[10px]" style={{ background: "rgba(192,0,24,0.12)", color: "#ff6b6b" }}>
              {error}
            </div>
          )}

          {tab === "providers" && (
            <div className="space-y-2">
              {providers === null && (
                <p className="text-[10px] py-6 text-center" style={{ color: "var(--muted-foreground)" }}>Carregando providers…</p>
              )}
              {providers?.map((p) => {
                const locked = hasKey(p) || isFreeNoAuth(p);
                return (
                  <div key={p.id} className="rounded-xl border p-3" style={{ borderColor: p.hasKey ? "rgba(46,204,113,0.35)" : "var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{p.label}</span>
                      {p.hasKey && <ShieldCheck size={11} style={{ color: "#2ecc71" }} />}
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${TIER_COLOR[p.tier]}1f`, color: TIER_COLOR[p.tier] }}>
                        {TIER_LABEL[p.tier] || p.tier}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)" }}>
                        {AUTH_LABEL[p.authMethod] || p.authMethod}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.baseUrl || p.id}
                      {p.configured ? ` · ${p.configModelCount} modelos` : ""}
                    </div>

                    {isFreeNoAuth(p) ? (
                      <div className="mt-2 text-[10px]" style={{ color: "#2ecc71" }}>
                        Provider gratuito — roda sem chave (local/free-tier).
                      </div>
                    ) : p.authMethod === "oauth" ? (
                      <div className="mt-2 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        {hasKey(p) ? "Chave via OAuth conectada." : "Autenticação via OAuth (use o dashboard para conectar)."}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="password"
                          placeholder={hasKey(p) ? p.keyMasked || "chave já configurada" : `Insira a API key ${p.label}`}
                          value={keys[p.id] || ""}
                          onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                          className="flex-1 px-3 py-1.5 rounded-lg text-[10px] outline-none"
                          style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
                          onKeyDown={(e) => { if (e.key === "Enter") saveKey(p); }}
                        />
                        {hasKey(p) ? (
                          <>
                            <button
                              onClick={() => deleteKey(p)}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] hover:opacity-80 flex items-center gap-1"
                              style={{ background: "rgba(192,0,24,0.15)", color: "#ff6b6b" }}
                              title="Remover chave"
                            >
                              <Trash2 size={11} /> Remover
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => saveKey(p)}
                            disabled={saving[p.id] || !(keys[p.id] || "").trim()}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 flex items-center gap-1"
                            style={{ background: "#C00018", color: "#fff" }}
                          >
                            <KeyRound size={11} /> {saving[p.id] ? "Salvando…" : "Salvar"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {providers && providers.length === 0 && (
                <p className="text-[10px] py-6 text-center" style={{ color: "var(--muted-foreground)" }}>Nenhum provider no registry.</p>
              )}
            </div>
          )}

          {tab === "combos" && (
            <div className="space-y-2">
              {combos === null && (
                <p className="text-[10px] py-6 text-center" style={{ color: "var(--muted-foreground)" }}>Carregando combos…</p>
              )}
              {combos?.map((c) => (
                <div key={c.id} className="rounded-xl border p-3" style={{ borderColor: c.isSystemDefault ? "rgba(192,0,24,0.5)" : "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{c.name}</span>
                    {(c.steps || []).map((s, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.providerId}
                      </span>
                    ))}
                    {c.isSystemDefault && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: "rgba(192,0,24,0.15)", color: "#ff6b6b" }}>
                        padrão
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {c.id}
                  </div>
                </div>
              ))}
              {combos && combos.length === 0 && (
                <p className="text-[10px] py-6 text-center" style={{ color: "var(--muted-foreground)" }}>Nenhum combo criado.</p>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <button
              onClick={openDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors"
              style={{ background: "#C00018", color: "#fff" }}
            >
              <ExternalLink size={12} />
              Abrir Dashboard
            </button>
            <span className="text-[9px] truncate" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
              {ROUTER_URL} · as chaves ficam no cofre local (slot ai-router.&lt;provider&gt;)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
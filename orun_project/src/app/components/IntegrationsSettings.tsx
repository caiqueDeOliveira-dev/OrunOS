import { useState, useEffect, useCallback } from "react";
import { Plug, Activity, Shield, DollarSign, Share2, Palette, Bookmark, Image, CheckCircle2, XCircle } from "lucide-react";
import { P } from "../plugins/workspaces/premium";

type IntegrationKey = "telemetry" | "shieldSecrets" | "finance" | "social" | "designSync" | "memoryVault" | "photos" | "instagramDirect" | "linkedinDirect";

interface IntegrationConfig {
  enabled: boolean;
  [field: string]: boolean | string;
}

interface IntegrationsState {
  telemetry: IntegrationConfig;
  shieldSecrets: IntegrationConfig;
  finance: IntegrationConfig;
  social: IntegrationConfig;
  designSync: IntegrationConfig;
  memoryVault: IntegrationConfig;
  photos: IntegrationConfig;
  instagramDirect: IntegrationConfig;
  linkedinDirect: IntegrationConfig;
}

interface FieldDef {
  name: string;
  label: string;
  type: "text" | "password" | "url";
}

interface ProviderDef {
  id: string;
  label: string;
  hint?: string;
  fields: FieldDef[];
  requiredFields: string[];
}

interface IntegrationDef {
  key: IntegrationKey;
  icon: React.ElementType;
  label: string;
  accent: string;
  fields: FieldDef[];
  requiredFields: string[];
  providers?: ProviderDef[];
}

const FINANCE_PROVIDERS: ProviderDef[] = [
  {
    id: "manual",
    label: "Manual",
    hint: "Sem fonte automática — metas e lançamentos vivem só na UI local.",
    fields: [],
    requiredFields: [],
  },
  {
    id: "actual-budget",
    label: "Actual Budget",
    hint: "Local-first, leitura + escrita. Roda Actual Budget local ou via servidor.",
    fields: [
      { name: "serverUrl", label: "Server URL", type: "url" },
      { name: "serverPassword", label: "Server Password", type: "password" },
      { name: "dataDir", label: "Data Directory", type: "text" },
    ],
    requiredFields: ["dataDir"],
  },
  {
    id: "pluggy",
    label: "Pluggy (Open Finance)",
    hint: "Read-only. Sincroniza bancos automaticamente via Open Finance.",
    fields: [
      { name: "clientId", label: "Client ID", type: "text" },
      { name: "clientSecret", label: "Client Secret", type: "password" },
      { name: "itemIds", label: "Item IDs (separados por vírgula)", type: "text" },
    ],
    requiredFields: ["clientId", "clientSecret"],
  },
];

const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "telemetry",
    icon: Activity,
    label: "Telemetry (PostHog)",
    accent: "#3B82F6",
    fields: [
      { name: "host", label: "Host", type: "url" },
      { name: "apiKey", label: "API Key", type: "password" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["host", "apiKey"],
  },
  {
    key: "shieldSecrets",
    icon: Shield,
    label: "Shield Secrets (Gitleaks)",
    accent: "#F59E0B",
    fields: [
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: [],
  },
  {
    key: "finance",
    icon: DollarSign,
    label: "Finance",
    accent: "#00D26A",
    fields: [
      { name: "provider", label: "Provider", type: "text" },
      { name: "serverUrl", label: "Server URL", type: "url" },
      { name: "serverPassword", label: "Server Password", type: "password" },
      { name: "dataDir", label: "Data Directory", type: "text" },
      { name: "clientId", label: "Client ID", type: "text" },
      { name: "clientSecret", label: "Client Secret", type: "password" },
      { name: "itemIds", label: "Item IDs", type: "text" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: [],
    providers: FINANCE_PROVIDERS,
  },
  {
    key: "social",
    icon: Share2,
    label: "Social (Postiz)",
    accent: "#E879F9",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url" },
      { name: "email", label: "Email", type: "text" },
      { name: "password", label: "Password", type: "password" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["baseUrl"],
  },
  {
    key: "instagramDirect",
    icon: Image,
    label: "Instagram Direct (Meta API)",
    accent: "#E1306C",
    fields: [
      { name: "accessToken", label: "Page Access Token (60d)", type: "password" },
      { name: "igUserId", label: "Instagram Business User ID", type: "text" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["accessToken", "igUserId"],
  },
  {
    key: "linkedinDirect",
    icon: Share2,
    label: "LinkedIn Direct (API)",
    accent: "#0A66C2",
    fields: [
      { name: "accessToken", label: "Access Token (60d)", type: "password" },
      { name: "personUrn", label: "Person URN (urn:li:person:...)", type: "text" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["accessToken", "personUrn"],
  },
  {
    key: "designSync",
    icon: Palette,
    label: "Design Sync (Penpot)",
    accent: "#8B5CF6",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url" },
      { name: "accessToken", label: "Access Token", type: "password" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["baseUrl", "accessToken"],
  },
  {
    key: "memoryVault",
    icon: Bookmark,
    label: "Memory Vault (Karakeep)",
    accent: "#06B6D4",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url" },
      { name: "apiKey", label: "API Key", type: "password" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["baseUrl", "apiKey"],
  },
  {
    key: "photos",
    icon: Image,
    label: "Photos (Immich)",
    accent: "#EC4899",
    fields: [
      { name: "baseUrl", label: "Base URL", type: "url" },
      { name: "apiKey", label: "API Key", type: "password" },
      { name: "enabled", label: "Ativado", type: "text" },
    ],
    requiredFields: ["baseUrl", "apiKey"],
  },
];

function resolveProvider(config: IntegrationConfig): string {
  const p = config.provider;
  if (typeof p === "string" && p) return p;
  if (typeof config.clientId === "string" && config.clientId.trim()) return "pluggy";
  if (typeof config.dataDir === "string" && config.dataDir.trim()) return "actual-budget";
  return "manual";
}

function isFieldFilled(config: IntegrationConfig, name: string): boolean {
  const v = config[name];
  return typeof v === "string" ? v.trim() !== "" : Boolean(v);
}

// ── Sub-Section Component ─────────────────────────────────────────────

function IntegrationSection({ def, config, onChange }: {
  def: IntegrationDef;
  config: IntegrationConfig;
  onChange: (key: IntegrationKey, field: string, value: string | boolean) => void;
}) {
  const provider = resolveProvider(config);

  let isConnected: boolean;
  if (def.providers) {
    const active = def.providers.find((p) => p.id === provider) || def.providers[0];
    isConnected = active.requiredFields.length === 0
      ? config.enabled
      : config.enabled && active.requiredFields.every((f) => isFieldFilled(config, f));
  } else {
    isConnected = def.requiredFields.length === 0
      ? config.enabled
      : config.enabled && def.requiredFields.every((f) => isFieldFilled(config, f));
  }

  const activeProviders = def.providers || [];
  const activeFields = (def.providers
    ? (def.providers.find((p) => p.id === provider) || def.providers[0]).fields
    : def.fields
  ).filter((f) => f.name !== "enabled");

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${def.accent}18` }}>
            <def.icon size={12} style={{ color: def.accent }} />
          </div>
          <span className="text-[11px] font-medium" style={{ fontFamily: "'Sora', sans-serif", color: P.text }}>{def.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] flex items-center gap-1" style={{ color: isConnected ? P.success : P.dim }}>
            {isConnected ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
            {isConnected ? "Conectado" : "Desconectado"}
          </span>
          <button
            onClick={() => onChange(def.key, "enabled", !config.enabled)}
            className="relative w-10 h-5 rounded-full transition-all"
            style={{ background: config.enabled ? P.primary : P.border }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: config.enabled ? "22px" : "2px" }}
            />
          </button>
        </div>
      </div>

      {config.enabled && (
        <div className="ml-8 mt-1.5 space-y-1.5">
          {activeProviders.length > 0 && (
            <div className="flex items-center gap-1 px-1 py-1 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {activeProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange(def.key, "provider", p.id)}
                  className="flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    color: provider === p.id ? "#fff" : "var(--muted-foreground)",
                    background: provider === p.id ? def.accent : "transparent",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {activeProviders.length > 0 && (() => {
            const active = activeProviders.find((p) => p.id === provider) || activeProviders[0];
            return active.hint ? (
              <div className="px-3 py-1.5 rounded-lg text-[9px] leading-relaxed" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'Sora', sans-serif" }}>
                {active.hint}
              </div>
            ) : null;
          })()}
          {activeFields.map((field) => (
            <div key={field.name} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <span className="text-[10px] mr-3" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>{field.label}</span>
              <input
                type={field.type === "password" ? "password" : "text"}
                value={typeof config[field.name] === "string" ? (config[field.name] as string) : ""}
                onChange={(e) => onChange(def.key, field.name, e.target.value)}
                placeholder={field.type === "password" ? "••••••••" : ""}
                className="w-48 px-2.5 py-1.5 rounded-md text-[10px] outline-none text-right"
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

const DEFAULT_STATE: IntegrationsState = {
  telemetry: { enabled: false, host: "http://127.0.0.1:8000", apiKey: "" },
  shieldSecrets: { enabled: false },
  finance: { enabled: false, provider: "manual", serverUrl: "", serverPassword: "", dataDir: "", clientId: "", clientSecret: "", itemIds: "" },
  social: { enabled: false, baseUrl: "http://localhost:5000", email: "", password: "" },
  instagramDirect: { enabled: false, accessToken: "", igUserId: "" },
  linkedinDirect: { enabled: false, accessToken: "", personUrn: "" },
  designSync: { enabled: false, baseUrl: "", accessToken: "" },
  memoryVault: { enabled: false, baseUrl: "", apiKey: "" },
  photos: { enabled: false, baseUrl: "", apiKey: "" },
};

export default function IntegrationsSettings({ t }: { t: (key: string) => string }) {
  const [settings, setSettings] = useState<IntegrationsState>(DEFAULT_STATE);

  useEffect(() => {
    window.orun?.settings?.get<IntegrationsState>("integrations").then((v) => {
      if (v && typeof v === "object") {
        setSettings((prev) => ({ ...prev, ...v }));
      }
    }).catch((err: unknown) => console.warn("[IPC integrations] get error", err));
  }, []);

  const handleChange = useCallback((key: IntegrationKey, field: string, value: string | boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: value } };
      window.orun?.settings?.set("integrations", next).catch((err: unknown) => console.warn("[IPC integrations] set error", err));
      return next;
    });
  }, []);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${P.primary}15` }}>
          <Plug size={12} style={{ color: P.primary }} />
        </div>
        <span className="text-[10px] tracking-wider uppercase" style={{ fontFamily: "'Sora', sans-serif", color: "var(--muted-foreground)" }}>
          Integrações Externas
        </span>
      </div>
      <div className="space-y-2">
        {INTEGRATIONS.map((def) => (
          <IntegrationSection
            key={def.key}
            def={def}
            config={settings[def.key] || { enabled: false }}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  );
}

// electron/auth.cjs
//
// Camada de autenticação Orun (Fase A): AuthClient do @orun/identity rodando
// no main process, consumido pelo renderer via IPC (auth-handlers.cjs).
//
// Design:
//  - Client supabase SEPARADO com anon key (nunca service_role para auth).
//  - Tokens de sessão persistidos com ElectronSecureTokenStore (safeStorage)
//    sobre um backend KeyValueBackend em arquivo dentro do userData.
//  - resolveTenantContext usa o RPC user_tenant_ids() + RLS (anon key).
//  - Sem credenciais no keychain → auth desativado; app segue como antes
//    (login é opt-in na Fase A, nada quebra no modo atual).
//
// Fase B: SessionRegistry ativo — ao ficar autenticado, registra este desktop
// em user_devices (fingerprint = orun.device.id), registra a sessão ativa em
// sessions (hash do refresh token, 1 ativa por device) e grava a ligação
// dono ↔ workspace local em settings (chave identity.owner).

const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const {
  AuthClient,
  SessionRegistry,
  ElectronSecureTokenStore,
  EntitlementsResolver,
  LicenseManager,
  PrivacyClient,
  TOKEN_STORE_KEYS,
} = require("@orun/identity");
const logger = require("./logger.cjs");

let safeStorage = null;
let authClient = null;
let supabaseClient = null;
let tokenStore = null;
let sessionRegistry = null;
let localDb = null;
let deviceFingerprint = null;
let appUserDataPath = null;
let secretStoreSecrets = {};
let available = false;
let licenseManager = null;
let entitlementsResolver = null;
let privacyClient = null;
let currentAuthState = null;
let currentDeviceId = null;

// ── SafeStorage adapter com weak-mode (AES-256-GCM de máquina) ───────────
//
// Decisão 2026-08-12 (Bloco 3 #1): o ElectronSecureTokenStore do pacote faz
// fail-fast quando safeStorage.isEncryptionAvailable() é false. Este adapter
// sempre reporta disponível e, quando o safeStorage real não está disponível
// ou falha, cifra/decifra com AES-256-GCM derivado de hostname+userData — o
// mesmo padrão de fallback do secret-store.cjs. Sem isso o login seria
// desabilitado em plataformas sem DPAPI disponível (bloqueava a validação).

const AES_WEAK_PREFIX = "$v2$";

function createSafeStorageAdapter(realSafeStorage, userDataPath) {
  const machineKey = crypto
    .createHash("sha256")
    .update(`orun-os:${os.hostname()}:${userDataPath}`)
    .digest();

  const aesEncrypt = (plaintext) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", machineKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([Buffer.from(AES_WEAK_PREFIX, "ascii"), iv, tag, encrypted]);
  };

  const aesDecrypt = (raw) => {
    const body = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const iv = body.subarray(0, 12);
    const tag = body.subarray(12, 28);
    const data = body.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", machineKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
  };

  const realAvailable = () => {
    try {
      return !!realSafeStorage && realSafeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  };

  return {
    isEncryptionAvailable: () => true,
    encryptString(value) {
      if (realAvailable()) {
        try {
          return realSafeStorage.encryptString(value);
        } catch (err) {
          logger.sync?.warn?.("[auth] safeStorage encrypt falhou, weak-mode:", err.message);
        }
      } else {
        logger.sync?.warn?.("[auth] safeStorage indisponível — tokens em weak-mode (AES-GCM de máquina)");
      }
      return aesEncrypt(value);
    },
    decryptString(encrypted) {
      const raw = Buffer.isBuffer(encrypted) ? encrypted : Buffer.from(encrypted);
      if (
        raw.length > AES_WEAK_PREFIX.length &&
        raw.subarray(0, AES_WEAK_PREFIX.length).toString("ascii") === AES_WEAK_PREFIX
      ) {
        return aesDecrypt(raw.subarray(AES_WEAK_PREFIX.length));
      }
      if (realAvailable()) {
        try {
          return realSafeStorage.decryptString(raw);
        } catch (err) {
          logger.sync?.warn?.("[auth] safeStorage decrypt falhou, tentando weak-mode:", err.message);
        }
      }
      return aesDecrypt(raw);
    },
  };
}

// ── KeyValueBackend (persistência dos bytes criptografados do safeStorage) ─

function createKvBackend(userDataPath) {
  const file = path.join(userDataPath, "auth-tokens.json");
  const readAll = () => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return {};
    }
  };
  const writeAll = (store) => {
    try {
      fs.writeFileSync(file, JSON.stringify(store));
    } catch (err) {
      logger.sync?.warn?.("[auth] kv write falhou:", err.message);
    }
  };

  return {
    async read(key) {
      const store = readAll();
      return store[key] ? Buffer.from(store[key], "base64") : null;
    },
    async write(key, value) {
      const store = readAll();
      store[key] = value.toString("base64");
      writeAll(store);
    },
    async delete(key) {
      const store = readAll();
      delete store[key];
      writeAll(store);
    },
    async clearAll() {
      writeAll({});
    },
  };
}

// ── Mapeamento de linhas do banco para os tipos do pacote ─────────────────

function mapTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMembership(row) {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    role: row.role,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
  };
}

// ── Fase B: registro de device/sessão e ligação dono ↔ workspace local ───

function getDeviceFingerprint(secrets) {
  // orun.device.id é o identificador estável do dispositivo (Orun-Core hub).
  // Fallback: hash estável de hostname + userData (persistente por instalação).
  if (deviceFingerprint) return deviceFingerprint;
  deviceFingerprint = secrets["orun.device.id"]
    || crypto.createHash("sha256").update(`${os.hostname()}:${appUserDataPath}`).digest("hex");
  return deviceFingerprint;
}

function linkOwnerToLocal({ user, activeTenant }) {
  if (!localDb || !localDb.setSetting) return;
  try {
    localDb.setSetting("identity.owner", {
      supabaseUserId: user.id,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      tenantId: activeTenant?.id ?? null,
      tenantSlug: activeTenant?.slug ?? null,
      tenantName: activeTenant?.name ?? null,
      linkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.sync?.warn?.("[auth] owner link falhou:", err.message);
  }
}

async function registerSession({ deviceId }) {
  // Registra a sessão ativa (hash do refresh token), mantendo no máximo 1
  // ativa por device — revoga a anterior antes de inserir. Não-fatal.
  if (!tokenStore || !supabaseClient) return;
  try {
    const refreshToken = await tokenStore.getItem(TOKEN_STORE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return;
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const now = new Date().toISOString();
    await supabaseClient
      .from("sessions")
      .update({ revoked_at: now })
      .eq("device_id", deviceId)
      .is("revoked_at", null);
    await supabaseClient.from("sessions").insert({
      device_id: deviceId,
      refresh_token_hash: hash,
      issued_at: now,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    logger.sync?.warn?.("[auth] registerSession falhou (opcional):", err.message);
  }
}

async function registerCurrentDevice(state) {
  const { user, activeTenant } = state || {};
  if (!user || !activeTenant || !sessionRegistry || !supabaseClient) return;
  try {
    const device = await sessionRegistry.registerDevice({
      tenantId: activeTenant.id,
      userId: user.id,
      platform: "desktop",
      name: os.hostname() || "Orun Desktop",
      fingerprint: getDeviceFingerprint(secretStoreSecrets),
    });
    currentDeviceId = device.id;
    await registerSession({ deviceId: device.id });
    linkOwnerToLocal({ user, activeTenant });
    logger.sync?.info?.("[auth] dispositivo registrado no tenant", activeTenant.slug);
  } catch (err) {
    logger.sync?.warn?.("[auth] registro de dispositivo falhou (opcional):", err.message);
  }
}

function getOwner() {
  if (!localDb || !localDb.getSetting) return null;
  try {
    return localDb.getSetting("identity.owner", null);
  } catch {
    return null;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────

/**
 * Inicializa a camada de auth. Deve ser chamado no boot do app (main.cjs),
 * após o secretStore.init. Retorna true se a auth ficou disponível.
 */
function init({ userDataPath, secretStore, safeStorageModule, wsTransport, db }) {
  try {
    safeStorage = safeStorageModule;
    if (!safeStorage) return false;
    appUserDataPath = userDataPath;
    localDb = db || null;

    const secrets = secretStore.readSecretStore();
    secretStoreSecrets = secrets;
    const url = secrets["orun.supabase.url"];
    const anonKey = secrets["orun.supabase.anonKey"];
    if (!url || !anonKey) {
      logger.sync?.info?.("[auth] credenciais supabase ausentes (anonKey) — auth desativado (opcional)");
      return false;
    }

    const realtime = wsTransport ? { transport: wsTransport } : undefined;
    supabaseClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: true },
      db: { schema: "public" },
      realtime,
    });

    tokenStore = new ElectronSecureTokenStore(
      createSafeStorageAdapter(safeStorage, userDataPath),
      createKvBackend(userDataPath),
    );
    sessionRegistry = new SessionRegistry(supabaseClient);

    // Fase C: licença offline (LicenseManager) + entitlements (Resolve). A
    // chave pública não é segredo (vem do .env); sem ela, licença desativada.
    const publicKeyPem = process.env.LICENSE_PUBLIC_KEY_PEM;
    if (publicKeyPem) {
      licenseManager = new LicenseManager({
        tokenStore,
        publicKeyPem,
        gracePeriodDays: 3,
        fetchFreshLicense: async () => {
          const state = currentAuthState;
          if (!state || state.status !== "authenticated" || !state.activeTenant) {
            throw new Error("sem sessão ativa para emitir licença");
          }
          if (!currentDeviceId) throw new Error("dispositivo ainda não registrado");
          const { data, error } = await supabaseClient.functions.invoke("issue-license", {
            body: { tenantId: state.activeTenant.id, deviceId: currentDeviceId },
          });
          if (error) throw error;
          return data.token;
        },
      });
    } else {
      logger.sync?.warn?.("[auth] LICENSE_PUBLIC_KEY_PEM ausente — licença offline desativada");
    }
    entitlementsResolver = new EntitlementsResolver(supabaseClient);
    privacyClient = new PrivacyClient(supabaseClient);

    authClient = new AuthClient({
      supabase: supabaseClient,
      tokenStore,
      resolveTenantContext: async () => {
        const { data: tenantIds, error: idsError } = await supabaseClient.rpc("user_tenant_ids");
        if (idsError) throw idsError;
        const ids = tenantIds ?? [];
        if (ids.length === 0) return { activeTenant: null, memberships: [] };

        const { data: memberships, error: mErr } = await supabaseClient
          .from("memberships")
          .select("*, tenants(*)")
          .in("tenant_id", ids);
        if (mErr) throw mErr;

        const mapped = (memberships ?? []).map(mapMembership);
        const activeTenant = mapTenant(memberships?.[0]?.tenants ?? null);
        return { activeTenant, memberships: mapped };
      },
    });

    // Fase B: ao autenticar (login ou restore de sessão), registra este
    // desktop em user_devices + sessions e liga o dono ao workspace local.
    // Fase C: captura o estado p/ licença/entitlements e dispara refresh da
    // licença offline em background (não-fatal).
    authClient.subscribe((state) => {
      currentAuthState = state;
      if (state.status === "authenticated") {
        registerCurrentDevice(state);
        refreshLicense().catch(() => {});
      }
    });

    available = true;
    logger.sync?.info?.("[auth] camada de autenticação ativa (anon key)");
    return true;
  } catch (err) {
    available = false;
    logger.sync?.warn?.("[auth] init falhou:", err.message);
    return false;
  }
}

async function initialize() {
  if (!authClient) return;
  try {
    await authClient.initialize();
  } catch (err) {
    logger.sync?.warn?.("[auth] initialize falhou:", err.message);
  }
}

function isAvailable() {
  return available && authClient !== null;
}

function getState() {
  return authClient
    ? authClient.getState()
    : { status: "unauthenticated", user: null, activeTenant: null, memberships: [], accessToken: null };
}

function subscribe(listener) {
  if (!authClient) return () => {};
  return authClient.subscribe(listener);
}

async function signIn({ email, password }) {
  if (!authClient) throw new Error("auth indisponível");
  await authClient.signIn({ email, password });
  return getState();
}

async function signUp({ email, password, displayName }) {
  if (!authClient) throw new Error("auth indisponível");
  await authClient.signUp({ email, password, displayName });
  return getState();
}

async function signOut() {
  if (!authClient) return getState();
  await authClient.signOut();
  return getState();
}

function getSupabase() {
  return supabaseClient;
}

async function listDevices(tenantId) {
  if (!sessionRegistry) return [];
  const { data, error } = await supabaseClient
    .from("user_devices")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    platform: row.platform,
    name: row.name,
    fingerprint: row.fingerprint,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  }));
}

async function revokeDevice(deviceId) {
  if (!sessionRegistry) throw new Error("auth indisponível");
  await sessionRegistry.revokeDevice(deviceId);
}

// ── Fase C: licença offline + entitlements (billing) ─────────────────────

async function getLicense() {
  if (!licenseManager) return { status: "unavailable", payload: null, graceDaysRemaining: null };
  return licenseManager.validateCached();
}

async function refreshLicense() {
  if (!licenseManager) return { status: "unavailable", payload: null, graceDaysRemaining: null };
  return licenseManager.refresh();
}

async function clearLicense() {
  if (licenseManager) await licenseManager.clear();
}

async function getEntitlements(tenantId) {
  if (!entitlementsResolver) {
    return { plan: null, subscription: null, isActive: false, features: {} };
  }
  return entitlementsResolver.resolve(tenantId);
}

// Inicia o checkout Stripe (Fase C). Requer plans.stripe_price_id preenchido;
// sem Stripe configurado, retorna o erro esperado para a UI exibir.
async function startCheckout(tenantId) {
  if (!supabaseClient) throw new Error("auth indisponível");
  const { data: plan, error } = await supabaseClient
    .from("plans")
    .select("key, stripe_price_id")
    .eq("key", "desktop_pro")
    .maybeSingle();
  if (error) throw error;
  if (!plan?.stripe_price_id) {
    const err = new Error("Billing ainda não configurado (aguardando chaves Stripe).");
    err.code = "stripe_not_configured";
    throw err;
  }
  const { data, error: fnError } = await supabaseClient.functions.invoke("create-checkout-session", {
    body: {
      tenantId,
      priceId: plan.stripe_price_id,
      successUrl: "orunos://billing/success",
      cancelUrl: "orunos://billing/cancel",
    },
  });
  if (fnError) throw fnError;
  return data.url;
}

// ── Fase D: LGPD (portabilidade + esquecimento) ──────────────────────────

async function exportUserData() {
  if (!privacyClient) throw new Error("auth indisponível");
  return privacyClient.exportUserData();
}

async function deleteAccount() {
  if (!privacyClient) throw new Error("auth indisponível");
  return privacyClient.requestAccountDeletion();
}

module.exports = {
  init,
  initialize,
  isAvailable,
  getState,
  subscribe,
  signIn,
  signUp,
  signOut,
  getOwner,
  listDevices,
  revokeDevice,
  registerCurrentDevice,
  getLicense,
  refreshLicense,
  clearLicense,
  getEntitlements,
  startCheckout,
  exportUserData,
  deleteAccount,
  getSupabase,
  TOKEN_STORE_KEYS,
};

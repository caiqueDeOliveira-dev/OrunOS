// electron/ipc/vpn-handlers.cjs
// Orun VPN IPC handlers — usa @orun/vpn-electron + @orun/vpn-core

const { ElectronVpnBackend } = require("@orun/vpn-electron");
const { VpnServerConfigSchema, VpnPeerSchema, VpnProfileSchema } = require("@orun/vpn-core");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");
const logger = require("../logger.cjs");

// In-memory store para servidores/peers (persistido via settings bridge)
const VPN_STORE_KEY = "orun.vpn.servers";

function getVpnStore() {
  // Usa o settings bridge do @orun/settings
  return global.orunSettingsBridge?.getStore?.();
}

async function loadServers() {
  const store = getVpnStore();
  if (store) {
    try {
      const data = await store.get(VPN_STORE_KEY);
      return data || [];
    } catch {
      return [];
    }
  }
  // Fallback para settings legacy
  const { db } = require("../db.cjs");
  const legacy = db.getSetting("vpn.servers", []);
  return legacy;
}

async function saveServers(servers) {
  const store = getVpnStore();
  if (store) {
    try {
      await store.set(VPN_STORE_KEY, servers);
      return true;
    } catch (e) {
      logger.ipc.warn("[vpn] save falhou no bridge:", e.message);
    }
  }
  // Fallback
  const { db } = require("../db.cjs");
  db.setSetting("vpn.servers", servers);
  return true;
}

// Backend instances por serverId
const backendInstances = new Map();

function getBackend(serverId) {
  if (!backendInstances.has(serverId)) {
    // Secret store fake - em produção usar @orun/identity
    const secretStore = {
      get: async (ref) => {
        // Buscar chave privada do peer no settings
        const store = getVpnStore();
        if (store) {
          const servers = await store.get(VPN_STORE_KEY) || [];
          const server = servers.find(s => s.id === serverId);
          if (server) {
            const peer = server.peers?.find(p => p.id === ref);
            if (peer) return peer.privateKey;
          }
        }
        return null;
      },
      set: async () => {},
      delete: async () => {},
    };
    backendInstances.set(serverId, new ElectronVpnBackend(secretStore));
  }
  return backendInstances.get(serverId);
}

function register(ipcMain) {
  // Get all configured VPN servers
  ipcMain.handle("vpn:get-servers", async () => {
    const servers = await loadServers();
    // Para cada servidor, verificar status de conexão via backend
    const result = await Promise.all(servers.map(async (s) => {
      const backend = getBackend(s.id);
      let connected = false;
      try {
        const state = await backend.getState();
        connected = state?.status === "connected";
      } catch {
        connected = false;
      }
      return { id: s.id, label: s.label, host: s.host, connected };
    }));
    return result;
  });

  // Add a new VPN server
  ipcMain.handle("vpn:add-server", async (_event, config) => {
    try {
      const { VpnServerConfigSchema } = require("@orun/vpn-core");
      const server = VpnServerConfigSchema.parse({
        id: randomUUID(),
        label: config.label,
        host: config.host,
        apiPort: config.apiPort,
        wgPort: config.wgPort,
        wgPublicKey: config.wgPublicKey,
        useTls: config.useTls,
        dnsServer: config.dnsServer,
        createdAt: new Date().toISOString(),
      });

      const servers = await loadServers();
      servers.push({ ...server, peers: [] });
      await saveServers(servers);
      return { ok: true, id: server.id };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Remove a VPN server
  ipcMain.handle("vpn:remove-server", async (_event, id) => {
    try {
      const servers = await loadServers();
      const filtered = servers.filter(s => s.id !== id);
      await saveServers(filtered);
      backendInstances.delete(id);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Get peers for a server
  ipcMain.handle("vpn:get-peers", async (_event, serverId) => {
    const servers = await loadServers();
    const server = servers.find(s => s.id === serverId);
    if (!server) return [];

    const backend = getBackend(serverId);
    const peersWithStatus = await Promise.all((server.peers || []).map(async (p) => {
      let connected = false;
      try {
        const state = await backend.getState();
        connected = state?.status === "connected" && state?.endpoint?.includes(p.address);
      } catch {
        connected = false;
      }
      return { id: p.id, name: p.name, address: p.address, connected };
    }));
    return peersWithStatus;
  });

  // Connect to a peer
  ipcMain.handle("vpn:connect", async (_event, serverId, peerId) => {
    try {
      const servers = await loadServers();
      const server = servers.find(s => s.id === serverId);
      const peer = server?.peers?.find(p => p.id === peerId);
      if (!server || !peer) return { ok: false, error: "Servidor ou peer não encontrado" };

      const backend = getBackend(serverId);

      // Converter para schemas do @orun/vpn-core
      const serverConfig = VpnServerConfigSchema.parse(server);
      const peerConfig = VpnPeerSchema.parse(peer);
      const profileConfig = VpnProfileSchema.parse({
        id: `profile-${peerId}`,
        serverId: server.id,
        peerId: peer.id,
        privateKeySecretRef: peer.id, // ref para buscar no secret store
        autoConnect: false,
        killSwitch: false,
      });

      await backend.connect(profileConfig, peerConfig, serverConfig);
      return { ok: true };
    } catch (err) {
      logger.ipc.error("[vpn] connect error:", err.message);
      return { ok: false, error: err.message };
    }
  });

  // Disconnect from server
  ipcMain.handle("vpn:disconnect", async (_event, serverId) => {
    try {
      const backend = getBackend(serverId);
      await backend.disconnect();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Get connection state
  ipcMain.handle("vpn:get-state", async (_event, serverId) => {
    try {
      const backend = getBackend(serverId);
      const state = await backend.getState();
      return state || { status: "disconnected" };
    } catch (err) {
      return { status: "error", error: err.message };
    }
  });

  // Set kill switch
  ipcMain.handle("vpn:set-kill-switch", async (_event, serverId, enabled) => {
    try {
      const backend = getBackend(serverId);
      await backend.setKillSwitch(enabled);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Provision a new peer via wg-easy API
  ipcMain.handle("vpn:provision-peer", async (_event, serverId, name) => {
    try {
      const servers = await loadServers();
      const server = servers.find(s => s.id === serverId);
      if (!server) return { ok: false, error: "Servidor não encontrado" };

      // Usar WgEasyClient do @orun/vpn-core
      const { WgEasyClient } = require("@orun/vpn-core");

      // Precisa da senha admin - buscar no secret store
      const secretStore = getVpnStore();
      let adminPassword = null;
      if (secretStore) {
        adminPassword = await secretStore.get("vpn:admin:password");
      }
      if (!adminPassword) {
        // Tentar buscar do settings legacy
        const { db } = require("../db.cjs");
        adminPassword = db.getSetting("vpn.adminPassword");
      }
      if (!adminPassword) {
        return { ok: false, error: "Senha admin do wg-easy não configurada. Configure em Settings > VPN." };
      }

      const client = new WgEasyClient({
        baseUrl: `${server.useTls ? "https" : "http"}://${server.host}:${server.apiPort}`,
      });

      await client.login("admin", adminPassword);

      // Criar peer
      const peer = await client.createPeer(name, server.id);

      // Baixar config e QR
      const config = await client.getPeerConfig(peer.id);
      const qr = await client.getPeerQrCodeSvg(peer.id);

      // Salvar peer no servidor local
      const newPeer = {
        id: peer.id,
        serverId: server.id,
        name: peer.name,
        publicKey: peer.publicKey,
        presharedKey: peer.presharedKey,
        address: peer.address,
        enabled: true,
        createdAt: new Date().toISOString(),
        latestHandshakeAt: null,
        transferRx: 0,
        transferTx: 0,
        privateKey: peer.privateKey, // armazenar temporariamente para o secret store
      };

      const updatedServers = servers.map(s => {
        if (s.id === serverId) {
          return { ...s, peers: [...(s.peers || []), newPeer] };
        }
        return s;
      });
      await saveServers(updatedServers);

      // TODO: mover privateKey para @orun/identity secret store
      // Por enquanto fica no store local (não ideal para produção)

      return { ok: true, peer: { id: peer.id, name: peer.name, config, qr } };
    } catch (err) {
      logger.ipc.error("[vpn] provision-peer error:", err.message);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { register };
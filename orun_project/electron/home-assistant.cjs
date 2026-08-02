// electron/home-assistant.cjs
// Home Assistant connector for the "Home IA" agent.
//
// Two modes:
//   - "simulated" (default): a realistic SmartThings-style smart home that works
//     out of the box — perfect for the mini-PC/Alexa-style device demo.
//   - "real": connects to a real Home Assistant instance over its REST API
//     (http(s)://<host>:<port>/api) using a long-lived access token.
//
// Nothing here requires network access; the simulated home is entirely local.

const fs = require("fs");
const path = require("path");
const log = require("electron-log");

// ── Simulated smart home state ──────────────────────────────────────────

function buildRooms() {
  return [
    {
      id: "sala",
      name: "Sala de Estar",
      icon: "Sofa",
      devices: [
        { id: "luz_sala", name: "Luz de Teto", type: "light", icon: "Lightbulb", state: true, value: 80, brightness: 80 },
        { id: "abajur_sala", name: "Abajur", type: "light", icon: "Lamp", state: false, value: 40, brightness: 40 },
        { id: "ar_sala", name: "Ar-Condicionado", type: "climate", icon: "Snowflake", state: true, value: 23, temperature: 23, mode: "cool" },
        { id: "tv_sala", name: "Smart TV", type: "media_player", icon: "Tv", state: false, value: "desligada" },
        { id: "presenca_sala", name: "Sensor de Presenca", type: "binary_sensor", icon: "MotionSensor", state: false, value: "sem movimento" },
      ],
    },
    {
      id: "quarto",
      name: "Quarto",
      icon: "Bed",
      devices: [
        { id: "luz_quarto", name: "Luz do Quarto", type: "light", icon: "Lightbulb", state: false, value: 60, brightness: 60 },
        { id: "termostato_quarto", name: "Termostato", type: "climate", icon: "Thermometer", state: true, value: 22, temperature: 22, mode: "heat" },
        { id: "temp_quarto", name: "Sensor de Temperatura", type: "sensor", icon: "ThermometerSun", state: true, value: "22.4 °C" },
        { id: "umid_quarto", name: "Sensor de Umidade", type: "sensor", icon: "Droplets", state: true, value: "48%" },
        { id: "alarme", name: "Alarme", type: "lock", icon: "Lock", state: true, value: "armado", locked: true },
      ],
    },
    {
      id: "cozinha",
      name: "Cozinha",
      icon: "ChefHat",
      devices: [
        { id: "luz_cozinha", name: "Luz da Cozinha", type: "light", icon: "Lightbulb", state: false, value: 90, brightness: 90 },
        { id: "cafeteira", name: "Cafeteira", type: "switch", icon: "Coffee", state: false, value: "desligada" },
        { id: "geladeira", name: "Geladeira", type: "switch", icon: "Refrigerator", state: true, value: "ligada" },
        { id: "fumaca_cozinha", name: "Sensor de Fumaca", type: "binary_sensor", icon: "Flame", state: false, value: "sem fumaca" },
      ],
    },
    {
      id: "garagem",
      name: "Garagem / Entrada",
      icon: "Car",
      devices: [
        { id: "portao", name: "Portao da Garagem", type: "cover", icon: "DoorOpen", state: false, value: "fechado", locked: false },
        { id: "luz_garagem", name: "Luz da Garagem", type: "light", icon: "Lightbulb", state: false, value: 100, brightness: 100 },
        { id: "porta_entrada", name: "Porta de Entrada", type: "lock", icon: "Lock", state: true, value: "trancada", locked: true },
        { id: "cam_garagem", name: "Camera de Seguranca", type: "camera", icon: "Cctv", state: true, value: "gravando" },
      ],
    },
  ];
}

function buildAutomations() {
  return [
    {
      id: "autom_chegar_casa",
      name: "Chegar em Casa",
      description: "Abre o portao, liga a luz da sala e ajusta o ar-condicionado",
      icon: "Home",
      enabled: true,
      lastRun: null,
      steps: [
        { deviceId: "portao", action: "open" },
        { deviceId: "luz_sala", action: "on" },
        { deviceId: "ar_sala", action: "on" },
      ],
    },
    {
      id: "autom_boa_noite",
      name: "Boa Noite",
      description: "Desliga as luzes, tranca portas e arma o alarme",
      icon: "Moon",
      enabled: true,
      lastRun: null,
      steps: [
        { deviceId: "luz_sala", action: "off" },
        { deviceId: "luz_quarto", action: "off" },
        { deviceId: "tv_sala", action: "off" },
        { deviceId: "porta_entrada", action: "lock" },
        { deviceId: "alarme", action: "arm" },
      ],
    },
    {
      id: "autom_acordar",
      name: "Acordar",
      description: "Liga a cafeteira, abre o portao e liga a luz do quarto em 40%",
      icon: "Sunrise",
      enabled: true,
      lastRun: null,
      steps: [
        { deviceId: "cafeteira", action: "on" },
        { deviceId: "luz_quarto", action: "on", brightness: 40 },
        { deviceId: "portao", action: "open" },
      ],
    },
    {
      id: "autom_sair_casa",
      name: "Sair de Casa",
      description: "Desliga tudo, tranca a porta e arma o alarme",
      icon: "DoorClosed",
      enabled: true,
      lastRun: null,
      steps: [
        { deviceId: "luz_sala", action: "off" },
        { deviceId: "luz_cozinha", action: "off" },
        { deviceId: "tv_sala", action: "off" },
        { deviceId: "ar_sala", action: "off" },
        { deviceId: "porta_entrada", action: "lock" },
        { deviceId: "alarme", action: "arm" },
      ],
    },
  ];
}

function buildScenes() {
  return [
    { id: "cena_cinema", name: "Modo Cinema", icon: "Clapperboard", description: "Luz da sala a 20% e TV ligada" },
    { id: "cena_jantar", name: "Modo Jantar", icon: "Utensils", description: "Luz da cozinha e sala em tons quentes" },
    { id: "cena_festa", name: "Modo Festa", icon: "PartyPopper", description: "Todas as luzes em 100%" },
    { id: "cena_economia", name: "Modo Economia", icon: "Leaf", description: "Reduz todas as luzes para 30%" },
  ];
}

// ── State & persistence ─────────────────────────────────────────────────

let config = { mode: "simulated", host: "", token: "", name: "" };
let rooms = buildRooms();
let automations = buildAutomations();
let scenes = buildScenes();
let lastHomeStatus = null;

function getDataFile(app) {
  try {
    return path.join(app.getPath("userData"), "home-ia-state.json");
  } catch {
    return path.join(process.env.TEMP || ".", "orun-home-ia-state.json");
  }
}

function persist(app) {
  try {
    fs.writeFileSync(getDataFile(app), JSON.stringify({ config, rooms, automations }, null, 2));
  } catch (e) {
    log.warn("[home-assistant] persist failed:", e.message);
  }
}

function load(app) {
  try {
    const file = getDataFile(app);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (data.config) config = { ...config, ...data.config };
      if (Array.isArray(data.rooms) && data.rooms.length) rooms = data.rooms;
      if (Array.isArray(data.automations) && data.automations.length) automations = data.automations;
    }
  } catch (e) {
    log.warn("[home-assistant] load failed:", e.message);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function findDevice(deviceId) {
  for (const room of rooms) {
    const dev = room.devices.find((d) => d.id === deviceId);
    if (dev) return { room, device: dev };
  }
  return null;
}

function flattenDevices() {
  return rooms.flatMap((room) => room.devices.map((device) => ({ room: room.id, ...device })));
}

function labelFor(device) {
  return device.state ? "ligado" : "desligado";
}

// ── Real Home Assistant REST client ─────────────────────────────────────

function haApi(method, url, body) {
  if (!config.host || !config.token) throw new Error("Home Assistant nao configurado");
  const base = config.host.replace(/\/+$/, "");
  return fetch(`${base}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function haGetStates() {
  const res = await haApi("GET", "/api/states");
  if (!res.ok) throw new Error(`Home Assistant respondeu ${res.status}`);
  return res.json();
}

// ── Public API ──────────────────────────────────────────────────────────

function getConfig() {
  return { ...config, connected: false, simulated: config.mode === "simulated" };
}

async function setConfig(cfg, app) {
  const prev = { ...config };
  config = {
    ...config,
    mode: cfg.mode === "real" ? "real" : "simulated",
    host: cfg.host ? String(cfg.host).trim() : "",
    token: cfg.token ? String(cfg.token).trim() : "",
    name: cfg.name ? String(cfg.name).trim() : config.name,
  };
  let connected = false;
  if (config.mode === "real" && config.host && config.token) {
    try {
      const states = await haGetStates();
      connected = Array.isArray(states);
    } catch (e) {
      log.warn("[home-assistant] real connection failed:", e.message);
      config = { ...prev };
    }
  }
  persist(app);
  return { ...config, connected, simulated: config.mode === "simulated" };
}

function getRooms() {
  return rooms;
}

function getDevices() {
  return flattenDevices();
}

function getDeviceState(deviceId) {
  const found = findDevice(deviceId);
  return found ? { success: true, data: { room: found.room.id, ...found.device } } : { success: false, error: `Device not found: ${deviceId}` };
}

async function getStates(app) {
  if (config.mode === "real" && config.host && config.token) {
    try {
      const states = await haGetStates();
      return { mode: "real", states };
    } catch (e) {
      log.warn("[home-assistant] getStates real failed, falling back:", e.message);
    }
  }
  return { mode: "simulated", states: flattenDevices() };
}

function callService(deviceId, service, params = {}, app) {
  const found = findDevice(deviceId);
  if (!found) return { success: false, error: `Device not found: ${deviceId}` };
  const { device } = found;

  if (config.mode === "real" && config.host && config.token) {
    // best-effort: map to HA domain/service
    const domains = { light: "light", switch: "switch", climate: "climate", lock: "lock", cover: "cover", media_player: "media_player" };
    const domain = domains[device.type];
    if (domain) {
      const entityId = params.entity_id || `${domain}.${device.id}`;
      haApi("POST", `/api/services/${domain}/${service}`, { entity_id: entityId, ...params })
        .then(() => log.info(`[home-assistant] ${domain}/${service} ${entityId}`))
        .catch((e) => log.warn("[home-assistant] service call failed:", e.message));
    }
  }

  applySimulatedAction(device, service, params);
  persist(app);
  return { success: true, data: { deviceId, service, ...device } };
}

// Applies a "service" to a simulated device. Accepts HA-style names
// (turn_on/turn_off/set_brightness/set_temperature/lock/unlock/open_cover)
// and short aliases (on/off/brightness/open/lock/arm...).
function applySimulatedAction(device, service, params) {
  const s = String(service || "").toLowerCase();
  const onLike = (v) => { device.state = Boolean(v); device.value = device.state ? labelFor(device) : (device.type === "sensor" ? device.value : "desligado"); };

  if (["on", "turn_on", "turnon", "open", "open_cover"].includes(s)) {
    device.state = true;
    device.value = "ligado";
    if (typeof params.brightness === "number") { device.brightness = params.brightness; device.value = params.brightness; }
  } else if (["off", "turn_off", "turnoff", "close", "close_cover"].includes(s)) {
    device.state = false;
    device.value = "desligado";
  } else if (["toggle"].includes(s)) {
    device.state = !device.state;
    device.value = device.state ? "ligado" : "desligado";
  } else if (["set_brightness", "brightness"].includes(s)) {
    device.brightness = Math.max(0, Math.min(100, typeof params.brightness === "number" ? params.brightness : (params.value || 50)));
    device.state = device.brightness > 0;
    device.value = device.brightness;
  } else if (["set_temperature", "temperature", "set_temp"].includes(s)) {
    device.temperature = typeof params.temperature === "number" ? params.temperature : (params.value || 22);
    device.value = device.temperature;
  } else if (["lock"].includes(s)) {
    device.locked = true; device.state = true; device.value = device.type === "lock" ? "trancado" : "fechado";
  } else if (["unlock", "unarm", "disarm"].includes(s)) {
    device.locked = false; device.state = false; device.value = device.type === "lock" ? "destrancado" : "aberto";
  } else if (["arm", "set_alarm"].includes(s)) {
    device.locked = true; device.state = true; device.value = "armado";
  } else if (["play", "media_play"].includes(s)) {
    device.state = true; device.value = "tocando";
  } else if (["pause", "media_pause", "media_stop"].includes(s)) {
    device.state = false; device.value = "pausado";
  } else {
    onLike(service === "turn_on" || service === "on");
  }
  return device;
}

function getAutomations() {
  return automations;
}

function runAutomation(automationId, app) {
  const automation = automations.find((a) => a.id === automationId);
  if (!automation) return { success: false, error: `Automation not found: ${automationId}` };
  for (const step of automation.steps || []) {
    const found = findDevice(step.deviceId);
    if (found) {
      applySimulatedAction(found.device, step.action, step);
      if (config.mode === "real" && config.host && config.token) {
        const domains = { light: "light", switch: "switch", climate: "climate", lock: "lock", cover: "cover" };
        const domain = domains[found.device.type];
        if (domain) {
          const map = { on: "turn_on", off: "turn_off", lock: "lock", unlock: "unlock", arm: "lock", open: "open_cover", close: "close_cover" };
          haApi("POST", `/api/services/${domain}/${map[step.action] || step.action}`, { entity_id: `${domain}.${step.deviceId}` })
            .catch((e) => log.warn("[home-assistant] automation step failed:", e.message));
        }
      }
    }
  }
  automation.lastRun = new Date().toISOString();
  persist(app);
  return { success: true, data: { automationId, name: automation.name, ranAt: automation.lastRun } };
}

function createAutomation(params, app) {
  const name = params.name || "Nova Automacao";
  const steps = Array.isArray(params.steps) ? params.steps : [];
  const automation = {
    id: `autom_${Date.now()}`,
    name,
    description: params.description || "",
    icon: params.icon || "Zap",
    enabled: params.enabled !== false,
    lastRun: null,
    steps,
  };
  automations.push(automation);
  persist(app);
  return { success: true, data: automation };
}

function deleteAutomation(automationId, app) {
  const idx = automations.findIndex((a) => a.id === automationId);
  if (idx === -1) return { success: false, error: `Automation not found: ${automationId}` };
  automations.splice(idx, 1);
  persist(app);
  return { success: true, message: "Automacao removida" };
}

function toggleAutomation(automationId, app) {
  const automation = automations.find((a) => a.id === automationId);
  if (!automation) return { success: false, error: `Automation not found: ${automationId}` };
  automation.enabled = !automation.enabled;
  persist(app);
  return { success: true, data: { id: automationId, enabled: automation.enabled } };
}

function getScenes() {
  return scenes;
}

function activateScene(sceneId, app) {
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) return { success: false, error: `Scene not found: ${sceneId}` };

  if (sceneId === "cena_cinema") {
    const sala = rooms.find((r) => r.id === "sala");
    const luz = sala && sala.devices.find((d) => d.id === "luz_sala");
    const tv = sala && sala.devices.find((d) => d.id === "tv_sala");
    if (luz) { luz.state = true; luz.brightness = 20; luz.value = 20; }
    if (tv) { tv.state = true; tv.value = "tocando"; }
  } else if (sceneId === "cena_jantar") {
    rooms.forEach((room) => {
      room.devices.forEach((d) => { if (d.type === "light") { d.state = true; d.brightness = 55; d.value = 55; } });
    });
  } else if (sceneId === "cena_festa") {
    rooms.forEach((room) => {
      room.devices.forEach((d) => { if (d.type === "light") { d.state = true; d.brightness = 100; d.value = 100; } });
    });
  } else if (sceneId === "cena_economia") {
    rooms.forEach((room) => {
      room.devices.forEach((d) => { if (d.type === "light") { d.state = true; d.brightness = 30; d.value = 30; } });
    });
  }

  persist(app);
  return { success: true, data: { sceneId, name: scene.name, activatedAt: new Date().toISOString() } };
}

function getHomeStatus() {
  const total = flattenDevices();
  const on = total.filter((d) => d.state || d.locked).length;
  const open = total.filter((d) => d.state).length;
  const lights = total.filter((d) => d.type === "light");
  const lightsOn = lights.filter((d) => d.state).length;
  const locks = total.filter((d) => d.type === "lock" || d.type === "cover");
  const locked = locks.filter((d) => d.locked).length;
  const sensors = total.filter((d) => d.type === "binary_sensor" || d.type === "sensor");
  const alerts = total.filter((d) => d.type === "binary_sensor" && d.state).length;

  lastHomeStatus = {
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      icon: room.icon,
      devicesOn: room.devices.filter((d) => d.state).length,
      devices: room.devices.length,
    })),
    devices: { total: total.length, on, open, lights, lightsOn, locks, locked, sensors, alerts },
    energy: {
      lights: `${Math.round(lightsOn * 9)} W`,
      climate: total.some((d) => d.type === "climate" && d.state) ? "1.2 kW" : "0 W",
      total: total.some((d) => d.type === "climate" && d.state) ? "1.3 kW" : "90 W",
    },
    automations: {
      total: automations.length,
      enabled: automations.filter((a) => a.enabled).length,
      ranToday: automations.filter((a) => a.lastRun && new Date(a.lastRun).toDateString() === new Date().toDateString()).length,
    },
    updatedAt: new Date().toISOString(),
  };
  return lastHomeStatus;
}

function init(app) {
  try { load(app); } catch { /* ignore */ }
  return {
    getConfig, setConfig: (cfg) => setConfig(cfg, app),
    getRooms, getDevices, getDeviceState, getStates: () => getStates(app),
    callService: (deviceId, service, params) => callService(deviceId, service, params, app),
    getAutomations, runAutomation: (id) => runAutomation(id, app),
    createAutomation: (params) => createAutomation(params, app),
    deleteAutomation: (id) => deleteAutomation(id, app),
    toggleAutomation: (id) => toggleAutomation(id, app),
    getScenes, activateScene: (id) => activateScene(id, app),
    getHomeStatus,
  };
}

module.exports = { init };

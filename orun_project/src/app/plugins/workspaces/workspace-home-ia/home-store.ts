// workspace-home-ia store

import { createStore } from "../../lib/store";
import type { HomeRoom, HomeAutomation, HomeScene, HomeStatus, HomeConfig, HomeDevice } from "./home-types";

const STORAGE_KEY = "orun_home_ia_state";

const MOCK_ROOMS: HomeRoom[] = [
  {
    id: "sala", name: "Sala de Estar", icon: "Sofa",
    devices: [
      { id: "luz_sala", name: "Luz de Teto", type: "light", icon: "Lightbulb", state: true, value: 80, brightness: 80 },
      { id: "abajur_sala", name: "Abajur", type: "light", icon: "Lamp", state: false, value: 40, brightness: 40 },
      { id: "ar_sala", name: "Ar-Condicionado", type: "climate", icon: "Snowflake", state: true, value: 23, temperature: 23 },
      { id: "tv_sala", name: "Smart TV", type: "media_player", icon: "Tv", state: false, value: "desligada" },
      { id: "presenca_sala", name: "Sensor de Presenca", type: "binary_sensor", icon: "Radar", state: false, value: "sem movimento" },
    ],
  },
  {
    id: "quarto", name: "Quarto", icon: "Bed",
    devices: [
      { id: "luz_quarto", name: "Luz do Quarto", type: "light", icon: "Lightbulb", state: false, value: 60, brightness: 60 },
      { id: "termostato_quarto", name: "Termostato", type: "climate", icon: "Thermometer", state: true, value: 22, temperature: 22 },
      { id: "temp_quarto", name: "Sensor de Temperatura", type: "sensor", icon: "ThermometerSun", state: true, value: "22.4 °C" },
      { id: "umid_quarto", name: "Sensor de Umidade", type: "sensor", icon: "Droplets", state: true, value: "48%" },
      { id: "alarme", name: "Alarme", type: "lock", icon: "Lock", state: true, value: "armado", locked: true },
    ],
  },
  {
    id: "cozinha", name: "Cozinha", icon: "ChefHat",
    devices: [
      { id: "luz_cozinha", name: "Luz da Cozinha", type: "light", icon: "Lightbulb", state: false, value: 90, brightness: 90 },
      { id: "cafeteira", name: "Cafeteira", type: "switch", icon: "Coffee", state: false, value: "desligada" },
      { id: "geladeira", name: "Geladeira", type: "switch", icon: "Refrigerator", state: true, value: "ligada" },
      { id: "fumaca_cozinha", name: "Sensor de Fumaca", type: "binary_sensor", icon: "Flame", state: false, value: "sem fumaca" },
    ],
  },
  {
    id: "garagem", name: "Garagem / Entrada", icon: "Car",
    devices: [
      { id: "portao", name: "Portao da Garagem", type: "cover", icon: "DoorOpen", state: false, value: "fechado", locked: false },
      { id: "luz_garagem", name: "Luz da Garagem", type: "light", icon: "Lightbulb", state: false, value: 100, brightness: 100 },
      { id: "porta_entrada", name: "Porta de Entrada", type: "lock", icon: "Lock", state: true, value: "trancada", locked: true },
      { id: "cam_garagem", name: "Camera de Seguranca", type: "camera", icon: "Cctv", state: true, value: "gravando" },
    ],
  },
];

const MOCK_AUTOMATIONS: HomeAutomation[] = [
  { id: "autom_chegar_casa", name: "Chegar em Casa", description: "Abre o portao, liga a luz da sala e ajusta o ar-condicionado", icon: "Home", enabled: true, lastRun: null, steps: [{ deviceId: "portao", action: "open" }, { deviceId: "luz_sala", action: "on" }, { deviceId: "ar_sala", action: "on" }] },
  { id: "autom_boa_noite", name: "Boa Noite", description: "Desliga as luzes, tranca portas e arma o alarme", icon: "Moon", enabled: true, lastRun: null, steps: [{ deviceId: "luz_sala", action: "off" }, { deviceId: "luz_quarto", action: "off" }, { deviceId: "tv_sala", action: "off" }, { deviceId: "porta_entrada", action: "lock" }, { deviceId: "alarme", action: "arm" }] },
  { id: "autom_acordar", name: "Acordar", description: "Liga a cafeteira, abre o portao e liga a luz do quarto em 40%", icon: "Sunrise", enabled: true, lastRun: null, steps: [{ deviceId: "cafeteira", action: "on" }, { deviceId: "luz_quarto", action: "on", brightness: 40 }, { deviceId: "portao", action: "open" }] },
  { id: "autom_sair_casa", name: "Sair de Casa", description: "Desliga tudo, tranca a porta e arma o alarme", icon: "DoorClosed", enabled: true, lastRun: null, steps: [{ deviceId: "luz_sala", action: "off" }, { deviceId: "luz_cozinha", action: "off" }, { deviceId: "tv_sala", action: "off" }, { deviceId: "ar_sala", action: "off" }, { deviceId: "porta_entrada", action: "lock" }, { deviceId: "alarme", action: "arm" }] },
];

const MOCK_SCENES: HomeScene[] = [
  { id: "cena_cinema", name: "Modo Cinema", icon: "Clapperboard", description: "Luz da sala a 20% e TV ligada" },
  { id: "cena_jantar", name: "Modo Jantar", icon: "Utensils", description: "Luz da cozinha e sala em tons quentes" },
  { id: "cena_festa", name: "Modo Festa", icon: "PartyPopper", description: "Todas as luzes em 100%" },
  { id: "cena_economia", name: "Modo Economia", icon: "Leaf", description: "Reduz todas as luzes para 30%" },
];

function computeStatus(rooms: HomeRoom[], automations: HomeAutomation[]): HomeStatus {
  const all = rooms.flatMap((r) => r.devices);
  const lights = all.filter((d) => d.type === "light");
  const lightsOn = lights.filter((d) => d.state).length;
  const locks = all.filter((d) => d.type === "lock" || d.type === "cover");
  return {
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, icon: r.icon, devicesOn: r.devices.filter((d) => d.state).length, devices: r.devices.length })),
    devices: {
      total: all.length,
      on: all.filter((d) => d.state).length,
      open: all.filter((d) => d.state).length,
      lights: lights.length,
      lightsOn,
      locks: locks.length,
      locked: locks.filter((d) => d.locked).length,
      sensors: all.filter((d) => d.type === "sensor" || d.type === "binary_sensor").length,
      alerts: all.filter((d) => d.type === "binary_sensor" && d.state).length,
    },
    energy: {
      lights: `${Math.round(lightsOn * 9)} W`,
      climate: all.some((d) => d.type === "climate" && d.state) ? "1.2 kW" : "0 W",
      total: all.some((d) => d.type === "climate" && d.state) ? "1.3 kW" : "90 W",
    },
    automations: {
      total: automations.length,
      enabled: automations.filter((a) => a.enabled).length,
      ranToday: automations.filter((a) => a.lastRun && new Date(a.lastRun).toDateString() === new Date().toDateString()).length,
    },
    updatedAt: new Date().toISOString(),
  };
}

function loadPersisted(): Partial<{ rooms: HomeRoom[]; automations: HomeAutomation[]; config: HomeConfig }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

const persisted = loadPersisted();

const initialRooms = persisted.rooms && persisted.rooms.length ? persisted.rooms : MOCK_ROOMS;
const initialAutomations = persisted.automations && persisted.automations.length ? persisted.automations : MOCK_AUTOMATIONS;
const initialConfig: HomeConfig = persisted.config || { mode: "simulated", host: "", token: "", name: "", connected: false, simulated: true };

export interface HomeState {
  [key: string]: unknown;
  rooms: HomeRoom[];
  automations: HomeAutomation[];
  scenes: HomeScene[];
  config: HomeConfig;
  status: HomeStatus;
  loading: boolean;
  error: string | null;
}

const defaults: HomeState = {
  rooms: initialRooms,
  automations: initialAutomations,
  scenes: MOCK_SCENES,
  config: initialConfig,
  status: computeStatus(initialRooms, initialAutomations),
  loading: false,
  error: null,
};

export const useHomeStore = createStore<HomeState>(defaults);

export function persistHome() {
  try {
    const s = useHomeStore.getState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms: s.rooms, automations: s.automations, config: s.config }));
  } catch { /* ignore */ }
}

function applyToDevice(deviceId: string, fn: (d: HomeDevice) => void) {
  const s = useHomeStore.getState();
  const rooms = s.rooms.map((room) => ({
    ...room,
    devices: room.devices.map((d) => {
      if (d.id !== deviceId) return d;
      const copy = { ...d };
      fn(copy);
      return copy;
    }),
  }));
  useHomeStore.setState({ rooms, status: computeStatus(rooms, s.automations) });
  persistHome();
}

function syncBackend() {
  const orun = (window as any).orun;
  if (!orun || !orun.homeAssistant) return;
  orun.homeAssistant.getRooms().then((rooms: HomeRoom[]) => {
    if (rooms && rooms.length) {
      const s = useHomeStore.getState();
      useHomeStore.setState({ rooms, status: computeStatus(rooms, s.automations) });
      persistHome();
    }
  }).catch(() => { /* keep local */ });
  orun.homeAssistant.getAutomations().then((automations: HomeAutomation[]) => {
    if (automations && automations.length) {
      const s = useHomeStore.getState();
      useHomeStore.setState({ automations, status: computeStatus(s.rooms, automations) });
      persistHome();
    }
  }).catch(() => { /* keep local */ });
}

export function loadHomeFromBackend() {
  syncBackend();
}

export function saveHomeConfig(cfg: Partial<HomeConfig>): Promise<HomeConfig> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.setConfig(cfg).then((res: HomeConfig) => {
      useHomeStore.setState({ config: res });
      persistHome();
      return res;
    });
  }
  const updated: HomeConfig = { ...useHomeStore.getState().config, ...cfg, simulated: true, connected: false };
  useHomeStore.setState({ config: updated });
  persistHome();
  return Promise.resolve(updated);
}

export function toggleDevice(deviceId: string): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.callService(deviceId, "toggle", {}).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  applyToDevice(deviceId, (d) => {
    d.state = !d.state;
    d.value = d.state ? (typeof d.value === "number" ? d.brightness ?? d.value : "ligado") : "desligado";
  });
  return Promise.resolve({ success: true });
}

export function setBrightness(deviceId: string, brightness: number): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.callService(deviceId, "set_brightness", { brightness }).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  applyToDevice(deviceId, (d) => {
    d.brightness = brightness;
    d.state = brightness > 0;
    d.value = brightness;
  });
  return Promise.resolve({ success: true });
}

export function setTemperature(deviceId: string, temperature: number): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.callService(deviceId, "set_temperature", { temperature }).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  applyToDevice(deviceId, (d) => {
    d.temperature = temperature;
    d.value = temperature;
  });
  return Promise.resolve({ success: true });
}

export function lockDevice(deviceId: string, locked: boolean): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.callService(deviceId, locked ? "lock" : "unlock", {}).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  applyToDevice(deviceId, (d) => {
    d.locked = locked;
    d.state = locked;
    d.value = locked ? "trancado" : "destrancado";
  });
  return Promise.resolve({ success: true });
}

export function runAutomation(automationId: string): Promise<{ success: boolean; data?: any }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.runAutomation(automationId).then((res: { success: boolean; data?: any }) => {
      syncBackend();
      return res;
    });
  }
  const s = useHomeStore.getState();
  const automations = s.automations.map((a) => a.id === automationId ? { ...a, lastRun: new Date().toISOString() } : a);
  useHomeStore.setState({ automations, status: computeStatus(s.rooms, automations) });
  persistHome();
  return Promise.resolve({ success: true });
}

export function toggleAutomation(automationId: string): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.toggleAutomation(automationId).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  const s = useHomeStore.getState();
  const automations = s.automations.map((a) => a.id === automationId ? { ...a, enabled: !a.enabled } : a);
  useHomeStore.setState({ automations });
  persistHome();
  return Promise.resolve({ success: true });
}

export function activateScene(sceneId: string): Promise<{ success: boolean }> {
  const orun = (window as any).orun;
  if (orun && orun.homeAssistant) {
    return orun.homeAssistant.activateScene(sceneId).then((res: { success: boolean }) => {
      syncBackend();
      return res;
    });
  }
  const rooms = useHomeStore.getState().rooms.map((room) => ({
    ...room,
    devices: room.devices.map((d) => {
      if (d.type !== "light") return d;
      const copy = { ...d };
      if (sceneId === "cena_cinema") {
        copy.state = d.id === "luz_sala"; copy.brightness = d.id === "luz_sala" ? 20 : 0; copy.value = copy.brightness;
        if (d.id === "tv_sala") { copy.state = true; copy.value = "tocando"; }
      } else if (sceneId === "cena_jantar") { copy.state = true; copy.brightness = 55; copy.value = 55; }
      else if (sceneId === "cena_festa") { copy.state = true; copy.brightness = 100; copy.value = 100; }
      else if (sceneId === "cena_economia") { copy.state = true; copy.brightness = 30; copy.value = 30; }
      return copy;
    }),
  }));
  useHomeStore.setState({ rooms, status: computeStatus(rooms, useHomeStore.getState().automations) });
  persistHome();
  return Promise.resolve({ success: true });
}

export function refreshStatus() {
  const s = useHomeStore.getState();
  useHomeStore.setState({ status: computeStatus(s.rooms, s.automations) });
}

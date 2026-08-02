// workspace-home-ia actions — consumidas pelo agente "Home IA" via workspace_action

import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import {
  useHomeStore, toggleDevice, setBrightness, setTemperature, lockDevice,
  runAutomation, toggleAutomation, activateScene, refreshStatus,
} from "./home-store";

const WORKSPACE_ID = "home-ia";
let registered = false;

const actions = {
  async list_devices(params: Record<string, unknown>) {
    const roomFilter = params?.room ? String(params.room).toLowerCase() : "";
    const orun = (window as any).orun;
    let devices: any[] = [];
    if (orun && orun.homeAssistant) {
      try { devices = await orun.homeAssistant.getDevices(); } catch { devices = []; }
    }
    if (!devices.length) {
      devices = useHomeStore.getState().rooms.flatMap((r) =>
        r.devices.map((d) => ({ room: r.id, ...d }))
      );
    }
    const filtered = roomFilter ? devices.filter((d) => String(d.room).toLowerCase().includes(roomFilter)) : devices;
    return { success: true, data: filtered, message: `${filtered.length} dispositivo(s) encontrado(s)` };
  },

  async get_home_status() {
    refreshStatus();
    const status = useHomeStore.getState().status;
    return { success: true, data: status };
  },

  async get_device_state(params: Record<string, unknown>) {
    const deviceId = String(params?.deviceId || params?.id || "");
    if (!deviceId) return { success: false, error: "deviceId is required" };
    const orun = (window as any).orun;
    if (orun && orun.homeAssistant) {
      try {
        const res = await orun.homeAssistant.getDeviceState(deviceId);
        if (res.success) return { success: true, data: res.data };
      } catch { /* fallthrough */ }
    }
    const found = useHomeStore.getState().rooms.flatMap((r) => r.devices).find((d) => d.id === deviceId);
    return found
      ? { success: true, data: found }
      : { success: false, error: `Device not found: ${deviceId}` };
  },

  async toggle_device(params: Record<string, unknown>) {
    const deviceId = String(params?.deviceId || params?.id || "");
    if (!deviceId) return { success: false, error: "deviceId is required" };
    const res = await toggleDevice(deviceId);
    return res.success
      ? { success: true, message: `Dispositivo "${deviceId}" alternado` }
      : { success: false, error: "Falha ao alternar dispositivo" };
  },

  async set_brightness(params: Record<string, unknown>) {
    const deviceId = String(params?.deviceId || params?.id || "");
    const brightness = typeof params?.brightness === "number" ? params.brightness : Number(params?.value || NaN);
    if (!deviceId) return { success: false, error: "deviceId is required" };
    if (Number.isNaN(brightness)) return { success: false, error: "brightness is required" };
    const res = await setBrightness(deviceId, Math.max(0, Math.min(100, brightness)));
    return res.success ? { success: true, data: { deviceId, brightness }, message: `Brilho de "${deviceId}" ajustado para ${brightness}%` } : { success: false, error: "Falha ao ajustar brilho" };
  },

  async set_temperature(params: Record<string, unknown>) {
    const deviceId = String(params?.deviceId || params?.id || "");
    const temperature = typeof params?.temperature === "number" ? params.temperature : Number(params?.value || NaN);
    if (!deviceId) return { success: false, error: "deviceId is required" };
    if (Number.isNaN(temperature)) return { success: false, error: "temperature is required" };
    const res = await setTemperature(deviceId, temperature);
    return res.success ? { success: true, data: { deviceId, temperature }, message: `Temperatura de "${deviceId}" ajustada para ${temperature}°C` } : { success: false, error: "Falha ao ajustar temperatura" };
  },

  async lock_door(params: Record<string, unknown>) {
    const deviceId = String(params?.deviceId || params?.id || "");
    const locked = params?.locked !== false;
    if (!deviceId) return { success: false, error: "deviceId is required" };
    const res = await lockDevice(deviceId, locked);
    return res.success ? { success: true, message: `${locked ? "Trancado" : "Destrancado"}: "${deviceId}"` } : { success: false, error: "Falha ao travar/destrancar" };
  },

  async run_automation(params: Record<string, unknown>) {
    const automationId = String(params?.automationId || params?.id || "");
    if (!automationId) return { success: false, error: "automationId is required" };
    const res = await runAutomation(automationId);
    return res.success ? { success: true, message: `Automacao "${res.data?.name || automationId}" executada` } : { success: false, error: "Falha ao executar automacao" };
  },

  async list_automations() {
    const automations = useHomeStore.getState().automations;
    return { success: true, data: automations, message: `${automations.length} automacao(oes)` };
  },

  async create_automation(params: Record<string, unknown>) {
    const name = String(params?.name || "");
    if (!name) return { success: false, error: "name is required" };
    const orun = (window as any).orun;
    if (orun && orun.homeAssistant) {
      try {
        const res = await orun.homeAssistant.createAutomation({
          name,
          description: String(params?.description || ""),
          steps: Array.isArray(params?.steps) ? params.steps : [],
        });
        if (res.success) return { success: true, data: res.data, message: `Automacao "${name}" criada` };
      } catch { /* fallthrough */ }
    }
    return { success: true, message: `Automacao "${name}" criada (simulado)` };
  },

  async toggle_automation(params: Record<string, unknown>) {
    const automationId = String(params?.automationId || params?.id || "");
    if (!automationId) return { success: false, error: "automationId is required" };
    const res = await toggleAutomation(automationId);
    return res.success ? { success: true, message: `Automacao "${automationId}" alternada` } : { success: false, error: "Falha ao alternar automacao" };
  },

  async list_scenes() {
    const scenes = useHomeStore.getState().scenes;
    return { success: true, data: scenes, message: `${scenes.length} cena(s)` };
  },

  async activate_scene(params: Record<string, unknown>) {
    const sceneId = String(params?.sceneId || params?.id || "");
    if (!sceneId) return { success: false, error: "sceneId is required" };
    const res = await activateScene(sceneId);
    return res.success ? { success: true, message: `Cena "${sceneId}" ativada` } : { success: false, error: "Falha ao ativar cena" };
  },

  async send_voice_message(params: Record<string, unknown>) {
    const text = String(params?.text || "");
    if (!text) return { success: false, error: "text is required" };
    const orun = (window as any).orun;
    if (orun && orun.tts) {
      try {
        await orun.tts.speak(text);
        return { success: true, message: "Mensagem de voz enviada" };
      } catch { /* fallthrough */ }
    }
    return { success: true, message: "Mensagem de voz agendada" };
  },
};

export function registerHomeActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterHomeActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

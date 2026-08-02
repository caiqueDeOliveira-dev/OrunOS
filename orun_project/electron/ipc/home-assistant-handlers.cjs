// electron/ipc/home-assistant-handlers.cjs
// IPC handlers for the Home IA agent (smart home control).

const log = require("electron-log");

function register(ipcMain, ctx) {
  const { homeAssistant } = ctx;

  ipcMain.handle("homeassistant:get-config", () => homeAssistant.getConfig());

  ipcMain.handle("homeassistant:set-config", async (_event, cfg) => {
    try {
      const result = await homeAssistant.setConfig(cfg || {});
      log.info(`[home-assistant] config updated (mode=${result.mode}, connected=${result.connected})`);
      return result;
    } catch (err) {
      log.error("[home-assistant:set-config] failed:", err.message);
      return { ...homeAssistant.getConfig(), error: err.message || String(err) };
    }
  });

  ipcMain.handle("homeassistant:get-devices", () => homeAssistant.getDevices());

  ipcMain.handle("homeassistant:get-rooms", () => homeAssistant.getRooms());

  ipcMain.handle("homeassistant:get-states", async () => {
    try { return await homeAssistant.getStates(); }
    catch (err) { log.error("[home-assistant:get-states] failed:", err.message); return { mode: "simulated", states: [] }; }
  });

  ipcMain.handle("homeassistant:get-device-state", (_event, deviceId) => homeAssistant.getDeviceState(deviceId));

  ipcMain.handle("homeassistant:call-service", (_event, deviceId, service, params) => {
    try {
      const result = homeAssistant.callService(deviceId, service, params || {});
      log.info(`[home-assistant] call-service ${deviceId}/${service}`);
      return result;
    } catch (err) {
      log.error("[home-assistant:call-service] failed:", err.message);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("homeassistant:get-automations", () => homeAssistant.getAutomations());

  ipcMain.handle("homeassistant:run-automation", (_event, automationId) => {
    try { return homeAssistant.runAutomation(automationId); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("homeassistant:create-automation", (_event, params) => {
    try { return homeAssistant.createAutomation(params || {}); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("homeassistant:delete-automation", (_event, automationId) => {
    try { return homeAssistant.deleteAutomation(automationId); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("homeassistant:toggle-automation", (_event, automationId) => {
    try { return homeAssistant.toggleAutomation(automationId); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("homeassistant:get-scenes", () => homeAssistant.getScenes());

  ipcMain.handle("homeassistant:activate-scene", (_event, sceneId) => {
    try { return homeAssistant.activateScene(sceneId); }
    catch (err) { return { success: false, error: err.message || String(err) }; }
  });

  ipcMain.handle("homeassistant:get-status", () => homeAssistant.getHomeStatus());
}

module.exports = { register };

// workspace-home-ia types

export interface HomeDevice {
  id: string;
  name: string;
  type: "light" | "switch" | "climate" | "lock" | "cover" | "sensor" | "binary_sensor" | "camera" | "media_player";
  icon: string;
  state: boolean;
  value: string | number;
  brightness?: number;
  temperature?: number;
  locked?: boolean;
}

export interface HomeRoom {
  id: string;
  name: string;
  icon: string;
  devices: HomeDevice[];
}

export interface HomeAutomation {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  lastRun: string | null;
  steps: { deviceId: string; action: string; brightness?: number }[];
}

export interface HomeScene {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface HomeDeviceOn extends HomeDevice {
  room: string;
}

export interface HomeStatus {
  rooms: { id: string; name: string; icon: string; devicesOn: number; devices: number }[];
  devices: {
    total: number;
    on: number;
    open: number;
    lights: number;
    lightsOn: number;
    locks: number;
    locked: number;
    sensors: number;
    alerts: number;
  };
  energy: { lights: string; climate: string; total: string };
  automations: { total: number; enabled: number; ranToday: number };
  updatedAt: string;
}

export interface HomeConfig {
  mode: "simulated" | "real";
  host: string;
  token: string;
  name: string;
  connected: boolean;
  simulated: boolean;
  error?: string;
}

---
name: homelab
description: >
  HomeLab Agent — Gerencia Home Assistant, ESP32 satellites, dispositivos Zigbee/Matter/Thread, automações físicas, cameras, sensores. Camada de decisão e execução no hardware (não orquestração de software = Automação/n8n).
description_pt_BR: >
  Agente HomeLab — Gerencia Home Assistant, ESP32 satellites, dispositivos Zigbee/Matter/Thread, automações físicas, cameras, sensores. Camada de decisão e execução no hardware (não orquestração de software = Automação/n8n).
description_es: >
  Agente HomeLab — Gestiona Home Assistant, satélites ESP32, dispositivos Zigbee/Matter/Thread, automatizaciones físicas, cámaras, sensores. Capa de decisión y ejecución en hardware (no orquestración de software = Automatización/n8n).
type: hybrid
version: "1.0.0"
script:
  path: scripts/homelab.ts
  runtime: node
  dependencies: [mqtt, zod, node-hue-api, onvif]
mcp:
  server_name: homeassistant
  command: npx
  args: ["-y", "@home-assistant/mcp@latest"]
  transport: stdio
env:
  - HOME_ASSISTANT_URL
  - HOME_ASSISTANT_TOKEN
  - MQTT_BROKER_URL
  - MQTT_USERNAME
  - MQTT_PASSWORD
categories: [homelab, iot, home-assistant, esp32, zigbee, matter, thread, hardware, automation]
---

# HomeLab Skill

## When to Use

Use this skill for **physical world** automation — hardware devices, sensors, actuators, local network:
- **Home Assistant** — Entities, automations, scripts, scenes, dashboards
- **ESP32 Satellites** — Firmware deploy, sensor reading, actuator control, OTA updates
- **Zigbee/Matter/Thread** — Device pairing, binding, groups, firmware updates
- **Cameras/NVR** — ONVIF/RTSP streams, motion zones, recording, Frigate integration
- **Sensors** — Temperature, humidity, motion, contact, vibration, CO2, air quality
- **Actuators** — Relays, switches, dimmers, locks, valves, motors, covers
- **Energy** — Power monitoring, solar, battery, load management
- **Presence** — BLE, WiFi, UWB, radar — room-level, person-level

**NOT for:** Software workflow orchestration (n8n = Automação agent), API integrations, business logic.

## Architecture (Orun HomeLab)

```
┌─────────────────────────────────────────────────────────────┐
│                    HOME ASSISTANT (Core)                    │
│  • Entity Registry  • Automation Engine  • Script Runner   │
│  • Dashboard (Lovelace)  • History/Logbook  • Backup       │
└──────────────────────────┬──────────────────────────────────┘
                           │ MQTT / WS / HTTP
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ ESP32 Satellites│  │ Zigbee/Thread │  │   Cameras     │
│ (ESPHome)      │  │ (ZHA/Z2M)     │  │ (Frigate/ONVIF)│
└───────┬─────────┘  └───────┬───────┘  └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
   Sensors/Actuators    Sensors/Actuators    Video Streams
```

## Core Operations

### 1. Home Assistant MCP

```typescript
interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: { id: string; user_id?: string };
}

// Tools via MCP
const HA_TOOLS = {
  // States
  "ha_get_state": (entity_id: string) => HAEntity,
  "ha_get_states": () => HAEntity[],
  
  // Services (Actions)
  "ha_call_service": (domain: string, service: string, data: Record<string, unknown>) => void,
  
  // Automations
  "ha_trigger_automation": (automation_id: string) => void,
  "ha_enable_automation": (automation_id: string) => void,
  "ha_disable_automation": (automation_id: string) => void,
  
  // Scripts
  "ha_run_script": (script_id: string, variables?: Record<string, unknown>) => void,
  
  // Scenes
  "ha_activate_scene": (scene_id: string) => void,
  
  // Config
  "ha_reload_automations": () => void,
  "ha_reload_scripts": () => void,
  "ha_check_config": () => { valid: boolean; errors: string[] },
  
  // History
  "ha_get_history": (entity_ids: string[], start_time: string, end_time?: string) => HAEntity[][],
  
  // Templates
  "ha_render_template": (template: string) => string,
};
```

### 2. ESP32 Satellite Management (ESPHome)

```typescript
interface ESPSatellite {
  name: string;
  ip: string;
  mac: string;
  firmware_version: string;
  sensors: ESPSensor[];
  actuators: ESPActuator[];
  status: "online" | "offline" | "updating";
  last_seen: string;
}

interface ESPSensor {
  key: string;
  name: string;
  unit: string;
  device_class: string;
  state_class: "measurement" | "total_increasing";
  accuracy_decimals: number;
}

interface ESPActuator {
  key: string;
  name: string;
  type: "switch" | "light" | "cover" | "valve" | "lock";
  optimistic: boolean;
}
```

**Operations:**
```typescript
async function deployESPHome(satellite: ESPSatellite, config: ESPHomeConfig): Promise<void>
async function otaUpdate(name: string, firmwareUrl: string): Promise<void>
async function readSensor(name: string, sensorKey: string): Promise<number | string>
async function controlActuator(name: string, actuatorKey: string, value: unknown): Promise<void>
async function getSatelliteStatus(name: string): Promise<ESPSatellite>
async function discoverSatellites(): Promise<ESPSatellite[]>
```

### 3. Zigbee/Thread (ZHA / Zigbee2MQTT)

```typescript
interface ZigbeeDevice {
  ieee_address: string;
  friendly_name: string;
  type: "router" | "end_device" | "coordinator";
  manufacturer: string;
  model: string;
  firmware_version: string;
  power_source: "battery" | "mains";
  endpoints: ZigbeeEndpoint[];
}

interface ZigbeeEndpoint {
  endpoint: number;
  clusters: {
    input: number[];
    output: number[];
  };
  binds: string[]; // Target IEEE addresses
}
```

**Operations:**
```typescript
async function permitJoin(duration: number): Promise<void> // Open network for pairing
async function pairDevice(ieee: string): Promise<ZigbeeDevice>
async function removeDevice(ieee: string): Promise<void>
async function readAttribute(ieee: string, cluster: number, attribute: number): Promise<unknown>
async function writeAttribute(ieee: string, cluster: number, attribute: number, value: unknown): Promise<void>
async function bindDevices(sourceIeee: string, targetIeee: string, cluster: number): Promise<void>
async function updateFirmware(ieee: string, firmwareUrl: string): Promise<void>
async function getNetworkMap(): Promise<ZigbeeNetworkMap>
```

### 4. Cameras (Frigate + ONVIF)

```typescript
interface Camera {
  name: string;
  rtsp_url: string;
  onvif_url?: string;
  frigate_enabled: boolean;
  detect: {
    enabled: boolean;
    model: "yolox" | "yolov8" | "cpu" | "tpu";
    objects: string[]; // person, car, dog, cat, package
  };
  zones: CameraZone[];
  recording: {
    enabled: boolean;
    retain_days: number;
    motion_only: boolean;
  };
}

interface CameraZone {
  name: string;
  coordinates: number[][]; // [[x1,y1], [x2,y2], ...]
  objects: string[];
  inertia: number; // ms
}
```

**Operations:**
```typescript
async function getSnapshot(camera: string): Promise<Buffer>
async function getStreamUrl(camera: string): Promise<string> // HLS/WebRTC
async function getEvents(camera: string, since: string): Promise<CameraEvent[]>
async function setMotionZone(camera: string, zone: string, enabled: boolean): Promise<void>
async function triggerRecording(camera: string, duration: number): Promise<void>
async function downloadClip(camera: string, event_id: string): Promise<Buffer>
```

### 5. Automation Engine (Local Decision Making)

```typescript
interface HomeAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  mode: "single" | "restart" | "queued" | "parallel";
  enabled: boolean;
}

type AutomationTrigger =
  | { type: "state"; entity_id: string; to?: string; from?: string; for?: string }
  | { type: "numeric_state"; entity_id: string; above?: number; below?: number }
  | { type: "time"; at: string; days?: string[] }
  | { type: "sun"; event: "sunrise" | "sunset"; offset?: string }
  | { type: "mqtt"; topic: string; payload?: string }
  | { type: "webhook"; webhook_id: string }
  | { type: "device"; device_id: string; type: string; subtype?: string };

type AutomationCondition =
  | { type: "state"; entity_id: string; state: string }
  | { type: "numeric_state"; entity_id: string; above?: number; below?: number }
  | { type: "template"; value_template: string }
  | { type: "time"; after: string; before: string }
  | { type: "zone"; entity_id: string; zone: string };

type AutomationAction =
  | { type: "service"; domain: string; service: string; data: Record<string, unknown> }
  | { type: "delay"; duration: string }
  | { type: "wait_template"; template: string; timeout?: string }
  | { type: "choose"; conditions: AutomationCondition[]; sequence: AutomationAction[] }
  | { type: "repeat"; count?: number; while?: AutomationCondition[]; sequence: AutomationAction[] };
```

**Safety Rules (Hardcoded):**
- No automation can unlock doors without explicit user confirmation
- No automation can disable security cameras/alarms
- No automation can override manual switch state (last user wins)
- Energy: Total load < main breaker rating (circuit protection)
- Water: Valve close on leak detection (fail-safe)

### 6. Presence & Room-Level Tracking

```typescript
interface PresenceSensor {
  type: "ble" | "wifi" | "uwb" | "radar" | "pir" | "mmwave";
  room: string;
  device_tracker: string; // HA entity
  confidence: number; // 0-1
  timeout: number; // seconds to consider "away"
}

interface PersonPresence {
  person_id: string;
  current_room: string | "away" | "unknown";
  room_history: { room: string; entered_at: string; left_at?: string }[];
  confidence_by_room: Record<string, number>;
}
```

**Fusion Algorithm:**
1. Collect signals from all presence sensors
2. Weight by sensor type (UWB > BLE > WiFi > PIR)
3. Apply room transition hysteresis (30s min dwell)
4. Output: `person.<name>_room` sensor + `device_tracker` update

## Energy Management

```typescript
interface EnergyMonitor {
  mains: {
    power_w: number;
    voltage_v: number;
    current_a: number;
    frequency_hz: number;
    power_factor: number;
  };
  circuits: Record<string, { power_w: number; energy_kwh: number }>;
  solar: {
    production_w: number;
    production_kwh_today: number;
  };
  battery: {
    soc_percent: number;
    charge_w: number;
    discharge_w: number;
  };
  tariffs: {
    current: "peak" | "intermediate" | "off_peak";
    rates: Record<string, number>; // R$/kWh
  };
}
```

**Automations:**
- Load shifting: Delay non-critical (water heater, EV charger, dishwasher) to off-peak
- Solar optimization: Run appliances when solar > consumption
- Battery: Charge from solar, discharge during peak
- Alert: Mains > 80% breaker rating

## Device Templates (Standardized)

### Sensor Template
```yaml
# ESPHome sensor template
sensor:
  - platform: dht
    model: DHT22
    pin: GPIO4
    temperature:
      name: "${room} Temperature"
      filters: [offset: -0.5]
    humidity:
      name: "${room} Humidity"
    update_interval: 30s
```

### Actuator Template (Relay)
```yaml
switch:
  - platform: gpio
    name: "${room} Light"
    pin: GPIO12
    restore_mode: ALWAYS_OFF
    interlock: ["${room} Fan"] # Mutual exclusion
```

### Multi-Sensor (Aqara FP2 / mmWave)
```yaml
# Multiple zones from one mmWave sensor
binary_sensor:
  - platform: aqara_fp2
    zone: "bed"
    name: "Bedroom Bed Occupancy"
  - platform: aqara_fp2
    zone: "desk"
    name: "Bedroom Desk Occupancy"
```

## Security & Privacy

### Network Isolation
- IoT VLAN (no internet access, only MQTT to HA)
- ESP32: Static IPs, MAC filtering
- Cameras: No cloud, local NVR only (Frigate)
- MQTT: TLS + username/password, ACL per device

### Data Retention
- Entity states: 7 days (HA recorder purge)
- Camera events: 14 days (Frigate)
- Energy data: 1 year (aggregated hourly)
- Automation traces: 30 days

### Access Control
- HA: Local users only, no cloud (unless explicitly enabled)
- ESPHome: API encryption enabled
- MQTT: Per-device credentials, topic ACLs
- Frigate: Local auth, no external access

## Testing & Validation

### Pre-Deploy Checklist
- [ ] ESPHome config validates (`esphome compile`)
- [ ] Zigbee device pairs, reports state, binds work
- [ ] Camera stream accessible, detection works, zones trigger
- [ ] Automation: triggers, conditions, actions all fire correctly
- [ ] Safety: Door unlock requires confirmation, valves fail-safe
- [ ] Network: IoT VLAN isolated, MQTT TLS works
- [ ] Backup: HA snapshot created, ESPHome configs in git

### Regression Tests (Monthly)
- [ ] All sensors report within expected ranges
- [ ] All actuators respond within 2s
- [ ] Zigbee network map healthy (LQI > 100)
- [ ] Camera detection accuracy > 90% (sample 50 events)
- [ ] Energy totals match utility bill (±5%)
- [ ] Presence tracking: no ghost rooms, no stuck states

## Handoff

**To:** Head of Infra/Security (network, security), VP Tech (architecture)
**From:** ESP32 firmware (OTA), Zigbee devices (pairing), Cameras (events)
**Consumers:** Hampton (presence → routines), Automação (n8n triggers via webhook), Energy (billing)
**Key Distinction:** HomeLab = **physical hardware decisions**. Automação = **software workflow orchestration**. They handoff via webhooks/MQTT.
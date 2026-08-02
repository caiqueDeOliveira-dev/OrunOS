// workspace-home-ia / HomeWorkspace.tsx
// SmartThings-style smart home dashboard.

import { useState, useEffect, useMemo } from "react";
import {
  Home, Lightbulb, Lamp, Snowflake, Tv, Radar, Bed, Thermometer,
  ThermometerSun, Droplets, Lock, Unlock, ChefHat, Coffee, Refrigerator,
  Flame, Car, DoorOpen, Cctv, Zap, RefreshCw, Play, Moon, Sunrise, DoorClosed,
  Clapperboard, Utensils, PartyPopper, Leaf, Settings, Wifi, WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { AIFloatingPrompt } from "../../components/AIFloatingPrompt";
import {
  useHomeStore, loadHomeFromBackend, toggleDevice, setBrightness,
  setTemperature, lockDevice, runAutomation, toggleAutomation, activateScene,
  saveHomeConfig,
} from "./home-store";
import type { HomeDevice } from "./home-types";

type TabId = "devices" | "automations" | "scenes";

const ROOM_ICONS: Record<string, LucideIcon> = { Sofa: Home, Bed, ChefHat, Car };
const DEVICE_ICONS: Record<string, LucideIcon> = {
  Lightbulb, Lamp, Snowflake, Tv, Radar, Thermometer, ThermometerSun,
  Droplets, Lock, ChefHat, Coffee, Refrigerator, Flame, Car, DoorOpen, Cctv,
};

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "devices", label: "Dispositivos", icon: Lightbulb },
  { id: "automations", label: "Automacoes", icon: Zap },
  { id: "scenes", label: "Cenas", icon: Clapperboard },
];

function cardStyle(): React.CSSProperties {
  return { padding: "16px", borderRadius: "12px", background: "var(--card)", border: "1px solid var(--border)" };
}

function DeviceIcon({ device, size = 18 }: { device: HomeDevice; size?: number }) {
  const Icon = DEVICE_ICONS[device.icon] || Zap;
  const isOn = Boolean(device.state || device.locked);
  return <Icon size={size} color={isOn ? "#22C55E" : "var(--muted-foreground)"} />;
}

function LockIcon({ locked }: { locked?: boolean }) {
  return locked ? <Lock size={18} color="#22C55E" /> : <Unlock size={18} color="#EAB308" />;
}

function DeviceCard({ device }: { device: HomeDevice }) {
  const isLight = device.type === "light";
  const isClimate = device.type === "climate";
  const isLock = device.type === "lock" || device.type === "cover";
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="p-4 rounded-xl flex flex-col gap-2.5" style={{ ...cardStyle(), background: "var(--secondary)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {isLock ? <LockIcon locked={device.locked} /> : <DeviceIcon device={device} />}
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{device.name}</p>
            <p className="text-[9px] truncate" style={{ color: "var(--muted-foreground)" }}>
              {isLight ? `${device.brightness ?? 0}%` : isClimate ? `${device.temperature ?? 0}°C` : device.value}
            </p>
          </div>
        </div>
        {!isClimate && !isLight && !isLock && (
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            disabled={busy}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: device.state ? "rgba(34,197,94,0.18)" : "var(--card)",
              border: device.state ? "1px solid rgba(34,197,94,0.4)" : "1px solid var(--border)",
            }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: device.state ? "#22C55E" : "var(--muted-foreground)" }} />
          </button>
        )}
        {isLock && (
          <button
            onClick={() => run(() => lockDevice(device.id, !device.locked))}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg text-[9px] font-medium"
            style={{ background: device.locked ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: device.locked ? "#22C55E" : "#EAB308" }}
          >
            {device.locked ? "Trancado" : "Destrancado"}
          </button>
        )}
      </div>

      {isLight && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: device.state ? "rgba(34,197,94,0.15)" : "var(--card)", border: "1px solid var(--border)" }}
          >
            {device.state ? <Lightbulb size={14} color="#22C55E" /> : <Lightbulb size={14} color="var(--muted-foreground)" />}
          </button>
          <input
            type="range" min={0} max={100}
            value={device.brightness ?? 0}
            onChange={(e) => run(() => setBrightness(device.id, Number(e.target.value)))}
            className="flex-1"
            style={{ accentColor: "#22C55E" }}
          />
        </div>
      )}

      {isClimate && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: device.state ? "rgba(34,197,94,0.15)" : "var(--card)", border: "1px solid var(--border)" }}
          >
            <Snowflake size={14} color={device.state ? "#0EA5E9" : "var(--muted-foreground)"} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => run(() => setTemperature(device.id, (device.temperature ?? 22) - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >−</button>
            <span className="text-xs font-semibold w-10 text-center" style={{ color: "var(--foreground)" }}>{device.temperature ?? 0}°C</span>
            <button
              onClick={() => run(() => setTemperature(device.id, (device.temperature ?? 22) + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
            >+</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigModal({ onClose }: { onClose: () => void }) {
  const config = useHomeStore((s) => s.config);
  const [host, setHost] = useState(config.host);
  const [token, setToken] = useState(config.token);
  const [name, setName] = useState(config.name);
  const [mode, setMode] = useState<"simulated" | "real">(config.mode);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await saveHomeConfig({ mode, host, token, name });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md p-6 rounded-2xl flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Configuracao da Casa Inteligente</h3>

        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
          {(["simulated", "real"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 px-3 py-2 rounded-lg text-[10px]"
              style={{ background: mode === m ? "linear-gradient(135deg, #22C55E, #16A34A)" : "transparent", color: mode === m ? "#fff" : "var(--muted-foreground)" }}>
              {m === "simulated" ? "Modo Simulado" : "Home Assistant"}
            </button>
          ))}
        </div>

        {mode === "real" && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-medium" style={{ color: "var(--muted-foreground)" }}>URL do Home Assistant</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="http://192.168.0.10:8123"
                className="px-3 py-2 rounded-lg text-[10px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-medium" style={{ color: "var(--muted-foreground)" }}>Token de acesso (long-lived)</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="eyJ... (Perfil > Tokens)"
                className="px-3 py-2 rounded-lg text-[10px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-medium" style={{ color: "var(--muted-foreground)" }}>Nome da casa (opcional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha Casa"
            className="px-3 py-2 rounded-lg text-[10px]" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }} />
        </label>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[10px]" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-[10px] font-medium" style={{ background: "#22C55E", color: "#fff" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeWorkspace({ onSendMessage }: WorkspaceProps) {
  const rooms = useHomeStore((s) => s.rooms);
  const automations = useHomeStore((s) => s.automations);
  const scenes = useHomeStore((s) => s.scenes);
  const config = useHomeStore((s) => s.config);
  const status = useHomeStore((s) => s.status);
  const [activeTab, setActiveTab] = useState<TabId>("devices");
  const [showConfig, setShowConfig] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadHomeFromBackend();
  }, []);

  const stats = useMemo(() => [
    { label: "Dispositivos", value: `${status.devices.on}/${status.devices.total}`, icon: Zap },
    { label: "Luzes", value: `${status.devices.lightsOn}/${status.devices.lights}`, icon: Lightbulb },
    { label: "Fechaduras", value: `${status.devices.locked}/${status.devices.locks}`, icon: Lock },
    { label: "Automacoes", value: `${status.automations.enabled}`, icon: RefreshCw },
  ], [status]);

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto" style={{ background: "var(--background)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22C55E, #0EA5E9)" }}>
            <Home size={18} color="#fff" />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>Home IA — Casa Inteligente</h2>
            <p className="text-[10px] flex items-center gap-1" style={{ color: config.connected ? "#22C55E" : "var(--muted-foreground)" }}>
              {config.connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {config.connected ? "Conectado ao Home Assistant" : config.simulated ? "Modo Simulado ativo" : "Nao conectado"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px]"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
        >
          <Settings size={11} /> Configurar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3" style={cardStyle()}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                <Icon size={15} color="#22C55E" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{stat.value}</p>
                <p className="text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-all flex-1 justify-center"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: active ? "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(14,165,233,0.08))" : "transparent",
                color: active ? "#16A34A" : "var(--muted-foreground)",
                fontWeight: active ? 500 : 300,
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const RoomIcon = ROOM_ICONS[room.icon] || Home;
            return (
              <div key={room.id} className="p-4 rounded-xl flex flex-col gap-3" style={cardStyle()}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RoomIcon size={16} color="#16A34A" />
                    <span className="text-[11px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{room.name}</span>
                  </div>
                  <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#16A34A" }}>
                    {room.devices.filter((d) => d.state || d.locked).length}/{room.devices.length} ativos
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {room.devices.map((device) => <DeviceCard key={device.id} device={device} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "automations" && (
        <div className="grid gap-2">
          {automations.length === 0 && (
            <div className="p-12 rounded-xl text-center text-xs" style={{ ...cardStyle(), borderStyle: "dashed", color: "var(--muted-foreground)" }}>
              Nenhuma automacao criada ainda.
            </div>
          )}
          {automations.map((automation) => {
            const Icon = automation.icon === "Moon" ? Moon : automation.icon === "Sunrise" ? Sunrise : automation.icon === "DoorClosed" ? DoorClosed : Play;
            return (
              <div key={automation.id} className="p-4 rounded-xl flex items-center justify-between gap-3" style={cardStyle()}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: automation.enabled ? "rgba(34,197,94,0.12)" : "var(--secondary)" }}>
                    <Icon size={16} color={automation.enabled ? "#16A34A" : "var(--muted-foreground)"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{automation.name}</p>
                    <p className="text-[9px] truncate" style={{ color: "var(--muted-foreground)" }}>
                      {automation.lastRun ? `Executada ${new Date(automation.lastRun).toLocaleString("pt-BR")}` : automation.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => runAction(automation.id, () => toggleAutomation(automation.id))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: automation.enabled ? "rgba(34,197,94,0.15)" : "var(--secondary)", border: "1px solid var(--border)" }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: automation.enabled ? "#22C55E" : "var(--muted-foreground)" }} />
                  </button>
                  <button
                    onClick={() => runAction(automation.id, () => runAutomation(automation.id))}
                    disabled={!automation.enabled || busy === automation.id}
                    className="px-3 py-1.5 rounded-lg text-[9px] font-medium flex items-center gap-1"
                    style={{ background: "#22C55E", color: "#fff", opacity: automation.enabled ? 1 : 0.4 }}
                  >
                    <Play size={10} /> Executar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "scenes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenes.map((scene) => {
            const Icon = scene.icon === "Utensils" ? Utensils : scene.icon === "PartyPopper" ? PartyPopper : scene.icon === "Leaf" ? Leaf : Clapperboard;
            return (
              <button
                key={scene.id}
                onClick={() => runAction(scene.id, () => activateScene(scene.id))}
                className="p-4 rounded-xl flex flex-col gap-2 text-left hover:opacity-90 transition-opacity"
                style={{ ...cardStyle(), background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(14,165,233,0.06))" }}
              >
                <Icon size={20} color="#16A34A" />
                <span className="text-[11px] font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: "var(--foreground)" }}>{scene.name}</span>
                <span className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{scene.description}</span>
              </button>
            );
          })}
        </div>
      )}

      <AIFloatingPrompt onSendMessage={onSendMessage} label="Controlar por voz" />
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  );
}

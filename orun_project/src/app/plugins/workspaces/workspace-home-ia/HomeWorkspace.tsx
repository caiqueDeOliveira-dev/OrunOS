// workspace-home-ia / HomeWorkspace.tsx
// Premium Orun OS Home dashboard — dark, minimal, Samsung SmartThings / Apple Home inspired.
// Navegação interna por páginas: Home (dashboard 3 colunas), Assistente, Casa,
// Dispositivos, Câmeras, Cenários, Automações, Sistema e Configurações.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import {
  Home as HomeIcon, Lightbulb, Lamp, Snowflake, Tv, Radar, Thermometer,
  ThermometerSun, Droplets, Lock, Unlock, ChefHat, Coffee, Refrigerator,
  Flame, Car, DoorOpen, Cctv, Zap, Moon, Sunrise, DoorClosed,
  Clapperboard, Utensils, PartyPopper, Leaf, Settings, Wifi, WifiOff,
  Music, Mic, Bot, MonitorCog, Sofa, ChevronRight, CloudSun, ShieldCheck,
  CheckCircle2, Sparkles, ArrowLeft, Bed, Play, RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceProps } from "../../types";
import { P, HS_SCROLL } from "../premium";
import { usePersonalization } from "../../../hooks/usePersonalization";
import { HomeHampton } from "./HomeHampton";
import {
  useHomeStore, loadHomeFromBackend, toggleDevice, setBrightness,
  setTemperature, lockDevice, runAutomation, toggleAutomation, activateScene,
  saveHomeConfig, refreshStatus,
} from "./home-store";
import type { HomeDevice, HomeAutomation, HomeScene, HomeStatus, HomeConfig } from "./home-types";


type HomePage =
  | "home" | "assistente" | "casa" | "dispositivos"
  | "cameras" | "cenarios" | "automacoes" | "sistema" | "config";

const MENU: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "assistente", label: "Assistente", icon: Bot },
  { id: "casa", label: "Casa", icon: Sofa },
  { id: "dispositivos", label: "Dispositivos", icon: Lightbulb },
  { id: "cameras", label: "Câmeras", icon: Cctv },
  { id: "cenarios", label: "Cenários", icon: Clapperboard },
  { id: "automacoes", label: "Automações", icon: Zap },
  { id: "sistema", label: "Sistema", icon: MonitorCog },
  { id: "config", label: "Configurações", icon: Settings },
];

const MENU_PAGE: Record<string, HomePage> = {
  home: "home", assistente: "assistente", casa: "casa", dispositivos: "dispositivos",
  cameras: "cameras", cenarios: "cenarios", automacoes: "automacoes",
  sistema: "sistema", config: "config",
};

const FOOTER: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "assistente", label: "IA", icon: Bot },
  { id: "casa", label: "Casa", icon: Sofa },
  { id: "cameras", label: "Câmeras", icon: Cctv },
  { id: "sistema", label: "Sistema", icon: MonitorCog },
];

const DEVICE_ICONS: Record<string, LucideIcon> = {
  Lightbulb, Lamp, Snowflake, Tv, Radar, Thermometer, ThermometerSun,
  Droplets, Lock, ChefHat, Coffee, Refrigerator, Flame, Car, DoorOpen, Cctv,
};

const ROOM_ICONS: Record<string, LucideIcon> = {
  Sofa, Bed, ChefHat, Car,
};

const CAMERAS = [
  { id: "cam_entrada", name: "Entrada principal", bg: "radial-gradient(120% 120% at 22% 12%, #1c1c20 0%, #0a0a0d 62%)" },
  { id: "cam_garagem", name: "Garagem", bg: "radial-gradient(120% 120% at 78% 18%, #201719 0%, #0a0a0d 62%)" },
  { id: "cam_quintal", name: "Quintal", bg: "radial-gradient(120% 120% at 45% 88%, #151a17 0%, #0a0a0d 62%)" },
  { id: "cam_sala", name: "Sala", bg: "radial-gradient(120% 120% at 62% 42%, #191722 0%, #0a0a0d 62%)" },
];

const FAVORITE_IDS = [
  "luz_sala", "ar_sala", "portao", "tv_sala",
  "porta_entrada", "luz_cozinha", "luz_quarto", "cafeteira",
];

const AUTOMATION_TIMES: Record<string, string> = {
  autom_chegar_casa: "18:00",
  autom_boa_noite: "22:30",
  autom_acordar: "07:00",
  autom_sair_casa: "08:00",
};

const DEVICE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "light", label: "Luzes" },
  { id: "climate", label: "Clima" },
  { id: "security", label: "Segurança" },
  { id: "camera", label: "Câmeras" },
  { id: "other", label: "Outros" },
];

function automationIcon(name: string): LucideIcon {
  if (name === "Moon") return Moon;
  if (name === "Sunrise") return Sunrise;
  if (name === "DoorClosed") return DoorClosed;
  if (name === "Home") return HomeIcon;
  return Zap;
}

function sceneIcon(name: string): LucideIcon {
  if (name === "Utensils") return Utensils;
  if (name === "PartyPopper") return PartyPopper;
  if (name === "Leaf") return Leaf;
  return Clapperboard;
}

function chipColor(tone: "ok" | "err" | "warn" | "neutral"): string {
  if (tone === "ok") return P.success;
  if (tone === "err") return P.error;
  if (tone === "warn") return P.alert;
  return P.sub;
}

// ── Shared bits ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, right, onClick }: {
  icon: LucideIcon; title: string; right?: ReactNode; onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="flex items-center gap-2 min-w-0 group"
        style={{ cursor: onClick ? "pointer" : "default" }}
      >
        <Icon size={14} strokeWidth={1.8} color={P.primary} className="shrink-0" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] truncate" style={{ color: P.text }}>{title}</h3>
        {onClick && <ChevronRight size={12} color={P.dim} className="shrink-0 transition-transform group-hover:translate-x-0.5" />}
      </button>
      {right}
    </div>
  );
}

function PageHeader({ icon: Icon, title, subtitle, onBack }: {
  icon: LucideIcon; title: string; subtitle?: string; onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105 hover:shadow-[0_0_16px_color-mix(in srgb, var(--primary) 15%, transparent)]"
        style={{ background: P.card, border: `1px solid ${P.border}`, color: P.sub }}
        title="Voltar para a Home"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: P.primary }}>
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold truncate" style={{ color: P.text }}>{title}</h2>
        {subtitle && <p className="text-[10px] mt-0.5 truncate" style={{ color: P.sub }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function Greeting() {
  const { greeting, userName } = usePersonalization();
  return (
    <div className="px-1">
      <h1 className="text-[26px] leading-[1.18] font-semibold" style={{ color: P.text }}>
        {greeting},<br />{userName}
      </h1>
      <p className="text-[11px] mt-2.5" style={{ color: P.sub }}>Todos os sistemas operacionais</p>
    </div>
  );
}

function ClockBlock({ now }: { now: Date }) {
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  return (
    <div className="flex items-baseline justify-end gap-3 px-1">
      <span className="text-[11px] capitalize" style={{ color: P.sub }}>{date}</span>
      <span className="text-[38px] leading-none font-semibold tabular-nums" style={{ color: P.text, fontVariantNumeric: "tabular-nums" }}>{time}</span>
    </div>
  );
}

function CasaSeguraCard({ temp, humidity, online, onClick }: { temp: string; humidity: string; online: boolean; onClick: () => void }) {
  const t = parseFloat(temp) || 23;
  const hi = Math.round(t + 5);
  const lo = Math.max(10, Math.round(t - 4));
  return (
    <button
      onClick={onClick}
      className="rounded-[20px] p-5 flex flex-col gap-4 text-left transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_color-mix(in srgb, var(--primary) 8%, transparent)]"
      style={{ background: P.card, border: `1px solid ${P.border}`, cursor: "pointer" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold" style={{ color: P.text }}>Casa Segura</p>
        <ShieldCheck size={15} strokeWidth={1.8} color={online ? P.success : P.alert} />
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: P.dim }}>Clima</p>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: P.primary }}>
            <CloudSun size={24} strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[38px] leading-none font-semibold tabular-nums" style={{ color: P.text }}>{Math.round(t)}°</p>
            <p className="text-[10px] mt-1.5" style={{ color: P.sub }}>Poucas nuvens</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 text-[10px]">
          <span className="tabular-nums" style={{ color: P.sub }}>{hi}° / {lo}°</span>
          <span className="w-px h-3" style={{ background: P.borderHi }} />
          <span style={{ color: P.sub }}>Umidade: {humidity}</span>
        </div>
      </div>
    </button>
  );
}

function StatusCard({ icon: Icon, label, value, status, tone }: {
  icon: LucideIcon; label: string; value: string; status: string; tone: "ok" | "err" | "warn" | "neutral";
}) {
  const c = chipColor(tone);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] px-4 py-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: P.card2, color: P.primary }}>
          <Icon size={16} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>{label}</p>
          <p className="text-[13px] font-semibold mt-0.5 tabular-nums truncate" style={{ color: P.text }}>{value}</p>
        </div>
      </div>
      <span className="flex items-center gap-1.5 text-[9px] font-medium shrink-0" style={{ color: c }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
        {status}
      </span>
    </div>
  );
}

function AutomationRow({ automation }: { automation: HomeAutomation }) {
  const Icon = automationIcon(automation.icon);
  const time = AUTOMATION_TIMES[automation.id];
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] px-4 py-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--ok) 10%, transparent)", color: P.success }}>
          <Icon size={16} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium truncate" style={{ color: P.text }}>{automation.name}</p>
          <p className="text-[9px] mt-0.5 flex items-center gap-1.5" style={{ color: P.sub }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: P.success, boxShadow: `0 0 6px ${P.success}`, animation: "orunStatePulse 1.6s ease-in-out infinite" }} />
            Em execução
          </p>
        </div>
      </div>
      {time && <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: P.sub }}>{time}</span>}
    </div>
  );
}

function SceneTile({ scene, active, onActivate }: { scene: HomeScene; active: boolean; onActivate: () => void }) {
  const Icon = sceneIcon(scene.icon);
  return (
    <button
      onClick={onActivate}
      className="flex items-center gap-2.5 rounded-[18px] px-4 py-3 text-left transition-all hover:scale-[1.02] active:scale-95"
      style={{
        background: "linear-gradient(160deg, color-mix(in srgb, var(--primary) 8%, transparent), var(--surface-2) 65%)",
        border: active ? `1px solid color-mix(in srgb, var(--primary) 55%, transparent)` : `1px solid ${P.border}`,
        boxShadow: active ? "0 0 18px color-mix(in srgb, var(--primary) 14%, transparent)" : "none",
      }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: P.primary }}>
        <Icon size={14} strokeWidth={1.7} />
      </span>
      <span className="text-[11px] font-medium truncate" style={{ color: active ? P.text : P.sub }}>{scene.name}</span>
      {active && <CheckCircle2 size={13} color={P.success} className="ml-auto shrink-0" />}
    </button>
  );
}

function ShortcutChip({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1.5 rounded-[18px] py-3 px-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      style={{ background: P.card, border: `1px solid ${P.border}` }}
    >
      <Icon size={16} strokeWidth={1.7} color={P.primary} />
      <span className="text-[10px] font-medium" style={{ color: P.text }}>{label}</span>
    </button>
  );
}

// ── Device / favorite card ──────────────────────────────────────────────
function FavoriteDeviceCard({ device }: { device: HomeDevice }) {
  const isLight = device.type === "light";
  const isClimate = device.type === "climate";
  const isLock = device.type === "lock" || device.type === "cover";
  const isToggle = !isLight && !isClimate && !isLock;
  const active = Boolean(device.state || device.locked);
  const Icon = DEVICE_ICONS[device.icon] || Zap;
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  let statusText: string;
  if (isLight) statusText = `${device.brightness ?? 0}% de brilho`;
  else if (isClimate) statusText = `${device.temperature ?? 0}°C`;
  else if (isLock) statusText = device.type === "cover"
    ? (device.locked ? "Fechado" : "Aberto")
    : (device.locked ? "Trancado" : "Destrancado");
  else statusText = String(device.value);

  return (
    <div className="flex flex-col gap-3 rounded-[18px] p-4 transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in srgb, var(--primary) 10%, transparent)]" style={{ background: P.card, border: `1px solid ${P.border}` }}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : P.card2, boxShadow: active ? "0 0 14px color-mix(in srgb, var(--primary) 20%, transparent)" : "none", color: active ? P.primary : P.sub }}>
            <Icon size={18} strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: P.text }}>{device.name}</p>
            <p className="text-[10px] mt-1 flex items-center gap-1.5" style={{ color: P.sub }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? P.success : P.dim, boxShadow: active ? `0 0 6px ${P.success}` : "none" }} />
              {statusText}
            </p>
          </div>
        </div>
        {isToggle && (
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            disabled={busy}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: active ? "color-mix(in srgb, var(--ok) 14%, transparent)" : P.card2, border: `1px solid ${active ? "color-mix(in srgb, var(--ok) 40%, transparent)" : P.borderHi}` }}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: active ? P.success : P.dim }} />
          </button>
        )}
        {isLock && (
          <button
            onClick={() => run(() => lockDevice(device.id, !device.locked))}
            disabled={busy}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : P.card2, border: `1px solid ${P.borderHi}`, color: active ? P.primary : P.sub }}
          >
            {active ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        )}
      </div>

      {isLight && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
            style={{ background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : P.card2, border: `1px solid ${P.borderHi}`, color: active ? P.primary : P.sub }}
          >
            <Lightbulb size={13} />
          </button>
          <input
            type="range" min={0} max={100}
            value={device.brightness ?? 0}
            onChange={(e) => run(() => setBrightness(device.id, Number(e.target.value)))}
            className="flex-1"
            style={{ accentColor: P.primary }}
          />
        </div>
      )}

      {isClimate && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => run(() => toggleDevice(device.id))}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : P.card2, border: `1px solid ${P.borderHi}`, color: active ? P.primary : P.sub }}
          >
            <Snowflake size={13} />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => run(() => setTemperature(device.id, (device.temperature ?? 22) - 1))}
              disabled={busy}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: P.card2, border: `1px solid ${P.borderHi}`, color: P.sub }}
            >−</button>
            <span className="text-xs font-semibold w-9 text-center tabular-nums" style={{ color: P.text }}>{device.temperature ?? 0}°C</span>
            <button
              onClick={() => run(() => setTemperature(device.id, (device.temperature ?? 22) + 1))}
              disabled={busy}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: P.card2, border: `1px solid ${P.borderHi}`, color: P.sub }}
            >+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Camera card ─────────────────────────────────────────────────────────
function CameraCard({ name, bg, device, onClick }: { name: string; bg: string; device?: HomeDevice; onClick?: () => void }) {
  const live = device ? Boolean(device.state) : true;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="relative rounded-[18px] overflow-hidden aspect-video text-left transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_color-mix(in srgb, var(--primary) 8%, transparent)] disabled:cursor-default"
      style={{ background: bg, border: `1px solid ${P.border}`, cursor: onClick ? "pointer" : "default" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 6px)", opacity: 0.5 }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Cctv size={22} strokeWidth={1.5} color="rgba(255,255,255,0.22)" />
      </div>

      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${live ? "color-mix(in srgb, var(--ok) 35%, transparent)" : "color-mix(in srgb, var(--err) 35%, transparent)"}` }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: live ? P.success : P.error, boxShadow: live ? `0 0 6px ${P.success}` : "none", animation: live ? "orunStatePulse 1.4s ease-in-out infinite" : "none" }} />
        <span className="text-[8px] font-semibold tracking-wider" style={{ color: live ? P.success : P.error }}>{live ? "AO VIVO" : "OFFLINE"}</span>
      </div>

      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-3 py-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
        <span className="text-[10px] font-medium truncate" style={{ color: P.text }}>{name}</span>
        <span className="text-[8px] tabular-nums" style={{ color: P.sub }}>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </button>
  );
}

// ── Páginas internas ────────────────────────────────────────────────────

// Home — dashboard 3 colunas
interface HomeDashboardProps {
  now: Date;
  effectiveState: string;
  listening: boolean;
  micActive: boolean;
  level: number;
  partialTranscript?: string;
  shortcutBusy: string | null;
  onMic: () => void;
  onShortcut: (id: string) => void;
  onScene: (scene: HomeScene) => void;
  activeSceneId: string | null;
  onNavigate: (p: HomePage) => void;
}

function HomeDashboard({ now, effectiveState, listening, micActive, level, partialTranscript, shortcutBusy, onMic, onShortcut, onScene, activeSceneId, onNavigate }: HomeDashboardProps) {
  const rooms = useHomeStore((s) => s.rooms);
  const automations = useHomeStore((s) => s.automations);
  const scenes = useHomeStore((s) => s.scenes);
  const config = useHomeStore((s) => s.config);
  const status = useHomeStore((s) => s.status);

  const allDevices = useMemo(() => rooms.flatMap((r) => r.devices), [rooms]);
  const byId = useMemo(() => new Map(allDevices.map((d) => [d.id, d])), [allDevices]);
  const online = config.connected || navigator.onLine;
  const cameras = useMemo(() => {
    const cams = allDevices.filter((d) => d.type === "camera");
    return { active: cams.filter((c) => c.state).length, total: cams.length };
  }, [allDevices]);
  const running = useMemo(() => automations.filter((a) => a.enabled), [automations]);
  const securityOk = status.devices.alerts === 0;

  const favorites = useMemo(() => {
    const picked: HomeDevice[] = [];
    for (const id of FAVORITE_IDS) {
      const d = allDevices.find((x) => x.id === id);
      if (d) picked.push(d);
    }
    for (const d of allDevices) {
      if (picked.length >= 8) break;
      if (!picked.includes(d) && d.type !== "sensor" && d.type !== "binary_sensor") picked.push(d);
    }
    return picked.slice(0, 8);
  }, [allDevices]);

  const sensorValue = useCallback((id: string, fallback: string) => {
    const d = allDevices.find((x) => x.id === id);
    return d ? String(d.value) : fallback;
  }, [allDevices]);

  const sensors = useMemo(() => ({
    temp: sensorValue("temp_quarto", "22°C"),
    hum: sensorValue("umid_quarto", "48%"),
  }), [sensorValue]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.08fr_1fr_1fr]">
      {/* Coluna A */}
      <div className="flex flex-col gap-5 px-5 py-6 min-w-0">
        <Greeting />
        <CasaSeguraCard temp={sensors.temp} humidity={sensors.hum} online={online} onClick={() => onNavigate("casa")} />

        <button
          onClick={() => onShortcut("todas_luzes")}
          disabled={!!shortcutBusy}
          className="flex items-center justify-between w-full rounded-[18px] px-4 py-3 transition-all hover:scale-[1.01] disabled:opacity-70"
          style={{ background: P.card2, border: `1px solid ${P.border}` }}
        >
          <span className="flex items-center gap-3 text-[12px] font-medium" style={{ color: P.text }}>
            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: P.primary }}>
              <Lightbulb size={14} />
            </span>
            Todas Luzes
          </span>
          <ChevronRight size={14} color={P.dim} />
        </button>

        <div>
          <SectionHeader icon={Lightbulb} title="Dispositivos favoritos" onClick={() => onNavigate("dispositivos")} />
          <div className="flex flex-col gap-3">
            {favorites.slice(0, 4).map((d) => <FavoriteDeviceCard key={d.id} device={d} />)}
          </div>
        </div>
      </div>

      {/* Coluna B — Hampton central + câmeras */}
      <div className="flex flex-col gap-5 px-5 py-6 min-w-0" style={{ borderLeft: "1px solid var(--border)" }}>
        <div className="flex flex-col items-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] mb-4" style={{ color: P.dim }}>Orun IA</p>
          <HomeHampton state={effectiveState as never} size={188} image="./LogoIA.png" />
          <h2 className="mt-6 text-[17px] font-semibold tracking-[0.02em]" style={{ color: P.text }}>HAMPTON</h2>
          <p className="text-[9px] mt-1 uppercase tracking-[0.2em]" style={{ color: P.sub }}>Seu assistente inteligente</p>

          <button
            onClick={onMic}
            disabled={!onMic}
            className="mt-4 flex items-center gap-2.5 pl-3 pr-5 py-2 rounded-full transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 45%, transparent)" }}
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: P.primary, boxShadow: micActive ? "0 0 20px color-mix(in srgb, var(--primary) 75%, transparent)" : "0 0 10px color-mix(in srgb, var(--primary) 45%, transparent)", animation: micActive ? "orunAuraPulse 1.2s ease-in-out infinite" : "none" }}>
              <Mic size={16} color="#fff" />
            </span>
            <span className="text-[12px] font-medium" style={{ color: P.text }}>
              {listening ? "Ouvindo... toque para parar" : micActive ? "Processando..." : "Tocar para falar"}
            </span>
          </button>

          {listening && (
            <>
              <div className="mt-4 flex items-center gap-1 h-5">
                {Array.from({ length: 24 }).map((_, i) => {
                  const on = i / 24 < level;
                  return (
                    <div key={i} className="rounded-full" style={{ width: 3, height: on ? 14 : 4, background: on ? P.primary : P.borderHi, transition: "all 0.08s ease" }} />
                  );
                })}
              </div>
              {partialTranscript && (
                <p className="mt-2 text-[11px] italic text-center max-w-[300px]" style={{ color: P.sub }}>“{partialTranscript}”</p>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col">
          <SectionHeader icon={Cctv} title="Câmeras" onClick={() => onNavigate("cameras")} right={
            <span className="text-[10px] tabular-nums" style={{ color: P.sub }}>{cameras.active}/{cameras.total}</span>
          } />
          <div className="grid grid-cols-2 gap-3">
            {CAMERAS.map((cam) => (
              <CameraCard key={cam.id} name={cam.name} bg={cam.bg} device={byId.get(cam.id)} onClick={() => onNavigate("cameras")} />
            ))}
          </div>
        </div>
      </div>

      {/* Coluna C — relógio / status / automações / cenários / sistema */}
      <div className="flex flex-col gap-5 px-5 py-6 min-w-0" style={{ borderLeft: "1px solid var(--border)" }}>
        <ClockBlock now={now} />

        <div>
          <SectionHeader
            icon={ShieldCheck}
            title="Status da casa"
            onClick={() => onNavigate("sistema")}
            right={
              <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: securityOk ? P.success : P.alert }}>
                <CheckCircle2 size={12} />
                Tudo {securityOk ? "ok" : "atenção"}
              </span>
            }
          />
          <div className="flex flex-col gap-3">
            <StatusCard icon={Zap} label="Energia" value={status.energy.total} status="Normal" tone="ok" />
            <StatusCard
              icon={Wifi}
              label="Internet"
              value={online ? "450 Mbps" : "Offline"}
              status={online ? "Estável" : "Sem conexão"}
              tone={online ? "ok" : "err"}
            />
            <StatusCard
              icon={ShieldCheck}
              label="Segurança"
              value={securityOk ? "Normal" : "Atenção"}
              status={securityOk ? "Sem vazamentos" : `${status.devices.alerts} alerta(s)`}
              tone={securityOk ? "ok" : "warn"}
            />
          </div>
        </div>

        <div>
          <SectionHeader icon={Zap} title="Automações ativas" onClick={() => onNavigate("automacoes")} />
          <div className="flex flex-col gap-3">
            {running.length ? running.map((a) => <AutomationRow key={a.id} automation={a} />) : (
              <p className="text-[11px] px-1" style={{ color: P.sub }}>Nenhuma automação ativa no momento.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ShortcutChip icon={Moon} label="Boa noite" onClick={() => onShortcut("boa_noite")} disabled={!!shortcutBusy} />
          <ShortcutChip icon={HomeIcon} label="Cheguei" onClick={() => onShortcut("cheguei")} disabled={!!shortcutBusy} />
        </div>

        <div>
          <SectionHeader icon={Clapperboard} title="Cenários" onClick={() => onNavigate("cenarios")} />
          <div className="grid grid-cols-2 gap-3">
            {scenes.map((scene) => (
              <SceneTile key={scene.id} scene={scene} active={activeSceneId === scene.id} onActivate={() => onScene(scene)} />
            ))}
          </div>
        </div>

        <div className="mt-auto pt-1">
          <SectionHeader icon={MonitorCog} title="Sistema" onClick={() => onNavigate("sistema")} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] px-4 py-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Modo</p>
              <p className="text-[12px] font-medium mt-1" style={{ color: P.text }}>{config.simulated ? "Simulado" : "Home Assistant"}</p>
            </div>
            <div className="rounded-[18px] px-4 py-3" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>Conexão</p>
              <p className="text-[12px] font-medium mt-1 flex items-center gap-1.5" style={{ color: online ? P.success : P.error }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: online ? P.success : P.error }} />
                {online ? "Conectado" : "Offline"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assistente
function AssistentePage({ hamptonState, onMicClick, voiceVolume, partialTranscript, onSendMessage }: {
  hamptonState?: string; onMicClick?: () => void; voiceVolume?: number; partialTranscript?: string; onSendMessage: (m: string) => void;
}) {
  const { greeting, userName } = usePersonalization();
  const effectiveState = hamptonState ?? "idle";
  const listening = effectiveState === "listening";
  const micActive = effectiveState !== "idle";
  const level = voiceVolume ?? 0.4;
  const [sent, setSent] = useState<string[]>([]);

  const suggestions = [
    "Como está a casa?",
    "Que dispositivos estão ligados?",
    "Existe algum problema?",
    "Acenda a luz da sala",
    "Toque uma música",
    "Qual automação está rodando?",
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-8 py-8">
      <HomeHampton state={effectiveState as never} size={168} image="./LogoIA.png" />
      <div className="text-center">
        <h1 className="text-xl font-semibold" style={{ color: P.text }}>{greeting}, {userName}</h1>
        <p className="text-[11px] mt-1" style={{ color: P.sub }}>Pergunte qualquer coisa sobre a sua casa</p>
      </div>

      <button
        onClick={onMicClick}
        disabled={!onMicClick}
        className="flex items-center gap-2.5 pl-3 pr-5 py-2 rounded-full transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 45%, transparent)" }}
      >
        <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: P.primary, boxShadow: micActive ? "0 0 20px color-mix(in srgb, var(--primary) 75%, transparent)" : "0 0 10px color-mix(in srgb, var(--primary) 45%, transparent)", animation: micActive ? "orunAuraPulse 1.2s ease-in-out infinite" : "none" }}>
          <Mic size={16} color="#fff" />
        </span>
        <span className="text-[12px] font-medium" style={{ color: P.text }}>
          {listening ? "Ouvindo... toque para parar" : micActive ? "Processando..." : "Tocar para falar"}
        </span>
      </button>

      {listening && (
        <>
          <div className="flex items-center gap-1 h-5">
            {Array.from({ length: 28 }).map((_, i) => {
              const on = i / 28 < level;
              return (
                <div key={i} className="rounded-full" style={{ width: 3, height: on ? 14 : 4, background: on ? P.primary : P.borderHi, transition: "all 0.08s ease" }} />
              );
            })}
          </div>
          {partialTranscript && <p className="text-[11px] italic text-center max-w-md" style={{ color: P.sub }}>“{partialTranscript}”</p>}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full max-w-3xl">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => { onSendMessage(s); setSent((p) => [s, ...p]); }}
            className="rounded-[16px] px-4 py-3 text-[11px] text-left transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: P.card, border: `1px solid ${P.border}`, color: P.text }}
          >
            {s}
          </button>
        ))}
      </div>

      {sent.length > 0 && (
        <div className="w-full max-w-3xl">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] mb-2" style={{ color: P.dim }}>Enviadas para o Hampton</p>
          <div className="flex flex-col gap-2">
            {sent.slice(0, 4).map((m, i) => (
              <p key={i} className="text-[11px] rounded-lg px-3 py-2" style={{ background: P.card, border: `1px solid ${P.border}`, color: P.sub }}>{m}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Casa
function CasaPage({ onNavigate }: { onNavigate: (p: HomePage) => void }) {
  const rooms = useHomeStore((s) => s.rooms);
  return (
    <div className="px-6 py-6">
      <PageHeader icon={Sofa} title="Casa" subtitle="Cômodos e dispositivos" onBack={() => onNavigate("home")} />
      <div className="flex flex-col gap-7">
        {rooms.map((room) => {
          const Icon = ROOM_ICONS[room.icon] || Sofa;
          const on = room.devices.filter((d) => d.state).length;
          return (
            <section key={room.id}>
              <SectionHeader
                icon={Icon}
                title={room.name}
                right={<span className="text-[10px] tabular-nums" style={{ color: P.sub }}>{on}/{room.devices.length} ligados</span>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {room.devices.map((d) => <FavoriteDeviceCard key={d.id} device={d} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Dispositivos
function DispositivosPage({ onNavigate }: { onNavigate: (p: HomePage) => void }) {
  const rooms = useHomeStore((s) => s.rooms);
  const [filter, setFilter] = useState("all");

  const allDevices = useMemo(() => rooms.flatMap((r) => r.devices), [rooms]);
  const visible = useMemo(() => {
    if (filter === "all") return allDevices.filter((d) => d.type !== "sensor" && d.type !== "binary_sensor");
    if (filter === "light") return allDevices.filter((d) => d.type === "light");
    if (filter === "climate") return allDevices.filter((d) => d.type === "climate");
    if (filter === "security") return allDevices.filter((d) => d.type === "lock" || d.type === "cover");
    if (filter === "camera") return allDevices.filter((d) => d.type === "camera");
    return allDevices.filter((d) => !["light", "climate", "lock", "cover", "camera", "sensor", "binary_sensor"].includes(d.type));
  }, [allDevices, filter]);

  return (
    <div className="px-6 py-6">
      <PageHeader icon={Lightbulb} title="Dispositivos" subtitle={`${allDevices.length} dispositivos conectados`} onBack={() => onNavigate("home")} />

      <div className="flex flex-wrap gap-2 mb-5">
        {DEVICE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-4 py-2 rounded-full text-[11px] font-medium transition-all"
            style={{ background: filter === f.id ? P.primary : P.card, color: filter === f.id ? "#fff" : P.sub, border: `1px solid ${filter === f.id ? "transparent" : P.border}` }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {visible.map((d) => <FavoriteDeviceCard key={d.id} device={d} />)}
      </div>
      {!visible.length && <p className="text-[11px] mt-4" style={{ color: P.sub }}>Nenhum dispositivo neste filtro.</p>}
    </div>
  );
}

// Câmeras
function CamerasPage({ onNavigate }: { onNavigate: (p: HomePage) => void }) {
  const rooms = useHomeStore((s) => s.rooms);
  const allDevices = useMemo(() => rooms.flatMap((r) => r.devices), [rooms]);
  const byId = useMemo(() => new Map(allDevices.map((d) => [d.id, d])), [allDevices]);
  const cameras = useMemo(() => {
    const cams = allDevices.filter((d) => d.type === "camera");
    return { active: cams.filter((c) => c.state).length, total: cams.length };
  }, [allDevices]);

  return (
    <div className="px-6 py-6">
      <PageHeader icon={Cctv} title="Câmeras" subtitle={`${cameras.active}/${cameras.total} câmeras ao vivo`} onBack={() => onNavigate("home")} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {CAMERAS.map((cam) => (
          <CameraCard key={cam.id} name={cam.name} bg={cam.bg} device={byId.get(cam.id)} />
        ))}
      </div>
    </div>
  );
}

// Cenários
function CenariosPage({ activeSceneId, onActivate, onNavigate }: {
  activeSceneId: string | null; onActivate: (scene: HomeScene) => void; onNavigate: (p: HomePage) => void;
}) {
  const scenes = useHomeStore((s) => s.scenes);
  return (
    <div className="px-6 py-6">
      <PageHeader icon={Clapperboard} title="Cenários" subtitle="Um toque para transformar o ambiente" onBack={() => onNavigate("home")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {scenes.map((scene) => {
          const Icon = sceneIcon(scene.icon);
          const active = activeSceneId === scene.id;
          return (
            <button
              key={scene.id}
              onClick={() => onActivate(scene)}
              className="flex flex-col items-start gap-3 rounded-[20px] p-5 text-left transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: "linear-gradient(160deg, color-mix(in srgb, var(--primary) 8%, transparent), var(--surface-2) 65%)",
                border: active ? `1px solid color-mix(in srgb, var(--primary) 55%, transparent)` : `1px solid ${P.border}`,
                boxShadow: active ? "0 0 22px color-mix(in srgb, var(--primary) 16%, transparent)" : "none",
              }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: P.primary }}>
                <Icon size={18} strokeWidth={1.7} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: P.text }}>{scene.name}</p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: P.sub }}>{scene.description}</p>
              </div>
              {active && <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: P.success }}>Ativado</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Automações
function AutomationCard({ automation, busy, onToggle, onRun }: {
  automation: HomeAutomation; busy: boolean; onToggle: () => void; onRun: () => void;
}) {
  const Icon = automationIcon(automation.icon);
  const running = automation.enabled;
  return (
    <div className="rounded-[18px] p-4 flex items-center justify-between gap-3 transition-all hover:scale-[1.01]" style={{ background: P.card, border: `1px solid ${P.border}` }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: running ? "color-mix(in srgb, var(--ok) 12%, transparent)" : P.card2, color: running ? P.success : P.sub }}>
          <Icon size={17} strokeWidth={1.7} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate" style={{ color: P.text }}>{automation.name}</p>
          <p className="text-[10px] mt-1 truncate" style={{ color: P.sub }}>{automation.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onRun}
          disabled={!running || busy}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background: P.card2, border: `1px solid ${P.borderHi}`, color: running ? P.success : P.dim, opacity: running ? 1 : 0.4 }}
        >
          <Play size={13} />
        </button>
        <button
          onClick={onToggle}
          className="relative w-10 h-[22px] rounded-full transition-all"
          style={{ background: running ? P.success : P.card2, border: `1px solid ${running ? "transparent" : P.borderHi}` }}
        >
          <span className="absolute top-[3px] w-4 h-4 rounded-full transition-all" style={{ left: running ? 20 : 3, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
        </button>
      </div>
    </div>
  );
}

function AutomacoesPage({ busy, onToggle, onRun, onNavigate }: {
  busy: string | null; onToggle: (a: HomeAutomation) => void; onRun: (a: HomeAutomation) => void; onNavigate: (p: HomePage) => void;
}) {
  const automations = useHomeStore((s) => s.automations);
  return (
    <div className="px-6 py-6">
      <PageHeader icon={Zap} title="Automações" subtitle={`${automations.filter((a) => a.enabled).length} ativas de ${automations.length}`} onBack={() => onNavigate("home")} />
      <div className="flex flex-col gap-3 max-w-3xl">
        {automations.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            busy={busy === a.id}
            onToggle={() => onToggle(a)}
            onRun={() => onRun(a)}
          />
        ))}
      </div>
    </div>
  );
}

// Sistema
function SistemaPage({ onNavigate }: { onNavigate: (p: HomePage) => void }) {
  const config = useHomeStore((s) => s.config);
  const status = useHomeStore((s) => s.status);
  const online = config.connected || navigator.onLine;

  const rows: { label: string; value: string; tone?: "ok" | "err" | "warn" }[] = [
    { label: "Modo", value: config.simulated ? "Simulado" : "Home Assistant" },
    { label: "Conexão", value: online ? "Conectado" : "Offline", tone: online ? "ok" : "err" },
    { label: "Dispositivos", value: `${status.devices.on}/${status.devices.total} ligados` },
    { label: "Luzes", value: `${status.devices.lightsOn}/${status.devices.lights} ligadas` },
    { label: "Segurança", value: `${status.devices.locked}/${status.devices.locks} trancados`, tone: status.devices.locked === status.devices.locks ? "ok" : "warn" },
    { label: "Energia", value: status.energy.total },
    { label: "Automações ativas", value: `${status.automations.enabled}/${status.automations.total}` },
    { label: "Rodadas hoje", value: String(status.automations.ranToday) },
    { label: "Atualizado", value: new Date(status.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
  ];

  return (
    <div className="px-6 py-6">
      <PageHeader icon={MonitorCog} title="Sistema" subtitle="Saúde e informações da casa inteligente" onBack={() => onNavigate("home")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-[18px] px-4 py-4" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: P.dim }}>{r.label}</p>
            <p className="text-[15px] font-semibold mt-1.5 flex items-center gap-2" style={{ color: r.tone ? chipColor(r.tone) : P.text }}>
              {r.tone && <span className="w-2 h-2 rounded-full" style={{ background: chipColor(r.tone), boxShadow: `0 0 8px ${chipColor(r.tone)}` }} />}
              {r.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={() => onNavigate("config")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
          style={{ background: P.primary, color: "#fff" }}
        >
          <Settings size={14} />
          Configurações da casa
        </button>
        <button
          onClick={refreshStatus}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
          style={{ background: P.card, border: `1px solid ${P.border}`, color: P.text }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>
    </div>
  );
}

// Configurações
function ConfigPage({ onNavigate }: { onNavigate: (p: HomePage) => void }) {
  const config = useHomeStore((s) => s.config);
  const [host, setHost] = useState(config.host);
  const [token, setToken] = useState(config.token);
  const [name, setName] = useState(config.name);
  const [mode, setMode] = useState<"simulated" | "real">(config.mode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await saveHomeConfig({ mode, host, token, name });
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const inputStyle: React.CSSProperties = {
    padding: "11px 13px",
    borderRadius: 12,
    fontSize: 12,
    background: P.panel,
    color: P.text,
    border: `1px solid ${P.borderHi}`,
    outline: "none",
    width: "100%",
  };

  return (
    <div className="px-6 py-6 max-w-2xl">
      <PageHeader icon={Settings} title="Configurações" subtitle="Conexão da casa inteligente" onBack={() => onNavigate("home")} />

      <div className="rounded-[20px] p-6 flex flex-col gap-5" style={{ background: P.card, border: `1px solid ${P.border}` }}>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: P.panel, border: `1px solid ${P.border}` }}>
          {(["simulated", "real"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: mode === m ? P.primary : "transparent", color: mode === m ? "#fff" : P.sub }}
            >
              {m === "simulated" ? "Modo Simulado" : "Home Assistant"}
            </button>
          ))}
        </div>

        {mode === "real" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium" style={{ color: P.sub }}>URL do Home Assistant</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="http://192.168.0.10:8123" style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium" style={{ color: P.sub }}>Token de acesso (long-lived)</span>
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="eyJ... (Perfil > Tokens)" style={inputStyle} />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: P.sub }}>Nome da casa (opcional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Minha Casa" style={inputStyle} />
        </label>

        <div className="flex items-center gap-2 justify-end">
          {saved && <span className="text-[11px] font-medium mr-auto" style={{ color: P.success }}>Configurações salvas ✓</span>}
          <button onClick={() => onNavigate("home")} className="px-4 py-2 rounded-xl text-xs transition-all" style={{ background: P.card2, border: `1px solid ${P.borderHi}`, color: P.sub }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl text-xs font-medium transition-all hover:brightness-110" style={{ background: P.primary, color: "#fff" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main workspace ──────────────────────────────────────────────────────
export function HomeWorkspace({ onSendMessage, hamptonState, onMicClick, voiceVolume, partialTranscript }: WorkspaceProps) {
  const rooms = useHomeStore((s) => s.rooms);
  const [page, setPage] = useState<HomePage>("home");
  const [now, setNow] = useState(() => new Date());
  const [shortcutBusy, setShortcutBusy] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const effectiveState = hamptonState ?? "idle";
  const listening = effectiveState === "listening";
  const micActive = effectiveState !== "idle";

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadHomeFromBackend();
    refreshStatus();
  }, []);

  const allDevices = useMemo(() => rooms.flatMap((r) => r.devices), [rooms]);

  const navigate = useCallback((p: HomePage) => {
    setPage(p);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleMenu = useCallback((item: { id: string; label: string; icon: LucideIcon }) => {
    navigate(MENU_PAGE[item.id] ?? "home");
  }, [navigate]);

  const runAction = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try { await fn(); } finally { setBusy(null); }
  };

  const toggleAllLights = async () => {
    const lights = allDevices.filter((d) => d.type === "light");
    if (!lights.length) return;
    const allOn = lights.every((l) => l.state);
    for (const l of lights) {
      if (l.state !== !allOn) await toggleDevice(l.id);
    }
  };

  const handleShortcut = async (id: string) => {
    if (shortcutBusy) return;
    setShortcutBusy(id);
    try {
      if (id === "todas_luzes") await toggleAllLights();
      else if (id === "portao") await toggleDevice("portao");
      else if (id === "musica") onSendMessage("Toque uma música para mim");
      else if (id === "tv") await toggleDevice("tv_sala");
      else if (id === "boa_noite") await runAutomation("autom_boa_noite");
      else if (id === "cheguei") await runAutomation("autom_chegar_casa");
      else if (id === "cinema") await activateScene("cena_cinema");
      else if (id === "limpeza") onSendMessage("Inicie a limpeza da casa");
    } finally {
      setShortcutBusy(null);
    }
  };

  const handleScene = async (scene: HomeScene) => {
    setActiveSceneId(scene.id);
    await activateScene(scene.id);
    window.setTimeout(() => setActiveSceneId((id) => (id === scene.id ? null : id)), 1800);
  };

  const handleMic = () => {
    onMicClick?.();
  };

  const level = voiceVolume ?? 0.4;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: P.bg, color: P.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{HS_SCROLL}</style>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[172px] shrink-0 hidden lg:flex flex-col px-3 pt-5 pb-4" style={{ background: P.panel, borderRight: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2.5 px-2 pb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 45%, black))", boxShadow: "0 0 16px color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              <HomeIcon size={16} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-wide" style={{ color: P.text }}>Orun OS</p>
              <p className="text-[8px] font-medium uppercase tracking-[0.2em]" style={{ color: P.primary }}>Home IA</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {MENU.map((item) => {
              const active = page === MENU_PAGE[item.id];
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenu(item)}
                  className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[12px] font-medium transition-all hover:scale-[1.02]"
                  style={{ background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent", color: active ? P.text : P.sub }}
                >
                  <Icon size={16} strokeWidth={1.7} color={active ? P.primary : P.sub} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-2.5 px-2 pt-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: P.primary }}>
              C
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium truncate" style={{ color: P.text }}>Caique Castaldeli</p>
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em]" style={{ color: P.sub }}>Admin</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main ref={mainRef} className="flex-1 overflow-y-auto hs-scroll">
          {page === "home" && (
            <HomeDashboard
              now={now}
              effectiveState={effectiveState}
              listening={listening}
              micActive={micActive}
              level={level}
              partialTranscript={partialTranscript}
              shortcutBusy={shortcutBusy}
              onMic={handleMic}
              onShortcut={handleShortcut}
              onScene={handleScene}
              activeSceneId={activeSceneId}
              onNavigate={navigate}
            />
          )}
          {page === "assistente" && (
            <AssistentePage
              hamptonState={hamptonState}
              onMicClick={onMicClick}
              voiceVolume={voiceVolume}
              partialTranscript={partialTranscript}
              onSendMessage={onSendMessage}
            />
          )}
          {page === "casa" && <CasaPage onNavigate={navigate} />}
          {page === "dispositivos" && <DispositivosPage onNavigate={navigate} />}
          {page === "cameras" && <CamerasPage onNavigate={navigate} />}
          {page === "cenarios" && <CenariosPage activeSceneId={activeSceneId} onActivate={handleScene} onNavigate={navigate} />}
          {page === "automacoes" && (
            <AutomacoesPage
              busy={busy}
              onToggle={(a) => runAction(a.id, () => toggleAutomation(a.id))}
              onRun={(a) => runAction(a.id, () => runAutomation(a.id))}
              onNavigate={navigate}
            />
          )}
          {page === "sistema" && <SistemaPage onNavigate={navigate} />}
          {page === "config" && <ConfigPage onNavigate={navigate} />}
        </main>
      </div>

      {/* Footer nav */}
      <footer className="shrink-0 flex items-center justify-center gap-2 px-6 py-2.5" style={{ background: P.panel, borderTop: `1px solid ${P.border}` }}>
        {FOOTER.map((f) => {
          const Icon = f.icon;
          const active = page === MENU_PAGE[f.id];
          return (
            <button
              key={f.id}
              onClick={() => navigate(MENU_PAGE[f.id] ?? "home")}
              className="flex flex-col items-center gap-1 px-6 py-1.5 rounded-xl transition-all hover:scale-105"
              style={{ color: active ? P.primary : P.sub }}
            >
              <Icon size={17} strokeWidth={1.7} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">{f.label}</span>
            </button>
          );
        })}
      </footer>
    </div>
  );
}
